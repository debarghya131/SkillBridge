const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Student = require('../models/Student')
const SkillAssessment = require('../models/SkillAssessment')
const { reviewSkillAssessment } = require('../controllers/skillAssessmentController')
const { evaluateTrust } = require('../utils/trustPolicy')

test('assigned reviewer rubric awards quality credit and records a low-score rejection penalty transactionally', async t => {
  const student = new Student({ name: 'Reviewer test', passwordHash: 'test', skillHubSkills: [{ name: 'React', source: 'catalog', verified: false }] })
  student.save = async options => { assert.equal(options.session, 'transaction') }
  let assessment = new SkillAssessment({ studentId: student._id, skillName: 'React', mode: 'verify', attemptKey: 'test', earnedDay: '2026-09-12', response: 'I implemented the original solution and tested all the documented edge cases with evidence.' })
  const reviewerId = new mongoose.Types.ObjectId()
  t.mock.method(mongoose.connection, 'transaction', async callback => callback('transaction'))
  t.mock.method(SkillAssessment, 'findOne', query => {
    assert.equal(query.assignedReviewerId, reviewerId)
    return { session: async () => assessment }
  })
  t.mock.method(Student, 'findById', () => ({ session: async () => student }))
  assessment.save = async () => assessment
  const rubric = score => ({ correctness: score, evidence: score, understanding: score, testing: score, communication: score })
  await reviewSkillAssessment(String(assessment._id), { status: 'approved', feedback: 'Reviewed original evidence.', reviewer: 'Reviewer', reviewerId, rubric: rubric(5) })
  assert.equal(student.trustScore, 85)
  assert.equal(student.trustScoreState.events.filter(item => item.type === 'assessment_quality').length, 1)
  assessment = new SkillAssessment({ studentId: student._id, skillName: 'React', mode: 'retain', attemptKey: 'retain', earnedDay: '2026-09-12', response: 'New practice evidence with detailed explanations and results.' })
  assessment.save = async () => assessment
  await reviewSkillAssessment(String(assessment._id), { status: 'rejected', feedback: 'Evidence fails the rubric.', reviewer: 'Reviewer', reviewerId, rubric: rubric(1) })
  assert.equal(student.trustScore, 75)
  assert.equal(student.trustScoreState.events.at(-1).type, 'assessment_below_standard')
})

test('dated penalties recover after 90 days without deleting the audit record', () => {
  const ledger = [{ key: 'skill_verified:react', type: 'skill_verified', points: 60 },
    { key: 'assessment_below_standard:day', type: 'assessment_below_standard', points: -10, occurredAt: new Date(Date.now() - 91 * 86400000).toISOString() }]
  assert.equal(evaluateTrust({}, ledger).trustScore, 60)
  assert.equal(ledger.length, 2)
})
