const DEFAULT_COMPANY_PAYMENT_STATE = { mode: 'external', pending: [], transactions: [] }
function buildDefaultCompanyPaymentState() { return { ...DEFAULT_COMPANY_PAYMENT_STATE, pending: [], transactions: [] } }
module.exports = { buildDefaultCompanyPaymentState, DEFAULT_COMPANY_PAYMENT_STATE }
