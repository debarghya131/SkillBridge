const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const mongoose = require('mongoose')
const { getEnvConfig } = require('../config/env')
const Student = require('../models/Student')
const Company = require('../models/Company')
const Reviewer = require('../models/Reviewer')
const SkillAssessment = require('../models/SkillAssessment')
const SkillCatalog = require('../models/SkillCatalog')
const SkillRequest = require('../models/SkillRequest')
const { createAdminSkill, updateAdminSkill, decideAdminSkillRequest } = require('../controllers/adminController')
const { listPublishedSkillCatalog, requestCatalogSkill } = require('../controllers/skillCatalogController')
const { buildDemoSkillCatalog } = require('../config/demoSkillCatalog')
const { getStudentActivityHeatmap, updateStudentSkillHub, getStudentSkillHub, setStudentSkillArchived } = require('../controllers/skillHubController')
const { submitSkillAssessment, reviewSkillAssessment, listStudentAssessments } = require('../controllers/skillAssessmentController')
const { claimAssessment, decideAssessment, listReviewQueue, signInReviewer } = require('../controllers/reviewerController')
const { getCurrentStudent } = require('../controllers/studentController')
const { recordStudentTrustScoreEvent } = require('../controllers/trustScoreController')
const { hashPassword } = require('../utils/auth')
const { DAY_MS, dayKey } = require('../utils/skillPolicy')

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
    for (const model of [Student, Company, Reviewer, SkillAssessment, SkillCatalog, SkillRequest]) {
      await model.createCollection()
      await model.createIndexes()
    }
    const first = await Student.create({ name: 'Integration Student', passwordHash: 'test-only', sessions: [{ token: 'integration-first' }] })
    await Student.create({ name: 'Other Integration Student', passwordHash: 'test-only', sessions: [{ token: 'integration-other' }] })
    await Reviewer.create({ name: 'First Reviewer', email: 'first-reviewer@example.test', passwordHash: hashPassword('integration-reviewer-password') })
    await Reviewer.create({ name: 'Second Reviewer', email: 'second-reviewer@example.test', passwordHash: hashPassword('integration-reviewer-password') })
    await Reviewer.create({ name: 'Catalog Admin', email: 'catalog-admin@example.test', role: 'admin', passwordHash: hashPassword('integration-reviewer-password') })
    const admin = await signInReviewer({ email: 'catalog-admin@example.test', password: 'integration-reviewer-password' })
    const firstReviewer = await signInReviewer({ email: 'first-reviewer@example.test', password: 'integration-reviewer-password' })
    const secondReviewer = await signInReviewer({ email: 'second-reviewer@example.test', password: 'integration-reviewer-password' })
    const approvedRubric = { correctness: 4, evidence: 4, understanding: 4, testing: 4, communication: 4 }
    const reactDefinition = buildDemoSkillCatalog().find(skill => skill.name === 'React')
    const pythonDefinition = buildDemoSkillCatalog().find(skill => skill.name === 'Python')
    await assert.rejects(createAdminSkill(firstReviewer.token, reactDefinition), error => error.statusCode === 403)
    const react = await createAdminSkill(admin.token, { ...reactDefinition, status: 'draft' })
    assert.equal((await listPublishedSkillCatalog('integration-first')).length, 0)
    await updateAdminSkill(admin.token, react.id, { status: 'published' })
    const python = await createAdminSkill(admin.token, pythonDefinition)
    assert.equal((await listPublishedSkillCatalog('integration-first')).length, 2)
    const initial = await getStudentSkillHub('integration-first')
    // Showcase cards are deliberately read-only previews. A fresh persisted
    // account must still contain no real skills or reputation.
    assert.deepEqual(initial.skills.filter(item => !item.demoData), [])
    assert.deepEqual(initial.skillHubState.skillGapReport.gapData.filter(item => !item.demoData), [])
    await updateStudentSkillHub('integration-first', { skills: [{ catalogSkillId: react.id }, { catalogSkillId: python.id }] })
    const evidence = { skillName: 'React', mode: 'verify', response: 'I implemented original code and reproducible tests, documenting the results, tradeoffs, and limitations.' }
    const submitted = await submitSkillAssessment('integration-first', { ...evidence, criteriaSnapshot: { instructions: 'Forged easy task', renewalDays: 730 }, catalogVersion: 2 })
    assert.equal(submitted.criteriaSnapshot.renewalDays, 365)
    assert.notEqual(submitted.brief, 'Forged easy task')
    await updateAdminSkill(admin.token, react.id, { verificationInstructions: 'Updated platform verification requirements with additional accessible interaction tests.' })
    assert.equal(submitted.catalogVersion, 2)
    await assert.rejects(submitSkillAssessment('integration-first', { ...evidence, catalogVersion: 2 }), /standard changed/)
    await assert.rejects(submitSkillAssessment('integration-first', evidence), error => error.statusCode === 409)
    assert.deepEqual((await listStudentAssessments('integration-other')).filter(item => !item.demoData), [])
    await assert.rejects(recordStudentTrustScoreEvent('integration-first', { eventType: 'skill_verified' }), error => error.statusCode === 403)
    const available = await listReviewQueue(firstReviewer.token, { queue: 'available' })
    const realAvailable = available.assessments.filter(item => !item.demoData)
    assert.equal(realAvailable.length, 1)
    assert.equal(realAvailable[0].id, submitted.id)
    assert.equal(Object.hasOwn(realAvailable[0], 'studentId'), false)
    assert.equal(Object.hasOwn(realAvailable[0], 'studentName'), false)
    await claimAssessment(firstReviewer.token, submitted.id)
    await assert.rejects(claimAssessment(secondReviewer.token, submitted.id), error => error.statusCode === 409)
    await decideAssessment(firstReviewer.token, submitted.id, { status: 'needs_revision', feedback: 'Include boundary tests.',
      rubric: { correctness: 3, evidence: 3, understanding: 3, testing: 2, communication: 3 } })
    await assert.rejects(submitSkillAssessment('integration-first', evidence), error => error.statusCode === 409)
    await assert.rejects(submitSkillAssessment('integration-other', { ...evidence, id: submitted.id }), error => [403, 409].includes(error.statusCode))
    await updateAdminSkill(admin.token, react.id, { status: 'archived' })
    const revised = await submitSkillAssessment('integration-first', { ...evidence, id: submitted.id, criteriaSnapshot: { instructions: 'Another forged task' }, response: evidence.response + ' Boundary case tests are included.' })
    assert.equal(revised.catalogVersion, submitted.catalogVersion)
    assert.equal(revised.brief, submitted.brief)
    await assert.rejects(decideAssessment(firstReviewer.token, submitted.id, { status: 'approved', feedback: 'Evidence checked.',
      rubric: { correctness: 3, evidence: 3, understanding: 3, testing: 3, communication: 3 } }), error => error.statusCode === 409)
    await decideAssessment(firstReviewer.token, submitted.id, { status: 'approved', feedback: 'Evidence checked.',
      rubric: approvedRubric })
    await updateAdminSkill(admin.token, react.id, { status: 'published' })
    let profile = await getCurrentStudent('integration-first')
    assert.equal(profile.trustScore, 60)
    assert.equal(profile.skillHubSkills[0].verified, true)
    assert.equal((await SkillAssessment.findById(submitted.id)).reviewHistory.length, 2)
    await assert.rejects(reviewSkillAssessment(submitted.id, { status: 'approved', feedback: 'Duplicate.', reviewer: 'Integration reviewer' }), error => error.statusCode === 409)
    const upgrade = await submitSkillAssessment('integration-first', { ...evidence, mode: 'upgrade', targetStage: 'Intermediate' })
    await claimAssessment(firstReviewer.token, upgrade.id)
    await decideAssessment(firstReviewer.token, upgrade.id, { status: 'approved', feedback: 'Level evidence checked.', rubric: approvedRubric })
    profile = await getCurrentStudent('integration-first')
    assert.equal(profile.trustScore, 160)
    assert.equal(profile.skillHubSkills[0].stage, 'Intermediate')

    const archivedHub = await setStudentSkillArchived('integration-first', { skillName: 'React', archived: true })
    assert.equal(archivedHub.skills.find(item => !item.demoData && item.name === 'React').archived, true)
    await assert.rejects(submitSkillAssessment('integration-first', { ...evidence, mode: 'retain' }), error => error.statusCode === 409)
    const restoredHub = await setStudentSkillArchived('integration-first', { skillName: 'React', archived: false })
    assert.equal(restoredHub.skills.find(item => !item.demoData && item.name === 'React').archived, false)

    const retention = await submitSkillAssessment('integration-first', { ...evidence, mode: 'retain' })
    await claimAssessment(firstReviewer.token, retention.id)
    await decideAssessment(firstReviewer.token, retention.id, { status: 'approved', feedback: 'Practice evidence checked.', rubric: approvedRubric })
    const challengeId = react.dailyTasks[0].id
    const challenge = await submitSkillAssessment('integration-first', { ...evidence, mode: 'challenge', challengeId })
    await assert.rejects(submitSkillAssessment('integration-first', { ...evidence, mode: 'challenge', challengeId }), error => error.statusCode === 409)
    await claimAssessment(firstReviewer.token, challenge.id)
    await decideAssessment(firstReviewer.token, challenge.id, { status: 'approved', feedback: 'Challenge evidence checked.', rubric: approvedRubric })
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
    assert.deepEqual(dailyHub.skillHubState.daily.completedChallenges, [challengeId])
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

    const expiredDay = new Date(Date.parse(dayKey()) - DAY_MS).toISOString().slice(0, 10)
    await Student.updateOne({ _id: first._id, 'skillHubSkills.name': 'React' }, { $set: { 'skillHubSkills.$.renewalDue': expiredDay } })
    const expiredHub = await getStudentSkillHub('integration-first')
    assert.equal(expiredHub.skills.find(item => !item.demoData && item.name === 'React').renewalStatus, 'expired')
    assert.equal(expiredHub.trustScore, 180)
    const renewal = await submitSkillAssessment('integration-first', { ...evidence, mode: 'reverify' })
    await claimAssessment(firstReviewer.token, renewal.id)
    await decideAssessment(firstReviewer.token, renewal.id, { status: 'approved', feedback: 'Renewal evidence checked.', rubric: approvedRubric })
    profile = await getCurrentStudent('integration-first')
    assert.equal(profile.trustScore, 230)
    assert.equal(profile.skillHubSkills.find(skill => skill.name === 'React').verified, true)
    const renewedStudent = await Student.findById(first._id)
    assert.equal(renewedStudent.trustScoreState.events.filter(event => event.type === 'skill_expired').length, 1)
    assert.equal(renewedStudent.trustScoreState.events.filter(event => event.type === 'skill_reverified').length, 1)
    await updateStudentSkillHub('integration-first', { skills: [{ name: 'Custom Dashboard UI', category: 'Design' }] })
    const request = await requestCatalogSkill('integration-first', { name: 'Custom Dashboard UI', category: 'Design' })
    await decideAdminSkillRequest(admin.token, request.id, { status: 'merged', skillCatalogId: react.id, feedback: 'This evidence belongs to our React standard.' })
    const mapped = await Student.findById(first._id)
    assert.equal(mapped.skillHubSkills.filter(skill => String(skill.catalogSkillId) === react.id).length, 1)
    assert.equal(mapped.skillHubSkills.some(skill => skill.name === 'Custom Dashboard UI'), false)
    await claimAssessment(firstReviewer.token, rollback.id)
    const quality = await decideAssessment(firstReviewer.token, rollback.id, { status: 'approved', feedback: 'Excellent reproducible evidence.', rubric: { correctness: 5, evidence: 5, understanding: 5, testing: 5, communication: 5 } })
    assert.equal(quality.rewardPoints, 85)
    assert.equal(quality.trustScoreChange, 85)
    assert.deepEqual(quality.rewardBreakdown.map(event => event.type), ['skill_verified', 'assessment_quality'])
    console.log('Skill Hub integration passed: admin publishing and permissions, request mapping, immutable criteria, archived-standard revisions, claims, rubric, verification, renewal, upgrades, archive/restore, daily tasks, streak, gap report, credit breakdown and transaction rollback.')
  } finally {
    try {
      if (connected && mongoose.connection.name === database) await mongoose.connection.dropDatabase()
    } finally { await mongoose.disconnect() }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
