const mongoose = require('mongoose')

const joinRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  source: { type: String, enum: ['application', 'invitation'], default: 'application' },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'withdrawn'], default: 'pending' },
  respondedAt: { type: Date, default: null },
}, { timestamps: true })

const teamPostSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  type: { type: String, enum: ['Project', 'Hackathon', 'Research', 'Open Source', 'Case Study'], default: 'Project' },
  requiredSkills: { type: [String], default: [] },
  slots: { type: Number, min: 1, max: 20, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  requests: { type: [joinRequestSchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true })

teamPostSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.models.TeamPost || mongoose.model('TeamPost', teamPostSchema)
