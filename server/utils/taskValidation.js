const { buildAuthError } = require('./session')

const REQUIRED_DETAILS = {
  live_project: ['deliverables', 'acceptanceCriteria'],
  code: ['testCases'],
  mcq: ['questionCount', 'questions', 'options', 'answerKey'],
  written: ['evaluationCriteria'],
  mixed: ['components', 'evaluationCriteria'],
  design: ['deliverables', 'evaluationCriteria'],
  data_analysis: ['deliverables', 'evaluationCriteria'],
  case_study: ['deliverables', 'evaluationCriteria'],
  research: ['deliverables', 'evaluationCriteria'],
  presentation: ['deliverables', 'evaluationCriteria'],
}

function validateAssignment({ type, title, instructions, deadline, points, details = {} }) {
  if (!Object.hasOwn(REQUIRED_DETAILS, type)) throw buildAuthError('Choose a valid assignment type')
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 160) throw buildAuthError('Assignment title must be 1 to 160 characters')
  if (typeof instructions !== 'string' || !instructions.trim() || instructions.trim().length > 4000) throw buildAuthError('Assignment instructions must be 1 to 4000 characters')
  if (!Number.isInteger(Number(points)) || Number(points) < 1 || Number(points) > 100) throw buildAuthError('Maximum score must be a whole number from 1 to 100')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline || '') || !Number.isFinite(Date.parse(deadline))
    || new Date(deadline).toISOString().slice(0, 10) !== deadline) throw buildAuthError('A valid assignment deadline is required')
  if (!details || typeof details !== 'object' || Array.isArray(details)) throw buildAuthError('Assignment details must be an object')
  for (const key of REQUIRED_DETAILS[type]) {
    if (!String(details[key] ?? '').trim()) throw buildAuthError(`Assignment requires ${key}`)
  }
  for (const value of Object.values(details)) {
    if (!['string', 'number'].includes(typeof value) || String(value).length > 2000) throw buildAuthError('Each assignment detail must be text of at most 2000 characters')
  }
  for (const [key, min, max] of [['questionCount', 1, 100], ['passingScore', 0, 100], ['wordLimit', 1, 10000]]) {
    if (details[key] == null || details[key] === '') continue
    const value = Number(details[key])
    if (!Number.isInteger(value) || value < min || value > max) throw buildAuthError(`${key} must be a whole number from ${min} to ${max}`)
  }
}

function isLateSubmission(deadline, submittedAt) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline || '') || !submittedAt) return false
  return new Date(submittedAt).getTime() > new Date(`${deadline}T23:59:59.999+05:30`).getTime()
}

module.exports = { validateAssignment, isLateSubmission }
