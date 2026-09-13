const TeamPost = require('../models/TeamPost')
const { buildGigState } = require('../controllers/gigController')
const { buildStudentSkillHubSkills, buildStreakSummary, buildActivityDays } = require('../controllers/skillHubController')
const { isArchivedSkill } = require('./skillPolicy')

async function publicStudentProfile(student, includeContact = false) {
  const records = buildStudentSkillHubSkills(student).filter(skill => !isArchivedSkill(skill))
  const log = student.skillHubState?.skillLog || []
  const summary = buildStreakSummary(records, log)
  const [gigs, teamUps] = await Promise.all([
    buildGigState(student),
    TeamPost.countDocuments({ $or: [{ owner: student._id }, { requests: { $elemMatch: { student: student._id, status: 'accepted' } } }] }),
  ])
  return {
    id: String(student._id), name: student.name, avatar: student.avatar || null,
    trustScore: require('../controllers/trustScoreController').calculateTrustScore(student), location: student.location || '',
    contactMethod: student.contactMethod || null, verificationMethod: student.verificationMethod || null,
    skills: records.map(({ name, stage, verified, renewalStatus, streak }) => ({ name, stage, verified, renewalStatus, streak })),
    practiceDays: summary.totalPracticeDays, trustStreak: summary.overallCurrent,
    activityDays: buildActivityDays(log), completedGigs: gigs.completedGigs.length, teamUps,
    projects: (student.projects || []).filter(item => item.saved === true).map(({ name, desc, link, demoLink }) => ({ name, desc, link, demoLink })),
    githubLink: (student.githubLink || []).filter(item => item.saved !== false).map(({ url }) => ({ url })),
    videoUrl: student.videoUrl || null, contactVisible: includeContact,
    contactInfo: includeContact ? (student.contactInfo || []).filter(item => item.saved !== false).map(({ label, value }) => ({ label, value })) : [],
  }
}
module.exports = { publicStudentProfile }
