const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { demoPaymentState } = require('../config/showcaseFixtures')

const EARNING_STUDENT_FIELDS = '_id sessions'

async function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), EARNING_STUDENT_FIELDS)
}

function buildExternalEarningState(submissions) {
  const pending = []
  const transactions = []
  for (const item of submissions) {
    const identity = { id: String(item._id), title: item.gigTitle, company: item.companyName }
    if (item.externalPayment) {
      const payment = item.externalPayment
      transactions.push({ ...identity, amount: payment.amount, currency: 'INR', reference: payment.reference,
        method: payment.method, paidOn: payment.paidOn, recordedAt: payment.recordedAt, source: 'company_reported' })
    } else if (item.status === 'approved') {
      pending.push({ ...identity, approvedAt: item.reviewedAt })
    }
  }
  return { mode: 'external', pending, transactions,
    totalRecorded: transactions.reduce((cents, item) => cents + Math.round(Number(item.amount) * 100), 0) / 100 }
}

async function getStudentEarningState(token) {
  const student = await findStudentByToken(token)
  const query = TaskSubmission.find({ studentId: student._id, status: { $in: ['approved', 'completed'] } })
  const compactQuery = typeof query.select === 'function'
    ? query.select('_id gigTitle companyName status externalPayment reviewedAt updatedAt')
    : query
  const submissions = await compactQuery
    .sort({ updatedAt: -1 }).lean()
  const real = buildExternalEarningState(submissions)
  const demo = demoPaymentState()
  const transactions = demo.transactions.map(item => ({ ...item, company: 'GreenRoute Analytics' }))
  // Showcase rows are returned separately so they never inflate a student's
  // real payment counters, total, CSV export, or production earnings history.
  return {
    ...real,
    demoPending: demo.pending.map(item => ({ ...item, company: 'Northstar Retail Labs' })),
    demoTransactions: transactions,
  }
}

async function updateStudentEarningState(token) {
  await findStudentByToken(token)
  throw buildAuthError('Earnings are read-only and come from company payment records.', 410)
}

async function requestStudentWithdrawal(token) {
  await findStudentByToken(token)
  throw buildAuthError('SkillBridge records external payments and does not hold funds or process withdrawals.', 410)
}

module.exports = { getStudentEarningState, requestStudentWithdrawal, updateStudentEarningState, buildExternalEarningState }
