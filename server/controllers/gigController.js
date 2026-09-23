const Student = require('../models/Student')
const Company = require('../models/Company')
const TaskSubmission = require('../models/TaskSubmission')
const { buildDefaultGigState } = require('../config/gigDefaults')
const { buildDefaultCompanyGigManagementState } = require('../config/companyGigDefaults')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { mergeTemplateState, reduceTemplateState } = require('../utils/templateState')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { publishedSkillNames } = require('../utils/skillPolicy')
const { demoStudentGigState } = require('../config/showcaseFixtures')
const { saveDocumentsAtomically } = require('../utils/transaction')

const GIG_STUDENT_FIELDS = '_id sessions name location trustScore skills skillHubSkills projects.name gigState'

async function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), GIG_STUDENT_FIELDS)
}

function buildManagedGigId(companyId, gigIdentity) {
  const source = `${companyId}:${gigIdentity}`
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

function toPlainGigStateItem(item) {
  return item && typeof item.toObject === 'function' ? item.toObject() : item
}

function hasPersistedCompanyId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ''))
}

async function findExistingCompanyIds(companyIds) {
  const ids = [...new Set(companyIds.filter(hasPersistedCompanyId).map(String))]
  if (!ids.length) return new Set()
  const companies = await Company.find({ _id: { $in: ids } }).select('_id').lean()
  return new Set(companies.map(company => String(company._id)))
}

function normalizeOpportunityStatusOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(Object.entries(value).filter(([id, status]) => (
    Number.isInteger(Number(id))
    && Number(id) > 0
    && typeof status === 'string'
  )))
}

function sanitizeStudentTaskDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return {}
  }

  const safeDetails = Object.fromEntries(Object.entries(details)
    .filter(([key, value]) => (
      ['deliverables', 'acceptanceCriteria', 'submissionRequirements', 'language', 'testCases',
        'questionCount', 'questions', 'options', 'optionsAndAnswers', 'passingScore', 'wordLimit',
        'evaluationCriteria', 'components'].includes(key)
      && (typeof value === 'string' || typeof value === 'number')
    ))
    .map(([key, value]) => [key, String(value).trim().slice(0, 2000)])
    .filter(([, value]) => value))

  delete safeDetails.answerKey

  delete safeDetails.optionsAndAnswers

  return safeDetails
}

function compactGigStateMedia(gigState) {
  const companyLogos = []
  const logoIndexes = new Map()
  const collections = ['opportunities', 'browseGigs', 'appliedGigs', 'activeGigBase', 'completedGigs']
  const compacted = { ...gigState }

  for (const collection of collections) {
    if (!Array.isArray(gigState?.[collection])) continue
    compacted[collection] = gigState[collection].map(item => {
      const logo = typeof item?.companyLogo === 'string' ? item.companyLogo : ''
      if (logo.length < 2048) return item
      if (!logoIndexes.has(logo)) {
        logoIndexes.set(logo, companyLogos.length)
        companyLogos.push(logo)
      }
      const { companyLogo, ...rest } = item
      return { ...rest, companyLogoRef: logoIndexes.get(logo) }
    })
  }

  return companyLogos.length ? { ...compacted, companyLogos } : compacted
}

function incrementLabeledValue(items, label, delta) {
  return items.map(item => item.label === label
    ? { ...item, value: String(Math.max(0, (Number(item.value) || 0) + delta)) }
    : item)
}

async function buildCompanyManagedGigs(student) {
  // Listing GIGs must never load company descriptions, contact data, or an
  // uploaded introduction video. Those are fetched only after View Company.
  // Skip companies with no browsable listing before pulling their embedded
  // GIG/applicant state. This keeps the student browse endpoint fast as the
  // number of registered companies grows.
  const companies = await Company.find({
    'gigManagementState.gigs': { $elemMatch: { status: { $in: ['Hiring', 'Reviewing', 'In Progress'] } } },
  })
    .select('_id businessName location businessProfile.logo businessProfile.location gigManagementState.gigs gigManagementState.applicantsByGig')
    .lean()
  const studentSkills = publishedSkillNames(student.skills, student.skillHubSkills)
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
      const applicants = Array.isArray(state.applicantsByGig?.[gig.id])
        ? state.applicantsByGig[gig.id]
        : []
      const isApplied = applicants.some(applicant => (
        String(applicant?.studentId || applicant?.id || '') === String(student._id)
      ))
      managedGigs.push({
        id: buildManagedGigId(
          company._id.toString(),
          gig.publicId || gig.createdAt || `${gig.id}:${gig.title}`,
        ),
        sourceCompanyId: company._id.toString(),
        sourceGigId: Number(gig.id),
        sourceGigPublicId: gig.publicId || '',
        company: company.businessName,
        companyLogo: typeof company.businessProfile?.logo === 'string' ? company.businessProfile.logo : '',
        location: gig.location || company.businessProfile?.location || company.location || 'Location not specified',
        workMode: gig.mode || 'Remote',
        title: gig.title,
        type: gig.type || 'Internship',
        budget: gig.budget || 'Compensation discussed with company',
        tags,
        match: calculateGigMatch(tags, studentSkills),
        posted: gig.postedOn || 'Recently posted',
        progress: gig.status === 'In Progress' ? 'Hiring in progress' : '',
        isApplied,
      })
    })
  })

  return managedGigs
}

function buildBridgeActiveGig(opportunity) {
  return {
    id: 800 + opportunity.id,
    opportunityId: opportunity.id,
    companyGigId: opportunity.companyGigId,
    companyGigPublicId: opportunity.companyGigPublicId || '',
    company: opportunity.company,
    companyLogo: opportunity.companyLogo || '',
    location: opportunity.location,
    workMode: opportunity.location === 'Remote' ? 'Remote' : 'Hybrid',
    title: opportunity.title,
    budget: opportunity.stipend,
    tags: Array.isArray(opportunity.matchedSkills) ? opportunity.matchedSkills : [],
    posted: 'Task bridge activated',
    progress: opportunity.taskSubmissionStatus === 'selected'
      ? 'Selected for this GIG'
      : opportunity.taskSubmissionStatus === 'work_started'
        ? 'Work started'
        : opportunity.taskSubmissionStatus === 'delivered'
          ? 'Work delivered for review'
          : 'Company reviewed your interview task',
    bridgeStatus: opportunity.taskSubmissionStatus,
  }
}

function buildBridgeCompletedGig(opportunity) {
  return {
    ...buildBridgeActiveGig(opportunity),
    posted: opportunity.externalPayment ? 'Completed with an external payment record' : 'Completed',
    completedOn: opportunity.completedAt ? new Date(opportunity.completedAt).toISOString().slice(0, 10) : '',
    bridgeStatus: 'completed',
  }
}

async function buildGigState(student) {
  const defaults = buildDefaultGigState()
  const [managedGigs, taskSubmissions] = await Promise.all([
    buildCompanyManagedGigs(student),
    TaskSubmission.find({ studentId: student._id }).sort({ updatedAt: -1 }),
  ])
  const storedOpportunities = Array.isArray(student.gigState?.opportunities)
    ? student.gigState.opportunities.map(toPlainGigStateItem)
    : []
  const savedGigIds = Array.isArray(student.gigState?.savedGigIds)
    ? student.gigState.savedGigIds.map(Number).filter(Number.isFinite)
    : defaults.savedGigIds
  const appliedGigIds = Array.isArray(student.gigState?.appliedGigIds)
    ? student.gigState.appliedGigIds.map(Number).filter(Number.isFinite)
    : defaults.appliedGigIds
  const storedAppliedGigs = Array.isArray(student.gigState?.appliedGigs)
    ? student.gigState.appliedGigs.map(toPlainGigStateItem).filter(item => Number.isFinite(Number(item?.id)))
    : []
  // An account can occasionally be removed directly from MongoDB, bypassing
  // the account-deletion endpoint and its dependent-record cleanup. Do not
  // expose those orphaned applications or invitations to a student.
  const referencedCompanyIds = [
    ...storedOpportunities.map(item => item?.companyId),
    ...storedAppliedGigs.map(item => item?.sourceCompanyId || item?.companyId),
  ]
  const existingCompanyIds = await findExistingCompanyIds(referencedCompanyIds)
  const belongsToDeletedCompany = item => {
    const companyId = item?.companyId || item?.sourceCompanyId
    return hasPersistedCompanyId(companyId) && !existingCompanyIds.has(String(companyId))
  }
  const liveStoredOpportunities = storedOpportunities.filter(item => !belongsToDeletedCompany(item))
  const liveStoredAppliedGigs = storedAppliedGigs.filter(item => !belongsToDeletedCompany(item))
  const removedAppliedGigIds = new Set(
    storedAppliedGigs
      .filter(belongsToDeletedCompany)
      .map(item => Number(item.id)),
  )
  const appliedManagedGigIds = managedGigs
    .filter(gig => gig.isApplied)
    .map(gig => Number(gig.id))
    .filter(Number.isFinite)
  const legacyStatuses = liveStoredOpportunities.reduce((acc, item) => {
      if (item && Number.isFinite(Number(item.id)) && typeof item.status === 'string') {
        acc[item.id] = item.status
      }
      return acc
    }, {})
  const statusOverrides = {
    ...legacyStatuses,
    ...normalizeOpportunityStatusOverrides(student.gigState?.opportunityStatusById),
  }
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

  const storedById = new Map(liveStoredOpportunities.map(item => [Number(item.id), item]))
  const defaultOpportunityIds = new Set(defaults.opportunities.map(item => item.id))
  const normalizedStoredOpportunities = liveStoredOpportunities
    .map(item => {
      const managedGig = managedGigs.find(gig => (
        String(gig.sourceCompanyId || '') === String(item.companyId || '')
        && Number(gig.sourceGigId) === Number(item.companyGigId)
        && (item.companyGigPublicId
          ? item.companyGigPublicId === gig.sourceGigPublicId
          : !gig.sourceGigPublicId)
      ))

      if (item.companyId || item.companyGigId != null) {
        // Keep invitation status and tasks, but refresh public company and role metadata.
        return {
          ...item,
          title: managedGig?.title || item.title || '',
          company: managedGig?.company || item.company || '',
          companyLogo: managedGig?.companyLogo || item.companyLogo || '',
          location: managedGig?.location || item.location || '',
          stipend: managedGig?.budget || item.stipend || '',
          type: managedGig?.type || item.type || 'Interview Task',
          matchedSkills: managedGig?.tags?.length > 0 ? managedGig.tags : (Array.isArray(item.matchedSkills) ? item.matchedSkills : []),
          message: item.message || (managedGig
            ? `${managedGig.company} invited you to complete an interview task for ${managedGig.title}.`
            : ''),
          companyGigPublicId: item.companyGigPublicId || managedGig?.sourceGigPublicId || '',
        }
      }

      return item.title && item.company
        ? { ...item, taskDetails: sanitizeStudentTaskDetails(item.taskDetails) }
        : null
    })
    .filter(Boolean)
  const opportunities = [
    ...defaults.opportunities,
    ...normalizedStoredOpportunities.filter(item => !defaultOpportunityIds.has(Number(item.id))),
  ].map(item => ({
    ...item,
    ...(defaultOpportunityIds.has(Number(item.id)) ? (storedById.get(Number(item.id)) || {}) : {}),
    status: typeof statusOverrides[item.id] === 'string' ? statusOverrides[item.id] : item.status,
    taskDetails: sanitizeStudentTaskDetails(
      defaultOpportunityIds.has(Number(item.id))
        ? (storedById.get(Number(item.id))?.taskDetails || item.taskDetails)
        : item.taskDetails,
    ),
  })).map(item => {
    const candidate = submissionsByOpportunityId.get(Number(item.id))
    const linkedSubmission = item.companyId && item.companyGigId != null
      ? (candidate && String(candidate.companyId) === String(item.companyId)
        && Number(candidate.companyGigId) === Number(item.companyGigId)
        && (!candidate.companyGigPublicId || candidate.companyGigPublicId === item.companyGigPublicId) ? candidate : null)
      : candidate || submissionsByGigTitle.get(item.title)

    if (!linkedSubmission) {
      return item
    }

    return {
      ...item,
      status: item.status === 'declined' ? item.status : 'accepted',
      taskSubmissionStatus: linkedSubmission.status,
      revisionReturnStatus: linkedSubmission.revisionReturnStatus || 'submitted',
      companyFeedback: linkedSubmission.feedback || '',
      submissionLink: linkedSubmission.submissionLink || '',
      score: linkedSubmission.score ?? null,
      externalPayment: linkedSubmission.externalPayment || null,
      completedAt: linkedSubmission.completedAt || null,
    }
  })

  const bridgeActiveGigs = opportunities
    .filter(item => ['selected', 'work_started', 'delivered', 'approved', 'ready_to_hire'].includes(item.taskSubmissionStatus)
      || (item.taskSubmissionStatus === 'needs_revision' && item.revisionReturnStatus === 'delivered'))
    .map(buildBridgeActiveGig)
  const bridgeCompletedGigs = opportunities
    .filter(item => item.taskSubmissionStatus === 'completed')
    .map(buildBridgeCompletedGig)

  const storedActiveGigs = Array.isArray(student.gigState?.activeGigBase) ? student.gigState.activeGigBase.filter(item => !item.bridgeStatus) : []
  const storedCompletedGigs = Array.isArray(student.gigState?.completedGigs) ? student.gigState.completedGigs.filter(item => !item.bridgeStatus) : []

  return {
    opportunities,
    browseGigs: [...defaults.browseGigs, ...managedGigs],
    savedGigIds,
    appliedGigIds: [...new Set([...appliedGigIds.filter(id => !removedAppliedGigIds.has(id)), ...appliedManagedGigIds])],
    appliedGigs: mergeUniqueGigs([
      ...liveStoredAppliedGigs,
      ...[...defaults.browseGigs, ...managedGigs].filter(gig => appliedGigIds.includes(Number(gig.id)) || gig.isApplied),
    ]),
    activeGigBase: mergeUniqueGigs([...bridgeActiveGigs, ...storedActiveGigs, ...defaults.activeGigBase]),
    completedGigs: mergeUniqueGigs([...bridgeCompletedGigs, ...storedCompletedGigs, ...defaults.completedGigs]),
  }
}

function persistGigState(student, gigState) {
  const defaults = buildDefaultGigState()
  const defaultStatuses = new Map(defaults.opportunities.map(item => [item.id, item.status]))
  const opportunities = Array.isArray(gigState.opportunities)
    ? gigState.opportunities.map(toPlainGigStateItem)
    : []
  const opportunityStatusById = opportunities.reduce((acc, item) => {
    if (!item || !Number.isInteger(Number(item.id)) || Number(item.id) < 1) {
      return acc
    }

    const defaultStatus = defaultStatuses.get(item.id)
    if (item.status && item.status !== defaultStatus) {
      acc[item.id] = item.status
    }
    return acc
  }, {})

  const nextState = {
    opportunities,
    savedGigIds: gigState.savedGigIds,
    appliedGigIds: gigState.appliedGigIds,
    appliedGigs: gigState.appliedGigs,
    opportunityStatusById,
    activeGigBase: gigState.activeGigBase.filter(item => !item.bridgeStatus),
    completedGigs: gigState.completedGigs.filter(item => !item.bridgeStatus),
  }

  student.gigState = reduceTemplateState(nextState, {
    savedGigIds: defaults.savedGigIds,
    appliedGigIds: defaults.appliedGigIds,
    appliedGigs: defaults.appliedGigs,
    opportunityStatusById: {},
    activeGigBase: defaults.activeGigBase,
    completedGigs: defaults.completedGigs,
  })
}

function mergeGigStateWithDemo(real) {
  const demo = demoStudentGigState()
  return {
    ...real,
    opportunities: [...real.opportunities, ...demo.opportunities],
    browseGigs: mergeUniqueGigs([...real.browseGigs, ...demo.browseGigs]),
    savedGigIds: [...new Set([...real.savedGigIds, ...demo.savedGigIds])],
    appliedGigIds: [...new Set([...real.appliedGigIds, ...demo.appliedGigIds])],
    appliedGigs: mergeUniqueGigs([...real.appliedGigs, ...demo.appliedGigs]),
    activeGigBase: mergeUniqueGigs([...real.activeGigBase, ...demo.activeGigBase]),
    completedGigs: mergeUniqueGigs([...real.completedGigs, ...demo.completedGigs]),
  }
}

async function getStudentGigState(token) {
  const student = await findStudentByToken(token)
  return mergeGigStateWithDemo(await buildGigState(student))
}

async function applyToGig(token, gigId) {
  const student = await findStudentByToken(token)
  const gigState = await buildGigState(student)
  let applicantCompany = null

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
    gigState.appliedGigs = mergeUniqueGigs([...(gigState.appliedGigs || []), appliedGig])

    if (appliedGig?.sourceCompanyId && Number.isFinite(appliedGig.sourceGigId)) {
      const company = await Company.findById(appliedGig.sourceCompanyId)
      if (company) {
        const companyState = mergeTemplateState(
          buildDefaultCompanyGigManagementState(),
          company.gigManagementState,
        )
        const companyGig = companyState.gigs.find(gig => Number(gig.id) === appliedGig.sourceGigId)
        if (companyGig) {
          companyState.applicantsByGig = companyState.applicantsByGig || {}
          const applicants = Array.isArray(companyState.applicantsByGig[appliedGig.sourceGigId])
            ? companyState.applicantsByGig[appliedGig.sourceGigId]
            : []
          const studentId = student._id.toString()

          const isNewApplicant = !applicants.some(applicant => applicant.studentId === studentId)
          if (isNewApplicant) {
            companyGig.applicants = (Number(companyGig.applicants) || 0) + 1
            companyState.applicantsByGig[appliedGig.sourceGigId] = [
              ...applicants,
              {
                id: studentId,
                studentId,
                name: student.name,
                location: student.location || '',
                trustScore: Number(student.trustScore) || 0,
                skills: publishedSkillNames(student.skills, student.skillHubSkills),
                projects: Array.isArray(student.projects) ? student.projects.map(project => project.name).filter(Boolean) : [],
              },
            ]
            companyState.stats = incrementLabeledValue(companyState.stats, 'Applications', 1)
            companyState.pipeline = incrementLabeledValue(companyState.pipeline, 'New Applications', 1)
          }
          company.gigManagementState = companyState
          applicantCompany = company
        }
      }
    }
  }

  persistGigState(student, gigState)
  await saveDocumentsAtomically([applicantCompany, student])
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

  const normalizedOpportunityId = String(opportunityId)
  const opportunity = gigState.opportunities.find(item => String(item.id) === normalizedOpportunityId)

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

  const normalizedOpportunityId = String(opportunityId)
  const opportunity = gigState.opportunities.find(item => String(item.id) === normalizedOpportunityId)

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
  buildManagedGigId,
  buildGigState,
  acceptOpportunity,
  applyToGig,
  calculateGigMatch,
  compactGigStateMedia,
  declineOpportunity,
  getStudentGigState,
  isBrowsableGigStatus,
  mergeGigStateWithDemo,
  saveGig,
  unsaveGig,
}
