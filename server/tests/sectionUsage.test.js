const test = require('node:test')
const assert = require('node:assert/strict')
const { buildUtcDayKey, consumeSectionOperation } = require('../utils/sectionUsage')

test('buildUtcDayKey uses UTC date formatting', () => {
  const date = new Date('2026-05-23T18:45:00.000Z')
  assert.equal(buildUtcDayKey(date), '2026-05-23')
})

test('consumeSectionOperation records repeated operations without enforcing a daily limit', () => {
  const entity = {}
  const first = consumeSectionOperation(entity, 'gig-center', 'GIG Center', 2, new Date('2026-05-23T10:00:00.000Z'))
  const second = consumeSectionOperation(entity, 'gig-center', 'GIG Center', 2, new Date('2026-05-23T16:00:00.000Z'))

  assert.equal(first.used, 1)
  assert.equal(first.remaining, null)
  assert.equal(second.used, 2)
  assert.equal(second.remaining, null)

  const third = consumeSectionOperation(entity, 'gig-center', 'GIG Center', 2, new Date('2026-05-23T20:00:00.000Z'))
  assert.equal(third.used, 3)
})

test('consumeSectionOperation tracks sections independently', () => {
  const entity = {}

  consumeSectionOperation(entity, 'gig-center', 'GIG Center', 2, new Date('2026-05-23T10:00:00.000Z'))
  const networkResult = consumeSectionOperation(entity, 'network', 'Network', 2, new Date('2026-05-23T11:00:00.000Z'))

  assert.equal(networkResult.used, 1)
  assert.equal(entity.dailySectionUsage['gig-center']['2026-05-23'], 1)
  assert.equal(entity.dailySectionUsage.network['2026-05-23'], 1)
})
