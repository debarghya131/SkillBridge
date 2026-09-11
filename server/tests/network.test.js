const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeTeamPayload, pairKey, profileFor } = require('../controllers/networkController')

test('network pair keys are stable regardless of request direction', () => {
  const first = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const second = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  assert.equal(pairKey(first, second), pairKey(second, first))
})

test('network profiles hide contact details until explicitly allowed', () => {
  const student = {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Student', trustScore: 420, location: 'Kolkata',
    verificationMethod: 'aadhaar', aadhaarNumber: '', skills: ['React'], skillHubSkills: [],
    contactInfo: [{ label: 'Email', value: 'private@example.com', saved: true }],
    githubLink: [], projects: [],
  }
  assert.deepEqual(profileFor(student).contactInfo, [])
  assert.equal(profileFor(student).contactVisible, false)
  assert.equal(profileFor(student, { includeContact: true }).contactInfo[0].value, 'private@example.com')
  assert.equal(profileFor(student).verified, false)
})

test('network profiles retain the public profile snapshot used by View profile', () => {
  const student = {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Profile owner', trustScore: 420, location: 'Kolkata',
    skills: ['React'], skillHubSkills: [], avatar: 'https://example.com/avatar.png',
    githubLink: [{ url: 'https://github.com/profile-owner', saved: true }],
    projects: [{ name: 'Portfolio', desc: 'A published project', link: 'https://example.com/project', saved: true }],
    videoUrl: 'https://example.com/intro.mp4', contactInfo: [],
  }
  const profile = profileFor(student)
  assert.equal(profile.avatar, student.avatar)
  assert.equal(profile.githubLink[0].url, student.githubLink[0].url)
  assert.equal(profile.projects[0].name, student.projects[0].name)
  assert.equal(profile.videoUrl, student.videoUrl)
})

test('team-up payload validation normalizes bounded production input', () => {
  const result = normalizeTeamPayload({
    title: '  Campus   platform  ', description: ' Build and ship a useful campus platform together. ',
    type: 'Project', slots: '3', requiredSkills: ['React', ' React ', 'Node.js'],
  })
  assert.equal(result.title, 'Campus platform')
  assert.deepEqual(result.requiredSkills, ['React', 'Node.js'])
  assert.equal(result.slots, 3)
  assert.throws(() => normalizeTeamPayload({ title: 'Bad', description: 'short', type: 'Other', slots: 0, requiredSkills: [] }), /title/)
})
