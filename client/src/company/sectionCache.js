const CACHE_TTL_MS = 45_000
const entries = new Map()
const pendingLoads = new Map()

const keyFor = (section, token) => token ? `${section}:${token}` : ''

export function readCompanySectionCache(section, token) {
  const key = keyFor(section, token)
  const entry = key ? entries.get(key) : null
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL_MS) {
    if (key) entries.delete(key)
    return null
  }
  return entry.value
}

export function writeCompanySectionCache(section, token, value) {
  const key = keyFor(section, token)
  if (key) entries.set(key, { savedAt: Date.now(), value })
}

export function loadCompanySectionCache(section, token, load) {
  const key = keyFor(section, token)
  if (!key) return Promise.resolve().then(load)
  if (pendingLoads.has(key)) return pendingLoads.get(key)

  const request = Promise.resolve()
    .then(load)
    .then(value => {
      writeCompanySectionCache(section, token, value)
      return value
    })
    .finally(() => pendingLoads.delete(key))

  pendingLoads.set(key, request)
  return request
}

export function clearCompanySectionCache(section, token) {
  const key = keyFor(section, token)
  if (!key) return
  entries.delete(key)
  pendingLoads.delete(key)
}

export function clearCompanySectionCachePrefix(sectionPrefix, token) {
  if (!sectionPrefix || !token) return
  const tokenSuffix = `:${token}`
  for (const key of entries.keys()) {
    if (key.startsWith(sectionPrefix) && key.endsWith(tokenSuffix)) entries.delete(key)
  }
  for (const key of pendingLoads.keys()) {
    if (key.startsWith(sectionPrefix) && key.endsWith(tokenSuffix)) pendingLoads.delete(key)
  }
}

export function clearAllCompanySectionCache(token) {
  if (!token) return
  const tokenSuffix = `:${token}`
  for (const key of entries.keys()) {
    if (key.endsWith(tokenSuffix)) entries.delete(key)
  }
  for (const key of pendingLoads.keys()) {
    if (key.endsWith(tokenSuffix)) pendingLoads.delete(key)
  }
}
