const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function parseInteger(value, fallback) {
  const numericValue = Number.parseInt(value, 10)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function parseCorsOrigins(value) {
  if (!value || value === '*') {
    return ['*']
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getEnvConfig() {
  const envFilePath = path.join(__dirname, '..', '.env')
  loadEnvFile(envFilePath)

  const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInteger(process.env.PORT, 5000),
    mongoUrl: process.env.MONGO_URL || '',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : '*')),
    sessionTtlDays: Math.max(parseInteger(process.env.SESSION_TTL_DAYS, 30), 1),
    maxSessionsPerAccount: Math.max(parseInteger(process.env.MAX_SESSIONS_PER_ACCOUNT, 5), 1),
    rateLimitWindowMs: Math.max(parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000), 1_000),
    rateLimitMaxRequests: Math.max(parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 120), 10),
    authRateLimitMaxRequests: Math.max(parseInteger(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 12), 3),
    dailyUserRateLimitMaxRequests: Math.max(parseInteger(process.env.DAILY_USER_RATE_LIMIT_MAX_REQUESTS, 2000), 100),
    dailySectionOperationLimit: Math.max(parseInteger(process.env.DAILY_SECTION_OPERATION_LIMIT, 2), 1),
    rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info',
  }

  const missingKeys = []

  if (!config.mongoUrl) {
    missingKeys.push('MONGO_URL')
  }

  if (config.nodeEnv === 'production' && (!config.corsOrigins.length || config.corsOrigins.includes('*'))) {
    missingKeys.push('CORS_ORIGIN')
  }

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`)
  }

  return config
}

module.exports = {
  getEnvConfig,
}
