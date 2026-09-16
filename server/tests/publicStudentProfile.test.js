const test = require('node:test')
const assert = require('node:assert/strict')
const TeamPost = require('../models/TeamPost')
const gigs = require('../controllers/gigController')

test('public profile follows the selected student, keeps empty fields, and enforces contact privacy', async t => {
  t.mock.method(gigs, 'buildGigState', async student => ({ completedGigs: student._id === 'owner' ? [{ id: 1 }] : [] }))
  t.mock.method(TeamPost, 'countDocuments', async query => {
    assert.equal(query.$or[1].requests.$elemMatch.status, 'accepted')
    assert.equal(query.$or[0].owner, query.$or[1].requests.$elemMatch.student)
    return query.$or[0].owner === 'owner' ? 2 : 0
  })
  const { publicStudentProfile } = require('../utils/publicStudentProfile')
  const student = {
    _id: 'owner', name: 'Latest name', avatar: null, skills: [], skillHubSkills: [],
    about: 'I build accessible products.', collaborationFocus: ['React builds'], workStyle: 'Async written updates.',
    projects: [{ name: 'Published', saved: true }, { name: 'Draft', saved: false }],
    contactInfo: [{ label: 'Email', value: 'public@example.com', saved: true }, { label: 'Phone', value: 'private', saved: false }],
    githubLink: [], aadhaarNumber: 'private-document', passwordHash: 'private-password',
  }
  const peer = await publicStudentProfile(student)
  assert.equal(peer.name, 'Latest name')
  assert.equal(peer.completedGigs, 1)
  assert.equal(peer.teamUps, 2)
  assert.equal(peer.avatar, null)
  assert.deepEqual(peer.skills, [])
  assert.deepEqual(peer.contactInfo, [])
  assert.equal(peer.about, 'I build accessible products.')
  assert.deepEqual(peer.collaborationFocus, ['React builds'])
  assert.equal(peer.workStyle, 'Async written updates.')
  assert.equal(peer.projects.length, 1)
  assert.equal(peer.aadhaarNumber, undefined)
  assert.equal(peer.passwordHash, undefined)
  const company = await publicStudentProfile(student, true)
  assert.deepEqual(company.contactInfo, [{ label: 'Email', value: 'public@example.com' }])
  student.name = 'Updated again'
  student.projects = []
  assert.equal((await publicStudentProfile(student)).name, 'Updated again')
  assert.deepEqual((await publicStudentProfile(student)).projects, [])
  const other = await publicStudentProfile({ _id: 'other', name: 'Other student', skills: [], skillHubSkills: [] })
  assert.equal(other.completedGigs, 0)
  assert.equal(other.teamUps, 0)
})
