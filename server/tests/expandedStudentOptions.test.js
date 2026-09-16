const test = require('node:test')
const assert = require('node:assert/strict')
const { CATEGORIES } = require('../utils/skillPolicy')
const { buildStudentSkillHubSkills } = require('../controllers/skillHubController')
const { normalizeTeamPayload } = require('../controllers/networkController')
const TeamPost = require('../models/TeamPost')

test('expanded skill categories survive profile serialization without becoming Other', () => {
  assert.equal(CATEGORIES.length, 20)
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length)
  for (const category of CATEGORIES) {
    const [skill] = buildStudentSkillHubSkills({ skills: [], skillHubSkills: [{ name: 'Test skill', category }] })
    assert.equal(skill.category, category)
    assert.equal(skill.verified, false)
  }
})

test('all team-up types pass creation, editing and storage validation', async () => {
  const types = TeamPost.schema.path('type').enumValues
  assert.equal(types.length, 12)
  for (const type of types) {
    const payload = { owner: '507f1f77bcf86cd799439011', title: 'Collaborative work', description: 'Build a useful collaborative project with peers.', type, requiredSkills: ['React'], slots: 3 }
    assert.equal(normalizeTeamPayload(payload).type, type)
    assert.deepEqual(normalizeTeamPayload({ type }, true), { type })
    await assert.doesNotReject(() => new TeamPost(payload).validate())
  }
  assert.throws(() => normalizeTeamPayload({ type: 'Invalid choice' }, true), /Invalid team-up type/)
})
