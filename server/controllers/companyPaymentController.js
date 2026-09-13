const mongoose = require('mongoose')
const Company = require('../models/Company')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { recordTrustScoreEvent } = require('./trustScoreController')

function validateExternalPayment(payload, now = new Date()) {
  const amount = Number(payload?.amount)
  const reference = typeof payload?.reference === 'string' ? payload.reference.trim() : ''
  const paidOn = typeof payload?.paidOn === 'string' ? payload.paidOn : ''
  const method = payload?.method
  if (!['number', 'string'].includes(typeof payload?.amount) || !Number.isFinite(amount) || amount < 1 || amount > 10000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
    throw buildAuthError('Enter a payment amount from INR 1 to 10,000,000 with at most two decimal places')
  }
  if (reference.length < 4 || reference.length > 120) throw buildAuthError('A transaction reference of 4 to 120 characters is required')
  if (!['bank_transfer', 'upi', 'other'].includes(method)) throw buildAuthError('Choose a payment method')
  const date = new Date(paidOn)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== paidOn || paidOn > today) {
    throw buildAuthError('Enter a valid payment date that is not in the future')
  }
  return { amount, reference, paidOn, method, currency: 'INR', recordedAt: now, source: 'company_reported' }
}

const PAYMENT_COMPANY_FIELDS = '_id sessions gigManagementState.gigs'

async function findCompany(token) {
  return findModelByActiveToken(Company, token, 'Company', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), PAYMENT_COMPANY_FIELDS)
}

async function getCompanyPayments(token) {
  const company = await findCompany(token)
  const query = TaskSubmission.find({ companyId: company._id, status: { $in: ['approved', 'completed'] } })
  const compactQuery = typeof query.select === 'function'
    ? query.select('_id gigTitle companyGigId studentName status externalPayment updatedAt')
    : query
  const submissions = await compactQuery
    .sort({ updatedAt: -1 }).lean()
  const gigs = company.gigManagementState?.gigs || []
  return {
    mode: 'external',
    pending: submissions.filter(item => item.status === 'approved' && !item.externalPayment).map(item => ({
      id: String(item._id), title: item.gigTitle, studentName: item.studentName,
      budget: gigs.find(gig => Number(gig.id) === Number(item.companyGigId))?.budget || '',
    })),
    transactions: submissions.filter(item => item.externalPayment).map(item => ({
      id: String(item._id), title: item.gigTitle, studentName: item.studentName, ...item.externalPayment,
    })),
  }
}

async function recordExternalPayment(token, submissionId, payload) {
  const company = await findCompany(token)
  if (!/^[a-f0-9]{24}$/i.test(submissionId)) throw buildAuthError('Invalid submission ID')
  const payment = validateExternalPayment(payload)
  if (payload?.confirmed !== true) throw buildAuthError('Confirm that this payment has already been made')

  async function persistPayment(session) {
    const submissionQuery = TaskSubmission.findOne({ _id: submissionId, companyId: company._id })
    const existing = session ? await submissionQuery.session(session) : await submissionQuery
    if (!existing) throw buildAuthError('Submission not found', 404)
    if (existing.externalPayment) {
      const old = existing.externalPayment
      if (old.reference === payment.reference && old.amount === payment.amount && old.paidOn === payment.paidOn && old.method === payment.method) return { duplicate: true }
      throw buildAuthError('A payment is already recorded for this submission', 409)
    }
    if (existing.status !== 'approved') throw buildAuthError('Approve the delivered work before recording payment', 409)

    const updateQuery = TaskSubmission.findOneAndUpdate(
      { _id: submissionId, companyId: company._id, status: 'approved', externalPayment: null },
      { $set: { status: 'completed', completedAt: new Date(), externalPayment: payment }, $inc: { __v: 1 } },
      { returnDocument: 'after', runValidators: true },
    )
    const updated = session ? await updateQuery.session(session) : await updateQuery
    if (!updated) throw buildAuthError('This submission changed. Refresh before recording payment.', 409)

    const studentQuery = Student.findById(updated.studentId)
    const student = session ? await studentQuery.session(session) : await studentQuery
    if (!student) throw buildAuthError('The student account for this submission no longer exists', 409)
    recordTrustScoreEvent(student, 'gig_completed', String(updated._id))
    await student.save(session ? { session } : undefined)
    return { duplicate: false }
  }

  try {
    const result = mongoose.connection.readyState === 1 && typeof mongoose.connection.transaction === 'function'
      ? await mongoose.connection.transaction(session => persistPayment(session))
      : await persistPayment()
    if (result.duplicate) return getCompanyPayments(token)
  } catch (error) {
    if (error.code === 11000) throw buildAuthError('This transaction reference has already been recorded', 409)
    throw error
  }
  return getCompanyPayments(token)
}

module.exports = { getCompanyPayments, recordExternalPayment, validateExternalPayment }
