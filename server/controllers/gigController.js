const Student = require('../models/Student')
const Company = require('../models/Company')
const TaskSubmission = require('../models/TaskSubmission')
const { buildDefaultGigState } = require('../config/gigDefaults')
const { buildDefaultCompanyGigManagementState } = require('../config/companyGigDefaults')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { mergeTemplateState, reduceTemplateState } = require('../utils/templateState')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')

async function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
}

function buildManagedGigId(companyId, gigId) {
  const source = `${companyId}:${gigId}`
  let hash = 0

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index)
    hash |= 0
  }

  return 100000 + (Math.abs(hash) % 899000)
}

function isBrowsableGigStatus(status) {
  return ['Hiring', 'Reviewing', 'In Progress'].includes(String(status || ''))
}

function calculateGigMatch(tags, studentSkills) {
  const normalizedStudentSkills = new Set(studentSkills.map(skill => String(skill).trim().toLowerCase()))
  const matchedCount = tags.filter(tag => normalizedStudentSkills.has(String(tag).trim().toLowerCase())).length
  return tags.length > 0 ? Math.round((matchedCount / tags.length) * 100) : 0
}

function mergeUniqueGigs(gigs) {
  const byId = new Map()
  gigs.forEach(gig => {
    if (gig && gig.id !== undefined && gig.id !== null && !byId.has(String(gig.id))) {
      byId.set(String(gig.id), gig)
    }
  })
  return [...byId.values()]
}

function incrementLabeledValue(items, label, delta) {
  return items.map(item => item.label === label
    ? { ...item, value: String(Math.max(0, (Number(item.value) || 0) + delta)) }
    : item)
}

async function buildCompanyManagedGigs(student) {
  const companies = await Company.find().select('_id businessName location businessProfile gigManagementState').lean()
  const studentSkills = [
    ...(Array.isArray(student.skills) ? student.skills : []),
    ...(Array.isArray(student.skillHubSkills) ? student.skillHubSkills.map(skill => skill?.name) : []),
  ].filter(Boolean)
  const managedGigs = []

  companies.forEach(company => {
    const state = mergeTemplateState(
      buildDefaultCompanyGigManagementState(),
      company.gigManagementState,
    )
    const gigs = Array.isArray(state.gigs) ? state.gigs : []

    gigs.forEach(gig => {
      if (!gig?.title || !isBrowsableGigStatus(gig.status)) {
        return
      }

      const tags = Array.isArray(gig.skills) ? gig.skills : []
      managedGigs.push({
        id: buildManagedGigId(company._id.toString(), gig.id),
        sourceCompanyId: company._id.toString(),
        sourceGigId: Number(gig.id),
        company: company.businessName,
        location: company.businessProfile?.location || company.location || gig.mode || 'Remote',
        workMode: gig.mode || 'Remote',
        title: gig.title,
        budget: gig.budget || 'Compensation discussed with company',
        tags,
        match: calculateGigMatch(tags, studentSkills),
        posted: gig.postedOn || 'Recently posted',
        progress: gig.status === 'In Progress' ? 'Hiring in progress' : '',
      })
    })
  })

  return managedGigs
}

function buildBridgeActiveGig(opportunity) {
  const statusCopy = {
    reviewed: 'Company reviewed your interview task',
    selected: 'Company selected you for this GIG',
    work_started: 'Work has started',
    delivered: 'Work delivered and awaiting approval',
    approved: 'Company approved your work',
  }
  return {
    id: 800 + opportunity.id,
    company: opportunity.company,
    location: opportunity.location,
    workMode: opportunity.location === 'Remote' ? 'Remote' : 'Hybrid',
    title: opportunity.title,
    budget: opportunity.stipend,
    tags: Array.isArray(opportunity.matchedSkills) ? opportunity.matchedSkills : [],
    posted: 'Task bridge activated',
    progress: statusCopy[opportunity.taskSubmissionStatus] || 'Company reviewed your interview task',
    bridgeStatus: opportunity.taskSubmissionStatus,
  }
}

async function buildGigState(student) {
  const defaults = buildDefaultGigState()
  const managedGigs = await buildCompanyManagedGigs(student)
  const savedGigIds = Array.isArray(student.gigState?.savedGigIds)
    ? student.gigState.savedGigIds.map(Number).filter(Number.isFinite)
    : defaults.savedGigIds
  const appliedGigIds = Array.isArray(student.gigState?.appliedGigIds)
    ? student.gigState.appliedGigIds.map(Number).filter(Number.isFinite)
    : defaults.appliedGigIds
  const legacyStatuses = Array.isArray(student.gigState?.opportunities)
    ? student.gigState.opportunities.reduce((acc, item) => {
      if (item && Number.isFinite(Number(item.id)) && typeof item.status === 'string') {
        acc[item.id] = item.status
      }
      return acc
    }, {})
    : {}
  const statusOverrides = student.gigState?.opportunityStatusById && typeof student.gigState.opportunityStatusById === 'object'
    ? { ...legacyStatuses, ...student.gigState.opportunityStatusById }
    : legacyStatuses
  const taskSubmissions = await TaskSubmission.find({ studentId: student._id }).sort({ updatedAt: -1 })
  const submissionsByOpportunityId = new Map()
  const submissionsByGigTitle = new Map()

  taskSubmissions.forEach(submission => {
    if (Number.isFinite(Number(submission.opportunityId)) && !submissionsByOpportunityId.has(Number(submission.opportunityId))) {
      submissionsByOpportunityId.set(Number(submission.opportunityId), submission)
    }

    if (submission.gigTitle && !submissionsByGigTitle.has(submission.gigTitle)) {
      submissionsByGigTitle.set(submission.gigTitle, submission)
    }
  })

  const storedOpportunities = Array.isArray(student.gigState?.opportunities)
    ? student.gigState.opportunities
    : []
  const storedById = new Map(storedOpportunities.map(item => [Number(item.id), item]))
  const defaultOpportunityIds = new Set(defaults.opportunities.map(item => item.id))
  const opportunities = [
    ...defaults.opportunities,
    ...storedOpportunities.filter(item => !defaultOpportunityIds.has(Number(item.id))),
  ].map(item => ({
    ...item,
    ...(storedById.get(item.id) || {}),
    status: typeof statusOverrides[item.id] === 'string' ? statusOverrides[item.id] : item.status,
  })).map(item => {
    const linkedSubmission = submissionsByOpportunityId.get(item.id) || submissionsByGigTitle.get(item.title)

    if (!linkedSubmission) {
      return item
    }

    return {
      ...item,
      taskSubmissionStatus: linkedSubmission.status,
      companyFeedback: linkedSubmission.feedback || '',
      submissionLink: linkedSubmission.submissionLink || '',
    }
  })

  const bridgeActiveGigs = opportunities
    .filter(item => ['reviewed', 'selected', 'work_started', 'delivered', 'approved', 'ready_to_hire'].includes(item.taskSubmissionStatus))
    .map(buildBridgeActiveGig)

  const storedActiveGigs = Array.isArray(student.gigState?.activeGigBase) ? student.gigState.activeGigBase : []
  const storedCompletedGigs = Array.isArray(student.gigState?.completedGigs) ? student.gigState.completedGigs : []
  const completedTaskGigs = opportunities
    .filter(item => item.taskSubmissionStatus === 'completed')
    .map(item => ({
      id: 900 + Number(item.id),
      company: item.company,
      location: item.location,
      workMode: item.location === 'Remote' ? 'Remote' : 'Hybrid',
      title: item.title,
      budget: item.stipend,
      tags: Array.isArray(item.matchedSkills) ? item.matchedSkills : [],
      posted: 'Completed GIG',
      progress: 'Company approved your completed work',
      bridgeStatus: 'completed',
    }))

  return {
    opportunities,
    browseGigs: [...defaults.browseGigs, ...managedGigs],
    savedGigIds,
    appliedGigIds,
    activeGigBase: mergeUniqueGigs([...bridgeActiveGigs, ...storedActiveGigs, ...defaults.activeGigBase]),
    completedGigs: mergeUniqueGigs([...completedTaskGigs, ...storedCompletedGigs, ...defaults.completedGigs]),
  }
}

function persistGigState(student, gigState) {
  const defaults = buildDefaultGigState()
  const defaultStatuses = new Map(defaults.opportunities.map(item => [item.id, item.status]))
  const opportunityStatusById = gigState.opportunities.reduce((acc, item) => {
    const defaultStatus = defaultStatuses.get(item.id)
    if (item.status && item.status !== defaultStatus) {
      acc[item.id] = item.status
    }
    return acc
  }, {})

  const nextState = {
    opportunities: gigState.opportunities,
    savedGigIds: gigState.savedGigIds,
    appliedGigIds: gigState.appliedGigIds,
    opportunityStatusById,
    activeGigBase: gigState.activeGigBase,
    completedGigs: gigState.completedGigs,
  }

  student.gigState = reduceTemplateState(nextState, {
    savedGigIds: defaults.savedGigIds,
    appliedGigIds: defaults.appliedGigIds,
    opportunityStatusById: {},
    activeGigBase: defaults.activeGigBase,
    completedGigs: defaults.completedGigs,
  })
}

async function getStudentGigState(token) {
  const student = await findStudentByToken(token)
  return buildGigState(student)
}

async function applyToGig(token, gigId) {
  const student = await findStudentByToken(token)
  const gigState = await buildGigState(student)

  const numericGigId = Number(gigId)
  const gigExists = gigState.browseGigs.some(gig => gig.id === numericGigId)

  if (!gigExists) {
    throw buildAuthError('GIG not found', 404)
  }

  const appliedGig = gigState.browseGigs.find(gig => gig.id === numericGigId)

  if (!gigState.appliedGigIds.includes(numericGigId)) {
    consumeSectionOperation(
      student,
      'gig-center',
      'GIG Center',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
    gigState.appliedGigIds.push(numericGigId)

    if (appliedGig?.sourceCompanyId && Number.isFinite(appliedGig.sourceGigId)) {
      const company = await Company.findById(appliedGig.sourceCompanyId)
      if (company) {
        const companyState = mergeTemplateState(
          buildDefaultCompanyGigManagementState(),
          company.gigManagementState,
        )
        const companyGig = companyState.gigs.find(gig => Number(gig.id) === appliedGig.sourceGigId)
        if (companyGig) {
          companyGig.applicants = (Number(companyGig.applicants) || 0) + 1
          companyState.applicantsByGig = companyState.applicantsByGig || {}
          const applicants = Array.isArray(companyState.applicantsByGig[appliedGig.sourceGigId])
            ? companyState.applicantsByGig[appliedGig.sourceGigId]
            : []
          const studentId = student._id.toString()

          const isNewApplicant = !applicants.some(applicant => applicant.studentId === studentId)
          if (isNewApplicant) {
            companyState.applicantsByGig[appliedGig.sourceGigId] = [
              ...applicants,
              {
                id: studentId,
                studentId,
                name: student.name,
                location: student.location || '',
                trustScore: Number(student.trustScore) || 0,
                skills: [...new Set([
                  ...(Array.isArray(student.skills) ? student.skills : []),
                  ...(Array.isArray(student.skillHubSkills) ? student.skillHubSkills.map(skill => skill?.name) : []),
                ].filter(Boolean))],
                projects: Array.isArray(student.projects) ? student.projects.map(project => project.name).filter(Boolean) : [],
              },
            ]
            companyState.stats = incrementLabeledValue(companyState.stats, 'Applications', 1)
            companyState.pipeline = incrementLabeledValue(companyState.pipeline, 'New Applications', 1)
          }
          company.gigManagementState = companyState
          await company.save()
        }
      }
    }
  }

  persistGigState(student, gigState)
  await student.save()
  return gigState
}

async function saveGig(token, gigId) {
  const student = await findStudentByToken(token)
  const gigState = await buildGigState(student)

  const numericGigId = Number(gigId)
  const gigExists = gigState.browseGigs.some(gig => gig.id === numericGigId)

  if (!gigExists) {
    throw buildAuthError('GIG not found', 404)
  }

  if (!gigState.savedGigIds.includes(numericGigId)) {
    consumeSectionOperation(
      student,
      'gig-center',
      'GIG Center',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
    gigState.savedGigIds.push(numericGigId)
  }

  persistGigState(student, gigState)
  await student.save()
  return gigState
}

async function unsaveGig(token, gigId) {
  const student = await findStudentByToken(token)
  const gigState = await buildGigState(student)

  const numericGigId = Number(gigId)
  if (!gigState.browseGigs.some(gig => gig.id === numericGigId)) {
    throw buildAuthError('GIG not found', 404)
  }
  const wasSaved = gigState.savedGigIds.includes(numericGigId)

  if (wasSaved) {
    consumeSectionOperation(
      student,
      'gig-center',
      'GIG Center',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
  }

  gigState.savedGigIds = gigState.savedGigIds.filter(id => id !== numericGigId)

  persistGigState(student, gigState)
  await student.save()
  return gigState
}

async function acceptOpportunity(token, opportunityId) {
  const student = await findStudentByToken(token)
  const gigState = await buildGigState(student)

  const numericOpportunityId = Number(opportunityId)
  const opportunity = gigState.opportunities.find(item => item.id === numericOpportunityId)

  if (!opportunity) {
    throw buildAuthError('Opportunity not found', 404)
  }

  if (opportunity.status === 'declined') {
    throw buildAuthError('A declined opportunity cannot be accepted again', 409)
  }

  if (opportunity.status !== 'accepted') {
    consumeSectionOperation(
      student,
      'gig-center',
      'GIG Center',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
    opportunity.status = 'accepted'
  }
  persistGigState(student, gigState)
  await student.save()
  return gigState
}

async function declineOpportunity(token, opportunityId) {
  const student = await findStudentByToken(token)
  const gigState = await buildGigState(student)

  const numericOpportunityId = Number(opportunityId)
  const opportunity = gigState.opportunities.find(item => item.id === numericOpportunityId)

  if (!opportunity) {
    throw buildAuthError('Opportunity not found', 404)
  }

  if (opportunity.status === 'accepted') {
    throw buildAuthError('An accepted opportunity cannot be declined', 409)
  }

  if (opportunity.status !== 'declined') {
    consumeSectionOperation(
      student,
      'gig-center',
      'GIG Center',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
    opportunity.status = 'declined'
  }
  persistGigState(student, gigState)
  await student.save()
  return gigState
}

module.exports = {
  acceptOpportunity,
  applyToGig,
  calculateGigMatch,
  declineOpportunity,
  getStudentGigState,
  isBrowsableGigStatus,
  saveGig,
  unsaveGig,
}
