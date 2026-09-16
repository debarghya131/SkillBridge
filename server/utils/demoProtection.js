const DEMO_READ_ONLY_MESSAGE = 'Demo data is read-only and cannot be modified or deleted.'

const { isDemoIdentifier } = require('../config/showcaseFixtures')

function isProtectedDemoWrite({ method, pathname }) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return false
  return pathname.split('/').some(isDemoIdentifier)
}

function demoReadOnlyError() {
  const error = new Error(DEMO_READ_ONLY_MESSAGE)
  error.statusCode = 403
  return error
}

function assertNotDemo(value) {
  if (value?.demoData === true || isDemoIdentifier(value?.id ?? value)) throw demoReadOnlyError()
}

module.exports = {
  DEMO_READ_ONLY_MESSAGE,
  assertNotDemo,
  demoReadOnlyError,
  isProtectedDemoWrite,
}
