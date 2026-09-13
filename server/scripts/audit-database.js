const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const mongoose = require('mongoose')

const INLINE_MEDIA_PATHS = {
  companies: ['$businessProfile.logo', '$businessProfile.introVideoUrl'],
  students: ['$avatar', '$videoUrl'],
  tasksubmissions: ['$studentAvatar', '$studentVideoUrl'],
}

function bytes(value) {
  const numeric = Number(value) || 0
  if (numeric < 1024) return `${numeric} B`
  if (numeric < 1024 ** 2) return `${(numeric / 1024).toFixed(1)} KiB`
  return `${(numeric / 1024 ** 2).toFixed(2)} MiB`
}

function inlineMediaExpression(paths) {
  return {
    $or: paths.map(path => ({
      $regexMatch: { input: { $ifNull: [path, ''] }, regex: '^data:' },
    })),
  }
}

async function inspectDocuments(collection, paths = []) {
  if (paths.length === 0) return { oversizedDocuments: 0, inlineMediaDocuments: 0 }

  try {
    const [summary] = await collection.aggregate([
      {
        $project: {
          documentBytes: { $bsonSize: '$$ROOT' },
          hasInlineMedia: inlineMediaExpression(paths),
        },
      },
      {
        $group: {
          _id: null,
          oversizedDocuments: {
            $sum: { $cond: [{ $gt: ['$documentBytes', 1024 * 1024] }, 1, 0] },
          },
          inlineMediaDocuments: {
            $sum: { $cond: ['$hasInlineMedia', 1, 0] },
          },
        },
      },
    ]).toArray()

    return summary || { oversizedDocuments: 0, inlineMediaDocuments: 0 }
  } catch (error) {
    return { oversizedDocuments: null, inlineMediaDocuments: null, inspectionError: error.message }
  }
}

async function inspectCollection(database, name) {
  const collection = database.collection(name)
  const [stats, indexes, documents] = await Promise.all([
    database.command({ collStats: name }).catch(() => null),
    collection.indexes().catch(() => []),
    inspectDocuments(collection, INLINE_MEDIA_PATHS[name]),
  ])

  return {
    name,
    documents: Number(stats?.count || 0),
    averageDocumentSize: bytes(stats?.avgObjSize),
    dataSize: bytes(stats?.size),
    storageSize: bytes(stats?.storageSize),
    totalIndexSize: bytes(stats?.totalIndexSize),
    indexes: indexes.map(index => index.name),
    oversizedDocuments: documents.oversizedDocuments,
    inlineMediaDocuments: documents.inlineMediaDocuments,
    inspectionError: documents.inspectionError || null,
  }
}

async function main() {
  const env = getEnvConfig()

  try {
    await connectToDatabase(env.mongoUrl, env)
    const database = mongoose.connection.db
    const collections = await database.listCollections({}, { nameOnly: true }).toArray()
    const report = []

    for (const { name } of collections.sort((left, right) => left.name.localeCompare(right.name))) {
      report.push(await inspectCollection(database, name))
    }

    console.log(JSON.stringify({
      database: mongoose.connection.name,
      checkedAt: new Date().toISOString(),
      largeDocumentThreshold: '1 MiB',
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
