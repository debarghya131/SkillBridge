const mongoose = require('mongoose')
const {
  buildDefaultCompanyDashboardState,
  buildDefaultCompanyGigManagementState,
  buildDefaultCompanyPaymentState,
  buildDefaultCompanyProfile,
  buildDefaultCompanyWorkspaceState,
} = require('../config/companyDefaults')

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const companySchema = new mongoose.Schema({
  businessName: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: undefined },
  phone: { type: String, unique: true, sparse: true, trim: true, default: undefined },
  passwordHash: { type: String, required: true },
  contactMethod: { type: String, enum: ['email', 'phone'], default: 'email' },
  verificationMethod: { type: String, enum: ['gstin', 'udyam'], default: 'gstin' },
  gstin: { type: String, default: '' },
  businessDoc: { type: String, default: '' },
  location: { type: String, default: '' },
  businessProfile: { type: mongoose.Schema.Types.Mixed, default: () => buildDefaultCompanyProfile() },
  dashboardState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  gigManagementState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  projectWorkspaceState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  taskLibraryState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  taskReviewGuides: { type: mongoose.Schema.Types.Mixed, default: undefined },
  paymentState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  dailySectionUsage: { type: mongoose.Schema.Types.Mixed, default: undefined },
  sessions: { type: [sessionSchema], default: [] },
}, {
  timestamps: true,
})

module.exports = mongoose.models.Company || mongoose.model('Company', companySchema)
