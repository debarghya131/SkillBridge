function normalizeSkillName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function skillSlug(value) {
  return normalizeSkillName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function practiceInstructionsFor(skill) {
  return skill.practiceInstructions || `Complete a small original ${skill.name} practice exercise. Explain what you practiced, include reproducible results or an inspectable artifact, and identify one improvement. Use fresh evidence for each practice day.`
}

function serializeCatalogSkill(skill, { includeDraftFields = false } = {}) {
  const value = skill?.toObject ? skill.toObject() : skill
  const result = {
    id: String(value._id),
    name: value.name,
    aliases: value.aliases || [],
    category: value.category,
    summary: value.summary || '',
    status: value.status,
    version: value.version,
    renewalDays: value.renewalDays,
    stages: value.stages || [],
    verificationInstructions: value.verificationInstructions || '',
    practiceInstructions: practiceInstructionsFor(value),
    upgradeRequirements: value.upgradeRequirements || [],
    dailyTasks: (value.dailyTasks || []).map(task => ({
      id: String(task._id),
      title: task.title,
      instructions: task.instructions,
      kind: task.kind,
      reviewMode: task.reviewMode,
      active: task.active !== false,
    })),
    publishedAt: value.publishedAt || null,
    updatedAt: value.updatedAt || null,
  }
  if (includeDraftFields) result.slug = value.slug
  return result
}

module.exports = { normalizeSkillName, serializeCatalogSkill, skillSlug, practiceInstructionsFor }
