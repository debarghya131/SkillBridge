const Student = require('../models/Student')
const { buildDefaultStudentProfile } = require('../config/studentDefaults')
const { createSessionToken, hashPassword, verifyPassword } = require('../utils/auth')
const {
  appendSession,
  buildAuthError,
  findModelByActiveToken,
  getSessionTtlMs,
} = require('../utils/session')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { recordTrustScoreEvents } = require('./trustScoreController')

function normalizeEmail(email) {
  return email?.trim().toLowerCase() || ''
}

function normalizePhone(phone) {
  return phone?.replace(/\D/g, '') || ''
}

function createTrustScore() {
  return Math.floor(Math.random() * 200) + 720
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function sanitizeStudent(student) {
  return {
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
    skills: Array.isArray(student.skills) ? student.skills : buildDefaultStudentProfile().skills,
    githubLink: Array.isArray(student.githubLink) ? student.githubLink : [],
    contactInfo: Array.isArray(student.contactInfo) ? student.contactInfo : [],
    projects: Array.isArray(student.projects) ? student.projects : buildDefaultStudentProfile().projects,
    videoUrl: student.videoUrl || null,
  }
}

async function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
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
    aadhaarNumber: verificationMethod === 'aadhaar' ? payload.aadhaarNumber.trim() : '',
    digilockerToken: verificationMethod === 'digilocker' ? payload.digilockerToken.trim() : '',
    trustScore: createTrustScore(),
    ...buildDefaultStudentProfile(),
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

  const student = await Student.findOne({
    $or: [
      ...(isEmail ? [{ email }] : []),
      ...(isPhone ? [{ phone }] : []),
    ],
  })

  if (!student || !verifyPassword(payload.password, student.passwordHash)) {
    throw buildAuthError('Invalid credentials', 401)
  }

  const token = createSessionToken()
  await appendSession(student, token, Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5)

  return {
    token,
    student: sanitizeStudent(student),
  }
}

async function getCurrentStudent(token) {
  const student = await findStudentByToken(token)
  return sanitizeStudent(student)
}

async function updateCurrentStudent(token, payload) {
  const student = await findStudentByToken(token)
  const updates = {}
  const previousSkills = Array.isArray(student.skills) ? student.skills : []
  const previousGithubLinks = Array.isArray(student.githubLink) ? student.githubLink : []
  const previousProjects = Array.isArray(student.projects) ? student.projects : []
  const previousVideoUrl = student.videoUrl

  if (typeof payload.name === 'string' && payload.name.trim()) {
    updates.name = payload.name.trim()
  }

  if (payload.avatar === null || typeof payload.avatar === 'string') {
    updates.avatar = payload.avatar
  }

  if (Array.isArray(payload.skills)) {
    updates.skills = payload.skills.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
  }

  if (Array.isArray(payload.githubLink)) {
    updates.githubLink = payload.githubLink
      .filter(item => item && typeof item.url === 'string' && item.url.trim())
      .map(item => ({
        icon: typeof item.icon === 'string' ? item.icon : '🐙',
        url: item.url.trim(),
        saved: item.saved !== false,
      }))
  }

  if (Array.isArray(payload.contactInfo)) {
    updates.contactInfo = payload.contactInfo
      .filter(item => item && typeof item.label === 'string' && typeof item.value === 'string' && item.value.trim())
      .map(item => ({
        label: item.label.trim(),
        value: item.value.trim(),
        saved: item.saved !== false,
      }))
  }

  if (Array.isArray(payload.projects)) {
    updates.projects = payload.projects.map(item => ({
      name: typeof item?.name === 'string' ? item.name : '',
      desc: typeof item?.desc === 'string' ? item.desc : '',
      link: typeof item?.link === 'string' ? item.link : '',
      demoLink: typeof item?.demoLink === 'string' ? item.demoLink : '',
      saved: item?.saved === true,
    }))
  }

  if (payload.videoUrl === null || typeof payload.videoUrl === 'string') {
    updates.videoUrl = payload.videoUrl
  }

  const nextStudentState = {
    name: Object.prototype.hasOwnProperty.call(updates, 'name') ? updates.name : student.name,
    avatar: Object.prototype.hasOwnProperty.call(updates, 'avatar') ? updates.avatar : student.avatar,
    skills: Object.prototype.hasOwnProperty.call(updates, 'skills') ? updates.skills : student.skills,
    githubLink: Object.prototype.hasOwnProperty.call(updates, 'githubLink') ? updates.githubLink : student.githubLink,
    contactInfo: Object.prototype.hasOwnProperty.call(updates, 'contactInfo') ? updates.contactInfo : student.contactInfo,
    projects: Object.prototype.hasOwnProperty.call(updates, 'projects') ? updates.projects : student.projects,
    videoUrl: Object.prototype.hasOwnProperty.call(updates, 'videoUrl') ? updates.videoUrl : student.videoUrl,
  }

  const currentStudentState = {
    name: student.name,
    avatar: student.avatar,
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
  const nextGithubLinks = Array.isArray(student.githubLink) ? student.githubLink : []
  const nextProjects = Array.isArray(student.projects) ? student.projects : []
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
  await student.save()

  return sanitizeStudent(student)
}

async function logoutCurrentStudent(token) {
  const student = await findStudentByToken(token)
  student.sessions = student.sessions.filter(session => session.token !== token)
  await student.save()
}

module.exports = {
  getCurrentStudent,
  logoutCurrentStudent,
  signInStudent,
  signUpStudent,
  updateCurrentStudent,
}
