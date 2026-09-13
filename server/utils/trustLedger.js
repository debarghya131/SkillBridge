const { TRUST_EVENT_DEFINITIONS } = require('../config/trustEventDefinitions')
const { dayKey } = require('./skillPolicy')

function validDailyReference(type, reference, now) {
  if (!['daily_challenge_solved', 'retention_task_completed'].includes(type)) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reference)) return false
  const date = new Date(`${reference}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === reference && reference <= dayKey(now)
}

// Retain raw history on the account; scoring consumes only canonical events.
function normalizeTrustEvents(events, now = new Date()) {
  const unique = new Map()
  const nowMs = new Date(now).getTime()
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event.key !== 'string') continue
    const separator = event.key.indexOf(':')
    if (separator < 1) continue
    const type = event.key.slice(0, separator)
    const referenceId = event.key.slice(separator + 1).trim()
    const definition = Object.hasOwn(TRUST_EVENT_DEFINITIONS, type) ? TRUST_EVENT_DEFINITIONS[type] : null
    if (!definition || !referenceId || (event.type && event.type !== type)) continue
    if (!validDailyReference(type, referenceId, now)) continue
    if (event.referenceId != null && String(event.referenceId).trim() !== referenceId) continue
    const timestamp = event.occurredAt ? Date.parse(event.occurredAt) : NaN
    if (Number.isFinite(timestamp) && timestamp > nowMs) continue
    const key = `${type}:${referenceId}`
    if (unique.has(key)) continue
    unique.set(key, { ...event, key, type, referenceId, ...definition,
      occurredAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null })
  }
  return [...unique.values()]
}

module.exports = { normalizeTrustEvents, validDailyReference }
