const { parseArgs } = require('node:util')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const { buildDefaultSkillHubState } = require('../config/skillHubStateDefaults')
const Student = require('../models/Student')
const Company = require('../models/Company')
const SkillAssessment = require('../models/SkillAssessment')
const TaskSubmission = require('../models/TaskSubmission')
const NetworkConnection = require('../models/NetworkConnection')
const TeamPost = require('../models/TeamPost')

const SHOWCASE_EMAILS = ['debarghya@gmail.com', 'rahul@gmail.com']

async function main() {
  const { values } = parseArgs({ options: { confirm: { type: 'boolean', default: false } } })
  if (!values.confirm) throw new Error('Usage: npm run demo:cleanup -- --confirm')
  await connectToDatabase(getEnvConfig().mongoUrl)
  try {
    const [students, companies] = await Promise.all([
      Student.collection.find({ email: { $in: SHOWCASE_EMAILS }, demoMode: true }).toArray(),
      Company.collection.find({ email: { $in: SHOWCASE_EMAILS }, demoMode: true }).toArray(),
    ])
    const removed = await Promise.all([
      SkillAssessment.collection.deleteMany({ demoData: true }), TaskSubmission.collection.deleteMany({ demoData: true }),
      NetworkConnection.collection.deleteMany({ demoData: true }), TeamPost.collection.deleteMany({ demoData: true }),
    ])
    for (const student of students) await Student.collection.updateOne({ _id: student._id, demoMode: true }, {
      $set: { preferredLanguage: '', location: '', trustScore: 0, avatar: null, skills: [], githubLink: [], contactInfo: [], projects: [], videoUrl: null, skillHubSkills: [], skillHubState: buildDefaultSkillHubState() },
      $unset: { demoMode: '', trustScoreState: '', gigState: '', networkState: '', earningState: '', dailySectionUsage: '' },
    })
    for (const company of companies) await Company.collection.updateOne({ _id: company._id, demoMode: true }, {
      $set: { location: '', businessProfile: { businessName: company.businessName, location: '', logo: '', introVideoUrl: null, industry: '', website: '', teamSize: '', workModes: [], description: '', hiringCategories: '', requiredSkills: '', contactEmail: '', contactPhone: '' } },
      $unset: { demoMode: '', dashboardState: '', gigManagementState: '', projectWorkspaceState: '', taskLibraryState: '', taskReviewGuides: '', paymentState: '', dailySectionUsage: '' },
    })
    console.log(JSON.stringify({ resetStudents: students.map(item => item.email), resetCompanies: companies.map(item => item.email), removed: { assessments: removed[0].deletedCount, taskSubmissions: removed[1].deletedCount, networkConnections: removed[2].deletedCount, teamPosts: removed[3].deletedCount } }, null, 2))
  } finally { await disconnectFromDatabase() }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
