const crypto = require('crypto')
const mongoose = require('mongoose')
const Reviewer = require('../models/Reviewer')
const SkillAssessment = require('../models/SkillAssessment')
const SkillCatalog = require('../models/SkillCatalog')
const SkillRequest = require('../models/SkillRequest')
const Student = require('../models/Student')
const { CATEGORIES, STAGES, dayKey } = require('../utils/skillPolicy')
const { normalizeSkillName, serializeCatalogSkill, skillSlug } = require('../utils/skillCatalog')
const { hashPassword } = require('../utils/auth')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')

const ADMIN_FIELDS = '_id name email role active sessions'
const findAdmin = async token => {
  const reviewer = await findModelByActiveToken(Reviewer, token, 'Admin', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), ADMIN_FIELDS)
  if (reviewer.role !== 'admin') throw buildAuthError('Administrator access is required.', 403)
  return reviewer
}

function cleanText(value, maxLength, label, { required = false } = {}) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (required && !text) throw buildAuthError(`${label} is required`)
  if (text.length > maxLength) throw buildAuthError(`${label} must be ${maxLength} characters or fewer`)
  return text
}

function normalizeCatalogPayload(payload, current = null) {
  const name = cleanText(payload?.name ?? current?.name, 100, 'Skill name', { required: true })
  const normalizedName = normalizeSkillName(name)
  const category = payload?.category ?? current?.category
  if (!CATEGORIES.includes(category)) throw buildAuthError('Choose a valid skill category')
  let aliasesInput = payload?.aliases ?? current?.aliases ?? []
  if (!Array.isArray(aliasesInput) || aliasesInput.length > 25) throw buildAuthError('Provide up to 25 aliases')
  if (current && normalizeSkillName(current.name) !== normalizedName) aliasesInput = [...aliasesInput, current.name]
  const aliasMap = new Map()
  for (const alias of aliasesInput) {
    const value = cleanText(alias, 100, 'Alias')
    const key = normalizeSkillName(value)
    if (key && key !== normalizedName && !aliasMap.has(key)) aliasMap.set(key, value)
  }
  const aliases = [...aliasMap.values()]
  if (aliases.length > 25) throw buildAuthError('Provide up to 25 aliases, including previous skill names')
  const normalizedAliases = aliases.map(normalizeSkillName)
  const status = payload?.status ?? current?.status ?? 'draft'
  if (!['draft', 'published', 'archived'].includes(status)) throw buildAuthError('Choose a valid catalog status')
  const renewalDays = Number(payload?.renewalDays ?? current?.renewalDays ?? 365)
  if (!Number.isInteger(renewalDays) || renewalDays < 30 || renewalDays > 730) throw buildAuthError('Renewal period must be between 30 and 730 days')
  const stagesInput = payload?.stages ?? current?.stages ?? STAGES
  if (!Array.isArray(stagesInput)) throw buildAuthError('Skill stages are required')
  const stages = STAGES.filter(stage => stagesInput.includes(stage))
  if (!stages.includes('Beginner')) stages.unshift('Beginner')
  if (stages.some((stage, index) => stage !== STAGES[index])) throw buildAuthError('Skill stages must follow Beginner, Intermediate, Pro, then Pro Mastery without gaps')
  const verificationInstructions = cleanText(payload?.verificationInstructions ?? current?.verificationInstructions, 4000, 'Verification instructions')
  const practiceInstructions = cleanText(payload?.practiceInstructions ?? current?.practiceInstructions, 4000, 'Practice instructions')
  if (status === 'published' && verificationInstructions.length < 20) throw buildAuthError('Published skills require clear verification instructions of at least 20 characters')
  const upgradeInput = payload?.upgradeRequirements ?? current?.upgradeRequirements ?? []
  if (!Array.isArray(upgradeInput) || upgradeInput.length > 3) throw buildAuthError('Provide up to three upgrade requirements')
  const upgradeRequirements = []
  const seenStages = new Set()
  for (const item of upgradeInput) {
    if (!STAGES.slice(1).includes(item?.stage) || !stages.includes(item.stage) || seenStages.has(item.stage)) throw buildAuthError('Each enabled upgrade stage may have one requirement')
    seenStages.add(item.stage)
    upgradeRequirements.push({ stage: item.stage, instructions: cleanText(item.instructions, 4000, `${item.stage} requirements`, { required: true }) })
  }
  if (status === 'published') {
    const missingStage = stages.slice(1).find(stage => !seenStages.has(stage))
    if (missingStage) throw buildAuthError(`Published skills require upgrade requirements for ${missingStage}`)
  }
  const taskInput = payload?.dailyTasks ?? current?.dailyTasks ?? []
  if (!Array.isArray(taskInput) || taskInput.length > 50) throw buildAuthError('Provide up to 50 daily tasks')
  const dailyTasks = taskInput.map((item, index) => {
    const kind = item?.kind || 'evidence'
    const reviewMode = item?.reviewMode || 'reviewer'
    if (!['evidence', 'code', 'quiz', 'project'].includes(kind)) throw buildAuthError(`Daily task ${index + 1} has an invalid type`)
    if (reviewMode !== 'reviewer') throw buildAuthError(`Daily task ${index + 1} requires reviewer approval`)
    return { ...(mongoose.isObjectIdOrHexString(item?.id || item?._id) ? { _id: item.id || item._id } : {}),
      title: cleanText(item?.title, 160, `Daily task ${index + 1} title`, { required: true }),
      instructions: cleanText(item?.instructions, 4000, `Daily task ${index + 1} instructions`, { required: true }),
      kind, reviewMode, active: item?.active !== false }
  })
  return { name, normalizedName, normalizedTerms: [normalizedName, ...normalizedAliases], aliases, normalizedAliases, category,
    summary: cleanText(payload?.summary ?? current?.summary, 700, 'Summary'), status, renewalDays, stages,
    verificationInstructions, practiceInstructions, upgradeRequirements, dailyTasks }
}

async function assertCatalogTermsAvailable(values, excludeId = null) {
  const terms = [values.normalizedName, ...values.normalizedAliases]
  const query = { $or: [{ normalizedTerms: { $in: terms } }, { normalizedName: { $in: terms } }, { normalizedAliases: { $in: terms } }] }
  if (excludeId) query._id = { $ne: excludeId }
  if (await SkillCatalog.exists(query)) throw buildAuthError('This skill name or alias is already used by another catalog skill.', 409)
}

function makeSlug(name) {
  const base = skillSlug(name) || 'skill'
  const suffix = crypto.createHash('sha1').update(normalizeSkillName(name)).digest('hex').slice(0, 7)
  return `${base}-${suffix}`
}

async function getAdminOverview(token) {
  const admin = await findAdmin(token)
  const [catalogCounts, pendingRequests, pendingAssessments, activeReviewers] = await Promise.all([
    SkillCatalog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    SkillRequest.countDocuments({ status: 'pending' }),
    SkillAssessment.countDocuments({ status: 'pending' }),
    Reviewer.countDocuments({ active: true, role: 'reviewer' }),
  ])
  const counts = Object.fromEntries(catalogCounts.map(item => [item._id, item.count]))
  return { admin: { id: String(admin._id), name: admin.name, email: admin.email, role: admin.role },
    metrics: { publishedSkills: counts.published || 0, draftSkills: counts.draft || 0, archivedSkills: counts.archived || 0,
      pendingRequests, pendingAssessments, activeReviewers } }
}

async function listAdminSkills(token, filters = {}) {
  await findAdmin(token)
  const query = {}
  if (['draft', 'published', 'archived'].includes(filters.status)) query.status = filters.status
  if (CATEGORIES.includes(filters.category)) query.category = filters.category
  const search = cleanText(filters.search, 100, 'Search')
  if (search) query.$or = [{ name: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { aliases: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }]
  const records = await SkillCatalog.find(query).sort({ status: 1, name: 1 }).limit(500)
  return records.map(item => serializeCatalogSkill(item, { includeDraftFields: true }))
}

async function createAdminSkill(token, payload) {
  const admin = await findAdmin(token)
  const values = normalizeCatalogPayload(payload)
  await assertCatalogTermsAvailable(values)
  const now = new Date()
  try {
    const skill = await SkillCatalog.create({ ...values, slug: makeSlug(values.name), createdBy: admin._id, updatedBy: admin._id,
      publishedAt: values.status === 'published' ? now : null, archivedAt: values.status === 'archived' ? now : null })
    return serializeCatalogSkill(skill, { includeDraftFields: true })
  } catch (error) {
    if (error.code === 11000) throw buildAuthError('This skill name or alias is already used by another catalog skill.', 409)
    throw error
  }
}

async function updateAdminSkill(token, id, payload) {
  const admin = await findAdmin(token)
  if (!mongoose.isObjectIdOrHexString(id)) throw buildAuthError('Invalid catalog skill ID')
  const skill = await SkillCatalog.findById(id)
  if (!skill) throw buildAuthError('Catalog skill not found', 404)
  const values = normalizeCatalogPayload(payload, skill.toObject())
  await assertCatalogTermsAvailable(values, skill._id)
  const previousStatus = skill.status
  Object.assign(skill, values, { updatedBy: admin._id, version: Number(skill.version || 1) + 1 })
  if (values.status === 'published' && previousStatus !== 'published') skill.publishedAt = new Date()
  if (values.status === 'archived' && previousStatus !== 'archived') skill.archivedAt = new Date()
  if (values.status !== 'archived') skill.archivedAt = null
  try { await skill.save() } catch (error) {
    if (error.code === 11000) throw buildAuthError('This skill name or alias is already used by another catalog skill.', 409)
    throw error
  }
  return serializeCatalogSkill(skill, { includeDraftFields: true })
}

function serializeRequest(request) {
  const value = request?.toObject ? request.toObject() : request
  return { id: String(value._id), requestedName: value.requestedName, category: value.category, note: value.note || '', status: value.status,
    matchedSkillId: value.matchedSkillId ? String(value.matchedSkillId) : '', adminFeedback: value.adminFeedback || '',
    createdAt: value.createdAt, decidedAt: value.decidedAt || null }
}

async function listAdminSkillRequests(token, filters = {}) {
  await findAdmin(token)
  const status = ['pending', 'approved', 'rejected', 'merged'].includes(filters.status) ? filters.status : 'pending'
  const requests = await SkillRequest.find({ status }).sort({ createdAt: status === 'pending' ? 1 : -1 }).limit(500)
  return requests.map(serializeRequest)
}

async function decideAdminSkillRequest(token, id, payload) {
  const admin = await findAdmin(token)
  if (!mongoose.isObjectIdOrHexString(id)) throw buildAuthError('Invalid skill request ID')
  const decision = payload?.status
  if (!['approved', 'rejected', 'merged'].includes(decision)) throw buildAuthError('Choose approve, merge, or reject')
  const feedback = cleanText(payload?.feedback, 1000, 'Decision feedback', { required: true })
  const catalogId = payload?.skillCatalogId
  if (decision !== 'rejected' && !mongoose.isObjectIdOrHexString(catalogId)) throw buildAuthError('Choose the published catalog skill for this request')
  return mongoose.connection.transaction(async session => {
    const request = await SkillRequest.findOne({ _id: id, status: 'pending' }).session(session)
    if (!request) throw buildAuthError('This skill request is no longer pending', 409)
    let catalog = null
    if (decision !== 'rejected') {
      catalog = await SkillCatalog.findOne({ _id: catalogId, status: 'published' }).session(session)
      if (!catalog) throw buildAuthError('Choose a published catalog skill', 409)
      const student = await Student.findById(request.studentId).session(session)
      if (!student) throw buildAuthError('Student not found', 404)
      const skills = student.skillHubSkills || []
      const requestedSkill = skills.find(item => normalizeSkillName(item.name) === request.normalizedName)
      const catalogSkill = skills.find(item => String(item.catalogSkillId || '') === String(catalog._id)
        || normalizeSkillName(item.name) === catalog.normalizedName)
      if (requestedSkill && !requestedSkill.verified && catalogSkill && requestedSkill !== catalogSkill) {
        skills.splice(skills.indexOf(requestedSkill), 1)
      } else if (requestedSkill && !requestedSkill.verified) {
        requestedSkill.name = catalog.name
        requestedSkill.category = catalog.category
        requestedSkill.source = 'catalog'
        requestedSkill.catalogSkillId = catalog._id
        requestedSkill.catalogVersion = catalog.version
      } else if (!catalogSkill) {
        student.skillHubSkills.push({ name: catalog.name, category: catalog.category, source: 'catalog', catalogSkillId: catalog._id,
          catalogVersion: catalog.version, createdOn: dayKey() })
      }
      student.skills = [...new Set(student.skillHubSkills.map(item => item.name).filter(Boolean))]
      await student.save({ session })
    }
    Object.assign(request, { status: decision, matchedSkillId: catalog?._id || null, adminFeedback: feedback,
      decidedBy: admin._id, decidedAt: new Date() })
    await request.save({ session })
    return serializeRequest(request)
  })
}

async function listAdminReviewers(token) {
  await findAdmin(token)
  const reviewers = await Reviewer.find({ role: 'reviewer' }).select('_id name email active lastSignedInAt createdAt').sort({ active: -1, name: 1 })
  return reviewers.map(item => ({ id: String(item._id), name: item.name, email: item.email, active: item.active,
    lastSignedInAt: item.lastSignedInAt || null, createdAt: item.createdAt }))
}

async function createAdminReviewer(token, payload) {
  await findAdmin(token)
  const name = cleanText(payload?.name, 100, 'Reviewer name', { required: true })
  const email = cleanText(payload?.email, 160, 'Reviewer email', { required: true }).toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) throw buildAuthError('Provide a valid reviewer email')
  const password = typeof payload?.password === 'string' ? payload.password : ''
  if (password.length < 12 || password.length > 200) throw buildAuthError('Temporary password must contain 12 to 200 characters')
  try {
    const reviewer = await Reviewer.create({ name, email, passwordHash: hashPassword(password), role: 'reviewer', active: true })
    return { id: String(reviewer._id), name: reviewer.name, email: reviewer.email, active: reviewer.active,
      lastSignedInAt: null, createdAt: reviewer.createdAt }
  } catch (error) {
    if (error.code === 11000) throw buildAuthError('A reviewer account already uses this email.', 409)
    throw error
  }
}

async function updateAdminReviewer(token, id, payload) {
  await findAdmin(token)
  if (!mongoose.isObjectIdOrHexString(id)) throw buildAuthError('Invalid reviewer ID')
  if (typeof payload?.active !== 'boolean') throw buildAuthError('Choose whether this reviewer is active')
  return mongoose.connection.transaction(async session => {
    const reviewer = await Reviewer.findOne({ _id: id, role: 'reviewer' }).select('+sessions').session(session)
    if (!reviewer) throw buildAuthError('Reviewer not found', 404)
    reviewer.active = payload.active
    if (!payload.active) {
      reviewer.sessions = []
      await SkillAssessment.updateMany({ status: 'pending', assignedReviewerId: reviewer._id },
        { $set: { assignedReviewerId: null, assignedReviewerName: '', claimedAt: null } }, { session })
    }
    await reviewer.save({ session })
    return { id: String(reviewer._id), name: reviewer.name, email: reviewer.email, active: reviewer.active,
      lastSignedInAt: reviewer.lastSignedInAt || null, createdAt: reviewer.createdAt }
  })
}

module.exports = { createAdminReviewer, createAdminSkill, decideAdminSkillRequest, getAdminOverview, listAdminReviewers,
  listAdminSkillRequests, listAdminSkills, normalizeCatalogPayload, updateAdminReviewer, updateAdminSkill }
