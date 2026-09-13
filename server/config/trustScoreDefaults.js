const { isVerifiedSkill, dayKey } = require('../utils/skillPolicy')
const { normalizeTrustEvents } = require('../utils/trustLedger')

function buildTrustScoreFactors(student) {
  const events = normalizeTrustEvents(student.trustScoreState?.events)
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
    { label: 'Project Uploaded', icon: '🚀', desc: 'No credit for unreviewed uploads; submit evidence for assessment', points: 0, earned: has('project_uploaded'), category: 'Projects' },
    { label: 'GIG Completed', icon: '💼', desc: 'Completed GIG work', points: 150, earned: has('gig_completed'), category: 'GIGs' },
    { label: 'Profile Links Added', icon: '🔗', desc: 'Profile completeness does not prove skill', points: 0, earned: has('profile_link_added'), category: 'Profile' },
    { label: 'Intro Video Uploaded', icon: '🎥', desc: 'No credit without an assessment', points: 0, earned: has('intro_video_uploaded'), category: 'Profile' },
    { label: 'High-quality assessment', icon: '✅', desc: 'Assigned reviewer approves with a complete rubric score of at least 90%', points: 25, earned: has('assessment_quality'), category: 'Quality' },
    { label: 'Practice milestone', icon: '📈', desc: 'Every 30 distinct approved practice days, up to 240 days', points: 25, earned: has('practice_milestone'), category: 'Consistency' },
    { label: 'Assessment below standard', icon: '⚠️', desc: 'Assigned reviewer rejects with a rubric below 40%; at most once per submission day', points: -10, earned: has('assessment_below_standard'), category: 'Penalty' },
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
    maxPoints: 1000,
  }
}
module.exports = { buildTrustScoreFactors, buildTrustScoreSummary }
