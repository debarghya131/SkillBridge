const mongoose = require('mongoose')
const { getEnvConfig } = require('../config/env')
const Student = require('../models/Student')
const SkillAssessment = require('../models/SkillAssessment')
const { DAY_MS, REWARDS, dayKey } = require('../utils/skillPolicy')

const SEED_REVIEWER = 'SkillBridge Sample Data'
const EVIDENCE_ROOT = 'https://github.com/skillbridge-samples/'

function option(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : ''
}

function dateOffset(offset, today) {
  return new Date(Date.parse(today) + offset * DAY_MS).toISOString().slice(0, 10)
}

function timestamp(offset, today, hour = 10) {
  return new Date(`${dateOffset(offset, today)}T${String(hour).padStart(2, '0')}:00:00+05:30`)
}

function attemptKey(skillName, mode, targetStage = '', challengeId = null) {
  return JSON.stringify([skillName.toLowerCase(), mode, targetStage, challengeId])
}

function assessment({ id, skillName, mode, status, today, daysAgo = 0, targetStage = '', challengeId = null, rewardPoints = 0, feedback = '' }) {
  const createdAt = timestamp(-daysAgo, today, 9)
  const reviewedAt = status === 'pending' ? null : timestamp(-Math.max(0, daysAgo - 1), today, 15)
  const evidenceSlug = `${skillName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${mode}-${id}`
  const response = `I completed an original ${skillName} ${mode} exercise, documented my decisions, included reproducible test evidence, and recorded limitations and next improvements.`
  return {
    _id: id,
    skillName,
    mode,
    targetStage,
    challengeId,
    attemptKey: attemptKey(skillName, mode, targetStage, challengeId),
    earnedDay: dateOffset(-daysAgo, today),
    brief: `Demonstrate practical ${skillName} ability with original work, clear decisions, reproducible evidence, and limitations.`,
    rewardPoints,
    evidenceLink: `${EVIDENCE_ROOT}${evidenceSlug}`,
    response,
    status,
    feedback,
    reviewer: status === 'pending' ? '' : SEED_REVIEWER,
    reviewedAt,
    reviewHistory: status === 'pending' ? [] : [{ status, feedback, reviewer: SEED_REVIEWER, reviewedAt, response, evidenceLink: `${EVIDENCE_ROOT}${evidenceSlug}` }],
    createdAt,
    updatedAt: reviewedAt || createdAt,
  }
}

function retentionLog(skillName, offset, today, points = 0) {
  return {
    eventType: 'retention_completed',
    skillName,
    earnedDay: dateOffset(offset, today),
    occurredAt: timestamp(offset, today, 16).toISOString(),
    assessmentId: `sample-retention-${skillName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${dateOffset(offset, today)}`,
    points,
  }
}

async function main() {
  const email = option('email').trim().toLowerCase()
  if (!email || !process.argv.includes('--confirm')) {
    throw new Error('Usage: npm run seed:skillhub-user -- --email student@example.com --confirm')
  }

  const { mongoUrl } = getEnvConfig()
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 8000 })
  const session = await mongoose.startSession()
  const today = dayKey()

  try {
    await session.withTransaction(async () => {
      const student = await Student.findOne({ email }).session(session)
      if (!student) throw new Error('Student account not found')

      const nonSampleAssessments = await SkillAssessment.countDocuments({
        studentId: student._id,
        evidenceLink: { $not: new RegExp(`^${EVIDENCE_ROOT}`) },
      }).session(session)
      if (nonSampleAssessments > 0) throw new Error('This account already has non-sample assessments; refusing to overwrite its Skill Hub history.')

      await SkillAssessment.deleteMany({ studentId: student._id, evidenceLink: new RegExp(`^${EVIDENCE_ROOT}`) }).session(session)

      const ids = Object.fromEntries(['reactUpgrade', 'nodeVerify', 'sqlVerify', 'powerVerify', 'contentVerify', 'figmaVerify', 'dataVerify',
        'uiVerify', 'uiRenew', 'restVerify', 'restRenew', 'pythonVerify', 'canvaVerify', 'contentUpgrade', 'sqlChallenge', 'reactChallenge']
        .map(key => [key, new mongoose.Types.ObjectId()]))

      const assessments = [
        assessment({ id: ids.reactUpgrade, skillName: 'React', mode: 'upgrade', targetStage: 'Intermediate', status: 'approved', today, daysAgo: 45, rewardPoints: REWARDS.upgrade, feedback: 'Architecture, tests, and accessibility evidence meet the Intermediate standard.' }),
        assessment({ id: ids.nodeVerify, skillName: 'Node.js', mode: 'verify', status: 'approved', today, daysAgo: 340, rewardPoints: REWARDS.verify, feedback: 'API implementation and failure-case tests verified.' }),
        assessment({ id: ids.sqlVerify, skillName: 'SQL', mode: 'verify', status: 'approved', today, daysAgo: 80, rewardPoints: REWARDS.verify, feedback: 'Queries, indexes, and expected results were reproduced.' }),
        assessment({ id: ids.powerVerify, skillName: 'Power BI', mode: 'verify', status: 'approved', today, daysAgo: 120, rewardPoints: REWARDS.verify, feedback: 'Dashboard model and metric definitions verified.' }),
        assessment({ id: ids.contentVerify, skillName: 'Content Marketing', mode: 'reverify', status: 'approved', today, daysAgo: 340, rewardPoints: REWARDS.reverify, feedback: 'Campaign evidence and measurement plan verified.' }),
        assessment({ id: ids.figmaVerify, skillName: 'Figma', mode: 'verify', status: 'approved', today, daysAgo: 60, rewardPoints: REWARDS.verify, feedback: 'Responsive variants and component states verified.' }),
        assessment({ id: ids.dataVerify, skillName: 'Data Analysis', mode: 'verify', status: 'approved', today, daysAgo: 95, rewardPoints: REWARDS.verify, feedback: 'Analysis is reproducible and assumptions are documented.' }),
        assessment({ id: ids.uiVerify, skillName: 'UI/UX Design', mode: 'verify', status: 'approved', today, daysAgo: 390, rewardPoints: REWARDS.verify, feedback: 'Original design process verified.' }),
        assessment({ id: ids.uiRenew, skillName: 'UI/UX Design', mode: 'reverify', status: 'needs_revision', today, daysAgo: 2, feedback: 'Add mobile interaction evidence and contrast results.' }),
        assessment({ id: ids.restVerify, skillName: 'REST APIs', mode: 'verify', status: 'approved', today, daysAgo: 420, rewardPoints: REWARDS.verify, feedback: 'Endpoint behavior and validation tests verified.' }),
        assessment({ id: ids.restRenew, skillName: 'REST APIs', mode: 'reverify', status: 'rejected', today, daysAgo: 8, feedback: 'The linked repository cannot be reproduced from the provided instructions.' }),
        assessment({ id: ids.pythonVerify, skillName: 'Python', mode: 'verify', status: 'pending', today, daysAgo: 0 }),
        assessment({ id: ids.canvaVerify, skillName: 'Canva', mode: 'verify', status: 'rejected', today, daysAgo: 12, feedback: 'Provide editable source work and explain your contribution.' }),
        assessment({ id: ids.contentUpgrade, skillName: 'Content Marketing', mode: 'upgrade', targetStage: 'Intermediate', status: 'pending', today, daysAgo: 1 }),
        assessment({ id: ids.sqlChallenge, skillName: 'SQL', mode: 'challenge', challengeId: 4, status: 'approved', today, daysAgo: 0, rewardPoints: REWARDS.challenge, feedback: 'Schema, queries, and index explanation verified.' }),
        assessment({ id: ids.reactChallenge, skillName: 'React', mode: 'challenge', challengeId: 2, status: 'approved', today, daysAgo: 3, rewardPoints: REWARDS.challenge, feedback: 'Accessible states and keyboard tests verified.' }),
      ]
      await SkillAssessment.insertMany(assessments.map(item => ({ ...item, studentId: student._id })), { session })

      const verified = (name, category, stage, level, dueOffset, verifiedDaysAgo, assessmentId, streak = 0, longestStreak = streak, lastOffset = null) => ({
        name, category, stage, level, verified: true, renewalStatus: dueOffset <= 30 ? 'due' : 'valid',
        renewalDue: dateOffset(dueOffset, today), verifiedAt: timestamp(-verifiedDaysAgo, today).toISOString(), assessmentId: String(assessmentId),
        lastRetentionDate: lastOffset === null ? '' : dateOffset(lastOffset, today), createdOn: dateOffset(-verifiedDaysAgo - 20, today),
        lastEvent: 'verified', streak, longestStreak, missedDays: 0, wrongAnswers: 0,
      })
      const expired = (name, category, stage, level, dueOffset, verifiedDaysAgo, assessmentId, longestStreak) => ({
        name, category, stage, level, verified: false, renewalStatus: 'expired', renewalDue: dateOffset(dueOffset, today),
        verifiedAt: timestamp(-verifiedDaysAgo, today).toISOString(), assessmentId: String(assessmentId), lastRetentionDate: '',
        createdOn: dateOffset(-verifiedDaysAgo - 20, today), lastEvent: 'expired', streak: 0, longestStreak, missedDays: 0, wrongAnswers: 0,
      })
      const unverified = (name, category, level) => ({
        name, category, stage: 'Beginner', level, verified: false, renewalStatus: 'unverified', renewalDue: '-', verifiedAt: '', assessmentId: '',
        lastRetentionDate: '', createdOn: dateOffset(-30, today), lastEvent: 'created', streak: 0, longestStreak: 0, missedDays: 0, wrongAnswers: 0,
      })

      student.skillHubSkills = [
        verified('React', 'Frontend', 'Intermediate', 84, 210, 155, ids.reactUpgrade, 6, 12, 0),
        verified('Node.js', 'Backend', 'Intermediate', 76, 18, 347, ids.nodeVerify, 3, 7, 0),
        expired('UI/UX Design', 'Design', 'Intermediate', 72, -25, 390, ids.uiVerify, 5),
        verified('SQL', 'Analytics', 'Beginner', 64, 285, 80, ids.sqlVerify, 1, 4, 0),
        verified('Power BI', 'Analytics', 'Intermediate', 79, 245, 120, ids.powerVerify, 2, 6, -1),
        verified('Content Marketing', 'Marketing', 'Beginner', 68, 25, 340, ids.contentVerify, 0, 4, null),
        verified('Figma', 'Design', 'Pro Mastery', 91, 305, 60, ids.figmaVerify, 0, 15, null),
        expired('REST APIs', 'Backend', 'Intermediate', 70, -55, 420, ids.restVerify, 8),
        unverified('Python', 'Backend', 57),
        unverified('Canva', 'Design', 61),
        verified('Data Analysis', 'Analytics', 'Beginner', 66, 270, 95, ids.dataVerify, 1, 3, -1),
        unverified('SEO', 'Marketing', 52),
      ]
      student.skills = student.skillHubSkills.map(skill => skill.name)

      const practiceLogs = [
        ...[-5, -4, -3, -2, -1, 0].map((offset, index) => retentionLog('React', offset, today, index === 0 ? REWARDS.retain : 0)),
        ...[-2, -1, 0].map(offset => retentionLog('Node.js', offset, today)),
        retentionLog('SQL', 0, today),
        retentionLog('Power BI', -2, today), retentionLog('Power BI', -1, today),
        retentionLog('Data Analysis', -1, today),
      ]
      const lifecycleLogs = [
        { eventType: 'challenge_completed', skillName: 'SQL', challengeId: 4, earnedDay: today, occurredAt: timestamp(0, today, 17).toISOString(), assessmentId: String(ids.sqlChallenge), points: REWARDS.challenge },
        { eventType: 'challenge_completed', skillName: 'React', challengeId: 2, earnedDay: dateOffset(-3, today), occurredAt: timestamp(-3, today, 17).toISOString(), assessmentId: String(ids.reactChallenge), points: REWARDS.challenge },
        { eventType: 'upgrade_completed', skillName: 'React', occurredAt: timestamp(-45, today).toISOString(), assessmentId: String(ids.reactUpgrade), points: REWARDS.upgrade },
        { eventType: 'reverify_completed', skillName: 'Content Marketing', occurredAt: timestamp(-340, today).toISOString(), assessmentId: String(ids.contentVerify), points: REWARDS.reverify },
        { eventType: 'verify_completed', skillName: 'Figma', occurredAt: timestamp(-60, today).toISOString(), assessmentId: String(ids.figmaVerify), points: REWARDS.verify },
        { eventType: 'verify_completed', skillName: 'SQL', occurredAt: timestamp(-80, today).toISOString(), assessmentId: String(ids.sqlVerify), points: REWARDS.verify },
        { eventType: 'verify_completed', skillName: 'Data Analysis', occurredAt: timestamp(-95, today).toISOString(), assessmentId: String(ids.dataVerify), points: REWARDS.verify },
        { eventType: 'verify_completed', skillName: 'Power BI', occurredAt: timestamp(-120, today).toISOString(), assessmentId: String(ids.powerVerify), points: REWARDS.verify },
        { eventType: 'expired', skillName: 'UI/UX Design', occurredAt: timestamp(-25, today).toISOString(), points: -80 },
        { eventType: 'expired', skillName: 'REST APIs', occurredAt: timestamp(-55, today).toISOString(), points: -80 },
      ]
      student.skillHubState = {
        daily: { date: today, completedChallenges: [4], completedRetention: ['react', 'node.js', 'sql'], wrongAnswers: {} },
        skillLog: [...practiceLogs, ...lifecycleLogs].sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt)),
        skillGapReport: { activeGigs: 0, overallMatch: 0, gapData: [], strengths: [] },
      }

      const existingTrustEvents = Array.isArray(student.trustScoreState?.events) ? student.trustScoreState.events : []
      const retentionTrustKey = `retention_task_completed:${today}`
      const challengeTrustKey = `daily_challenge_solved:${today}`
      const retainedTrustEvents = existingTrustEvents.filter(event => ![retentionTrustKey, challengeTrustKey].includes(event.key))
      student.trustScoreState = { ...student.trustScoreState, events: [...retainedTrustEvents,
        { key: retentionTrustKey, type: 'retention_task_completed', label: 'Retention Task Completed', points: REWARDS.retain, category: 'Daily', referenceId: today, occurredAt: timestamp(0, today, 16).toISOString() },
        { key: challengeTrustKey, type: 'daily_challenge_solved', label: 'Daily Challenge Solved', points: REWARDS.challenge, category: 'Daily', referenceId: today, occurredAt: timestamp(0, today, 17).toISOString() },
      ], updatedAt: new Date().toISOString() }
      await student.save({ session })

      console.log(JSON.stringify({ student: student.name, skills: student.skillHubSkills.length, assessments: assessments.length,
        verified: student.skillHubSkills.filter(skill => skill.verified).length, pending: assessments.filter(item => item.status === 'pending').length }, null, 2))
    })
  } finally {
    await session.endSession()
    await mongoose.disconnect()
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
