const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildTaskSubmissionQuery,
  findAcceptedOpportunity,
  normalizeSubmissionLink,
  normalizeTaskIdentity,
  nextStudentSubmissionStatus,
  refreshTaskAssignmentMetadata,
  sanitizeTaskDetailsForStudent,
} = require('../controllers/taskBridgeController')

test('student submissions preserve interview and work stages', () => {
  assert.equal(nextStudentSubmissionStatus(null), 'submitted')
  assert.equal(nextStudentSubmissionStatus({ status: 'submitted' }), 'submitted')
  assert.equal(nextStudentSubmissionStatus({ status: 'work_started' }), 'delivered')
  assert.equal(nextStudentSubmissionStatus({ status: 'needs_revision' }), 'submitted')
  assert.equal(nextStudentSubmissionStatus({ status: 'needs_revision', revisionReturnStatus: 'delivered' }), 'delivered')
  for (const status of ['reviewed', 'selected', 'delivered', 'approved', 'completed']) {
    assert.throws(() => nextStudentSubmissionStatus({ status }), error => error.statusCode === 409)
  }
})

test('task identity requires a concrete accepted opportunity id', () => {
  assert.deepEqual(normalizeTaskIdentity({ gigTitle: 'Frontend Internship', opportunityId: '12' }), {
    gigTitle: 'Frontend Internship',
    opportunityId: 12,
  })
  assert.throws(() => normalizeTaskIdentity({ gigTitle: 'Frontend Internship' }), /valid opportunity/)
  assert.throws(() => normalizeTaskIdentity({ gigTitle: 'Frontend Internship', opportunityId: 0 }), /valid opportunity/)
  assert.deepEqual(normalizeTaskIdentity({ opportunityId: 'role-public-id' }), {
    gigTitle: '',
    opportunityId: 'role-public-id',
  })
})

test('task loading respects the persisted opportunity acceptance override', () => {
  const opportunity = findAcceptedOpportunity({
    gigState: {
      opportunities: [{
        id: 41,
        title: 'FF',
        company: 'Debarghya ORG',
        status: 'sent',
      }],
      opportunityStatusById: { 41: 'accepted' },
    },
  }, 41, 'FF', 'Debarghya ORG')

  assert.equal(opportunity.status, 'accepted')
})

test('stable opportunity ids keep accepted tasks valid after a GIG title changes', () => {
  const opportunity = findAcceptedOpportunity({
    gigState: {
      opportunities: [{
        id: 41,
        title: 'Original Full Stack Role',
        company: 'Debarghya ORG',
        status: 'accepted',
      }],
    },
  }, 41, 'Full Stack Engineer', 'Debarghya ORG')

  assert.equal(opportunity.id, 41)
  assert.equal(opportunity.title, 'Original Full Stack Role')
})

test('task loading refreshes public GIG metadata without changing the accepted assignment brief', () => {
  const refreshed = refreshTaskAssignmentMetadata({
    id: 41,
    companyId: 'company-1',
    companyGigId: 4,
    companyGigPublicId: 'gig-public-4',
    title: 'FF',
    company: 'Old Company Name',
    location: 'nm',
    stipend: '₹600 / month',
    matchedSkills: ['jhj'],
    taskTitle: 'Implement a REST API Feature',
    taskInstructions: 'Keep the accepted brief unchanged.',
    taskDeadline: '2026-09-18',
  }, {
    businessName: 'Debarghya ORG',
    location: 'Kolkata, West Bengal',
    businessProfile: { logo: 'https://example.test/logo.png', location: 'Kolkata, West Bengal' },
    gigManagementState: {
      gigs: [{
        id: 4,
        publicId: 'gig-public-4',
        title: 'Frontend Development Intern',
        location: 'Kolkata, West Bengal',
        budget: '₹12,000 / month',
        type: 'Internship',
        skills: ['React', 'JavaScript', 'CSS'],
      }],
    },
  })

  assert.equal(refreshed.title, 'Frontend Development Intern')
  assert.equal(refreshed.company, 'Debarghya ORG')
  assert.equal(refreshed.location, 'Kolkata, West Bengal')
  assert.equal(refreshed.stipend, '₹12,000 / month')
  assert.equal(refreshed.companyLogo, 'https://example.test/logo.png')
  assert.deepEqual(refreshed.matchedSkills, ['React', 'JavaScript', 'CSS'])
  assert.equal(refreshed.taskTitle, 'Implement a REST API Feature')
  assert.equal(refreshed.taskInstructions, 'Keep the accepted brief unchanged.')
  assert.equal(refreshed.taskDeadline, '2026-09-18')
})

test('task submission identity is scoped to stable company GIG identifiers', () => {
  const query = buildTaskSubmissionQuery('student-1', {
    id: 12,
    title: 'Frontend Internship',
    companyId: 'company-1',
    companyGigId: 4,
  })

  assert.deepEqual(query, {
    studentId: 'student-1',
    opportunityId: 12,
    companyId: 'company-1',
    companyGigId: 4,
  })
})

test('submission links accept only http and https URLs', () => {
  assert.equal(normalizeSubmissionLink(' https://github.com/student/project '), 'https://github.com/student/project')
  assert.throws(() => normalizeSubmissionLink('javascript:alert(1)'), /valid http/)
  assert.throws(() => normalizeSubmissionLink('not-a-url'), /valid http/)
})

test('student task details never expose the MCQ answer key', () => {
  assert.deepEqual(sanitizeTaskDetailsForStudent({
    questions: 'What is 2 + 2?',
    options: 'A) 3 B) 4',
    answerKey: 'B',
  }), {
    questions: 'What is 2 + 2?',
    options: 'A) 3 B) 4',
  })

  assert.deepEqual(sanitizeTaskDetailsForStudent({
    optionsAndAnswers: 'A) 3\nB) 4\nAnswer key: B',
  }), {})
})
