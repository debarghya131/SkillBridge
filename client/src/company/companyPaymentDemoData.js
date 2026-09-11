export function buildDefaultCompanyPaymentState() {
  return { mode: 'external', pending: [], transactions: [] }
}
export function mergeCompanyPaymentState(state = {}) {
  return { mode: 'external', pending: Array.isArray(state?.pending) ? state.pending : [], transactions: Array.isArray(state?.transactions) ? state.transactions : [] }
}
