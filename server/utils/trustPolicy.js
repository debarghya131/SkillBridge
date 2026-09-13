const { isVerifiedSkill } = require('./skillPolicy')
const { normalizeTrustEvents } = require('./trustLedger')

const POLICY_VERSION = 2
const UNREVIEWED = new Set(['project_uploaded', 'profile_link_added', 'intro_video_uploaded', 'new_skill_added'])
const POOLS = {
  daily_challenge_solved: 'practice', retention_task_completed: 'practice',
  skill_verified: 'skills', skill_reverified: 'skills', skill_level_upgraded: 'skills',
  gig_completed: 'gigs', assessment_quality: 'quality', practice_milestone: 'consistency',
}
const CAPS = { practice: 500, skills: 1500, gigs: 1500, quality: 500, consistency: 200 }
const TIERS = [
  { name: 'Foundation', range: '0-500', description: 'Build reviewed evidence. One base point equals one score point up to 500.' },
  { name: 'Skilled', range: '501-700', description: 'Requires 2 active verified skills. Additional base points count at 40%.' },
  { name: 'Proven', range: '701-899', description: 'Requires 1 active Pro or Pro Mastery skill, 2 completed GIGs and 30 approved practice days. Additional base points count at 20%.' },
  { name: 'Distinguished', range: '900-1000', description: 'Requires 2 active Pro Mastery skills, 5 completed GIGs, 90 approved practice days and 10 high-quality reviewed assessments. Additional base points beyond 2000 count at 10%.' },
]

function evaluateTrust(student, events, now = new Date()) {
  const pools = Object.fromEntries(Object.keys(CAPS).map(key => [key, 0]))
  let penalties = 0
  const unique = new Map(normalizeTrustEvents(events, now).map(event => [event.key, event]))
  for (const event of unique.values()) {
    const type = event.type || event.key.split(':')[0]
    if (UNREVIEWED.has(type)) continue
    const points = Number(event.points) || 0
    if (points < 0) {
      const recordedAt = Date.parse(event.occurredAt)
      if (!Number.isFinite(recordedAt) || new Date(now).getTime() - recordedAt < 90 * 86400000) penalties += points
    }
    else if (POOLS[type]) pools[POOLS[type]] += points
  }
  const creditedPools = Object.fromEntries(Object.entries(pools).map(([key, value]) => [key, Math.min(CAPS[key], value)]))
  const basePoints = Object.values(creditedPools).reduce((sum, value) => sum + value, 0)
  const weighted = Math.min(500, basePoints) + Math.min(500, Math.max(0, basePoints - 500)) * .4
    + Math.min(1000, Math.max(0, basePoints - 1000)) * .2 + Math.min(1000, Math.max(0, basePoints - 2000)) * .1
  const active = [...new Map((student.skillHubSkills || [])
    .filter(skill => skill && typeof skill.name === 'string' && skill.name.trim() && isVerifiedSkill(skill, now))
    .map(skill => [skill.name.trim().toLowerCase(), skill])).values()]
  const count = type => [...unique.values()].filter(event => event.type === type).length
  const practiceDays = new Set([...unique.values()].filter(event => event.type === 'retention_task_completed').map(event => event.referenceId)).size
  const evidence = { verifiedSkills: active.length, proSkills: active.filter(skill => ['Pro', 'Pro Mastery'].includes(skill.stage)).length,
    masterySkills: active.filter(skill => skill.stage === 'Pro Mastery').length,
    completedGigs: count('gig_completed'), practiceDays, qualityReviews: count('assessment_quality') }
  const gates = [
    { ceiling: 500, requirements: [{ label: 'Active verified skills', actual: evidence.verifiedSkills, required: 2 }] },
    { ceiling: 700, requirements: [{ label: 'Active Pro or Pro Mastery skills', actual: evidence.proSkills, required: 1 }, { label: 'Completed GIGs', actual: evidence.completedGigs, required: 2 }, { label: 'Approved practice days', actual: practiceDays, required: 30 }] },
    { ceiling: 899, requirements: [{ label: 'Active Pro Mastery skills', actual: evidence.masterySkills, required: 2 }, { label: 'Completed GIGs', actual: evidence.completedGigs, required: 5 }, { label: 'Approved practice days', actual: practiceDays, required: 90 }, { label: 'High-quality reviews', actual: evidence.qualityReviews, required: 10 }] },
  ]
  const locked = gates.find(gate => gate.requirements.some(item => item.actual < item.required))
  const ceiling = locked?.ceiling || 1000
  const trustScore = Math.max(0, Math.floor(Math.min(ceiling, weighted) + penalties))
  return { version: POLICY_VERSION, trustScore, basePoints, penalties, ceiling, evidence, pools: creditedPools, caps: CAPS,
    requirements: locked?.requirements || [], tiers: TIERS,
    tier: TIERS[trustScore <= 500 ? 0 : trustScore <= 700 ? 1 : trustScore < 900 ? 2 : 3].name }
}

module.exports = { evaluateTrust, TIERS, POLICY_VERSION, UNREVIEWED }
