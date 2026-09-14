const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildTaskSubmissionQuery,
  normalizeSubmissionLink,
  normalizeTaskIdentity,
} = require('../controllers/taskBridgeController')

test('task identity requires a concrete accepted opportunity id', () => {
  assert.deepEqual(normalizeTaskIdentity({ gigTitle: 'Frontend Internship', opportunityId: '12' }), {
    gigTitle: 'Frontend Internship',
    opportunityId: 12,
  })
  assert.throws(() => normalizeTaskIdentity({ gigTitle: 'Frontend Internship' }), /valid opportunity/)
  assert.throws(() => normalizeTaskIdentity({ gigTitle: 'Frontend Internship', opportunityId: 0 }), /valid opportunity/)
})

test('task submission identity is scoped to the company GIG assignment', () => {
  const query = buildTaskSubmissionQuery('student-1', {
    id: 12,
    title: 'Frontend Internship',
    companyId: 'company-1',
    companyGigId: 4,
  })

  assert.deepEqual(query, {
    studentId: 'student-1',
    opportunityId: 12,
    gigTitle: 'Frontend Internship',
    companyId: 'company-1',
    companyGigId: 4,
  })
})

test('submission links accept only http and https URLs', () => {
  assert.equal(normalizeSubmissionLink(' https://github.com/student/project '), 'https://github.com/student/project')
  assert.throws(() => normalizeSubmissionLink('javascript:alert(1)'), /valid http/)
  assert.throws(() => normalizeSubmissionLink('not-a-url'), /valid http/)
})
