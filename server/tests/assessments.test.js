const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Student = require('../models/Student')
const Company = require('../models/Company')
const SkillAssessment = require('../models/SkillAssessment')
const TaskSubmission = require('../models/TaskSubmission')
const { validateAssignment, isLateSubmission } = require('../utils/taskValidation')
const { submitSkillAssessment, listStudentAssessments, reviewSkillAssessment } = require('../controllers/skillAssessmentController')
const { updateStudentSkillHub, recordStudentSkillHubEvent, buildStudentSkillHubSkills } = require('../controllers/skillHubController')
const { sendCompanyInterviewTask, submitStudentCompanyInterviewTask, getCompanyTaskSubmissions, getStudentCompanyInterviewTask } = require('../controllers/taskBridgeController')
const { acceptOpportunity } = require('../controllers/gigController')

const response = 'I implemented the project, tested the boundary cases, and documented its limitations.'
const details = {
  live_project: { deliverables: 'A working page', acceptanceCriteria: 'Responsive' },
  code: { testCases: 'Input 1 returns 2' },
  mcq: { questions: 'What is 2 + 2?', options: 'A:3 B:4', answerKey: 'B', questionCount: '1' },
  written: { evaluationCriteria: 'Clear argument', wordLimit: '10' },
  mixed: { components: 'Code and explanation', evaluationCriteria: 'Correctness' },
}

test('assignment validation covers all formats, impossible dates, scores and word limits', () => {
  for (const [type, fields] of Object.entries(details)) {
    const assignment = { type, title: 'Assessment', instructions: 'Complete the assignment', deadline: '2030-10-01', points: 50, details: fields }
    assert.doesNotThrow(() => validateAssignment(assignment))
    assert.throws(() => validateAssignment({ ...assignment, details: {} }), /requires/)
    for (const points of [0, 101, 1.5, 'bad']) assert.throws(() => validateAssignment({ ...assignment, points }), /whole number/)
    assert.throws(() => validateAssignment({ ...assignment, deadline: '2030-02-30' }), /deadline/)
  }
  assert.equal(isLateSubmission('2030-10-01', '2030-10-01T18:29:59Z'), false)
  assert.equal(isLateSubmission('2030-10-01', '2030-10-01T18:30:00Z'), true)
})

test('company assignment snapshots hide answer keys and enforce written response limits', async t => {
  const student = new Student({ name: 'Student', passwordHash: 'test', sessions: [{ token: 's', createdAt: new Date() }], gigState: { opportunities: [] } })
  const company = new Company({ businessName: 'Company', passwordHash: 'test', sessions: [{ token: 'c', createdAt: new Date() }],
    gigManagementState: { gigs: [{ id: 1, publicId: 'gig1', title: 'Role', status: 'Hiring' }], applicantsByGig: { 1: [{ studentId: String(student._id), name: 'Student' }] } } })
  student.save = async () => student; company.save = async () => company
  t.mock.method(Student, 'findById', async () => student)
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'findOne', async () => company)
  t.mock.method(Company, 'findById', async () => company)
  let submission = null
  t.mock.method(TaskSubmission, 'findOne', () => ({ sort: async () => submission }))
  t.mock.method(TaskSubmission, 'find', () => ({ sort: async () => submission ? [submission] : [], then(resolve, reject) { return Promise.resolve(submission ? [submission] : []).then(resolve, reject) } }))
  t.mock.method(TaskSubmission, 'findOneAndUpdate', async (query, update) => {
    submission = new TaskSubmission({ ...update.$set, studentId: student._id })
    return submission
  })
  const payload = { studentId: String(student._id), gigTitle: 'Role', companyGigId: 1, taskTitle: 'Arithmetic', taskType: 'mcq',
    taskDetails: details.mcq, taskInstructions: 'Answer the question', taskDeadline: '2030-10-01', taskPoints: 50 }
  const sent = await sendCompanyInterviewTask('c', payload)
  assert.equal(sent.opportunity.taskDetails.answerKey, undefined)
  const key = `${student._id}:${sent.opportunity.id}`
  assert.equal(company.taskReviewGuides[key].answerKey, 'B')
  student.gigState.opportunities[0].status = 'accepted'
  await sendCompanyInterviewTask('c', { ...payload, taskDetails: { ...details.mcq, answerKey: 'A' } })
  assert.equal(company.taskReviewGuides[key].answerKey, 'B', 'Resending must not replace the private snapshot')
  const identity = { opportunityId: sent.opportunity.id, gigTitle: 'Role', companyName: 'Company' }
  await submitStudentCompanyInterviewTask('s', { ...identity, submissionContent: 'B' })
  assert.equal((await getCompanyTaskSubmissions('c'))[0].reviewGuide.answerKey, 'B')
  const visible = await getStudentCompanyInterviewTask('s', identity)
  assert.equal(visible.taskSubmission.reviewGuide, undefined)
  assert.equal(visible.taskSubmission.taskDetails.answerKey, undefined)
  student.gigState.opportunities[0].taskType = 'written'
  student.gigState.opportunities[0].taskDetails = details.written
  await assert.rejects(submitStudentCompanyInterviewTask('s', { ...identity, submissionContent: Array(11).fill('word').join(' ') }), /word limit/)
})

test('direct talent invite appears in Opportunity and opens after student acceptance', async t => {
  const student = new Student({
    name: 'Direct Candidate',
    passwordHash: 'test',
    sessions: [{ token: 'student-direct', createdAt: new Date() }],
    gigState: { opportunities: [] },
  })
  const company = new Company({
    businessName: 'Company',
    passwordHash: 'test',
    sessions: [{ token: 'company-direct', createdAt: new Date() }],
    gigManagementState: {
      gigs: [{ id: 7, publicId: 'gig-7', title: 'Frontend Engineer', status: 'Hiring', skills: ['React'] }],
      applicantsByGig: { 7: [] },
    },
  })
  student.save = async () => student
  company.save = async () => company
  t.mock.method(Student, 'findById', async () => student)
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'findOne', async () => company)
  t.mock.method(Company, 'findById', async () => company)
  t.mock.method(Company, 'find', () => ({ select: () => ({ lean: async () => [] }) }))
  t.mock.method(TaskSubmission, 'find', () => ({ sort: async () => [] }))
  t.mock.method(TaskSubmission, 'findOne', () => ({ sort: async () => null }))

  const payload = {
    studentId: String(student._id),
    companyGigId: 7,
    gigTitle: 'Frontend Engineer',
    taskTitle: 'Build an accessible form',
    taskType: 'code',
    taskDetails: { testCases: 'Validate success and error states' },
    taskInstructions: 'Build and test the requested form.',
    taskDeadline: '2030-10-01',
    taskPoints: 50,
  }

  await assert.rejects(sendCompanyInterviewTask('company-direct', payload), error => error.statusCode === 403)
  const sent = await sendCompanyInterviewTask('company-direct', { ...payload, directInvite: true })

  assert.equal(sent.opportunity.source, 'direct_invite')
  assert.equal(sent.opportunity.companyGigId, 7)
  assert.equal(sent.opportunity.taskTitle, 'Build an accessible form')
  assert.equal(student.gigState.opportunities.length, 1)
  assert.deepEqual(company.gigManagementState.applicantsByGig[7], [])

  const acceptedState = await acceptOpportunity('student-direct', sent.opportunity.id)
  const accepted = acceptedState.opportunities.find(item => item.id === sent.opportunity.id)
  assert.equal(accepted.status, 'accepted')
  assert.equal(accepted.source, 'direct_invite')

  const task = await getStudentCompanyInterviewTask('student-direct', {
    opportunityId: sent.opportunity.id,
    gigTitle: sent.opportunity.title,
    companyName: sent.opportunity.company,
  })
  assert.equal(task.taskAssignment.taskTitle, 'Build an accessible form')
  assert.equal(task.taskAssignment.source, 'direct_invite')

  const duplicate = await sendCompanyInterviewTask('company-direct', { ...payload, directInvite: true })
  assert.equal(duplicate.opportunity.id, sent.opportunity.id)
  assert.equal(duplicate.alreadyExists, true)
  assert.equal(student.gigState.opportunities.length, 1)
})

test('students cannot self-award verification through events or skill profile edits', async t => {
  const student = new Student({ name: 'Student', passwordHash: 'test', sessions: [{ token: 's', createdAt: new Date() }],
    skillHubSkills: [{ name: 'Python', source: 'catalog', verified: false, stage: 'Beginner', level: 0 }] })
  student.save = async () => student
  t.mock.method(Student, 'findOne', async () => student)
  await assert.rejects(recordStudentSkillHubEvent('s', { eventType: 'verify_completed', skillName: 'Python' }), error => error.statusCode === 403)
  await updateStudentSkillHub('s', { skills: [{ name: 'Python', verified: true, stage: 'Pro', level: 100 }], skillHubState: { daily: { completedChallenges: [1] } } })
  assert.equal(student.skillHubSkills[0].verified, false)
  assert.equal(student.skillHubSkills[0].stage, 'Beginner')
  assert.deepEqual(buildStudentSkillHubSkills({}), [])
})

test('Skill Hub submission, revision and operator approval require ownership and a pending assessment', async t => {
  const student = new Student({ name: 'Student', passwordHash: 'test', sessions: [{ token: 's', createdAt: new Date() }],
    skillHubSkills: [{ name: 'Python', source: 'catalog', verified: false, stage: 'Beginner', level: 0 }] })
  student.save = async options => { assert.equal(options.session, 'transaction') }
  t.mock.method(Student, 'findOne', async () => student)
  let record
  t.mock.method(SkillAssessment, 'create', async values => {
    if (record?.status === 'pending') throw Object.assign(new Error('duplicate'), { code: 11000 })
    record = new SkillAssessment(values); record.save = async () => record; return record
  })
  t.mock.method(SkillAssessment, 'exists', async filter => (
    record
    && filter.status.$in.includes(record.status)
    && record.attemptKey === filter.attemptKey
      ? { _id: record._id }
      : null
  ))
  t.mock.method(SkillAssessment, 'find', filter => {
    assert.equal(String(filter.studentId), String(student._id))
    return { sort() { return this }, limit: async () => record ? [record] : [] }
  })
  await assert.rejects(submitSkillAssessment('', {}), error => error.statusCode === 401)
  await assert.rejects(submitSkillAssessment('s', { skillName: 'Python', mode: 'verify', response: 'short' }), /50 to 10000/)
  const payload = { skillName: 'Python', mode: 'verify', response, evidenceLink: 'https://example.com/work' }
  const created = await submitSkillAssessment('s', payload)
  assert.equal(created.status, 'pending')
  assert.equal(student.skillHubSkills[0].verified, false)
  await assert.rejects(submitSkillAssessment('s', payload), error => error.statusCode === 409)
  assert.equal((await listStudentAssessments('s')).filter(item => !item.demoData).length, 1)
  t.mock.method(mongoose.connection, 'transaction', async callback => callback('transaction'))
  t.mock.method(SkillAssessment, 'findOne', filter => {
    const result = String(record._id) === String(filter._id) && record.status === filter.status ? record : null
    return { session: async () => result, then: resolve => Promise.resolve(result).then(resolve) }
  })
  t.mock.method(Student, 'findById', () => ({ session: async () => student }))
  await reviewSkillAssessment(created.id, { status: 'needs_revision', feedback: 'Add test evidence', reviewer: 'Operator' })
  assert.equal(student.skillHubSkills[0].verified, false)
  assert.equal(record.open, true)
  await assert.rejects(submitSkillAssessment('s', payload), /already open/)
  t.mock.method(SkillAssessment, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(String(filter.studentId), String(student._id))
    if (String(filter._id) !== String(record._id) || record.status !== filter.status) return null
    record.set(update.$set); return record
  })
  await assert.rejects(submitSkillAssessment('s', { ...payload, id: String(new mongoose.Types.ObjectId()) }), error => error.statusCode === 409)
  await submitSkillAssessment('s', { ...payload, id: created.id })
  await reviewSkillAssessment(created.id, { status: 'approved', feedback: 'Evidence verified', reviewer: 'Operator' })
  assert.equal(student.skillHubSkills[0].verified, true)
  assert.equal(record.status, 'approved')
  assert.equal(record.open, false)
  await assert.rejects(reviewSkillAssessment(created.id, { status: 'approved', feedback: 'Again', reviewer: 'Operator' }), error => error.statusCode === 409)
})
