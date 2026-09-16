const mongoose = require('mongoose')
const { getEnvConfig } = require('../config/env')
const Student = require('../models/Student')
const SkillAssessment = require('../models/SkillAssessment')
const { buildDefaultSkillHubState } = require('../config/skillHubStateDefaults')

const LEGACY_SKILL_NAMES = ['React', 'Node.js', 'UI/UX Design', 'SQL', 'Power BI', 'Content Marketing', 'Figma', 'REST APIs', 'Python', 'Canva', 'Data Analysis', 'SEO']
const LEGACY_PROJECT_NAMES = ['E-Commerce Dashboard', 'College Notice Board App', 'Inventory Management System']

function option(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : ''
}

function isLegacyDemoSkillHub(student) {
  const names = (student.skillHubSkills || []).map(skill => skill.name).sort()
  const expected = [...LEGACY_SKILL_NAMES].sort()
  return student.trustScore === 0
    && names.length === expected.length
    && names.every((name, index) => name === expected[index])
}

function isLegacyDemoProjects(student) {
  const names = (student.projects || []).filter(project => project.saved).map(project => project.name).sort()
  const expected = [...LEGACY_PROJECT_NAMES].sort()
  return student.trustScore === 0
    && (student.skills || []).length === 0
    && (student.skillHubSkills || []).length === 0
    && names.length === expected.length
    && names.every((name, index) => name === expected[index])
}

async function main() {
  const email = option('email').trim().toLowerCase()
  if (!email || !process.argv.includes('--confirm')) {
    throw new Error('Usage: npm run skills:reset-legacy-demo -- --email student@example.com --confirm')
  }

  await mongoose.connect(getEnvConfig().mongoUrl, { serverSelectionTimeoutMS: 8000 })
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const student = await Student.findOne({ email }).session(session)
      if (!student) throw new Error('Student account not found')
      const legacySkillHub = isLegacyDemoSkillHub(student)
      const legacyProjects = isLegacyDemoProjects(student)
      if (!legacySkillHub && !legacyProjects) {
        throw new Error('Account does not match the zero-score legacy template; refusing to remove user data.')
      }

      const assessmentCount = await SkillAssessment.countDocuments({ studentId: student._id }).session(session)
      if (assessmentCount > 0) {
        throw new Error('Account has assessment history; refusing to remove potentially real user work.')
      }
      student.skills = []
      student.skillHubSkills = []
      student.skillHubState = buildDefaultSkillHubState()
      if (legacyProjects) student.projects = []
      await student.save({ session })
      console.log(JSON.stringify({ student: student.email, clearedSkills: legacySkillHub ? LEGACY_SKILL_NAMES.length : 0,
        clearedProjects: legacyProjects ? LEGACY_PROJECT_NAMES.length : 0, assessmentCount }, null, 2))
    })
  } finally {
    await session.endSession()
    await mongoose.disconnect()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })

module.exports = { isLegacyDemoProjects, isLegacyDemoSkillHub, LEGACY_PROJECT_NAMES, LEGACY_SKILL_NAMES }
