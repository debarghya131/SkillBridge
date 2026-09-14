const Student = require('../models/Student')
const { buildDefaultEarningState } = require('../config/earningDefaults')
const { consumeSectionOperation } = require('../utils/sectionUsage')
const { clone, mergeTemplateState, reduceTemplateState } = require('../utils/templateState')
const { buildAuthError, findModelByActiveToken, getSessionTtlMs } = require('../utils/session')

async function findStudentByToken(token) {
  return findModelByActiveToken(Student, token, 'Student', getSessionTtlMs(Number(process.env.SESSION_TTL_DAYS) || 30))
}

function sanitizeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function sanitizeWalletStats(list, fallback) {
  if (!Array.isArray(list)) {
    return clone(fallback)
  }

  return list.map((item, index) => ({
    label: sanitizeString(item?.label, fallback[index]?.label || ''),
    value: sanitizeString(item?.value, fallback[index]?.value || ''),
    tone: sanitizeString(item?.tone, fallback[index]?.tone || '#10B981'),
  }))
}

function sanitizePaymentHistory(list, fallback) {
  if (!Array.isArray(list)) {
    return clone(fallback)
  }

  return list.map((item, index) => ({
    id: Number(item?.id) || fallback[index]?.id || Date.now() + index,
    title: sanitizeString(item?.title, ''),
    company: sanitizeString(item?.company, ''),
    amount: sanitizeString(item?.amount, ''),
    date: sanitizeString(item?.date, ''),
    status: sanitizeString(item?.status, 'Processing'),
  }))
}

function sanitizeUpiAccounts(list, fallback) {
  if (!Array.isArray(list)) {
    return clone(fallback)
  }

  return list.map((item, index) => ({
    id: sanitizeString(item?.id, fallback[index]?.id || `upi-${index + 1}`),
    label: sanitizeString(item?.label, fallback[index]?.label || ''),
    value: sanitizeString(item?.value, fallback[index]?.value || ''),
  }))
}

function sanitizeEarningState(earningState) {
  const fallback = buildDefaultEarningState()
  const mergedState = mergeTemplateState(fallback, earningState)

  return {
    walletStats: sanitizeWalletStats(mergedState?.walletStats, fallback.walletStats),
    availableNow: sanitizeString(mergedState?.availableNow, fallback.availableNow),
    paymentHistory: sanitizePaymentHistory(mergedState?.paymentHistory, fallback.paymentHistory),
    upiAccounts: sanitizeUpiAccounts(mergedState?.upiAccounts, fallback.upiAccounts),
    selectedUpi: sanitizeString(mergedState?.selectedUpi, fallback.selectedUpi),
    withdrawAmount: sanitizeString(mergedState?.withdrawAmount, fallback.withdrawAmount),
  }
}

function parseRupees(value) {
  const normalized = String(value ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

function formatRupees(value) {
  return `Rs ${Math.max(0, Math.round(value)).toLocaleString('en-IN')}`
}

function setWalletBalance(state, balance) {
  const formattedBalance = formatRupees(balance)
  state.availableNow = formattedBalance
  state.walletStats = state.walletStats.map(item => item.label === 'Wallet Balance'
    ? { ...item, value: formattedBalance }
    : item)
}

async function getStudentEarningState(token) {
  const student = await findStudentByToken(token)
  return sanitizeEarningState(student.earningState)
}

async function updateStudentEarningState(token, payload) {
  const student = await findStudentByToken(token)
  const currentState = sanitizeEarningState(student.earningState)
  const requestedState = payload?.earningState || {}
  const selectedUpi = sanitizeString(requestedState.selectedUpi, currentState.selectedUpi)
  const selectedAccount = currentState.upiAccounts.find(account => account.value === selectedUpi)
  const nextState = {
    ...currentState,
    selectedUpi: selectedAccount?.value || currentState.selectedUpi,
    withdrawAmount: sanitizeString(requestedState.withdrawAmount, currentState.withdrawAmount),
  }

  if (JSON.stringify(currentState) !== JSON.stringify(nextState)) {
    consumeSectionOperation(
      student,
      'earning',
      'Earning',
      Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
    )
  }

  student.earningState = reduceTemplateState(nextState, buildDefaultEarningState())
  await student.save()
  return nextState
}

async function requestStudentWithdrawal(token, payload) {
  const student = await findStudentByToken(token)
  const currentState = sanitizeEarningState(student.earningState)
  const amount = Math.round(parseRupees(payload?.amount || currentState.withdrawAmount))
  const selectedUpi = sanitizeString(payload?.upi, currentState.selectedUpi)
  const account = currentState.upiAccounts.find(item => item.value === selectedUpi)
  const availableBalance = parseRupees(currentState.availableNow)

  if (amount < 100) {
    throw buildAuthError('Minimum withdrawal amount is Rs 100')
  }

  if (amount > availableBalance) {
    throw buildAuthError('Withdrawal amount exceeds your available balance')
  }

  if (!account) {
    throw buildAuthError('Select a valid UPI account')
  }

  consumeSectionOperation(
    student,
    'earning',
    'Earning',
    Number(process.env.DAILY_SECTION_OPERATION_LIMIT) || 2,
  )

  const nextState = {
    ...currentState,
    selectedUpi: account.value,
    withdrawAmount: '',
    paymentHistory: [
      {
        id: Date.now(),
        title: 'UPI withdrawal request',
        company: account.value,
        amount: `-Rs ${Math.round(amount).toLocaleString('en-IN')}`,
        date: 'Just now',
        status: 'Processing',
      },
      ...currentState.paymentHistory,
    ],
  }

  setWalletBalance(nextState, availableBalance - amount)
  student.earningState = reduceTemplateState(nextState, buildDefaultEarningState())
  await student.save()

  return nextState
}

module.exports = {
  getStudentEarningState,
  requestStudentWithdrawal,
  updateStudentEarningState,
}
