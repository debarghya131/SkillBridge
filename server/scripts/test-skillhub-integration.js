const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const mongoose = require('mongoose')
const { getEnvConfig } = require('../config/env')
const Student = require('../models/Student')
const Company = require('../models/Company')
const Reviewer = require('../models/Reviewer')
const SkillAssessment = require('../models/SkillAssessment')
const { getStudentActivityHeatmap, updateStudentSkillHub, getStudentSkillHub } = require('../controllers/skillHubController')
const { submitSkillAssessment, reviewSkillAssessment, listStudentAssessments } = require('../controllers/skillAssessmentController')
const { claimAssessment, decideAssessment, listReviewQueue, signInReviewer } = require('../controllers/reviewerController')
const { getCurrentStudent } = require('../controllers/studentController')
const { recordStudentTrustScoreEvent } = require('../controllers/trustScoreController')
const { hashPassword } = require('../utils/auth')

async function main() {
  const uri = process.env.SKILLHUB_TEST_MONGO_URL || (process.argv.includes('--use-configured-server') ? getEnvConfig().mongoUrl : '')
  if (!uri) throw new Error('Set SKILLHUB_TEST_MONGO_URL to a replica-set test server, or explicitly pass --use-configured-server.')
  // Never use the URI's application database. All writes and cleanup stay in this new namespace.
  const database = `sbsh_${randomUUID().replaceAll('-', '')}`
  let connected = false
  try {
    await mongoose.connect(uri, { dbName: database, serverSelectionTimeoutMS: 8000, autoCreate: false, autoIndex: false })
    connected = true
    assert.equal(mongoose.connection.name, database)
    const hello = await mongoose.connection.db.admin().command({ hello: 1 })
    if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Assessment approvals require a replica set; this server is standalone.')
    for (const model of [Student, Company, Reviewer, SkillAssessment]) {
      await model.createCollection()
      await model.createIndexes()
    }
    const first = await Student.create({ name: 'Integration Student', passwordHash: 'test-only', sessions: [{ token: 'integration-first' }] })
    await Student.create({ name: 'Other Integration Student', passwordHash: 'test-only', sessions: [{ token: 'integration-other' }] })
    await Reviewer.create({ name: 'First Reviewer', email: 'first-reviewer@example.test', passwordHash: hashPassword('integration-reviewer-password') })
    await Reviewer.create({ name: 'Second Reviewer', email: 'second-reviewer@example.test', passwordHash: hashPassword('integration-reviewer-password') })
    const firstReviewer = await signInReviewer({ email: 'first-reviewer@example.test', password: 'integration-reviewer-password' })
    const secondReviewer = await signInReviewer({ email: 'second-reviewer@example.test', password: 'integration-reviewer-password' })
    const initial = await getStudentSkillHub('integration-first')
    assert.deepEqual(initial.skills, [])
    assert.deepEqual(initial.skillHubState.skillGapReport.gapData, [])
    await updateStudentSkillHub('integration-first', { skills: [{ name: 'React', category: 'Frontend' }, { name: 'Python', category: 'Backend' }] })
    const evidence = { skillName: 'React', mode: 'verify', response: 'I implemented original code and reproducible tests, documenting the results, tradeoffs, and limitations.' }
    const submitted = await submitSkillAssessment('integration-first', evidence)
    await assert.rejects(submitSkillAssessment('integration-first', evidence), error => error.statusCode === 409)
    assert.deepEqual(await listStudentAssessments('integration-other'), [])
    await assert.rejects(recordStudentTrustScoreEvent('integration-first', { eventType: 'skill_verified' }), error => error.statusCode === 403)
    const available = await listReviewQueue(firstReviewer.token, { queue: 'available' })
    assert.equal(available.total, 1)
    assert.equal(available.assessments[0].id, submitted.id)
    assert.equal(Object.hasOwn(available.assessments[0], 'studentId'), false)
    assert.equal(Object.hasOwn(available.assessments[0], 'studentName'), false)
    await claimAssessment(firstReviewer.token, submitted.id)
    await assert.rejects(claimAssessment(secondReviewer.token, submitted.id), error => error.statusCode === 409)
    await decideAssessment(firstReviewer.token, submitted.id, { status: 'needs_revision', feedback: 'Include boundary tests.',
      rubric: { correctness: 3, evidence: 3, understanding: 3, testing: 2, communication: 3 } })
    await assert.rejects(submitSkillAssessment('integration-first', evidence), error => error.statusCode === 409)
    await assert.rejects(submitSkillAssessment('integration-other', { ...evidence, id: submitted.id }), /skill|assessment/i)
    await submitSkillAssessment('integration-first', { ...evidence, id: submitted.id, response: evidence.response + ' Boundary case tests are included.' })
    await assert.rejects(decideAssessment(firstReviewer.token, submitted.id, { status: 'approved', feedback: 'Evidence checked.',
      rubric: { correctness: 3, evidence: 3, understanding: 3, testing: 3, communication: 3 } }), error => error.statusCode === 409)
    await decideAssessment(firstReviewer.token, submitted.id, { status: 'approved', feedback: 'Evidence checked.',
      rubric: { correctness: 4, evidence: 4, understanding: 4, testing: 4, communication: 4 } })
    let profile = await getCurrentStudent('integration-first')
    assert.equal(profile.trustScore, 60)
    assert.equal(profile.skillHubSkills[0].verified, true)
    assert.equal((await SkillAssessment.findById(submitted.id)).reviewHistory.length, 2)
    await assert.rejects(reviewSkillAssessment(submitted.id, { status: 'approved', feedback: 'Duplicate.', reviewer: 'Integration reviewer' }), error => error.statusCode === 409)
    const upgrade = await submitSkillAssessment('integration-first', { ...evidence, mode: 'upgrade', targetStage: 'Intermediate' })
    await reviewSkillAssessment(upgrade.id, { status: 'approved', feedback: 'Level evidence checked.', reviewer: 'Integration reviewer' })
    profile = await getCurrentStudent('integration-first')
    assert.equal(profile.trustScore, 160)
    assert.equal(profile.skillHubSkills[0].stage, 'Intermediate')

    const retention = await submitSkillAssessment('integration-first', { ...evidence, mode: 'retain' })
    await reviewSkillAssessment(retention.id, { status: 'approved', feedback: 'Practice evidence checked.', reviewer: 'Integration reviewer' })
    const challenge = await submitSkillAssessment('integration-first', { ...evidence, mode: 'challenge', challengeId: 2 })
    await reviewSkillAssessment(challenge.id, { status: 'approved', feedback: 'Challenge evidence checked.', reviewer: 'Integration reviewer' })
    await Company.create({
      businessName: 'Integration Company',
      passwordHash: 'test-only',
      gigManagementState: {
        gigs: [{ id: 1, title: 'React and MongoDB role', status: 'Hiring', skills: ['React', 'MongoDB'] }],
        applicantsByGig: { 1: [] },
      },
    })
    const dailyHub = await getStudentSkillHub('integration-first')
    assert.equal(dailyHub.trustScore, 260)
    assert.deepEqual(dailyHub.skillHubState.daily.completedRetention, ['react'])
    assert.deepEqual(dailyHub.skillHubState.daily.completedChallenges, [2])
    assert.equal(dailyHub.skillHubState.daily.points, 100)
    assert.equal(dailyHub.skillHubState.streaks.overallCurrent, 1)
    assert.deepEqual(dailyHub.skillHubState.activityDays, [{ date: dailyHub.skillHubState.daily.date, count: 4 }])
    const heatmap = await getStudentActivityHeatmap('integration-first', { view: 'month', year: dailyHub.skillHubState.daily.date.slice(0, 4), month: Number(dailyHub.skillHubState.daily.date.slice(5, 7)) })
    assert.equal(heatmap.activeDays, 1)
    assert.equal(heatmap.totalActivities, 4)
    assert.deepEqual(heatmap.days, dailyHub.skillHubState.activityDays)
    assert.equal(dailyHub.skillHubState.skillGapReport.activeGigs, 1)
    assert.equal(dailyHub.skillHubState.skillGapReport.overallMatch, 50)
    assert.equal(dailyHub.skillHubState.skillGapReport.strengths[0].skill, 'React')
    assert.equal(dailyHub.skillHubState.skillGapReport.gapData[0].skill, 'mongodb')

    const rollback = await submitSkillAssessment('integration-first', { ...evidence, skillName: 'Python' })
    const save = SkillAssessment.prototype.save
    SkillAssessment.prototype.save = async function (...args) {
      if (String(this._id) === rollback.id) throw new Error('Injected assessment persistence failure')
      return save.apply(this, args)
    }
    try {
      await assert.rejects(reviewSkillAssessment(rollback.id, { status: 'approved', feedback: 'Rollback test.', reviewer: 'Integration reviewer' }), /Injected/)
    } finally { SkillAssessment.prototype.save = save }
    const unchanged = await Student.findById(first._id)
    assert.equal(unchanged.trustScore, 260)
    assert.equal(unchanged.skillHubSkills.find(skill => skill.name === 'Python').verified, false)
    assert.equal((await SkillAssessment.findById(rollback.id)).status, 'pending')
    console.log('Skill Hub integration passed: reviewer auth, blind queue, exclusive claim, rubric, revision, verification, upgrade, daily practice, challenge, streak, gap report, TrustScore and transaction rollback.')
  } finally {
    try {
      if (connected && mongoose.connection.name === database) await mongoose.connection.dropDatabase()
    } finally { await mongoose.disconnect() }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
