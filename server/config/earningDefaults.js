const DEFAULT_EARNING_STATE = { mode: 'external', pending: [], transactions: [], totalRecorded: 0 }

function buildDefaultEarningState() {
  return { ...DEFAULT_EARNING_STATE, pending: [], transactions: [] }
}

module.exports = { DEFAULT_EARNING_STATE, buildDefaultEarningState }
