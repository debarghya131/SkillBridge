const test = require('node:test')
const assert = require('node:assert/strict')
const { assertProductionTransactionSupport, buildDatabaseOptions, supportsTransactions } = require('../config/db')
const { databaseNameFromMongoUrl, isValidDatabaseName } = require('../config/env')
const Company = require('../models/Company')
const NetworkConnection = require('../models/NetworkConnection')
const Reviewer = require('../models/Reviewer')
const SkillAssessment = require('../models/SkillAssessment')
const Student = require('../models/Student')
const TeamPost = require('../models/TeamPost')
const { hashVerificationReference, normalizeVerificationReference } = require('../utils/verification')
const { buildStudentTaskProfile } = require('../controllers/taskBridgeController')

test('production database options use bounded pools and explicit index deployment', () => {
  const options = buildDatabaseOptions({
    nodeEnv: 'production',
    dbMaxPoolSize: 250,
    dbMinPoolSize: 999,
    dbMaxIdleTimeMs: 100,
    dbServerSelectionTimeoutMs: 999999,
  })

  assert.equal(options.autoCreate, false)
  assert.equal(options.autoIndex, false)
  assert.equal(options.bufferCommands, false)
  assert.equal(options.maxPoolSize, 100)
  assert.equal(options.minPoolSize, 100)
  assert.equal(options.maxIdleTimeMS, 1000)
  assert.equal(options.serverSelectionTimeoutMS, 60000)
})

test('database selection is explicit and MongoDB URI paths are recognized', () => {
  assert.equal(buildDatabaseOptions({ mongoDbName: 'skillbridge' }).dbName, 'skillbridge')
  assert.equal(databaseNameFromMongoUrl('mongodb+srv://user:pass@example.mongodb.net/skillbridge?retryWrites=true'), 'skillbridge')
  assert.equal(databaseNameFromMongoUrl('mongodb://localhost:27017/'), '')
  assert.equal(isValidDatabaseName('skillbridge-prod'), true)
  assert.equal(isValidDatabaseName('invalid database'), false)
})

test('production deployments require MongoDB transaction support for reviewed assessments', async () => {
  assert.equal(supportsTransactions({ setName: 'rs0' }), true)
  assert.equal(supportsTransactions({ msg: 'isdbgrid' }), true)
  assert.equal(supportsTransactions({}), false)
  await assert.doesNotReject(assertProductionTransactionSupport({ db: { admin: () => ({ command: async () => ({ setName: 'rs0' }) }) } }, 'production'))
  await assert.rejects(assertProductionTransactionSupport({ db: { admin: () => ({ command: async () => ({}) }) } }, 'production'), /replica set or mongos/)
  await assert.doesNotReject(assertProductionTransactionSupport({ db: { admin: () => ({ command: async () => ({}) }) } }, 'development'))
})

test('sensitive fields are hidden from ordinary Mongoose queries', () => {
  assert.equal(Student.schema.path('passwordHash').options.select, false)
  assert.equal(Student.schema.path('sessions').options.select, false)
  assert.equal(Student.schema.path('aadhaarNumber').options.select, false)
  assert.equal(Student.schema.path('digilockerToken').options.select, false)
  assert.equal(Company.schema.path('passwordHash').options.select, false)
  assert.equal(Company.schema.path('sessions').options.select, false)
  assert.equal(Company.schema.path('gstin').options.select, false)
  assert.equal(Company.schema.path('businessDoc').options.select, false)
  assert.ok(Company.schema.options.optimisticConcurrency.includes('gigManagementState'))
  assert.ok(Company.schema.options.optimisticConcurrency.includes('projectWorkspaceState'))
  assert.ok(Student.schema.options.optimisticConcurrency.includes('gigState'))
  assert.equal(Reviewer.schema.path('passwordHash').options.select, false)
  assert.equal(Reviewer.schema.path('sessions').options.select, false)
})

test('verification references are scoped HMAC fingerprints, not stored values', () => {
  const value = '1234 5678 9012'
  const secret = 'a-secret-longer-than-thirty-two-characters'
  const studentHash = hashVerificationReference(value, 'student-identity', secret)

  assert.equal(normalizeVerificationReference(value), '123456789012')
  assert.match(studentHash, /^hmac-sha256:/)
  assert.equal(studentHash.includes('123456789012'), false)
  assert.notEqual(studentHash, hashVerificationReference(value, 'company-registration', secret))
})

test('production environment requires a stable verification HMAC secret', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousSecret = process.env.VERIFICATION_HASH_SECRET
  process.env.NODE_ENV = 'production'
  process.env.VERIFICATION_HASH_SECRET = 'too-short'

  assert.throws(() => hashVerificationReference('reference', 'student-identity'), /VERIFICATION_HASH_SECRET/)

  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv
  if (previousSecret === undefined) delete process.env.VERIFICATION_HASH_SECRET
  else process.env.VERIFICATION_HASH_SECRET = previousSecret
})

test('task submission snapshots keep external media URLs but never duplicate inline media', () => {
  const profile = buildStudentTaskProfile({
    name: 'Student',
    avatar: 'data:image/png;base64,iVBORw0KGgo=',
    videoUrl: 'https://media.example/intro.mp4',
    skills: [], skillHubSkills: [], githubLink: [], contactInfo: [], projects: [],
  })

  assert.equal(profile.studentAvatar, null)
  assert.equal(profile.studentVideoUrl, 'https://media.example/intro.mp4')
})

test('redundant standalone indexes are absent from schema declarations', () => {
  const hasStandaloneIndex = (model, field) => model.schema.indexes()
    .some(([keys]) => JSON.stringify(keys) === JSON.stringify({ [field]: 1 }))

  assert.equal(hasStandaloneIndex(NetworkConnection, 'requester'), false)
  assert.equal(hasStandaloneIndex(NetworkConnection, 'recipient'), false)
  assert.equal(hasStandaloneIndex(NetworkConnection, 'status'), false)
  assert.equal(hasStandaloneIndex(TeamPost, 'status'), false)
  assert.equal(hasStandaloneIndex(SkillAssessment, 'studentId'), false)
  assert.equal(SkillAssessment.schema.indexes().some(([keys, options]) => JSON.stringify(keys) === JSON.stringify({ studentId: 1, dailySubmissionKey: 1 }) && options.name === 'one_open_daily_submission'), true)
})
