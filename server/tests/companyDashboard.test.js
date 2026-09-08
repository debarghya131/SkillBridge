const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildCompanyDashboardOverview,
  buildCompanyFundsState,
  buildCompanyPayoutSetupState,
  buildCreatedGigState,
  buildTalentSearchResult,
  buildWorkspaceMilestoneState,
  buildWorkspaceUpdateState,
  buildUpdatedGigState,
  normalizeTalentSearchFilters,
  validateCompanyProfile,
} = require('../controllers/companyController')
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
    budget: 'Rs 15000 / month',
    status: 'Hiring',
    skills: ['Node.js', 'MongoDB'],
  })

  assert.equal(created.gigs[0].id, 4)
  assert.equal(created.gigs[0].title, 'Backend Intern')
  assert.deepEqual(created.applicantsByGig[4], [])

  const updated = buildUpdatedGigState(created, 4, {
    title: 'Backend Engineering Intern',
    mode: 'Hybrid',
    budget: 'Rs 18000 / month',
    status: 'Reviewing',
    skills: ['Node.js'],
  })

  assert.equal(updated.gigs[0].title, 'Backend Engineering Intern')
  assert.equal(updated.gigs[0].status, 'Reviewing')
  assert.equal(updated.gigs[0].applicants, 0)
})

test('company talent search normalizes filters and ranks matching skills', () => {
  assert.deepEqual(normalizeTalentSearchFilters({
    minTrustScore: '850',
    location: 'Ranchi',
    skill: 'React',
    level: 'Pro',
    page: '2',
    pageSize: '10',
  }), {
    minTrustScore: 850,
    location: 'Ranchi',
    skill: 'React',
    level: 'Pro',
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
  }, 'React, Node.js')

  assert.equal(result.total, 1)
  assert.equal(result.talentProfiles[0].name, 'Riya Sharma')
  assert.deepEqual(result.talentProfiles[0].matchedSkills, ['React', 'Node.js'])
  assert.equal(result.talentProfiles[0].matchScore, 100)
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
    dueDate: 'May 20, 2026',
  })

  assert.equal(milestoneState.projects[0].updates[0].message, 'API contracts are ready for review.')
  assert.equal(milestoneState.projects[0].milestones[0].title, 'Contract review complete')
  assert.equal(milestoneState.selectedProjectId, 'p1')
})

test('company payment actions update wallet balance and create transaction history', () => {
  const funded = buildCompanyFundsState({
    summary: [{ label: 'Available Balance', value: '₹42,500' }],
    methods: [],
    transactions: [],
    recommendedActions: [],
  }, '10000')
  const setup = buildCompanyPayoutSetupState(funded)

  assert.equal(setup.summary.find(item => item.label === 'Available Balance').value, '₹52,500')
  assert.equal(setup.transactions[0].title, 'Payout setup review')
  assert.equal(setup.transactions[1].amount, '+₹10,000')
  assert.throws(() => buildCompanyFundsState(funded, '50'), /between ₹100/)
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
})

test('student GIG routes only expose open roles and calculate skill matches', () => {
  assert.equal(isBrowsableGigStatus('Hiring'), true)
  assert.equal(isBrowsableGigStatus('Closed'), false)
  assert.equal(calculateGigMatch(['React', 'Node.js'], ['React', 'Python']), 50)
})
