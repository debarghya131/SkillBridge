const Company = require('../models/Company')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const {
  buildDefaultCompanyDashboardState,
  buildDefaultCompanyGigManagementState,
  buildDefaultCompanyPaymentState,
  buildDefaultCompanyProfile,
  buildDefaultCompanyWorkspaceState,
} = require('../config/companyDefaults')
const { createSessionToken, hashPassword, verifyPassword } = require('../utils/auth')
const {
  appendSession,
  buildAuthError,
  findModelByActiveToken,
  getSessionTtlMs,
} = require('../utils/session')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { clone, mergeTemplateState, reduceTemplateState } = require('../utils/templateState')

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

function sanitizeCompanyProfile(profile, fallback) {
  return {
    businessName: normalizeProfileText(profile?.businessName, fallback.businessName, 120),
    location: normalizeProfileText(profile?.location, fallback.location, 120),
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
  const dashboardState = sanitizeDashboardState(company.dashboardState)
  const gigManagementState = sanitizeGigManagementState(company.gigManagementState)
  const businessProfile = sanitizeCompanyProfile(company.businessProfile, buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  }))
  const activeGigCount = gigManagementState.gigs.filter(gig => (
    ['active', 'in progress', 'hiring', 'reviewing'].includes(String(gig.status).toLowerCase())
  )).length
  const applicationCount = gigManagementState.gigs.reduce((total, gig) => total + (Number(gig.applicants) || 0), 0)
  const matchedStudents = talentCount > 0 ? talentCount : dashboardState.matchedStudents
  const statusLabels = {
    submitted: 'submitted an interview task for',
    reviewed: 'had their interview task reviewed for',
    ready_to_hire: 'is ready to hire for',
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
    : dashboardState.recentHiringActivity
  const checklist = [
    { label: 'Business name and location', done: Boolean(businessProfile.businessName && businessProfile.location) },
    { label: 'Industry, website, and team size', done: Boolean(businessProfile.industry && businessProfile.website && businessProfile.teamSize) },
    { label: 'Work mode and hiring categories', done: Boolean(businessProfile.workModes.length > 0 && businessProfile.hiringCategories) },
    { label: 'Company description and required skills', done: Boolean(businessProfile.description && businessProfile.requiredSkills) },
    { label: 'Contact details for applicants', done: Boolean(businessProfile.contactEmail && businessProfile.contactPhone) },
  ]

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

const GIG_STATUS_VALUES = new Set(['Hiring', 'Reviewing', 'In Progress'])
const GIG_MODE_VALUES = new Set(['Remote', 'Hybrid', 'On-site'])
const OPEN_GIG_STATUSES = new Set(['Hiring', 'Reviewing', 'In Progress'])

function normalizeGigPayload(payload, existing = {}) {
  const title = typeof payload?.title === 'string' ? payload.title.trim() : existing.title || ''
  const budget = typeof payload?.budget === 'string' ? payload.budget.trim() : existing.budget || ''
  const mode = typeof payload?.mode === 'string' ? payload.mode.trim() : existing.mode || 'Remote'
  const status = typeof payload?.status === 'string' ? payload.status.trim() : existing.status || 'Hiring'
  const skills = Array.isArray(payload?.skills)
    ? payload.skills.filter(skill => typeof skill === 'string' && skill.trim()).map(skill => skill.trim()).slice(0, 20)
    : (Array.isArray(existing.skills) ? existing.skills : [])

  if (!title || title.length > 120) {
    throw buildAuthError('GIG title is required and must be 120 characters or fewer')
  }

  if (!budget || budget.length > 120) {
    throw buildAuthError('GIG budget is required and must be 120 characters or fewer')
  }

  if (!GIG_MODE_VALUES.has(mode)) {
    throw buildAuthError('A valid GIG work mode is required')
  }

  if (!GIG_STATUS_VALUES.has(status)) {
    throw buildAuthError('A valid GIG status is required')
  }

  return { title, mode, budget, status, skills: skills.length > 0 ? skills : ['General'] }
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

function sanitizeProjectWorkspaceState(state) {
  const fallback = buildDefaultCompanyWorkspaceState()
  const mergedState = mergeTemplateState(fallback, state)

  return {
    projects: Array.isArray(mergedState?.projects)
      ? mergedState.projects.map((project, index) => sanitizeWorkspaceProject(project, index))
      : fallback.projects.map((project, index) => sanitizeWorkspaceProject(project, index)),
    selectedProjectId: typeof mergedState?.selectedProjectId === 'string' ? mergedState.selectedProjectId : fallback.selectedProjectId,
    statusFilter: ['All', 'Planning', 'In Progress', 'Review', 'Completed'].includes(mergedState?.statusFilter)
      ? mergedState.statusFilter
      : fallback.statusFilter,
  }
}

const WORKSPACE_PROJECT_STATUSES = new Set(['Planning', 'In Progress', 'Review', 'Completed'])
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
    ? source.updates.slice(-20).map((update, updateIndex) => ({
      id: typeof update?.id === 'string' ? update.id : `update-${updateIndex + 1}`,
      message: typeof update?.message === 'string' ? update.message.trim().slice(0, 500) : '',
      sharedAt: typeof update?.sharedAt === 'string' ? update.sharedAt : null,
    })).filter(update => update.message)
    : []
  const milestones = Array.isArray(source.milestones)
    ? source.milestones.slice(-20).map((milestone, milestoneIndex) => ({
      id: typeof milestone?.id === 'string' ? milestone.id : `milestone-${milestoneIndex + 1}`,
      title: typeof milestone?.title === 'string' ? milestone.title.trim().slice(0, 120) : '',
      dueDate: typeof milestone?.dueDate === 'string' ? milestone.dueDate.trim().slice(0, 80) : '',
      status: milestone?.status === 'Completed' ? 'Completed' : 'Open',
      createdAt: typeof milestone?.createdAt === 'string' ? milestone.createdAt : null,
    })).filter(milestone => milestone.title)
    : []

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id.trim().slice(0, 80) : `p${index + 1}`,
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
  const update = {
    id: `update-${Date.now()}`,
    message: normalizedMessage,
    sharedAt: sharedAt instanceof Date ? sharedAt.toISOString() : new Date().toISOString(),
  }

  nextState.projects[projectIndex] = {
    ...project,
    updates: [...project.updates, update].slice(-20),
  }
  nextState.selectedProjectId = project.id
  return nextState
}

function buildWorkspaceMilestoneState(currentState, projectId, payload, createdAt = new Date()) {
  const nextState = sanitizeProjectWorkspaceState(currentState)
  const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
  const dueDate = typeof payload?.dueDate === 'string' ? payload.dueDate.trim() : ''

  if (!title || title.length > 120) {
    throw buildAuthError('A milestone title is required and must be 120 characters or fewer')
  }

  if (dueDate.length > 80) {
    throw buildAuthError('Milestone date must be 80 characters or fewer')
  }

  const projectIndex = findWorkspaceProject(nextState, projectId)
  const project = nextState.projects[projectIndex]
  const milestone = {
    id: `milestone-${Date.now()}`,
    title,
    dueDate,
    status: 'Open',
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date().toISOString(),
  }

  nextState.projects[projectIndex] = {
    ...project,
    milestones: [...project.milestones, milestone].slice(-20),
  }
  nextState.selectedProjectId = project.id
  return nextState
}

function sanitizePaymentState(state) {
  const fallback = buildDefaultCompanyPaymentState()
  const mergedState = mergeTemplateState(fallback, state)

  return {
    summary: Array.isArray(mergedState?.summary) ? clone(mergedState.summary) : fallback.summary,
    methods: Array.isArray(mergedState?.methods) ? clone(mergedState.methods) : fallback.methods,
    transactions: Array.isArray(mergedState?.transactions) ? clone(mergedState.transactions) : fallback.transactions,
    recommendedActions: Array.isArray(mergedState?.recommendedActions) ? clone(mergedState.recommendedActions) : fallback.recommendedActions,
  }
}

function parsePaymentAmount(value) {
  const amount = Number(String(value || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

function formatPaymentAmount(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function formatPaymentDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function buildPaymentTransaction({ title, amount, date = new Date(), status, color, bg }) {
  return {
    id: `payment-${Date.now()}`,
    title,
    amount,
    date: formatPaymentDate(date),
    status,
    color,
    bg,
  }
}

function buildCompanyFundsState(currentState, rawAmount) {
  const nextState = sanitizePaymentState(currentState)
  const amount = Math.round(parsePaymentAmount(rawAmount))

  if (!Number.isInteger(amount) || amount < 100 || amount > 1000000) {
    throw buildAuthError('Funds amount must be between ₹100 and ₹10,00,000')
  }

  const availableBalance = nextState.summary.find(item => item.label === 'Available Balance')
  if (!availableBalance) {
    throw buildAuthError('Available balance is not configured', 409)
  }

  availableBalance.value = formatPaymentAmount(parsePaymentAmount(availableBalance.value) + amount)
  nextState.transactions = [
    buildPaymentTransaction({
      title: 'Wallet top-up',
      amount: `+${formatPaymentAmount(amount)}`,
      status: 'Added',
      color: '#065F46',
      bg: '#D1FAE5',
    }),
    ...nextState.transactions,
  ].slice(0, 20)

  return nextState
}

function buildCompanyPayoutSetupState(currentState) {
  const nextState = sanitizePaymentState(currentState)
  nextState.methods = nextState.methods.map(method => ({
    ...method,
    status: method.label === 'Primary Bank Account' ? 'Verified' : 'Active',
  }))
  nextState.transactions = [
    buildPaymentTransaction({
      title: 'Payout setup review',
      amount: 'Updated',
      status: 'Ready',
      color: '#1D4ED8',
      bg: '#DBEAFE',
    }),
    ...nextState.transactions,
  ].slice(0, 20)

  return nextState
}

function buildSkillsByLevel(skillHubSkills, fallbackSkills) {
  const groupedSkills = {
    Beginner: [],
    Intermediate: [],
    Pro: [],
  }

  if (Array.isArray(skillHubSkills)) {
    skillHubSkills.forEach(skill => {
      if (!skill || typeof skill.name !== 'string' || !skill.name.trim()) {
        return
      }

      const stage = ['Beginner', 'Intermediate', 'Pro'].includes(skill.stage) ? skill.stage : 'Intermediate'
      if (!groupedSkills[stage].includes(skill.name)) {
        groupedSkills[stage].push(skill.name)
      }
    })
  }

  fallbackSkills.forEach(skill => {
    if (!groupedSkills.Intermediate.includes(skill) && !groupedSkills.Beginner.includes(skill) && !groupedSkills.Pro.includes(skill)) {
      groupedSkills.Intermediate.push(skill)
    }
  })

  return groupedSkills
}

function sanitizeTalentProfile(student) {
  const profileSkills = Array.isArray(student.skills) ? student.skills : []
  const skillHubSkills = Array.isArray(student.skillHubSkills) ? student.skillHubSkills : []
  const skills = [...new Set([
    ...profileSkills,
    ...skillHubSkills.map(skill => skill?.name),
  ].filter(skill => typeof skill === 'string' && skill.trim()))]
  const savedProjects = Array.isArray(student.projects)
    ? student.projects
      .filter(project => project && (project.name || project.desc))
      .map(project => ({
        name: project.name || 'Student Project',
        desc: project.desc || 'Project details available on request.',
      }))
    : []

  const skillsByLevel = buildSkillsByLevel(student.skillHubSkills, skills)
  const streak = Array.isArray(student.skillHubSkills)
    ? Math.max(0, ...student.skillHubSkills.map(skill => Number(skill.streak) || 0))
    : 0

  return {
    id: student._id.toString(),
    name: student.name,
    college: 'SkillBridge Verified',
    location: student.location || 'Location not added',
    skills,
    skillsByLevel,
    streak,
    score: Number(student.trustScore) || 0,
    projects: Array.isArray(student.projects) ? student.projects.length : 0,
    github: Array.isArray(student.githubLink) && student.githubLink[0] ? student.githubLink[0].url : '',
    contactInfo: Array.isArray(student.contactInfo) ? clone(student.contactInfo) : [],
    intro: student.preferredLanguage
      ? `Verified student working confidently in ${student.preferredLanguage}.`
      : 'Verified SkillBridge student open to project-based opportunities.',
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
  const level = ['Beginner', 'Intermediate', 'Pro'].includes(filters.level) ? filters.level : 'All'

  return {
    minTrustScore: Number.isFinite(minTrustScore) ? Math.max(0, Math.min(1000, minTrustScore)) : 0,
    location: location === 'All' ? '' : location,
    skill: skill === 'All' ? '' : skill,
    level,
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
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

function buildTalentSearchResult(profiles, filters = {}, requiredSkills = '') {
  const normalizedFilters = normalizeTalentSearchFilters(filters)
  const requiredSkillList = parseRequiredSkills(requiredSkills)
  const filteredProfiles = profiles
    .filter(profile => {
      const locationPass = !normalizedFilters.location
        || normalizeTalentValue(profile.location) === normalizeTalentValue(normalizedFilters.location)
      const skillPass = !normalizedFilters.skill
        || profile.skills.some(skill => normalizeTalentValue(skill) === normalizeTalentValue(normalizedFilters.skill))
        || Object.values(profile.skillsByLevel || {}).some(skills => skills.some(skill => normalizeTalentValue(skill) === normalizeTalentValue(normalizedFilters.skill)))
      const levelPass = normalizedFilters.level === 'All'
        || (profile.skillsByLevel?.[normalizedFilters.level] || []).length > 0

      return profile.score >= normalizedFilters.minTrustScore && locationPass && skillPass && levelPass
    })
    .map(profile => enrichTalentProfile(profile, requiredSkillList))
    .sort((left, right) => (
      right.matchScore - left.matchScore
      || right.score - left.score
      || left.name.localeCompare(right.name)
    ))

  const start = (normalizedFilters.page - 1) * normalizedFilters.pageSize
  return {
    talentProfiles: filteredProfiles.slice(start, start + normalizedFilters.pageSize),
    total: filteredProfiles.length,
    page: normalizedFilters.page,
    pageSize: normalizedFilters.pageSize,
  }
}

function sanitizeCompany(company) {
  const fallbackProfile = buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  })
  const businessProfile = sanitizeCompanyProfile(company.businessProfile, fallbackProfile)
  const dashboardState = sanitizeDashboardState(company.dashboardState)
  const gigManagementState = sanitizeGigManagementState(company.gigManagementState)
  const projectWorkspaceState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
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
    paymentState,
  }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function findCompanyByToken(token) {
  return findModelByActiveToken(Company, token, 'Company', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
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
    gstin: verificationMethod === 'gstin' ? payload.gstin.trim() : '',
    businessDoc: verificationMethod === 'udyam' ? payload.businessDoc.trim() : '',
    location,
    businessProfile: buildDefaultCompanyProfile({ businessName, location }),
  })

  const token = createSessionToken()
  await appendSession(company, token, Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5)

  return {
    token,
    company: sanitizeCompany(company),
  }
}

async function signInCompany(payload) {
  const contact = payload.contact?.trim() || ''

  if (!contact) throw buildAuthError('Email or phone is required')
  if (!payload.password) throw buildAuthError('Password is required')

  const email = normalizeEmail(contact)
  const phone = normalizePhone(contact)
  const company = await Company.findOne({
    $or: [
      { email },
      { phone },
    ],
  })

  if (!company || !verifyPassword(payload.password, company.passwordHash)) {
    throw buildAuthError('Invalid credentials', 401)
  }

  const token = createSessionToken()
  await appendSession(company, token, Number(process.env.MAX_SESSIONS_PER_ACCOUNT) || 5)

  return {
    token,
    company: sanitizeCompany(company),
  }
}

async function getCurrentCompany(token) {
  const company = await findCompanyByToken(token)
  return sanitizeCompany(company)
}

async function getCurrentCompanyDashboard(token) {
  const company = await findCompanyByToken(token)
  const gigTitles = sanitizeGigManagementState(company.gigManagementState).gigs
    .map(gig => gig.title)
    .filter(Boolean)
  const [talentCount, submissions] = await Promise.all([
    Student.countDocuments(),
    gigTitles.length > 0
      ? TaskSubmission.find({ companyId: company._id }).sort({ updatedAt: -1, submittedAt: -1 }).limit(20)
      : Promise.resolve([]),
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
    const businessProfile = validateCompanyProfile(payload.businessProfile, fallbackProfile)
    const currentBusinessProfile = sanitizeCompanyProfile(company.businessProfile, fallbackProfile)

    if (!sameJson(currentBusinessProfile, businessProfile)) {
      consumeSectionOperation(company, 'setup-business-profile', 'Setup Business Profile', sectionLimit)
    }

    company.businessProfile = businessProfile

    if (businessProfile.businessName.trim()) {
      company.businessName = businessProfile.businessName.trim()
    }

    company.location = businessProfile.location.trim()
  }

  if (payload.dashboardState) {
    const nextDashboardState = sanitizeDashboardState(payload.dashboardState)
    const currentDashboardState = sanitizeDashboardState(company.dashboardState)

    if (!sameJson(currentDashboardState, nextDashboardState)) {
      consumeSectionOperation(company, 'my-business', 'My Business', sectionLimit)
    }

    company.dashboardState = reduceTemplateState(nextDashboardState, buildDefaultCompanyDashboardState())
  }

  if (payload.gigManagementState) {
    const nextGigManagementState = sanitizeGigManagementState(payload.gigManagementState)
    const currentGigManagementState = sanitizeGigManagementState(company.gigManagementState)

    if (!sameJson(currentGigManagementState, nextGigManagementState)) {
      consumeSectionOperation(company, 'gig-management', 'GIG Management', sectionLimit)
    }

    company.gigManagementState = reduceTemplateState(nextGigManagementState, buildDefaultCompanyGigManagementState())
  }

  if (payload.projectWorkspaceState) {
    const nextWorkspaceState = sanitizeProjectWorkspaceState(payload.projectWorkspaceState)
    const currentWorkspaceState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)

    if (!sameJson(currentWorkspaceState, nextWorkspaceState)) {
      consumeSectionOperation(company, 'project-workspace', 'Project Workspace', sectionLimit)
    }

    company.projectWorkspaceState = reduceTemplateState(nextWorkspaceState, buildDefaultCompanyWorkspaceState())
  }

  if (payload.paymentState) {
    const nextPaymentState = sanitizePaymentState(payload.paymentState)
    const currentPaymentState = sanitizePaymentState(company.paymentState)

    if (!sameJson(currentPaymentState, nextPaymentState)) {
      consumeSectionOperation(company, 'payment', 'Payment', sectionLimit)
    }

    company.paymentState = reduceTemplateState(nextPaymentState, buildDefaultCompanyPaymentState())
  }

  await company.save()

  return sanitizeCompany(company)
}

async function logoutCurrentCompany(token) {
  const company = await findCompanyByToken(token)
  company.sessions = company.sessions.filter(session => session.token !== token)
  await company.save()
}

async function getCurrentCompanyGigManagementState(token) {
  const company = await findCompanyByToken(token)
  return sanitizeGigManagementState(company.gigManagementState)
}

async function updateCurrentCompanyGigManagementState(token, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeGigManagementState(company.gigManagementState)
  const nextState = sanitizeGigManagementState(payload.gigManagementState)

  if (!sameJson(currentState, nextState)) {
    consumeSectionOperation(
      company,
      'gig-management',
      'GIG Management',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
  }

  company.gigManagementState = reduceTemplateState(nextState, buildDefaultCompanyGigManagementState())
  await company.save()
  return nextState
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

async function getCurrentCompanyProjectWorkspaceState(token) {
  const company = await findCompanyByToken(token)
  return sanitizeProjectWorkspaceState(company.projectWorkspaceState)
}

async function updateCurrentCompanyProjectWorkspaceState(token, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
  const nextState = sanitizeProjectWorkspaceState(payload.projectWorkspaceState)

  if (!sameJson(currentState, nextState)) {
    consumeSectionOperation(
      company,
      'project-workspace',
      'Project Workspace',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
  }

  company.projectWorkspaceState = reduceTemplateState(nextState, buildDefaultCompanyWorkspaceState())
  await company.save()
  return nextState
}

async function shareCompanyWorkspaceUpdate(token, projectId, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
  const nextState = buildWorkspaceUpdateState(currentState, projectId, payload?.message)

  consumeSectionOperation(
    company,
    'project-workspace',
    'Project Workspace',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  company.projectWorkspaceState = reduceTemplateState(nextState, buildDefaultCompanyWorkspaceState())
  await company.save()
  return nextState
}

async function setCompanyWorkspaceMilestone(token, projectId, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
  const nextState = buildWorkspaceMilestoneState(currentState, projectId, payload)

  consumeSectionOperation(
    company,
    'project-workspace',
    'Project Workspace',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  company.projectWorkspaceState = reduceTemplateState(nextState, buildDefaultCompanyWorkspaceState())
  await company.save()
  return nextState
}

async function getCurrentCompanyPaymentState(token) {
  const company = await findCompanyByToken(token)
  return sanitizePaymentState(company.paymentState)
}

async function updateCurrentCompanyPaymentState(token, payload) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizePaymentState(company.paymentState)
  const nextState = sanitizePaymentState(payload.paymentState)

  if (!sameJson(currentState, nextState)) {
    consumeSectionOperation(
      company,
      'payment',
      'Payment',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
  }

  company.paymentState = reduceTemplateState(nextState, buildDefaultCompanyPaymentState())
  await company.save()
  return nextState
}

async function addCompanyFunds(token, amount) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizePaymentState(company.paymentState)
  const nextState = buildCompanyFundsState(currentState, amount)

  consumeSectionOperation(
    company,
    'payment',
    'Payment',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  company.paymentState = reduceTemplateState(nextState, buildDefaultCompanyPaymentState())
  await company.save()
  return nextState
}

async function setupCompanyPayouts(token) {
  const company = await findCompanyByToken(token)
  const currentState = sanitizePaymentState(company.paymentState)
  const nextState = buildCompanyPayoutSetupState(currentState)

  consumeSectionOperation(
    company,
    'payment',
    'Payment',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  company.paymentState = reduceTemplateState(nextState, buildDefaultCompanyPaymentState())
  await company.save()
  return nextState
}

async function getCompanyTalentProfiles(token, filters = {}) {
  const company = await findCompanyByToken(token)
  const normalizedFilters = normalizeTalentSearchFilters(filters)
  const query = {}

  if (normalizedFilters.minTrustScore > 0) {
    query.trustScore = { $gte: normalizedFilters.minTrustScore }
  }

  if (normalizedFilters.location) {
    query.location = new RegExp(`^${escapeRegExp(normalizedFilters.location)}$`, 'i')
  }

  if (normalizedFilters.skill) {
    query.$or = [
      { skills: new RegExp(`^${escapeRegExp(normalizedFilters.skill)}$`, 'i') },
      { 'skillHubSkills.name': new RegExp(`^${escapeRegExp(normalizedFilters.skill)}$`, 'i') },
    ]
  }

  const fallbackProfile = buildDefaultCompanyProfile({
    businessName: company.businessName,
    location: company.location,
  })
  const businessProfile = sanitizeCompanyProfile(company.businessProfile, fallbackProfile)
  const [students, availableLocations, profileSkills, skillHubSkills] = await Promise.all([
    Student.find(query).sort({ trustScore: -1, createdAt: -1 }).limit(1000).lean(),
    Student.distinct('location'),
    Student.distinct('skills'),
    Student.distinct('skillHubSkills.name'),
  ])
  const profiles = students.map(sanitizeTalentProfile)
  const result = buildTalentSearchResult(profiles, normalizedFilters, businessProfile.requiredSkills)

  return {
    ...result,
    availableLocations: [...new Set(availableLocations.filter(location => typeof location === 'string' && location.trim()))].sort(),
    availableSkills: [...new Set([...profileSkills, ...skillHubSkills].filter(skill => typeof skill === 'string' && skill.trim()))].sort(),
  }
}

async function getPublicCompanyProfile(companyName) {
  const normalizedName = typeof companyName === 'string' ? companyName.trim() : ''
  if (!normalizedName) {
    throw buildAuthError('Company name is required')
  }

  const company = await Company.findOne({
    businessName: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i'),
  })

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
    industry: profile.industry,
    website: profile.website,
    teamSize: profile.teamSize,
    workModes: profile.workModes,
    description: profile.description,
    hiringCategories: profile.hiringCategories,
    requiredSkills: profile.requiredSkills,
  }
}

module.exports = {
  buildCompanyFundsState,
  buildCreatedGigState,
  buildCompanyDashboardOverview,
  buildCompanyPayoutSetupState,
  buildTalentSearchResult,
  buildWorkspaceMilestoneState,
  buildWorkspaceUpdateState,
  buildUpdatedGigState,
  createCompanyGig,
  getCurrentCompany,
  getCurrentCompanyDashboard,
  getCurrentCompanyGigManagementState,
  getCurrentCompanyPaymentState,
  getCurrentCompanyProjectWorkspaceState,
  getCompanyTalentProfiles,
  getPublicCompanyProfile,
  normalizeTalentSearchFilters,
  sanitizeCompanyProfile,
  validateCompanyProfile,
  logoutCurrentCompany,
  signInCompany,
  signUpCompany,
  updateCurrentCompany,
  updateCurrentCompanyGigManagementState,
  updateCompanyGig,
  updateCurrentCompanyPaymentState,
  updateCurrentCompanyProjectWorkspaceState,
  setCompanyWorkspaceMilestone,
  shareCompanyWorkspaceUpdate,
}
