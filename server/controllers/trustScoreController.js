const Student = require('../models/Student')
const { normalizeTrustEvents, validDailyReference } = require('../utils/trustLedger')
const { evaluateTrust, UNREVIEWED } = require('../utils/trustPolicy')
const { buildTrustScoreFactors, buildTrustScoreSummary } = require('../config/trustScoreDefaults')
const { DEMO_TRUST_ACTIVITY, DEMO_TRUST_PENALTIES, clone } = require('../config/showcaseFixtures')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')

const { TRUST_EVENT_DEFINITIONS } = require('../config/trustEventDefinitions')

const TRUST_SCORE_STUDENT_FIELDS = '_id sessions skills skillHubSkills trustScore trustScoreState'
const NETWORK_MILESTONES = Object.freeze([
  { threshold: 100, eventType: 'network_connections_100' },
  { threshold: 500, eventType: 'network_connections_500' },
  { threshold: 1000, eventType: 'network_connections_1000' },
])
const TEAM_UP_MILESTONES = Object.freeze([
  { threshold: 10, eventType: 'team_up_10' },
  { threshold: 50, eventType: 'team_up_50' },
  { threshold: 100, eventType: 'team_up_100' },
])

function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), TRUST_SCORE_STUDENT_FIELDS)
}

function normalizeReferenceId(referenceId) {
  if (!['string', 'number'].includes(typeof referenceId)) throw buildAuthError('A TrustScore evidence reference is required')
  const value = String(referenceId).trim()
  if (!value || value.length > 160) throw buildAuthError('Invalid TrustScore evidence reference')
  return value
}

function readTrustScoreEvents(student) {
  return Array.isArray(student.trustScoreState?.events)
    ? student.trustScoreState.events.filter(event => event && typeof event.key === 'string')
    : []
}

function calculateTrustScore(student) {
  return evaluateTrust(student, readTrustScoreEvents(student)).trustScore
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
  return normalizeTrustEvents(readTrustScoreEvents(student))
    .slice()
    .sort((left, right) => eventTimestamp(right) - eventTimestamp(left))
    .slice(0, 30)
    .map(event => ({
      id: event.key,
      type: event.type,
      label: event.label,
      points: UNREVIEWED.has(event.type) ? 0 : Number(event.points) || 0,
      category: event.category,
      referenceId: event.referenceId,
      occurredAt: eventTimestamp(event) ? event.occurredAt : null,
    }))
}

function recordTrustScoreEvent(student, eventType, referenceId) {
  const definition = Object.hasOwn(TRUST_EVENT_DEFINITIONS, eventType) ? TRUST_EVENT_DEFINITIONS[eventType] : null

  if (!definition) {
    throw buildAuthError('Unsupported TrustScore event')
  }

  const normalizedReferenceId = normalizeReferenceId(referenceId)
  if (!validDailyReference(eventType, normalizedReferenceId, new Date())) throw buildAuthError('Invalid or future practice day')
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
    policyVersion: 2,
  }

  student.trustScoreState = {
    ...student.trustScoreState,
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

// This helper is deliberately driven only by counts from persisted accepted
// records. Demo cards, pending requests, and cancelled connections never reach it.
function recordNetworkAchievementMilestones(student, { connections = 0, teamUps = 0 } = {}) {
  const record = (milestones, count) => milestones
    .filter(milestone => Number(count) >= milestone.threshold)
    .map(milestone => recordTrustScoreEvent(student, milestone.eventType, String(milestone.threshold)))
  const results = [...record(NETWORK_MILESTONES, connections), ...record(TEAM_UP_MILESTONES, teamUps)]
  return results.some(result => result.recorded)
}

function buildTrustScoreSnapshot(student) {
  const factors = buildTrustScoreFactors(student)
  const events = normalizeTrustEvents(readTrustScoreEvents(student))
  const factorSummary = buildTrustScoreSummary(factors)
  const eventSummary = events.reduce((summary, event) => {
    const points = UNREVIEWED.has(event.type) ? 0 : Number(event.points) || 0
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
    demoActivity: clone(DEMO_TRUST_ACTIVITY),
    demoPenalties: clone(DEMO_TRUST_PENALTIES),
    policy: evaluateTrust(student, events),
  }
}

async function getStudentTrustScore(token) {
  const student = await findStudentByToken(token)
  await require('./skillHubController').reconcileSkillExpiry(student)
  if (reconcileTrustScore(student)) await student.save()
  const snapshot = buildTrustScoreSnapshot(student)
  // TrustScore is a ledger, not a showcase: every displayed event must be
  // attributable to this account's persisted, server-recorded evidence.
  return snapshot
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
  recordNetworkAchievementMilestones,
}
