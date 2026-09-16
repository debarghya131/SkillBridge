const test = require('node:test')
const assert = require('node:assert/strict')
const { getSiteViewCount, incrementSiteViewCount } = require('../controllers/siteMetricController')

test('getSiteViewCount returns zero before the counter exists', async () => {
  const metricModel = {
    findOne() {
      return {
        select() {
          return {
            lean: async () => null,
          }
        },
      }
    },
  }

  assert.equal(await getSiteViewCount(metricModel), 0)
})

test('incrementSiteViewCount uses an atomic upsert and returns the total', async () => {
  let receivedFilter
  let receivedUpdate
  let receivedOptions
  const metricModel = {
    async findOneAndUpdate(filter, update, options) {
      receivedFilter = filter
      receivedUpdate = update
      receivedOptions = options
      return { count: 42 }
    },
  }

  const count = await incrementSiteViewCount(metricModel)

  assert.equal(count, 42)
  assert.deepEqual(receivedFilter, { key: 'site-views' })
  assert.deepEqual(receivedUpdate, {
    $inc: { count: 1 },
    $setOnInsert: { key: 'site-views' },
  })
  assert.equal(receivedOptions.returnDocument, 'after')
  assert.equal(receivedOptions.upsert, true)
})
