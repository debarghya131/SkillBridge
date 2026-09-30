import { apiRequest } from '../lib/apiRequest'

const VIEW_BROWSER_KEY = 'skillbridge-site-view-counted'

let registrationRequest = null
let countedInRuntime = false

function hasCountedThisBrowser() {
  if (countedInRuntime) return true

  try {
    if (window.localStorage.getItem(VIEW_BROWSER_KEY) === 'true') return true
    // Preserve a count already made in an open tab before this change.
    if (window.sessionStorage.getItem(VIEW_BROWSER_KEY) === 'true') {
      window.localStorage.setItem(VIEW_BROWSER_KEY, 'true')
      return true
    }
  } catch {
    // Runtime deduplication still works when browser storage is unavailable.
  }

  return false
}

function markBrowserAsCounted() {
  countedInRuntime = true

  try {
    window.localStorage.setItem(VIEW_BROWSER_KEY, 'true')
  } catch {
    // The current page still avoids duplicate requests without browser storage.
  }
}

export function registerSiteView() {
  if (!registrationRequest) {
    const register = () => hasCountedThisBrowser()
      ? apiRequest('/api/site-views', { silentErrorToast: true })
      : apiRequest('/api/site-views', { method: 'POST', silentErrorToast: true })
        .then(result => {
          markBrowserAsCounted()
          return result
        })

    // Web Locks serializes first visits from two tabs of the same origin.
    registrationRequest = (window.navigator.locks?.request
      ? window.navigator.locks.request('skillbridge-site-view', register)
      : register())
      .finally(() => {
        registrationRequest = null
      })
  }

  return registrationRequest
}
