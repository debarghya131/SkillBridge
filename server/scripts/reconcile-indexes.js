const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Company = require('../models/Company')
const NetworkConnection = require('../models/NetworkConnection')
const Reviewer = require('../models/Reviewer')
const SiteMetric = require('../models/SiteMetric')
const SkillAssessment = require('../models/SkillAssessment')
const SkillCatalog = require('../models/SkillCatalog')
const SkillRequest = require('../models/SkillRequest')
const Student = require('../models/Student')
const TaskSubmission = require('../models/TaskSubmission')
const TeamPost = require('../models/TeamPost')

const applyChanges = process.argv.includes('--apply')
const dropRedundant = process.argv.includes('--drop-redundant')

const models = [
  Company,
  NetworkConnection,
  Reviewer,
  SiteMetric,
  SkillAssessment,
  SkillCatalog,
  SkillRequest,
  Student,
  TaskSubmission,
  TeamPost,
]

// These indexes are covered by the compound indexes declared on the models.
// Keep removals explicit so custom operational indexes are never deleted.
const REDUNDANT_INDEXES = {
  networkconnections: ['requester_1', 'recipient_1', 'status_1'],
  skillassessments: ['studentId_1'],
  teamposts: ['status_1'],
}

async function currentIndexReport(model) {
  let indexes
  try {
    indexes = await model.collection.indexes()
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error
    indexes = []
  }
  const names = indexes.map(index => index.name)
  return {
    collection: model.collection.name,
    exists: indexes.length > 0,
    indexes: names,
    redundantIndexes: (REDUNDANT_INDEXES[model.collection.name] || []).filter(name => names.includes(name)),
  }
}

async function main() {
  if (dropRedundant && !applyChanges) {
    throw new Error('Use --apply together with --drop-redundant to remove only the listed redundant indexes')
  }

  const env = getEnvConfig()
  try {
    // A dry run must not create collections or indexes even when the caller's
    // local NODE_ENV is development. --apply creates indexes explicitly below.
    await connectToDatabase(env.mongoUrl, { ...env, autoCreate: false, autoIndex: false })

    if (applyChanges) {
      for (const model of models) await model.createIndexes()
      if (dropRedundant) {
        for (const model of models) {
          for (const indexName of REDUNDANT_INDEXES[model.collection.name] || []) {
            await model.collection.dropIndex(indexName).catch(error => {
              if (error.codeName !== 'IndexNotFound') throw error
            })
          }
        }
      }
    }

    const report = []
    for (const model of models) report.push(await currentIndexReport(model))
    console.log(JSON.stringify({
      mode: applyChanges ? (dropRedundant ? 'apply-and-drop-redundant' : 'apply') : 'dry-run',
      collections: report,
    }, null, 2))
  } finally {
    await disconnectFromDatabase()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
