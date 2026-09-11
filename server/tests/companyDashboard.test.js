const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildCompanyDashboardOverview,
  buildCreatedGigState,
  buildDeletedGigState,
  buildTalentSearchResult,
  getPublicCompanyProfile,
  buildWorkspaceMilestoneState,
  buildWorkspaceUpdateState,
  buildUpdatedGigState,
  normalizeTalentSearchFilters,
  sanitizeTalentProfile,
  updateCurrentCompany,
  validateCompanyProfile,
} = require('../controllers/companyController')
const Company = require('../models/Company')
const { validateExternalPayment } = require('../controllers/companyPaymentController')
const { calculateGigMatch, isBrowsableGigStatus } = require('../controllers/gigController')

test('company dashboard overview derives metrics from saved company state', () => {
  const overview = buildCompanyDashboardOverview({
    businessName: 'Acme',
    location: 'Kolkata',
    businessProfile: {
      businessName: 'Acme',
      location: 'Kolkata',
      industry: 'SaaS',
      website: 'https://acme.example',
      teamSize: '10-25',
      workModes: ['Remote'],
      description: 'Builds useful tools.',
      hiringCategories: 'Engineering',
      requiredSkills: 'React',
      contactEmail: 'hiring@acme.example',
      contactPhone: '+91 98765 43210',
    },
    gigManagementState: {
      gigs: [
        { status: 'Hiring', applicants: 4 },
        { status: 'Closed', applicants: 8 },
      ],
    },
    dashboardState: {},
  }, {
    talentCount: 6,
    submissions: [{
      studentName: 'Aman Verma',
      gigTitle: 'Frontend Internship',
      status: 'submitted',
      submittedAt: '2026-09-08T10:00:00.000Z',
    }],
  })

  assert.deepEqual(overview.stats.map(item => item.value), ['1', '12', '6'])
  assert.equal(overview.profileCompletion, 100)
  assert.equal(overview.recentHiringActivity[0].name, 'Aman Verma')
})

test('company GIG operations validate and persist new and updated roles in state', () => {
  const created = buildCreatedGigState({}, {
    title: 'Backend Intern',
    mode: 'Remote',
    location: 'Kolkata, West Bengal',
    type: 'Internship',
    budget: 'Rs 15000 / month',
    status: 'Hiring',
    skills: ['Node.js', 'MongoDB'],
  })

  assert.equal(created.gigs[0].id, 1)
  assert.match(created.gigs[0].publicId, /^[0-9a-f-]{36}$/)
  assert.equal(created.gigs[0].title, 'Backend Intern')
  assert.equal(created.gigs[0].location, 'Kolkata, West Bengal')
  assert.equal(created.gigs[0].type, 'Internship')
  assert.deepEqual(created.applicantsByGig[1], [])

  const updated = buildUpdatedGigState(created, 1, {
    title: 'Backend Engineering Intern',
    mode: 'Hybrid',
    location: 'Bengaluru, Karnataka',
    type: 'Project GIG',
    budget: 'Rs 18000 / month',
    status: 'Reviewing',
    skills: ['Node.js'],
  })

  assert.equal(updated.gigs[0].title, 'Backend Engineering Intern')
  assert.equal(updated.gigs[0].location, 'Bengaluru, Karnataka')
  assert.equal(updated.gigs[0].type, 'Project GIG')
  assert.equal(updated.gigs[0].status, 'Reviewing')
  assert.equal(updated.gigs[0].applicants, 0)

  assert.throws(() => buildCreatedGigState({}, {
    title: 'FF', mode: 'Remote', location: 'nm', type: 'Internship', budget: '600', status: 'Hiring', skills: ['jhj'],
  }), /title must be between 4 and 120 characters/)
  assert.throws(() => buildCreatedGigState({}, {
    title: 'Frontend Intern', mode: 'Remote', location: 'Kolkata', type: 'Internship', budget: '12000', status: 'Hiring', skills: [],
  }), /at least one skill tag/)

  const deleted = buildDeletedGigState(updated, 1)
  assert.equal(deleted.gigs.length, 0)
  assert.deepEqual(deleted.applicantsByGig, {})
  assert.equal(deleted.stats.find(item => item.label === 'Open GIGs').value, '0')
})

test('company talent search normalizes filters and ranks matching skills', () => {
  assert.deepEqual(normalizeTalentSearchFilters({
    minTrustScore: '850',
    location: 'Ranchi',
    skill: 'React',
    level: 'Pro',
    query: 'Riya',
    page: '2',
    pageSize: '10',
  }), {
    minTrustScore: 850,
    location: 'Ranchi',
    skill: 'React',
    level: 'Pro',
    query: 'Riya',
    page: 2,
    pageSize: 10,
  })

  const result = buildTalentSearchResult([
    {
      name: 'Riya Sharma',
      location: 'Ranchi',
      score: 870,
      skills: ['React', 'Node.js'],
      skillsByLevel: { Pro: ['React'], Intermediate: ['Node.js'], Beginner: [] },
    },
    {
      name: 'Aman Verma',
      location: 'Ranchi',
      score: 900,
      skills: ['Python'],
      skillsByLevel: { Pro: [], Intermediate: ['Python'], Beginner: [] },
    },
  ], {
    location: 'Ranchi',
    level: 'Pro',
    query: 'riya',
  }, 'React, Node.js')

  assert.equal(result.total, 1)
  assert.equal(result.talentProfiles[0].name, 'Riya Sharma')
  assert.deepEqual(result.talentProfiles[0].matchedSkills, ['React', 'Node.js'])
  assert.equal(result.talentProfiles[0].matchScore, 100)

  const ranked = buildTalentSearchResult([
    { name: 'High Trust', location: 'Ranchi', score: 950, skills: ['Python'], skillsByLevel: {} },
    { name: 'Best Match', location: 'Kolkata', score: 700, skills: ['React'], skillsByLevel: {} },
  ], { pageSize: 1 }, 'React')
  assert.equal(ranked.talentProfiles[0].name, 'Best Match')
  assert.equal(ranked.total, 2)
})

test('talent profiles only publish saved profile content and active verified skills', () => {
  const profile = sanitizeTalentProfile({
    _id: { toString: () => 'student-1' },
    name: 'Riya Sharma',
    trustScore: 760,
    contactMethod: 'phone',
    verificationMethod: 'digilocker',
    aadhaarNumber: '123456789012',
    digilockerToken: 'sensitive-token',
    skills: ['Node.js'],
    skillHubSkills: [
      { name: 'React', stage: 'Pro', verified: true, renewalStatus: 'valid', renewalDue: '2099-12-31', streak: 4, lastRetentionDate: new Date(Date.now() + (330 * 60 * 1000)).toISOString().slice(0, 10) },
      { name: 'Old SQL', stage: 'Beginner', verified: true, renewalStatus: 'expired', renewalDue: '2020-01-01' },
    ],
    projects: [
      { name: 'Published project', saved: true },
      { name: 'Draft project', saved: false },
    ],
    githubLink: [
      { url: 'https://github.com/draft', saved: false },
      { url: 'https://github.com/riya', saved: true },
    ],
    contactInfo: [
      { label: 'Email', value: 'riya@example.com', saved: true },
      { label: 'Phone', value: '+91 90000 00000', saved: false },
    ],
  })

  assert.deepEqual(profile.skills, ['Node.js', 'React'])
  assert.deepEqual(profile.verifiedSkills, ['React'])
  assert.deepEqual(profile.skillsByLevel.Pro, ['React'])
  assert.deepEqual(profile.skillDetails, [
    { name: 'Node.js', verified: false, level: null, streak: 0 },
    { name: 'React', verified: true, level: 'Pro', streak: 4 },
  ])
  assert.equal(profile.projects, 1)
  assert.equal(profile.savedProjects[0].name, 'Published project')
  assert.equal(profile.github, 'https://github.com/riya')
  assert.deepEqual(profile.contactInfo, [{ label: 'Email', value: 'riya@example.com', saved: true }])
  assert.equal(profile.contactMethod, 'phone')
  assert.equal(profile.verificationMethod, 'digilocker')
  assert.equal(profile.aadhaarNumber, undefined)
  assert.equal(profile.digilockerToken, undefined)
})

test('project workspace actions persist updates and milestones on the selected project', () => {
  const initialState = {
    projects: [{
      id: 'p1',
      title: 'API Project',
      status: 'Planning',
      tasks: [],
    }],
    selectedProjectId: 'p1',
    statusFilter: 'All',
  }
  const updateState = buildWorkspaceUpdateState(initialState, 'p1', 'API contracts are ready for review.')
  const milestoneState = buildWorkspaceMilestoneState(updateState, 'p1', {
    title: 'Contract review complete',
    dueDate: '2026-05-20',
  })

  assert.equal(milestoneState.projects[0].updates[0].message, 'API contracts are ready for review.')
  assert.equal(milestoneState.projects[0].milestones[0].title, 'Contract review complete')
  assert.equal(milestoneState.selectedProjectId, 'p1')
})

test('external payment records require a real reference and never create a wallet balance', () => {
  const payment = validateExternalPayment({
    amount: 10000,
    reference: 'UTR-2026-0001',
    paidOn: '2026-09-09',
    method: 'bank_transfer',
  }, new Date('2026-09-09T12:00:00.000Z'))

  assert.equal(payment.amount, 10000)
  assert.equal(payment.reference, 'UTR-2026-0001')
  assert.equal(payment.currency, 'INR')
  assert.throws(() => validateExternalPayment({ amount: 0, reference: 'x', paidOn: '2026-09-09', method: 'upi' }), /amount/i)
})

test('business profile validation normalizes saved identity and contact fields', () => {
  const profile = validateCompanyProfile({
    businessName: '  Acme Labs  ',
    location: ' Kolkata ',
    website: 'https://acme.example ',
    contactEmail: 'HIRING@ACME.EXAMPLE',
    contactPhone: '+91 98765 43210',
    workModes: ['Remote', 'Remote', 'Invalid'],
  }, {
    businessName: 'Fallback',
    location: 'Fallback City',
  })

  assert.equal(profile.businessName, 'Acme Labs')
  assert.equal(profile.location, 'Kolkata')
  assert.equal(profile.contactEmail, 'hiring@acme.example')
  assert.deepEqual(profile.workModes, ['Remote'])
  assert.throws(() => validateCompanyProfile({ businessName: 'Acme', location: 'Kolkata', website: 'acme.example' }, {}), /Website must start/)
  assert.throws(() => validateCompanyProfile({ businessName: 'Acme', location: 'Kolkata', logo: 'data:image/png;base64,AAAA' }, {}), /Business logo/)
  const logoProfile = validateCompanyProfile({
    businessName: 'Acme', location: 'Kolkata',
    logo: 'data:image/png;base64,iVBORw0KGgo=',
  }, {})
  assert.equal(logoProfile.logo, 'data:image/png;base64,iVBORw0KGgo=')
})

test('business logo updates persist without overwriting the rest of the profile', async t => {
  const company = new Company({
    businessName: 'Acme',
    location: 'Kolkata',
    passwordHash: 'test',
    sessions: [{ token: 'company-session', createdAt: new Date() }],
    businessProfile: {
      businessName: 'Acme',
      location: 'Kolkata',
      industry: 'SaaS',
      workModes: ['Remote'],
    },
  })
  let saveCalls = 0
  company.save = async () => {
    saveCalls += 1
    return company
  }
  t.mock.method(Company, 'findOne', async () => company)

  const saved = await updateCurrentCompany('company-session', {
    businessProfile: { logo: 'data:image/png;base64,iVBORw0KGgo=' },
  })

  assert.equal(saveCalls, 1)
  assert.equal(saved.businessProfile.logo, 'data:image/png;base64,iVBORw0KGgo=')
  assert.equal(saved.businessProfile.industry, 'SaaS')
  assert.deepEqual(saved.businessProfile.workModes, ['Remote'])
})

test('public company profile includes opted-in business contact details', async t => {
  t.mock.method(Company, 'findOne', async () => ({
    businessName: 'Acme',
    location: 'Kolkata',
    businessProfile: {
      businessName: 'Acme',
      location: 'Kolkata',
      website: 'https://acme.example',
      contactEmail: 'hiring@acme.example',
      contactPhone: '+91 98765 43210',
    },
    contactMethod: 'phone',
    verificationMethod: 'udyam',
    gstin: '27ABCDE1234F1Z5',
    businessDoc: 'UDYAM-WB-01-0000001',
  }))

  const profile = await getPublicCompanyProfile('Acme')

  assert.equal(profile.website, 'https://acme.example')
  assert.equal(profile.contactEmail, 'hiring@acme.example')
  assert.equal(profile.contactPhone, '+91 98765 43210')
  assert.equal(profile.contactMethod, 'phone')
  assert.equal(profile.verificationMethod, 'udyam')
  assert.equal(profile.gstin, undefined)
  assert.equal(profile.businessDoc, undefined)
})

test('student GIG routes only expose open roles and calculate skill matches', () => {
  assert.equal(isBrowsableGigStatus('Hiring'), true)
  assert.equal(isBrowsableGigStatus('Closed'), false)
  assert.equal(calculateGigMatch(['React', 'Node.js'], ['React', 'Python']), 50)
})
