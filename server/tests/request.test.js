const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { readJsonBody } = require('../utils/request')

function requestWithChunks(chunks) {
  const request = new EventEmitter()
  process.nextTick(() => {
    for (const chunk of chunks) request.emit('data', chunk)
    request.emit('end')
  })
  return request
}

test('readJsonBody accepts the configured media upload envelope', async () => {
  const payload = await readJsonBody(requestWithChunks(['{"video":"', 'x'.repeat(1_100_000), '"}']), 2_000_000)
  assert.equal(payload.video.length, 1_100_000)
})

test('readJsonBody rejects bodies over the configured limit', async () => {
  await assert.rejects(
    readJsonBody(requestWithChunks(['{"value":"', 'x'.repeat(1_000_100), '"}']), 1_000_000),
    error => error.statusCode === 413,
  )
})