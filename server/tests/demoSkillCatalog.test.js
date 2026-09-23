const test = require('node:test')
const assert = require('node:assert/strict')
const { buildDemoSkillCatalog } = require('../config/demoSkillCatalog')
const { normalizeCatalogPayload } = require('../controllers/adminController')

test('demo catalog contains unique publishable platform standards', () => {
  const catalog = buildDemoSkillCatalog()
  const terms = new Set()

  assert.equal(catalog.length, 24)
  for (const definition of catalog) {
    const skill = normalizeCatalogPayload(definition)
    assert.equal(skill.status, 'published')
    assert.deepEqual(skill.stages, ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'])
    assert.equal(skill.upgradeRequirements.length, 3)
    assert.equal(skill.dailyTasks.length, 1)
    assert.equal(skill.dailyTasks[0].reviewMode, 'reviewer')
    for (const term of skill.normalizedTerms) {
      assert.equal(terms.has(term), false, `duplicate catalog term: ${term}`)
      terms.add(term)
    }
  }
})
