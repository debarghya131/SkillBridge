import { apiRequest } from '../lib/apiRequest'

const VIEW_SESSION_KEY = 'skillbridge-site-view-counted'

let registrationRequest = null
let countedInRuntime = false

function hasCountedThisSession() {
  if (countedInRuntime) {
    return true
  }

  try {
    return window.sessionStorage.getItem(VIEW_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

function markSessionAsCounted() {
  countedInRuntime = true

  try {
    window.sessionStorage.setItem(VIEW_SESSION_KEY, 'true')
  } catch {
    // The counter still works when browser storage is unavailable.
  }
}

export function registerSiteView() {
  if (hasCountedThisSession()) {
    return apiRequest('/api/site-views', { silentErrorToast: true })
  }

  if (!registrationRequest) {
    registrationRequest = apiRequest('/api/site-views', {
      method: 'POST',
      silentErrorToast: true,
    })
      .then(result => {
        markSessionAsCounted()
        return result
      })
      .finally(() => {
        registrationRequest = null
      })
  }

  return registrationRequest
}
