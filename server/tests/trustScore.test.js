const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildTrustScoreSnapshot,
  recordTrustScoreEvent,
} = require('../controllers/trustScoreController')

test('recordTrustScoreEvent persists points and ignores duplicate references', () => {
  const student = { trustScore: 990 }

  const first = recordTrustScoreEvent(student, 'daily_challenge_solved', '2026-09-08')
  const duplicate = recordTrustScoreEvent(student, 'daily_challenge_solved', '2026-09-08')

  assert.equal(first.recorded, true)
  assert.equal(duplicate.recorded, false)
  assert.equal(student.trustScore, 1000)
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
