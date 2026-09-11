function buildAuthError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getSessionTtlMs(sessionTtlDays) {
  return Math.max(sessionTtlDays, 1) * 24 * 60 * 60 * 1000
}

function isSessionExpired(session, sessionTtlMs) {
  if (!session?.createdAt) {
    return true
  }

  const createdAt = new Date(session.createdAt).getTime()
  return Number.isNaN(createdAt) || (Date.now() - createdAt) > sessionTtlMs
}

function trimSessions(sessions, maxSessionsPerAccount) {
  return sessions
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxSessionsPerAccount)
}

async function appendSession(entity, token, maxSessionsPerAccount) {
  entity.sessions.push({ token })
  entity.sessions = trimSessions(entity.sessions, maxSessionsPerAccount)
  await entity.save()
}

async function findModelByActiveToken(Model, token, entityLabel, sessionTtlMs) {
  if (!token) {
    throw buildAuthError('Missing session token', 401)
  }

  const entity = await Model.findOne({ 'sessions.token': token })

  if (!entity) {
    throw buildAuthError('Session expired. Please sign in again.', 401)
  }

  const activeSessions = entity.sessions.filter(session => !isSessionExpired(session, sessionTtlMs))
  const activeTokenSession = activeSessions.find(session => session.token === token)

  if (activeSessions.length !== entity.sessions.length) {
    entity.sessions = activeSessions
    await entity.save()
  }

  if (!activeTokenSession) {
    throw buildAuthError(`${entityLabel} session expired. Please sign in again.`, 401)
  }

  return entity
}

async function resolveSessionSubject({ token, studentModel, companyModel, reviewerModel, sessionTtlMs }) {
  if (!token) {
    return null
  }

  const [student, company, reviewer] = await Promise.all([
    studentModel.findOne({ 'sessions.token': token }).select('_id sessions'),
    companyModel.findOne({ 'sessions.token': token }).select('_id sessions'),
    reviewerModel ? reviewerModel.findOne({ 'sessions.token': token, active: true }).select('_id sessions') : null,
  ])

  const subjects = [
    student ? { type: 'student', entity: student } : null,
    company ? { type: 'company', entity: company } : null,
    reviewer ? { type: 'reviewer', entity: reviewer } : null,
  ].filter(Boolean)

  for (const subject of subjects) {
    const activeSessions = subject.entity.sessions.filter(session => !isSessionExpired(session, sessionTtlMs))
    const activeTokenSession = activeSessions.find(session => session.token === token)

    if (activeSessions.length !== subject.entity.sessions.length) {
      subject.entity.sessions = activeSessions
      await subject.entity.save()
    }

    if (activeTokenSession) {
      return {
        type: subject.type,
        id: subject.entity._id.toString(),
      }
    }
  }

  return null
}

module.exports = {
  appendSession,
  buildAuthError,
  findModelByActiveToken,
  getSessionTtlMs,
  resolveSessionSubject,
}
