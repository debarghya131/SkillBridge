const test = require('node:test')
const assert = require('node:assert/strict')

test('CSV uses real row breaks, escapes quotes, and neutralizes formulas', async () => {
  const { paymentCsv } = await import('../../client/src/lib/paymentFormatting.js')
  const csv = paymentCsv([['GIG', 'Reference'], ['API, project', 'REF"1'], ['=1+1', ' @SUM(1)']])
  assert.equal(csv, '"GIG","Reference"\r\n"API, project","REF""1"\r\n"\'=1+1","\' @SUM(1)"')
})

test('client and server accept the current Indian date around UTC midnight', async () => {
  const { paymentDateToday } = await import('../../client/src/lib/paymentFormatting.js')
  const { validateExternalPayment } = require('../controllers/companyPaymentController')
  const now = new Date('2026-09-09T19:00:00Z')
  const paidOn = paymentDateToday(now)
  assert.equal(paidOn, '2026-09-10')
  assert.equal(validateExternalPayment({ amount: 10, reference: 'REF1', method: 'upi', paidOn }, now).paidOn, paidOn)
})
