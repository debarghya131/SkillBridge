const test = require('node:test')
const assert = require('node:assert/strict')
const networkController = require('../controllers/networkController')
const skillHubController = require('../controllers/skillHubController')

test('extracted Network and Skill Hub routes preserve their response contracts', async t => {
  t.mock.method(networkController, 'getStudentNetworkState', async token => {
    assert.equal(token, 'student-token')
    return { connected: [] }
  })
  t.mock.method(skillHubController, 'getStudentSkillHub', async (token, options) => {
    assert.equal(token, 'student-token')
    assert.deepEqual(options, { includeSkillGap: false })
    return { skills: [] }
  })
  const { handleStudentNetworkRoutes } = require('../routes/studentNetworkRoutes')
  const { handleStudentSkillHubRoutes } = require('../routes/studentSkillHubRoutes')
  const responses = []
  const sendJson = (_res, status, body) => responses.push({ status, body })
  const request = (url) => ({ method: 'GET', url, headers: { host: 'localhost', authorization: 'Bearer student-token' } })

  assert.equal(await handleStudentNetworkRoutes(request('/api/student/network'), {}, '/api/student/network', sendJson), true)
  assert.deepEqual(responses.pop(), { status: 200, body: { networkState: { connected: [] } } })
  assert.equal(await handleStudentSkillHubRoutes(request('/api/student/skillhub?includeSkillGap=false'), {}, '/api/student/skillhub', sendJson), true)
  assert.deepEqual(responses.pop(), { status: 200, body: { skillHub: { skills: [] } } })
  assert.equal(await handleStudentNetworkRoutes(request('/api/student/other'), {}, '/api/student/other', sendJson), false)
  assert.equal(await handleStudentSkillHubRoutes(request('/api/student/other'), {}, '/api/student/other', sendJson), false)
  assert.deepEqual(responses, [])
})
