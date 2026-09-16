export function buildDefaultCompanyPaymentState() {
  return { mode: 'external', pending: [], transactions: [], demoPending: [], demoTransactions: [] }
}
export function mergeCompanyPaymentState(state = {}) {
  return {
    mode: 'external',
    pending: Array.isArray(state?.pending) ? state.pending : [],
    transactions: Array.isArray(state?.transactions) ? state.transactions : [],
    demoPending: Array.isArray(state?.demoPending) ? state.demoPending : [],
    demoTransactions: Array.isArray(state?.demoTransactions) ? state.demoTransactions : [],
  }
}
