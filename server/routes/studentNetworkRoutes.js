const {
  createTeamPost, decideConnectionRequest, decideTeamInvitation, decideTeamRequest, deleteTeamPost, getNetworkProfile,
  getStudentNetworkState, inviteStudentToTeam, leaveTeam, removeConnection, requestToJoinTeam, sendConnectionRequest,
  updateTeamPost, withdrawTeamRequest,
} = require('../controllers/networkController')
const { getBearerToken, readJsonBody } = require('../utils/request')

async function handleStudentNetworkRoutes(req, res, pathname, sendJson) {
  if (req.method === 'GET' && pathname === '/api/student/network') {
    const networkState = await getStudentNetworkState(getBearerToken(req))
    sendJson(res, 200, { networkState })
    return true
  }

  const networkProfileMatch = pathname.match(/^\/api\/student\/network\/profiles\/([^/]+)$/)
  if (req.method === 'GET' && networkProfileMatch) {
    const profile = await getNetworkProfile(getBearerToken(req), decodeURIComponent(networkProfileMatch[1]))
    sendJson(res, 200, { profile })
    return true
  }

  const connectionTargetMatch = pathname.match(/^\/api\/student\/network\/connections\/([^/]+)$/)
  if (req.method === 'POST' && connectionTargetMatch) {
    sendJson(res, 201, { connection: await sendConnectionRequest(getBearerToken(req), decodeURIComponent(connectionTargetMatch[1])) })
    return true
  }
  if (req.method === 'DELETE' && connectionTargetMatch) {
    sendJson(res, 200, await removeConnection(getBearerToken(req), decodeURIComponent(connectionTargetMatch[1])))
    return true
  }

  const connectionDecisionMatch = pathname.match(/^\/api\/student\/network\/connection-requests\/([^/]+)$/)
  if (req.method === 'PATCH' && connectionDecisionMatch) {
    const payload = await readJsonBody(req)
    sendJson(res, 200, { connection: await decideConnectionRequest(getBearerToken(req), decodeURIComponent(connectionDecisionMatch[1]), payload.decision) })
    return true
  }

  if (req.method === 'POST' && pathname === '/api/student/network/team-posts') {
    sendJson(res, 201, { teamPost: await createTeamPost(getBearerToken(req), await readJsonBody(req)) })
    return true
  }

  const teamPostMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)$/)
  if (req.method === 'PATCH' && teamPostMatch) {
    sendJson(res, 200, { teamPost: await updateTeamPost(getBearerToken(req), decodeURIComponent(teamPostMatch[1]), await readJsonBody(req)) })
    return true
  }
  if (req.method === 'DELETE' && teamPostMatch) {
    sendJson(res, 200, await deleteTeamPost(getBearerToken(req), decodeURIComponent(teamPostMatch[1])))
    return true
  }

  const teamJoinMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)\/join$/)
  if (req.method === 'POST' && teamJoinMatch) {
    sendJson(res, 201, { teamPost: await requestToJoinTeam(getBearerToken(req), decodeURIComponent(teamJoinMatch[1]), await readJsonBody(req)) })
    return true
  }

  const teamInviteMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)\/invitations\/([^/]+)$/)
  if (req.method === 'POST' && teamInviteMatch) {
    sendJson(res, 201, { teamPost: await inviteStudentToTeam(getBearerToken(req), decodeURIComponent(teamInviteMatch[1]), decodeURIComponent(teamInviteMatch[2]), await readJsonBody(req)) })
    return true
  }
  if (req.method === 'PATCH' && teamInviteMatch) {
    const payload = await readJsonBody(req)
    sendJson(res, 200, { teamPost: await decideTeamInvitation(getBearerToken(req), decodeURIComponent(teamInviteMatch[1]), decodeURIComponent(teamInviteMatch[2]), payload.decision) })
    return true
  }
  if (req.method === 'DELETE' && teamJoinMatch) {
    sendJson(res, 200, await withdrawTeamRequest(getBearerToken(req), decodeURIComponent(teamJoinMatch[1])))
    return true
  }

  const teamMembershipMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)\/membership$/)
  if (req.method === 'DELETE' && teamMembershipMatch) {
    sendJson(res, 200, await leaveTeam(getBearerToken(req), decodeURIComponent(teamMembershipMatch[1])))
    return true
  }

  const teamDecisionMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)\/requests\/([^/]+)$/)
  if (req.method === 'PATCH' && teamDecisionMatch) {
    const payload = await readJsonBody(req)
    sendJson(res, 200, { teamPost: await decideTeamRequest(getBearerToken(req), decodeURIComponent(teamDecisionMatch[1]), decodeURIComponent(teamDecisionMatch[2]), payload.decision) })
    return true
  }

  return false
}

module.exports = { handleStudentNetworkRoutes }
