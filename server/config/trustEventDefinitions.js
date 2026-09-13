const TRUST_EVENT_DEFINITIONS = Object.freeze({
  daily_challenge_solved: { label: 'Daily Challenge Solved', points: 80, category: 'Daily' },
  retention_task_completed: { label: 'Retention Task Completed', points: 20, category: 'Daily' },
  skill_verified: { label: 'Skill Verified', points: 60, category: 'Skills' },
  new_skill_added: { label: 'New Skill Added', points: 0, category: 'Skills' },
  skill_level_upgraded: { label: 'Skill Level Upgraded', points: 100, category: 'Skills' },
  project_uploaded: { label: 'Project Uploaded (unreviewed)', points: 0, category: 'Projects' },
  gig_completed: { label: 'GIG Completed', points: 150, category: 'GIGs' },
  skill_reverified: { label: 'Skill Re-Verified', points: 50, category: 'Skills' },
  profile_link_added: { label: 'Profile Links Added', points: 0, category: 'Profile' },
  intro_video_uploaded: { label: 'Intro Video Uploaded', points: 0, category: 'Profile' },
  assessment_quality: { label: 'High-quality assessment (90%+)', points: 25, category: 'Quality' },
  practice_milestone: { label: '30 approved practice days', points: 25, category: 'Consistency' },
  assessment_below_standard: { label: 'Reviewed assessment below 40%', points: -10, category: 'Penalty' },
  skill_expired: { label: 'Skill Expired', points: -80, category: 'Penalty' },
  retention_task_missed: { label: 'Retention Task Missed', points: -30, category: 'Penalty' },
  retention_answer_wrong: { label: 'Wrong Retention Answer', points: -10, category: 'Penalty' },
})

module.exports = { TRUST_EVENT_DEFINITIONS }
