function buildDefaultSkillHubState() {
  return { daily: { date: '', completedChallenges: [], completedRetention: [], wrongAnswers: {} },
    streaks: { current: 0, longest: 0, overallCurrent: 0, overallLongest: 0, totalPracticeDays: 0, activeSkills: 0, completedToday: 0, nextMilestone: 3, week: [] },
    skillLog: [], skillGapReport: { activeGigs: 0, overallMatch: 0, gapData: [], strengths: [] } }
}
module.exports = { buildDefaultSkillHubState }
