const test = require('node:test')
const assert = require('node:assert/strict')
const { claimLeaseMs, normalizeQueueFilters } = require('../controllers/reviewerController')
const { normalizeRubric, serializeBlindAssessment } = require('../controllers/skillAssessmentController')

test('review rubric validates all criteria and calculates the weighted score', () => {
  assert.deepEqual(normalizeRubric({ correctness: 5, evidence: 4, understanding: 3, testing: 2, communication: 1 }), {
    correctness: 5, evidence: 4, understanding: 3, testing: 2, communication: 1, total: 74,
  })
  assert.throws(() => normalizeRubric({ correctness: 5 }), /every rubric score/i)
  assert.throws(() => normalizeRubric({ correctness: 6, evidence: 4, understanding: 3, testing: 2, communication: 1 }), /0 to 5/i)
})

test('review queues clamp pagination and reject unsupported filters', () => {
  assert.deepEqual(normalizeQueueFilters({ queue: 'mine', mode: 'upgrade', page: '-2', pageSize: '500' }), {
    queue: 'mine', mode: 'upgrade', page: 1, pageSize: 50,
  })
  assert.deepEqual(normalizeQueueFilters({ queue: 'all', mode: 'unknown' }), {
    queue: 'available', mode: '', page: 1, pageSize: 25,
  })
})

test('review claims use a bounded recovery lease', () => {
  const previous = process.env.REVIEW_CLAIM_TTL_MINUTES
  process.env.REVIEW_CLAIM_TTL_MINUTES = '1'
  assert.equal(claimLeaseMs(), 15 * 60 * 1000)
  process.env.REVIEW_CLAIM_TTL_MINUTES = '5000'
  assert.equal(claimLeaseMs(), 24 * 60 * 60 * 1000)
  if (previous == null) delete process.env.REVIEW_CLAIM_TTL_MINUTES
  else process.env.REVIEW_CLAIM_TTL_MINUTES = previous
})

test('blind assessment serialization excludes student identity', () => {
  const result = serializeBlindAssessment({
    _id: 'assessment-1', studentId: 'student-1', studentName: 'Hidden Student', college: 'Hidden College',
    skillName: 'React', mode: 'verify', response: 'Evidence', status: 'pending', reviewHistory: [],
  })
  assert.equal(result.id, 'assessment-1')
  assert.equal(result.studentId, undefined)
  assert.equal(result.studentName, undefined)
  assert.equal(result.college, undefined)
})
