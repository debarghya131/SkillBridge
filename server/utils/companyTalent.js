const { clone } = require('./templateState')
const { isDiscoverableVerifiedSkill, publishedSkillNames, activeStreak } = require('./skillPolicy')


function buildSkillsByLevel(skillHubSkills, fallbackSkills) {
  const groupedSkills = {
    Beginner: [],
    Intermediate: [],
    Pro: [],
    'Pro Mastery': [],
  }

  if (Array.isArray(skillHubSkills)) {
    skillHubSkills.forEach(skill => {
      if (!skill || typeof skill.name !== 'string' || !skill.name.trim() || !isDiscoverableVerifiedSkill(skill)) {
        return
      }

      const stage = ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'].includes(skill.stage) ? skill.stage : 'Intermediate'
      if (!groupedSkills[stage].includes(skill.name)) {
        groupedSkills[stage].push(skill.name)
      }
    })
  }

  fallbackSkills.forEach(skill => {
    if (!groupedSkills.Intermediate.includes(skill) && !groupedSkills.Beginner.includes(skill) && !groupedSkills.Pro.includes(skill) && !groupedSkills['Pro Mastery'].includes(skill)) {
      groupedSkills.Beginner.push(skill)
    }
  })

  return groupedSkills
}

function sanitizeTalentProfile(student) {
  const profileSkills = publishedSkillNames(student.skills, student.skillHubSkills)
  const verifiedSkillHubSkills = Array.isArray(student.skillHubSkills)
    ? student.skillHubSkills
      .filter(skill => skill && typeof skill.name === 'string' && skill.name.trim() && isDiscoverableVerifiedSkill(skill))
      .map(skill => skill.name.trim())
    : []
  const skills = [...new Set([
    ...profileSkills,
    ...verifiedSkillHubSkills,
  ].filter(skill => typeof skill === 'string' && skill.trim()))]
  const savedProjects = Array.isArray(student.projects)
    ? student.projects
      .filter(project => project?.saved !== false && (project.name || project.desc))
      .map(project => ({
        name: project.name || 'Student Project',
        desc: project.desc || '',
        link: project.link || '',
        demoLink: project.demoLink || '',
      }))
    : []

  const skillsByLevel = buildSkillsByLevel(student.skillHubSkills, skills)
  const skillHubByName = new Map(
    (Array.isArray(student.skillHubSkills) ? student.skillHubSkills : [])
      .filter(skill => skill && typeof skill.name === 'string' && skill.name.trim())
      .map(skill => [skill.name.trim().toLowerCase(), skill]),
  )
  const skillDetails = skills.map(name => {
    const skillHubEntry = skillHubByName.get(name.toLowerCase())
    const verified = Boolean(skillHubEntry && isDiscoverableVerifiedSkill(skillHubEntry))
    const level = verified && ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'].includes(skillHubEntry.stage)
      ? skillHubEntry.stage
      : null

    return {
      name,
      verified,
      level,
      streak: verified ? activeStreak(skillHubEntry) : 0,
    }
  })

  return {
    id: student._id.toString(),
    name: student.name,
    avatar: student.avatar || null,
    // Only publish verification types, never identity/contact credentials.
    contactMethod: student.contactMethod === 'phone' ? 'phone' : 'email',
    verificationMethod: student.verificationMethod === 'digilocker' ? 'digilocker' : 'aadhaar',
    college: '',
    verifiedSkills: verifiedSkillHubSkills,
    location: student.location || 'Location not added',
    skills,
    skillDetails,
    profileSkills: profileSkills.filter(skill => typeof skill === 'string' && skill.trim()),
    skillsByLevel,
    profileSkillsByLevel: buildSkillsByLevel(student.skillHubSkills, profileSkills),
    streak: Math.max(0, ...skillDetails.map(skill => skill.streak)),
    score: require('../controllers/trustScoreController').calculateTrustScore(student),
    projects: savedProjects.length,
    github: Array.isArray(student.githubLink)
      ? (student.githubLink.find(link => link?.saved !== false && typeof link.url === 'string' && link.url.trim())?.url || '')
      : '',
    contactInfo: Array.isArray(student.contactInfo)
      ? clone(student.contactInfo.filter(item => item?.saved !== false && item.label && item.value))
      : [],
    preferredLanguage: typeof student.preferredLanguage === 'string' ? student.preferredLanguage.trim().slice(0, 80) : '',
    savedProjects,
    videoUrl: student.videoUrl || null,
  }
}

function normalizeTalentSearchFilters(filters = {}) {
  const minTrustScore = Number.parseInt(filters.minTrustScore, 10)
  const page = Number.parseInt(filters.page, 10)
  const pageSize = Number.parseInt(filters.pageSize, 10)
  const location = typeof filters.location === 'string' ? filters.location.trim().slice(0, 80) : ''
  const skill = typeof filters.skill === 'string' ? filters.skill.trim().slice(0, 80) : ''
  const query = typeof filters.query === 'string' ? filters.query.trim().slice(0, 80) : ''
  const level = ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'].includes(filters.level) ? filters.level : 'All'

  return {
    minTrustScore: Number.isFinite(minTrustScore) ? Math.max(0, Math.min(1000, minTrustScore)) : 0,
    location: location === 'All' ? '' : location,
    skill: skill === 'All' ? '' : skill,
    query,
    level,
    page: Number.isFinite(page) ? Math.max(1, Math.min(1000, page)) : 1,
    pageSize: Number.isFinite(pageSize) ? Math.max(1, Math.min(50, pageSize)) : 50,
  }
}

function normalizeTalentValue(value) {
  return String(value || '').trim().toLowerCase()
}

function parseRequiredSkills(requiredSkills) {
  return [...new Set(String(requiredSkills || '')
    .split(/[,;\n]+/)
    .map(skill => skill.trim())
    .filter(Boolean))]
}

function enrichTalentProfile(profile, requiredSkills) {
  const profileSkillMap = new Map(profile.skills.map(skill => [normalizeTalentValue(skill), skill]))
  const matchedSkills = requiredSkills
    .map(skill => profileSkillMap.get(normalizeTalentValue(skill)))
    .filter(Boolean)

  return {
    ...profile,
    matchedSkills,
    matchScore: requiredSkills.length > 0
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : 0,
  }
}

function compareTalentProfiles(left, right) {
  return right.matchScore - left.matchScore
    || right.score - left.score
    || left.name.localeCompare(right.name)
}

function matchesTalentProfile(profile, normalizedFilters) {
  const locationPass = !normalizedFilters.location
    || normalizeTalentValue(profile.location) === normalizeTalentValue(normalizedFilters.location)
    || normalizeTalentValue(profile.location).startsWith(`${normalizeTalentValue(normalizedFilters.location)},`)
  const skillPass = !normalizedFilters.skill
    || profile.skills.some(skill => normalizeTalentValue(skill) === normalizeTalentValue(normalizedFilters.skill))
    || Object.values(profile.skillsByLevel || {}).some(skills => skills.some(skill => normalizeTalentValue(skill) === normalizeTalentValue(normalizedFilters.skill)))
  const levelPass = normalizedFilters.level === 'All'
    || (profile.skillsByLevel?.[normalizedFilters.level] || []).length > 0
  const queryPass = !normalizedFilters.query
    || normalizeTalentValue(profile.name).includes(normalizeTalentValue(normalizedFilters.query))

  return profile.score >= normalizedFilters.minTrustScore && locationPass && skillPass && levelPass && queryPass
}

function buildTalentSearchResult(profiles, filters = {}, requiredSkills = '') {
  const normalizedFilters = normalizeTalentSearchFilters(filters)
  const requiredSkillList = parseRequiredSkills(requiredSkills)
  const filteredProfiles = profiles
    .filter(profile => matchesTalentProfile(profile, normalizedFilters))
    .map(profile => enrichTalentProfile(profile, requiredSkillList))
    .sort(compareTalentProfiles)

  const start = (normalizedFilters.page - 1) * normalizedFilters.pageSize
  return {
    talentProfiles: filteredProfiles.slice(start, start + normalizedFilters.pageSize),
    total: filteredProfiles.length,
    page: normalizedFilters.page,
    pageSize: normalizedFilters.pageSize,
  }
}

module.exports = {
  buildTalentSearchResult,
  compareTalentProfiles,
  enrichTalentProfile,
  matchesTalentProfile,
  normalizeTalentSearchFilters,
  parseRequiredSkills,
  sanitizeTalentProfile,
}
