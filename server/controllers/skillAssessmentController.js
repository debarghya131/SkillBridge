const mongoose = require('mongoose')
const Student = require('../models/Student')
const SkillAssessment = require('../models/SkillAssessment')
const SkillCatalog = require('../models/SkillCatalog')
const { findModelByActiveToken, getSessionTtlMs, buildAuthError } = require('../utils/session')
const { buildStudentSkillHubSkills, applyReviewedSkillAssessment } = require('./skillHubController')
const { reconcileTrustScore } = require('./trustScoreController')
const { practiceInstructionsFor } = require('../utils/skillCatalog')
const { normalizeSubmissionLink } = require('./taskBridgeController')
const { CHALLENGES, STAGES, dayKey, isVerifiedSkill, skillBrief } = require('../utils/skillPolicy')
const { assertNotDemo, demoReadOnlyError } = require('../utils/demoProtection')
const { DEMO_ASSESSMENTS, DEMO_SKILLS, clone } = require('../config/showcaseFixtures')

const EVENTS = { verify: 'verify_completed', reverify: 'reverify_completed', upgrade: 'upgrade_completed', retain: 'retention_completed', challenge: 'challenge_completed' }
const RUBRIC_WEIGHTS = { correctness: 40, evidence: 20, understanding: 20, testing: 10, communication: 10 }
const findStudent = token => findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))

function serialize(assessment) {
  return { id: String(assessment._id), demoData: assessment.demoData === true, skillName: assessment.skillName, mode: assessment.mode, targetStage: assessment.targetStage,
    catalogSkillId: assessment.catalogSkillId ? String(assessment.catalogSkillId) : '', catalogVersion: assessment.catalogVersion || null,
    challengeId: assessment.challengeId, evidenceLink: assessment.evidenceLink, response: assessment.response,
    status: assessment.status, feedback: assessment.feedback, createdAt: assessment.createdAt, reviewedAt: assessment.reviewedAt,
    earnedDay: assessment.earnedDay, brief: assessment.brief, criteriaSnapshot: assessment.criteriaSnapshot || null,
    rewardPoints: assessment.rewardPoints, rewardBreakdown: assessment.rewardBreakdown || [],
    trustScoreChange: assessment.trustScoreChange ?? null, rubric: assessment.rubric || null,
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

function catalogCriteria(skill, definition, mode, targetStage, challenge) {
  if (!definition) return null
  const upgrade = mode === 'upgrade' ? (definition.upgradeRequirements || []).find(item => item.stage === targetStage) : null
  const instructions = mode === 'retain' ? practiceInstructionsFor(definition)
    : mode === 'challenge' ? challenge?.instructions
    : mode === 'upgrade' ? upgrade?.instructions || definition.verificationInstructions
      : definition.verificationInstructions
  return { catalogSkillId: String(definition._id), catalogVersion: definition.version, skillName: definition.name,
    mode, targetStage: targetStage || '', challengeId: challenge ? String(challenge._id) : null,
    renewalDays: definition.renewalDays, taskTitle: challenge?.title || '', taskKind: challenge?.kind || '',
    reviewMode: challenge?.reviewMode || 'reviewer', instructions: instructions || skillBrief({ mode, skillName: skill.name, targetStage }) }
}

function validateAssessment(student, payload, definition = null, existingAssessment = null) {
  const mode = payload?.mode
  if (!Object.hasOwn(EVENTS, mode)) throw buildAuthError('Invalid assessment mode')
  const skill = buildStudentSkillHubSkills(student).find(item => item.name.toLowerCase() === String(payload.skillName || '').trim().toLowerCase())
  if (!skill) throw buildAuthError('Add this skill to your profile before submitting evidence')
  if (skill.archived) throw buildAuthError('Restore this skill before submitting new evidence for it', 409)
  if (skill.source === 'self_declared') throw buildAuthError('Self-declared skills cannot be verified. Request a platform catalog skill first.', 409)
  const response = typeof payload.response === 'string' ? payload.response.trim() : ''
  if (response.length < 50 || response.length > 10000) throw buildAuthError('Describe your work in 50 to 10000 characters')
  const evidenceLink = payload.evidenceLink ? normalizeSubmissionLink(payload.evidenceLink) : ''
  const targetStage = mode === 'upgrade' ? payload.targetStage : ''
  if (mode === 'verify' && skill.renewalStatus !== 'unverified') throw buildAuthError('This skill is already verified. Use renewal when due.', 409)
  if (mode === 'verify' && skill.source === 'legacy') throw buildAuthError('Only platform catalog skills can be verified. Add or request the catalog skill first.', 409)
  if (mode === 'reverify' && !['due', 'expired'].includes(skill.renewalStatus)) throw buildAuthError('Renewal is available within 30 days of expiry or after expiry.', 409)
  // A server-persisted submission retains its eligibility while awaiting review.
  const previouslyEligible = existingAssessment && Boolean(skill.verifiedAt || skill.verified)
  if (['upgrade', 'retain', 'challenge'].includes(mode) && !isVerifiedSkill(skill) && !previouslyEligible) throw buildAuthError('An active verified skill is required')
  if (mode === 'upgrade' && (STAGES.indexOf(targetStage) !== STAGES.indexOf(skill.stage) + 1 || !STAGES.includes(targetStage))) {
    throw buildAuthError('Choose the next skill level for an upgrade')
  }
  if (mode === 'upgrade' && definition && (!(definition.stages || []).includes(targetStage)
    || !(definition.upgradeRequirements || []).some(item => item.stage === targetStage))) {
    throw buildAuthError('This level is not available in the current platform standard.', 409)
  }
  let challengeId = null
  let challenge = null
  if (mode === 'challenge') {
    if (definition) {
      challenge = (definition.dailyTasks || []).find(item => item.active !== false && String(item._id) === String(payload.challengeId || ''))
      if (!challenge) throw buildAuthError('This platform challenge is no longer available.', 409)
      challengeId = String(challenge._id)
    } else if (existingAssessment?.criteriaSnapshot?.challengeId) {
      if (String(existingAssessment.criteriaSnapshot.challengeId) !== String(payload.challengeId)) throw buildAuthError('This challenge does not match the assigned assessment')
      challengeId = payload.challengeId
    } else {
      challengeId = Number(payload.challengeId)
      const legacyChallenge = CHALLENGES.find(item => item.id === challengeId)
      if (!legacyChallenge) throw buildAuthError('Invalid challenge')
      if (legacyChallenge.skill.toLowerCase() !== skill.name.toLowerCase()) throw buildAuthError('This challenge belongs to a different skill')
    }
  }
  const criteriaSnapshot = existingAssessment?.criteriaSnapshot || catalogCriteria(skill, definition, mode, targetStage, challenge)
  const catalogSkillId = existingAssessment?.catalogSkillId || definition?._id || skill.catalogSkillId || null
  const catalogVersion = existingAssessment?.catalogVersion || definition?.version || skill.catalogVersion || null
  const brief = criteriaSnapshot?.instructions || skillBrief({ mode, skillName: skill.name, targetStage, challengeId })
  return { skillName: skill.name, mode, response, evidenceLink, targetStage, challengeId, catalogSkillId, catalogVersion, criteriaSnapshot, brief,
    attemptKey: JSON.stringify([catalogSkillId ? String(catalogSkillId) : skill.name.toLowerCase(), mode, targetStage, challengeId]) }
}

async function listStudentAssessments(token) {
  const student = await findStudent(token)
  const [open, recent] = await Promise.all([
    SkillAssessment.find({ studentId: student._id, status: { $in: ['pending', 'needs_revision'] } }).sort({ createdAt: -1 }).limit(100),
    SkillAssessment.find({ studentId: student._id, status: { $in: ['approved', 'rejected'] } }).sort({ createdAt: -1 }).limit(50),
  ])
  return [...[...new Map([...open, ...recent].map(item => [String(item._id), item])).values()].map(serialize), ...clone(DEMO_ASSESSMENTS)]
}

async function submitSkillAssessment(token, payload) {
  const student = await findStudent(token)
  assertNotDemo(payload?.id)
  let revision = null
  if (payload?.id) {
    if (!mongoose.isObjectIdOrHexString(payload.id)) throw buildAuthError('Invalid assessment ID')
    revision = await SkillAssessment.findOne({ _id: payload.id, studentId: student._id, status: 'needs_revision' })
    if (!revision) throw buildAuthError('This assessment cannot be revised', 409)
  }
  const requestedSkillName = String(revision?.skillName || payload?.skillName || '').trim().toLowerCase()
  const requestedSkill = buildStudentSkillHubSkills(student).find(item => item.name.toLowerCase() === requestedSkillName)
  if (!requestedSkill && DEMO_SKILLS.some(item => item.name.toLowerCase() === requestedSkillName)) throw demoReadOnlyError()
  let definition = null
  if (!revision && requestedSkill?.catalogSkillId) {
    definition = await SkillCatalog.findOne({ _id: requestedSkill.catalogSkillId, status: 'published' })
    if (!definition) throw buildAuthError('This platform skill is no longer available for new assessments.', 409)
  }
  const assessmentPayload = revision ? { ...payload, skillName: revision.skillName, mode: revision.mode,
    targetStage: revision.targetStage, challengeId: revision.challengeId, criteriaSnapshot: revision.criteriaSnapshot,
    catalogSkillId: revision.catalogSkillId, catalogVersion: revision.catalogVersion } : payload
  const values = validateAssessment(student, assessmentPayload, definition, revision)
  if (!revision && definition && payload.catalogVersion != null && Number(payload.catalogVersion) !== definition.version) {
    throw buildAuthError('The platform standard changed. Refresh the requirements before submitting.', 409)
  }
  const earnedDay = dayKey()
  const daily = ['retain', 'challenge'].includes(values.mode)
  const baseAttemptKey = values.attemptKey
  const dailySubmissionKey = daily ? `${values.mode}:${earnedDay}` : ''
  if (daily) values.attemptKey = `${baseAttemptKey}:${earnedDay}`
  if (!payload.id && daily && (student.skillHubState?.skillLog || []).some(item => item.earnedDay === earnedDay && item.eventType === EVENTS[values.mode])) {
    throw buildAuthError('A daily submission was already approved for today.', 409)
  }
  try {
    if (payload.id) {
      // Keep the original earned day and attempt key when revising older work.
      const revisionValues = { ...values }
      delete revisionValues.attemptKey
      const assessment = await SkillAssessment.findOneAndUpdate({ _id: payload.id, studentId: student._id,
        skillName: values.skillName, mode: values.mode, targetStage: values.targetStage, challengeId: values.challengeId, status: 'needs_revision' },
        { $set: { ...revisionValues, status: 'pending', open: true, reviewedAt: null }, $inc: { __v: 1 } }, { returnDocument: 'after', runValidators: true })
      if (!assessment) throw buildAuthError('This assessment cannot be revised', 409)
      return serialize(assessment)
    }
    if (daily) {
      const existingDailyOpen = await SkillAssessment.exists({ studentId: student._id, mode: values.mode, earnedDay, open: true })
      if (existingDailyOpen) throw buildAuthError('A daily submission is already open for today. Revise it or wait for review.', 409)
    }
    const existingOpen = await SkillAssessment.exists({
      studentId: student._id,
      ...(daily ? { $or: [{ attemptKey: values.attemptKey }, { attemptKey: baseAttemptKey, earnedDay }] } : { attemptKey: values.attemptKey }),
      status: { $in: ['pending', 'needs_revision'] },
    })
    if (existingOpen) throw buildAuthError('An assessment is already open. Revise the existing submission or wait for review.', 409)
    return serialize(await SkillAssessment.create({ ...values, ...(daily ? { dailySubmissionKey } : {}), earnedDay, studentId: student._id }))
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
  if (status === 'approved' && rubric && ['correctness', 'evidence', 'understanding'].some(key => rubric[key] < 3)) {
    throw buildAuthError('Approval requires at least 3/5 for correctness, evidence, and understanding.', 409)
  }
  // Approval and reputation changes must either both commit or neither commit.
  return mongoose.connection.transaction(async session => {
    const query = { _id: id, status: 'pending' }
    if (reviewerId) query.assignedReviewerId = reviewerId
    const assessment = await SkillAssessment.findOne(query).session(session)
    if (!assessment) throw buildAuthError('Assessment is not pending', 409)
    if (assessment.demoData) throw demoReadOnlyError()
    if (assessment.reviewHistory.length >= 50) throw buildAuthError('Assessment review limit reached. Open a new assessment.', 409)
    const student = await Student.findById(assessment.studentId).session(session)
    if (!student) throw buildAuthError('Student not found', 404)
    reconcileTrustScore(student)
    const previousScore = student.trustScore
    const previousEvents = new Set((student.trustScoreState?.events || []).map(event => event.key))
    if (status === 'approved') {
      validateAssessment(student, assessment, null, assessment)
      assessment.rewardPoints = await applyReviewedSkillAssessment(student, { eventType: EVENTS[assessment.mode], skillName: assessment.skillName,
        targetStage: assessment.targetStage, challengeId: assessment.challengeId, assessmentId: String(assessment._id),
        criteriaSnapshot: assessment.criteriaSnapshot,
        earnedDay: assessment.earnedDay || dayKey(assessment.createdAt) }, session)
    }
    if (reviewerId && rubric && ((status === 'approved' && rubric.total >= 90) || (status === 'rejected' && rubric.total < 40))) {
      const { recordTrustScoreEvent } = require('./trustScoreController')
      recordTrustScoreEvent(student, status === 'approved' ? 'assessment_quality' : 'assessment_below_standard',
        status === 'approved' ? String(assessment._id) : assessment.earnedDay || dayKey(assessment.createdAt))
      await student.save({ session })
    }
    assessment.rewardBreakdown = (student.trustScoreState?.events || []).filter(event => !previousEvents.has(event.key))
      .map(event => ({ type: event.type, points: event.points, referenceId: event.referenceId }))
    assessment.rewardPoints = assessment.rewardBreakdown.reduce((total, event) => total + event.points, 0)
    assessment.trustScoreChange = student.trustScore - previousScore
    Object.assign(assessment, { status, open: status === 'needs_revision', feedback: feedback.trim(), reviewer: reviewer.trim(), rubric: rubric || assessment.rubric, reviewedAt: new Date() })
    assessment.reviewHistory.push({ status, feedback: assessment.feedback, reviewer: assessment.reviewer, reviewedAt: assessment.reviewedAt,
      response: assessment.response, evidenceLink: assessment.evidenceLink, rubric: assessment.rubric })
    await assessment.save({ session })
    return serialize(assessment)
  })
}

module.exports = { listStudentAssessments, normalizeRubric, reviewSkillAssessment, serializeBlindAssessment, submitSkillAssessment, validateAssessment }
