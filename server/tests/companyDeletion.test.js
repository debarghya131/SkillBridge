const test = require('node:test')
const assert = require('node:assert/strict')
const Company = require('../models/Company')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const { hashPassword } = require('../utils/auth')
const { deleteCompanyAccount } = require('../controllers/companyDeletionController')

test('company deletion requires confirmation and password, and scopes transactional cleanup', async t => {
  const company = new Company({ businessName: 'Delete test', passwordHash: hashPassword('correct-password'), sessions: [{ token: 'test', createdAt: new Date() }] })
  t.mock.method(Company, 'findOne', async () => company)
  let transactions = 0
  const session = {}
  t.mock.method(Company.db, 'transaction', async fn => { transactions++; return fn(session) })
  await assert.rejects(deleteCompanyAccount('test', { confirmation: 'NO', password: 'correct-password' }), /Type DELETE/)
  await assert.rejects(deleteCompanyAccount('test', { confirmation: 'DELETE', password: 'wrong' }), /current password/)
  assert.equal(transactions, 0)
  t.mock.method(Company, 'findById', () => ({ session: () => company }))
  t.mock.method(Student, 'find', () => ({ session: () => ({ cursor: async function* () { yield { _id: 'student', gigState: { opportunities: [{ id: 9, companyId: company._id }, { id: 10, companyId: 'other' }] } } } }) }))
  t.mock.method(Student, 'updateOne', async (filter, update, options) => {
    assert.equal(filter._id, 'student')
    assert.equal(String(update.$pull['gigState.opportunities'].companyId), String(company._id))
    assert.deepEqual(Object.keys(update.$unset), ['gigState.opportunityStatusById.9'])
    assert.equal(options.session, session)
  })
  t.mock.method(TaskSubmission, 'deleteMany', async (filter, options) => {
    assert.equal(String(filter.companyId), String(company._id)); assert.equal(options.session, session)
  })
  t.mock.method(Company, 'deleteOne', async (filter, options) => {
    assert.equal(String(filter._id), String(company._id)); assert.equal(options.session, session)
  })
  assert.deepEqual(await deleteCompanyAccount('test', { confirmation: 'DELETE', password: 'correct-password' }), { deleted: true })
  assert.equal(transactions, 1)
})
