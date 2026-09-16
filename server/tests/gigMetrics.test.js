const test = require('node:test')
const assert = require('node:assert/strict')
const { synchronizeCompanyGigMetrics } = require('../utils/companyGigMetrics')

test('company GIG metrics are derived from applicants and current submission states', () => {
  const state = {
    stats: [
      { label: 'Applications', value: '99' },
      { label: 'Interview Tasks Sent', value: '99' },
      { label: 'Active Hires', value: '99' },
    ],
    pipeline: [
      { label: 'New Applications', value: '99' },
      { label: 'Interview Task Pending', value: '99' },
      { label: 'Task Submitted', value: '99' },
      { label: 'Selected', value: '99' },
    ],
    gigs: [
      { id: 1, publicId: 'gig-1', interviewTasks: 2 },
      { id: 2, publicId: 'gig-2', interviewTasks: 0 },
    ],
    applicantsByGig: {
      1: [{ studentId: 'student-1' }, { studentId: 'student-2' }],
      2: [{ studentId: 'student-3' }],
    },
  }
  const submissions = [
    { companyGigId: 1, companyGigPublicId: 'gig-1', studentId: 'student-1', status: 'completed' },
    { companyGigId: 1, companyGigPublicId: 'gig-1', studentId: 'student-2', status: 'submitted' },
  ]

  synchronizeCompanyGigMetrics(state, submissions)

  assert.equal(state.stats.find(item => item.label === 'Applications').value, '3')
  assert.equal(state.stats.find(item => item.label === 'Interview Tasks Sent').value, '2')
  assert.equal(state.stats.find(item => item.label === 'Active Hires').value, '0')
  assert.equal(state.pipeline.find(item => item.label === 'New Applications').value, '1')
  assert.equal(state.pipeline.find(item => item.label === 'Interview Task Pending').value, '0')
  assert.equal(state.pipeline.find(item => item.label === 'Task Submitted').value, '1')
  assert.equal(state.pipeline.find(item => item.label === 'Selected').value, '1')
})
