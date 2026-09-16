const mongoose = require('mongoose')
const { buildDefaultStudentProfile } = require('../config/studentDefaults')
const { buildDefaultSkillHubState } = require('../config/skillHubStateDefaults')

const profileLinkSchema = new mongoose.Schema({
  icon: { type: String, default: '🐙' },
  url: { type: String, required: true },
  saved: { type: Boolean, default: true },
}, { _id: false })

const contactInfoSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
  saved: { type: Boolean, default: true },
}, { _id: false })

const projectSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  desc: { type: String, default: '' },
  link: { type: String, default: '' },
  demoLink: { type: String, default: '' },
  saved: { type: Boolean, default: false },
}, { _id: false })

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const gigSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  company: { type: String, default: '' },
  location: { type: String, default: '' },
  workMode: { type: String, default: '' },
  title: { type: String, default: '' },
  budget: { type: String, default: '' },
  match: { type: Number, default: undefined },
  tags: { type: [String], default: [] },
  posted: { type: String, default: '' },
  progress: { type: String, default: '' },
  completedOn: { type: String, default: '' },
}, { _id: false })

const opportunitySchema = new mongoose.Schema({
  id: { type: Number, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  companyGigId: { type: Number, default: null },
  companyGigPublicId: { type: String, default: '' },
  title: { type: String, default: '' },
  company: { type: String, default: '' },
  companyInitial: { type: String, default: '' },
  companyColor: { type: String, default: '' },
  companyLogo: { type: String, default: '' },
  location: { type: String, default: '' },
  stipend: { type: String, default: '' },
  deadline: { type: String, default: '' },
  sentOn: { type: String, default: '' },
  message: { type: String, default: '' },
  taskTitle: { type: String, default: '' },
  taskType: { type: String, enum: ['live_project', 'code', 'mcq', 'written', 'mixed', 'design', 'data_analysis', 'case_study', 'research', 'presentation'], default: 'mixed' },
  taskDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  taskInstructions: { type: String, default: '' },
  taskDeadline: { type: String, default: '' },
  taskPoints: { type: Number, default: 0 },
  matchedSkills: { type: [String], default: [] },
  duration: { type: String, default: '' },
  type: { type: String, default: '' },
  source: { type: String, enum: ['application', 'direct_invite'], default: 'application' },
  status: { type: String, enum: ['new', 'accepted', 'declined'], default: 'new' },
}, { _id: false })

const gigStateSchema = new mongoose.Schema({
  opportunities: { type: [opportunitySchema], default: undefined },
  browseGigs: { type: [gigSchema], default: undefined },
  savedGigIds: { type: [Number], default: undefined },
  appliedGigIds: { type: [Number], default: undefined },
  appliedGigs: { type: [gigSchema], default: undefined },
  opportunityStatusById: { type: mongoose.Schema.Types.Mixed, default: undefined },
  activeGigBase: { type: [gigSchema], default: undefined },
  completedGigs: { type: [gigSchema], default: undefined },
}, { _id: false })

const skillHubSkillSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  level: { type: Number, default: 0 },
  stage: { type: String, enum: ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery'], default: 'Beginner' },
  category: { type: String, default: 'Frontend' },
  verified: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  archivedAt: { type: String, default: '' },
  renewalStatus: { type: String, default: 'unverified' },
  renewalDue: { type: String, default: '-' },
  verifiedAt: { type: String, default: '' },
  assessmentId: { type: String, default: '' },
  lastRetentionDate: { type: String, default: '' },
  trustGain: { type: Number, default: 0 },
  trustLoss: { type: Number, default: 0 },
  createdOn: { type: String, default: '' },
  lastEvent: { type: String, default: 'created' },
  streak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  missedDays: { type: Number, default: 0 },
  wrongAnswers: { type: Number, default: 0 },
}, { _id: false })

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: undefined },
  phone: { type: String, unique: true, sparse: true, trim: true, default: undefined },
  passwordHash: { type: String, required: true, select: false },
  preferredLanguage: { type: String, default: '' },
  location: { type: String, default: '' },
  contactMethod: { type: String, enum: ['email', 'phone'], default: 'email' },
  verificationMethod: { type: String, enum: ['aadhaar', 'digilocker'], default: 'aadhaar' },
  // Legacy raw fields remain readable only by the migration command. New
  // accounts store an HMAC fingerprint instead of an identity reference.
  aadhaarNumber: { type: String, default: '', select: false },
  digilockerToken: { type: String, default: '', select: false },
  identityVerificationHash: { type: String, default: '', select: false, maxlength: 100 },
  trustScore: { type: Number, default: 0 },
  trustScoreState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  avatar: { type: String, default: null },
  about: { type: String, default: '', maxlength: 700 },
  collaborationFocus: { type: [String], default: () => [] },
  workStyle: { type: String, default: '', maxlength: 300 },
  skills: { type: [String], default: () => buildDefaultStudentProfile().skills },
  githubLink: { type: [profileLinkSchema], default: () => buildDefaultStudentProfile().githubLink },
  contactInfo: { type: [contactInfoSchema], default: () => buildDefaultStudentProfile().contactInfo },
  projects: { type: [projectSchema], default: () => buildDefaultStudentProfile().projects },
  videoUrl: { type: String, default: null },
  // New accounts must begin with an empty, persisted Skill Hub. Leaving these
  // undefined made older migration and seed data too easy to surface at login.
  skillHubSkills: { type: [skillHubSkillSchema], default: () => [] },
  skillHubState: { type: mongoose.Schema.Types.Mixed, default: () => buildDefaultSkillHubState() },
  gigState: { type: gigStateSchema, default: undefined },
  networkState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  earningState: { type: mongoose.Schema.Types.Mixed, default: undefined },
  dailySectionUsage: { type: mongoose.Schema.Types.Mixed, default: undefined },
  sessions: { type: [sessionSchema], default: [], select: false },
}, {
  timestamps: true,
  optimisticConcurrency: ['trustScoreState', 'trustScore', 'skillHubSkills', 'gigState', 'sessions'],
})

studentSchema.post('save', function(error, doc, next) {
  if (error.name === 'VersionError') {
    error.statusCode = 409
    error.message = 'Your account changed during this update. Refresh and retry.'
  }
  next(error)
})

studentSchema.index({ trustScore: -1, createdAt: -1 })
studentSchema.index({ location: 1 })
studentSchema.index({ skills: 1 })
studentSchema.index({ 'skillHubSkills.name': 1 })

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema)
