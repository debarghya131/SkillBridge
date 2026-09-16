const mongoose = require('mongoose')

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
}

function getDatabaseStatus() {
  return READY_STATE_LABELS[mongoose.connection.readyState] || 'unknown'
}

function asBoundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, minimum), maximum)
}

function buildDatabaseOptions({
  nodeEnv = process.env.NODE_ENV || 'development',
  dbMaxPoolSize = 20,
  dbMinPoolSize = 0,
  dbMaxIdleTimeMs = 30_000,
  dbServerSelectionTimeoutMs = 10_000,
  mongoDbName = '',
} = {}) {
  const maxPoolSize = asBoundedInteger(dbMaxPoolSize, 20, 1, 100)
  const minPoolSize = Math.min(asBoundedInteger(dbMinPoolSize, 0, 0, maxPoolSize), maxPoolSize)

  return {
    autoCreate: nodeEnv !== 'production',
    autoIndex: nodeEnv !== 'production',
    bufferCommands: false,
    maxPoolSize,
    minPoolSize,
    maxIdleTimeMS: asBoundedInteger(dbMaxIdleTimeMs, 30_000, 1_000, 300_000),
    retryWrites: true,
    serverSelectionTimeoutMS: asBoundedInteger(dbServerSelectionTimeoutMs, 10_000, 1_000, 60_000),
    waitQueueTimeoutMS: 10_000,
    ...(mongoDbName ? { dbName: mongoDbName } : {}),
  }
}

function supportsTransactions(hello = {}) {
  // Cross-account lifecycle writes use transactions. MongoDB only supports
  // those through a replica set or a mongos router.
  return Boolean(hello?.setName || hello?.msg === 'isdbgrid')
}

async function assertProductionTransactionSupport(connection, nodeEnv) {
  if (nodeEnv !== 'production') return
  const hello = await connection.db.admin().command({ hello: 1 })
  if (!supportsTransactions(hello)) {
    throw new Error('Production MongoDB must be a replica set or mongos: account deletion, reviewed assessments, and completed-payment TrustScore updates require transactions.')
  }
}

async function connectToDatabase(mongoUrl, options = {}) {
  if (!mongoUrl) {
    throw new Error('MONGO_URL is missing. Add it to server/.env before starting the backend.')
  }

  mongoose.set('strictQuery', true)
  mongoose.set('bufferCommands', false)
  await mongoose.connect(mongoUrl, buildDatabaseOptions(options))
  try {
    await assertProductionTransactionSupport(mongoose.connection, options.nodeEnv || process.env.NODE_ENV || 'development')
  } catch (error) {
    await mongoose.disconnect()
    throw error
  }

  return mongoose.connection
}

async function disconnectFromDatabase() {
  if (mongoose.connection.readyState === 0) {
    return
  }

  await mongoose.disconnect()
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  buildDatabaseOptions,
  getDatabaseStatus,
  supportsTransactions,
  assertProductionTransactionSupport,
}
