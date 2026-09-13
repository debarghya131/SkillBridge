const mongoose = require('mongoose')
const Reviewer = require('../models/Reviewer')
const SkillAssessment = require('../models/SkillAssessment')
const { appendSession, buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { createSessionToken, verifyPassword } = require('../utils/auth')
const { reviewSkillAssessment, serializeBlindAssessment } = require('./skillAssessmentController')

const findReviewer = token => findModelByActiveToken(Reviewer, token, 'Reviewer', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
const claimLeaseMs = () => Math.max(15, Math.min(Number(process.env.REVIEW_CLAIM_TTL_MINUTES) || 240, 1440)) * 60 * 1000

function sanitizeReviewer(reviewer) {
  return { id: String(reviewer._id), name: reviewer.name, email: reviewer.email, role: reviewer.role }
}

async function signInReviewer(payload) {
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const query = email ? Reviewer.findOne({ email, active: true }) : null
  const reviewer = query
    ? (typeof query?.select === 'function' ? await query.select('+passwordHash +sessions') : await query)
    : null
  if (!reviewer || !verifyPassword(payload?.password, reviewer.passwordHash)) throw buildAuthError('Invalid reviewer email or password', 401)
  const token = createSessionToken()
  reviewer.lastSignedInAt = new Date()
  await appendSession(reviewer, token, Math.max(Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5, 1))
  return { token, reviewer: sanitizeReviewer(reviewer) }
}

async function getCurrentReviewer(token) {
  return sanitizeReviewer(await findReviewer(token))
}

async function logoutReviewer(token) {
  const reviewer = await findReviewer(token)
  reviewer.sessions = reviewer.sessions.filter(session => session.token !== token)
  await reviewer.save()
  return { success: true }
}

function normalizeQueueFilters(filters = {}) {
  const page = Math.max(1, Math.min(Number.parseInt(filters.page, 10) || 1, 10000))
  const pageSize = Math.max(1, Math.min(Number.parseInt(filters.pageSize, 10) || 25, 50))
  const mode = ['verify', 'reverify', 'upgrade', 'retain', 'challenge'].includes(filters.mode) ? filters.mode : ''
  const queue = ['available', 'mine', 'completed'].includes(filters.queue) ? filters.queue : 'available'
  return { page, pageSize, mode, queue }
}

async function listReviewQueue(token, filters) {
  const reviewer = await findReviewer(token)
  const values = normalizeQueueFilters(filters)
  const expiredClaim = new Date(Date.now() - claimLeaseMs())
  const query = values.queue === 'available'
    ? { status: 'pending', $or: [{ assignedReviewerId: null }, { claimedAt: { $lt: expiredClaim } }] }
    : values.queue === 'mine'
      ? { status: 'pending', assignedReviewerId: reviewer._id }
      : { status: { $in: ['approved', 'rejected', 'needs_revision'] }, assignedReviewerId: reviewer._id }
  if (values.mode) query.mode = values.mode
  const [records, total] = await Promise.all([
    SkillAssessment.find(query).sort(values.queue === 'available' ? { createdAt: 1 } : { updatedAt: -1 }).skip((values.page - 1) * values.pageSize).limit(values.pageSize),
    SkillAssessment.countDocuments(query),
  ])
  return { assessments: records.map(serializeBlindAssessment), total, page: values.page, pageSize: values.pageSize }
}

async function claimAssessment(token, id) {
  const reviewer = await findReviewer(token)
  if (!mongoose.isObjectIdOrHexString(id)) throw buildAuthError('Invalid assessment ID')
  const expiredClaim = new Date(Date.now() - claimLeaseMs())
  const assessment = await SkillAssessment.findOneAndUpdate({
    _id: id,
    status: 'pending',
    $or: [{ assignedReviewerId: null }, { assignedReviewerId: reviewer._id }, { claimedAt: { $lt: expiredClaim } }],
  }, { $set: { assignedReviewerId: reviewer._id, assignedReviewerName: reviewer.name, claimedAt: new Date() } }, { returnDocument: 'after', runValidators: true })
  if (!assessment) throw buildAuthError('This assessment was already claimed or is no longer pending', 409)
  return serializeBlindAssessment(assessment)
}

async function releaseAssessment(token, id) {
  const reviewer = await findReviewer(token)
  if (!mongoose.isObjectIdOrHexString(id)) throw buildAuthError('Invalid assessment ID')
  const assessment = await SkillAssessment.findOneAndUpdate({ _id: id, status: 'pending', assignedReviewerId: reviewer._id }, {
    $set: { assignedReviewerId: null, assignedReviewerName: '', claimedAt: null },
  }, { returnDocument: 'after', runValidators: true })
  if (!assessment) throw buildAuthError('Only your pending assessment can be released', 409)
  return serializeBlindAssessment(assessment)
}

async function decideAssessment(token, id, payload) {
  const reviewer = await findReviewer(token)
  return reviewSkillAssessment(id, {
    status: payload?.status,
    feedback: payload?.feedback,
    rubric: payload?.rubric,
    reviewer: reviewer.name,
    reviewerId: reviewer._id,
  })
}

module.exports = { claimAssessment, claimLeaseMs, decideAssessment, getCurrentReviewer, listReviewQueue, logoutReviewer, normalizeQueueFilters, releaseAssessment, signInReviewer }
