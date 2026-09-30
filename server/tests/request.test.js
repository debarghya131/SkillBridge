const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { getRequestUrl, readJsonBody } = require('../utils/request')

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
  const request = requestWithChunks(['{"value":"', 'x'.repeat(1_000_100), '"}'])
  let destroyed = false
  request.destroy = () => { destroyed = true }
  await assert.rejects(
    readJsonBody(request, 1_000_000),
    error => error.statusCode === 413,
  )
  assert.equal(destroyed, false, 'leave the connection open long enough to send the 413 response')
})

test('readJsonBody limits UTF-8 bytes rather than string characters', async () => {
  await assert.rejects(
    readJsonBody(requestWithChunks(['{"value":"', '₹'.repeat(400_000), '"}']), 1_000_000),
    error => error.statusCode === 413,
  )
})

test('request URL parsing does not trust the Host header', () => {
  const url = getRequestUrl({ url: '/ready?probe=1', headers: { host: 'bad host' } })
  assert.equal(url.pathname, '/ready')
  assert.equal(url.searchParams.get('probe'), '1')
})
