import { apiRequest } from '../lib/apiRequest'

const auth = token => ({ Authorization: `Bearer ${token}` })
const ADMIN_SESSION_KEY = 'skillbridge.admin.session'
const ADMIN_ROLE_KEY = 'skillbridge.admin.role'
const LEGACY_SESSION_KEY = 'skillbridge.reviewer.session'
const LEGACY_ROLE_KEY = 'skillbridge.reviewer.role'

export const getAdminSessionToken = () => window.localStorage.getItem(ADMIN_SESSION_KEY)
  || window.localStorage.getItem(LEGACY_SESSION_KEY)
  || ''
export const getAdminSessionRole = () => window.localStorage.getItem(ADMIN_ROLE_KEY)
  || window.localStorage.getItem(LEGACY_ROLE_KEY)
  || ''
export const setAdminSession = (token, role = '') => {
  window.localStorage.setItem(ADMIN_SESSION_KEY, token)
  if (role) window.localStorage.setItem(ADMIN_ROLE_KEY, role)
  else window.localStorage.removeItem(ADMIN_ROLE_KEY)
  window.localStorage.removeItem(LEGACY_SESSION_KEY)
  window.localStorage.removeItem(LEGACY_ROLE_KEY)
}
export const clearAdminSession = () => {
  window.localStorage.removeItem(ADMIN_SESSION_KEY)
  window.localStorage.removeItem(ADMIN_ROLE_KEY)
  window.localStorage.removeItem(LEGACY_SESSION_KEY)
  window.localStorage.removeItem(LEGACY_ROLE_KEY)
}

export const signInAdmin = payload => apiRequest('/api/reviewer/signin', { method: 'POST', body: JSON.stringify(payload) })
export const fetchCurrentAdminUser = token => apiRequest('/api/reviewer/me', { headers: auth(token) })
export const logoutAdmin = token => apiRequest('/api/reviewer/logout', { method: 'POST', headers: auth(token), body: '{}' })

export const fetchAdminOverview = token => apiRequest('/api/admin/overview', { headers: auth(token) })

export function fetchAdminSkills(token, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => value && value !== 'all' && params.set(key, value))
  return apiRequest(`/api/admin/skills?${params}`, { headers: auth(token) })
}

export const createAdminSkill = (token, payload) => apiRequest('/api/admin/skills', {
  method: 'POST', headers: auth(token), body: JSON.stringify(payload),
})
export const updateAdminSkill = (token, id, payload) => apiRequest(`/api/admin/skills/${id}`, {
  method: 'PATCH', headers: auth(token), body: JSON.stringify(payload),
})
export const fetchAdminSkillRequests = (token, status = 'pending') => apiRequest(`/api/admin/skill-requests?status=${encodeURIComponent(status)}`, { headers: auth(token) })
export const decideAdminSkillRequest = (token, id, payload) => apiRequest(`/api/admin/skill-requests/${id}`, {
  method: 'PATCH', headers: auth(token), body: JSON.stringify(payload),
})
export const fetchAdminReviewers = token => apiRequest('/api/admin/reviewers', { headers: auth(token) })
export const createAdminReviewer = (token, payload) => apiRequest('/api/admin/reviewers', {
  method: 'POST', headers: auth(token), body: JSON.stringify(payload),
})
export const updateAdminReviewer = (token, id, payload) => apiRequest(`/api/admin/reviewers/${id}`, {
  method: 'PATCH', headers: auth(token), body: JSON.stringify(payload),
})

export function fetchReviewQueue(token, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => value && value !== 'all' && params.set(key, value))
  return apiRequest(`/api/reviewer/assessments?${params}`, { headers: auth(token) })
}

export const claimReview = (token, id) => apiRequest(`/api/reviewer/assessments/${id}/claim`, {
  method: 'POST', headers: auth(token), body: '{}',
})
export const releaseReview = (token, id) => apiRequest(`/api/reviewer/assessments/${id}/release`, {
  method: 'POST', headers: auth(token), body: '{}',
})
export const submitReviewDecision = (token, id, payload) => apiRequest(`/api/reviewer/assessments/${id}/review`, {
  method: 'POST', headers: auth(token), body: JSON.stringify(payload),
})
