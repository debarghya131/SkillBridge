import { apiRequest } from '../lib/apiRequest'

const STUDENT_SESSION_KEY = 'skillbridge.student.session'

export function getStudentSessionToken() {
  return window.localStorage.getItem(STUDENT_SESSION_KEY) || ''
}

export function setStudentSessionToken(token) {
  window.localStorage.setItem(STUDENT_SESSION_KEY, token)
}

export function clearStudentSessionToken() {
  window.localStorage.removeItem(STUDENT_SESSION_KEY)
}

export async function signUpStudent(payload) {
  return apiRequest('/api/student/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function signInStudent(payload) {
  return apiRequest('/api/student/signin', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchCurrentStudent(token) {
  return apiRequest('/api/student/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchPublicCompanyProfile(companyName) {
  return apiRequest(`/api/companies/profile/${encodeURIComponent(companyName)}`, {
    method: 'GET',
    silentErrorToast: true,
  })
}

export async function saveStudentProfile(token, payload) {
  return apiRequest('/api/student/profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function logoutStudent(token) {
  return apiRequest('/api/student/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
}

export async function fetchStudentTrustScore(token) {
  return apiRequest('/api/student/trustscore', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function recordStudentTrustScoreEvent(token, payload) {
  return apiRequest('/api/student/trustscore/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchStudentSkillHub(token) {
  return apiRequest('/api/student/skillhub', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function fetchStudentActivityHeatmap(token, filters) {
  const params = new URLSearchParams({ view: filters.view, year: String(filters.year) })
  if (filters.view === 'month') params.set('month', String(filters.month))
  return apiRequest(`/api/student/activity-heatmap?${params}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    silentErrorToast: true,
  })
}

export async function saveStudentSkillHub(token, payload) {
  return apiRequest('/api/student/skillhub', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function recordStudentSkillHubEvent(token, payload) {
  return apiRequest('/api/student/skillhub/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export function fetchSkillAssessments(token) {
  return apiRequest('/api/student/skillhub/assessments', { headers: { Authorization: `Bearer ${token}` } })
}

export function submitSkillAssessment(token, payload) {
  return apiRequest('/api/student/skillhub/assessments', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
}

export async function fetchStudentNetwork(token) {
  return apiRequest('/api/student/network', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

const networkRequest = (token, path, method = 'GET', payload) => apiRequest(`/api/student/network${path}`, {
  method, headers: { Authorization: `Bearer ${token}` },
  ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
})

export const fetchNetworkProfile = (token, studentId) => networkRequest(token, `/profiles/${encodeURIComponent(studentId)}`)
export const sendNetworkConnection = (token, studentId) => networkRequest(token, `/connections/${encodeURIComponent(studentId)}`, 'POST')
export const removeNetworkConnection = (token, connectionId) => networkRequest(token, `/connections/${encodeURIComponent(connectionId)}`, 'DELETE')
export const decideNetworkConnection = (token, connectionId, decision) => networkRequest(token, `/connection-requests/${encodeURIComponent(connectionId)}`, 'PATCH', { decision })
export const createNetworkTeamPost = (token, payload) => networkRequest(token, '/team-posts', 'POST', payload)
export const updateNetworkTeamPost = (token, postId, payload) => networkRequest(token, `/team-posts/${encodeURIComponent(postId)}`, 'PATCH', payload)
export const deleteNetworkTeamPost = (token, postId) => networkRequest(token, `/team-posts/${encodeURIComponent(postId)}`, 'DELETE')
export const joinNetworkTeamPost = (token, postId, message) => networkRequest(token, `/team-posts/${encodeURIComponent(postId)}/join`, 'POST', { message })
export const withdrawNetworkTeamRequest = (token, postId) => networkRequest(token, `/team-posts/${encodeURIComponent(postId)}/join`, 'DELETE')
export const decideNetworkTeamRequest = (token, postId, requestId, decision) => networkRequest(token, `/team-posts/${encodeURIComponent(postId)}/requests/${encodeURIComponent(requestId)}`, 'PATCH', { decision })
export const inviteNetworkStudentToTeam = (token, postId, studentId, message) => networkRequest(token, `/team-posts/${encodeURIComponent(postId)}/invitations/${encodeURIComponent(studentId)}`, 'POST', { message })
export const decideNetworkTeamInvitation = (token, postId, requestId, decision) => networkRequest(token, `/team-posts/${encodeURIComponent(postId)}/invitations/${encodeURIComponent(requestId)}`, 'PATCH', { decision })

export async function fetchStudentEarning(token) {
  return apiRequest('/api/student/earning', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function saveStudentEarning(token, payload) {
  return apiRequest('/api/student/earning', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function requestStudentWithdrawal(token, payload) {
  return apiRequest('/api/student/earning/withdraw', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchStudentGigs(token) {
  return apiRequest('/api/student/gigs', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function applyStudentGig(token, gigId) {
  return apiRequest(`/api/student/gigs/${gigId}/apply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
}

export async function saveStudentGig(token, gigId) {
  return apiRequest(`/api/student/gigs/${gigId}/save`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
}

export async function unsaveStudentGig(token, gigId) {
  return apiRequest(`/api/student/gigs/${gigId}/save`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function acceptStudentOpportunity(token, opportunityId) {
  return apiRequest(`/api/student/opportunities/${encodeURIComponent(opportunityId)}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
}

export async function declineStudentOpportunity(token, opportunityId) {
  return apiRequest(`/api/student/opportunities/${encodeURIComponent(opportunityId)}/decline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
}

export async function fetchStudentCompanyInterviewTask(token, payload) {
  return apiRequest('/api/student/tasks/company-interview/load', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function submitStudentCompanyInterviewTask(token, payload) {
  return apiRequest('/api/student/tasks/company-interview/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function startStudentCompanyInterviewTask(token, payload) {
  return apiRequest('/api/student/tasks/company-interview/start', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}
