const test = require('node:test')
const assert = require('node:assert/strict')
const Student = require('../models/Student')
const Company = require('../models/Company')
const NetworkConnection = require('../models/NetworkConnection')
const profiles = require('../utils/publicStudentProfile')
const { getNetworkProfile } = require('../controllers/networkController')
const { getCompanyStudentProfile } = require('../controllers/companyController')

test('public profile endpoints use the selected ID and enforce session and contact access', async t => {
  const viewerId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
  const targetId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
  const sessions = [{ token: 'valid', createdAt: new Date() }]
  let target = { _id: targetId, name: 'Current target' }
  let connected = false
  t.mock.method(Student, 'findOne', async () => ({ _id: viewerId, sessions }))
  t.mock.method(Company, 'findOne', async () => ({ _id: viewerId, sessions }))
  t.mock.method(Student, 'findById', id => {
    assert.equal(id, targetId)
    return { lean: async () => target }
  })
  t.mock.method(NetworkConnection, 'exists', async query => {
    assert.equal(query.status, 'accepted')
    return connected
  })
  t.mock.method(profiles, 'publicStudentProfile', async (student, contactVisible) => ({ id: student._id, name: student.name, contactVisible }))
  assert.deepEqual(await getNetworkProfile('valid', targetId), { id: targetId, name: 'Current target', contactVisible: false })
  connected = true
  assert.equal((await getNetworkProfile('valid', targetId)).contactVisible, true)
  target.name = 'Updated target'
  assert.deepEqual(await getCompanyStudentProfile('valid', targetId), { id: targetId, name: 'Updated target', contactVisible: true })
  for (const read of [getNetworkProfile, getCompanyStudentProfile]) {
    await assert.rejects(read('', targetId), error => error.statusCode === 401)
    await assert.rejects(read('valid', 'invalid'), error => error.statusCode === 400)
  }
  target = null
  for (const read of [getNetworkProfile, getCompanyStudentProfile]) {
    await assert.rejects(read('valid', targetId), error => error.statusCode === 404)
  }
})
