const test = require('node:test')
const assert = require('node:assert/strict')
const Student = require('../models/Student')
const Company = require('../models/Company')
const { buildDefaultStudentProfile } = require('../config/studentDefaults')
const { buildDefaultSkillHubState } = require('../config/skillHubStateDefaults')
const { buildActivityDays, buildStudentSkillHubSkills, updateStudentSkillHub, getStudentSkillHub, applyReviewedSkillAssessment, normalizeHeatmapFilters, reconcileSkillExpiry, buildSkillGapReport, buildStreakSummary, setStudentSkillArchived } = require('../controllers/skillHubController')
const { getCurrentStudent, getCurrentStudentProfileMedia, updateCurrentStudent } = require('../controllers/studentController')
const { validateAssessment } = require('../controllers/skillAssessmentController')
const { recordStudentTrustScoreEvent, recordTrustScoreEvent, buildTrustScoreSnapshot } = require('../controllers/trustScoreController')
const { dayKey, skillStatus, isVerifiedSkill, activeStreak, publishedSkillNames, DAY_MS } = require('../utils/skillPolicy')

const response = 'I built the original implementation and included reproducible tests, results, and limitations.'
const dayOffset = offset => new Date(Date.parse(dayKey()) + offset * DAY_MS).toISOString().slice(0, 10)
function studentWith(skills = []) {
  const student = new Student({ name: 'Student', passwordHash: 'test', sessions: [{ token: 's', createdAt: new Date() }], skillHubSkills: skills })
  student.save = async () => student
  return student
}

test('new accounts have no demo reputation, skills, projects or completed daily challenges', () => {
  const student = studentWith()
  assert.equal(student.trustScore, 0)
  assert.deepEqual(student.skillHubSkills, [])
  assert.deepEqual(student.skillHubState.daily.completedChallenges, [])
  assert.deepEqual(student.skillHubState.skillLog, [])
  assert.deepEqual(buildDefaultStudentProfile().skills, [])
  assert.deepEqual(buildDefaultStudentProfile().projects, [])
  assert.deepEqual(buildDefaultSkillHubState().daily.completedChallenges, [])
  assert.equal(buildDefaultSkillHubState().streaks.current, 0)
  assert.equal(buildTrustScoreSnapshot(student).summary.earnedPoints, 0)
  assert.equal(buildTrustScoreSnapshot(student).summary.penalties, 0)
})

test('dates use India midnight; expiration is after the final valid day', () => {
  assert.equal(dayKey('2030-01-01T18:29:59Z'), '2030-01-01')
  assert.equal(dayKey('2030-01-01T18:30:00Z'), '2030-01-02')
  const skill = { verified: true, renewalDue: '2030-01-01' }
  assert.equal(skillStatus(skill, '2030-01-01T18:29:59Z'), 'due')
  assert.equal(isVerifiedSkill(skill, '2030-01-01T18:30:00Z'), false)
  assert.equal(skillStatus({ verified: true, renewalDue: 'invalid' }), 'unverified')
})

test('add skill is explicit, unverified, zero-credit, and cannot overwrite reviewed fields', async t => {
  const student = studentWith([{ name: 'SQL', verified: true, stage: 'Pro', renewalDue: dayOffset(90) }])
  t.mock.method(Student, 'findOne', async () => student)
  const added = await updateStudentSkillHub('s', { skills: [{ name: ' Python ', category: 'Backend', verified: true, stage: 'Pro', level: 100 }] })
  assert.deepEqual(student.skills, ['SQL', 'Python'])
  assert.equal(added.skills[1].verified, false)
  assert.equal(added.skills[1].stage, 'Beginner')
  assert.equal(added.skills[1].level, 0)
  assert.equal(student.trustScore, 0)
  await updateStudentSkillHub('s', { skills: [{ name: 'SQL', category: 'Analytics', stage: 'Beginner', verified: false }] })
  assert.equal(student.skillHubSkills[0].stage, 'Pro')
  assert.equal(student.skillHubSkills[0].verified, true)
  await assert.rejects(updateStudentSkillHub('s', { skills: [null] }), /names/)
  await assert.rejects(updateStudentSkillHub('s', { skills: [{ name: 'X', category: 'Invalid' }] }), /category/)
  await assert.rejects(updateStudentSkillHub('s', { skills: [{ name: 'X' }, { name: 'x' }] }), /unique/)
})

test('profile autosaves cannot remove reviewed skills or grant skill credit', async t => {
  const student = studentWith([{ name: 'Python', verified: true, stage: 'Intermediate', renewalDue: dayOffset(100) }])
  student.skills = ['Python']
  t.mock.method(Student, 'findOne', async () => student)
  const profile = await updateCurrentStudent('s', { skills: ['Forged'], trustScore: 1000 })
  assert.deepEqual(profile.skills, ['Python'])
  assert.equal(profile.skillHubSkills[0].verified, true)
  assert.equal(profile.trustScore, 0)
})

test('student profile includes the server-derived practice summary for dashboard headers', async t => {
  const student = studentWith([{ name: 'React', verified: true, renewalDue: dayOffset(90), streak: 2, longestStreak: 2 }])
  student.skillHubState = {
    skillLog: [
      { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(-1) },
      { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(0) },
    ],
  }
  t.mock.method(Student, 'findOne', async () => student)

  const profile = await getCurrentStudent('s')

  assert.deepEqual(profile.practiceStats, { totalPracticeDays: 2, overallCurrent: 2,
    activityDays: [{ date: dayOffset(-1), count: 1 }, { date: dayOffset(0), count: 1 }] })
})

test('workspace bootstrap excludes heavy section state and loads profile media separately', async t => {
  const student = studentWith()
  student.videoUrl = 'data:video/mp4;base64,AAAA'
  const selections = []
  t.mock.method(Student, 'findOne', () => ({
    select: async fields => {
      selections.push(fields)
      return student
    },
  }))

  const profile = await getCurrentStudent('s', { workspace: true })
  const media = await getCurrentStudentProfileMedia('s')

  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'videoUrl'), false)
  assert.equal(media.videoUrl, student.videoUrl)
  assert.match(selections[0], /-videoUrl/)
  assert.match(selections[0], /-gigState/)
  assert.match(selections[1], /\bvideoUrl\b/)
})

test('skill hub query includes activity state used by streak summaries', async t => {
  const student = studentWith([{ name: 'React', verified: true, renewalDue: dayOffset(90), streak: 2, longestStreak: 2 }])
  student.skillHubState = {
    skillLog: [
      { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(-1) },
      { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(0) },
    ],
  }
  let selectedFields = ''
  t.mock.method(Student, 'findOne', () => ({
    select: async fields => { selectedFields = fields; return student },
  }))
  t.mock.method(Company, 'aggregate', async () => [])

  const hub = await getStudentSkillHub('s')

  assert.match(selectedFields, /\bskillHubState\b/)
  assert.equal(hub.skillHubState.streaks.totalPracticeDays, 2)
  assert.equal(hub.skillHubState.streaks.overallCurrent, 2)
  assert.deepEqual(hub.skillHubState.activityDays, [
    { date: dayOffset(-1), count: 1 },
    { date: dayOffset(0), count: 1 },
  ])
})

test('profile persistence rejects unsafe media and strips unsafe external links', async t => {
  const student = studentWith()
  t.mock.method(Student, 'findOne', async () => student)
  const profile = await updateCurrentStudent('s', {
    githubLink: [{ icon: 'x', url: 'javascript:alert(1)' }, { icon: 'x', url: 'https://example.com/profile' }],
    projects: [{ name: 'Portfolio', desc: 'Original work', link: 'javascript:alert(1)', demoLink: 'https://example.com/demo', saved: true }],
  })
  assert.deepEqual(profile.githubLink.map(item => item.url), ['https://example.com/profile'])
  assert.equal(profile.projects[0].link, '')
  assert.equal(profile.projects[0].demoLink, 'https://example.com/demo')
  await assert.rejects(updateCurrentStudent('s', { avatar: 'data:image/svg+xml;base64,PHN2Zz4=' }), /profile image/)
  await assert.rejects(updateCurrentStudent('s', { videoUrl: 'data:video/ogg;base64,AAAA' }), /intro video/)
})

test('profile drafts and saved uploads do not earn unreviewed TrustScore', async t => {
  const student = studentWith()
  t.mock.method(Student, 'findOne', async () => student)

  const draft = await updateCurrentStudent('s', {
    githubLink: [{ url: 'https://example.com/draft', saved: false }],
    projects: [{ name: 'Draft', link: 'https://example.com/draft-project', saved: false }],
  })
  assert.equal(draft.trustScore, 0)
  assert.equal(student.trustScoreState?.events?.length || 0, 0)

  const saved = await updateCurrentStudent('s', {
    githubLink: [{ url: 'https://example.com/draft', saved: true }],
    projects: [{ name: 'Draft', link: 'https://example.com/draft-project', saved: true }],
  })
  assert.equal(saved.trustScore, 0)
  assert.deepEqual(student.trustScoreState.events.map(event => event.type), ['profile_link_added', 'project_uploaded'])
})

test('trust events cannot be self-awarded and old duplicate keys survive 250 newer entries', async t => {
  const student = studentWith()
  t.mock.method(Student, 'findOne', async () => student)
  await assert.rejects(recordStudentTrustScoreEvent('s', { eventType: 'skill_verified', referenceId: 'fake' }), error => error.statusCode === 403)
  await assert.rejects(recordStudentTrustScoreEvent('', {}), error => error.statusCode === 401)
  recordTrustScoreEvent(student, 'skill_verified', 'python')
  for (let i = 0; i < 300; i++) recordTrustScoreEvent(student, 'new_skill_added', `name-${i}`)
  assert.equal(recordTrustScoreEvent(student, 'skill_verified', 'python').recorded, false)
  assert.equal(student.trustScore, 60)
})

test('approval updates profile, renewal date and reputation; expiration is applied once', async t => {
  const student = studentWith([{ name: 'Python', category: 'Backend' }])
  await applyReviewedSkillAssessment(student, { eventType: 'verify_completed', skillName: 'Python', assessmentId: 'review-1' }, 'transaction')
  assert.equal(student.trustScore, 60)
  assert.equal(student.skillHubSkills[0].renewalDue, dayOffset(365))
  assert.deepEqual(student.skills, ['Python'])
  assert.equal(student.skillHubSkills[0].assessmentId, 'review-1')
  assert.equal(student.skillHubState.skillLog[0].points, 60)
  student.skillHubSkills[0].renewalDue = dayOffset(-1)
  t.mock.method(Student, 'findOne', async () => student)
  const profile = await getCurrentStudent('s')
  assert.equal(profile.skillHubSkills[0].verified, false)
  assert.equal(profile.skillHubSkills[0].renewalStatus, 'expired')
  assert.equal(student.trustScore, 0)
  assert.equal(await reconcileSkillExpiry(student), false)
  assert.equal(student.trustScoreState.events.filter(item => item.type === 'skill_expired').length, 1)
  await applyReviewedSkillAssessment(student, { eventType: 'reverify_completed', skillName: 'Python', assessmentId: 'review-2' }, 'transaction')
  assert.equal(student.skillHubSkills[0].renewalDue, dayOffset(365))
  assert.equal(student.skillHubSkills[0].verified, true)
  assert.equal(student.trustScore, 30, 'renewal credit does not erase the outstanding expiry penalty')
})

test('legacy verification can expire without charging an unearned penalty', async () => {
  const student = studentWith([{ name: 'Legacy', verified: true, renewalDue: dayOffset(-1) }])
  student.trustScore = 400
  await reconcileSkillExpiry(student)
  assert.equal(student.trustScore, 400)
  assert.equal(buildStudentSkillHubSkills(student)[0].verified, false)
})

test('daily rewards are capped by submission day and retention streak supports out-of-order review', async () => {
  const student = studentWith([{ name: 'React', verified: true, renewalDue: dayOffset(100) }])
  for (const offset of [-2, 0, -1]) await applyReviewedSkillAssessment(student, { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(offset), assessmentId: `practice-${offset}` }, 'transaction')
  assert.equal(student.skillHubSkills[0].streak, 3)
  assert.equal(student.skillHubSkills[0].longestStreak, 3)
  assert.equal(student.trustScore, 60)
  await applyReviewedSkillAssessment(student, { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(0), assessmentId: 'duplicate-day' }, 'transaction')
  assert.equal(student.skillHubSkills[0].streak, 3)
  assert.equal(student.skillHubSkills[0].longestStreak, 3)
  assert.equal(student.trustScore, 60)
  for (const challengeId of [2, 5]) await applyReviewedSkillAssessment(student, { eventType: 'challenge_completed', skillName: 'React', challengeId, earnedDay: dayOffset(-3), assessmentId: `challenge-${challengeId}` }, 'transaction')
  assert.equal(student.trustScore, 140)
  assert.equal(student.trustScoreState.events.at(-1).referenceId, dayOffset(-3))
})

test('streak summaries reset stale runs and report real seven-day practice activity', () => {
  assert.equal(activeStreak({ streak: 5, lastRetentionDate: dayOffset(-1) }), 5)
  assert.equal(activeStreak({ streak: 5, lastRetentionDate: dayOffset(-2) }), 0)
  const skills = [
    { name: 'React', streak: 3, longestStreak: 8 },
    { name: 'SQL', streak: 1, longestStreak: 2 },
  ]
  const log = [
    { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(0) },
    { eventType: 'retention_completed', skillName: 'SQL', earnedDay: dayOffset(0) },
    { eventType: 'retention_completed', skillName: 'React', earnedDay: dayOffset(-1) },
  ]
  const summary = buildStreakSummary(skills, log)
  assert.equal(summary.current, 3)
  assert.equal(summary.longest, 8)
  assert.equal(summary.overallCurrent, 2)
  assert.equal(summary.overallLongest, 2)
  assert.equal(summary.totalPracticeDays, 2)
  assert.equal(summary.activeSkills, 2)
  assert.equal(summary.completedToday, 2)
  assert.equal(summary.nextMilestone, 7)
  assert.deepEqual(summary.week.slice(-2).map(day => day.count), [1, 2])
})

test('assessment eligibility blocks level jumps, expired upgrades, early renewal and wrong challenge skills', () => {
  const student = studentWith([{ name: 'React', verified: true, stage: 'Beginner', renewalDue: dayOffset(90) }])
  const base = { skillName: 'React', response }
  assert.throws(() => validateAssessment(student, { ...base, mode: 'verify' }), /already verified/)
  assert.throws(() => validateAssessment(student, { ...base, mode: 'reverify' }), /30 days/)
  assert.throws(() => validateAssessment(student, { ...base, mode: 'upgrade', targetStage: 'Pro' }), /next skill/)
  assert.throws(() => validateAssessment(student, { ...base, mode: 'challenge', challengeId: 4 }), /different skill/)
  assert.doesNotThrow(() => validateAssessment(student, { ...base, mode: 'upgrade', targetStage: 'Intermediate' }))
  student.skillHubSkills[0].stage = 'Pro'
  assert.doesNotThrow(() => validateAssessment(student, { ...base, mode: 'upgrade', targetStage: 'Pro Mastery' }))
  student.skillHubSkills[0].stage = 'Pro Mastery'
  assert.throws(() => validateAssessment(student, { ...base, mode: 'upgrade', targetStage: 'Pro Mastery' }), /next skill/)
  student.skillHubSkills[0].renewalDue = dayOffset(-1)
  assert.throws(() => validateAssessment(student, { ...base, mode: 'upgrade', targetStage: 'Intermediate' }), /active verified/)
  assert.doesNotThrow(() => validateAssessment(student, { ...base, mode: 'reverify' }))
})

test('archived skills retain evidence but are hidden from matching until restored', async t => {
  const student = studentWith([{ name: 'React', verified: true, renewalDue: dayOffset(90), stage: 'Pro' }])
  student.skills = ['React']
  t.mock.method(Student, 'findOne', async () => student)

  const archived = await setStudentSkillArchived('s', { skillName: 'React', archived: true })
  assert.equal(archived.skills[0].archived, true)
  assert.equal(student.skillHubSkills[0].archived, true)
  assert.equal(student.skillHubState.skillLog[0].eventType, 'archived')
  assert.deepEqual(publishedSkillNames(student.skills, student.skillHubSkills), [])
  assert.throws(() => validateAssessment(student, { skillName: 'React', mode: 'retain', response }), /Restore this skill/)
  const gap = buildSkillGapReport(buildStudentSkillHubSkills(student), [{ gigManagementState: { gigs: [{ title: 'Frontend', status: 'Hiring', skills: ['React'] }] } }])
  assert.equal(gap.overallMatch, 0)
  assert.equal(gap.gapData[0].status, 'Archived')

  const restored = await setStudentSkillArchived('s', { skillName: 'React', archived: false })
  assert.equal(restored.skills[0].archived, false)
  assert.equal(student.skillHubState.skillLog[0].eventType, 'restored')
  assert.deepEqual(publishedSkillNames(student.skills, student.skillHubSkills), ['React'])
  assert.doesNotThrow(() => validateAssessment(student, { skillName: 'React', mode: 'retain', response }))
})

test('gap report counts real active GIG requirements without invented market percentages', () => {
  const skills = buildStudentSkillHubSkills({ skillHubSkills: [{ name: 'React', verified: true, renewalDue: dayOffset(90) }, { name: 'SQL', verified: false }] })
  const companies = [{ gigManagementState: { gigs: [
    { title: 'Full stack', status: 'Hiring', skills: ['React', 'react', 'SQL'] },
    { title: 'UI', status: 'Hiring', skills: ['React'] },
    { title: 'Old', status: 'Closed', skills: ['Figma'] },
  ] } }]
  const report = buildSkillGapReport(skills, companies)
  assert.equal(report.activeGigs, 2)
  assert.equal(report.overallMatch, 67)
  assert.equal(report.totalRequirements, 3)
  assert.equal(report.gapData[0].skill, 'SQL')
  assert.equal(report.strengths[0].gigs, 2)
  assert.equal(buildSkillGapReport([], []).overallMatch, 0)
})

test('Skill Hub response uses saved activity and an empty marketplace remains empty', async t => {
  const student = studentWith()
  t.mock.method(Student, 'findOne', async () => student)
  t.mock.method(Company, 'aggregate', async () => [])
  const hub = await getStudentSkillHub('s')
  assert.deepEqual(hub.skills, [])
  assert.deepEqual(hub.skillHubState.daily.completedChallenges, [])
  assert.deepEqual(hub.skillHubState.skillGapReport.gapData, [])
  assert.equal(hub.challenges.length, 8)
})

test('profile heatmap aggregates only approved assessment activity by server day', () => {
  assert.deepEqual(buildActivityDays([
    { eventType: 'retention_completed', earnedDay: '2026-09-10' },
    { eventType: 'challenge_completed', earnedDay: '2026-09-10' },
    { eventType: 'verify_completed', earnedDay: '2026-09-11' },
    { eventType: 'expired', earnedDay: '2026-09-11' },
    { eventType: 'created', earnedDay: '2026-09-12' },
    { eventType: 'upgrade_completed', earnedDay: 'invalid' },
  ]), [{ date: '2026-09-10', count: 2 }, { date: '2026-09-11', count: 1 }])
})

test('profile heatmap validates monthly and yearly database ranges', () => {
  assert.deepEqual(normalizeHeatmapFilters({ view: 'month', year: '2026', month: '8' }, '2026-09-11'), {
    view: 'month', year: 2026, month: 8, startDate: '2026-08-01', endDate: '2026-09-01',
  })
  assert.deepEqual(normalizeHeatmapFilters({ view: 'year', year: '2025' }, '2026-09-11'), {
    view: 'year', year: 2025, month: null, startDate: '2025-01-01', endDate: '2026-01-01',
  })
  assert.throws(() => normalizeHeatmapFilters({ view: 'month', year: '2026', month: '10' }, '2026-09-11'), /future/i)
  assert.throws(() => normalizeHeatmapFilters({ view: 'week', year: '2026' }, '2026-09-11'), /month or year/i)
})

test('stale skill writes report a conflict instead of silently succeeding', async t => {
  const student = studentWith()
  t.mock.method(Student, 'findOne', async () => student)
  student.save = async () => { throw Object.assign(new Error('stale'), { name: 'DocumentNotFoundError' }) }
  await assert.rejects(updateStudentSkillHub('s', { skills: [{ name: 'React' }] }), error => error.statusCode === 409)
})
