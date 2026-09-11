const DEFAULT_MAX_REQUEST_BODY_BYTES = 8_000_000

function readJsonBody(req, configuredLimit = Number.parseInt(process.env.MAX_REQUEST_BODY_BYTES, 10)) {
  const maxBytes = Number.isFinite(configuredLimit)
    ? Math.max(1_000_000, Math.min(configuredLimit, 20_000_000))
    : DEFAULT_MAX_REQUEST_BODY_BYTES

  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', chunk => {
      body += chunk

      if (body.length > maxBytes) {
        const error = new Error('Request body is too large')
        error.statusCode = 413
        reject(error)
        req.destroy?.()
      }
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        const parseError = new Error('Invalid JSON body')
        parseError.statusCode = 400
        reject(parseError)
      }
    })

    req.on('error', reject)
  })
}

function getBearerToken(req) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return ''
  }

  return header.slice(7).trim()
}

module.exports = {
  getBearerToken,
  readJsonBody,
}
