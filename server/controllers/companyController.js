const Company = require('../models/Company')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const { randomUUID } = require('node:crypto')
const { DEMO_COMPANY_PROFILES, DEMO_NETWORK_PEOPLE, DEMO_TALENT, demoCompanyGigState, demoNetworkProfile, demoTaskLibraryState, demoWorkspaceState } = require('../config/showcaseFixtures')
const {
  buildDefaultCompanyDashboardState,
  buildDefaultCompanyGigManagementState,
  buildDefaultCompanyPaymentState,
  buildDefaultCompanyProfile,
  buildDefaultCompanyWorkspaceState,
} = require('../config/companyDefaults')

// Reuse the complete Network showcase catalogue in company talent discovery so
// every demo identity has one consistent card, photo, and public profile.
const COMPANY_DEMO_TALENT = [...DEMO_TALENT, ...DEMO_NETWORK_PEOPLE]
const { buildDefaultCompanyTaskLibraryState } = require('../config/companyTaskDefaults')
const { createSessionToken, hashPassword, verifyPassword } = require('../utils/auth')
const { hashVerificationReference } = require('../utils/verification')
const {
  appendSession,
  buildAuthError,
  findModelByActiveToken,
  getSessionTtlMs,
} = require('../utils/session')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { clone, mergeTemplateState, reduceTemplateState } = require('../utils/templateState')

const { buildWorkspaceState } = require('../utils/companyWorkspace')
const { synchronizeCompanyGigMetrics } = require('../utils/companyGigMetrics')
const { validateAssignment } = require('../utils/taskValidation')
const { isDiscoverableVerifiedSkill, publishedSkillNames, activeStreak } = require('../utils/skillPolicy')
const { demoReadOnlyError } = require('../utils/demoProtection')

function normalizeEmail(email) {
  return email?.trim().toLowerCase() || ''
}

function normalizePhone(phone) {
  return phone?.replace(/\D/g, '') || ''
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeProfileText(value, fallback = '', maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback
}

const MAX_BUSINESS_LOGO_BYTES = 600 * 1024
const MAX_BUSINESS_LOGO_DATA_URL_LENGTH = 850000
const MAX_BUSINESS_VIDEO_BYTES = 5 * 1024 * 1024
const MAX_BUSINESS_VIDEO_DATA_URL_LENGTH = 7000000

function normalizeBusinessLogo(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value !== 'string') return ''
  const logo = value.trim()

  if (logo.length > 0 && logo.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(logo)) return logo

  const match = logo.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i)
  if (!match || logo.length > MAX_BUSINESS_LOGO_DATA_URL_LENGTH || match[2].length % 4 !== 0) return ''

  const bytes = Buffer.from(match[2], 'base64')
  const kind = match[1].toLowerCase()
  const isPng = kind === 'png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const isJpeg = kind === 'jpeg' && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  const isWebp = kind === 'webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'

  return bytes.length <= MAX_BUSINESS_LOGO_BYTES && (isPng || isJpeg || isWebp) ? logo : ''
}

function normalizeBusinessIntroVideo(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return null
  const video = value.trim()
  if (video.length > 0 && video.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(video)) return video
  const match = video.match(/^data:video\/(mp4|webm);base64,([A-Za-z0-9+/]+={0,2})$/i)
  if (!match || video.length > MAX_BUSINESS_VIDEO_DATA_URL_LENGTH || match[2].length % 4 !== 0) return null
  const bytes = Buffer.from(match[2], 'base64')
  const type = match[1].toLowerCase()
  const isMp4 = type === 'mp4' && bytes.subarray(4, 8).toString() === 'ftyp'
  const isWebm = type === 'webm' && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  return bytes.length <= MAX_BUSINESS_VIDEO_BYTES && (isMp4 || isWebm) ? video : null
}

function sanitizeCompanyProfile(profile, fallback) {
  return {
    businessName: normalizeProfileText(profile?.businessName, fallback.businessName, 120),
    location: normalizeProfileText(profile?.location, fallback.location, 120),
    logo: normalizeBusinessLogo(profile?.logo),
    introVideoUrl: normalizeBusinessIntroVideo(profile?.introVideoUrl),
    industry: normalizeProfileText(profile?.industry, '', 120),
    website: normalizeProfileText(profile?.website, '', 240),
    teamSize: normalizeProfileText(profile?.teamSize, '', 80),
    workModes: Array.isArray(profile?.workModes)
      ? [...new Set(profile.workModes.filter(item => ['Remote', 'Hybrid', 'On-site'].includes(item)))]
      : [],
    description: normalizeProfileText(profile?.description, '', 1200),
    hiringCategories: normalizeProfileText(profile?.hiringCategories, '', 300),
    requiredSkills: normalizeProfileText(profile?.requiredSkills, '', 1000),
    contactEmail: normalizeProfileText(profile?.contactEmail, '', 160).toLowerCase(),
    contactPhone: normalizeProfileText(profile?.contactPhone, '', 40),
  }
}

function validateCompanyProfile(profile, fallback) {
  if (Object.hasOwn(profile || {}, 'logo') && profile.logo && !normalizeBusinessLogo(profile.logo)) {
    throw buildAuthError('Business logo must be a PNG, JPG, or WEBP image up to 600 KB, or a valid http(s) URL')
  }
  if (Object.hasOwn(profile || {}, 'introVideoUrl') && profile.introVideoUrl && !normalizeBusinessIntroVideo(profile.introVideoUrl)) {
    throw buildAuthError('Business intro video must be an MP4 or WEBM video up to 5 MB, or a valid http(s) URL')
  }
  const normalizedProfile = sanitizeCompanyProfile(profile, fallback)
  const phoneDigits = normalizedProfile.contactPhone.replace(/\D/g, '')

  if (!normalizedProfile.businessName) {
    throw buildAuthError('Business name is required')
  }

  if (!normalizedProfile.location) {
    throw buildAuthError('Primary location is required')
  }

  if (normalizedProfile.website && !/^https?:\/\/[^\s]+$/i.test(normalizedProfile.website)) {
    throw buildAuthError('Website must start with http:// or https://')
  }

  if (normalizedProfile.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedProfile.contactEmail)) {
    throw buildAuthError('Enter a valid contact email address')
  }

  if (normalizedProfile.contactPhone && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
    throw buildAuthError('Contact phone must contain 10 to 15 digits')
  }

  return normalizedProfile
}

function sanitizeDashboardState(state) {
  const fallback = buildDefaultCompanyDashboardState()
  const mergedState = mergeTemplateState(fallback, state)

  return {
    stats: Array.isArray(mergedState?.stats) ? clone(mergedState.stats) : fallback.stats,
    matchedStudents: Number(mergedState?.matchedStudents) || fallback.matchedStudents,
    recentHiringActivity: Array.isArray(mergedState?.recentHiringActivity)
      ? clone(mergedState.recentHiringActivity)
      : fallback.recentHiringActivity,
  }
}

function buildCompanyDashboardOverview(company, { talentCount = 0, submissions = [] } = {}) {
  const realGigManagementState = sanitizeGigManagementState(company.gigManagementState)
  const gigManagementState = realGigManagementState
  const businessProfile = sanitizeCompanyProfile(company.businessProfile, buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  }))
  const activeGigCount = gigManagementState.gigs.filter(gig => (
    ['active', 'in progress', 'hiring', 'reviewing'].includes(String(gig.status).toLowerCase())
  )).length
  const applicationCount = gigManagementState.gigs.reduce((total, gig) => total + (Number(gig.applicants) || 0), 0)
  const matchedStudents = talentCount
  const statusLabels = {
    submitted: 'submitted an interview task for',
    reviewed: 'had their interview task reviewed for',
    ready_to_hire: 'is ready to hire for',
    selected: 'was selected for', work_started: 'started work on', delivered: 'delivered work for',
    approved: 'had work approved for', completed: 'completed', rejected: 'was not selected for',
    needs_revision: 'was asked to revise their task for',
  }
  const recentHiringActivity = submissions.length > 0
    ? submissions.slice(0, 3).map(submission => ({
      name: submission.studentName,
      status: `${statusLabels[submission.status] || 'updated their application for'} ${submission.gigTitle}`,
      when: submission.updatedAt || submission.submittedAt || null,
      color: submission.status === 'ready_to_hire' ? '#065F46' : submission.status === 'needs_revision' ? '#92400E' : '#1D4ED8',
      bg: submission.status === 'ready_to_hire' ? '#D1FAE5' : submission.status === 'needs_revision' ? '#FEF3C7' : '#DBEAFE',
    }))
    : []
  const checklist = [
    { label: 'Business name and location', done: Boolean(businessProfile.businessName && businessProfile.location) },
    { label: 'Industry, website, and team size', done: Boolean(businessProfile.industry && businessProfile.website && businessProfile.teamSize) },
    { label: 'Work mode and hiring categories', done: Boolean(businessProfile.workModes.length > 0 && businessProfile.hiringCategories) },
    { label: 'Company description and required skills', done: Boolean(businessProfile.description && businessProfile.requiredSkills) },
    { label: 'Contact details for applicants', done: Boolean(businessProfile.contactEmail && businessProfile.contactPhone) },
  ]
  const needsInterviewReview = submission => submission.status === 'submitted'
    || (submission.status === 'needs_revision' && submission.revisionReturnStatus !== 'delivered')
  const isSelected = submission => ['selected', 'work_started', 'delivered', 'approved', 'completed'].includes(submission.status)
    || (submission.status === 'needs_revision' && submission.revisionReturnStatus === 'delivered')
  const isActiveWork = submission => ['selected', 'work_started', 'delivered', 'approved'].includes(submission.status)
    || (submission.status === 'needs_revision' && submission.revisionReturnStatus === 'delivered')
  const pipeline = {
    applications: applicationCount,
    interviewTasks: submissions.length,
    awaitingDecision: submissions.filter(submission => (
      needsInterviewReview(submission) || ['reviewed', 'ready_to_hire'].includes(submission.status)
    )).length,
    selected: submissions.filter(isSelected).length,
  }
  const operations = {
    openGigs: activeGigCount,
    applications: applicationCount,
    talentAvailable: matchedStudents,
    reviewsDue: submissions.filter(needsInterviewReview).length,
    deliveriesDue: submissions.filter(submission => submission.status === 'delivered').length,
    activeWork: submissions.filter(isActiveWork).length,
    awaitingPayment: submissions.filter(submission => submission.status === 'approved' && !submission.externalPayment).length,
    completedWork: submissions.filter(submission => submission.status === 'completed' || Boolean(submission.externalPayment)).length,
    pipeline,
  }

  return {
    stats: [
      { label: 'Active GIGs', value: String(activeGigCount), icon: '📋', target: 'gig' },
      { label: 'Applications', value: String(applicationCount), icon: '📥', target: 'gig' },
      { label: 'Total Talent', value: String(matchedStudents), icon: '👥', target: 'talent' },
    ],
    matchedStudents,
    profileCompletion: Math.round((checklist.filter(item => item.done).length / checklist.length) * 100),
    checklist,
    recentHiringActivity,
    operations,
  }
}

function sanitizeGigManagementState(state) {
  const fallback = buildDefaultCompanyGigManagementState()
  const mergedState = mergeTemplateState(fallback, state)

  return {
    stats: Array.isArray(mergedState?.stats) ? clone(mergedState.stats) : fallback.stats,
    gigs: Array.isArray(mergedState?.gigs) ? clone(mergedState.gigs) : fallback.gigs,
    pipeline: Array.isArray(mergedState?.pipeline) ? clone(mergedState.pipeline) : fallback.pipeline,
    recentActivity: Array.isArray(mergedState?.recentActivity) ? clone(mergedState.recentActivity) : fallback.recentActivity,
    applicantsByGig: mergedState?.applicantsByGig && typeof mergedState.applicantsByGig === 'object'
      ? clone(mergedState.applicantsByGig)
      : fallback.applicantsByGig,
  }
}

const GIG_STATUS_VALUES = new Set(['Hiring', 'Reviewing', 'In Progress', 'Closed'])
const GIG_MODE_VALUES = new Set(['Remote', 'Hybrid', 'On-site'])
const GIG_TYPE_VALUES = new Set(['Internship', 'Project GIG'])
const OPEN_GIG_STATUSES = new Set(['Hiring', 'Reviewing', 'In Progress'])
const COMPANY_TASK_TYPE_VALUES = new Set(['live_project', 'code', 'mcq', 'written', 'mixed', 'design', 'data_analysis', 'case_study', 'research', 'presentation'])
const COMPANY_TASK_DETAIL_KEYS = new Set([
  'deliverables', 'acceptanceCriteria', 'submissionRequirements', 'language', 'testCases',
  'questionCount', 'questions', 'options', 'answerKey', 'optionsAndAnswers', 'passingScore', 'wordLimit', 'evaluationCriteria', 'components',
])

function sanitizeCompanyTaskDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {}
  return Object.fromEntries(Object.entries(details)
    .filter(([key, value]) => COMPANY_TASK_DETAIL_KEYS.has(key) && (typeof value === 'string' || typeof value === 'number'))
    .map(([key, value]) => [key, String(value).trim().slice(0, 2000)])
    .filter(([, value]) => value))
}

function normalizeGigBudget(value, type) {
  const amount = Number(String(value || '').replace(/[^0-9]/g, ''))

  if (!Number.isInteger(amount) || amount < 100 || amount > 10000000) {
    throw buildAuthError('GIG budget must be a whole number between ₹100 and ₹1,00,00,000')
  }

  const period = type === 'Project GIG' ? 'project' : 'month'
  return `₹${amount.toLocaleString('en-IN')} / ${period}`
}

function normalizeGigPayload(payload, existing = {}) {
  const title = typeof payload?.title === 'string' ? payload.title.trim() : existing.title || ''
  const rawBudget = typeof payload?.budget === 'string' || typeof payload?.budget === 'number' ? payload.budget : existing.budget || ''
  const mode = typeof payload?.mode === 'string' ? payload.mode.trim() : existing.mode || 'Remote'
  const location = typeof payload?.location === 'string' ? payload.location.trim() : existing.location || ''
  const type = typeof payload?.type === 'string' ? payload.type.trim() : existing.type || 'Internship'
  const status = typeof payload?.status === 'string' ? payload.status.trim() : existing.status || 'Hiring'
  const rawSkills = Array.isArray(payload?.skills) ? payload.skills : existing.skills
  const skills = Array.isArray(rawSkills)
    ? [...new Set(rawSkills
      .filter(skill => typeof skill === 'string' && skill.trim().length >= 2 && skill.trim().length <= 60)
      .map(skill => skill.trim()))].slice(0, 8)
    : []

  if (title.length < 4 || title.length > 120) {
    throw buildAuthError('GIG title must be between 4 and 120 characters')
  }

  if (!GIG_MODE_VALUES.has(mode)) {
    throw buildAuthError('A valid GIG work mode is required')
  }

  if (location.length < 3 || location.length > 120) {
    throw buildAuthError('GIG location must be between 3 and 120 characters')
  }

  if (!GIG_TYPE_VALUES.has(type)) {
    throw buildAuthError('A valid GIG type is required')
  }

  const budget = normalizeGigBudget(rawBudget, type)

  if (!GIG_STATUS_VALUES.has(status)) {
    throw buildAuthError('A valid GIG status is required')
  }

  if (skills.length === 0) {
    throw buildAuthError('Add at least one skill tag of 2 to 60 characters')
  }

  return { title, mode, location, type, budget, status, skills }
}

function updateGigStat(state, label, delta) {
  state.stats = state.stats.map(item => item.label === label
    ? { ...item, value: String(Math.max(0, (Number(item.value) || 0) + delta)) }
    : item)
}

function buildCreatedGigState(currentState, payload) {
  const nextState = sanitizeGigManagementState(currentState)
  const gigPayload = normalizeGigPayload(payload)
  const titleKey = gigPayload.title.toLowerCase()

  if (nextState.gigs.some(gig => String(gig.title).trim().toLowerCase() === titleKey)) {
    throw buildAuthError('A GIG with this title already exists')
  }

  const nextId = nextState.gigs.reduce((highest, gig) => Math.max(highest, Number(gig.id) || 0), 0) + 1
  const newGig = {
    id: nextId,
    publicId: randomUUID(),
    ...gigPayload,
    applicants: 0,
    shortlisted: 0,
    interviewTasks: 0,
    postedOn: 'Posted just now',
  }

  nextState.gigs = [newGig, ...nextState.gigs]
  nextState.applicantsByGig = { ...nextState.applicantsByGig, [nextId]: [] }
  updateGigStat(nextState, 'Open GIGs', 1)
  nextState.recentActivity = [`New GIG created for ${newGig.title}.`, ...nextState.recentActivity].slice(0, 8)

  return nextState
}

function buildUpdatedGigState(currentState, gigId, payload) {
  const nextState = sanitizeGigManagementState(currentState)
  const numericGigId = Number(gigId)
  const index = nextState.gigs.findIndex(gig => Number(gig.id) === numericGigId)

  if (index === -1) {
    throw buildAuthError('GIG not found', 404)
  }

  const existingGig = nextState.gigs[index]
  const gigPayload = normalizeGigPayload(payload, existingGig)
  const titleKey = gigPayload.title.toLowerCase()

  if (nextState.gigs.some((gig, itemIndex) => itemIndex !== index && String(gig.title).trim().toLowerCase() === titleKey)) {
    throw buildAuthError('A GIG with this title already exists')
  }

  const wasOpen = OPEN_GIG_STATUSES.has(existingGig.status)
  const isOpen = OPEN_GIG_STATUSES.has(gigPayload.status)
  nextState.gigs[index] = { ...existingGig, ...gigPayload }

  if (wasOpen !== isOpen) {
    updateGigStat(nextState, 'Open GIGs', isOpen ? 1 : -1)
  }

  nextState.recentActivity = [`${gigPayload.title} was updated by your team.`, ...nextState.recentActivity].slice(0, 8)
  return nextState
}

function buildDeletedGigState(currentState, gigId) {
  const nextState = sanitizeGigManagementState(currentState)
  const numericGigId = Number(gigId)
  const gig = nextState.gigs.find(item => Number(item.id) === numericGigId)

  if (!gig) {
    throw buildAuthError('GIG not found', 404)
  }

  nextState.gigs = nextState.gigs.filter(item => Number(item.id) !== numericGigId)
  nextState.applicantsByGig = Object.fromEntries(
    Object.entries(nextState.applicantsByGig || {}).filter(([id]) => Number(id) !== numericGigId),
  )

  if (OPEN_GIG_STATUSES.has(gig.status)) {
    updateGigStat(nextState, 'Open GIGs', -1)
  }

  nextState.recentActivity = [`${gig.title} was deleted by your team.`, ...nextState.recentActivity].slice(0, 8)
  return nextState
}

function sanitizeProjectWorkspaceState(state) {
  const fallback = buildDefaultCompanyWorkspaceState()
  const mergedState = mergeTemplateState(fallback, state)

  return {
    projects: Array.isArray(mergedState?.projects)
      ? mergedState.projects.map((project, index) => sanitizeWorkspaceProject(project, index))
      : fallback.projects.map((project, index) => sanitizeWorkspaceProject(project, index)),
    selectedProjectId: typeof mergedState?.selectedProjectId === 'string' ? mergedState.selectedProjectId : fallback.selectedProjectId,
    statusFilter: ['All', 'Planning', 'In Progress', 'Review', 'Approved', 'Completed'].includes(mergedState?.statusFilter)
      ? mergedState.statusFilter
      : fallback.statusFilter,
  }
}

async function syncWorkspaceWithSelectedSubmissions(company) {
  const query = TaskSubmission.find({ companyId: company._id })
  const compactQuery = typeof query.select === 'function'
    ? query.select('_id studentId studentAvatar companyGigId companyGigPublicId gigTitle companyName status revisionReturnStatus completedAt reviewedAt updatedAt submittedAt taskTitle studentName submissionLink submissionContent feedback externalPayment')
    : query
  const sortedQuery = compactQuery.sort({ updatedAt: -1 })
  const submissions = typeof sortedQuery.lean === 'function'
    ? await sortedQuery.lean()
    : await sortedQuery
  const state = sanitizeGigManagementState(company.gigManagementState)
  company.projectWorkspaceState = buildWorkspaceState(company.projectWorkspaceState, submissions, state.gigs)
  synchronizeCompanyGigMetrics(state, submissions)
  company.gigManagementState = state
  return company
}

const WORKSPACE_PROJECT_STATUSES = new Set(['Planning', 'In Progress', 'Review', 'Approved', 'Completed'])
const WORKSPACE_TASK_STATES = new Set(['Todo', 'In Review', 'Done'])

function sanitizeWorkspaceProject(project, index = 0) {
  const source = project && typeof project === 'object' ? project : {}
  const tasks = Array.isArray(source.tasks)
    ? source.tasks.slice(0, 50).map((task, taskIndex) => ({
      name: typeof task?.name === 'string' && task.name.trim() ? task.name.trim().slice(0, 160) : `Task ${taskIndex + 1}`,
      owner: typeof task?.owner === 'string' ? task.owner.trim().slice(0, 100) : 'Unassigned',
      state: WORKSPACE_TASK_STATES.has(task?.state) ? task.state : 'Todo',
    }))
    : []
  const updates = Array.isArray(source.updates)
    ? source.updates.map((update, updateIndex) => ({
      id: typeof update?.id === 'string' ? update.id : `update-${updateIndex + 1}`,
      message: typeof update?.message === 'string' ? update.message.trim().slice(0, 500) : '',
      sharedAt: typeof update?.sharedAt === 'string' ? update.sharedAt : null,
    })).filter(update => update.message)
    : []
  const milestones = Array.isArray(source.milestones)
    ? source.milestones.map((milestone, milestoneIndex) => ({
      id: typeof milestone?.id === 'string' ? milestone.id : `milestone-${milestoneIndex + 1}`,
      title: typeof milestone?.title === 'string' ? milestone.title.trim().slice(0, 120) : '',
      dueDate: typeof milestone?.dueDate === 'string' ? milestone.dueDate.trim().slice(0, 80) : '',
      status: milestone?.status === 'Completed' ? 'Completed' : 'Open',
      createdAt: typeof milestone?.createdAt === 'string' ? milestone.createdAt : null,
    })).filter(milestone => milestone.title)
    : []

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id.trim().slice(0, 80) : `p${index + 1}`,
    submissionId: typeof source.submissionId === 'string' ? source.submissionId : '',
    studentId: typeof source.studentId === 'string' ? source.studentId.trim().slice(0, 80) : '',
    studentAvatar: typeof source.studentAvatar === 'string' ? source.studentAvatar.trim().slice(0, 2000) : '',
    submissionStatus: source.submissionStatus || '',
    submissionLink: source.submissionLink || '',
    submissionContent: source.submissionContent || '',
    feedback: source.feedback || '',
    paymentStatus: source.paymentStatus || '',
    companyGigId: source.companyGigId,
    companyGigPublicId: source.companyGigPublicId || '',
    title: typeof source.title === 'string' ? source.title.trim().slice(0, 160) : 'Untitled Project',
    company: typeof source.company === 'string' ? source.company.trim().slice(0, 160) : '',
    status: WORKSPACE_PROJECT_STATUSES.has(source.status) ? source.status : 'Planning',
    deadline: typeof source.deadline === 'string' ? source.deadline.trim().slice(0, 80) : '',
    progress: Math.max(0, Math.min(100, Number(source.progress) || 0)),
    team: Array.isArray(source.team)
      ? source.team.filter(member => typeof member === 'string' && member.trim()).map(member => member.trim().slice(0, 100)).slice(0, 20)
      : [],
    tasks,
    updates,
    milestones,
  }
}

function findWorkspaceProject(state, projectId) {
  const index = state.projects.findIndex(project => project.id === String(projectId))
  if (index === -1) {
    throw buildAuthError('Project not found', 404)
  }

  return index
}

function buildWorkspaceUpdateState(currentState, projectId, message, sharedAt = new Date()) {
  const nextState = sanitizeProjectWorkspaceState(currentState)
  const normalizedMessage = typeof message === 'string' ? message.trim() : ''

  if (!normalizedMessage || normalizedMessage.length > 500) {
    throw buildAuthError('An update message is required and must be 500 characters or fewer')
  }

  const projectIndex = findWorkspaceProject(nextState, projectId)
  const project = nextState.projects[projectIndex]
  if (project.updates.length >= 1000) throw buildAuthError('Project update limit reached', 409)
  const update = {
    id: `update-${randomUUID()}`,
    message: normalizedMessage,
    sharedAt: sharedAt instanceof Date ? sharedAt.toISOString() : new Date().toISOString(),
  }

  nextState.projects[projectIndex] = {
    ...project,
    updates: [...project.updates, update],
  }
  nextState.selectedProjectId = project.id
  return nextState
}

function buildWorkspaceMilestoneState(currentState, projectId, payload, createdAt = new Date()) {
  const nextState = sanitizeProjectWorkspaceState(currentState)
  const projectIndex = findWorkspaceProject(nextState, projectId)
  const project = nextState.projects[projectIndex]
  if (payload?.id) {
    const milestone = project.milestones.find(item => item.id === payload.id)
    if (!milestone) throw buildAuthError('Milestone not found', 404)
    if (!['Open', 'Completed'].includes(payload.status)) throw buildAuthError('Invalid milestone status')
    milestone.status = payload.status
    nextState.selectedProjectId = project.id
    return nextState
  }
  const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
  const dueDate = typeof payload?.dueDate === 'string' ? payload.dueDate.trim() : ''

  if (!title || title.length > 120) {
    throw buildAuthError('A milestone title is required and must be 120 characters or fewer')
  }

  if (project.milestones.length >= 100) throw buildAuthError('Project milestone limit reached', 409)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
    || !Number.isFinite(Date.parse(`${dueDate}T00:00:00Z`))
    || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate) {
    throw buildAuthError('A valid milestone date in YYYY-MM-DD format is required')
  }

  const milestone = {
    id: `milestone-${randomUUID()}`,
    title,
    dueDate,
    status: 'Open',
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date().toISOString(),
  }

  nextState.projects[projectIndex] = {
    ...project,
    milestones: [...project.milestones, milestone],
    deadline: [dueDate, project.deadline].filter(Boolean).sort().at(-1),
  }
  nextState.selectedProjectId = project.id
  return nextState
}

function sanitizePaymentState(state) {
  return buildDefaultCompanyPaymentState()
}

function buildSkillsByLevel(skillHubSkills, fallbackSkills) {
  const groupedSkills = {
    Beginner: [],
    Intermediate: [],
    Pro: [],
    'Pro Mastery': [],
  }

  if (Array.isArray(skillHubSkills)) {
    skillHubSkills.forEach(skill => {
      if (!skill || typeof skill.name !== 'string' || !skill.name.trim() || !isDiscoverableVerifiedSkill(skill)) {
        return
      }

      const stage = ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'].includes(skill.stage) ? skill.stage : 'Intermediate'
      if (!groupedSkills[stage].includes(skill.name)) {
        groupedSkills[stage].push(skill.name)
      }
    })
  }

  fallbackSkills.forEach(skill => {
    if (!groupedSkills.Intermediate.includes(skill) && !groupedSkills.Beginner.includes(skill) && !groupedSkills.Pro.includes(skill) && !groupedSkills['Pro Mastery'].includes(skill)) {
      groupedSkills.Beginner.push(skill)
    }
  })

  return groupedSkills
}

function sanitizeTalentProfile(student) {
  const profileSkills = publishedSkillNames(student.skills, student.skillHubSkills)
  const verifiedSkillHubSkills = Array.isArray(student.skillHubSkills)
    ? student.skillHubSkills
      .filter(skill => skill && typeof skill.name === 'string' && skill.name.trim() && isDiscoverableVerifiedSkill(skill))
      .map(skill => skill.name.trim())
    : []
  const skills = [...new Set([
    ...profileSkills,
    ...verifiedSkillHubSkills,
  ].filter(skill => typeof skill === 'string' && skill.trim()))]
  const savedProjects = Array.isArray(student.projects)
    ? student.projects
      .filter(project => project?.saved !== false && (project.name || project.desc))
      .map(project => ({
        name: project.name || 'Student Project',
        desc: project.desc || '',
        link: project.link || '',
        demoLink: project.demoLink || '',
      }))
    : []

  const skillsByLevel = buildSkillsByLevel(student.skillHubSkills, skills)
  const skillHubByName = new Map(
    (Array.isArray(student.skillHubSkills) ? student.skillHubSkills : [])
      .filter(skill => skill && typeof skill.name === 'string' && skill.name.trim())
      .map(skill => [skill.name.trim().toLowerCase(), skill]),
  )
  const skillDetails = skills.map(name => {
    const skillHubEntry = skillHubByName.get(name.toLowerCase())
    const verified = Boolean(skillHubEntry && isDiscoverableVerifiedSkill(skillHubEntry))
    const level = verified && ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'].includes(skillHubEntry.stage)
      ? skillHubEntry.stage
      : null

    return {
      name,
      verified,
      level,
      streak: verified ? activeStreak(skillHubEntry) : 0,
    }
  })

  return {
    id: student._id.toString(),
    name: student.name,
    avatar: student.avatar || null,
    // Only publish verification types, never identity/contact credentials.
    contactMethod: student.contactMethod === 'phone' ? 'phone' : 'email',
    verificationMethod: student.verificationMethod === 'digilocker' ? 'digilocker' : 'aadhaar',
    college: '',
    verifiedSkills: verifiedSkillHubSkills,
    location: student.location || 'Location not added',
    skills,
    skillDetails,
    profileSkills: profileSkills.filter(skill => typeof skill === 'string' && skill.trim()),
    skillsByLevel,
    profileSkillsByLevel: buildSkillsByLevel(student.skillHubSkills, profileSkills),
    streak: Math.max(0, ...skillDetails.map(skill => skill.streak)),
    score: require('./trustScoreController').calculateTrustScore(student),
    projects: savedProjects.length,
    github: Array.isArray(student.githubLink)
      ? (student.githubLink.find(link => link?.saved !== false && typeof link.url === 'string' && link.url.trim())?.url || '')
      : '',
    contactInfo: Array.isArray(student.contactInfo)
      ? clone(student.contactInfo.filter(item => item?.saved !== false && item.label && item.value))
      : [],
    preferredLanguage: normalizeProfileText(student.preferredLanguage, '', 80),
    savedProjects,
    videoUrl: student.videoUrl || null,
  }
}

function normalizeTalentSearchFilters(filters = {}) {
  const minTrustScore = Number.parseInt(filters.minTrustScore, 10)
  const page = Number.parseInt(filters.page, 10)
  const pageSize = Number.parseInt(filters.pageSize, 10)
  const location = typeof filters.location === 'string' ? filters.location.trim().slice(0, 80) : ''
  const skill = typeof filters.skill === 'string' ? filters.skill.trim().slice(0, 80) : ''
  const query = typeof filters.query === 'string' ? filters.query.trim().slice(0, 80) : ''
  const level = ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'].includes(filters.level) ? filters.level : 'All'

  return {
    minTrustScore: Number.isFinite(minTrustScore) ? Math.max(0, Math.min(1000, minTrustScore)) : 0,
    location: location === 'All' ? '' : location,
    skill: skill === 'All' ? '' : skill,
    query,
    level,
    page: Number.isFinite(page) ? Math.max(1, Math.min(1000, page)) : 1,
    pageSize: Number.isFinite(pageSize) ? Math.max(1, Math.min(50, pageSize)) : 50,
  }
}

function normalizeTalentValue(value) {
  return String(value || '').trim().toLowerCase()
}

function parseRequiredSkills(requiredSkills) {
  return [...new Set(String(requiredSkills || '')
    .split(/[,;\n]+/)
    .map(skill => skill.trim())
    .filter(Boolean))]
}

function enrichTalentProfile(profile, requiredSkills) {
  const profileSkillMap = new Map(profile.skills.map(skill => [normalizeTalentValue(skill), skill]))
  const matchedSkills = requiredSkills
    .map(skill => profileSkillMap.get(normalizeTalentValue(skill)))
    .filter(Boolean)

  return {
    ...profile,
    matchedSkills,
    matchScore: requiredSkills.length > 0
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : 0,
  }
}

function compareTalentProfiles(left, right) {
  return right.matchScore - left.matchScore
    || right.score - left.score
    || left.name.localeCompare(right.name)
}

function matchesTalentProfile(profile, normalizedFilters) {
  const locationPass = !normalizedFilters.location
    || normalizeTalentValue(profile.location) === normalizeTalentValue(normalizedFilters.location)
    || normalizeTalentValue(profile.location).startsWith(`${normalizeTalentValue(normalizedFilters.location)},`)
  const skillPass = !normalizedFilters.skill
    || profile.skills.some(skill => normalizeTalentValue(skill) === normalizeTalentValue(normalizedFilters.skill))
    || Object.values(profile.skillsByLevel || {}).some(skills => skills.some(skill => normalizeTalentValue(skill) === normalizeTalentValue(normalizedFilters.skill)))
  const levelPass = normalizedFilters.level === 'All'
    || (profile.skillsByLevel?.[normalizedFilters.level] || []).length > 0
  const queryPass = !normalizedFilters.query
    || normalizeTalentValue(profile.name).includes(normalizeTalentValue(normalizedFilters.query))

  return profile.score >= normalizedFilters.minTrustScore && locationPass && skillPass && levelPass && queryPass
}

function buildTalentSearchResult(profiles, filters = {}, requiredSkills = '') {
  const normalizedFilters = normalizeTalentSearchFilters(filters)
  const requiredSkillList = parseRequiredSkills(requiredSkills)
  const filteredProfiles = profiles
    .filter(profile => matchesTalentProfile(profile, normalizedFilters))
    .map(profile => enrichTalentProfile(profile, requiredSkillList))
    .sort(compareTalentProfiles)

  const start = (normalizedFilters.page - 1) * normalizedFilters.pageSize
  return {
    talentProfiles: filteredProfiles.slice(start, start + normalizedFilters.pageSize),
    total: filteredProfiles.length,
    page: normalizedFilters.page,
    pageSize: normalizedFilters.pageSize,
  }
}

function sanitizeCompany(company, { includeIntroVideo = true } = {}) {
  const fallbackProfile = buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  })
  const businessProfile = sanitizeCompanyProfile(company.businessProfile, fallbackProfile)
  if (!includeIntroVideo) delete businessProfile.introVideoUrl
  const dashboardState = sanitizeDashboardState(company.dashboardState)
  const gigManagementState = sanitizeGigManagementState(company.gigManagementState)
  const projectWorkspaceState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
  const taskLibraryState = sanitizeTaskLibraryState(company.taskLibraryState)
  const paymentState = sanitizePaymentState(company.paymentState)

  return {
    id: company._id.toString(),
    businessName: company.businessName,
    email: company.email || '',
    phone: company.phone || '',
    location: company.location || '',
    contactMethod: company.contactMethod,
    verificationMethod: company.verificationMethod,
    businessProfile,
    dashboardState,
    gigManagementState,
    projectWorkspaceState,
    taskLibraryState,
    paymentState,
  }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function withDemoGigState(realState) {
  const demo = demoCompanyGigState()
  return {
    ...realState,
    // Company totals always describe MongoDB-backed company activity. The
    // read-only examples below must never inflate a fresh company's metrics.
    stats: realState.stats,
    gigs: [...realState.gigs, ...demo.gigs],
    pipeline: realState.pipeline,
    recentActivity: [...realState.recentActivity, ...demo.recentActivity].slice(0, 8),
    applicantsByGig: { ...demo.applicantsByGig, ...realState.applicantsByGig },
    demoProfiles: Object.fromEntries(COMPANY_DEMO_TALENT.map(person => [
      person.id,
      demoNetworkProfile({ ...person, relationship: { status: 'connected' } }),
    ])),
  }
}

function withDemoWorkspace(realState) {
  const demo = demoWorkspaceState()
  return {
    ...realState,
    projects: [...realState.projects, ...demo.projects],
    selectedProjectId: realState.selectedProjectId || demo.selectedProjectId,
  }
}

function withDemoTaskLibraryState(realState) {
  return { ...realState, tasks: [...realState.tasks, ...demoTaskLibraryState().tasks] }
}

function sanitizeTaskLibraryState(state) {
  const fallback = buildDefaultCompanyTaskLibraryState()
  const tasks = Array.isArray(state?.tasks)
    ? state.tasks.slice(0, 100).map((task, index) => ({
      id: String(task?.id || `task-${index + 1}`),
      type: COMPANY_TASK_TYPE_VALUES.has(task?.type) ? task.type : 'mixed',
      title: normalizeProfileText(task?.title, '', 160),
      instructions: normalizeProfileText(task?.instructions, '', 4000),
      details: sanitizeCompanyTaskDetails(task?.details),
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(task?.deadline || '') ? task.deadline : '',
      points: Math.min(100, Math.max(1, Number(task?.points) || 1)),
      skills: Array.isArray(task?.skills)
        ? task.skills.filter(skill => typeof skill === 'string' && skill.trim()).slice(0, 20).map(skill => skill.trim().slice(0, 60))
        : [],
      createdAt: task?.createdAt || new Date().toISOString(),
      updatedAt: task?.updatedAt || task?.createdAt || new Date().toISOString(),
    })).filter(task => task.title && task.instructions)
    : fallback.tasks

  return { tasks, revision: Number(state?.revision) || 0 }
}

async function findCompanyByToken(token, fields = '') {
  return findModelByActiveToken(Company, token, 'Company', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), fields)
}

async function signUpCompany(payload) {
  const contactMethod = payload.contactMethod === 'phone' ? 'phone' : 'email'
  const verificationMethod = payload.verificationMethod === 'udyam' ? 'udyam' : 'gstin'
  const email = normalizeEmail(payload.email)
  const phone = normalizePhone(payload.phone)

  if (!payload.companyName?.trim()) throw buildAuthError('Company name is required')
  if (!payload.password || payload.password.length < 8) throw buildAuthError('Password must be at least 8 characters')
  if (contactMethod === 'email' && !email) throw buildAuthError('A valid email address is required')
  if (contactMethod === 'phone' && phone.length !== 10) throw buildAuthError('A valid 10-digit phone number is required')
  if (!payload.location?.trim()) throw buildAuthError('Location is required')
  if (verificationMethod === 'gstin' && !payload.gstin?.trim()) throw buildAuthError('GSTIN is required')
  if (verificationMethod === 'udyam' && !payload.businessDoc?.trim()) throw buildAuthError('Business registration number is required')

  const existingCompany = await Company.findOne({
    $or: [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone }] : []),
    ],
  })

  if (existingCompany) {
    throw buildAuthError('A company account with this contact already exists.', 409)
  }

  const businessName = payload.companyName.trim()
  const location = payload.location.trim()

  const company = await Company.create({
    businessName,
    email: email || undefined,
    phone: phone || undefined,
    passwordHash: hashPassword(payload.password),
    contactMethod,
    verificationMethod,
    verificationReferenceHash: hashVerificationReference(
      verificationMethod === 'gstin' ? payload.gstin : payload.businessDoc,
      'company-registration',
    ),
    location,
    businessProfile: buildDefaultCompanyProfile({ businessName, location }),
  })

  const token = createSessionToken()
  await appendSession(company, token, Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5)

  return {
    token,
    company: sanitizeCompany(company, { includeIntroVideo: false }),
  }
}

async function signInCompany(payload) {
  const contact = payload.contact?.trim() || ''

  if (!contact) throw buildAuthError('Email or phone is required')
  if (!payload.password) throw buildAuthError('Password is required')

  const email = normalizeEmail(contact)
  const phone = normalizePhone(contact)
  const query = Company.findOne({
    $or: [
      { email },
      { phone },
    ],
  })
  const company = typeof query?.select === 'function'
    ? await query.select('+passwordHash +sessions -businessProfile.introVideoUrl')
    : await query

  if (!company || !verifyPassword(payload.password, company.passwordHash)) {
    throw buildAuthError('Invalid credentials', 401)
  }

  const token = createSessionToken()
  await appendSession(company, token, Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5)

  return {
    token,
    company: sanitizeCompany(company, { includeIntroVideo: false }),
  }
}

async function getCurrentCompany(token) {
  const company = await syncWorkspaceWithSelectedSubmissions(await findCompanyByToken(token, '-businessProfile.introVideoUrl'))
  return sanitizeCompany(company, { includeIntroVideo: false })
}

async function getCurrentCompanyProfileMedia(token) {
  const company = await findCompanyByToken(token, '_id businessProfile.introVideoUrl')
  return { introVideoUrl: company.businessProfile?.introVideoUrl || null }
}

async function getCurrentCompanyTaskLibraryState(token) {
  const company = await findCompanyByToken(token)
  const real = sanitizeTaskLibraryState(company.taskLibraryState)
  return withDemoTaskLibraryState(real)
}

async function updateCurrentCompanyTaskLibraryState(token, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeTaskLibraryState(company.taskLibraryState)
  const requestedAllTasks = payload?.taskLibraryState?.tasks
  const demoTasks = demoTaskLibraryState().tasks
  if (Array.isArray(requestedAllTasks)) {
    const demoChanged = demoTasks.some(demo => {
      const requested = requestedAllTasks.find(item => String(item?.id) === demo.id)
      return requested && !sameJson(sanitizeTaskLibraryState({ tasks: [requested] }).tasks[0], sanitizeTaskLibraryState({ tasks: [demo] }).tasks[0])
    })
    if (demoChanged) throw demoReadOnlyError()
  }
  const realPayload = { ...payload?.taskLibraryState, tasks: Array.isArray(requestedAllTasks) ? requestedAllTasks.filter(item => item?.demoData !== true && !String(item?.id || '').startsWith('demo-')) : requestedAllTasks }
  const nextState = sanitizeTaskLibraryState(realPayload)

  const requestedTasks = realPayload.tasks
  if (!Array.isArray(requestedTasks) || requestedTasks.length > 100 || requestedTasks.length !== nextState.tasks.length
    || new Set(nextState.tasks.map(task => task.id)).size !== nextState.tasks.length) throw buildAuthError('Provide up to 100 complete tasks with unique IDs')
  for (const task of requestedTasks) {
    const previous = currentState.tasks.find(item => item.id === task?.id)
    if (!previous || !sameJson(previous, task)) validateAssignment(task)
  }
  for (const task of nextState.tasks) {
    const date = new Date(task.deadline)
    if (!task.deadline || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== task.deadline) throw buildAuthError('Each task needs a valid deadline')
  }
  if (Number(payload.revision) !== (Number(company.taskLibraryState?.revision) || 0)) throw buildAuthError('The task library changed in another tab. Refresh before saving.', 409)
  const filter = { _id: company._id }
  filter['taskLibraryState.revision'] = company.taskLibraryState?.revision == null ? { $exists: false } : company.taskLibraryState.revision
  const saved = await Company.findOneAndUpdate(filter, { $set: { taskLibraryState: { ...nextState, revision: (company.taskLibraryState?.revision || 0) + 1 } } }, { returnDocument: 'after' })
  if (!saved) throw buildAuthError('The task library changed. Refresh before saving.', 409)
  company.taskLibraryState = saved.taskLibraryState
  return sanitizeTaskLibraryState(company.taskLibraryState)
}

async function getCurrentCompanyDashboard(token) {
  const company = await findCompanyByToken(token)
  const [talentCount, submissions] = await Promise.all([
    Student.countDocuments(),
    TaskSubmission.find({ companyId: company._id })
      .select('studentName gigTitle status revisionReturnStatus externalPayment updatedAt submittedAt')
      .sort({ updatedAt: -1, submittedAt: -1 })
      .lean(),
  ])

  return buildCompanyDashboardOverview(company, { talentCount, submissions })
}

async function updateCurrentCompany(token, payload) {
  const company = await findCompanyByToken(token)
  const fallbackProfile = buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  })
  const sectionLimit = Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2

  if (payload.businessProfile) {
    const currentBusinessProfile = sanitizeCompanyProfile(company.businessProfile, fallbackProfile)
    const businessProfile = validateCompanyProfile({ ...currentBusinessProfile, ...payload.businessProfile }, fallbackProfile)

    if (!sameJson(currentBusinessProfile, businessProfile)) {
      consumeSectionOperation(company, 'setup-business-profile', 'Setup Business Profile', sectionLimit)
    }

    company.businessProfile = businessProfile

    if (businessProfile.businessName.trim()) {
      company.businessName = businessProfile.businessName.trim()
    }

    company.location = businessProfile.location.trim()
  }

  if (['dashboardState', 'gigManagementState', 'projectWorkspaceState', 'paymentState'].some(key => payload[key] !== undefined)) {
    throw buildAuthError('Use the section action to update workspace records', 400)
  }

  await company.save()

  const savedCompany = sanitizeCompany(company, { includeIntroVideo: false })
  return {
    id: savedCompany.id,
    businessName: savedCompany.businessName,
    location: savedCompany.location,
    contactMethod: savedCompany.contactMethod,
    verificationMethod: savedCompany.verificationMethod,
    businessProfile: savedCompany.businessProfile,
  }
}

async function logoutCurrentCompany(token) {
  const company = await findCompanyByToken(token)
  company.sessions = company.sessions.filter(session => session.token !== token)
  await company.save()
}

async function getCurrentCompanyGigManagementState(token) {
  const company = await syncWorkspaceWithSelectedSubmissions(await findCompanyByToken(token))
  return withDemoGigState(sanitizeGigManagementState(company.gigManagementState))
}

async function getCompanyGigApplicants(token, gigId) {
  const company = await findCompanyByToken(token)
  const state = withDemoGigState(sanitizeGigManagementState(company.gigManagementState))
  const gigIndex = state.gigs.findIndex(item => Number(item.id) === Number(gigId))
  const gig = gigIndex === -1 ? null : state.gigs[gigIndex]
  if (!gig) throw buildAuthError('GIG not found', 404)
  if (gig.demoData) return state.applicantsByGig[gig.id] || []

  if (!gig.publicId && typeof company.save === 'function') {
    gig.publicId = randomUUID()
    state.gigs[gigIndex] = gig
    company.gigManagementState = reduceTemplateState(state, buildDefaultCompanyGigManagementState())
    await company.save()
  }

  const applicants = state.applicantsByGig[gig.id] || []
  const submissionQuery = {
    companyId: company._id,
    companyGigId: Number(gig.id),
  }
  if (gig.publicId) {
    submissionQuery.companyGigPublicId = gig.publicId
  }
  const submissions = await TaskSubmission.find(submissionQuery)
    .select('studentId').lean()
  const studentIds = [...new Set([
    ...applicants.map(item => String(item.studentId || item.id || '')),
    ...submissions.map(item => String(item.studentId)),
  ])].filter(id => /^[a-f0-9]{24}$/i.test(id))
  const inviteMatch = {
    companyId: company._id,
    companyGigId: Number(gig.id),
  }
  if (gig.publicId) inviteMatch.companyGigPublicId = gig.publicId
  const students = await Student.find({
    $or: [
      { _id: { $in: studentIds } },
      { 'gigState.opportunities': { $elemMatch: inviteMatch } },
    ],
  })
    // Applicant cards only need compact identity and opportunity fields. Full
    // projects, links, contact data and video load after View Profile is used.
    .select('name avatar location skills skillHubSkills skillHubState.streaks trustScore trustScoreState.events.key trustScoreState.events.type trustScoreState.events.referenceId trustScoreState.events.occurredAt preferredLanguage gigState.opportunities').lean()

  return students.map(student => {
    const profile = sanitizeTalentProfile(student)
    const skills = profile.profileSkills
    const opportunity = (Array.isArray(student.gigState?.opportunities) ? student.gigState.opportunities : [])
      .find(item => (
        String(item.companyId || '') === String(company._id)
        && (gig.publicId
          ? String(item.companyGigPublicId || '') === String(gig.publicId)
          : Number(item.companyGigId) === Number(gig.id))
      ))
    return {
      ...profile,
      studentId: profile.id,
      isLiveProfile: true,
      pipelineSource: applicants.some(item => String(item.studentId || item.id || '') === String(student._id))
        ? 'application'
        : 'direct_invite',
      skills,
      skillsByLevel: Object.fromEntries(Object.entries(profile.skillsByLevel)
        .map(([level, entries]) => [level, entries.filter(skill => skills.includes(skill))])),
      profileSkillsByLevel: Object.fromEntries(Object.entries(profile.skillsByLevel)
        .map(([level, entries]) => [level, entries.filter(skill => skills.includes(skill))])),
      companyGigPublicId: gig.publicId || '',
      interviewTaskSent: Boolean(opportunity),
      interviewMessage: opportunity?.message || '',
      taskTitle: opportunity?.taskTitle || '',
      taskType: ['live_project', 'code', 'mcq', 'written', 'mixed', 'design', 'data_analysis', 'case_study', 'research', 'presentation'].includes(opportunity?.taskType) ? opportunity.taskType : 'mixed',
      taskDetails: opportunity?.taskDetails && typeof opportunity.taskDetails === 'object' ? opportunity.taskDetails : {},
      taskInstructions: opportunity?.taskInstructions || '',
      taskDeadline: opportunity?.taskDeadline || '',
      taskPoints: Number(opportunity?.taskPoints) || 0,
    }
  })
}

async function createCompanyGig(token, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeGigManagementState(company.gigManagementState)
  const nextState = buildCreatedGigState(currentState, payload?.gig || payload)

  consumeSectionOperation(
    company,
    'gig-management',
    'GIG Management',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  company.gigManagementState = reduceTemplateState(nextState, buildDefaultCompanyGigManagementState())
  await company.save()
  return nextState
}

async function updateCompanyGig(token, gigId, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeGigManagementState(company.gigManagementState)
  const nextState = buildUpdatedGigState(currentState, gigId, payload?.gig || payload)

  consumeSectionOperation(
    company,
    'gig-management',
    'GIG Management',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  company.gigManagementState = reduceTemplateState(nextState, buildDefaultCompanyGigManagementState())
  await company.save()
  return nextState
}

async function deleteCompanyGig(token, gigId) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeGigManagementState(company.gigManagementState)
  if (await TaskSubmission.exists({ companyId: company._id, companyGigId: Number(gigId) })) {
    throw buildAuthError('This GIG has submissions. Close it to preserve its work and payment history.', 409)
  }
  const nextState = buildDeletedGigState(currentState, gigId)

  consumeSectionOperation(
    company,
    'gig-management',
    'GIG Management',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  company.gigManagementState = reduceTemplateState(nextState, buildDefaultCompanyGigManagementState())
  await company.save()
  return nextState
}

async function getCurrentCompanyProjectWorkspaceState(token) {
  const company = await syncWorkspaceWithSelectedSubmissions(await findCompanyByToken(token))
  return withDemoWorkspace(sanitizeProjectWorkspaceState(company.projectWorkspaceState))
}

async function shareCompanyWorkspaceUpdate(token, projectId, payload) {
  const company = await findCompanyByToken(token)
  const previous = company.projectWorkspaceState
  await syncWorkspaceWithSelectedSubmissions(company)
  const currentState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
  const nextState = buildWorkspaceUpdateState(currentState, projectId, payload?.message)

  await persistWorkspace(company._id, previous, nextState)
  return nextState
}

async function setCompanyWorkspaceMilestone(token, projectId, payload) {
  const company = await findCompanyByToken(token)
  const previous = company.projectWorkspaceState
  await syncWorkspaceWithSelectedSubmissions(company)
  const currentState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
  const nextState = buildWorkspaceMilestoneState(currentState, projectId, payload)

  await persistWorkspace(company._id, previous, nextState)
  return nextState
}

async function persistWorkspace(companyId, previous, nextState) {
  const result = await Company.updateOne({
    _id: companyId,
    projectWorkspaceState: previous === undefined ? { $exists: false } : previous,
  }, { $set: { projectWorkspaceState: nextState } })
  if (!result.matchedCount) throw buildAuthError('Workspace changed. Refresh before trying again.', 409)
}

async function getCompanyTalentProfiles(token, filters = {}) {
  const company = await findCompanyByToken(token)
  const normalizedFilters = normalizeTalentSearchFilters(filters)
  const query = {}

  // Apply score filtering after policy calculation; stored scores may use an older policy.

  if (normalizedFilters.location) {
    query.location = new RegExp(`^${escapeRegExp(normalizedFilters.location)}(?:,|$)`, 'i')
  }

  if (normalizedFilters.skill) {
    query.$or = [
      { skills: new RegExp(`^${escapeRegExp(normalizedFilters.skill)}$`, 'i') },
      { 'skillHubSkills.name': new RegExp(`^${escapeRegExp(normalizedFilters.skill)}$`, 'i') },
    ]
  }

  if (normalizedFilters.query) {
    query.name = new RegExp(escapeRegExp(normalizedFilters.query), 'i')
  }

  const fallbackProfile = buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  })
  const businessProfile = sanitizeCompanyProfile(company.businessProfile, fallbackProfile)
  const availableLocationsRequest = Student.distinct('location')
  const requiredSkills = parseRequiredSkills(businessProfile.requiredSkills)
  const demoCandidates = COMPANY_DEMO_TALENT
    .map(person => ({
      ...person,
      avatar: demoNetworkProfile(person).avatar,
      score: Math.max(0, Number(person.trustScore) || 0),
      projects: Array.isArray(person.projects) ? person.projects.length : Math.max(0, Number(person.projects) || 0),
    }))
    .filter(profile => matchesTalentProfile(profile, normalizedFilters))
    .map(profile => enrichTalentProfile(profile, requiredSkills))
    .sort(compareTalentProfiles)
  const start = (normalizedFilters.page - 1) * normalizedFilters.pageSize
  const end = start + normalizedFilters.pageSize
  const topCandidates = []
  const availableSkillNames = new Set()
  let total = 0

  // Stream candidates in TrustScore order. This preserves accurate totals and pages without a
  // hidden result cap or loading the entire talent directory into application memory.
  // Talent cards do not need private contact details, profile video, or full project payloads.
  // Avoiding those fields prevents a single uploaded video from being read for every candidate.
  const cursor = Student.find(query)
    .select('_id name avatar location skills skillHubSkills trustScore trustScoreState.events.key trustScoreState.events.type trustScoreState.events.referenceId trustScoreState.events.occurredAt projects.name projects.desc projects.saved createdAt')
    .sort({ trustScore: -1, createdAt: -1 })
    .lean()
    .cursor()
  for await (const student of cursor) {
    const profile = sanitizeTalentProfile(student)
    profile.skills.forEach(skill => availableSkillNames.add(skill))
    if (!matchesTalentProfile(profile, normalizedFilters)) continue

    const candidate = enrichTalentProfile(profile, requiredSkills)
    if (topCandidates.length < end || compareTalentProfiles(candidate, topCandidates[topCandidates.length - 1]) < 0) {
      topCandidates.push(candidate)
      topCandidates.sort(compareTalentProfiles)
      if (topCandidates.length > end) topCandidates.pop()
    }
    total += 1
  }
  const availableLocations = await availableLocationsRequest

  return {
    talentProfiles: normalizedFilters.page === 1
      ? [...topCandidates.slice(start, end), ...demoCandidates].slice(0, normalizedFilters.pageSize)
      : topCandidates.slice(start, end),
    // Pagination and production counts are based only on persisted students.
    // Demo previews are reported separately and never inflate database totals.
    total,
    realTotal: total,
    demoTotal: demoCandidates.length,
    page: normalizedFilters.page,
    pageSize: normalizedFilters.pageSize,
    availableLocations: [...new Set([
      ...availableLocations.filter(location => typeof location === 'string' && location.trim()),
      ...COMPANY_DEMO_TALENT.map(person => person.location).filter(Boolean),
    ])].sort(),
    availableSkills: [...new Set([
      ...availableSkillNames,
      ...COMPANY_DEMO_TALENT.flatMap(person => person.skills || []),
    ])].sort(),
  }
}

async function getPublicCompanyProfile(companyName) {
  const normalizedName = typeof companyName === 'string' ? companyName.trim() : ''
  if (!normalizedName) {
    throw buildAuthError('Company name is required')
  }

  const demoProfile = DEMO_COMPANY_PROFILES.find(profile => profile.businessName.toLowerCase() === normalizedName.toLowerCase())
  if (demoProfile) return clone(demoProfile)

  const company = await Company.findOne(/^[a-f0-9]{24}$/i.test(normalizedName)
    ? { _id: normalizedName }
    : { businessName: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i') })

  if (!company) {
    throw buildAuthError('Company profile not found', 404)
  }

  const fallbackProfile = buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  })
  const profile = sanitizeCompanyProfile(company.businessProfile, fallbackProfile)

  return {
    businessName: company.businessName,
    location: profile.location,
    logo: profile.logo,
    introVideoUrl: profile.introVideoUrl,
    industry: profile.industry,
    website: profile.website,
    teamSize: profile.teamSize,
    workModes: profile.workModes,
    description: profile.description,
    hiringCategories: profile.hiringCategories,
    requiredSkills: profile.requiredSkills,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    // Public proof only: these are method names, not registration or document values.
    contactMethod: company.contactMethod === 'phone' ? 'phone' : 'email',
    verificationMethod: company.verificationMethod === 'udyam' ? 'udyam' : 'gstin',
  }
}

module.exports = {
  async getCompanyStudentProfile(token, studentId) {
    await findCompanyByToken(token)
    const demoProfile = COMPANY_DEMO_TALENT.find(item => item.id === studentId)
    if (demoProfile) return clone(demoNetworkProfile({ ...demoProfile, relationship: { status: 'connected' } }))
    if (!/^[a-f0-9]{24}$/i.test(studentId)) throw buildAuthError('Invalid student ID', 400)
    const query = Student.findById(studentId)
    const compactQuery = typeof query.select === 'function'
      ? query.select('_id name avatar trustScore trustScoreState location contactMethod verificationMethod about collaborationFocus workStyle skills skillHubSkills skillHubState.skillLog projects githubLink videoUrl contactInfo gigState')
      : query
    const student = await compactQuery.lean()
    if (!student) throw buildAuthError('Student profile not found', 404)
    return require('../utils/publicStudentProfile').publicStudentProfile(student, true)
  },
  getCompanyGigApplicants,
  buildCreatedGigState,
  buildCompanyDashboardOverview,
  buildTalentSearchResult,
  buildWorkspaceMilestoneState,
  buildWorkspaceUpdateState,
  buildUpdatedGigState,
  buildDeletedGigState,
  createCompanyGig,
  deleteCompanyGig,
  getCurrentCompany,
  getCurrentCompanyProfileMedia,
  getCurrentCompanyTaskLibraryState,
  getCurrentCompanyDashboard,
  getCurrentCompanyGigManagementState,
  getCurrentCompanyProjectWorkspaceState,
  getCompanyTalentProfiles,
  getPublicCompanyProfile,
  normalizeTalentSearchFilters,
  sanitizeCompanyProfile,
  sanitizeTalentProfile,
  sanitizeTaskLibraryState,
  validateCompanyProfile,
  withDemoGigState,
  withDemoTaskLibraryState,
  withDemoWorkspace,
  logoutCurrentCompany,
  signInCompany,
  signUpCompany,
  updateCurrentCompany,
  updateCurrentCompanyTaskLibraryState,
  updateCompanyGig,
  setCompanyWorkspaceMilestone,
  shareCompanyWorkspaceUpdate,
}
