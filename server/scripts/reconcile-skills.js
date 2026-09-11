const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Student = require('../models/Student')
const { reconcileSkillExpiry } = require('../controllers/skillHubController')

async function main() {
  let changed = 0
  let conflicts = 0
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    for await (const student of Student.find({ 'skillHubSkills.verified': true }).cursor()) {
      try { if (await reconcileSkillExpiry(student)) changed++ } catch (error) {
        if (error.statusCode === 409) conflicts++
        else throw error
      }
    }
    console.log(JSON.stringify({ changed, conflicts }))
    if (conflicts) process.exitCode = 1
  } finally { await disconnectFromDatabase() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
