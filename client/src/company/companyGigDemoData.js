export function buildDefaultCompanyGigManagementState() {
  return {
    stats: [
      { label: 'Open GIGs', value: '0', tone: '#1D4ED8', bg: '#DBEAFE', icon: '📋' },
      { label: 'Applications', value: '0', tone: '#065F46', bg: '#D1FAE5', icon: '📥' },
      { label: 'Interview Tasks Sent', value: '0', tone: '#92400E', bg: '#FEF3C7', icon: '🚀' },
      { label: 'Active Hires', value: '0', tone: '#7C3AED', bg: '#EDE9FE', icon: '⚡' },
    ],
    gigs: [],
    pipeline: [
      { label: 'New Applications', value: '0', bg: '#EFF6FF', color: '#1D4ED8' },
      { label: 'Interview Task Pending', value: '0', bg: '#FEF3C7', color: '#92400E' },
      { label: 'Task Submitted', value: '0', bg: '#EDE9FE', color: '#7C3AED' },
      { label: 'Selected', value: '0', bg: '#D1FAE5', color: '#065F46' },
    ],
    recentActivity: [],
    applicantsByGig: {},
    demoProfiles: {},
  }
}

export function mergeCompanyGigManagementState(state = {}) {
  const defaults = buildDefaultCompanyGigManagementState()

  return {
    stats: Array.isArray(state.stats) ? state.stats : defaults.stats,
    gigs: Array.isArray(state.gigs) ? state.gigs : defaults.gigs,
    pipeline: Array.isArray(state.pipeline) ? state.pipeline : defaults.pipeline,
    recentActivity: Array.isArray(state.recentActivity) ? state.recentActivity : defaults.recentActivity,
    applicantsByGig: state.applicantsByGig && typeof state.applicantsByGig === 'object'
      ? state.applicantsByGig
      : defaults.applicantsByGig,
    demoProfiles: state.demoProfiles && typeof state.demoProfiles === 'object'
      ? state.demoProfiles
      : defaults.demoProfiles,
  }
}
