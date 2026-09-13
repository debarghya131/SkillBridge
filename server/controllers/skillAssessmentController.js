const mongoose = require('mongoose')
const Student = require('../models/Student')
const SkillAssessment = require('../models/SkillAssessment')
const { findModelByActiveToken, getSessionTtlMs, buildAuthError } = require('../utils/session')
const { buildStudentSkillHubSkills, applyReviewedSkillAssessment } = require('./skillHubController')
const { normalizeSubmissionLink } = require('./taskBridgeController')
const { CHALLENGES, STAGES, dayKey, isVerifiedSkill, skillBrief } = require('../utils/skillPolicy')

const EVENTS = { verify: 'verify_completed', reverify: 'reverify_completed', upgrade: 'upgrade_completed', retain: 'retention_completed', challenge: 'challenge_completed' }
const RUBRIC_WEIGHTS = { correctness: 40, evidence: 20, understanding: 20, testing: 10, communication: 10 }
const findStudent = token => findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))

function serialize(assessment) {
  return { id: String(assessment._id), skillName: assessment.skillName, mode: assessment.mode, targetStage: assessment.targetStage,
    challengeId: assessment.challengeId, evidenceLink: assessment.evidenceLink, response: assessment.response,
    status: assessment.status, feedback: assessment.feedback, createdAt: assessment.createdAt, reviewedAt: assessment.reviewedAt,
    earnedDay: assessment.earnedDay, brief: assessment.brief, rewardPoints: assessment.rewardPoints, rubric: assessment.rubric || null,
    reviewHistory: (assessment.reviewHistory || []).map(item => ({ status: item.status, feedback: item.feedback, reviewedAt: item.reviewedAt })) }
}

function serializeBlindAssessment(assessment) {
  const value = serialize(assessment)
  return {
    ...value,
    assignedReviewerId: assessment.assignedReviewerId ? String(assessment.assignedReviewerId) : '',
    assignedReviewerName: assessment.assignedReviewerName || '',
    claimedAt: assessment.claimedAt || null,
  }
}

function normalizeRubric(input) {
  if (!input || typeof input !== 'object') throw buildAuthError('Complete every rubric score before submitting a review')
  const rubric = {}
  for (const key of Object.keys(RUBRIC_WEIGHTS)) {
    if (input[key] == null || input[key] === '') throw buildAuthError('Complete every rubric score before submitting a review')
    const value = Number(input[key])
    if (!Number.isInteger(value) || value < 0 || value > 5) throw buildAuthError('Rubric scores must be whole numbers from 0 to 5')
    rubric[key] = value
  }
  rubric.total = Object.entries(RUBRIC_WEIGHTS).reduce((total, [key, weight]) => total + (rubric[key] * weight / 5), 0)
  return rubric
}

function validateAssessment(student, payload) {
  const mode = payload?.mode
  if (!Object.hasOwn(EVENTS, mode)) throw buildAuthError('Invalid assessment mode')
  const skill = buildStudentSkillHubSkills(student).find(item => item.name.toLowerCase() === String(payload.skillName || '').trim().toLowerCase())
  if (!skill) throw buildAuthError('Add this skill to your profile before submitting evidence')
  if (skill.archived) throw buildAuthError('Restore this skill before submitting new evidence for it', 409)
  const response = typeof payload.response === 'string' ? payload.response.trim() : ''
  if (response.length < 50 || response.length > 10000) throw buildAuthError('Describe your work in 50 to 10000 characters')
  const evidenceLink = payload.evidenceLink ? normalizeSubmissionLink(payload.evidenceLink) : ''
  const targetStage = mode === 'upgrade' ? payload.targetStage : ''
  if (mode === 'verify' && skill.renewalStatus !== 'unverified') throw buildAuthError('This skill is already verified. Use renewal when due.', 409)
  if (mode === 'reverify' && !['due', 'expired'].includes(skill.renewalStatus)) throw buildAuthError('Renewal is available within 30 days of expiry or after expiry.', 409)
  if (['upgrade', 'retain'].includes(mode) && !isVerifiedSkill(skill)) throw buildAuthError('An active verified skill is required')
  if (mode === 'upgrade' && (STAGES.indexOf(targetStage) !== STAGES.indexOf(skill.stage) + 1 || !STAGES.includes(targetStage))) {
    throw buildAuthError('Choose the next skill level for an upgrade')
  }
  const challengeId = mode === 'challenge' ? Number(payload.challengeId) : null
  if (mode === 'challenge' && (!Number.isInteger(challengeId) || challengeId < 1 || challengeId > 8)) throw buildAuthError('Invalid challenge')
  if (mode === 'challenge' && CHALLENGES.find(item => item.id === challengeId).skill.toLowerCase() !== skill.name.toLowerCase()) throw buildAuthError('This challenge belongs to a different skill')
  return { skillName: skill.name, mode, response, evidenceLink, targetStage, challengeId,
    attemptKey: JSON.stringify([skill.name.toLowerCase(), mode, targetStage, challengeId]) }
}

async function listStudentAssessments(token) {
  const student = await findStudent(token)
  const [open, recent] = await Promise.all([
    SkillAssessment.find({ studentId: student._id, status: { $in: ['pending', 'needs_revision'] } }).sort({ createdAt: -1 }).limit(100),
    SkillAssessment.find({ studentId: student._id, status: { $in: ['approved', 'rejected'] } }).sort({ createdAt: -1 }).limit(50),
  ])
  return [...new Map([...open, ...recent].map(item => [String(item._id), item])).values()].map(serialize)
}

async function submitSkillAssessment(token, payload) {
  const student = await findStudent(token)
  const values = validateAssessment(student, payload)
  const earnedDay = dayKey()
  const daily = ['retain', 'challenge'].includes(values.mode)
  const baseAttemptKey = values.attemptKey
  if (daily) values.attemptKey = `${baseAttemptKey}:${earnedDay}`
  if (!payload.id && daily && (student.skillHubState?.skillLog || []).some(item =>
    item.earnedDay === earnedDay && item.eventType === EVENTS[values.mode] && item.skillName.toLowerCase() === values.skillName.toLowerCase()
    && (values.mode !== 'challenge' || item.challengeId === values.challengeId))) throw buildAuthError('This task was already approved for today.', 409)
  try {
    if (payload.id) {
      if (!mongoose.isObjectIdOrHexString(payload.id)) throw buildAuthError('Invalid assessment ID')
      // Keep the original earned day and attempt key when revising older work.
      const revisionValues = { ...values }
      delete revisionValues.attemptKey
      const assessment = await SkillAssessment.findOneAndUpdate({ _id: payload.id, studentId: student._id,
        skillName: values.skillName, mode: values.mode, targetStage: values.targetStage, challengeId: values.challengeId, status: 'needs_revision' },
        { $set: { ...revisionValues, status: 'pending', open: true, reviewedAt: null }, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true })
      if (!assessment) throw buildAuthError('This assessment cannot be revised', 409)
      return serialize(assessment)
    }
    const existingOpen = await SkillAssessment.exists({
      studentId: student._id,
      ...(daily ? { $or: [{ attemptKey: values.attemptKey }, { attemptKey: baseAttemptKey, earnedDay }] } : { attemptKey: values.attemptKey }),
      status: { $in: ['pending', 'needs_revision'] },
    })
    if (existingOpen) throw buildAuthError('An assessment is already open. Revise the existing submission or wait for review.', 409)
    return serialize(await SkillAssessment.create({ ...values, earnedDay, brief: skillBrief(values), studentId: student._id }))
  } catch (error) {
    if (error.code === 11000) throw buildAuthError('An assessment is already awaiting review. Refresh your history.', 409)
    throw error
  }
}

async function reviewSkillAssessment(id, { status, feedback, reviewer, reviewerId, rubric: rubricInput }) {
  if (!mongoose.isObjectIdOrHexString(id)) throw buildAuthError('Invalid assessment ID')
  if (!['approved', 'rejected', 'needs_revision'].includes(status)) throw buildAuthError('Invalid review decision')
  if (typeof feedback !== 'string' || !feedback.trim() || feedback.length > 2000) throw buildAuthError('Review feedback is required (maximum 2000 characters)')
  if (typeof reviewer !== 'string' || !reviewer.trim() || reviewer.length > 100) throw buildAuthError('Reviewer identity is required')
  const rubric = rubricInput ? normalizeRubric(rubricInput) : null
  if (reviewerId && !rubric) throw buildAuthError('A completed review rubric is required')
  if (status === 'approved' && rubric && rubric.total < 70) throw buildAuthError('Approval requires a rubric score of at least 70', 409)
  // Approval and reputation changes must either both commit or neither commit.
  return mongoose.connection.transaction(async session => {
    const query = { _id: id, status: 'pending' }
    if (reviewerId) query.assignedReviewerId = reviewerId
    const assessment = await SkillAssessment.findOne(query).session(session)
    if (!assessment) throw buildAuthError('Assessment is not pending', 409)
    if (assessment.reviewHistory.length >= 50) throw buildAuthError('Assessment review limit reached. Open a new assessment.', 409)
    const student = await Student.findById(assessment.studentId).session(session)
    if (!student) throw buildAuthError('Student not found', 404)
    if (status === 'approved') {
      validateAssessment(student, assessment)
      assessment.rewardPoints = await applyReviewedSkillAssessment(student, { eventType: EVENTS[assessment.mode], skillName: assessment.skillName,
        targetStage: assessment.targetStage, challengeId: assessment.challengeId, assessmentId: String(assessment._id),
        earnedDay: assessment.earnedDay || dayKey(assessment.createdAt) }, session)
    }
    if (reviewerId && rubric && ((status === 'approved' && rubric.total >= 90) || (status === 'rejected' && rubric.total < 40))) {
      const { recordTrustScoreEvent } = require('./trustScoreController')
      recordTrustScoreEvent(student, status === 'approved' ? 'assessment_quality' : 'assessment_below_standard',
        status === 'approved' ? String(assessment._id) : assessment.earnedDay || dayKey(assessment.createdAt))
      await student.save({ session })
    }
    Object.assign(assessment, { status, open: status === 'needs_revision', feedback: feedback.trim(), reviewer: reviewer.trim(), rubric: rubric || assessment.rubric, reviewedAt: new Date() })
    assessment.reviewHistory.push({ status, feedback: assessment.feedback, reviewer: assessment.reviewer, reviewedAt: assessment.reviewedAt,
      response: assessment.response, evidenceLink: assessment.evidenceLink, rubric: assessment.rubric })
    await assessment.save({ session })
    return serialize(assessment)
  })
}

module.exports = { listStudentAssessments, normalizeRubric, reviewSkillAssessment, serializeBlindAssessment, submitSkillAssessment, validateAssessment }
