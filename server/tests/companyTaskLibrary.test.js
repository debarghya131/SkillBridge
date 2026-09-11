const test = require('node:test')
const assert = require('node:assert/strict')
const { sanitizeTaskLibraryState } = require('../controllers/companyController')

test('task library keeps valid saved assignments and removes incomplete entries', () => {
  const state = sanitizeTaskLibraryState({
    tasks: [
      {
        id: 'frontend-task',
        title: 'Build a landing page',
        instructions: 'Create and submit a responsive page with a public project link.',
        deadline: '2026-10-01',
        points: 80,
        skills: ['React', 'UI/UX Design'],
      },
      { title: 'Missing instructions' },
    ],
  })

  assert.equal(state.tasks.length, 1)
  assert.equal(state.tasks[0].id, 'frontend-task')
  assert.equal(state.tasks[0].points, 80)
  assert.deepEqual(state.tasks[0].skills, ['React', 'UI/UX Design'])
})

test('task library clamps invalid points and rejects invalid deadlines', () => {
  const state = sanitizeTaskLibraryState({
    tasks: [{
      title: 'Valid task',
      instructions: 'Complete the requested assignment.',
      deadline: 'tomorrow',
      points: 500,
    }],
  })

  assert.equal(state.tasks[0].points, 100)
  assert.equal(state.tasks[0].deadline, '')
})
