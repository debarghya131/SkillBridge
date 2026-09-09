const mongoose = require('mongoose')

const contactInfoSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  value: { type: String, default: '' },
}, { _id: false })

const projectSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  desc: { type: String, default: '' },
}, { _id: false })

const taskSubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
  companyGigId: { type: Number, default: null },
  studentName: { type: String, required: true, trim: true },
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
  matchedSkills: { type: [String], default: [] },
  submissionLink: { type: String, required: true, trim: true },
  note: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'selected', 'work_started', 'delivered', 'approved', 'completed', 'needs_revision'],
    default: 'submitted',
  },
  feedback: { type: String, default: '', trim: true },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
}, {
  timestamps: true,
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

module.exports = mongoose.models.TaskSubmission || mongoose.model('TaskSubmission', taskSubmissionSchema)
