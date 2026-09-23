const mongoose = require('mongoose')
const { CATEGORIES, STAGES } = require('../utils/skillPolicy')

const upgradeRequirementSchema = new mongoose.Schema({
  stage: { type: String, enum: STAGES.slice(1), required: true },
  instructions: { type: String, required: true, trim: true, maxlength: 4000 },
}, { _id: false })

const dailyTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  instructions: { type: String, required: true, trim: true, maxlength: 4000 },
  kind: { type: String, enum: ['evidence', 'code', 'quiz', 'project'], default: 'evidence' },
  reviewMode: { type: String, enum: ['reviewer'], default: 'reviewer' },
  active: { type: Boolean, default: true },
})

const skillCatalogSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  normalizedName: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  normalizedTerms: { type: [String], required: true },
  slug: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
  aliases: { type: [String], default: [] },
  normalizedAliases: { type: [String], default: [] },
  category: { type: String, enum: CATEGORIES, required: true },
  summary: { type: String, default: '', trim: true, maxlength: 700 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  version: { type: Number, min: 1, default: 1 },
  renewalDays: { type: Number, min: 30, max: 730, default: 365 },
  stages: { type: [String], enum: STAGES, default: () => [...STAGES] },
  verificationInstructions: { type: String, default: '', trim: true, maxlength: 4000 },
  practiceInstructions: { type: String, default: '', trim: true, maxlength: 4000 },
  upgradeRequirements: { type: [upgradeRequirementSchema], default: [] },
  dailyTasks: { type: [dailyTaskSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Reviewer', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Reviewer', required: true },
  publishedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true })

skillCatalogSchema.index({ status: 1, category: 1, name: 1 })
skillCatalogSchema.index({ normalizedAliases: 1, status: 1 })
skillCatalogSchema.index({ normalizedTerms: 1 }, { unique: true, name: 'unique_skill_catalog_term' })

module.exports = mongoose.models.SkillCatalog || mongoose.model('SkillCatalog', skillCatalogSchema)
