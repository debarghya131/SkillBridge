function buildUtcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pruneUsageDays(sectionUsage, currentDayKey) {
  if (!isPlainObject(sectionUsage)) {
    return {}
  }

  const entries = Object.entries(sectionUsage)
    .filter(([dayKey, value]) => /^\d{4}-\d{2}-\d{2}$/.test(dayKey) && Number(value) > 0)
    .sort(([left], [right]) => right.localeCompare(left))

  const nextUsage = {}
  const keepKeys = new Set([currentDayKey])

  entries.slice(0, 6).forEach(([dayKey]) => {
    keepKeys.add(dayKey)
  })

  entries.forEach(([dayKey, value]) => {
    if (keepKeys.has(dayKey)) {
      nextUsage[dayKey] = Number(value)
    }
  })

  return nextUsage
}

function consumeSectionOperation(entity, sectionKey, sectionLabel, limit, now = new Date()) {
  const dayKey = buildUtcDayKey(now)
  const usage = isPlainObject(entity.dailySectionUsage) ? { ...entity.dailySectionUsage } : {}
  const sectionUsage = pruneUsageDays(usage[sectionKey], dayKey)
  const usedToday = Number(sectionUsage[dayKey]) || 0

  sectionUsage[dayKey] = usedToday + 1
  usage[sectionKey] = sectionUsage
  entity.dailySectionUsage = usage

  return {
    dayKey,
    used: sectionUsage[dayKey],
    remaining: null,
  }
}

module.exports = {
  buildUtcDayKey,
  consumeSectionOperation,
}
