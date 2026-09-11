const test = require('node:test')
const assert = require('node:assert/strict')
const Company = require('../models/Company')
const TaskSubmission = require('../models/TaskSubmission')
const { buildWorkspaceState } = require('../utils/companyWorkspace')
const { buildWorkspaceMilestoneState, buildWorkspaceUpdateState, shareCompanyWorkspaceUpdate, setCompanyWorkspaceMilestone } = require('../controllers/companyController')

const initial = () => ({ projects: [{ id: 'p1', title: 'API', milestones: [], updates: [] }] })

test('milestones support completion and reopening without approving delivery', () => {
  let state = buildWorkspaceMilestoneState(initial(), 'p1', { title: 'Release', dueDate: '2026-10-20' })
  const id = state.projects[0].milestones[0].id
  state = buildWorkspaceMilestoneState(state, 'p1', { id, status: 'Completed' })
  assert.equal(state.projects[0].milestones[0].status, 'Completed')
  assert.equal(state.projects[0].status, 'Planning')
  state = buildWorkspaceMilestoneState(state, 'p1', { id, status: 'Open' })
  state = buildWorkspaceMilestoneState(state, 'p1', { title: 'First draft', dueDate: '2026-10-01' })
  assert.equal(state.projects[0].deadline, '2026-10-20')
  assert.equal(state.projects[0].milestones[0].status, 'Open')
  assert.throws(() => buildWorkspaceMilestoneState(state, 'p1', { id, status: 'approved' }), /Invalid/)
  assert.throws(() => buildWorkspaceMilestoneState(state, 'p1', { id: 'missing', status: 'Open' }), /not found/)
  for (const dueDate of ['', '2026-02-30', '2026-13-01', 'tomorrow']) {
    assert.throws(() => buildWorkspaceMilestoneState(state, 'p1', { title: 'Test', dueDate }), /valid milestone date/)
  }
})

test('workspace history is retained beyond twenty updates and IDs are unique', () => {
  let state = initial()
  for (let i = 0; i < 25; i++) state = buildWorkspaceUpdateState(state, 'p1', `Update ${i}`)
  assert.equal(state.projects[0].updates.length, 25)
  assert.equal(new Set(state.projects[0].updates.map(item => item.id)).size, 25)
  assert.throws(() => buildWorkspaceUpdateState(state, 'other-company-project', 'test'), /not found/)
  assert.throws(() => buildWorkspaceUpdateState(state, 'p1', '  '), /required/)
})

test('workspace is projected from work submissions and preserves project-specific milestones', () => {
  const submission = { id: 'one', gigTitle: 'API', studentName: 'Student', status: 'selected' }
  let state = buildWorkspaceState({}, [submission, { ...submission, id: 'two', status: 'submitted' }])
  assert.equal(state.projects.length, 1)
  state = buildWorkspaceMilestoneState(state, 'submission-one', { title: 'Draft', dueDate: '2026-10-01' })
  for (const [status, expected] of [['work_started', 'In Progress'], ['delivered', 'Review'], ['approved', 'Completed'], ['completed', 'Completed']]) {
    state = buildWorkspaceState(state, [{ ...submission, status }])
    assert.equal(state.projects[0].status, expected)
    assert.equal(state.projects[0].milestones.length, 1)
  }
  assert.equal(buildWorkspaceState(state, [{ ...submission, status: 'needs_revision', revisionReturnStatus: 'submitted' }]).projects.length, 0)
  assert.equal(buildWorkspaceState(state, [{ ...submission, status: 'needs_revision', revisionReturnStatus: 'delivered' }]).projects[0].status, 'In Progress')
})

test('workspace uses the current GIG title when an accepted invitation was renamed', () => {
  const state = buildWorkspaceState({}, [{
    id: 'submission-one',
    companyGigId: 4,
    companyGigPublicId: 'gig-4',
    gigTitle: 'FF',
    companyName: 'Debarghya ORG',
    studentName: 'Debarghya',
    status: 'completed',
  }], [{
    id: 4,
    publicId: 'gig-4',
    title: 'Frontend Development Intern',
  }])

  assert.equal(state.projects[0].title, 'Frontend Development Intern')
  assert.equal(state.projects[0].status, 'Completed')
})

test('workspace mutations authenticate, scope projects and reject concurrent changes', async t => {
  const company = new Company({ businessName: 'Company', passwordHash: 'test', sessions: [{ token: 'token', createdAt: new Date() }] })
  t.mock.method(Company, 'findOne', async () => company)
  t.mock.method(TaskSubmission, 'find', filter => {
    assert.equal(String(filter.companyId), String(company._id))
    return { sort: async () => [{ _id: 'one', status: 'selected', gigTitle: 'API', studentName: 'Student' }] }
  })
  let matchedCount = 1
  t.mock.method(Company, 'updateOne', async (filter, update) => {
    assert.equal(String(filter._id), String(company._id))
    assert.ok(Object.hasOwn(filter, 'projectWorkspaceState'))
    assert.equal(update.$set.projectWorkspaceState.projects[0].submissionId, 'one')
    return { matchedCount }
  })
  await assert.rejects(shareCompanyWorkspaceUpdate('', 'submission-one', { message: 'Update' }), error => error.statusCode === 401)
  await assert.rejects(shareCompanyWorkspaceUpdate('token', 'foreign', { message: 'Update' }), error => error.statusCode === 404)
  await shareCompanyWorkspaceUpdate('token', 'submission-one', { message: 'Update' })
  await setCompanyWorkspaceMilestone('token', 'submission-one', { title: 'Draft', dueDate: '2026-10-01' })
  matchedCount = 0
  await assert.rejects(shareCompanyWorkspaceUpdate('token', 'submission-one', { message: 'Conflict' }), error => error.statusCode === 409)
})
