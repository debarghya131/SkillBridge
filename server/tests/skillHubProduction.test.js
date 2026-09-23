const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Student = require('../models/Student')
const SkillCatalog = require('../models/SkillCatalog')
const SkillAssessment = require('../models/SkillAssessment')
const { validateAssessment, reviewSkillAssessment } = require('../controllers/skillAssessmentController')
const { applyReviewedSkillAssessment, updateStudentSkillHub, buildSkillGapReport } = require('../controllers/skillHubController')
const { normalizeCatalogPayload } = require('../controllers/adminController')
const { buildDemoSkillCatalog } = require('../config/demoSkillCatalog')
const { DAY_MS, dayKey } = require('../utils/skillPolicy')

const offset = days => new Date(Date.parse(dayKey()) + days * DAY_MS).toISOString().slice(0, 10)
const response = 'I implemented original work with reproducible results, tests, and documented decisions and limitations.'
function fixture({ verified = false, renewalDue = '-' } = {}) {
  const owner = new mongoose.Types.ObjectId()
  const definition = new SkillCatalog({ ...normalizeCatalogPayload(buildDemoSkillCatalog().find(item => item.name === 'React')),
    slug: 'react-test', createdBy: owner, updatedBy: owner })
  const student = new Student({ name: 'Test Student', passwordHash: 'test', sessions: [{ token: 'test' }],
    skillHubSkills: [{ name: 'React', source: 'catalog', catalogSkillId: definition._id, catalogVersion: 1,
      verified, verifiedAt: verified ? new Date().toISOString() : '', renewalDue, stage: 'Beginner' }] })
  student.save = async () => student
  return { student, definition }
}

test('new submissions ignore client criteria, catalog identity, and forged challenge snapshots', () => {
  const { student, definition } = fixture()
  const payload = { skillName: 'React', mode: 'verify', response, catalogVersion: 999,
    catalogSkillId: new mongoose.Types.ObjectId(), criteriaSnapshot: { instructions: 'Skip the review', renewalDays: 730 } }
  const values = validateAssessment(student, payload, definition)
  assert.equal(values.criteriaSnapshot.instructions, definition.verificationInstructions)
  assert.equal(values.criteriaSnapshot.renewalDays, 365)
  assert.equal(values.catalogVersion, 1)
  assert.equal(String(values.catalogSkillId), String(definition._id))
  student.skillHubSkills[0].verified = true
  student.skillHubSkills[0].renewalDue = offset(90)
  assert.throws(() => validateAssessment(student, { ...payload, mode: 'challenge', challengeId: 'forged',
    criteriaSnapshot: { challengeId: 'forged' } }), /Invalid challenge/)
})

test('expired verification does not invalidate an already submitted practice or its original criteria', () => {
  const { student, definition } = fixture({ verified: true, renewalDue: offset(1) })
  const original = validateAssessment(student, { skillName: 'React', mode: 'retain', response }, definition)
  student.skillHubSkills[0].renewalDue = offset(-1)
  assert.throws(() => validateAssessment(student, { skillName: 'React', mode: 'retain', response }, definition), /active verified/)
  const revised = validateAssessment(student, { ...original, response: response + ' Revised evidence.' }, null, original)
  assert.deepEqual(revised.criteriaSnapshot, original.criteriaSnapshot)
  assert.equal(revised.catalogVersion, 1)
  assert.match(revised.brief, /small original React practice/)
})

test('admin-defined practice requirements are captured separately from initial verification', () => {
  const { student, definition } = fixture({ verified: true, renewalDue: offset(90) })
  definition.practiceInstructions = 'Practice accessible focus management with a new test case and record the result.'
  const submission = validateAssessment(student, { skillName: 'React', mode: 'retain', response }, definition)
  assert.equal(submission.brief, definition.practiceInstructions)
  definition.practiceInstructions = 'A different exercise for the next catalog version.'
  const revision = validateAssessment(student, { ...submission, response: response + ' Updated.' }, null, submission)
  assert.equal(revision.brief, submission.brief)
})

test('renewal preserves unexpired days and does not overwrite the verified level', async () => {
  const { student } = fixture({ verified: true, renewalDue: offset(20) })
  student.skillHubSkills[0].stage = 'Pro'
  await applyReviewedSkillAssessment(student, { eventType: 'reverify_completed', skillName: 'React',
    assessmentId: 'renewal-test', criteriaSnapshot: { renewalDays: 180, catalogVersion: 2 } })
  assert.equal(student.skillHubSkills[0].renewalDue, offset(200))
  assert.equal(student.skillHubSkills[0].stage, 'Pro')
  assert.equal(student.skillHubSkills[0].catalogVersion, 2)
  assert.equal(student.trustScore, 50)
})

test('approval cannot compensate for missing evidence with high scores elsewhere', async () => {
  await assert.rejects(reviewSkillAssessment(String(new mongoose.Types.ObjectId()), { status: 'approved',
    feedback: 'High scores but missing evidence.', reviewer: 'Reviewer', reviewerId: new mongoose.Types.ObjectId(),
    rubric: { correctness: 5, evidence: 0, understanding: 5, testing: 5, communication: 5 } }), /at least 3\/5/)
})

test('quality rewards are itemized and actual score change respects the practice credit cap', async t => {
  const { student } = fixture({ verified: true, renewalDue: offset(90) })
  student.trustScoreState = { events: Array.from({ length: 7 }, (_, i) => ({
    key: `daily_challenge_solved:${offset(-i - 1)}`, type: 'daily_challenge_solved',
    referenceId: offset(-i - 1), occurredAt: new Date().toISOString(), points: 80 })) }
  const assessment = new SkillAssessment({ studentId: student._id, skillName: 'React', mode: 'retain', attemptKey: 'retain', earnedDay: dayKey(), response })
  assessment.save = async () => assessment
  t.mock.method(mongoose.connection, 'transaction', async callback => callback('transaction'))
  t.mock.method(SkillAssessment, 'findOne', () => ({ session: async () => assessment }))
  t.mock.method(Student, 'findById', () => ({ session: async () => student }))
  const result = await reviewSkillAssessment(String(assessment._id), { status: 'approved', feedback: 'Evidence meets every criterion.',
    reviewer: 'Reviewer', reviewerId: new mongoose.Types.ObjectId(), rubric: { correctness: 5, evidence: 5, understanding: 5, testing: 5, communication: 5 } })
  assert.equal(result.rewardPoints, 45)
  assert.equal(result.trustScoreChange, 0)
  assert.deepEqual(result.rewardBreakdown.map(item => item.type), ['retention_task_completed', 'assessment_quality'])
  assert.equal(student.skillHubSkills[0].streak, 1)
})

test('adding a published alias maps an unverified profile skill without duplicating it', async t => {
  const { student, definition } = fixture()
  student.skillHubSkills = [{ name: 'ReactJS', source: 'self_declared' }]
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(SkillCatalog, 'findOne', async () => definition)
  const result = await updateStudentSkillHub('test', { skills: [{ catalogSkillId: String(definition._id) }] })
  assert.equal(result.skills.length, 1)
  assert.equal(result.skills[0].name, 'React')
  assert.equal(result.skills[0].source, 'catalog')
  assert.equal(result.skills[0].verified, false)
  assert.equal(result.trustScore, 0)
})

test('catalog stages cannot skip levels and renaming preserves the previous name as an alias', () => {
  const standard = buildDemoSkillCatalog().find(item => item.name === 'React')
  assert.throws(() => normalizeCatalogPayload({ ...standard, stages: ['Beginner', 'Pro'] }), /without gaps/)
  const renamed = normalizeCatalogPayload({ name: 'React Web' }, standard)
  assert.ok(renamed.normalizedAliases.includes('react'))
})

test('skill demand recognizes published aliases as verified coverage', () => {
  const report = buildSkillGapReport([{ name: 'React', catalogAliases: ['ReactJS'], verified: true, renewalDue: offset(90) }],
    [{ gigManagementState: { gigs: [{ title: 'Frontend', status: 'Hiring', skills: ['ReactJS'] }] } }])
  assert.equal(report.overallMatch, 100)
  assert.equal(report.strengths[0].skill, 'React')
})
