import { apiRequest } from '../lib/apiRequest'

const REVIEWER_SESSION_KEY = 'skillbridge.reviewer.session'

export const getReviewerSessionToken = () => window.localStorage.getItem(REVIEWER_SESSION_KEY) || ''
export const setReviewerSessionToken = token => window.localStorage.setItem(REVIEWER_SESSION_KEY, token)
export const clearReviewerSessionToken = () => window.localStorage.removeItem(REVIEWER_SESSION_KEY)

export const signInReviewer = payload => apiRequest('/api/reviewer/signin', { method: 'POST', body: JSON.stringify(payload) })
export const fetchCurrentReviewer = token => apiRequest('/api/reviewer/me', { headers: { Authorization: `Bearer ${token}` } })
export const logoutReviewer = token => apiRequest('/api/reviewer/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' })

export function fetchReviewQueue(token, filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => value && value !== 'all' && params.set(key, value))
  return apiRequest(`/api/reviewer/assessments?${params}`, { headers: { Authorization: `Bearer ${token}` } })
}

export const claimReview = (token, id) => apiRequest(`/api/reviewer/assessments/${id}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' })
export const releaseReview = (token, id) => apiRequest(`/api/reviewer/assessments/${id}/release`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' })
export const submitReviewDecision = (token, id, payload) => apiRequest(`/api/reviewer/assessments/${id}/review`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
