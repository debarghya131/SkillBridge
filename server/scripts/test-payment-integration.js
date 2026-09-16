const assert = require('node:assert/strict')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Student = require('../models/Student')
const Company = require('../models/Company')
const TaskSubmission = require('../models/TaskSubmission')
const { getStudentEarningState } = require('../controllers/earningController')
const { getCompanyPayments, recordExternalPayment } = require('../controllers/companyPaymentController')

async function run() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ids = { students: [], companies: [], submissions: [] }
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    const student = await Student.create({
      name: 'Payment Integration Student', email: `payment-student-${suffix}@example.com`, passwordHash: 'integration-only',
      sessions: [{ token: `student-${suffix}` }],
    })
    const company = await Company.create({
      businessName: 'Payment Integration Company', email: `payment-company-${suffix}@example.com`, passwordHash: 'integration-only',
      sessions: [{ token: `company-${suffix}` }], gigManagementState: { gigs: [{ id: 1, budget: '₹15,000 / project' }, { id: 2, budget: '₹8,000 / project' }] },
    })
    ids.students.push(student._id); ids.companies.push(company._id)
    const [approved, secondApproved] = await TaskSubmission.create([
      { studentId: student._id, companyId: company._id, companyGigId: 1, opportunityId: 1, studentName: student.name, companyName: company.businessName, gigTitle: 'Payment integration project', status: 'approved' },
      { studentId: student._id, companyId: company._id, companyGigId: 2, opportunityId: 2, studentName: student.name, companyName: company.businessName, gigTitle: 'Duplicate-reference project', status: 'approved' },
    ])
    ids.submissions.push(approved._id, secondApproved._id)

    let earning = await getStudentEarningState(`student-${suffix}`)
    assert.equal(earning.pending.filter(item => !item.demoData).length, 2)
    assert.equal(earning.totalRecorded, 0)
    const payment = { amount: 15000, reference: `PAY-${suffix}`, method: 'bank_transfer', paidOn: '2026-09-01', confirmed: true }
    await recordExternalPayment(`company-${suffix}`, String(approved._id), payment)
    earning = await getStudentEarningState(`student-${suffix}`)
    const realTransaction = earning.transactions.find(item => item.id === String(approved._id))
    assert.equal(realTransaction.amount, 15000)
    assert.equal(realTransaction.reference, payment.reference)
    assert.equal(earning.totalRecorded, 15000)
    assert.equal(earning.pending.filter(item => !item.demoData).length, 1)
    await recordExternalPayment(`company-${suffix}`, String(approved._id), payment)
    assert.equal((await TaskSubmission.findById(approved._id).lean()).status, 'completed')
    await assert.rejects(recordExternalPayment(`company-${suffix}`, String(secondApproved._id), { ...payment, amount: 8000 }), /reference has already been recorded/)
    const companyPayments = await getCompanyPayments(`company-${suffix}`)
    assert.equal(companyPayments.transactions.find(item => item.id === String(approved._id)).reference, payment.reference)
    console.log('Payment integration passed: approved work, company-owned external record, student visibility, idempotent retry and unique references.')
  } finally {
    if (ids.submissions.length) await TaskSubmission.deleteMany({ _id: { $in: ids.submissions } })
    if (ids.companies.length) await Company.deleteMany({ _id: { $in: ids.companies } })
    if (ids.students.length) await Student.deleteMany({ _id: { $in: ids.students } })
    await disconnectFromDatabase()
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
