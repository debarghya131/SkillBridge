const test = require('node:test')
const assert = require('node:assert/strict')
const { validateAssignment } = require('../utils/taskValidation')
const { sanitizeTaskLibraryState } = require('../controllers/companyController')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')

test('new assignment types retain their details and are accepted by both storage schemas', async () => {
  const { COMPANY_TASK_TYPES, COMPANY_TASK_TYPE_CONFIG } = await import('../../client/src/company/companyTaskDefaults.js')
  const studentTypes = Student.schema.path('gigState').schema.path('opportunities').schema.path('taskType').enumValues
  const submissionTypes = TaskSubmission.schema.path('taskType').enumValues
  for (const type of ['design', 'data_analysis', 'case_study', 'research', 'presentation']) {
    assert.ok(COMPANY_TASK_TYPES.some(item => item.value === type))
    assert.ok(COMPANY_TASK_TYPE_CONFIG[type])
    assert.ok(studentTypes.includes(type))
    assert.ok(submissionTypes.includes(type))
    const task = { id: type, type, title: 'New assignment', instructions: 'Complete the brief.', deadline: '2026-12-01', points: 50, details: { deliverables: 'Public report or prototype', evaluationCriteria: 'Accuracy and completeness' } }
    assert.doesNotThrow(() => validateAssignment(task))
    assert.throws(() => validateAssignment({ ...task, details: {} }), /requires/)
    const saved = sanitizeTaskLibraryState({ tasks: [task] }).tasks[0]
    assert.equal(saved.type, type)
    assert.deepEqual(saved.details, task.details)
  }
})

test('talent filters expand choices without dropping saved options or creating duplicates', async () => {
  const { talentFilterOptions } = await import('../../client/src/company/talentFilterOptions.js')
  const locations = talentFilterOptions('location', ['Kolkata, West Bengal', 'kolkata', '', null])
  assert.equal(locations[0], 'All')
  assert.ok(locations.includes('Kolkata, West Bengal'))
  assert.equal(locations.filter(value => value.toLowerCase() === 'kolkata').length, 1)
  assert.ok(locations.length > 20)
  const skills = talentFilterOptions('skill', ['Custom Skill', 'react'])
  assert.ok(skills.includes('Custom Skill'))
  assert.equal(skills.filter(value => value.toLowerCase() === 'react').length, 1)
  assert.ok(skills.length > 30)
})
