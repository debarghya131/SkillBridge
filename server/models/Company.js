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

const businessProfileSchema = new mongoose.Schema({
  businessName: { type: String, default: '' },
  location: { type: String, default: '' },
  logo: { type: String, default: '' },
  introVideoUrl: { type: String, default: null, maxlength: 7000000 },
  industry: { type: String, default: '' },
  website: { type: String, default: '' },
  teamSize: { type: String, default: '' },
  workModes: { type: [String], default: [] },
  description: { type: String, default: '' },
  hiringCategories: { type: String, default: '' },
  requiredSkills: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
}, { _id: false })

const companySchema = new mongoose.Schema({
  businessName: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: undefined },
  phone: { type: String, unique: true, sparse: true, trim: true, default: undefined },
  passwordHash: { type: String, required: true, select: false },
  contactMethod: { type: String, enum: ['email', 'phone'], default: 'email' },
  verificationMethod: { type: String, enum: ['gstin', 'udyam'], default: 'gstin' },
  gstin: { type: String, default: '', select: false },
  businessDoc: { type: String, default: '', select: false },
  verificationReferenceHash: { type: String, default: '', select: false, maxlength: 100 },
  location: { type: String, default: '' },
  businessProfile: { type: businessProfileSchema, default: () => buildDefaultCompanyProfile() },
  dashboardState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  gigManagementState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  projectWorkspaceState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  taskLibraryState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  taskReviewGuides: { type: mongoose.Schema.Types.Mixed, default: undefined },
  paymentState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  dailySectionUsage: { type: mongoose.Schema.Types.Mixed, default: undefined },
  sessions: { type: [sessionSchema], default: [], select: false },
}, {
  timestamps: true,
})

module.exports = mongoose.models.Company || mongoose.model('Company', companySchema)
