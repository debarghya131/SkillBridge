const CACHE_TTL_MS = 45_000
const entries = new Map()
const pendingLoads = new Map()

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

// Reuse a request that is already in progress. This lets the dashboard warm a
// section in the background without creating a second request if the student
// opens that section before the prefetch completes.
export function loadStudentSectionCache(section, token, load) {
  const key = cacheKey(section, token)
  if (!key) return Promise.resolve().then(load)
  if (pendingLoads.has(key)) return pendingLoads.get(key)

  const request = Promise.resolve()
    .then(load)
    .then(value => {
      writeStudentSectionCache(section, token, value)
      return value
    })
    .finally(() => pendingLoads.delete(key))

  pendingLoads.set(key, request)
  return request
}

export function clearStudentSectionCache(section, token) {
  const key = cacheKey(section, token)
  if (key) {
    entries.delete(key)
    pendingLoads.delete(key)
  }
}

export function clearStudentSectionCachePrefix(sectionPrefix, token) {
  if (!sectionPrefix || !token) return
  const keyPrefix = sectionPrefix
  const tokenSuffix = `:${token}`
  for (const key of entries.keys()) {
    if (key.startsWith(keyPrefix) && key.endsWith(tokenSuffix)) entries.delete(key)
  }
  for (const key of pendingLoads.keys()) {
    if (key.startsWith(keyPrefix) && key.endsWith(tokenSuffix)) pendingLoads.delete(key)
  }
}

export function clearAllStudentSectionCache(token) {
  if (!token) return
  for (const key of entries.keys()) {
    if (key.endsWith(`:${token}`)) entries.delete(key)
  }
  for (const key of pendingLoads.keys()) {
    if (key.endsWith(`:${token}`)) pendingLoads.delete(key)
  }
}
