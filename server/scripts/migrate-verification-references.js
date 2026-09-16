const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Company = require('../models/Company')
const Student = require('../models/Student')
const { hashVerificationReference } = require('../utils/verification')

const applyChanges = process.argv.includes('--apply')

function requireMigrationSecret() {
  const secret = typeof process.env.VERIFICATION_HASH_SECRET === 'string'
    ? process.env.VERIFICATION_HASH_SECRET.trim()
    : ''

  if (secret.length < 32) {
    throw new Error('Set VERIFICATION_HASH_SECRET to a stable value of at least 32 characters before using --apply')
  }
}

async function migrateStudents() {
  const result = { scanned: 0, migratable: 0, migrated: 0 }
  const cursor = Student.find({
    $or: [
      { aadhaarNumber: { $exists: true, $ne: '' } },
      { digilockerToken: { $exists: true, $ne: '' } },
    ],
  }).select('_id verificationMethod +aadhaarNumber +digilockerToken +identityVerificationHash').cursor()

  for await (const student of cursor) {
    result.scanned += 1
    const reference = student.verificationMethod === 'digilocker'
      ? student.digilockerToken
      : student.aadhaarNumber
    const hash = hashVerificationReference(reference, 'student-identity')
    if (!hash) continue
    result.migratable += 1

    if (applyChanges) {
      await Student.updateOne({ _id: student._id }, {
        $set: { identityVerificationHash: student.identityVerificationHash || hash },
        $unset: { aadhaarNumber: '', digilockerToken: '' },
      })
      result.migrated += 1
    }
  }

  return result
}

async function migrateCompanies() {
  const result = { scanned: 0, migratable: 0, migrated: 0 }
  const cursor = Company.find({
    $or: [
      { gstin: { $exists: true, $ne: '' } },
      { businessDoc: { $exists: true, $ne: '' } },
    ],
  }).select('_id verificationMethod +gstin +businessDoc +verificationReferenceHash').cursor()

  for await (const company of cursor) {
    result.scanned += 1
    const reference = company.verificationMethod === 'udyam'
      ? company.businessDoc
      : company.gstin
    const hash = hashVerificationReference(reference, 'company-registration')
    if (!hash) continue
    result.migratable += 1

    if (applyChanges) {
      await Company.updateOne({ _id: company._id }, {
        $set: { verificationReferenceHash: company.verificationReferenceHash || hash },
        $unset: { gstin: '', businessDoc: '' },
      })
      result.migrated += 1
    }
  }

  return result
}

async function main() {
  const env = getEnvConfig()
  if (applyChanges) requireMigrationSecret()
  try {
    await connectToDatabase(env.mongoUrl, env)
    const [students, companies] = await Promise.all([migrateStudents(), migrateCompanies()])
    console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', students, companies }, null, 2))
  } finally {
    await disconnectFromDatabase()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
