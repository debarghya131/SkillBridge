const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Student = require('../models/Student')
const { calculateTrustScore } = require('../controllers/trustScoreController')

const applyChanges = process.argv.includes('--apply')
const studentIdIndex = process.argv.indexOf('--student-id')
const studentId = studentIdIndex >= 0 ? process.argv[studentIdIndex + 1] : ''

if (studentIdIndex >= 0 && !studentId) {
  throw new Error('Provide a student ID after --student-id')
}

async function main() {
  let scanned = 0
  let changed = 0
  let unchanged = 0
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    const query = studentId ? { _id: studentId } : {}
    for await (const student of Student.find(query).select('_id trustScore trustScoreState').cursor()) {
      scanned += 1
      const ledgerScore = calculateTrustScore(student)
      if (Number(student.trustScore) === ledgerScore) {
        unchanged += 1
        continue
      }
      changed += 1
      if (applyChanges) {
        student.trustScore = ledgerScore
        await student.save()
      }
    }
    console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', scope: studentId ? 'student' : 'all-students', scanned, changed, unchanged }))
  } finally {
    await disconnectFromDatabase()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
