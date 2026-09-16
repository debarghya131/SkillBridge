const mongoose = require('mongoose')

const joinRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  source: { type: String, enum: ['application', 'invitation'], default: 'application' },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'withdrawn'], default: 'pending' },
  respondedAt: { type: Date, default: null },
  // Kept after a member leaves so accepted collaboration milestones remain
  // auditable without treating a past team-up as an active membership.
  acceptedAt: { type: Date, default: null },
}, { timestamps: true })

const teamPostSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  type: { type: String, enum: ['Project', 'Hackathon', 'Research', 'Open Source', 'Case Study', 'Startup', 'Study Group', 'Design Challenge', 'Data Challenge', 'Competition', 'Community Initiative', 'Content Collaboration'], default: 'Project' },
  requiredSkills: { type: [String], default: [] },
  slots: { type: Number, min: 1, max: 20, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  requests: { type: [joinRequestSchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true })

teamPostSchema.index({ status: 1, createdAt: -1 })
teamPostSchema.index({ owner: 1, createdAt: -1 })
teamPostSchema.index({ 'requests.student': 1, 'requests.status': 1 })
teamPostSchema.index({ 'requests.student': 1, createdAt: -1 })
teamPostSchema.index({ 'requests.student': 1, 'requests.acceptedAt': 1 })

module.exports = mongoose.models.TeamPost || mongoose.model('TeamPost', teamPostSchema)
