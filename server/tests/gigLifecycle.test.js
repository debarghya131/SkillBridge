const test = require('node:test')
const assert = require('node:assert/strict')
const Student = require('../models/Student')
const Company = require('../models/Company')
const TaskSubmission = require('../models/TaskSubmission')
const { getStudentGigState, acceptOpportunity } = require('../controllers/gigController')

test('student tabs follow selection and completion without persisting derived active work', async t => {
  const student = {
    _id: 'student-1', sessions: [{ token: 'student-session', createdAt: new Date() }],
    gigState: { opportunities: [
      { id: 1, companyId: 'company-1', companyGigId: 1, title: 'MERN', status: 'accepted' },
      { id: 2, companyId: 'company-2', companyGigId: 1, title: 'MERN', status: 'accepted' },
    ] },
    save: async () => {},
  }
  const submission = { opportunityId: 1, companyId: 'company-1', companyGigId: 1, gigTitle: 'MERN', status: 'reviewed' }
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'find', () => ({ select: () => ({ lean: async () => [] }) }))
  t.mock.method(TaskSubmission, 'find', () => ({ sort: async () => [submission] }))

  let state = await getStudentGigState('student-session')
  assert.equal(state.activeGigBase.filter(item => !item.demoData).length, 0)
  assert.equal(state.opportunities[1].taskSubmissionStatus, undefined, 'same titles across companies must not share results')
  submission.status = 'selected'
  state = await acceptOpportunity('student-session', 1)
  assert.equal(state.activeGigBase.length, 1)
  assert.equal((student.gigState.activeGigBase || []).length, 0)
  assert.equal(student.gigState.opportunityStatusById[1], 'accepted')

  submission.status = 'needs_revision'
  submission.revisionReturnStatus = 'delivered'
  state = await getStudentGigState('student-session')
  assert.equal(state.activeGigBase.filter(item => !item.demoData).length, 1, 'delivery revision stays in Active GIGs')
  submission.revisionReturnStatus = 'submitted'
  state = await getStudentGigState('student-session')
  assert.equal(state.activeGigBase.filter(item => !item.demoData).length, 0, 'interview revision is not paid project work')

  student.gigState.activeGigBase = state.activeGigBase
  submission.status = 'completed'
  state = await getStudentGigState('student-session')
  assert.equal(state.activeGigBase.filter(item => !item.demoData).length, 0)
  assert.equal(state.completedGigs.filter(item => !item.demoData).length, 1)
  assert.equal(state.opportunities[0].status, 'accepted')
  assert.equal(state.opportunities[0].taskSubmissionStatus, 'completed')
})

test('closing one public listing does not hide its invitation or completed history', async t => {
  const student = { _id: 'student', sessions: [{ token: 's', createdAt: new Date() }], gigState: { opportunities: [
    { id: 10, title: 'Closed GIG', company: 'Company', companyId: 'closed-company', companyGigId: 1, status: 'accepted' },
  ] } }
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'find', () => ({ select: () => ({ lean: async () => [{ _id: 'other-company', businessName: 'Other', gigManagementState: { gigs: [{ id: 2, title: 'Still hiring', status: 'Hiring' }] } }] }) }))
  t.mock.method(TaskSubmission, 'find', () => ({ sort: async () => [{ opportunityId: 10, companyId: 'closed-company', companyGigId: 1, gigTitle: 'Closed GIG', status: 'completed' }] }))
  const state = await getStudentGigState('s')
  assert.equal(state.opportunities.filter(item => !item.demoData).length, 1)
  assert.equal(state.completedGigs.filter(item => !item.demoData).length, 1)
})

test('applied GIG history remains visible after the listing is no longer browseable', async t => {
  const student = {
    _id: 'student-history',
    sessions: [{ token: 'history-session', createdAt: new Date() }],
    gigState: {
      appliedGigIds: [42],
      appliedGigs: [{ id: 42, title: 'Closed listing', company: 'Local business', location: 'Kolkata', tags: ['React'], budget: 'Project based' }],
    },
  }
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'find', () => ({ select: () => ({ lean: async () => [] }) }))
  t.mock.method(TaskSubmission, 'find', () => ({ sort: async () => [] }))

  const state = await getStudentGigState('history-session')

  assert.equal(state.browseGigs.filter(item => !item.demoData).length, 0)
  assert.equal(state.appliedGigs.filter(item => !item.demoData).length, 1)
  assert.equal(state.appliedGigs[0].title, 'Closed listing')
})

test('orphaned applications are hidden when their company was deleted outside the app', async t => {
  const deletedCompanyId = '507f1f77bcf86cd799439011'
  const student = {
    _id: 'student-orphan',
    sessions: [{ token: 'orphan-session', createdAt: new Date() }],
    gigState: {
      appliedGigIds: [99],
      appliedGigs: [{ id: 99, sourceCompanyId: deletedCompanyId, title: 'Orphaned GIG', company: 'Deleted company' }],
    },
  }
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'findById', async () => null)
  t.mock.method(Company, 'find', query => ({
    select: () => ({ lean: async () => query._id ? [] : [] }),
  }))
  t.mock.method(TaskSubmission, 'find', () => ({ sort: async () => [] }))

  const state = await getStudentGigState('orphan-session')

  assert.equal(state.appliedGigs.filter(item => !item.demoData).length, 0)
  assert.equal(state.appliedGigIds.includes(99), false)
})

test('accepting a Mongoose-backed opportunity preserves its real opportunity id', async t => {
  const student = new Student({
    name: 'Test Student',
    passwordHash: 'hash',
    sessions: [{ token: 'student-session', createdAt: new Date() }],
    gigState: {
      opportunities: [{
        id: 73,
        title: 'FF',
        company: 'Debarghya ORG',
        status: 'new',
      }],
    },
  })
  student.save = async () => student

  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'find', () => ({ select: () => ({ lean: async () => [] }) }))
  t.mock.method(TaskSubmission, 'find', () => ({ sort: async () => [] }))

  const state = await acceptOpportunity('student-session', 73)

  assert.equal(state.opportunities.find(item => item.id === 73)?.status, 'accepted')
  assert.equal(student.gigState.opportunityStatusById[73], 'accepted')
  assert.equal(student.gigState.opportunityStatusById.undefined, undefined)
})
