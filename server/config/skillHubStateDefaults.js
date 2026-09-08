const DEFAULT_SKILL_GAP_REPORT = {
  gapData: [
    { skill: 'TypeScript', category: 'Frontend', demand: 92, yours: 0, gap: 'High', gigs: 18, trend: 'rising', resources: ['TypeScript Handbook', 'Total TypeScript'] },
    { skill: 'Next.js', category: 'Frontend', demand: 88, yours: 0, gap: 'High', gigs: 14, trend: 'rising', resources: ['Next.js Docs', 'Lee Robinson Course'] },
    { skill: 'Docker', category: 'Backend', demand: 84, yours: 0, gap: 'High', gigs: 11, trend: 'stable', resources: ['Docker Docs', 'TechWorld Course'] },
    { skill: 'Figma', category: 'Design', demand: 85, yours: 45, gap: 'Medium', gigs: 9, trend: 'rising', resources: ['Figma Learn', 'DesignCourse'] },
    { skill: 'REST APIs', category: 'Backend', demand: 88, yours: 60, gap: 'Medium', gigs: 16, trend: 'stable', resources: ['REST API Tutorial', 'Postman Academy'] },
    { skill: 'Git & GitHub', category: 'Frontend', demand: 95, yours: 70, gap: 'Low', gigs: 22, trend: 'stable', resources: ['Pro Git Book', 'GitHub Skills'] },
    { skill: 'Python', category: 'Backend', demand: 80, yours: 60, gap: 'Low', gigs: 13, trend: 'rising', resources: ['Python Docs', 'Real Python'] },
    { skill: 'PostgreSQL', category: 'Analytics', demand: 76, yours: 0, gap: 'High', gigs: 8, trend: 'stable', resources: ['PostgreSQL Tutorial', 'Neon Docs'] },
  ],
  strengths: [
    { skill: 'React', demand: 90, yours: 85, gigs: 20, category: 'Frontend' },
    { skill: 'Figma', demand: 85, yours: 88, gigs: 9, category: 'Design' },
    { skill: 'Node.js', demand: 82, yours: 70, gigs: 15, category: 'Backend' },
  ],
  categoryStats: [
    { name: 'Frontend', match: 72, totalGigs: 38, color: '#6366F1', bg: '#EEF2FF' },
    { name: 'Backend', match: 48, totalGigs: 29, color: '#0891B2', bg: '#ECFEFF' },
    { name: 'Design', match: 61, totalGigs: 17, color: '#D946EF', bg: '#FDF4FF' },
    { name: 'Analytics', match: 40, totalGigs: 14, color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Marketing', match: 55, totalGigs: 11, color: '#10B981', bg: '#ECFDF5' },
  ],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function buildDefaultSkillHubState() {
  const today = new Date().toISOString().slice(0, 10)

  return {
    daily: {
      date: today,
      completedChallenges: [4],
      completedRetention: [],
      wrongAnswers: {},
    },
    skillLog: [],
    skillGapReport: clone(DEFAULT_SKILL_GAP_REPORT),
  }
}

module.exports = {
  DEFAULT_SKILL_GAP_REPORT,
  buildDefaultSkillHubState,
}
