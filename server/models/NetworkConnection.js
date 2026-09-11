const mongoose = require('mongoose')

const networkConnectionSchema = new mongoose.Schema({
  pairKey: { type: String, required: true, unique: true, index: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true },
  respondedAt: { type: Date, default: null },
}, { timestamps: true })

networkConnectionSchema.index({ recipient: 1, status: 1, createdAt: -1 })
networkConnectionSchema.index({ requester: 1, status: 1, createdAt: -1 })

module.exports = mongoose.models.NetworkConnection || mongoose.model('NetworkConnection', networkConnectionSchema)
