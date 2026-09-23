const mongoose = require('mongoose')
const { CATEGORIES } = require('../utils/skillPolicy')

const skillRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  requestedName: { type: String, required: true, trim: true, maxlength: 100 },
  normalizedName: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: CATEGORIES, default: 'Other' },
  note: { type: String, default: '', trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'merged'], default: 'pending' },
  matchedSkillId: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillCatalog', default: null },
  adminFeedback: { type: String, default: '', trim: true, maxlength: 1000 },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Reviewer', default: null },
  decidedAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true })

skillRequestSchema.index({ studentId: 1, normalizedName: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'pending' },
  name: 'one_open_skill_request',
})
skillRequestSchema.index({ status: 1, createdAt: 1 })

module.exports = mongoose.models.SkillRequest || mongoose.model('SkillRequest', skillRequestSchema)
