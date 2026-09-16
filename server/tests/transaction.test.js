const test = require('node:test')
const assert = require('node:assert/strict')
const { saveDocumentsAtomically } = require('../utils/transaction')

test('production cross-document saves use one database transaction', async () => {
  const saves = []
  const connection = {
    readyState: 1,
    transaction: async callback => callback('session-1'),
  }
  const documents = [
    { save: async options => saves.push(options) },
    { save: async options => saves.push(options) },
  ]

  await saveDocumentsAtomically(documents, { nodeEnv: 'production', connection })
  assert.deepEqual(saves, [{ session: 'session-1' }, { session: 'session-1' }])
})

test('production cross-document saves fail closed without transaction support', async () => {
  let saved = false
  await assert.rejects(
    saveDocumentsAtomically([{ save: async () => { saved = true } }], {
      nodeEnv: 'production',
      connection: { readyState: 0 },
    }),
    error => error.statusCode === 503,
  )
  assert.equal(saved, false)
})
