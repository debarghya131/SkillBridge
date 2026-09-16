const mongoose = require('mongoose')

const contactInfoSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  value: { type: String, default: '' },
}, { _id: false })

const projectSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  desc: { type: String, default: '' },
  link: { type: String, default: '' },
  demoLink: { type: String, default: '' },
}, { _id: false })

const taskSubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
  companyGigId: { type: Number, default: null },
  companyGigPublicId: { type: String, default: '', index: true },
  studentName: { type: String, required: true, trim: true },
  studentAvatar: { type: String, default: null },
  studentLocation: { type: String, default: '' },
  studentTrustScore: { type: Number, default: 0 },
  studentSkills: { type: [String], default: [] },
  studentSkillsByLevel: { type: mongoose.Schema.Types.Mixed, default: {} },
  studentStreak: { type: Number, default: 0 },
  studentGithub: { type: String, default: '' },
  studentContactInfo: { type: [contactInfoSchema], default: [] },
  studentProjects: { type: [projectSchema], default: [] },
  studentVideoUrl: { type: String, default: null },
  opportunityId: { type: Number, default: null },
  gigTitle: { type: String, required: true, trim: true, index: true },
  companyName: { type: String, default: '', trim: true },
  companyLocation: { type: String, default: '', trim: true },
  taskTitle: { type: String, default: '', trim: true },
  taskType: { type: String, enum: ['live_project', 'code', 'mcq', 'written', 'mixed', 'design', 'data_analysis', 'case_study', 'research', 'presentation'], default: 'mixed' },
  taskDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  taskInstructions: { type: String, default: '', trim: true },
  workBrief: { type: String, default: '', trim: true, maxlength: 4000 },
  taskDeadline: { type: String, default: '', trim: true },
  taskPoints: { type: Number, default: 0 },
  score: { type: Number, default: null, min: 0, max: 100 },
  interviewSubmission: { type: mongoose.Schema.Types.Mixed, default: null },
  externalPayment: { type: mongoose.Schema.Types.Mixed, default: null },
  completedAt: { type: Date, default: null },
  matchedSkills: { type: [String], default: [] },
  submissionLink: { type: String, default: '', trim: true },
  submissionContent: { type: String, default: '', trim: true, maxlength: 10000 },
  note: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'selected', 'rejected', 'work_started', 'delivered', 'approved', 'completed', 'ready_to_hire', 'needs_revision'],
    default: 'submitted',
  },
  feedback: { type: String, default: '', trim: true },
  revisionReturnStatus: { type: String, enum: ['submitted', 'delivered'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
}, {
  timestamps: true,
  optimisticConcurrency: true,
})

taskSubmissionSchema.index(
  { studentId: 1, companyId: 1, companyGigId: 1, opportunityId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      companyId: { $type: 'objectId' },
      companyGigId: { $type: 'number' },
      opportunityId: { $type: 'number' },
    },
  },
)
taskSubmissionSchema.index({ companyId: 1, submittedAt: -1 })
taskSubmissionSchema.index({ companyId: 1, 'externalPayment.reference': 1 }, {
  unique: true,
  partialFilterExpression: { 'externalPayment.reference': { $type: 'string' } },
})

module.exports = mongoose.models.TaskSubmission || mongoose.model('TaskSubmission', taskSubmissionSchema)
