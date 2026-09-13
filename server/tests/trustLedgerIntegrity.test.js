const test = require('node:test')
const assert = require('node:assert/strict')
const Student = require('../models/Student')
const { normalizeTrustEvents } = require('../utils/trustLedger')
const { evaluateTrust } = require('../utils/trustPolicy')
const { recordTrustScoreEvent, buildTrustScoreSnapshot } = require('../controllers/trustScoreController')

test('canonical policy points and deduplication are shared by score, totals and activity', () => {
  const credit = { key: 'skill_verified:react', points: 999999 }
  const student = { trustScoreState: { events: [credit, credit, { key: 'invented:1', points: -1000 }] } }
  const snapshot = buildTrustScoreSnapshot(student)
  assert.equal(snapshot.trustScore, 60)
  assert.equal(snapshot.summary.earnedPoints, 60)
  assert.equal(snapshot.summary.approvedActions, 1)
  assert.equal(snapshot.activity.length, 1)
  assert.equal(snapshot.activity[0].points, 60)
})

test('malformed, contradictory and future events cannot grant evidence', () => {
  const events = [null, {}, { key: 'gig_completed:x', type: 'skill_verified' },
    { key: 'gig_completed:y', referenceId: 'different' },
    { key: 'gig_completed:z', occurredAt: '2099-01-01' }]
  assert.deepEqual(normalizeTrustEvents(events, '2026-09-12'), [])
  assert.equal(evaluateTrust({}, events, '2026-09-12').evidence.completedGigs, 0)
})

test('penalties expire at exactly 90 days and never before their recorded time', () => {
  const event = { key: 'assessment_below_standard:day', occurredAt: '2026-01-01T00:00:00Z' }
  const start = Date.parse(event.occurredAt)
  assert.equal(evaluateTrust({}, [event], new Date(start - 1)).penalties, 0)
  assert.equal(evaluateTrust({}, [event], new Date(start + 90 * 86400000 - 1)).penalties, -10)
  assert.equal(evaluateTrust({}, [event], new Date(start + 90 * 86400000)).penalties, 0)
})

test('duplicate skill names do not unlock tiers', () => {
  const skill = { name: 'React', stage: 'Pro', verified: true, renewalDue: '2099-01-01' }
  const policy = evaluateTrust({ skillHubSkills: [skill, { ...skill, name: ' REACT ' }] }, [])
  assert.equal(policy.evidence.verifiedSkills, 1)
  assert.equal(policy.evidence.proSkills, 1)
  assert.equal(policy.ceiling, 500)
})

test('daily evidence requires a real completed calendar day', () => {
  const events = ['2099-01-01', '2026-02-30', 'invalid', '2026-09-11'].map(day => ({ key: `retention_task_completed:${day}` }))
  const policy = evaluateTrust({}, events, '2026-09-12')
  assert.equal(policy.evidence.practiceDays, 1)
  assert.equal(policy.trustScore, 20)
  assert.throws(() => recordTrustScoreEvent({}, 'daily_challenge_solved', '2099-01-01'))
})

test('event recording rejects missing or truncated references and preserves account metadata', () => {
  const student = { trustScoreState: { auditNote: 'keep', events: [] } }
  for (const reference of [undefined, '', {}, 'x'.repeat(161)]) {
    assert.throws(() => recordTrustScoreEvent(student, 'gig_completed', reference))
  }
  recordTrustScoreEvent(student, 'gig_completed', 'submission-id')
  assert.equal(student.trustScoreState.auditNote, 'keep')
  assert.equal(student.trustScoreState.events[0].policyVersion, 2)
})

test('stale ledger saves use a version predicate and return conflict without losing credits', async t => {
  const student = Student.hydrate({ _id: '507f1f77bcf86cd799439011', name: 'Test student', passwordHash: 'test-only', __v: 3, trustScore: 0, trustScoreState: { events: [] } })
  recordTrustScoreEvent(student, 'skill_verified', 'react')
  t.mock.method(Student.collection, 'updateOne', async filter => {
    assert.equal(filter.__v, 3)
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0 }
  })
  await assert.rejects(student.save(), error => error.name === 'VersionError' && error.statusCode === 409)
})
