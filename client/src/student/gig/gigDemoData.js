export const DEMO_BROWSE_GIGS = []
export const DEMO_OPPORTUNITIES = []
export const DEMO_ACTIVE_GIG_BASE = []
export const DEMO_COMPLETED_GIGS = []

export function buildDemoGigState() {
  return {
    opportunities: [],
    browseGigs: [],
    savedGigIds: [],
    appliedGigIds: [],
    activeGigBase: [],
    completedGigs: [],
  }
}
