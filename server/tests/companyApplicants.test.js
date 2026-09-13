const test = require('node:test')
const assert = require('node:assert/strict')
const Company = require('../models/Company')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const { getCompanyGigApplicants } = require('../controllers/companyController')

test('GIG applicants load current profiles by ID without talent search or snapshot fields', async t => {
  const studentId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const submittedStudentId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const companyId = 'cccccccccccccccccccccccc'
  const current = {
    _id: studentId, name: 'Current Name', avatar: 'https://example.com/photo.jpg',
    skills: ['React', 'SQL'], skillHubSkills: [{ name: 'React', stage: 'Pro', verified: true, renewalDue: '2099-01-01', streak: 9, lastRetentionDate: '2020-01-01' }, { name: 'SQL', stage: 'Beginner' }],
    trustScore: 785, githubLink: [{ url: 'https://github.com/current' }],
    contactInfo: [{ label: 'Email', value: 'current@example.com' }],
    projects: [{ name: 'Current project', desc: 'Saved work' }], videoUrl: 'https://example.com/intro.mp4',
  }
  t.mock.method(Company, 'findOne', async () => ({
    _id: companyId, sessions: [{ token: 'company-session', createdAt: new Date() }],
    gigManagementState: { gigs: [{ id: 1, title: 'MERN' }], applicantsByGig: {
      1: [{ id: studentId, name: 'Old Name', skills: ['Stale Skill'] }],
    } },
  }))
  t.mock.method(TaskSubmission, 'find', query => {
    assert.deepEqual(query, { companyId, companyGigId: 1 })
    return { select: () => ({ lean: async () => [{ studentId: submittedStudentId }] }) }
  })
  t.mock.method(Student, 'find', query => {
    assert.deepEqual(query, { $or: [
      { _id: { $in: [studentId, submittedStudentId] } },
      { 'gigState.opportunities': { $elemMatch: { companyId, companyGigId: 1 } } },
    ] })
    return { select: () => ({ lean: async () => [current, { _id: submittedStudentId, name: 'Current Name' }] }) }
  })

  const profiles = await getCompanyGigApplicants('company-session', '1')
  assert.equal(profiles.length, 2)
  assert.equal(profiles[0].avatar, current.avatar)
  assert.deepEqual(profiles[0].skills, ['React', 'SQL'])
  assert.deepEqual(profiles[0].profileSkillsByLevel, { Beginner: ['SQL'], Intermediate: [], Pro: ['React'], 'Pro Mastery': [] })
  assert.equal(profiles[0].streak, 0)
  assert.equal(profiles[0].github, current.githubLink[0].url)
  assert.deepEqual(profiles[0].contactInfo, current.contactInfo)
  assert.equal(profiles[0].savedProjects[0].name, 'Current project')
  assert.equal(profiles[0].videoUrl, current.videoUrl)
  assert.notEqual(profiles[0].studentId, profiles[1].studentId)

  current.avatar = null
  current.skills = []
  current.skillHubSkills = []
  current.githubLink = []
  current.contactInfo = []
  current.projects = []
  current.videoUrl = null
  const [cleared] = await getCompanyGigApplicants('company-session', '1')
  assert.equal(cleared.avatar, null)
  assert.deepEqual(cleared.skills, [])
  assert.equal(cleared.github, '')
  assert.deepEqual(cleared.contactInfo, [])
  assert.deepEqual(cleared.savedProjects, [])
  assert.equal(cleared.videoUrl, null)

  await assert.rejects(getCompanyGigApplicants('company-session', '2'), error => error.statusCode === 404)
  await assert.rejects(getCompanyGigApplicants('', '1'), error => error.statusCode === 401)
})
