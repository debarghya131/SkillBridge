const mongoose = require('mongoose')

function serviceUnavailable(message) {
  const error = new Error(message)
  error.statusCode = 503
  return error
}

async function saveDocumentsAtomically(documents, {
  nodeEnv = process.env.NODE_ENV || 'development',
  connection = mongoose.connection,
} = {}) {
  const writableDocuments = documents.filter(Boolean)

  if (nodeEnv !== 'production') {
    for (const document of writableDocuments) await document.save()
    return
  }

  if (connection.readyState !== 1 || typeof connection.transaction !== 'function') {
    throw serviceUnavailable('Database transaction support is temporarily unavailable. Please retry.')
  }

  await connection.transaction(async session => {
    for (const document of writableDocuments) await document.save({ session })
  })
}

module.exports = { saveDocumentsAtomically }
