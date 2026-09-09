const DEFAULT_BROWSE_GIGS = []
const DEFAULT_OPPORTUNITIES = []
const DEFAULT_ACTIVE_GIG_BASE = []
const DEFAULT_COMPLETED_GIGS = []

function buildDefaultGigState() {
  return {
    opportunities: [],
    browseGigs: [],
    savedGigIds: [],
    appliedGigIds: [],
    activeGigBase: [],
    completedGigs: [],
  }
}

module.exports = {
  DEFAULT_ACTIVE_GIG_BASE,
  DEFAULT_BROWSE_GIGS,
  DEFAULT_COMPLETED_GIGS,
  DEFAULT_OPPORTUNITIES,
  buildDefaultGigState,
}
