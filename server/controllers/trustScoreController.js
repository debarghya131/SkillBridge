const Student = require('../models/Student')
const { buildTrustScoreFactors, buildTrustScoreSummary } = require('../config/trustScoreDefaults')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')

const TRUST_EVENT_DEFINITIONS = Object.freeze({
  daily_challenge_solved: { label: 'Daily Challenge Solved', points: 80, category: 'Daily' },
  retention_task_completed: { label: 'Retention Task Completed', points: 20, category: 'Daily' },
  skill_verified: { label: 'Skill Verified', points: 60, category: 'Skills' },
  new_skill_added: { label: 'New Skill Added', points: 20, category: 'Skills' },
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

function buildTrustScoreActivity(student) {
  return readTrustScoreEvents(student)
    .slice()
    .sort((left, right) => new Date(right.occurredAt || 0) - new Date(left.occurredAt || 0))
    .slice(0, 30)
    .map(event => ({
      id: event.key,
      type: event.type,
      label: event.label,
      points: Number(event.points) || 0,
      category: event.category,
      referenceId: event.referenceId,
      occurredAt: event.occurredAt,
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

  student.trustScore = clampTrustScore(Number(student.trustScore) + definition.points)
  student.trustScoreState = {
    events: [...events, event].slice(-250),
    updatedAt: event.occurredAt,
  }

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
    } else {
      summary.penalties += points
    }
    return summary
  }, { earnedPoints: 0, penalties: 0 })

  return {
    trustScore: clampTrustScore(student.trustScore),
    factors,
    summary: events.length > 0
      ? { ...eventSummary, maxPoints: factorSummary.maxPoints }
      : factorSummary,
    activity: buildTrustScoreActivity(student),
  }
}

async function getStudentTrustScore(token) {
  const student = await findStudentByToken(token)
  return buildTrustScoreSnapshot(student)
}

async function recordStudentTrustScoreEvent(token, payload) {
  const student = await findStudentByToken(token)
  const eventType = typeof payload?.eventType === 'string' ? payload.eventType.trim() : ''

  if (!TRUST_EVENT_DEFINITIONS[eventType]) {
    throw buildAuthError('A valid TrustScore event is required')
  }

  const result = recordTrustScoreEvent(student, eventType, payload?.referenceId)

  if (result.recorded) {
    await student.save()
  }

  return {
    recorded: result.recorded,
    trustScore: buildTrustScoreSnapshot(student),
  }
}

module.exports = {
  buildTrustScoreSnapshot,
  getStudentTrustScore,
  recordStudentTrustScoreEvent,
  recordTrustScoreEvent,
  recordTrustScoreEvents,
}
