const { parseArgs } = require('node:util')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const SkillAssessment = require('../models/SkillAssessment')
const { reviewSkillAssessment } = require('../controllers/skillAssessmentController')

async function main() {
  const { values } = parseArgs({ options: { list: { type: 'boolean' }, id: { type: 'string' }, decision: { type: 'string' }, feedback: { type: 'string' }, reviewer: { type: 'string' } } })
  if (!values.list && !values.id) throw new Error('Use --list, --id ID to inspect, or --id ID --decision approved|rejected|needs_revision --feedback TEXT --reviewer NAME')
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    if (values.list) {
      console.log(JSON.stringify(await SkillAssessment.find({ status: 'pending' }).select('_id studentId skillName mode createdAt').sort({ createdAt: 1 }).limit(100).lean(), null, 2))
    } else if (!values.decision) {
      if (!/^[a-f0-9]{24}$/i.test(values.id)) throw new Error('Invalid assessment ID')
      console.log(JSON.stringify(await SkillAssessment.findById(values.id).lean(), null, 2))
    } else {
      console.log(JSON.stringify(await reviewSkillAssessment(values.id, { status: values.decision, feedback: values.feedback, reviewer: values.reviewer }), null, 2))
    }
  } finally { await disconnectFromDatabase() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
