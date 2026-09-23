const test = require('node:test')
const assert = require('node:assert/strict')
const { activeStreak, dayKey } = require('../utils/skillPolicy')
const { buildStreakSummary } = require('../controllers/skillHubController')
const { submitSkillAssessment } = require('../controllers/skillAssessmentController')
const Student = require('../models/Student')
const SkillAssessment = require('../models/SkillAssessment')
const event = (earnedDay, skillName = 'React', eventType = 'retention_completed') => ({ earnedDay, skillName, eventType })

test('streak breaks at IST midnight after a whole missed day, not after 24 hours', () => {
  const skill = { streak: 5, lastRetentionDate: '2026-09-10' }
  assert.equal(dayKey(new Date('2026-09-11T18:29:59Z')), '2026-09-11')
  assert.equal(activeStreak(skill, new Date('2026-09-11T18:29:59Z')), 5)
  assert.equal(activeStreak(skill, new Date('2026-09-11T18:30:00Z')), 0)
})

test('Trust Streak deduplicates days, excludes other activities, and ignores invalid or future dates', () => {
  const log = [event('2026-09-10'), event('2026-09-11', 'SQL'), event('2026-09-11'),
    event('2026-09-12', 'React', 'challenge_completed'), event('2099-01-01'), event('invalid'), event('2026-02-30')]
  assert.equal(buildStreakSummary([], log, '2026-09-12').overallCurrent, 2)
  assert.equal(buildStreakSummary([], log, '2026-09-12').totalPracticeDays, 2)
  assert.equal(buildStreakSummary([], log, '2026-09-13').overallCurrent, 0)
  assert.equal(buildStreakSummary([], [...log, event('2026-09-13')], '2026-09-13').overallCurrent, 1)
  assert.equal(buildStreakSummary([], [...log, event('2026-09-13'), event('2026-09-12')], '2026-09-13').overallCurrent, 4)
})

test('pending daily practice does not block the next IST day; same-day duplicates remain blocked', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-11T18:29:00Z') })
  const student = new Student({ name: 'Student', passwordHash: 'test', sessions: [{ token: 's', createdAt: new Date() }],
    skillHubSkills: [{ name: 'React', verified: true, renewalDue: '2027-09-01', stage: 'Beginner' }] })
  t.mock.method(Student, 'findOne', async () => student)
  const records = []
  t.mock.method(SkillAssessment, 'exists', async query => {
    if (query.open === true && query.mode && query.earnedDay) {
      return records.some(record => record.open === true && record.mode === query.mode && record.earnedDay === query.earnedDay)
    }
    return records.some(record => query.status.$in.includes(record.status)
      && query.$or.some(option => record.attemptKey === option.attemptKey && (!option.earnedDay || record.earnedDay === option.earnedDay)))
  })
  t.mock.method(SkillAssessment, 'create', async values => { const record = new SkillAssessment(values); records.push(record); return record })
  const payload = { skillName: 'React', mode: 'retain', response: 'I implemented and tested the feature, including edge cases and an explanation of the results.' }
  const first = await submitSkillAssessment('s', payload)
  assert.equal(first.earnedDay, '2026-09-11')
  await assert.rejects(submitSkillAssessment('s', payload), /already open/)
  t.mock.timers.setTime(new Date('2026-09-11T18:30:00Z').getTime())
  const second = await submitSkillAssessment('s', payload)
  assert.equal(second.earnedDay, '2026-09-12')
  assert.notEqual(records[0].attemptKey, records[1].attemptKey)
  assert.equal(records[0].status, 'pending')
  await assert.rejects(submitSkillAssessment('s', payload), /already open/)
  t.mock.method(SkillAssessment, 'findOneAndUpdate', async (query, update) => {
    assert.equal(String(query._id), first.id)
    assert.equal(query.mode, 'retain')
    assert.equal(update.$set.earnedDay, undefined)
    assert.equal(update.$set.attemptKey, undefined)
    records[0].set(update.$set)
    return records[0]
  })
  records[0].status = 'needs_revision'
  t.mock.method(SkillAssessment, 'findOne', async query => records.find(record => String(record._id) === String(query._id)
    && String(record.studentId) === String(query.studentId) && record.status === query.status) || null)
  const revised = await submitSkillAssessment('s', { ...payload, id: first.id })
  assert.equal(revised.earnedDay, '2026-09-11')
})
