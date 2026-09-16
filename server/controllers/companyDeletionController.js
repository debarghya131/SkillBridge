const Company = require('../models/Company')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const { verifyPassword } = require('../utils/auth')
const { findModelByActiveToken, getSessionTtlMs, buildAuthError } = require('../utils/session')
const { buildManagedGigId } = require('./gigController')

async function deleteCompanyAccount(token, payload = {}) {
  const company = await findModelByActiveToken(Company, token, 'Company', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30), '+passwordHash')
  if (payload.confirmation !== 'DELETE') throw buildAuthError('Type DELETE to confirm account deletion')
  if (typeof payload.password !== 'string' || !verifyPassword(payload.password, company.passwordHash)) {
    throw buildAuthError('Enter your current password to delete this account', 401)
  }
  // Commit the account and its dependent records together; failures roll back.
  await Company.db.transaction(async session => {
    const current = await Company.findById(company._id).session(session)
    if (!current) throw buildAuthError('Company account no longer exists', 404)
    const gigIds = (current.gigManagementState?.gigs || []).map(gig => buildManagedGigId(String(current._id), gig.publicId || gig.createdAt || `${gig.id}:${gig.title}`))
    const students = Student.find({ $or: [
      { 'gigState.opportunities.companyId': current._id },
      ...['savedGigIds', 'appliedGigIds'].map(key => ({ [`gigState.${key}`]: { $in: gigIds } })),
      ...['browseGigs', 'appliedGigs', 'activeGigBase', 'completedGigs'].map(key => ({ [`gigState.${key}.id`]: { $in: gigIds } })),
    ] }).session(session).cursor()
    for await (const student of students) {
      const opportunityIds = (student.gigState?.opportunities || []).filter(item => String(item.companyId) === String(current._id)).map(item => item.id)
      const linkedIds = [...gigIds, ...opportunityIds.map(id => 800 + id)]
      const pull = { 'gigState.opportunities': { companyId: current._id } }
      for (const key of ['savedGigIds', 'appliedGigIds']) pull[`gigState.${key}`] = { $in: gigIds }
      for (const key of ['browseGigs', 'appliedGigs', 'activeGigBase', 'completedGigs']) pull[`gigState.${key}`] = { id: { $in: linkedIds } }
      const unset = Object.fromEntries(opportunityIds.map(id => [`gigState.opportunityStatusById.${id}`, '']))
      await Student.updateOne({ _id: student._id }, { $pull: pull, ...(opportunityIds.length ? { $unset: unset } : {}) }, { session })
    }
    await TaskSubmission.deleteMany({ companyId: current._id }, { session })
    await Company.deleteOne({ _id: current._id }, { session })
  })
  return { deleted: true }
}

module.exports = { deleteCompanyAccount }
