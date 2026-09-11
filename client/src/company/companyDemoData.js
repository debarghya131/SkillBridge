export function buildDefaultCompanyProfile(overrides = {}) {
  return {
    businessName: overrides.businessName || 'Your Business',
    location: overrides.location || '',
    logo: '',
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

export function mergeCompanyProfile(profile = {}, overrides = {}) {
  return {
    ...buildDefaultCompanyProfile(overrides),
    businessName: typeof profile.businessName === 'string' ? profile.businessName : (overrides.businessName || 'Your Business'),
    location: typeof profile.location === 'string' ? profile.location : (overrides.location || ''),
    logo: typeof profile.logo === 'string' ? profile.logo : '',
    industry: typeof profile.industry === 'string' ? profile.industry : '',
    website: typeof profile.website === 'string' ? profile.website : '',
    teamSize: typeof profile.teamSize === 'string' ? profile.teamSize : '',
    workModes: Array.isArray(profile.workModes) ? profile.workModes : [],
    description: typeof profile.description === 'string' ? profile.description : '',
    hiringCategories: typeof profile.hiringCategories === 'string' ? profile.hiringCategories : '',
    requiredSkills: typeof profile.requiredSkills === 'string' ? profile.requiredSkills : '',
    contactEmail: typeof profile.contactEmail === 'string' ? profile.contactEmail : '',
    contactPhone: typeof profile.contactPhone === 'string' ? profile.contactPhone : '',
  }
}

export function buildDefaultCompanyDashboardState() {
  return {
    stats: [
      { label: 'Active GIGs', value: '0', icon: '📋' },
      { label: 'Applications', value: '0', icon: '📥' },
      { label: 'Total Talent', value: '0', icon: '👥' },
    ],
    matchedStudents: 0,
    recentHiringActivity: [],
  }
}

export function mergeCompanyDashboardState(state = {}) {
  const defaults = buildDefaultCompanyDashboardState()

  return {
    stats: Array.isArray(state.stats) ? state.stats : defaults.stats,
    matchedStudents: typeof state.matchedStudents === 'number' ? state.matchedStudents : defaults.matchedStudents,
    recentHiringActivity: Array.isArray(state.recentHiringActivity) ? state.recentHiringActivity : defaults.recentHiringActivity,
  }
}
