const test = require('node:test')
const assert = require('node:assert/strict')
const { evaluateTrust } = require('../utils/trustPolicy')
const { recordTrustScoreEvent } = require('../controllers/trustScoreController')
const activeSkill = stage => ({ name: stage, verified: true, stage, renewalDue: '2099-01-01' })
const events = (type, count, points) => Array.from({ length: count }, (_, index) => {
  const referenceId = ['daily_challenge_solved', 'retention_task_completed'].includes(type)
    ? new Date(Date.UTC(2020, 0, 1) + index * 86400000).toISOString().slice(0, 10) : String(index)
  return { key: `${type}:${referenceId}`, type, referenceId, points }
})

test('unreviewed content and repeated daily activity cannot buy the top tier', () => {
  assert.equal(evaluateTrust({}, events('project_uploaded', 100, 80)).trustScore, 0)
  assert.equal(evaluateTrust({}, events('profile_link_added', 100, 50)).trustScore, 0)
  assert.equal(evaluateTrust({}, events('daily_challenge_solved', 1000, 80)).trustScore, 500)
  assert.equal(evaluateTrust({}, events('made_up_event', 1000, 100)).trustScore, 0)
})

test('progressively harder tiers require verified skills, GIG outcomes, practice and quality', () => {
  const ledger = [...events('skill_verified', 25, 60), ...events('gig_completed', 10, 150),
    ...events('retention_task_completed', 90, 20), ...events('assessment_quality', 10, 25)]
  assert.equal(evaluateTrust({}, ledger).trustScore, 500)
  assert.equal(evaluateTrust({ skillHubSkills: [activeSkill('Intermediate'), activeSkill('Beginner')] }, ledger).trustScore, 700)
  assert.equal(evaluateTrust({ skillHubSkills: [activeSkill('Pro'), activeSkill('Beginner')] }, ledger).trustScore, 899)
  const student = { skillHubSkills: [{ ...activeSkill('Pro Mastery'), name: 'React' }, { ...activeSkill('Pro Mastery'), name: 'SQL' }] }
  assert.equal(evaluateTrust(student, ledger).trustScore, 1000)
  assert.equal(evaluateTrust(student, ledger.filter(item => item.type !== 'assessment_quality')).trustScore, 899)
  assert.equal(evaluateTrust(student, [...ledger, ...events('skill_expired', 1, -80)]).trustScore, 920)
  student.skillHubSkills.forEach(skill => { skill.renewalDue = '2020-01-01' })
  assert.equal(evaluateTrust(student, ledger).trustScore, 500)
})

test('discounts apply at 500 and 700, duplicate evidence is not counted twice', () => {
  const student = { skillHubSkills: [activeSkill('Beginner'), activeSkill('Intermediate')] }
  const ledger = events('skill_verified', 10, 60)
  assert.equal(evaluateTrust(student, ledger).trustScore, 540)
  assert.equal(evaluateTrust(student, [...ledger, ...ledger]).trustScore, 540)
  assert.equal(evaluateTrust(student, events('skill_verified', 20, 60)).trustScore, 700)
})

test('new credits and evidence-based penalties are idempotent', () => {
  const student = {}
  recordTrustScoreEvent(student, 'assessment_quality', 'assessment-1')
  recordTrustScoreEvent(student, 'assessment_quality', 'assessment-1')
  recordTrustScoreEvent(student, 'practice_milestone', '30')
  recordTrustScoreEvent(student, 'assessment_below_standard', '2026-09-12')
  recordTrustScoreEvent(student, 'assessment_below_standard', '2026-09-12')
  assert.equal(student.trustScore, 40)
  assert.equal(student.trustScoreState.events.length, 3)
})
