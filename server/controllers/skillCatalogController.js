const SkillCatalog = require('../models/SkillCatalog')
const SkillRequest = require('../models/SkillRequest')
const Student = require('../models/Student')
const { CATEGORIES } = require('../utils/skillPolicy')
const { normalizeSkillName, serializeCatalogSkill } = require('../utils/skillCatalog')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')

const STUDENT_FIELDS = '_id sessions skillHubSkills'
const findStudent = token => findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), STUDENT_FIELDS)

async function listPublishedSkillCatalog(token, filters = {}) {
  await findStudent(token)
  const query = { status: 'published' }
  if (CATEGORIES.includes(filters.category)) query.category = filters.category
  const search = typeof filters.search === 'string' ? filters.search.trim().slice(0, 100) : ''
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [{ name: new RegExp(escaped, 'i') }, { aliases: new RegExp(escaped, 'i') }]
  }
  const records = await SkillCatalog.find(query).sort({ name: 1 }).limit(250)
  return records.map(item => serializeCatalogSkill(item))
}

async function requestCatalogSkill(token, payload) {
  const student = await findStudent(token)
  const requestedName = typeof payload?.name === 'string' ? payload.name.trim().replace(/\s+/g, ' ') : ''
  if (!requestedName || requestedName.length > 100) throw buildAuthError('Skill name must contain 1 to 100 characters')
  const normalizedName = normalizeSkillName(requestedName)
  const category = CATEGORIES.includes(payload?.category) ? payload.category : 'Other'
  const note = typeof payload?.note === 'string' ? payload.note.trim() : ''
  if (note.length > 1000) throw buildAuthError('Request note must be 1000 characters or fewer')
  const existingCatalog = await SkillCatalog.findOne({ status: 'published', $or: [{ normalizedName }, { normalizedAliases: normalizedName }] })
  if (existingCatalog) throw buildAuthError(`${existingCatalog.name} is already available in the platform catalog.`, 409)
  try {
    const request = await SkillRequest.create({ studentId: student._id, requestedName, normalizedName, category, note })
    return { id: String(request._id), requestedName, category, note, status: request.status, createdAt: request.createdAt }
  } catch (error) {
    if (error.code === 11000) throw buildAuthError('This skill request is already awaiting admin review.', 409)
    throw error
  }
}

async function listStudentSkillRequests(token) {
  const student = await findStudent(token)
  const requests = await SkillRequest.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(100)
  return requests.map(item => ({ id: String(item._id), requestedName: item.requestedName, category: item.category,
    note: item.note || '', status: item.status, matchedSkillId: item.matchedSkillId ? String(item.matchedSkillId) : '',
    adminFeedback: item.adminFeedback || '', createdAt: item.createdAt, decidedAt: item.decidedAt || null }))
}

module.exports = { listPublishedSkillCatalog, listStudentSkillRequests, requestCatalogSkill }
