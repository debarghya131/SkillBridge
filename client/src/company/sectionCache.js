const CACHE_TTL_MS = 45_000
const entries = new Map()

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
