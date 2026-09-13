const mongoose = require('mongoose')
const Student = require('../models/Student')
const NetworkConnection = require('../models/NetworkConnection')
const TeamPost = require('../models/TeamPost')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')
const { hasIdentityVerificationProof } = require('../utils/verification')
const { isDiscoverableVerifiedSkill, publishedSkillNames } = require('../utils/skillPolicy')

const findStudentByToken = token => findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
const clean = (value, max) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max)
const idOf = value => String(value?._id || value || '')
const pairKey = (left, right) => [idOf(left), idOf(right)].sort().join(':')
const NETWORK_CARD_FIELDS = '_id name avatar location skills skillHubSkills skillHubState.streaks trustScore trustScoreState.events.key trustScoreState.events.type trustScoreState.events.referenceId trustScoreState.events.occurredAt contactMethod verificationMethod createdAt +identityVerificationHash'

function requireObjectId(value, label = 'record') {
  if (!mongoose.isValidObjectId(value)) throw buildAuthError(`Invalid ${label}`, 400)
  return value
}

function skillSummary(student) {
  const records = Array.isArray(student.skillHubSkills) ? student.skillHubSkills : []
  const valid = records.filter(isDiscoverableVerifiedSkill)
  const names = publishedSkillNames(student.skills, records)
  const levels = { Beginner: [], Intermediate: [], Pro: [], 'Pro Mastery': [] }
  for (const skill of valid) (levels[skill.stage] || levels.Beginner).push(skill.name)
  return { names: [...new Set(names)].slice(0, 12), levels }
}

function profileFor(student, { includeContact = false, compact = false } = {}) {
  const skills = skillSummary(student)
  const streaks = student.skillHubState?.streaks || {}
  return {
    id: idOf(student), name: student.name, avatar: student.avatar || null,
    role: skills.names.length ? `${skills.names.slice(0, 2).join(' / ')} Talent` : 'Student Talent',
    location: student.location || 'Location not provided', trustScore: require('./trustScoreController').calculateTrustScore(student),
    skills: skills.names, skillsByLevel: skills.levels,
    streak: Math.max(0, Number(streaks.overallCurrent ?? streaks.current) || 0),
    availability: 'Open to peer collaboration', verified: hasIdentityVerificationProof(student),
    // Full projects, links and videos load only after View profile is clicked.
    githubLink: compact ? [] : (student.githubLink || []).filter(item => item.saved !== false && item.url).slice(0, 5),
    projects: compact ? [] : (student.projects || []).filter(item => item.saved).slice(0, 6),
    videoUrl: compact ? null : student.videoUrl || null,
    contactInfo: includeContact ? (student.contactInfo || []).filter(item => item.saved !== false).slice(0, 5) : [],
    contactVisible: includeContact,
  }
}

function normalizeTeamPayload(payload, partial = false) {
  const result = {}
  if (!partial || payload.title !== undefined) {
    result.title = clean(payload.title, 120)
    if (result.title.length < 5) throw buildAuthError('Team-up title must contain at least 5 characters')
  }
  if (!partial || payload.description !== undefined) {
    result.description = clean(payload.description, 1200)
    if (result.description.length < 20) throw buildAuthError('Describe the work in at least 20 characters')
  }
  if (!partial || payload.type !== undefined) {
    if (!['Project', 'Hackathon', 'Research', 'Open Source', 'Case Study', 'Startup', 'Study Group', 'Design Challenge', 'Data Challenge', 'Competition', 'Community Initiative', 'Content Collaboration'].includes(payload.type)) throw buildAuthError('Invalid team-up type')
    result.type = payload.type
  }
  if (!partial || payload.slots !== undefined) {
    result.slots = Number.parseInt(payload.slots, 10)
    if (!Number.isInteger(result.slots) || result.slots < 1 || result.slots > 20) throw buildAuthError('Team size must be between 1 and 20')
  }
  if (!partial || payload.requiredSkills !== undefined) {
    const source = Array.isArray(payload.requiredSkills) ? payload.requiredSkills : String(payload.requiredSkills || '').split(',')
    result.requiredSkills = [...new Set(source.map(item => clean(item, 40)).filter(Boolean))].slice(0, 10)
    if (!result.requiredSkills.length) throw buildAuthError('Add at least one required skill')
  }
  if (payload.status !== undefined) {
    if (!['open', 'closed'].includes(payload.status)) throw buildAuthError('Invalid team-up status')
    result.status = payload.status
  }
  return result
}

function serializePost(post, viewerId) {
  const raw = post.toObject ? post.toObject() : post
  const accepted = (raw.requests || []).filter(item => item.status === 'accepted')
  const ownRequest = (raw.requests || []).find(item => idOf(item.student) === idOf(viewerId))
  return {
    id: idOf(raw), title: raw.title, description: raw.description, type: raw.type,
    requiredSkills: raw.requiredSkills || [], slots: raw.slots, filled: accepted.length,
    status: raw.status, createdAt: raw.createdAt, owner: profileFor(raw.owner, { compact: true }),
    joinStatus: ownRequest?.status || null, joinRequestId: idOf(ownRequest),
    requestSource: ownRequest?.source || null,
    requests: idOf(raw.owner) === idOf(viewerId) ? (raw.requests || []).map(item => ({
      id: idOf(item), message: item.message, status: item.status, source: item.source || 'application', createdAt: item.createdAt,
      student: profileFor(item.student, { includeContact: item.status === 'accepted', compact: true }),
    })) : [],
    members: accepted.map(item => profileFor(item.student, { includeContact: idOf(raw.owner) === idOf(viewerId), compact: true })),
  }
}

async function getStudentNetworkState(token) {
  const student = await findStudentByToken(token)
  const viewerId = student._id
  const [connections, posts] = await Promise.all([
    NetworkConnection.find({ $or: [{ requester: viewerId }, { recipient: viewerId }], status: { $in: ['pending', 'accepted'] } }).lean(),
    TeamPost.find({ $or: [{ status: 'open' }, { owner: viewerId }, { 'requests.student': viewerId }] })
      .sort({ createdAt: -1 }).limit(60)
      .populate({ path: 'owner', select: NETWORK_CARD_FIELDS })
      .populate({ path: 'requests.student', select: NETWORK_CARD_FIELDS })
      .lean(),
  ])
  const peerIds = connections.map(item => idOf(item.requester) === idOf(viewerId) ? item.recipient : item.requester)
  const [relationshipPeers, suggestions] = await Promise.all([
    Student.find({ _id: { $in: peerIds } }).select(NETWORK_CARD_FIELDS).lean(),
    Student.find({ _id: { $nin: [viewerId, ...peerIds] } }).select(NETWORK_CARD_FIELDS).sort({ trustScore: -1, createdAt: -1 }).limit(40).lean(),
  ])
  const students = [...relationshipPeers, ...suggestions]
  const relationships = new Map()
  for (const item of connections) {
    const requester = idOf(item.requester)
    const otherId = requester === idOf(viewerId) ? idOf(item.recipient) : requester
    relationships.set(otherId, { connectionId: idOf(item), status: item.status === 'accepted' ? 'connected' : requester === idOf(viewerId) ? 'outgoing_pending' : 'incoming_pending' })
  }
  const people = students.map(item => ({ ...profileFor(item, { includeContact: relationships.get(idOf(item))?.status === 'connected', compact: true }), relationship: relationships.get(idOf(item)) || { status: 'none' } }))
  const findPerson = id => people.find(person => person.id === idOf(id))
  const serializedPosts = posts.map(post => serializePost(post, viewerId))
  return {
    viewerId: idOf(viewerId), suggestions: people.filter(item => item.relationship.status !== 'connected'),
    connected: people.filter(item => item.relationship.status === 'connected'),
    incomingConnections: connections.filter(item => item.status === 'pending' && idOf(item.recipient) === idOf(viewerId)).map(item => ({ id: idOf(item), profile: findPerson(item.requester), createdAt: item.createdAt })),
    outgoingConnections: connections.filter(item => item.status === 'pending' && idOf(item.requester) === idOf(viewerId)).map(item => ({ id: idOf(item), profile: findPerson(item.recipient), createdAt: item.createdAt })),
    openTeamPosts: serializedPosts.filter(item => item.owner.id !== idOf(viewerId) && item.status === 'open'),
    myTeamPosts: serializedPosts.filter(item => item.owner.id === idOf(viewerId)),
    sentTeamRequests: serializedPosts.filter(item => item.owner.id !== idOf(viewerId) && item.requestSource === 'application' && item.joinStatus),
    incomingTeamInvitations: serializedPosts.filter(item => item.owner.id !== idOf(viewerId) && item.requestSource === 'invitation' && item.joinStatus === 'pending'),
    memberships: serializedPosts.filter(item => item.owner.id !== idOf(viewerId) && item.joinStatus === 'accepted'),
  }
}

async function getNetworkProfile(token, studentId) {
  const viewer = await findStudentByToken(token)
  requireObjectId(studentId, 'student ID')
  const target = await Student.findById(studentId).lean()
  if (!target) throw buildAuthError('Student profile not found', 404)
  const connected = idOf(viewer) === idOf(target) || Boolean(await NetworkConnection.exists({ pairKey: pairKey(viewer, target), status: 'accepted' }))
  return require('../utils/publicStudentProfile').publicStudentProfile(target, connected)
}

async function sendConnectionRequest(token, studentId) {
  const requester = await findStudentByToken(token)
  requireObjectId(studentId, 'student ID')
  if (idOf(requester) === idOf(studentId)) throw buildAuthError('You cannot connect with yourself')
  if (!await Student.exists({ _id: studentId })) throw buildAuthError('Student profile not found', 404)
  const key = pairKey(requester, studentId)
  const existing = await NetworkConnection.findOne({ pairKey: key })
  if (existing?.status === 'accepted') throw buildAuthError('You are already connected', 409)
  if (existing?.status === 'pending') throw buildAuthError(idOf(existing.requester) === idOf(requester) ? 'Connection request already sent' : 'This student already sent you a request', 409)
  const connection = existing || new NetworkConnection({ pairKey: key })
  Object.assign(connection, { requester: requester._id, recipient: studentId, status: 'pending', respondedAt: null })
  try { await connection.save() } catch (error) {
    if (error?.code === 11000) throw buildAuthError('A connection request for this student already exists', 409)
    throw error
  }
  return { id: idOf(connection), status: 'outgoing_pending' }
}

async function decideConnectionRequest(token, connectionId, decision) {
  const student = await findStudentByToken(token)
  requireObjectId(connectionId, 'connection ID')
  if (!['accept', 'decline'].includes(decision)) throw buildAuthError('Decision must be accept or decline')
  const connection = await NetworkConnection.findOne({ _id: connectionId, recipient: student._id, status: 'pending' })
  if (!connection) throw buildAuthError('Pending connection request not found', 404)
  connection.status = decision === 'accept' ? 'accepted' : 'declined'; connection.respondedAt = new Date(); await connection.save()
  return { id: idOf(connection), status: connection.status }
}

async function removeConnection(token, connectionId) {
  const student = await findStudentByToken(token)
  requireObjectId(connectionId, 'connection ID')
  const connection = await NetworkConnection.findOne({ _id: connectionId, $or: [{ requester: student._id }, { recipient: student._id }], status: { $in: ['pending', 'accepted'] } })
  if (!connection) throw buildAuthError('Connection not found', 404)
  if (connection.status === 'pending' && idOf(connection.requester) !== idOf(student)) throw buildAuthError('Only the sender can cancel this request', 403)
  await connection.deleteOne(); return { removed: true }
}

async function createTeamPost(token, payload) {
  const student = await findStudentByToken(token)
  const post = await TeamPost.create({ owner: student._id, ...normalizeTeamPayload(payload) })
  return { id: idOf(post) }
}

async function updateTeamPost(token, postId, payload) {
  const student = await findStudentByToken(token); requireObjectId(postId, 'team-up ID')
  const post = await TeamPost.findOne({ _id: postId, owner: student._id })
  if (!post) throw buildAuthError('Team-up post not found', 404)
  Object.assign(post, normalizeTeamPayload(payload, true))
  const accepted = post.requests.filter(item => item.status === 'accepted').length
  if (post.slots < accepted) throw buildAuthError('Team size cannot be smaller than accepted members')
  if (post.status === 'open' && accepted >= post.slots) throw buildAuthError('Increase team size before reopening this full team')
  await post.save(); return { id: idOf(post), status: post.status }
}

async function deleteTeamPost(token, postId) {
  const student = await findStudentByToken(token); requireObjectId(postId, 'team-up ID')
  const post = await TeamPost.findOne({ _id: postId, owner: student._id })
  if (!post) throw buildAuthError('Team-up post not found', 404)
  if (post.requests.some(item => item.status === 'accepted')) throw buildAuthError('Close posts with accepted members instead of deleting them', 409)
  await post.deleteOne(); return { removed: true }
}

async function requestToJoinTeam(token, postId, payload) {
  const student = await findStudentByToken(token); requireObjectId(postId, 'team-up ID')
  const message = clean(payload.message, 500)
  if (message.length < 10) throw buildAuthError('Join message must contain at least 10 characters')
  const post = await TeamPost.findById(postId)
  if (!post || post.status !== 'open') throw buildAuthError('This team-up is no longer open', 409)
  if (idOf(post.owner) === idOf(student)) throw buildAuthError('You cannot join your own team-up')
  const existing = post.requests.find(item => idOf(item.student) === idOf(student))
  if (existing && ['pending', 'accepted'].includes(existing.status)) throw buildAuthError(existing.source === 'invitation' ? 'You already have an invitation for this team-up' : 'You already requested to join this team-up', 409)
  if (existing) Object.assign(existing, { message, source: 'application', status: 'pending', respondedAt: null })
  else post.requests.push({ student: student._id, message, source: 'application' })
  try { await post.save() } catch (error) {
    if (error?.name === 'VersionError') throw buildAuthError('This team-up changed. Refresh and try again.', 409)
    throw error
  }
  return { id: idOf(post), status: 'pending' }
}

async function decideTeamRequest(token, postId, requestId, decision) {
  const owner = await findStudentByToken(token); requireObjectId(postId, 'team-up ID'); requireObjectId(requestId, 'request ID')
  if (!['accept', 'decline'].includes(decision)) throw buildAuthError('Decision must be accept or decline')
  const post = await TeamPost.findOne({ _id: postId, owner: owner._id })
  if (!post) throw buildAuthError('Team-up post not found', 404)
  const request = post.requests.id(requestId)
  if (!request || request.source !== 'application' || request.status !== 'pending') throw buildAuthError('Pending join request not found', 404)
  const accepted = post.requests.filter(item => item.status === 'accepted').length
  if (decision === 'accept' && (post.status !== 'open' || accepted >= post.slots)) throw buildAuthError('This team is already full', 409)
  request.status = decision === 'accept' ? 'accepted' : 'declined'; request.respondedAt = new Date()
  if (decision === 'accept' && accepted + 1 >= post.slots) post.status = 'closed'
  try { await post.save() } catch (error) {
    if (error?.name === 'VersionError') throw buildAuthError('This team-up changed. Refresh and try again.', 409)
    throw error
  }
  return { id: idOf(post), status: request.status }
}

async function withdrawTeamRequest(token, postId) {
  const student = await findStudentByToken(token); requireObjectId(postId, 'team-up ID')
  const post = await TeamPost.findOne({ _id: postId, 'requests.student': student._id })
  const request = post?.requests.find(item => idOf(item.student) === idOf(student))
  if (!request || request.status !== 'pending' || request.source === 'invitation') throw buildAuthError('Pending join request not found', 404)
  request.status = 'withdrawn'; request.respondedAt = new Date(); await post.save(); return { withdrawn: true }
}

async function inviteStudentToTeam(token, postId, studentId, payload) {
  const owner = await findStudentByToken(token); requireObjectId(postId, 'team-up ID'); requireObjectId(studentId, 'student ID')
  if (idOf(owner) === idOf(studentId)) throw buildAuthError('You cannot invite yourself')
  if (!await Student.exists({ _id: studentId })) throw buildAuthError('Student profile not found', 404)
  const post = await TeamPost.findOne({ _id: postId, owner: owner._id })
  if (!post || post.status !== 'open') throw buildAuthError('This team-up is not open', 409)
  if (post.requests.filter(item => item.status === 'accepted').length >= post.slots) throw buildAuthError('This team is already full', 409)
  const message = clean(payload.message, 500) || `${owner.name} invited you to join this team-up.`
  if (message.length < 10) throw buildAuthError('Invitation message must contain at least 10 characters')
  const existing = post.requests.find(item => idOf(item.student) === idOf(studentId))
  if (existing && ['pending', 'accepted'].includes(existing.status)) throw buildAuthError(existing.source === 'application' ? 'This student already applied to the team-up' : 'Invitation already sent', 409)
  if (existing) Object.assign(existing, { message, source: 'invitation', status: 'pending', respondedAt: null })
  else post.requests.push({ student: studentId, message, source: 'invitation' })
  try { await post.save() } catch (error) {
    if (error?.name === 'VersionError') throw buildAuthError('This team-up changed. Refresh and try again.', 409)
    throw error
  }
  return { id: idOf(post), status: 'pending' }
}

async function decideTeamInvitation(token, postId, requestId, decision) {
  const student = await findStudentByToken(token); requireObjectId(postId, 'team-up ID'); requireObjectId(requestId, 'request ID')
  if (!['accept', 'decline'].includes(decision)) throw buildAuthError('Decision must be accept or decline')
  const post = await TeamPost.findOne({ _id: postId, requests: { $elemMatch: { _id: requestId, student: student._id, source: 'invitation', status: 'pending' } } })
  const request = post?.requests.id(requestId)
  if (!request || request.source !== 'invitation' || request.status !== 'pending') throw buildAuthError('Pending team invitation not found', 404)
  const accepted = post.requests.filter(item => item.status === 'accepted').length
  if (decision === 'accept' && (post.status !== 'open' || accepted >= post.slots)) throw buildAuthError('This team is already full', 409)
  request.status = decision === 'accept' ? 'accepted' : 'declined'; request.respondedAt = new Date()
  if (decision === 'accept' && accepted + 1 >= post.slots) post.status = 'closed'
  try { await post.save() } catch (error) {
    if (error?.name === 'VersionError') throw buildAuthError('This team-up changed. Refresh and try again.', 409)
    throw error
  }
  return { id: idOf(post), status: request.status }
}

module.exports = { createTeamPost, decideConnectionRequest, decideTeamInvitation, decideTeamRequest, deleteTeamPost, getNetworkProfile, getStudentNetworkState, inviteStudentToTeam, normalizeTeamPayload, pairKey, profileFor, removeConnection, requestToJoinTeam, sendConnectionRequest, updateTeamPost, withdrawTeamRequest }
