const CACHE_TTL_MS = 45_000
const entries = new Map()

function cacheKey(section, token) {
  return token ? `${section}:${token}` : ''
}

export function readStudentSectionCache(section, token) {
  const key = cacheKey(section, token)
  const entry = key ? entries.get(key) : null
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL_MS) {
    if (key) entries.delete(key)
    return null
  }
  return entry.value
}

export function writeStudentSectionCache(section, token, value) {
  const key = cacheKey(section, token)
  if (key) entries.set(key, { savedAt: Date.now(), value })
}

export function clearStudentSectionCache(section, token) {
  const key = cacheKey(section, token)
  if (key) entries.delete(key)
}
