const mongoose = require('mongoose')

const networkConnectionSchema = new mongoose.Schema({
  pairKey: { type: String, required: true, unique: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  respondedAt: { type: Date, default: null },
}, { timestamps: true })

networkConnectionSchema.index({ recipient: 1, status: 1, createdAt: -1 })
networkConnectionSchema.index({ requester: 1, status: 1, createdAt: -1 })

module.exports = mongoose.models.NetworkConnection || mongoose.model('NetworkConnection', networkConnectionSchema)
