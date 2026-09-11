const Company = require('../models/Company')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const { randomUUID } = require('node:crypto')
const { DEFAULT_OPPORTUNITIES } = require('../config/gigDefaults')
const { buildDefaultCompanyGigManagementState } = require('../config/companyGigDefaults')
const { buildDefaultCompanyWorkspaceState } = require('../config/companyWorkspaceDefaults')
const { buildWorkspaceState, isWorkSubmission } = require('../utils/companyWorkspace')
const { mergeTemplateState, clone, reduceTemplateState } = require('../utils/templateState')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { recordTrustScoreEvent } = require('./trustScoreController')
const { validateAssignment, isLateSubmission } = require('../utils/taskValidation')
const { activeStreak } = require('../utils/skillPolicy')
const { synchronizeCompanyGigMetrics } = require('../utils/companyGigMetrics')

const TASK_TYPE_VALUES = new Set(['live_project', 'code', 'mcq', 'written', 'mixed', 'design', 'data_analysis', 'case_study', 'research', 'presentation'])
const TASK_DETAIL_KEYS = new Set([
  'deliverables', 'acceptanceCriteria', 'submissionRequirements', 'language', 'testCases',
  'questionCount', 'questions', 'options', 'answerKey', 'optionsAndAnswers', 'passingScore', 'wordLimit', 'evaluationCriteria', 'components',
])

function sanitizeTaskDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {}
  return Object.fromEntries(Object.entries(details)
    .filter(([key, value]) => TASK_DETAIL_KEYS.has(key) && (typeof value === 'string' || typeof value === 'number'))
    .map(([key, value]) => [key, String(value).trim().slice(0, 2000)])
    .filter(([, value]) => value))
}

function sanitizeTaskDetailsForStudent(details) {
  const sanitized = sanitizeTaskDetails(details)
  const studentDetails = { ...sanitized }

  delete studentDetails.answerKey

  // Legacy combined fields cannot be reliably separated from private answers.
  delete studentDetails.optionsAndAnswers

  return studentDetails
}

const TASK_STATUS_TRANSITIONS = {
  submitted: new Set(['reviewed', 'rejected', 'needs_revision']),
  reviewed: new Set(['selected', 'rejected', 'needs_revision']),
  selected: new Set(['work_started']),
  work_started: new Set(['delivered']),
  delivered: new Set(['approved', 'needs_revision']),
  approved: new Set(['completed']),
  completed: new Set(),
  rejected: new Set(),
  ready_to_hire: new Set(['selected']),
  needs_revision: new Set(['submitted']),
}

function nextStudentSubmissionStatus(submission) {
  if (!submission || submission.status === 'submitted') return 'submitted'
  if (submission.status === 'work_started') return 'delivered'
  if (submission.status === 'needs_revision') return submission.revisionReturnStatus || 'submitted'
  throw buildAuthError('This submission cannot be edited at its current stage', 409)
}

async function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
}

async function findCompanyByToken(token) {
  return findModelByActiveToken(Company, token, 'Company', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
}

async function saveSubmission(submission) {
  try {
    await submission.save()
  } catch (error) {
    if (error.name === 'VersionError') throw buildAuthError('The submission changed. Refresh before trying again.', 409)
    throw error
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

function sanitizeProjectWorkspaceState(state) {
  const fallback = buildDefaultCompanyWorkspaceState()
  const mergedState = mergeTemplateState(fallback, state)

  return {
    projects: Array.isArray(mergedState?.projects) ? clone(mergedState.projects) : fallback.projects,
    selectedProjectId: typeof mergedState?.selectedProjectId === 'string' ? mergedState.selectedProjectId : fallback.selectedProjectId,
    statusFilter: typeof mergedState?.statusFilter === 'string' ? mergedState.statusFilter : fallback.statusFilter,
  }
}

function buildWorkspaceMemberName(studentName = '') {
  const parts = studentName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return 'Student'
  }

  if (parts.length === 1) {
    return parts[0]
  }

  return `${parts[0]} ${parts[1][0].toUpperCase()}`
}

function formatWorkspaceDeadline(baseDate) {
  const nextWeek = new Date(baseDate)
  nextWeek.setDate(nextWeek.getDate() + 7)
  return nextWeek.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildWorkspaceKickoffTask(memberName) {
  return {
    name: `Kickoff sync with ${memberName}`,
    owner: memberName,
    state: 'Todo',
  }
}

function syncCompanyWorkspaceAfterSubmission(company, taskSubmission) {
  const current = sanitizeProjectWorkspaceState(company.projectWorkspaceState)
  const gigState = sanitizeGigManagementState(company.gigManagementState)
  const projected = buildWorkspaceState(current, [taskSubmission], gigState.gigs)
  const project = projected.projects[0]
  if (!project) return
  const remaining = current.projects.filter(item => item.id !== project.id && item.submissionId !== project.submissionId)
  company.projectWorkspaceState = { ...current, projects: [project, ...remaining] }
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
    if (
      !groupedSkills.Beginner.includes(skill)
      && !groupedSkills.Intermediate.includes(skill)
      && !groupedSkills.Pro.includes(skill)
    ) {
      groupedSkills.Intermediate.push(skill)
    }
  })

  return groupedSkills
}

function sanitizeTaskSubmission(submission) {
  if (!submission) {
    return null
  }

  return {
    id: submission._id.toString(),
    studentId: submission.studentId.toString(),
    companyId: submission.companyId ? submission.companyId.toString() : null,
    companyGigId: Number.isFinite(Number(submission.companyGigId)) ? Number(submission.companyGigId) : null,
    companyGigPublicId: submission.companyGigPublicId || '',
    studentName: submission.studentName,
    studentAvatar: submission.studentAvatar || null,
    studentLocation: submission.studentLocation || '',
    studentTrustScore: Number(submission.studentTrustScore) || 0,
    studentSkills: Array.isArray(submission.studentSkills) ? submission.studentSkills : [],
    studentSkillsByLevel: submission.studentSkillsByLevel || {},
    studentStreak: Number(submission.studentStreak) || 0,
    studentGithub: submission.studentGithub || '',
    studentContactInfo: Array.isArray(submission.studentContactInfo) ? submission.studentContactInfo : [],
    studentProjects: Array.isArray(submission.studentProjects) ? submission.studentProjects : [],
    studentVideoUrl: submission.studentVideoUrl || null,
    opportunityId: submission.opportunityId,
    gigTitle: submission.gigTitle,
    companyName: submission.companyName || '',
    companyLocation: submission.companyLocation || '',
    taskTitle: submission.taskTitle || '',
    taskType: TASK_TYPE_VALUES.has(submission.taskType) ? submission.taskType : 'mixed',
    taskDetails: sanitizeTaskDetailsForStudent(submission.taskDetails),
    score: submission.score ?? null,
    interviewSubmission: submission.interviewSubmission || null,
    externalPayment: submission.externalPayment || null,
    completedAt: submission.completedAt || null,
    taskInstructions: submission.taskInstructions || '',
    submittedLate: !isWorkSubmission(submission) && isLateSubmission(submission.taskDeadline, submission.submittedAt),
    workBrief: submission.workBrief || '',
    taskDeadline: submission.taskDeadline || '',
    taskPoints: Number(submission.taskPoints) || 0,
    matchedSkills: Array.isArray(submission.matchedSkills) ? submission.matchedSkills : [],
    submissionLink: submission.submissionLink || '',
    submissionContent: submission.submissionContent || '',
    note: submission.note || '',
    status: submission.status,
    revisionReturnStatus: submission.revisionReturnStatus || 'submitted',
    feedback: submission.feedback || '',
    submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
    reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null,
    createdAt: submission.createdAt ? submission.createdAt.toISOString() : null,
    updatedAt: submission.updatedAt ? submission.updatedAt.toISOString() : null,
  }
}

function normalizeTaskIdentity(payload) {
  const gigTitle = typeof payload?.gigTitle === 'string' ? payload.gigTitle.trim() : ''
  const companyName = typeof payload?.companyName === 'string' ? payload.companyName.trim() : ''
  const rawOpportunityId = typeof payload?.opportunityId === 'string' || typeof payload?.opportunityId === 'number'
    ? String(payload.opportunityId).trim()
    : ''
  const opportunityId = /^\d+$/.test(rawOpportunityId) ? Number(rawOpportunityId) : rawOpportunityId

  // Modern clients send the stable invitation or public GIG id. Titles and
  // company names are editable display metadata, so require them only for
  // legacy links which have no stable identifier.
  if ((!opportunityId && (!gigTitle || !companyName))
    || (typeof opportunityId === 'number' && opportunityId < 1)
    || rawOpportunityId.length > 120) {
    throw buildAuthError('A valid opportunity is required')
  }

  return {
    gigTitle,
    opportunityId,
    ...(companyName ? { companyName } : {}),
  }
}

function toPlainOpportunity(opportunity) {
  return opportunity && typeof opportunity.toObject === 'function' ? opportunity.toObject() : opportunity
}

function refreshTaskAssignmentMetadata(opportunity, company) {
  const assignment = toPlainOpportunity(opportunity)
  if (!assignment || !company) return assignment

  const businessProfile = company.businessProfile && typeof company.businessProfile === 'object'
    ? company.businessProfile
    : {}
  const gigState = sanitizeGigManagementState(company.gigManagementState)
  const gig = gigState.gigs.find(item => {
    if (assignment.companyGigPublicId) {
      return item?.publicId && String(item.publicId) === String(assignment.companyGigPublicId)
    }
    return Number.isFinite(Number(assignment.companyGigId))
      && Number(item?.id) === Number(assignment.companyGigId)
  })
  const companyName = typeof company.businessName === 'string' && company.businessName.trim()
    ? company.businessName.trim()
    : assignment.company
  const companyLogo = typeof businessProfile.logo === 'string' ? businessProfile.logo : assignment.companyLogo || ''

  // The GIG and company fields are current public metadata. Interview task
  // fields remain on the accepted invitation so a company cannot silently
  // change an assignment after the student has accepted it.
  return {
    ...assignment,
    company: companyName,
    companyInitial: companyName?.charAt(0)?.toUpperCase() || assignment.companyInitial || 'C',
    companyLogo,
    ...(gig ? {
      title: gig.title || assignment.title,
      location: gig.location || businessProfile.location || company.location || assignment.location,
      stipend: gig.budget || assignment.stipend,
      type: gig.type || assignment.type,
      matchedSkills: Array.isArray(gig.skills) && gig.skills.length > 0 ? gig.skills : assignment.matchedSkills,
    } : {}),
  }
}

function sanitizeTaskAssignment(opportunity) {
  if (!opportunity) {
    return null
  }

  return {
    id: Number.isFinite(Number(opportunity.id)) ? Number(opportunity.id) : String(opportunity.id),
    companyId: opportunity.companyId ? opportunity.companyId.toString() : null,
    companyGigId: Number.isFinite(Number(opportunity.companyGigId)) ? Number(opportunity.companyGigId) : null,
    companyGigPublicId: opportunity.companyGigPublicId || '',
    title: opportunity.title,
    company: opportunity.company,
    companyInitial: opportunity.companyInitial || opportunity.company?.charAt(0)?.toUpperCase() || 'C',
    companyColor: opportunity.companyColor || '',
    companyLogo: typeof opportunity.companyLogo === 'string' ? opportunity.companyLogo : '',
    location: opportunity.location || '',
    stipend: opportunity.stipend || '',
    deadline: opportunity.deadline || '',
    taskTitle: opportunity.taskTitle || '',
    taskType: TASK_TYPE_VALUES.has(opportunity.taskType) ? opportunity.taskType : 'mixed',
    taskDetails: sanitizeTaskDetailsForStudent(opportunity.taskDetails),
    taskInstructions: opportunity.taskInstructions || '',
    taskDeadline: opportunity.taskDeadline || '',
    taskPoints: Number(opportunity.taskPoints) || 0,
    status: opportunity.status,
    matchedSkills: Array.isArray(opportunity.matchedSkills) ? opportunity.matchedSkills : [],
    type: opportunity.type || 'Interview Task',
    source: opportunity.source === 'direct_invite' ? 'direct_invite' : 'application',
  }
}

function findAcceptedOpportunity(student, opportunityId, gigTitle, companyName = '') {
  const opportunities = Array.isArray(student.gigState?.opportunities)
    ? student.gigState.opportunities
    : []
  const statusOverrides = student.gigState?.opportunityStatusById && typeof student.gigState.opportunityStatusById === 'object'
    ? student.gigState.opportunityStatusById
    : {}
  const plainOpportunities = opportunities.map(toPlainOpportunity)
  const withEffectiveStatus = item => ({
    ...item,
    status: typeof statusOverrides[item?.id] === 'string' ? statusOverrides[item.id] : item?.status,
  })
  const exactOpportunity = plainOpportunities.find(item => String(item?.id) === String(opportunityId))
  const publicIdOpportunity = plainOpportunities.find(item => (
      item?.companyGigPublicId
      && String(item.companyGigPublicId) === String(opportunityId)
      && (!companyName || item?.company === companyName)
    ))
  const legacyOpportunity = plainOpportunities.find(item => (
      !opportunityId
      && item?.title === gigTitle
      && (!companyName || item?.company === companyName)
    ))
  const opportunity = exactOpportunity || publicIdOpportunity || legacyOpportunity

  if (!opportunity) {
    throw buildAuthError('Opportunity not found', 404)
  }

  const effectiveOpportunity = withEffectiveStatus(opportunity)

  // Titles are editable company metadata. Once an invitation/public GIG id is
  // supplied, it is the authority for the task rather than the old title.
  if (!exactOpportunity && !publicIdOpportunity && effectiveOpportunity.title !== gigTitle) {
    throw buildAuthError('The task does not match this opportunity', 400)
  }

  if (effectiveOpportunity.status !== 'accepted') {
    throw buildAuthError('Accept the opportunity before submitting its task', 409)
  }

  return effectiveOpportunity
}

function buildTaskSubmissionQuery(studentId, assignment) {
  const query = { studentId }
  const hasOpportunityId = Number.isFinite(Number(assignment.id))
  const hasCompanyGigId = Number.isFinite(Number(assignment.companyGigId))

  if (assignment.companyId) {
    query.companyId = assignment.companyId
  }

  if (hasCompanyGigId) {
    query.companyGigId = Number(assignment.companyGigId)
  }

  if (hasOpportunityId) {
    query.opportunityId = Number(assignment.id)
  }

  if (assignment.companyGigPublicId) {
    query.companyGigPublicId = assignment.companyGigPublicId
  }

  if (!hasOpportunityId && !hasCompanyGigId && !assignment.companyGigPublicId) {
    query.gigTitle = assignment.title
  }

  return query
}

function normalizeSubmissionLink(value) {
  const link = typeof value === 'string' ? value.trim() : ''

  if (!link || link.length > 500) {
    throw buildAuthError('A submission link is required and must be 500 characters or fewer')
  }

  try {
    const parsed = new URL(link)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol')
    }
  } catch (error) {
    throw buildAuthError('Enter a valid http:// or https:// submission link')
  }

  return link
}

function normalizeSubmissionContent(value) {
  const content = typeof value === 'string' ? value.trim() : ''

  if (content.length > 10000) {
    throw buildAuthError('A written response must be 10,000 characters or fewer')
  }

  return content
}

function buildStudentTaskProfile(student) {
  const skills = Array.isArray(student.skills)
    ? student.skills.filter(skill => typeof skill === 'string' && skill.trim())
    : []
  const projects = Array.isArray(student.projects)
    ? student.projects
      .filter(project => project && (project.name || project.desc))
      .map(project => ({
        name: project.name || 'Student Project',
        desc: project.desc || '',
        link: project.link || '',
        demoLink: project.demoLink || '',
      }))
    : []
  const skillsByLevel = buildSkillsByLevel(student.skillHubSkills, skills)
  const streak = Array.isArray(student.skillHubSkills)
    ? Math.max(0, ...student.skillHubSkills.map(skill => activeStreak(skill)))
    : 0

  return {
    studentName: student.name,
    studentAvatar: student.avatar || null,
    studentLocation: student.location || '',
    studentTrustScore: Number(student.trustScore) || 0,
    studentSkills: skills,
    studentSkillsByLevel: skillsByLevel,
    studentStreak: streak,
    studentGithub: Array.isArray(student.githubLink) && student.githubLink[0] ? student.githubLink[0].url : '',
    studentContactInfo: Array.isArray(student.contactInfo) ? student.contactInfo : [],
    studentProjects: projects,
    studentVideoUrl: student.videoUrl || null,
  }
}

async function getStudentCompanyInterviewTask(token, payload) {
  const student = await findStudentByToken(token)
  const { gigTitle, companyName, opportunityId } = normalizeTaskIdentity(payload)
  const assignment = findAcceptedOpportunity(student, opportunityId, gigTitle, companyName)
  const query = buildTaskSubmissionQuery(student._id, assignment)
  const assignmentCompany = assignment.companyId
    ? await Company.findById(assignment.companyId)
    : null
  const currentAssignment = refreshTaskAssignmentMetadata(assignment, assignmentCompany)

  const taskSubmission = await TaskSubmission.findOne(query).sort({ updatedAt: -1 })
  const sanitizedSubmission = sanitizeTaskSubmission(taskSubmission)
  if (taskSubmission && isWorkSubmission(taskSubmission)) {
    const company = await Company.findById(taskSubmission.companyId)
    const submissionId = String(taskSubmission._id)
    const projects = (company?.projectWorkspaceState?.projects || []).filter(project =>
      project.submissionId === submissionId || project.id === `submission-${submissionId}`)
    const project = buildWorkspaceState({ projects }, [taskSubmission]).projects[0]
    sanitizedSubmission.workspace = { deadline: project.deadline, updates: project.updates, milestones: project.milestones }
  }
  return {
    taskSubmission: sanitizedSubmission,
    taskAssignment: sanitizeTaskAssignment(currentAssignment),
  }
}

async function sendCompanyInterviewTask(token, payload) {
  const company = await findCompanyByToken(token)
  const gigTitle = typeof payload?.gigTitle === 'string' ? payload.gigTitle.trim() : ''
  const studentId = typeof payload?.studentId === 'string' ? payload.studentId.trim() : ''
  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  const taskTitle = typeof payload?.taskTitle === 'string' ? payload.taskTitle.trim() : ''
  const taskType = TASK_TYPE_VALUES.has(payload?.taskType) ? payload.taskType : 'mixed'
  const taskDetails = sanitizeTaskDetails(payload?.taskDetails)
  const taskInstructions = typeof payload?.taskInstructions === 'string' ? payload.taskInstructions.trim() : ''
  const taskDeadline = typeof payload?.taskDeadline === 'string' ? payload.taskDeadline.trim() : ''
  const taskPoints = Number(payload?.taskPoints)
  validateAssignment({ type: payload?.taskType || 'mixed', title: taskTitle, instructions: taskInstructions,
    deadline: taskDeadline, points: payload?.taskPoints, details: payload?.taskDetails || {} })

  if (!gigTitle || !studentId) {
    throw buildAuthError('An applicant and GIG are required')
  }
  if (!/^[a-f0-9]{24}$/i.test(studentId)) throw buildAuthError('Invalid student ID')

  if (!taskTitle || taskTitle.length > 160) {
    throw buildAuthError('A task title is required and must be 160 characters or fewer')
  }

  if (!taskInstructions || taskInstructions.length > 4000) {
    throw buildAuthError('Task instructions are required and must be 4000 characters or fewer')
  }

  const parsedDeadline = new Date(taskDeadline)
  if (!taskDeadline || !/^\d{4}-\d{2}-\d{2}$/.test(taskDeadline)
    || Number.isNaN(parsedDeadline.getTime()) || parsedDeadline.toISOString().slice(0, 10) !== taskDeadline) {
    throw buildAuthError('A valid task deadline is required')
  }

  if (new Date(`${taskDeadline}T23:59:59.999+05:30`).getTime() < Date.now()) {
    throw buildAuthError('The task deadline must be today or later')
  }

  if (!Number.isInteger(taskPoints) || taskPoints < 1 || taskPoints > 100) {
    throw buildAuthError('Task points must be a whole number between 1 and 100')
  }

  if (message.length > 1000) {
    throw buildAuthError('The interview message must be 1000 characters or fewer')
  }

  const gigManagementState = sanitizeGigManagementState(company.gigManagementState)
  const candidates = gigManagementState.gigs.filter(item => payload?.companyGigId != null
    ? Number(item.id) === Number(payload.companyGigId) : item.title === gigTitle)
  if (candidates.length > 1) throw buildAuthError('Choose the GIG by its ID')
  const gig = candidates[0]
  if (gig && !['Hiring', 'Reviewing', 'In Progress'].includes(gig.status)) throw buildAuthError('This GIG is closed', 409)

  if (!gig) {
    throw buildAuthError('GIG not found', 404)
  }
  const canonicalGigTitle = gig.title

  if (!gig.publicId) {
    gig.publicId = randomUUID()
  }

  const student = await Student.findById(studentId)
  if (!student) {
    throw buildAuthError('Applicant not found', 404)
  }

  const applicants = Array.isArray(gigManagementState.applicantsByGig?.[gig.id])
    ? gigManagementState.applicantsByGig[gig.id]
    : []
  const studentKey = student._id.toString()
  const isApplicant = applicants.some(applicant => (
    String(applicant?.studentId || applicant?.id || '') === studentKey
  ))
  const isDirectInvite = payload?.directInvite === true

  if (!isApplicant && !isDirectInvite) {
    throw buildAuthError('Interview tasks can only be sent to applicants for this GIG', 403)
  }

  const currentOpportunities = Array.isArray(student.gigState?.opportunities)
    ? student.gigState.opportunities.map(item => ({ ...(typeof item.toObject === 'function' ? item.toObject() : item) }))
    : []
  const existingOpportunity = currentOpportunities.find(item => (
    item.companyId?.toString() === company._id.toString()
    && (
      String(item.companyGigPublicId || '') === String(gig.publicId)
      || (!item.companyGigPublicId && Number(item.companyGigId) === Number(gig.id) && item.title === gig.title)
    )
  ))

  if (existingOpportunity) {
    // An invitation is a snapshot. Repeated sends must not replace accepted work.
    return { opportunity: existingOpportunity, gigManagementState: sanitizeGigManagementState(company.gigManagementState), alreadyExists: true }
  }

  const highestOpportunityId = [...DEFAULT_OPPORTUNITIES, ...currentOpportunities]
    .map(item => Number(item.id) || 0)
    .reduce((highest, id) => Math.max(highest, id), 0)
  const opportunity = {
    id: highestOpportunityId + 1,
    companyId: company._id,
    companyGigId: Number(gig.id),
    companyGigPublicId: gig.publicId,
    title: gig.title,
    company: company.businessName,
    companyInitial: company.businessName[0]?.toUpperCase() || 'C',
    companyColor: '#F97316',
    companyLogo: typeof company.businessProfile?.logo === 'string' ? company.businessProfile.logo : '',
    location: gig.location || company.businessProfile?.location || company.location || 'Location not specified',
    stipend: gig.budget,
    deadline: taskDeadline,
    sentOn: new Date().toISOString(),
    message: message || `${company.businessName} invited you to complete an interview task for ${gig.title}.`,
    taskTitle,
    taskType,
    taskDetails: sanitizeTaskDetailsForStudent(taskDetails),
    taskInstructions,
    taskDeadline,
    taskPoints,
    matchedSkills: Array.isArray(gig.skills) ? gig.skills : [],
    duration: 'Interview task',
    type: gig.type || 'Internship',
    source: isDirectInvite && !isApplicant ? 'direct_invite' : 'application',
    status: 'new',
  }

  student.gigState = student.gigState || {}
  student.gigState.opportunities = [...currentOpportunities, opportunity]
  await student.save()

  company.taskReviewGuides = {
    ...company.taskReviewGuides,
    [`${studentKey}:${opportunity.id}`]: Object.fromEntries(
      ['answerKey', 'evaluationCriteria', 'testCases', 'acceptanceCriteria', 'passingScore']
        .filter(key => taskDetails[key]).map(key => [key, taskDetails[key]])),
  }

  const gigIndex = gigManagementState.gigs.findIndex(item => item.id === gig.id)
  if (gigIndex !== -1) {
    gigManagementState.gigs[gigIndex] = {
      ...gigManagementState.gigs[gigIndex],
      interviewTasks: (Number(gigManagementState.gigs[gigIndex].interviewTasks) || 0) + 1,
    }
  }
  gigManagementState.stats = gigManagementState.stats.map(item => item.label === 'Interview Tasks Sent'
    ? { ...item, value: String((Number(item.value) || 0) + 1) }
    : item)
  gigManagementState.pipeline = gigManagementState.pipeline.map(item => item.label === 'Interview Task Pending'
    ? { ...item, value: String((Number(item.value) || 0) + 1) }
    : item)
  gigManagementState.recentActivity = [`Interview task sent to ${student.name} for ${canonicalGigTitle}.`, ...gigManagementState.recentActivity].slice(0, 8)
  company.gigManagementState = reduceTemplateState(gigManagementState, buildDefaultCompanyGigManagementState())
  await company.save()

  return { opportunity, gigManagementState: sanitizeGigManagementState(company.gigManagementState), alreadyExists: false }
}

async function submitStudentCompanyInterviewTask(token, payload) {
  const student = await findStudentByToken(token)
  const { gigTitle, companyName: requestedCompanyName, opportunityId } = normalizeTaskIdentity(payload)
  const assignment = findAcceptedOpportunity(student, opportunityId, gigTitle, requestedCompanyName)
  const currentAssignment = assignment.companyId
    ? refreshTaskAssignmentMetadata(assignment, await Company.findById(assignment.companyId))
    : assignment
  const rawSubmissionLink = typeof payload?.submissionLink === 'string' ? payload.submissionLink.trim() : ''
  const submissionLink = rawSubmissionLink ? normalizeSubmissionLink(rawSubmissionLink) : ''
  const submissionContent = normalizeSubmissionContent(payload?.submissionContent)
  const note = typeof payload?.note === 'string' ? payload.note.trim() : ''
  const companyName = currentAssignment.company || ''
  const companyLocation = currentAssignment.location || ''
  const taskTitle = currentAssignment.taskTitle || ''
  const taskType = TASK_TYPE_VALUES.has(currentAssignment.taskType) ? currentAssignment.taskType : 'mixed'
  const taskDetails = sanitizeTaskDetails(currentAssignment.taskDetails)
  const taskInstructions = currentAssignment.taskInstructions || ''
  const taskDeadline = currentAssignment.taskDeadline || ''
  const taskPoints = Number(currentAssignment.taskPoints) || 0
  const matchedSkills = Array.isArray(currentAssignment.matchedSkills) ? currentAssignment.matchedSkills : []
  const query = buildTaskSubmissionQuery(student._id, assignment)

  const existingSubmission = await TaskSubmission.findOne(query).sort({ updatedAt: -1 })
  const nextSubmissionStatus = nextStudentSubmissionStatus(existingSubmission)
  const isWorkDelivery = nextSubmissionStatus === 'delivered'

  if (!submissionLink && !submissionContent) {
    throw buildAuthError('Submit a public link or a written response')
  }

  if (!isWorkDelivery && ['live_project', 'code'].includes(taskType) && !submissionLink) {
    throw buildAuthError('A public project or code link is required for this task')
  }

  if (!isWorkDelivery && ['mcq', 'written'].includes(taskType) && !submissionContent) {
    throw buildAuthError('A written response is required for this task')
  }
  if (!isWorkDelivery && taskType === 'written' && Number(taskDetails.wordLimit) > 0
    && submissionContent.split(/\s+/u).filter(Boolean).length > Number(taskDetails.wordLimit)) {
    throw buildAuthError(`Response exceeds the ${taskDetails.wordLimit} word limit`)
  }

  if (note.length > 2000) {
    throw buildAuthError('The submission note must be 2000 characters or fewer')
  }

  const profile = buildStudentTaskProfile(student)

  const taskSubmission = await TaskSubmission.findOneAndUpdate(
    existingSubmission ? { ...query, status: existingSubmission.status, updatedAt: existingSubmission.updatedAt } : query,
    {
      $set: {
        ...profile,
        ...(existingSubmission && ['work_started', 'delivered'].includes(nextSubmissionStatus) && !existingSubmission.interviewSubmission
          ? { interviewSubmission: { submissionLink: existingSubmission.submissionLink, submissionContent: existingSubmission.submissionContent, note: existingSubmission.note, feedback: existingSubmission.feedback, score: existingSubmission.score, submittedAt: existingSubmission.submittedAt } } : {}),
        companyId: assignment.companyId || null,
        companyGigId: Number.isFinite(Number(assignment.companyGigId)) ? Number(assignment.companyGigId) : null,
        companyGigPublicId: assignment.companyGigPublicId || '',
        gigTitle: currentAssignment.title || gigTitle,
        opportunityId: Number(assignment.id),
        companyName,
        companyLocation,
        taskTitle,
        taskType,
        taskDetails,
        taskInstructions,
        taskDeadline,
        taskPoints,
        matchedSkills,
        submissionLink,
        submissionContent,
        note,
        status: nextSubmissionStatus,
        feedback: '',
        score: null,
        reviewedAt: null,
        submittedAt: new Date(),
      },
      $setOnInsert: {
        studentId: student._id,
      },
      $inc: { __v: 1 },
    },
    {
      returnDocument: 'after',
      upsert: !existingSubmission,
      runValidators: true,
    },
  ).catch(error => {
    if (error.code === 11000) throw buildAuthError('This task was already submitted. Refresh to see its current state.', 409)
    throw error
  })

  if (!taskSubmission) throw buildAuthError('The submission changed. Refresh and try again.', 409)

  await syncCompanyPipelineAfterStudentSubmission(
    assignment,
    taskSubmission,
    !existingSubmission || existingSubmission.status !== nextSubmissionStatus,
  )

  if (taskSubmission.status === 'delivered') {
    const company = await Company.findById(assignment.companyId)
    if (company) {
      syncCompanyWorkspaceAfterSubmission(company, taskSubmission)
      await company.save()
    }
  }

  return sanitizeTaskSubmission(taskSubmission)
}

async function getCompanyTaskSubmissions(token) {
  const company = await findCompanyByToken(token)
  const submissions = await TaskSubmission.find({
    companyId: company._id,
  }).sort({ submittedAt: -1, updatedAt: -1 })

  return submissions.map(submission => ({ ...sanitizeTaskSubmission(submission),
    reviewGuide: company.taskReviewGuides?.[`${submission.studentId}:${submission.opportunityId}`] || {},
  }))
}

async function syncCompanyPipelineAfterStudentSubmission(assignment, submission, recordActivity) {
  if (!assignment?.companyId) {
    return
  }

  const company = await Company.findById(assignment.companyId)
  if (!company) {
    return
  }

  const defaultState = buildDefaultCompanyGigManagementState()
  const currentState = sanitizeGigManagementState(company.gigManagementState)
  const nextState = clone(currentState)
  const companySubmissions = await TaskSubmission.find({ companyId: company._id })
  synchronizeCompanyGigMetrics(nextState, companySubmissions)

  const gigIndex = nextState.gigs.findIndex(gig => (
    Number(gig.id) === Number(assignment.companyGigId)
    && (!assignment.companyGigPublicId || assignment.companyGigPublicId === gig.publicId)
  ))
  if (gigIndex !== -1) {
    const currentGig = nextState.gigs[gigIndex]
    const isActiveHire = ['selected', 'work_started', 'delivered', 'completed'].includes(submission.status)
    nextState.gigs[gigIndex] = {
      ...currentGig,
      status: currentGig.status === 'Closed' ? 'Closed' : isActiveHire ? 'In Progress' : 'Reviewing',
    }
  }

  if (recordActivity) {
    const activityGig = nextState.gigs.find(gig => (
      Number(gig.id) === Number(submission.companyGigId)
      && (!submission.companyGigPublicId || submission.companyGigPublicId === gig.publicId)
    ))
    nextState.recentActivity = [
      `${submission.studentName} submitted ${submission.taskTitle || 'the interview task'} for ${activityGig?.title || submission.gigTitle}.`,
      ...nextState.recentActivity,
    ].slice(0, 8)
  }

  company.gigManagementState = reduceTemplateState(nextState, defaultState)
  await company.save()
}

async function startStudentCompanyInterviewTask(token, payload) {
  const student = await findStudentByToken(token)
  const { gigTitle, companyName: requestedCompanyName, opportunityId } = normalizeTaskIdentity(payload)
  const assignment = findAcceptedOpportunity(student, opportunityId, gigTitle, requestedCompanyName)
  const existingSubmission = await TaskSubmission.findOne(buildTaskSubmissionQuery(student._id, assignment)).sort({ updatedAt: -1 })

  if (!existingSubmission) {
    throw buildAuthError('Submit the interview task before starting GIG work', 409)
  }

  if (existingSubmission.status === 'work_started') {
    return sanitizeTaskSubmission(existingSubmission)
  }

  if (existingSubmission.status !== 'selected') {
    throw buildAuthError('The company must select this student before work can start', 409)
  }

  existingSubmission.interviewSubmission = existingSubmission.interviewSubmission || {
    submissionLink: existingSubmission.submissionLink, submissionContent: existingSubmission.submissionContent,
    note: existingSubmission.note, feedback: existingSubmission.feedback, score: existingSubmission.score,
    submittedAt: existingSubmission.submittedAt,
  }
  existingSubmission.submissionLink = ''
  existingSubmission.submissionContent = ''
  existingSubmission.note = ''
  existingSubmission.feedback = ''
  existingSubmission.score = null
  existingSubmission.status = 'work_started'
  existingSubmission.reviewedAt = new Date()
  await saveSubmission(existingSubmission)
  await syncCompanyPipelineAfterStudentSubmission(assignment, existingSubmission, false)

  const company = await Company.findById(assignment.companyId)
  if (company) {
    syncCompanyWorkspaceAfterSubmission(company, existingSubmission)
    await company.save()
  }

  return sanitizeTaskSubmission(existingSubmission)
}

async function reviewCompanyTaskSubmission(token, submissionId, payload) {
  const company = await findCompanyByToken(token)
  const gigManagementState = sanitizeGigManagementState(company.gigManagementState)

  if (!/^[a-f0-9]{24}$/i.test(submissionId)) throw buildAuthError('Invalid submission ID')
  const taskSubmission = await TaskSubmission.findById(submissionId)

  if (!taskSubmission) {
    throw buildAuthError('Task submission not found', 404)
  }

  const ownsGig = gigManagementState.gigs.some(gig => (
    Number(gig.id) === Number(taskSubmission.companyGigId)
    && (!taskSubmission.companyGigPublicId || taskSubmission.companyGigPublicId === gig.publicId)
    && taskSubmission.companyId?.toString() === company._id.toString()
  ))

  if (!ownsGig) {
    throw buildAuthError('You can only review submissions for your own GIGs', 403)
  }

  const requestedStatus = typeof payload?.status === 'string' ? payload.status : ''
  const nextStatus = requestedStatus === 'ready_to_hire' ? 'selected' : requestedStatus
  const previousStatus = taskSubmission.status
  if (payload?.workBrief !== undefined) {
    if (nextStatus !== 'work_started' || previousStatus !== 'selected') throw buildAuthError('Work brief can only be set at kickoff', 409)
    if (typeof payload.workBrief !== 'string' || !payload.workBrief.trim() || payload.workBrief.trim().length > 4000) {
      throw buildAuthError('A work brief of 1 to 4000 characters is required')
    }
    taskSubmission.workBrief = payload.workBrief.trim()
  }
  const feedback = typeof payload?.feedback === 'string' ? payload.feedback.trim() : taskSubmission.feedback || ''
  if (feedback.length > 2000) throw buildAuthError('Feedback must be 2000 characters or fewer')
  const score = payload?.score === undefined ? taskSubmission.score ?? null : payload.score === '' || payload.score === null ? null : Number(payload.score)
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > taskSubmission.taskPoints)) throw buildAuthError('Score must be a whole number between zero and the task maximum')
  if (['rejected', 'needs_revision'].includes(nextStatus) && !feedback) throw buildAuthError('Add feedback for this decision')

  if (!Object.prototype.hasOwnProperty.call(TASK_STATUS_TRANSITIONS, nextStatus)) {
    throw buildAuthError('A valid review status is required')
  }

  if (nextStatus !== previousStatus && ['submitted', 'delivered', 'completed'].includes(nextStatus)) {
    throw buildAuthError('This stage is updated by student submission or payment completion', 409)
  }

  if (previousStatus !== nextStatus && !TASK_STATUS_TRANSITIONS[previousStatus]?.has(nextStatus)) {
    throw buildAuthError(`Cannot move a ${previousStatus} task to ${nextStatus}`, 409)
  }

  if (nextStatus === 'needs_revision' && previousStatus !== 'needs_revision') {
    taskSubmission.revisionReturnStatus = previousStatus === 'delivered' ? 'delivered' : 'submitted'
  }
  if (nextStatus === 'work_started' && previousStatus !== 'work_started') {
    taskSubmission.interviewSubmission = taskSubmission.interviewSubmission || {
      submissionLink: taskSubmission.submissionLink, submissionContent: taskSubmission.submissionContent,
      note: taskSubmission.note, feedback: taskSubmission.feedback, score: taskSubmission.score,
      submittedAt: taskSubmission.submittedAt,
    }
    taskSubmission.submissionLink = ''
    taskSubmission.submissionContent = ''
    taskSubmission.note = ''
  }
  taskSubmission.status = nextStatus
  taskSubmission.feedback = nextStatus === 'work_started' ? '' : feedback
  taskSubmission.score = nextStatus === 'work_started' ? null : score
  taskSubmission.reviewedAt = new Date()


  await saveSubmission(taskSubmission)

  if (previousStatus !== nextStatus) {
    const defaultGigManagementState = buildDefaultCompanyGigManagementState()
    const nextGigManagementState = clone(gigManagementState)
    const gigIndex = nextGigManagementState.gigs.findIndex(gig => Number(gig.id) === Number(taskSubmission.companyGigId))
    const companySubmissions = await TaskSubmission.find({ companyId: company._id })

    synchronizeCompanyGigMetrics(nextGigManagementState, companySubmissions)

    if (gigIndex !== -1) {
      const currentGig = nextGigManagementState.gigs[gigIndex]
      nextGigManagementState.gigs[gigIndex] = {
        ...currentGig,
        status: currentGig.status === 'Closed' ? 'Closed' : ['selected', 'work_started', 'approved', 'completed'].includes(taskSubmission.status) ? 'In Progress' : 'Reviewing',
      }
    }

    const reviewMessage = nextStatus === 'selected'
      ? `${taskSubmission.studentName} was selected for ${taskSubmission.gigTitle}.`
      : nextStatus === 'work_started'
        ? `${taskSubmission.studentName} started work on ${taskSubmission.gigTitle}.`
        : nextStatus === 'approved'
          ? `${taskSubmission.gigTitle} was approved for ${taskSubmission.studentName}; external payment is pending.`
      : nextStatus === 'needs_revision'
        ? `Revision requested from ${taskSubmission.studentName} for ${taskSubmission.gigTitle}.`
        : `${taskSubmission.studentName}'s task was reviewed for ${taskSubmission.gigTitle}.`

    nextGigManagementState.recentActivity = [reviewMessage, ...nextGigManagementState.recentActivity].slice(0, 8)

    company.gigManagementState = reduceTemplateState(nextGigManagementState, defaultGigManagementState)

    if (['selected', 'work_started', 'delivered', 'approved', 'completed'].includes(taskSubmission.status)) {
      syncCompanyWorkspaceAfterSubmission(company, taskSubmission)
    }

    if (taskSubmission.status === 'completed') {
      const student = await Student.findById(taskSubmission.studentId)
      if (student) {
        recordTrustScoreEvent(student, 'gig_completed', taskSubmission._id.toString())
        await student.save()
      }
    }

    await company.save()
  }

  return {
    taskSubmission: sanitizeTaskSubmission(taskSubmission),
    gigManagementState: sanitizeGigManagementState(company.gigManagementState),
    projectWorkspaceState: sanitizeProjectWorkspaceState(company.projectWorkspaceState),
  }
}

module.exports = {
  nextStudentSubmissionStatus,
  buildTaskSubmissionQuery,
  getCompanyTaskSubmissions,
  getStudentCompanyInterviewTask,
  findAcceptedOpportunity,
  normalizeTaskIdentity,
  normalizeSubmissionLink,
  refreshTaskAssignmentMetadata,
  sanitizeTaskDetailsForStudent,
  sendCompanyInterviewTask,
  reviewCompanyTaskSubmission,
  submitStudentCompanyInterviewTask,
  startStudentCompanyInterviewTask,
}
