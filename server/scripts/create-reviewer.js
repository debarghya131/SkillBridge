const { parseArgs } = require('node:util')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Reviewer = require('../models/Reviewer')
const { hashPassword } = require('../utils/auth')

async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' }, role: { type: 'string', default: 'reviewer' } } })
  const email = values.email?.trim().toLowerCase()
  const name = values.name?.trim()
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Provide --email with a valid email address')
  if (!name || name.length > 100) throw new Error('Provide --name with 1 to 100 characters')
  if (!values.password || values.password.length < 12) throw new Error('Provide --password with at least 12 characters')
  if (!['reviewer', 'admin'].includes(values.role)) throw new Error('--role must be reviewer or admin')
  try {
    const config = getEnvConfig()
    await connectToDatabase(config.mongoUrl, {
      nodeEnv: config.nodeEnv,
      mongoDbName: config.mongoDbName,
      dbMaxPoolSize: config.dbMaxPoolSize,
      dbMinPoolSize: config.dbMinPoolSize,
      dbMaxIdleTimeMs: config.dbMaxIdleTimeMs,
      dbServerSelectionTimeoutMs: config.dbServerSelectionTimeoutMs,
    })
    const reviewer = await Reviewer.findOneAndUpdate({ email }, {
      $set: { name, role: values.role, active: true, passwordHash: hashPassword(values.password) },
      $setOnInsert: { sessions: [] },
    }, { upsert: true, returnDocument: 'after', runValidators: true })
    console.log(`Reviewer ready: ${reviewer.email} (${reviewer.role})`)
  } finally { await disconnectFromDatabase() }
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
