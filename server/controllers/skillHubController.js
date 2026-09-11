const Student = require('../models/Student')
const Company = require('../models/Company')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { reconcileTrustScore, recordTrustScoreEvent } = require('./trustScoreController')
const { DAY_MS, CATEGORIES, STAGES, REWARDS, CHALLENGES, dayKey, expiryDay, skillStatus, isVerifiedSkill, activeStreak } = require('../utils/skillPolicy')

const findStudentByToken = token => findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
const APPROVED_ACTIVITY_EVENTS = new Set(['verify_completed', 'reverify_completed', 'upgrade_completed', 'retention_completed', 'challenge_completed'])

function sanitizeSkill(input) {
  const skill = input?.toObject ? input.toObject() : { ...input }
  const status = skillStatus(skill)
  const storedStreak = Math.max(0, Number(skill.streak) || 0)
  return {
    name: String(skill.name || '').trim(), category: CATEGORIES.includes(skill.category) ? skill.category : 'Other',
    stage: STAGES.includes(skill.stage) ? skill.stage : 'Beginner', level: Number(skill.level) || 0,
    verified: isVerifiedSkill(skill), renewalStatus: status, renewalDue: expiryDay(skill.renewalDue) || '-',
    verifiedAt: skill.verifiedAt || '', assessmentId: skill.assessmentId || '',
    lastRetentionDate: skill.lastRetentionDate || '', createdOn: skill.createdOn || '',
    lastEvent: skill.lastEvent || 'created', streak: activeStreak(skill),
    longestStreak: Math.max(storedStreak, Number(skill.longestStreak) || 0),
    missedDays: 0, wrongAnswers: 0,
    trustGain: status === 'unverified' ? REWARDS.verify : REWARDS.reverify,
    trustLoss: status === 'expired' && skill.verifiedAt ? -REWARDS.expiry : 0,
  }
}

function streakRuns(dayValues) {
  const days = [...new Set(dayValues.filter(Boolean))].sort()
  let longest = 0
  let latest = 0
  let run = 0
  let previous = ''
  for (const day of days) {
    run = previous && Date.parse(day) - Date.parse(previous) === DAY_MS ? run + 1 : 1
    longest = Math.max(longest, run)
    latest = run
    previous = day
  }
  return { days, latest, longest, lastDay: days.at(-1) || '' }
}

function buildStreakSummary(skills, log, today = dayKey()) {
  const retention = log.filter(item => item.eventType === 'retention_completed' && item.earnedDay)
  const practiceDays = [...new Set(retention.map(item => item.earnedDay))]
  const overall = streakRuns(practiceDays)
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.parse(today) - (6 - index) * DAY_MS).toISOString().slice(0, 10)
    const completedSkills = new Set(retention.filter(item => item.earnedDay === date).map(item => item.skillName.toLowerCase()))
    return { date, count: completedSkills.size, completed: completedSkills.size > 0 }
  })
  const current = Math.max(0, ...skills.map(skill => Number(skill.streak) || 0))
  const longest = Math.max(current, ...skills.map(skill => Number(skill.longestStreak) || 0))
  const milestones = [3, 7, 14, 30, 60, 100]
  return {
    current,
    longest,
    // Overall activity is separate from a skill's streak: it counts any day
    // the student had approved practice, regardless of which skill was used.
    overallCurrent: overall.lastDay && (Date.parse(today) - Date.parse(overall.lastDay)) <= DAY_MS ? overall.latest : 0,
    overallLongest: overall.longest,
    totalPracticeDays: overall.days.length,
    activeSkills: skills.filter(skill => Number(skill.streak) > 0).length,
    completedToday: week.at(-1)?.count || 0,
    nextMilestone: milestones.find(value => value > current) || null,
    week,
  }
}

function buildActivityDays(log) {
  const counts = new Map()
  for (const item of Array.isArray(log) ? log : []) {
    if (!APPROVED_ACTIVITY_EVENTS.has(item?.eventType) || !/^\d{4}-\d{2}-\d{2}$/.test(item?.earnedDay || '')) continue
    counts.set(item.earnedDay, (counts.get(item.earnedDay) || 0) + 1)
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, count]) => ({ date, count }))
}

function normalizeHeatmapFilters(filters = {}, today = dayKey()) {
  const [currentYear, currentMonth] = today.split('-').map(Number)
  const view = filters.view === 'year' ? 'year' : filters.view === 'month' || !filters.view ? 'month' : ''
  const year = Number.parseInt(filters.year, 10)
  const month = view === 'month' ? Number.parseInt(filters.month, 10) : null
  if (!view) throw buildAuthError('Heatmap view must be month or year')
  if (!Number.isInteger(year) || year < 2020 || year > currentYear) throw buildAuthError(`Heatmap year must be between 2020 and ${currentYear}`)
  if (view === 'month' && (!Number.isInteger(month) || month < 1 || month > 12)) throw buildAuthError('Heatmap month must be between 1 and 12')
  if (view === 'month' && year === currentYear && month > currentMonth) throw buildAuthError('Future heatmap periods are not available')
  const startDate = view === 'year' ? `${year}-01-01` : `${year}-${String(month).padStart(2, '0')}-01`
  const next = view === 'year' ? new Date(Date.UTC(year + 1, 0, 1)) : new Date(Date.UTC(year, month, 1))
  const endDate = next.toISOString().slice(0, 10)
  return { view, year, month, startDate, endDate }
}

async function getStudentActivityHeatmap(token, filters) {
  const student = await findStudentByToken(token)
  const range = normalizeHeatmapFilters(filters)
  const [summary] = await Student.aggregate([
    { $match: { _id: student._id } },
    { $unwind: '$skillHubState.skillLog' },
    { $match: {
      'skillHubState.skillLog.eventType': { $in: [...APPROVED_ACTIVITY_EVENTS] },
      'skillHubState.skillLog.earnedDay': { $gte: range.startDate, $lt: range.endDate },
    } },
    { $group: { _id: '$skillHubState.skillLog.earnedDay', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $group: { _id: null, activeDays: { $sum: 1 }, totalActivities: { $sum: '$count' }, days: { $push: { date: '$_id', count: '$count' } } } },
    { $project: { _id: 0, activeDays: 1, totalActivities: 1, days: 1 } },
  ])
  return { ...range, activeDays: summary?.activeDays || 0, totalActivities: summary?.totalActivities || 0, days: summary?.days || [] }
}

function buildStudentSkillHubSkills(student) {
  const skills = (student.skillHubSkills || []).map(sanitizeSkill).filter(skill => skill.name)
  const names = new Set(skills.map(skill => skill.name.toLowerCase()))
  for (const name of student.skills || []) {
    if (typeof name === 'string' && name.trim() && !names.has(name.trim().toLowerCase())) {
      skills.push(sanitizeSkill({ name: name.trim() }))
      names.add(name.trim().toLowerCase())
    }
  }
  return skills
}

function skillLog(student) {
  return Array.isArray(student.skillHubState?.skillLog) ? student.skillHubState.skillLog : []
}

function appendLog(student, entry) {
  student.skillHubState = { ...student.skillHubState, skillLog: [entry, ...skillLog(student)] }
}

async function saveSkillStudent(student, session) {
  // Reject stale profile writes instead of overwriting a concurrent assessment approval.
  if (!session && student.updatedAt) student.$where = { updatedAt: student.updatedAt }
  try { await student.save({ session }) } catch (error) {
    if (['DocumentNotFoundError', 'VersionError'].includes(error.name)) throw buildAuthError('Your profile changed. Refresh before saving.', 409)
    throw error
  }
}

async function reconcileSkillExpiry(student, session) {
  let changed = false
  const skills = (student.skillHubSkills || []).map(input => input.toObject ? input.toObject() : { ...input })
  for (const skill of skills) {
    const status = skillStatus(skill)
    if (status === 'expired' && (skill.verified || skill.renewalStatus !== 'expired')) {
      skill.verified = false
      skill.renewalStatus = 'expired'
      skill.lastEvent = 'expired'
      // Legacy demo verification has no review timestamp and must not incur a new penalty.
      const result = skill.verifiedAt
        ? recordTrustScoreEvent(student, 'skill_expired', `${skill.name.toLowerCase()}:${expiryDay(skill.renewalDue)}`)
        : { recorded: false }
      appendLog(student, { eventType: 'expired', skillName: skill.name, occurredAt: new Date().toISOString(), points: result.recorded ? REWARDS.expiry : 0 })
      changed = true
    }
  }
  if (changed) {
    student.skillHubSkills = skills
    await saveSkillStudent(student, session)
  }
  return changed
}

function buildSkillGapReport(skills, companies) {
  const requirements = new Map()
  let activeGigs = 0
  let matchedRequirements = 0
  let totalRequirements = 0
  for (const company of companies) {
    for (const gig of company.gigManagementState?.gigs || []) {
      if (!gig.title || !['Hiring', 'Reviewing', 'In Progress'].includes(gig.status)) continue
      const tags = [...new Set((gig.skills || []).filter(name => typeof name === 'string' && name.trim()).map(name => name.trim().toLowerCase()))]
      if (!tags.length) continue
      activeGigs++
      for (const name of tags) {
        const skill = skills.find(item => item.name.toLowerCase() === name)
        const covered = Boolean(skill && isVerifiedSkill(skill))
        totalRequirements++
        if (covered) matchedRequirements++
        const previous = requirements.get(name)
        requirements.set(name, { skill: skill?.name || name, category: skill?.category || 'Other', gigs: (previous?.gigs || 0) + 1,
          status: covered ? 'Verified' : skill ? skill.renewalStatus : 'Missing', covered })
      }
    }
  }
  const rows = [...requirements.values()].sort((a, b) => b.gigs - a.gigs || a.skill.localeCompare(b.skill))
  return { activeGigs, totalRequirements, overallMatch: totalRequirements ? Math.round(matchedRequirements * 100 / totalRequirements) : 0,
    gapData: rows.filter(item => !item.covered), strengths: rows.filter(item => item.covered) }
}

function buildSkillHubResponse(student) {
  const today = dayKey()
  const log = skillLog(student)
  const skills = buildStudentSkillHubSkills(student)
  const dailyEvents = log.filter(item => item.earnedDay === today)
  const events = student.trustScoreState?.events || []
  const dailyPoints = events.filter(item => ['daily_challenge_solved', 'retention_task_completed'].includes(item.type) && item.referenceId === today)
    .reduce((sum, item) => sum + (Number(item.points) || 0), 0)
  return { skills, trustScore: student.trustScore, rewards: REWARDS, challenges: CHALLENGES,
    skillHubState: { skillLog: log, daily: { date: today, completedChallenges: dailyEvents.filter(item => item.eventType === 'challenge_completed').map(item => item.challengeId),
      completedRetention: dailyEvents.filter(item => item.eventType === 'retention_completed').map(item => item.skillName.toLowerCase()), points: dailyPoints },
      streaks: buildStreakSummary(skills, log, today), activityDays: buildActivityDays(log) } }
}

async function getStudentSkillHub(token) {
  const student = await findStudentByToken(token)
  await reconcileSkillExpiry(student)
  if (reconcileTrustScore(student)) await saveSkillStudent(student)
  const response = buildSkillHubResponse(student)
  const activeGigs = await Company.aggregate([
    { $unwind: '$gigManagementState.gigs' },
    { $match: {
      'gigManagementState.gigs.status': { $in: ['Hiring', 'Reviewing', 'In Progress'] },
      'gigManagementState.gigs.skills.0': { $exists: true },
    } },
    { $project: { _id: 0, gigManagementState: { gigs: ['$gigManagementState.gigs'] } } },
  ])
  response.skillHubState.skillGapReport = buildSkillGapReport(response.skills, activeGigs)
  return response
}

async function updateStudentSkillHub(token, payload) {
  const student = await findStudentByToken(token)
  await reconcileSkillExpiry(student)
  if (!Array.isArray(payload?.skills) || payload.skills.length > 100) throw buildAuthError('Provide up to 100 skills')
  const skills = buildStudentSkillHubSkills(student)
  const seen = new Set()
  for (const input of payload.skills) {
    if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) throw buildAuthError('Skill names must contain 1 to 100 characters')
    const name = input.name.trim()
    const key = name.toLowerCase()
    if (seen.has(key)) throw buildAuthError('Skill names must be unique')
    seen.add(key)
    if (input.category !== undefined && !CATEGORIES.includes(input.category)) throw buildAuthError('Choose a valid skill category')
    const previous = skills.find(skill => skill.name.toLowerCase() === key)
    if (previous) {
      if (input.category) previous.category = input.category
    } else {
      skills.push(sanitizeSkill({ name, category: input.category, createdOn: dayKey() }))
      appendLog(student, { eventType: 'created', skillName: name, occurredAt: new Date().toISOString(), points: 0 })
    }
  }
  if (skills.length > 100) throw buildAuthError('A maximum of 100 skills is allowed')
  // Omitted skills are preserved: stale profile tabs cannot erase reviewed records.
  student.skillHubSkills = skills
  student.skills = skills.map(skill => skill.name)
  await saveSkillStudent(student)
  return buildSkillHubResponse(student)
}

async function recordStudentSkillHubEvent(token) {
  await findStudentByToken(token)
  throw buildAuthError('Submit assessment evidence for review. Completion cannot be self-reported.', 403)
}

async function applyReviewedSkillAssessment(student, payload, session) {
  await reconcileSkillExpiry(student, session)
  const skills = buildStudentSkillHubSkills(student)
  const skill = skills.find(item => item.name.toLowerCase() === payload.skillName.toLowerCase())
  if (!skill) throw buildAuthError('A valid skill is required')
  const key = skill.name.toLowerCase()
  const today = dayKey()
  const earnedDay = payload.earnedDay || today
  const eventType = payload.eventType
  let result
  if (['verify_completed', 'reverify_completed'].includes(eventType)) {
    const oldExpiry = skill.renewalDue
    skill.verified = true
    skill.renewalStatus = 'valid'
    skill.verifiedAt = new Date().toISOString()
    skill.assessmentId = payload.assessmentId
    skill.renewalDue = new Date(Date.parse(today) + 365 * DAY_MS).toISOString().slice(0, 10)
    skill.lastEvent = eventType === 'verify_completed' ? 'verified' : 'renewed'
    result = recordTrustScoreEvent(student, eventType === 'verify_completed' ? 'skill_verified' : 'skill_reverified',
      eventType === 'verify_completed' ? key : `${key}:${oldExpiry}`)
  } else if (eventType === 'upgrade_completed') {
    skill.stage = payload.targetStage
    skill.level = 0
    skill.assessmentId = payload.assessmentId
    skill.lastEvent = 'upgraded'
    result = recordTrustScoreEvent(student, 'skill_level_upgraded', `${key}:${skill.stage}`)
  } else if (eventType === 'challenge_completed' || eventType === 'retention_completed') {
    if (eventType === 'retention_completed') {
      // Reviews can arrive out of order; derive the streak from approved submission days.
      const days = new Set(skillLog(student).filter(item => item.eventType === eventType && item.skillName.toLowerCase() === key && item.earnedDay).map(item => item.earnedDay))
      days.add(earnedDay)
      const runs = streakRuns([...days])
      skill.streak = runs.latest
      skill.longestStreak = Math.max(Number(skill.longestStreak) || 0, runs.longest)
      skill.lastRetentionDate = runs.lastDay
    }
    result = recordTrustScoreEvent(student, eventType === 'challenge_completed' ? 'daily_challenge_solved' : 'retention_task_completed', earnedDay)
  } else throw buildAuthError('Unsupported assessment event')
  const points = result.recorded ? result.event.points : 0
  appendLog(student, { eventType, skillName: skill.name, challengeId: payload.challengeId || null, earnedDay,
    occurredAt: new Date().toISOString(), assessmentId: payload.assessmentId, points })
  student.skillHubSkills = skills
  student.skills = skills.map(item => item.name)
  await saveSkillStudent(student, session)
  return points
}

module.exports = { applyReviewedSkillAssessment, buildActivityDays, buildStudentSkillHubSkills, buildSkillGapReport, buildStreakSummary, getStudentActivityHeatmap, normalizeHeatmapFilters, reconcileSkillExpiry, getStudentSkillHub, recordStudentSkillHubEvent, updateStudentSkillHub }
