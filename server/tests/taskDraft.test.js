const test = require('node:test')
const assert = require('node:assert/strict')

test('task drafts are isolated by session and assignment and reject stale or damaged data', async () => {
  const { taskDraftKey, readTaskDraft } = await import('../../client/src/student/task/taskDraft.js')
  const key = await taskDraftKey('session-one', ['company', 1])
  assert.notEqual(key, await taskDraftKey('session-two', ['company', 1]))
  assert.notEqual(key, await taskDraftKey('session-one', ['company', 2]))
  assert.equal(key.includes('session-one'), false)
  let value = JSON.stringify({ version: 'v1', savedAt: Date.now(), submissionLink: '', submissionContent: 'Draft', note: '' })
  const storage = { getItem: () => value }
  assert.equal(readTaskDraft(storage, key, 'v1').submissionContent, 'Draft')
  assert.equal(readTaskDraft(storage, key, 'v2'), null)
  value = JSON.stringify({ version: 'v1', savedAt: 0, submissionLink: '', submissionContent: 'Old', note: '' })
  assert.equal(readTaskDraft(storage, key, 'v1'), null)
  value = 'broken'
  assert.equal(readTaskDraft(storage, key, 'v1'), null)
  assert.equal(readTaskDraft({ getItem() { throw new Error('Blocked') } }, key, 'v1'), null)
})
