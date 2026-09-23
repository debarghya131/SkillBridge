const assert = require('node:assert/strict')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Student = require('../models/Student')
const Company = require('../models/Company')
const NetworkConnection = require('../models/NetworkConnection')
const SkillAssessment = require('../models/SkillAssessment')
const SkillRequest = require('../models/SkillRequest')
const TaskSubmission = require('../models/TaskSubmission')
const TeamPost = require('../models/TeamPost')
const { deleteCurrentStudentAccount } = require('../controllers/studentController')
const { pairKey } = require('../controllers/networkController')
const { hashPassword } = require('../utils/auth')

async function run() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ids = { students: [], companies: [], submissions: [], posts: [] }
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    const [studentPassword, peerPassword, companyPassword] = await Promise.all([
      hashPassword('integration-only'), hashPassword('peer-only'), hashPassword('company-only'),
    ])
    const [student, peer] = await Student.create([
      { name: 'Deletion Integration Student', email: `delete-student-${suffix}@example.com`, passwordHash: studentPassword, sessions: [{ token: `delete-${suffix}` }] },
      { name: 'Deletion Integration Peer', email: `delete-peer-${suffix}@example.com`, passwordHash: peerPassword },
    ])
    ids.students.push(student._id, peer._id)
    const company = await Company.create({
      businessName: 'Deletion Integration Company', email: `delete-company-${suffix}@example.com`, passwordHash: companyPassword,
      gigManagementState: { applicantsByGig: { 1: [{ studentId: String(student._id), name: student.name }] }, gigs: [{ id: 1, applicants: 1 }] },
      taskReviewGuides: { [`${student._id}:1`]: { note: 'remove this' } },
      projectWorkspaceState: { projects: [] },
    })
    ids.companies.push(company._id)
    const submission = await TaskSubmission.create({ studentId: student._id, companyId: company._id, companyGigId: 1, opportunityId: 1, studentName: student.name, companyName: company.businessName, gigTitle: 'Deletion project', status: 'approved' })
    ids.submissions.push(submission._id)
    company.projectWorkspaceState.projects = [{ id: 'workspace-1', submissionId: String(submission._id), title: 'Deletion project' }]
    await company.save()
    await NetworkConnection.create({ pairKey: pairKey(student._id, peer._id), requester: student._id, recipient: peer._id, status: 'accepted' })
    await SkillAssessment.create({ studentId: student._id, skillName: 'React', mode: 'verify', attemptKey: `delete-${suffix}`, response: 'Original deletion-test evidence.' })
    await SkillRequest.create({ studentId: student._id, requestedName: 'Deletion Skill', normalizedName: `deletion skill ${suffix}`, category: 'Other' })
    const [ownedPost, peerPost] = await TeamPost.create([
      { owner: student._id, title: 'Owned deletion team', description: 'This post is deleted with its owner account.', type: 'Project', slots: 2, requiredSkills: ['React'] },
      { owner: peer._id, title: 'Peer deletion team', description: 'The deleted member is removed from this team request list.', type: 'Project', slots: 2, requiredSkills: ['React'], requests: [{ student: student._id, message: 'I can contribute original React work.', status: 'pending' }] },
    ])
    ids.posts.push(ownedPost._id, peerPost._id)
    await assert.rejects(deleteCurrentStudentAccount(`delete-${suffix}`, { confirmation: 'DELETE', password: 'wrong-password' }), /current password/)
    assert.ok(await Student.exists({ _id: student._id }))
    await deleteCurrentStudentAccount(`delete-${suffix}`, { confirmation: 'DELETE', password: 'integration-only' })
    assert.equal(await Student.exists({ _id: student._id }), null)
    assert.equal(await NetworkConnection.countDocuments({ $or: [{ requester: student._id }, { recipient: student._id }] }), 0)
    assert.equal(await SkillAssessment.countDocuments({ studentId: student._id }), 0)
    assert.equal(await SkillRequest.countDocuments({ studentId: student._id }), 0)
    assert.equal(await TaskSubmission.countDocuments({ studentId: student._id }), 0)
    assert.equal(await TeamPost.exists({ _id: ownedPost._id }), null)
    assert.equal((await TeamPost.findById(peerPost._id).lean()).requests.length, 0)
    const scrubbedCompany = await Company.findById(company._id).lean()
    assert.equal(scrubbedCompany.gigManagementState.applicantsByGig[1].length, 0)
    assert.equal(scrubbedCompany.projectWorkspaceState.projects.length, 0)
    assert.equal(Object.keys(scrubbedCompany.taskReviewGuides || {}).length, 0)
    console.log('Account deletion integration passed: confirmation/password, linked-data deletion and company-reference scrubbing.')
  } finally {
    if (ids.posts.length) await TeamPost.deleteMany({ _id: { $in: ids.posts } })
    if (ids.submissions.length) await TaskSubmission.deleteMany({ _id: { $in: ids.submissions } })
    if (ids.companies.length) await Company.deleteMany({ _id: { $in: ids.companies } })
    if (ids.students.length) await Student.deleteMany({ _id: { $in: ids.students } })
    await disconnectFromDatabase()
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
