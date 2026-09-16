const test = require('node:test')
const assert = require('node:assert/strict')
const Student = require('../models/Student')
const { DEMO_TRUST_ACTIVITY, DEMO_TRUST_PENALTIES } = require('../config/showcaseFixtures')
const {
  buildTrustScoreSnapshot,
  calculateTrustScore,
  getStudentTrustScore,
  recordNetworkAchievementMilestones,
  reconcileTrustScore,
  recordTrustScoreEvent,
} = require('../controllers/trustScoreController')

test('recordTrustScoreEvent recalculates from the ledger and ignores duplicate references', () => {
  const student = { trustScore: 990 }

  const first = recordTrustScoreEvent(student, 'daily_challenge_solved', '2026-09-08')
  const duplicate = recordTrustScoreEvent(student, 'daily_challenge_solved', '2026-09-08')

  assert.equal(first.recorded, true)
  assert.equal(duplicate.recorded, false)
  assert.equal(student.trustScore, 80)
  assert.equal(student.trustScoreState.events.length, 1)
})

test('TrustScore penalties are clamped and returned in activity', () => {
  const student = { trustScore: 5 }

  recordTrustScoreEvent(student, 'retention_task_missed', 'react:2026-09-08')
  const snapshot = buildTrustScoreSnapshot(student)

  assert.equal(student.trustScore, 0)
  assert.equal(snapshot.trustScore, 0)
  assert.equal(snapshot.activity[0].type, 'retention_task_missed')
  assert.equal(snapshot.activity[0].points, -30)
})

test('TrustScore reconciliation removes an unrecorded historical balance', () => {
  const student = { trustScore: 785, trustScoreState: { events: [
    { key: 'retention_task_completed:2026-09-11', points: 20 },
    { key: 'daily_challenge_solved:2026-09-11', points: 80 },
  ] } }

  assert.equal(calculateTrustScore(student), 100)
  assert.equal(reconcileTrustScore(student), true)
  assert.equal(student.trustScore, 100)
  assert.equal(reconcileTrustScore(student), false)
  assert.equal(buildTrustScoreSnapshot(student).trustScore, 100)
})

test('TrustScore reads persist a reconciled ledger balance', async t => {
  let saves = 0
  const student = {
    trustScore: 785,
    sessions: [{ token: 'active-token', createdAt: new Date() }],
    skillHubSkills: [],
    trustScoreState: { events: [
      { key: 'retention_task_completed:2026-09-11', points: 20 },
      { key: 'daily_challenge_solved:2026-09-11', points: 80 },
    ] },
    save: async () => { saves += 1 },
  }
  t.mock.method(Student, 'findOne', async () => student)

  const snapshot = await getStudentTrustScore('active-token')

  assert.equal(snapshot.trustScore, 100)
  assert.equal(student.trustScore, 100)
  assert.equal(saves, 1)
  assert.equal(snapshot.activity.length, 2)
  assert.equal(snapshot.activity.some(event => event.demoData === true), false)
  assert.equal(snapshot.factors.some(factor => factor.demoData === true), false)
  assert.deepEqual(snapshot.demoActivity, DEMO_TRUST_ACTIVITY)
  assert.deepEqual(snapshot.demoPenalties, DEMO_TRUST_PENALTIES)
})

test('TrustScore snapshot reports lifetime approved actions while limiting the recent ledger', () => {
  const start = Date.UTC(2026, 0, 1)
  const student = {
    trustScore: 1000,
    trustScoreState: {
      events: Array.from({ length: 31 }, (_, index) => ({
        key: `daily_challenge_solved:2026-01-${String(index + 1).padStart(2, '0')}`,
        type: 'daily_challenge_solved',
        label: 'Daily Challenge Solved',
        points: 80,
        category: 'Daily',
        referenceId: `2026-01-${String(index + 1).padStart(2, '0')}`,
        occurredAt: new Date(start + index * 1000).toISOString(),
      })),
    },
  }

  const snapshot = buildTrustScoreSnapshot(student)

  assert.equal(snapshot.summary.approvedActions, 31)
  assert.equal(snapshot.summary.earnedPoints, 2480)
  assert.equal(snapshot.summary.penalties, 0)
  assert.equal(snapshot.activity.length, 30)
  assert.equal(snapshot.activity.some(event => event.id === 'daily_challenge_solved:2026-01-01'), false)
  assert.equal(snapshot.activity[0].id, 'daily_challenge_solved:2026-01-31')
})

test('TrustScore activity tolerates malformed legacy dates', () => {
  const student = {
    trustScore: 0,
    trustScoreState: {
      events: [{
        key: 'retention_task_missed:react:2026-02-01',
        type: 'retention_task_missed',
        label: 'Retention Task Missed',
        points: -30,
        category: 'Penalty',
        referenceId: 'react:2026-02-01',
        occurredAt: 'invalid-date-from-legacy-data',
      }],
    },
  }

  const snapshot = buildTrustScoreSnapshot(student)

  assert.equal(snapshot.activity[0].occurredAt, null)
  assert.equal(snapshot.summary.penalties, -30)
})

test('network and Team-Up achievements use real thresholds and are idempotent', () => {
  const student = { trustScore: 0, skillHubSkills: [] }

  assert.equal(recordNetworkAchievementMilestones(student, { connections: 99, teamUps: 9 }), false)
  assert.equal(student.trustScoreState, undefined)

  assert.equal(recordNetworkAchievementMilestones(student, { connections: 500, teamUps: 50 }), true)
  assert.deepEqual(student.trustScoreState.events.map(event => event.type).sort(), [
    'network_connections_100', 'network_connections_500', 'team_up_10', 'team_up_50',
  ])
  assert.equal(student.trustScore, 200)

  assert.equal(recordNetworkAchievementMilestones(student, { connections: 500, teamUps: 50 }), false)
  assert.equal(student.trustScoreState.events.length, 4)
})
