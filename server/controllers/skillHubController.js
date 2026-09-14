const Student = require('../models/Student')
const { buildDefaultSkillHubSkills } = require('../config/skillHubDefaults')
const { buildDefaultSkillHubState } = require('../config/skillHubStateDefaults')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { mergeTemplateState } = require('../utils/templateState')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { recordTrustScoreEvent, recordTrustScoreEvents } = require('./trustScoreController')

async function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
}

function sanitizeSkill(skill) {
  return {
    name: typeof skill.name === 'string' ? skill.name : '',
    level: Number(skill.level) || 0,
    stage: typeof skill.stage === 'string' ? skill.stage : 'Beginner',
    category: typeof skill.category === 'string' ? skill.category : 'Frontend',
    verified: skill.verified === true,
    renewalStatus: typeof skill.renewalStatus === 'string' ? skill.renewalStatus : 'unverified',
    renewalDue: typeof skill.renewalDue === 'string' ? skill.renewalDue : '-',
    trustGain: Number(skill.trustGain) || 0,
    trustLoss: Number(skill.trustLoss) || 0,
    createdOn: typeof skill.createdOn === 'string' ? skill.createdOn : '',
    lastEvent: typeof skill.lastEvent === 'string' ? skill.lastEvent : 'created',
    streak: Number(skill.streak) || 0,
    missedDays: Number(skill.missedDays) || 0,
    wrongAnswers: Number(skill.wrongAnswers) || 0,
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function sanitizeSkillHubState(state) {
  const fallback = buildDefaultSkillHubState()
  const merged = mergeTemplateState(fallback, state)
  const daily = merged.daily?.date === todayKey() ? merged.daily : fallback.daily

  return {
    daily: {
      date: todayKey(),
      completedChallenges: Array.isArray(daily.completedChallenges) ? daily.completedChallenges.map(Number).filter(Number.isFinite) : [],
      completedRetention: Array.isArray(daily.completedRetention) ? daily.completedRetention.filter(item => typeof item === 'string') : [],
      wrongAnswers: daily.wrongAnswers && typeof daily.wrongAnswers === 'object' ? daily.wrongAnswers : {},
    },
    skillLog: Array.isArray(merged.skillLog) ? merged.skillLog : [],
    skillGapReport: merged.skillGapReport || fallback.skillGapReport,
  }
}

function buildSkillHubResponse(student) {
  return {
    skills: buildStudentSkillHubSkills(student),
    skillHubState: sanitizeSkillHubState(student.skillHubState),
  }
}

function syncProfileSkills(student) {
  const mergedSkills = buildStudentSkillHubSkills(student)
  student.skills = mergedSkills.map(skill => skill.name).filter(Boolean)
}

function buildStudentSkillHubSkills(student) {
  const defaults = buildDefaultSkillHubSkills().map(sanitizeSkill)
  const defaultNames = new Set(defaults.map(skill => skill.name.toLowerCase()))
  const storedSkills = Array.isArray(student.skillHubSkills) ? student.skillHubSkills.map(sanitizeSkill) : []
  const storedByName = new Map(storedSkills.map(skill => [skill.name.toLowerCase(), skill]))
  const mergedDefaults = defaults.map(skill => storedByName.has(skill.name.toLowerCase())
    ? { ...skill, ...storedByName.get(skill.name.toLowerCase()) }
    : skill)
  const addedSkills = storedSkills.filter(skill => skill.name && !defaultNames.has(skill.name.toLowerCase()))

  return [...mergedDefaults, ...addedSkills]
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function getStudentSkillHub(token) {
  const student = await findStudentByToken(token)
  const mergedSkills = buildStudentSkillHubSkills(student)
  student.skills = mergedSkills.map(skill => skill.name).filter(Boolean)
  student.skillHubState = sanitizeSkillHubState(student.skillHubState)
  await student.save()

  return buildSkillHubResponse(student)
}

async function updateStudentSkillHub(token, payload) {
  const student = await findStudentByToken(token)
  const defaults = buildDefaultSkillHubSkills().map(sanitizeSkill)
  const currentSkills = buildStudentSkillHubSkills(student)
  let nextSkills = currentSkills

  if (Array.isArray(payload.skills)) {
    const submittedSkills = payload.skills
      .map(sanitizeSkill)
      .filter(skill => skill.name)
    const submittedByName = new Map(submittedSkills.map(skill => [skill.name.toLowerCase(), skill]))
    const submittedDefaultNames = new Set(defaults.map(skill => skill.name.toLowerCase()))
    const submittedCustomSkills = submittedSkills.filter(skill => !submittedDefaultNames.has(skill.name.toLowerCase()))
    const mergedSubmittedDefaults = defaults.map(skill => submittedByName.has(skill.name.toLowerCase())
      ? { ...skill, ...submittedByName.get(skill.name.toLowerCase()) }
      : skill)

    nextSkills = [...mergedSubmittedDefaults, ...submittedCustomSkills]

    if (!sameJson(currentSkills, nextSkills)) {
      consumeSectionOperation(
        student,
        'skill-hub',
        'Skill Hub',
        Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
      )
    }

    student.skillHubSkills = nextSkills
  }

  const currentByName = new Map(currentSkills.map(skill => [skill.name.toLowerCase(), skill]))
  const stageRank = { Beginner: 1, Intermediate: 2, Pro: 3 }
  const trustEvents = []

  nextSkills.forEach(skill => {
    const previous = currentByName.get(skill.name.toLowerCase())
    const referenceId = skill.name.toLowerCase()

    if (!previous) {
      trustEvents.push({ type: 'new_skill_added', referenceId })
      return
    }

    if (!previous.verified && skill.verified) {
      trustEvents.push({ type: 'skill_verified', referenceId })
    }

    if ((stageRank[skill.stage] || 0) > (stageRank[previous.stage] || 0)) {
      trustEvents.push({ type: 'skill_level_upgraded', referenceId: `${referenceId}:${skill.stage}` })
    }

    if (previous.renewalStatus !== 'valid' && skill.renewalStatus === 'valid') {
      trustEvents.push({ type: 'skill_reverified', referenceId: `${referenceId}:${skill.renewalDue}` })
    }

    if (previous.renewalStatus !== 'expired' && skill.renewalStatus === 'expired') {
      trustEvents.push({ type: 'skill_expired', referenceId: `${referenceId}:${skill.renewalDue}` })
    }

    if (skill.missedDays > previous.missedDays) {
      trustEvents.push({ type: 'retention_task_missed', referenceId: `${referenceId}:${skill.missedDays}` })
    }
  })

  recordTrustScoreEvents(student, trustEvents)
  if (payload.skillHubState) {
    student.skillHubState = sanitizeSkillHubState(payload.skillHubState)
  }
  syncProfileSkills(student)
  await student.save()

  return buildSkillHubResponse(student)
}

async function recordStudentSkillHubEvent(token, payload) {
  const student = await findStudentByToken(token)
  const eventType = typeof payload?.eventType === 'string' ? payload.eventType.trim() : ''
  const state = sanitizeSkillHubState(student.skillHubState)
  const skills = buildStudentSkillHubSkills(student)
  const skillName = typeof payload?.skillName === 'string' ? payload.skillName.trim() : ''
  const skill = skillName
    ? skills.find(item => item.name.toLowerCase() === skillName.toLowerCase())
    : null
  const skillKey = skill?.name.toLowerCase() || skillName.toLowerCase()

  if (!['challenge_completed', 'retention_completed', 'retention_answer_wrong', 'retention_missed', 'verify_completed', 'upgrade_completed', 'reverify_completed'].includes(eventType)) {
    throw buildAuthError('A valid Skill Hub event is required')
  }

  if (eventType !== 'challenge_completed' && !skill) {
    throw buildAuthError('A valid skill is required')
  }

  if (eventType === 'challenge_completed') {
    const challengeId = Number(payload?.challengeId)
    if (!Number.isInteger(challengeId) || challengeId < 1 || challengeId > 8) {
      throw buildAuthError('A valid daily challenge is required')
    }

    if (!state.daily.completedChallenges.includes(challengeId)) {
      state.daily.completedChallenges.push(challengeId)
      recordTrustScoreEvent(student, 'daily_challenge_solved', `${state.daily.date}:${challengeId}`)
    }
  }

  if (eventType === 'retention_completed') {
    if (!skill.verified) {
      throw buildAuthError('Only verified skills have retention tasks')
    }

    if (!state.daily.completedRetention.includes(skillKey)) {
      state.daily.completedRetention.push(skillKey)
      skill.streak = (Number(skill.streak) || 0) + 1
      skill.missedDays = 0
      skill.lastEvent = 'retention_completed'
      recordTrustScoreEvent(student, 'retention_task_completed', `${state.daily.date}:${skillKey}`)
    }
  }

  if (eventType === 'retention_answer_wrong') {
    const nextWrongAnswers = (Number(state.daily.wrongAnswers[skillKey]) || 0) + 1
    state.daily.wrongAnswers[skillKey] = nextWrongAnswers
    skill.wrongAnswers = (Number(skill.wrongAnswers) || 0) + 1
    recordTrustScoreEvent(student, 'retention_answer_wrong', `${state.daily.date}:${skillKey}:${nextWrongAnswers}`)
  }

  if (eventType === 'retention_missed') {
    skill.missedDays = (Number(skill.missedDays) || 0) + 1
    skill.streak = 0
    recordTrustScoreEvent(student, 'retention_task_missed', `${state.daily.date}:${skillKey}`)
  }

  if (eventType === 'verify_completed') {
    skill.verified = true
    skill.renewalStatus = 'valid'
    skill.lastEvent = 'verified'
    if (!skill.renewalDue || skill.renewalDue === '-') {
      const renewalDate = new Date()
      renewalDate.setFullYear(renewalDate.getFullYear() + 1)
      skill.renewalDue = renewalDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }
    recordTrustScoreEvent(student, 'skill_verified', skillKey)
  }

  if (eventType === 'reverify_completed') {
    skill.verified = true
    skill.renewalStatus = 'valid'
    skill.lastEvent = 'renewed'
    recordTrustScoreEvent(student, 'skill_reverified', `${skillKey}:${skill.renewalDue}`)
  }

  if (eventType === 'upgrade_completed') {
    const targetStage = typeof payload?.targetStage === 'string' ? payload.targetStage.trim() : ''
    const allowedStages = new Set(['Beginner', 'Intermediate', 'Pro'])
    if (!allowedStages.has(targetStage)) {
      throw buildAuthError('A valid target skill level is required')
    }

    const levelByStage = { Beginner: 55, Intermediate: 70, Pro: 85 }
    skill.stage = targetStage
    skill.level = Math.max(Number(skill.level) || 0, levelByStage[targetStage])
    skill.lastEvent = 'upgraded'
    recordTrustScoreEvent(student, 'skill_level_upgraded', `${skillKey}:${targetStage}`)
  }

  student.skillHubSkills = skills
  student.skills = skills.map(item => item.name).filter(Boolean)
  student.skillHubState = {
    ...state,
    skillLog: [
      {
        eventType,
        skillName: skill?.name || '',
        challengeId: eventType === 'challenge_completed' ? Number(payload.challengeId) : null,
        occurredAt: new Date().toISOString(),
      },
      ...state.skillLog,
    ].slice(0, 50),
  }
  await student.save()

  return buildSkillHubResponse(student)
}

module.exports = {
  getStudentSkillHub,
  recordStudentSkillHubEvent,
  updateStudentSkillHub,
}
