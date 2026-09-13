const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  skillName: { type: String, required: true, maxlength: 100 },
  mode: { type: String, enum: ['verify', 'reverify', 'upgrade', 'retain', 'challenge'], required: true },
  targetStage: { type: String, default: '' },
  challengeId: { type: Number, default: null },
  attemptKey: { type: String, required: true },
  earnedDay: { type: String, default: '' },
  brief: { type: String, default: '' },
  rewardPoints: { type: Number, default: 0 },
  evidenceLink: { type: String, default: '', maxlength: 500 },
  response: { type: String, required: true, maxlength: 10000 },
  status: { type: String, enum: ['pending', 'needs_revision', 'approved', 'rejected'], default: 'pending' },
  open: { type: Boolean, default: true },
  assignedReviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reviewer', default: null },
  assignedReviewerName: { type: String, default: '', maxlength: 100 },
  claimedAt: { type: Date, default: null },
  rubric: { type: {
    correctness: { type: Number, min: 0, max: 5 },
    evidence: { type: Number, min: 0, max: 5 },
    understanding: { type: Number, min: 0, max: 5 },
    testing: { type: Number, min: 0, max: 5 },
    communication: { type: Number, min: 0, max: 5 },
    total: { type: Number, min: 0, max: 100 },
  }, default: undefined },
  feedback: { type: String, default: '', maxlength: 2000 },
  reviewer: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
  reviewHistory: { type: [{
    status: String, feedback: String, reviewer: String, reviewedAt: Date,
    response: String, evidenceLink: String, rubric: mongoose.Schema.Types.Mixed,
  }], default: [] },
}, { timestamps: true, optimisticConcurrency: true })
schema.index({ studentId: 1, attemptKey: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } })
schema.index({ studentId: 1, attemptKey: 1, open: 1 }, { unique: true, partialFilterExpression: { open: true }, name: 'one_open_skill_assessment' })
schema.index({ status: 1, assignedReviewerId: 1, createdAt: 1 })
schema.index({ studentId: 1, status: 1, createdAt: -1 })
module.exports = mongoose.models.SkillAssessment || mongoose.model('SkillAssessment', schema)
