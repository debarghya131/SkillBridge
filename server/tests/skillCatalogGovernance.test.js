const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeCatalogPayload } = require('../controllers/adminController')
const { normalizeSkillName, serializeCatalogSkill, skillSlug } = require('../utils/skillCatalog')

test('catalog normalization creates a publishable, reviewer-governed standard', () => {
  const result = normalizeCatalogPayload({
    name: ' React ', aliases: ['ReactJS', ' reactjs ', 'React'], category: 'Frontend', status: 'published',
    renewalDays: 180, stages: ['Beginner', 'Intermediate'],
    verificationInstructions: 'Build an original interface and provide reproducible accessibility and behavior tests.',
    upgradeRequirements: [{ stage: 'Intermediate', instructions: 'Demonstrate component design, state management, and tests.' }],
    dailyTasks: [{ title: 'Accessible form', instructions: 'Build and test an accessible form.', kind: 'code', reviewMode: 'reviewer' }],
  })

  assert.equal(result.name, 'React')
  assert.deepEqual(result.aliases, ['ReactJS'])
  assert.deepEqual(result.normalizedTerms, ['react', 'reactjs'])
  assert.deepEqual(result.stages, ['Beginner', 'Intermediate'])
  assert.equal(result.dailyTasks[0].reviewMode, 'reviewer')
})

test('catalog validation prevents publishing incomplete or unsupported automated standards', () => {
  assert.throws(() => normalizeCatalogPayload({ name: 'React', category: 'Frontend', status: 'published', stages: ['Beginner'], verificationInstructions: 'Too short' }), /at least 20 characters/)
  assert.throws(() => normalizeCatalogPayload({ name: 'React', category: 'Frontend', status: 'published', stages: ['Beginner', 'Intermediate'],
    verificationInstructions: 'This verification requirement is long enough to publish.' }), /upgrade requirements for Intermediate/)
  assert.throws(() => normalizeCatalogPayload({
    name: 'React', category: 'Frontend', status: 'draft',
    dailyTasks: [{ title: 'Quiz', instructions: 'Answer it.', reviewMode: 'automatic' }],
  }), /requires reviewer approval/)
})

test('catalog utilities normalize identity and serialize stable public fields', () => {
  assert.equal(normalizeSkillName('  React   JS  '), 'react js')
  assert.equal(skillSlug('React & TypeScript'), 'react-typescript')
  const skill = serializeCatalogSkill({
    _id: 'skill-1', name: 'React', aliases: [], category: 'Frontend', status: 'published', version: 4,
    renewalDays: 365, stages: ['Beginner'], verificationInstructions: 'Evidence', dailyTasks: [],
  })
  assert.equal(skill.id, 'skill-1')
  assert.equal(skill.version, 4)
  assert.equal(skill.slug, undefined)
})
