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

export async function fetchStudentNetwork(token) {
  return apiRequest('/api/student/network', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function saveStudentNetwork(token, payload) {
  return apiRequest('/api/student/network', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

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
  return apiRequest(`/api/student/opportunities/${opportunityId}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
}

export async function declineStudentOpportunity(token, opportunityId) {
  return apiRequest(`/api/student/opportunities/${opportunityId}/decline`, {
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
