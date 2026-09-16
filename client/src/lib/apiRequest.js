import { API_BASE_URL } from '../config/api'
import { toast } from '../ui/toast'

export async function apiRequest(path, options = {}) {
  const { silentErrorToast = false, ...fetchOptions } = options
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
      },
    })
  } catch (error) {
    const message = import.meta.env.DEV
      ? `Backend is not reachable at ${API_BASE_URL}. Start the server and try again.`
      : 'The SkillBridge server is temporarily unavailable. Please try again shortly.'

    if (!silentErrorToast) {
      toast.error(message, { title: 'Connection Error' })
    }

    throw new Error(message)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data.message
      || (response.status >= 500
        ? 'The server could not complete this request. Please retry.'
        : `Request failed (${response.status}). Please retry.`)
    const error = new Error(message)
    error.status = response.status
    error.payload = data
    error.requestId = response.headers.get('X-Request-Id') || data.requestId || ''

    if (!silentErrorToast) {
      if (response.status === 429) {
        toast.warning(message, { title: 'Rate Limit Reached', duration: 5600 })
      } else if (response.status >= 500) {
        toast.error(message, { title: 'Server Error' })
      } else {
        toast.error(message, { title: 'Action Failed' })
      }
    }

    throw error
  }

  return data
}
