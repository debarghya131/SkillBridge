const test = require('node:test')
const assert = require('node:assert/strict')
const Student = require('../models/Student')
const Company = require('../models/Company')
const TaskSubmission = require('../models/TaskSubmission')
const { getStudentEarningState, requestStudentWithdrawal, updateStudentEarningState, buildExternalEarningState } = require('../controllers/earningController')
const { recordExternalPayment, validateExternalPayment } = require('../controllers/companyPaymentController')
const { reviewCompanyTaskSubmission, submitStudentCompanyInterviewTask, getStudentCompanyInterviewTask } = require('../controllers/taskBridgeController')
const { getStudentGigState } = require('../controllers/gigController')

function query(rows) {
  return { sort() { return this }, lean: async () => rows, then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject) } }
}

test('review -> selection -> start -> delivery -> revision -> approval -> payment is shared by both accounts', async t => {
  const company = new Company({ businessName: 'Test Company', passwordHash: 'test',
    sessions: [{ token: 'company-session', createdAt: new Date() }],
    gigManagementState: { gigs: [{ id: 1, publicId: 'gig-one', title: 'API project', status: 'Reviewing' }] } })
  const student = new Student({ name: 'Test Student', passwordHash: 'test',
    sessions: [{ token: 'student-session', createdAt: new Date() }],
    gigState: { opportunities: [{ id: 9, title: 'API project', company: company.businessName,
      companyId: String(company._id), companyGigId: 1, companyGigPublicId: 'gig-one', status: 'accepted',
      taskType: 'mcq', taskTitle: 'API assessment', taskInstructions: 'Answer the questions', taskPoints: 50 }] } })
  let submission = new TaskSubmission({ studentId: student._id, companyId: company._id, studentName: student.name,
    companyName: company.businessName, companyGigId: 1, companyGigPublicId: 'gig-one', opportunityId: 9,
    gigTitle: 'API project', taskType: 'mcq', taskPoints: 50, submissionContent: '1. A', status: 'submitted' })
  const id = String(submission._id)
  let writeCount = 0
  company.save = async () => company
  student.save = async () => student
  submission.save = async () => submission
  t.mock.method(Company, 'findOne', async () => company)
  t.mock.method(Company, 'findById', async () => company)
  t.mock.method(Company, 'find', () => ({ select: () => ({ lean: async () => [] }) }))
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Student, 'findById', async () => student)
  t.mock.method(TaskSubmission, 'findById', async () => submission)
  t.mock.method(TaskSubmission, 'findOne', filter => {
    if (filter._id) return Promise.resolve(String(filter.companyId) === String(company._id) ? submission : null)
    return { sort: async () => submission }
  })
  t.mock.method(TaskSubmission, 'find', filter => {
    if (filter.studentId) assert.equal(String(filter.studentId), String(student._id))
    if (filter.companyId) assert.equal(String(filter.companyId), String(company._id))
    return query(!filter.status || filter.status.$in.includes(submission.status) ? [submission] : [])
  })
  t.mock.method(TaskSubmission, 'findOneAndUpdate', async (filter, update) => {
    if (filter.status && filter.status !== submission.status) return null
    if (filter.externalPayment === null && submission.externalPayment) return null
    writeCount += 1
    submission.set(update.$set)
    return submission
  })

  await assert.rejects(reviewCompanyTaskSubmission('company-session', id, { status: 'selected' }), /Cannot move/)
  await reviewCompanyTaskSubmission('company-session', id, { status: 'reviewed', score: 42, feedback: 'Good reasoning' })
  await reviewCompanyTaskSubmission('company-session', id, { status: 'selected' })
  assert.equal(submission.score, 42)
  assert.equal(submission.feedback, 'Good reasoning')
  await assert.rejects(reviewCompanyTaskSubmission('company-session', id, { status: 'work_started' }), /work brief/)
  await reviewCompanyTaskSubmission('company-session', id, { status: 'work_started', workBrief: 'Deliver the API and integration tests.' })
  assert.equal(submission.workBrief, 'Deliver the API and integration tests.')
  assert.equal(submission.interviewSubmission.submissionContent, '1. A')
  assert.equal(submission.interviewSubmission.score, 42)
  assert.equal(submission.submissionContent, '')
  assert.equal(submission.score, null)
  const identity = { gigTitle: 'API project', companyName: company.businessName, opportunityId: 9 }
  assert.equal((await getStudentCompanyInterviewTask('student-session', identity)).taskSubmission.workBrief, submission.workBrief)
  company.projectWorkspaceState.projects[0].updates = [{ id: 'own', message: 'Own project update', sharedAt: new Date().toISOString() }]
  company.projectWorkspaceState.projects.push({ id: 'other', submissionId: 'other', title: 'API project', updates: [{ id: 'private', message: 'Other student update' }] })
  const visibleWorkspace = (await getStudentCompanyInterviewTask('student-session', identity)).taskSubmission.workspace
  assert.deepEqual(visibleWorkspace.updates.map(item => item.message), ['Own project update'])
  await submitStudentCompanyInterviewTask('student-session', { ...identity, submissionLink: 'https://example.com/project' })
  assert.equal(submission.status, 'delivered', 'MCQ assessment must not require MCQ answers for the real project delivery')
  await reviewCompanyTaskSubmission('company-session', id, { status: 'needs_revision', feedback: 'Add tests' })
  assert.equal(submission.revisionReturnStatus, 'delivered')
  assert.equal((await getStudentCompanyInterviewTask('student-session', identity)).taskSubmission.revisionReturnStatus, 'delivered')
  assert.equal((await getStudentGigState('student-session')).activeGigBase.length, 1)
  await submitStudentCompanyInterviewTask('student-session', { ...identity, submissionLink: 'https://example.com/project-v2' })
  await reviewCompanyTaskSubmission('company-session', id, { status: 'approved', feedback: 'Accepted' })
  await assert.rejects(reviewCompanyTaskSubmission('company-session', id, { status: 'completed' }), /payment completion/)
  let earnings = await getStudentEarningState('student-session')
  assert.equal(earnings.pending.length, 1)
  assert.equal(earnings.totalRecorded, 0)
  const payment = { amount: 1000.25, reference: 'TEST-TRANSFER-1', method: 'upi', paidOn: '2026-01-01', confirmed: true }
  const ledger = await recordExternalPayment('company-session', id, payment)
  assert.equal(submission.status, 'completed')
  assert.equal(student.trustScore, 150)
  assert.equal(student.trustScoreState.events.filter(event => event.type === 'gig_completed').length, 1)
  earnings = await getStudentEarningState('student-session')
  assert.equal(ledger.transactions[0].reference, earnings.transactions[0].reference)
  assert.equal(earnings.totalRecorded, 1000.25)
  assert.equal(earnings.pending.length, 0)
  const before = writeCount
  await recordExternalPayment('company-session', id, payment)
  assert.equal(writeCount, before, 'identical retry must not record payment twice')
  assert.equal(student.trustScoreState.events.filter(event => event.type === 'gig_completed').length, 1)
  await assert.rejects(recordExternalPayment('company-session', id, { ...payment, amount: 999 }), /already recorded/)
  const state = await getStudentGigState('student-session')
  assert.equal(state.activeGigBase.length, 0)
  assert.equal(state.completedGigs.length, 1)
})

test('legacy wallet balances cannot be withdrawn or edited', async t => {
  const student = { _id: 's1', earningState: { availableNow: 'Rs 12,480' }, sessions: [{ token: 's', createdAt: new Date() }] }
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(TaskSubmission, 'find', filter => {
    assert.equal(filter.studentId, 's1')
    return query([])
  })
  assert.deepEqual(await getStudentEarningState('s'), { mode: 'external', pending: [], transactions: [], totalRecorded: 0 })
  await assert.rejects(requestStudentWithdrawal('s', { amount: 100 }), error => error.statusCode === 410)
  await assert.rejects(updateStudentEarningState('s', { earningState: { availableNow: 'Rs 99999' } }), error => error.statusCode === 410)
  assert.equal(student.earningState.availableNow, 'Rs 12,480')
})

test('payment validation rejects impossible dates, fractions of a paisa, and future dates', () => {
  const base = { amount: 1, reference: 'REF1', method: 'bank_transfer', paidOn: '2026-01-01' }
  const now = new Date('2026-09-10T12:00:00Z')
  for (const change of [{ paidOn: '2026-02-30' }, { paidOn: '2027-01-01' }, { amount: 1.001 }, { amount: -1 }, { amount: true }, { amount: [100] }, { reference: '' }]) {
    assert.throws(() => validateExternalPayment({ ...base, ...change }, now))
  }
  assert.equal(buildExternalEarningState([{ _id: '1', externalPayment: { amount: .1 } }, { _id: '2', externalPayment: { amount: .2 } }]).totalRecorded, .3)
})

test('recording payment enforces ownership, approval, and duplicate references', async t => {
  const company = { _id: 'owner', sessions: [{ token: 'c', createdAt: new Date() }] }
  const payment = { amount: 10, reference: 'REF1', method: 'upi', paidOn: '2026-01-01', confirmed: true }
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  let status = 'delivered'
  let foreign = true
  t.mock.method(Company, 'findOne', async () => company)
  t.mock.method(TaskSubmission, 'findOne', async filter => {
    assert.equal(filter.companyId, 'owner')
    return foreign ? null : { status }
  })
  await assert.rejects(recordExternalPayment('c', id, payment), error => error.statusCode === 404)
  foreign = false
  await assert.rejects(recordExternalPayment('c', id, payment), error => error.statusCode === 409)
  status = 'approved'
  t.mock.method(TaskSubmission, 'findOneAndUpdate', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }) })
  await assert.rejects(recordExternalPayment('c', id, payment), /reference has already been recorded/)
})

test('concurrent task review fails as a conflict rather than overwriting newer work', async t => {
  const company = { _id: 'owner', sessions: [{ token: 'c', createdAt: new Date() }], gigManagementState: { gigs: [{ id: 1 }] } }
  t.mock.method(Company, 'findOne', async () => company)
  t.mock.method(TaskSubmission, 'findById', async () => ({
    companyId: 'owner', companyGigId: 1, status: 'submitted', taskPoints: 50,
    save: async () => { throw Object.assign(new Error('stale'), { name: 'VersionError' }) },
  }))
  await assert.rejects(reviewCompanyTaskSubmission('c', 'aaaaaaaaaaaaaaaaaaaaaaaa', { status: 'reviewed' }), error => error.statusCode === 409)
})
