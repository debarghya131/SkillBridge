const crypto = require('node:crypto')

const DEVELOPMENT_SECRET = 'skillbridge-development-verification-secret-only'

function getVerificationHashSecret() {
  const configured = typeof process.env.VERIFICATION_HASH_SECRET === 'string'
    ? process.env.VERIFICATION_HASH_SECRET.trim()
    : ''

  if (configured.length >= 32) return configured

  if (process.env.NODE_ENV === 'production') {
    throw new Error('VERIFICATION_HASH_SECRET must be at least 32 characters in production')
  }

  return DEVELOPMENT_SECRET
}

function normalizeVerificationReference(value) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, '').trim().toUpperCase()
    : ''
}

function hashVerificationReference(value, scope, secret = getVerificationHashSecret()) {
  const normalized = normalizeVerificationReference(value)
  if (!normalized) return ''

  return `hmac-sha256:${crypto
    .createHmac('sha256', secret)
    .update(`skillbridge:${scope}:v1:${normalized}`)
    .digest('base64url')}`
}

function hasIdentityVerificationProof(student) {
  return Boolean(
    student?.identityVerificationHash
    || student?.aadhaarNumber
    || student?.digilockerToken,
  )
}

module.exports = {
  getVerificationHashSecret,
  hashVerificationReference,
  hasIdentityVerificationProof,
  normalizeVerificationReference,
}
