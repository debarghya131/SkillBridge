const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const reviewerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['reviewer', 'admin'], default: 'reviewer' },
  active: { type: Boolean, default: true },
  sessions: { type: [sessionSchema], default: [], select: false },
  lastSignedInAt: { type: Date, default: null },
}, { timestamps: true })

reviewerSchema.index({ active: 1, role: 1 })

module.exports = mongoose.models.Reviewer || mongoose.model('Reviewer', reviewerSchema)
