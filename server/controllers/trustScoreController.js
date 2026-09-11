const Student = require('../models/Student')
const { buildTrustScoreFactors, buildTrustScoreSummary } = require('../config/trustScoreDefaults')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')

const TRUST_EVENT_DEFINITIONS = Object.freeze({
  daily_challenge_solved: { label: 'Daily Challenge Solved', points: 80, category: 'Daily' },
  retention_task_completed: { label: 'Retention Task Completed', points: 20, category: 'Daily' },
  skill_verified: { label: 'Skill Verified', points: 60, category: 'Skills' },
  new_skill_added: { label: 'New Skill Added', points: 0, category: 'Skills' },
  skill_level_upgraded: { label: 'Skill Level Upgraded', points: 100, category: 'Skills' },
  project_uploaded: { label: 'Project Uploaded', points: 80, category: 'Projects' },
  gig_completed: { label: 'GIG Completed', points: 150, category: 'GIGs' },
  skill_reverified: { label: 'Skill Re-Verified', points: 50, category: 'Skills' },
  profile_link_added: { label: 'Profile Links Added', points: 50, category: 'Profile' },
  intro_video_uploaded: { label: 'Intro Video Uploaded', points: 50, category: 'Profile' },
  skill_expired: { label: 'Skill Expired', points: -80, category: 'Penalty' },
  retention_task_missed: { label: 'Retention Task Missed', points: -30, category: 'Penalty' },
  retention_answer_wrong: { label: 'Wrong Retention Answer', points: -10, category: 'Penalty' },
})

function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
}

function clampTrustScore(value) {
  return Math.max(0, Math.min(1000, Number(value) || 0))
}

function normalizeReferenceId(referenceId) {
  if (referenceId === undefined || referenceId === null || referenceId === '') {
    return 'account'
  }

  return String(referenceId).trim().slice(0, 160) || 'account'
}

function readTrustScoreEvents(student) {
  return Array.isArray(student.trustScoreState?.events)
    ? student.trustScoreState.events.filter(event => event && typeof event.key === 'string')
    : []
}

function calculateTrustScore(student) {
  return readTrustScoreEvents(student)
    .reduce((total, event) => clampTrustScore(total + (Number(event.points) || 0)), 0)
}

function reconcileTrustScore(student) {
  const ledgerScore = calculateTrustScore(student)
  if (Number(student.trustScore) === ledgerScore) return false
  student.trustScore = ledgerScore
  return true
}

function eventTimestamp(event) {
  const timestamp = new Date(event?.occurredAt || 0).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function buildTrustScoreActivity(student) {
  return readTrustScoreEvents(student)
    .slice()
    .sort((left, right) => eventTimestamp(right) - eventTimestamp(left))
    .slice(0, 30)
    .map(event => ({
      id: event.key,
      type: event.type,
      label: event.label,
      points: Number(event.points) || 0,
      category: event.category,
      referenceId: event.referenceId,
      occurredAt: eventTimestamp(event) ? event.occurredAt : null,
    }))
}

function recordTrustScoreEvent(student, eventType, referenceId) {
  const definition = TRUST_EVENT_DEFINITIONS[eventType]

  if (!definition) {
    throw buildAuthError('Unsupported TrustScore event')
  }

  const normalizedReferenceId = normalizeReferenceId(referenceId)
  const key = `${eventType}:${normalizedReferenceId}`
  const events = readTrustScoreEvents(student)

  if (events.some(event => event.key === key)) {
    reconcileTrustScore(student)
    return {
      recorded: false,
      event: events.find(event => event.key === key),
    }
  }

  const event = {
    key,
    type: eventType,
    label: definition.label,
    points: definition.points,
    category: definition.category,
    referenceId: normalizedReferenceId,
    occurredAt: new Date().toISOString(),
  }

  student.trustScoreState = {
    events: [...events, event],
    updatedAt: event.occurredAt,
  }
  reconcileTrustScore(student)

  return { recorded: true, event }
}

function recordTrustScoreEvents(student, events) {
  const results = events.map(event => recordTrustScoreEvent(student, event.type, event.referenceId))
  return results.some(result => result.recorded)
}

function buildTrustScoreSnapshot(student) {
  const factors = buildTrustScoreFactors(student)
  const events = readTrustScoreEvents(student)
  const factorSummary = buildTrustScoreSummary(factors)
  const eventSummary = events.reduce((summary, event) => {
    const points = Number(event.points) || 0
    if (points > 0) {
      summary.earnedPoints += points
      summary.approvedActions += 1
    } else {
      summary.penalties += points
    }
    return summary
  }, { earnedPoints: 0, penalties: 0, approvedActions: 0 })

  return {
    trustScore: calculateTrustScore(student),
    factors,
    summary: events.length > 0
      ? { ...eventSummary, maxPoints: factorSummary.maxPoints }
      : factorSummary,
    activity: buildTrustScoreActivity(student),
  }
}

async function getStudentTrustScore(token) {
  const student = await findStudentByToken(token)
  await require('./skillHubController').reconcileSkillExpiry(student)
  if (reconcileTrustScore(student)) await student.save()
  return buildTrustScoreSnapshot(student)
}

async function recordStudentTrustScoreEvent(token, payload) {
  await findStudentByToken(token)
  throw buildAuthError('TrustScore events are recorded only by verified server workflows.', 403)
}

module.exports = {
  buildTrustScoreSnapshot,
  calculateTrustScore,
  getStudentTrustScore,
  reconcileTrustScore,
  recordStudentTrustScoreEvent,
  recordTrustScoreEvent,
  recordTrustScoreEvents,
}
