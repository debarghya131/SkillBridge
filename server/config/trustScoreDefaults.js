const { isVerifiedSkill, dayKey } = require('../utils/skillPolicy')

function buildTrustScoreFactors(student) {
  const events = student.trustScoreState?.events || []
  const has = type => events.some(item => item.type === type)
  const today = dayKey()
  const daily = type => events.some(item => item.type === type && item.referenceId === today)
  const verifiedCount = (student.skillHubSkills || []).filter(skill => isVerifiedSkill(skill)).length
  const factors = [
    { label: 'Daily Challenge Solved', icon: '⚡', desc: 'Reviewed challenge; up to 80 points per submission day', points: 80, earned: daily('daily_challenge_solved'), category: 'Daily' },
    { label: 'Retention Task Completed', icon: '🔒', desc: 'Reviewed practice; up to 20 points per submission day', points: 20, earned: daily('retention_task_completed'), category: 'Daily' },
    { label: 'Skill Verified', icon: '✅', desc: `${verifiedCount} actively verified skills on profile`, points: 60, earned: has('skill_verified'), category: 'Skills' },
    { label: 'Skill Level Upgraded', icon: '📈', desc: 'Approved next-level assessment', points: 100, earned: has('skill_level_upgraded'), category: 'Skills' },
    { label: 'Skill Re-Verified', icon: '🔄', desc: 'Approved verification renewal', points: 50, earned: has('skill_reverified'), category: 'Skills' },
    { label: 'Project Uploaded', icon: '🚀', desc: 'Project evidence added', points: 80, earned: has('project_uploaded'), category: 'Projects' },
    { label: 'GIG Completed', icon: '💼', desc: 'Completed GIG work', points: 150, earned: has('gig_completed'), category: 'GIGs' },
    { label: 'Profile Links Added', icon: '🔗', desc: 'Profile link recorded', points: 50, earned: has('profile_link_added'), category: 'Profile' },
    { label: 'Intro Video Uploaded', icon: '🎥', desc: 'Introduction video recorded', points: 50, earned: has('intro_video_uploaded'), category: 'Profile' },
  ]
  for (const type of ['skill_expired', 'retention_task_missed', 'retention_answer_wrong']) {
    const event = events.find(item => item.type === type)
    if (event) factors.push({ label: event.label, icon: '⚠️', desc: 'Recorded penalty; see account activity', points: event.points, earned: true, category: 'Penalty' })
  }
  return factors
}
function buildTrustScoreSummary(factors) {
  return {
    earnedPoints: factors.filter(item => item.earned && item.points > 0).reduce((sum, item) => sum + item.points, 0),
    penalties: factors.filter(item => item.earned && item.points < 0).reduce((sum, item) => sum + item.points, 0),
    maxPoints: factors.filter(item => item.points > 0).reduce((sum, item) => sum + item.points, 0),
  }
}
module.exports = { buildTrustScoreFactors, buildTrustScoreSummary }
