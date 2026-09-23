const Student = require('../models/Student')
const Company = require('../models/Company')
const NetworkConnection = require('../models/NetworkConnection')
const SkillAssessment = require('../models/SkillAssessment')
const SkillRequest = require('../models/SkillRequest')
const TaskSubmission = require('../models/TaskSubmission')
const TeamPost = require('../models/TeamPost')
const { buildDefaultStudentProfile } = require('../config/studentDefaults')
const { buildDefaultSkillHubState } = require('../config/skillHubStateDefaults')
const { createSessionToken, hashPassword, verifyPassword } = require('../utils/auth')
const { hashVerificationReference } = require('../utils/verification')
const {
  appendSession,
  buildAuthError,
  findModelByActiveToken,
  getSessionTtlMs,
} = require('../utils/session')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { reconcileTrustScore, recordTrustScoreEvents } = require('./trustScoreController')
const { buildActivityDays, buildStudentSkillHubSkills, buildStreakSummary, reconcileSkillExpiry } = require('./skillHubController')

function normalizeEmail(email) {
  return email?.trim().toLowerCase() || ''
}

function normalizePhone(phone) {
  return phone?.replace(/\D/g, '') || ''
}

function createTrustScore() {
  return 0
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) return ''
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function safeMediaValue(value, kind, maxLength) {
  if (value === null) return null
  if (typeof value !== 'string' || value.length > maxLength) return undefined
  if (safeExternalUrl(value)) return value.trim()
  const type = kind === 'image' ? 'image\\/(jpeg|png|webp|gif)' : 'video\\/(mp4|webm)'
  return new RegExp(`^data:${type};base64,`, 'i').test(value) ? value : undefined
}

function sanitizeStudent(student, { includeVideo = true } = {}) {
  const skillHubSkills = buildStudentSkillHubSkills(student)
  const practiceSummary = buildStreakSummary(
    skillHubSkills,
    Array.isArray(student.skillHubState?.skillLog) ? student.skillHubState.skillLog : [],
  )
  const activityDays = buildActivityDays(Array.isArray(student.skillHubState?.skillLog) ? student.skillHubState.skillLog : [])

  const profile = {
    id: student._id.toString(),
    name: student.name,
    email: student.email || '',
    phone: student.phone || '',
    preferredLanguage: student.preferredLanguage || '',
    location: student.location || '',
    contactMethod: student.contactMethod,
    verificationMethod: student.verificationMethod,
    trustScore: student.trustScore,
    avatar: student.avatar || null,
    about: student.about || '',
    collaborationFocus: Array.isArray(student.collaborationFocus) ? student.collaborationFocus : [],
    workStyle: student.workStyle || '',
    skills: Array.isArray(student.skills) ? student.skills : buildDefaultStudentProfile().skills,
    skillHubSkills,
    practiceStats: {
      totalPracticeDays: practiceSummary.totalPracticeDays,
      overallCurrent: practiceSummary.overallCurrent,
      activityDays,
    },
    githubLink: Array.isArray(student.githubLink) ? student.githubLink : [],
    contactInfo: Array.isArray(student.contactInfo) ? student.contactInfo : [],
    projects: Array.isArray(student.projects) ? student.projects : buildDefaultStudentProfile().projects,
  }

  if (includeVideo) profile.videoUrl = student.videoUrl || null
  return profile
}

async function findStudentByToken(token, fields = '') {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), fields)
}

async function signUpStudent(payload) {
  const contactMethod = payload.contactMethod === 'phone' ? 'phone' : 'email'
  const verificationMethod = payload.idMethod === 'digilocker' ? 'digilocker' : 'aadhaar'
  const email = normalizeEmail(payload.email)
  const phone = normalizePhone(payload.phone)

  if (!payload.name?.trim()) throw buildAuthError('Full name is required')
  if (!payload.password || payload.password.length < 8) throw buildAuthError('Password must be at least 8 characters')
  if (contactMethod === 'email' && !email) throw buildAuthError('A valid email address is required')
  if (contactMethod === 'phone' && phone.length !== 10) throw buildAuthError('A valid 10-digit phone number is required')
  if (!payload.location?.trim()) throw buildAuthError('Location is required')
  if (!payload.language?.trim()) throw buildAuthError('Preferred language is required')
  if (verificationMethod === 'aadhaar' && !payload.aadhaarNumber?.trim()) throw buildAuthError('Aadhaar number is required')
  if (verificationMethod === 'digilocker' && !payload.digilockerToken?.trim()) throw buildAuthError('DigiLocker ID is required')

  const existingStudent = await Student.findOne({
    $or: [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone }] : []),
    ],
  })

  if (existingStudent) {
    throw buildAuthError('A student account with this contact already exists.', 409)
  }

  const student = await Student.create({
    name: payload.name.trim(),
    email: email || undefined,
    phone: phone || undefined,
    passwordHash: hashPassword(payload.password),
    preferredLanguage: payload.language.trim(),
    location: payload.location.trim(),
    contactMethod,
    verificationMethod,
    identityVerificationHash: hashVerificationReference(
      verificationMethod === 'aadhaar' ? payload.aadhaarNumber : payload.digilockerToken,
      'student-identity',
    ),
    trustScore: createTrustScore(),
    ...buildDefaultStudentProfile(),
    skillHubSkills: [],
    skillHubState: buildDefaultSkillHubState(),
  })

  const token = createSessionToken()
  await appendSession(student, token, Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5)

  return {
    token,
    student: sanitizeStudent(student),
  }
}

async function signInStudent(payload) {
  const contact = payload.contact?.trim() || ''

  if (!contact) throw buildAuthError('Email or phone is required')
  if (!payload.password) throw buildAuthError('Password is required')

  const email = normalizeEmail(contact)
  const phone = normalizePhone(contact)
  const isEmail = /\S+@\S+\.\S+/.test(contact)
  const isPhone = /^\d{10}$/.test(contact)

  if (!isEmail && !isPhone) {
    throw buildAuthError('Enter your registered email or 10-digit phone number')
  }

  const query = Student.findOne({
    $or: [
      ...(isEmail ? [{ email }] : []),
      ...(isPhone ? [{ phone }] : []),
    ],
  })
  const student = typeof query?.select === 'function'
    ? await query.select('+passwordHash +sessions')
    : await query

  if (!student || !verifyPassword(payload.password, student.passwordHash)) {
    throw buildAuthError('Invalid credentials', 401)
  }

  reconcileTrustScore(student)
  const token = createSessionToken()
  await appendSession(student, token, Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5)

  return {
    token,
    student: sanitizeStudent(student),
  }
}

async function getCurrentStudent(token, { workspace = false } = {}) {
  const fields = workspace ? '-videoUrl -gigState -networkState -earningState' : ''
  const student = await findStudentByToken(token, fields)
  await reconcileSkillExpiry(student)
  if (reconcileTrustScore(student)) await student.save()
  return sanitizeStudent(student, { includeVideo: !workspace })
}

async function getCurrentStudentProfileMedia(token) {
  const student = await findStudentByToken(token, '_id videoUrl')
  return { videoUrl: student.videoUrl || null }
}

async function updateCurrentStudent(token, payload) {
  const student = await findStudentByToken(token)
  const updates = {}
  const previousSkills = Array.isArray(student.skills) ? student.skills : []
  const previousGithubLinks = Array.isArray(student.githubLink)
    ? student.githubLink.filter(link => link?.saved !== false)
    : []
  const previousProjects = Array.isArray(student.projects)
    ? student.projects.filter(project => project?.saved === true)
    : []
  const previousVideoUrl = student.videoUrl

  if (typeof payload.name === 'string' && payload.name.trim()) {
    updates.name = payload.name.trim()
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
    const avatar = safeMediaValue(payload.avatar, 'image', 850000)
    if (avatar === undefined) throw buildAuthError('Use a JPG, PNG, WEBP, GIF, or HTTPS profile image under 600 KB')
    updates.avatar = avatar
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'about')) {
    if (typeof payload.about !== 'string') throw buildAuthError('About must be text')
    updates.about = payload.about.trim().slice(0, 700)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'collaborationFocus')) {
    if (!Array.isArray(payload.collaborationFocus)) throw buildAuthError('Collaboration focus must be a list')
    updates.collaborationFocus = [...new Set(payload.collaborationFocus.map(item => String(item || '').trim().slice(0, 60)).filter(Boolean))].slice(0, 10)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'workStyle')) {
    if (typeof payload.workStyle !== 'string') throw buildAuthError('Working style must be text')
    updates.workStyle = payload.workStyle.trim().slice(0, 300)
  }

  if (Array.isArray(payload.skills)) {
    // Skill Hub owns skill mutations; stale profile autosaves must not erase reviewed skills.
    updates.skills = buildStudentSkillHubSkills(student).map(skill => skill.name)
  }

  if (Array.isArray(payload.githubLink)) {
    if (payload.githubLink.length > 20) throw buildAuthError('A maximum of 20 profile links is allowed')
    updates.githubLink = payload.githubLink
      .filter(item => item && typeof item.url === 'string' && item.url.trim())
      .map(item => ({
        icon: typeof item.icon === 'string' ? item.icon.trim().slice(0, 24) || '🐙' : '🐙',
        url: safeExternalUrl(item.url),
        saved: item.saved !== false,
      })).filter(item => item.url)
  }

  if (Array.isArray(payload.contactInfo)) {
    if (payload.contactInfo.length > 20) throw buildAuthError('A maximum of 20 contact details is allowed')
    updates.contactInfo = payload.contactInfo
      .filter(item => item && typeof item.label === 'string' && typeof item.value === 'string' && item.value.trim())
      .map(item => ({
        label: item.label.trim().slice(0, 40),
        value: item.value.trim().slice(0, 300),
        saved: item.saved !== false,
      })).filter(item => item.label && item.value)
  }

  if (Array.isArray(payload.projects)) {
    if (payload.projects.length > 30) throw buildAuthError('A maximum of 30 projects is allowed')
    updates.projects = payload.projects.map(item => ({
      name: typeof item?.name === 'string' ? item.name.trim().slice(0, 120) : '',
      desc: typeof item?.desc === 'string' ? item.desc.trim().slice(0, 1000) : '',
      link: safeExternalUrl(item?.link),
      demoLink: safeExternalUrl(item?.demoLink),
      saved: item?.saved === true,
    }))
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'videoUrl')) {
    const videoUrl = safeMediaValue(payload.videoUrl, 'video', 7000000)
    if (videoUrl === undefined) throw buildAuthError('Use an MP4, WEBM, or HTTPS intro video under 5 MB')
    updates.videoUrl = videoUrl
  }

  const nextStudentState = {
    name: Object.prototype.hasOwnProperty.call(updates, 'name') ? updates.name : student.name,
    avatar: Object.prototype.hasOwnProperty.call(updates, 'avatar') ? updates.avatar : student.avatar,
    about: Object.prototype.hasOwnProperty.call(updates, 'about') ? updates.about : student.about,
    collaborationFocus: Object.prototype.hasOwnProperty.call(updates, 'collaborationFocus') ? updates.collaborationFocus : student.collaborationFocus,
    workStyle: Object.prototype.hasOwnProperty.call(updates, 'workStyle') ? updates.workStyle : student.workStyle,
    skills: Object.prototype.hasOwnProperty.call(updates, 'skills') ? updates.skills : student.skills,
    githubLink: Object.prototype.hasOwnProperty.call(updates, 'githubLink') ? updates.githubLink : student.githubLink,
    contactInfo: Object.prototype.hasOwnProperty.call(updates, 'contactInfo') ? updates.contactInfo : student.contactInfo,
    projects: Object.prototype.hasOwnProperty.call(updates, 'projects') ? updates.projects : student.projects,
    videoUrl: Object.prototype.hasOwnProperty.call(updates, 'videoUrl') ? updates.videoUrl : student.videoUrl,
  }

  const currentStudentState = {
    name: student.name,
    avatar: student.avatar,
    about: student.about,
    collaborationFocus: student.collaborationFocus,
    workStyle: student.workStyle,
    skills: student.skills,
    githubLink: student.githubLink,
    contactInfo: student.contactInfo,
    projects: student.projects,
    videoUrl: student.videoUrl,
  }

  if (!sameJson(currentStudentState, nextStudentState)) {
    consumeSectionOperation(
      student,
      'my-profile',
      'My Profile',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
  }

  Object.assign(student, updates)

  const nextSkills = Array.isArray(student.skills) ? student.skills : []
  // Only records that are explicitly saved are public profile evidence and
  // therefore eligible for TrustScore credit. The editor keeps draft records
  // in the same snapshot while a project is being completed.
  const nextGithubLinks = Array.isArray(student.githubLink)
    ? student.githubLink.filter(link => link?.saved !== false)
    : []
  const nextProjects = Array.isArray(student.projects)
    ? student.projects.filter(project => project?.saved === true)
    : []
  const previousSkillNames = new Set(previousSkills.map(skill => skill.toLowerCase()))
  const previousGithubUrls = new Set(previousGithubLinks.map(link => link.url).filter(Boolean))
  const previousProjectKeys = new Set(previousProjects.map(project => `${project.name || ''}:${project.link || project.demoLink || ''}`))
  const trustEvents = [
    ...nextSkills
      .filter(skill => !previousSkillNames.has(skill.toLowerCase()))
      .map(skill => ({ type: 'new_skill_added', referenceId: skill.toLowerCase() })),
    ...nextGithubLinks
      .map(link => link.url)
      .filter(url => url && !previousGithubUrls.has(url))
      .map(url => ({ type: 'profile_link_added', referenceId: url })),
    ...nextProjects
      .map(project => ({
        key: `${project.name || ''}:${project.link || project.demoLink || ''}`,
        hasProof: Boolean(project.link || project.demoLink),
      }))
      .filter(project => project.hasProof && !previousProjectKeys.has(project.key))
      .map(project => ({ type: 'project_uploaded', referenceId: project.key })),
  ]

  if (!previousVideoUrl && student.videoUrl) {
    trustEvents.push({ type: 'intro_video_uploaded', referenceId: 'profile-video' })
  }

  recordTrustScoreEvents(student, trustEvents)
  if (student.updatedAt) student.$where = { updatedAt: student.updatedAt }
  await student.save()

  // Profile media is loaded through the dedicated endpoint. Returning an
  // uploaded video after every small text edit can otherwise add several MB
  // to each autosave response.
  return sanitizeStudent(student, { includeVideo: false })
}

async function removeCompanyStudentReferences(studentId, submissionIds) {
  const studentKey = String(studentId)
  const submissionKeys = new Set(submissionIds.map(String))
  const companies = await Company.find({
    $or: [
      { 'gigManagementState.applicantsByGig': { $exists: true } },
      { taskReviewGuides: { $exists: true } },
      { 'projectWorkspaceState.projects': { $exists: true } },
    ],
  })
  for (const company of companies) {
    let changed = false
    const state = company.gigManagementState
    if (state?.applicantsByGig && typeof state.applicantsByGig === 'object') {
      for (const [gigId, applicants] of Object.entries(state.applicantsByGig)) {
        if (!Array.isArray(applicants)) continue
        const nextApplicants = applicants.filter(item => String(item?.studentId || item?.id || '') !== studentKey)
        if (nextApplicants.length === applicants.length) continue
        state.applicantsByGig[gigId] = nextApplicants
        const gig = Array.isArray(state.gigs) && state.gigs.find(item => Number(item.id) === Number(gigId))
        if (gig) gig.applicants = nextApplicants.length
        changed = true
      }
      if (changed) company.markModified('gigManagementState')
    }
    if (company.taskReviewGuides && typeof company.taskReviewGuides === 'object') {
      for (const key of Object.keys(company.taskReviewGuides)) {
        if (!key.startsWith(`${studentKey}:`)) continue
        delete company.taskReviewGuides[key]
        changed = true
      }
      if (changed) company.markModified('taskReviewGuides')
    }
    const projects = company.projectWorkspaceState?.projects
    if (Array.isArray(projects)) {
      const nextProjects = projects.filter(project => !submissionKeys.has(String(project?.submissionId || '')))
      if (nextProjects.length !== projects.length) {
        company.projectWorkspaceState.projects = nextProjects
        company.markModified('projectWorkspaceState')
        changed = true
      }
    }
    if (changed) await company.save()
  }
}

async function deleteCurrentStudentAccount(token, payload = {}) {
  const student = await findStudentByToken(token, '+passwordHash')
  if (payload.confirmation !== 'DELETE') throw buildAuthError('Type DELETE to confirm account deletion')
  if (typeof payload.password !== 'string' || !verifyPassword(payload.password, student.passwordHash)) {
    throw buildAuthError('Enter your current password to delete this account', 401)
  }
  const submissionRows = await TaskSubmission.find({ studentId: student._id }).select('_id').lean()
  const submissionIds = submissionRows.map(item => item._id)
  // Remove denormalized student snapshots before deleting the primary record.
  // This preserves other companies and collaborators while erasing this
  // student's data from their stored views.
  await removeCompanyStudentReferences(student._id, submissionIds)
  await Promise.all([
    NetworkConnection.deleteMany({ $or: [{ requester: student._id }, { recipient: student._id }] }),
    SkillAssessment.deleteMany({ studentId: student._id }),
    SkillRequest.deleteMany({ studentId: student._id }),
    TaskSubmission.deleteMany({ studentId: student._id }),
    TeamPost.deleteMany({ owner: student._id }),
    TeamPost.updateMany({ 'requests.student': student._id }, { $pull: { requests: { student: student._id } } }),
  ])
  await Student.deleteOne({ _id: student._id })
  return { deleted: true }
}

async function logoutCurrentStudent(token) {
  const student = await findStudentByToken(token)
  student.sessions = student.sessions.filter(session => session.token !== token)
  await student.save()
}

module.exports = {
  getCurrentStudent,
  getCurrentStudentProfileMedia,
  deleteCurrentStudentAccount,
  logoutCurrentStudent,
  signInStudent,
  signUpStudent,
  updateCurrentStudent,
}
