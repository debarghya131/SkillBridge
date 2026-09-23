const DAY_MS = 86400000
const CATEGORIES = ['Frontend', 'Backend', 'Full Stack', 'Mobile Development', 'Cloud Computing', 'DevOps', 'Cybersecurity', 'AI & Machine Learning', 'Data Engineering', 'Databases', 'Design', 'Analytics', 'Marketing', 'Content & Writing', 'Video & Animation', 'Game Development', 'Quality Assurance', 'Business & Finance', 'Product Management', 'Other']
const STAGES = ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery']
const REWARDS = Object.freeze({ verify: 60, reverify: 50, upgrade: 100, challenge: 80, retain: 20, expiry: -80 })
const CHALLENGES = [
  { id: 1, skill: 'Data Structures', title: 'Reverse a linked list', instructions: 'Implement iterative and recursive reversal. Include empty-list and single-node tests and explain time and space complexity.' },
  { id: 2, skill: 'React', title: 'Build a form validator', instructions: 'Build an accessible form with required fields, inline errors and a success state. Include validation tests and keyboard interaction evidence.' },
  { id: 3, skill: 'Node.js', title: 'Build a REST endpoint', instructions: 'Implement a REST endpoint with input validation and consistent error responses. Include sample requests and success and failure tests.' },
  { id: 4, skill: 'SQL', title: 'Query sales data', instructions: 'Provide a reproducible schema with sample customers and orders. Write queries for monthly totals and customers without orders. Explain indexes and test results.' },
  { id: 5, skill: 'React', title: 'Handle effect cleanup', instructions: 'Demonstrate an effect with an event subscription or asynchronous request. Explain cleanup, stale results and unmount behavior, with test evidence.' },
  { id: 6, skill: 'Figma', title: 'Design a dashboard component', instructions: 'Create a responsive dashboard component with loading, empty and error states. Include the design file, accessibility decisions and component variants.' },
  { id: 7, skill: 'Python', title: 'Optimize a data pipeline', instructions: 'Provide a reproducible data transformation with before-and-after timings, correctness tests and an explanation of memory tradeoffs.' },
  { id: 8, skill: 'Content Marketing', title: 'Plan a campaign funnel', instructions: 'Define an audience, campaign objective, content for each funnel stage and measurable success criteria. Identify assumptions and how you would test them.' },
]

function dayKey(now = new Date()) {
  return new Date(new Date(now).getTime() + 330 * 60000).toISOString().slice(0, 10)
}

function expiryDay(value) {
  if (!value || value === '-') return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function skillStatus(skill, now = new Date()) {
  const due = expiryDay(skill.renewalDue)
  if (!skill.verified && !skill.verifiedAt && skill.renewalStatus !== 'expired') return 'unverified'
  if (!due) return 'unverified'
  const remaining = (Date.parse(due) - Date.parse(dayKey(now))) / DAY_MS
  return remaining < 0 ? 'expired' : remaining <= 30 ? 'due' : 'valid'
}

function isVerifiedSkill(skill, now = new Date()) {
  return skill.verified === true && ['valid', 'due'].includes(skillStatus(skill, now))
}

function isArchivedSkill(skill) {
  return skill?.archived === true
}

function isDiscoverableVerifiedSkill(skill, now = new Date()) {
  return !isArchivedSkill(skill) && isVerifiedSkill(skill, now)
}

function publishedSkillNames(_profileSkills, skillHubSkills, now = new Date()) {
  // `student.skills` is an editable/profile compatibility field. Discovery and
  // matching must only publish structured skills that passed platform review.
  const names = (Array.isArray(skillHubSkills) ? skillHubSkills : [])
    .filter(skill => isDiscoverableVerifiedSkill(skill, now))
    .map(skill => skill.name)
  return [...new Set(names.map(name => name.trim()))]
}

function activeStreak(skill, now = new Date()) {
  const lastDay = expiryDay(skill?.lastRetentionDate)
  const storedStreak = Math.max(0, Number(skill?.streak) || 0)
  if (!lastDay || !storedStreak) return 0
  const elapsedDays = (Date.parse(dayKey(now)) - Date.parse(lastDay)) / DAY_MS
  return elapsedDays >= 0 && elapsedDays <= 1 ? storedStreak : 0
}

function skillBrief({ mode, skillName, targetStage, challengeId }) {
  if (mode === 'challenge') return CHALLENGES.find(item => item.id === challengeId)?.instructions || ''
  const purpose = mode === 'upgrade' ? `Demonstrate ${targetStage} proficiency in ${skillName}.` : `Demonstrate your current ${skillName} skills.`
  return `${purpose} Provide original work, explain your contribution and decisions, and include reproducible tests or other evidence, limitations and improvements.`
}

module.exports = { DAY_MS, CATEGORIES, STAGES, REWARDS, CHALLENGES, dayKey, expiryDay, skillStatus, isVerifiedSkill, isArchivedSkill, isDiscoverableVerifiedSkill, publishedSkillNames, activeStreak, skillBrief }
