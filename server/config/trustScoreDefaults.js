const VERIFIED_SKILL_SET = new Set(['React', 'Node.js', 'UI/UX Design'])

function buildTrustScoreFactors(student) {
  const skills = Array.isArray(student.skills) ? student.skills : []
  const projects = Array.isArray(student.projects) ? student.projects : []
  const githubLink = Array.isArray(student.githubLink) ? student.githubLink : []
  const trustEvents = Array.isArray(student.trustScoreState?.events) ? student.trustScoreState.events : []
  const hasTrustEvent = eventType => trustEvents.some(event => event?.type === eventType)

  const savedProjects = projects.filter(project => project.saved)
  const verifiedSkills = skills.filter(skill => VERIFIED_SKILL_SET.has(skill)).length
  const profileLinks = githubLink.length

  return [
    { label: 'Daily Challenge Solved', icon: '⚡', desc: "Solved today's daily challenge", points: 80, earned: true, category: 'Daily' },
    { label: 'Retention Task Completed', icon: '🔒', desc: 'Completed daily retention tasks · 5 day streak', points: 20, earned: true, category: 'Daily' },
    { label: 'Skill Verified', icon: '✅', desc: `${verifiedSkills} verified skill${verifiedSkills !== 1 ? 's' : ''} on profile`, points: 60, earned: verifiedSkills > 0 || hasTrustEvent('skill_verified'), category: 'Skills' },
    { label: 'New Skill Added', icon: '➕', desc: 'Added a new skill to your profile', points: 20, earned: true, category: 'Skills' },
    { label: 'Skill Level Upgraded', icon: '📈', desc: 'Upgraded a skill from Beginner to Intermediate', points: 100, earned: hasTrustEvent('skill_level_upgraded'), category: 'Skills' },
    { label: 'Project Uploaded', icon: '🚀', desc: `${savedProjects.length} project${savedProjects.length !== 1 ? 's' : ''} with GitHub / live link`, points: 80, earned: savedProjects.length > 0 || hasTrustEvent('project_uploaded'), category: 'Projects' },
    { label: 'GIG Completed', icon: '💼', desc: 'Delivered a GIG with a company rating', points: 150, earned: hasTrustEvent('gig_completed'), category: 'GIGs' },
    { label: 'Skill Re-Verified', icon: '🔄', desc: 'Re-verified a skill before expiry', points: 50, earned: true, category: 'Skills' },
    { label: 'Profile Links Added', icon: '🔗', desc: profileLinks > 0 ? `${profileLinks} link${profileLinks !== 1 ? 's' : ''} added` : 'No GitHub / LinkedIn links yet', points: 50, earned: profileLinks > 0 || hasTrustEvent('profile_link_added'), category: 'Profile' },
    { label: 'Intro Video Uploaded', icon: '🎥', desc: 'Short intro video uploaded to profile', points: 50, earned: true, category: 'Profile' },
    { label: 'Skill Expired (Penalty)', icon: '⚠️', desc: 'UI/UX Design verification expired', points: -80, earned: false, category: 'Penalty' },
    { label: 'Retention Task Missed (Penalty)', icon: '❌', desc: 'Missed 2 days of retention tasks', points: -30, earned: false, category: 'Penalty' },
  ]
}

function buildTrustScoreSummary(factors) {
  return {
    earnedPoints: factors.filter(item => item.earned && item.points > 0).reduce((sum, item) => sum + item.points, 0),
    penalties: factors.filter(item => !item.earned && item.points < 0).reduce((sum, item) => sum + item.points, 0),
    maxPoints: factors.filter(item => item.points > 0).reduce((sum, item) => sum + item.points, 0),
  }
}

module.exports = {
  buildTrustScoreFactors,
  buildTrustScoreSummary,
}
