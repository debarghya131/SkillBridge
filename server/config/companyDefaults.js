function buildDefaultCompanyProfile(overrides = {}) {
  return {
    businessName: overrides.businessName || 'Your Business',
    location: overrides.location || '',
    logo: '',
    introVideoUrl: null,
    industry: '',
    website: '',
    teamSize: '',
    workModes: [],
    description: '',
    hiringCategories: '',
    requiredSkills: '',
    contactEmail: '',
    contactPhone: '',
  }
}

const {
  buildDefaultCompanyGigManagementState,
} = require('./companyGigDefaults')
const {
  buildDefaultCompanyWorkspaceState,
} = require('./companyWorkspaceDefaults')
const {
  buildDefaultCompanyPaymentState,
} = require('./companyPaymentDefaults')

const DEFAULT_COMPANY_DASHBOARD_STATE = {
  stats: [
    { label: 'Active GIGs', value: '0', icon: '📋' },
    { label: 'Applications', value: '0', icon: '📥' },
    { label: 'Total Talent', value: '0', icon: '👥' },
  ],
  matchedStudents: 0,
  recentHiringActivity: [],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function buildDefaultCompanyDashboardState() {
  return clone(DEFAULT_COMPANY_DASHBOARD_STATE)
}

module.exports = {
  buildDefaultCompanyDashboardState,
  buildDefaultCompanyGigManagementState,
  buildDefaultCompanyProfile,
  buildDefaultCompanyPaymentState,
  buildDefaultCompanyWorkspaceState,
  DEFAULT_COMPANY_DASHBOARD_STATE,
}
