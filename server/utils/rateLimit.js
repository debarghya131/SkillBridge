function createRateLimiter({ windowMs, maxRequests, authMaxRequests, dailyUserMaxRequests }) {
  const requestLog = new Map()
  const dailyUserLog = new Map()

  function consume(key, limit) {
    const now = Date.now()
    const windowStart = now - windowMs
    const history = requestLog.get(key) || []
    const recentHistory = history.filter(timestamp => timestamp > windowStart)
    recentHistory.push(now)
    requestLog.set(key, recentHistory)

    const remaining = Math.max(limit - recentHistory.length, 0)
    const retryAfterMs = recentHistory[0] ? Math.max(windowMs - (now - recentHistory[0]), 0) : windowMs

    return {
      limited: recentHistory.length > limit,
      remaining,
      retryAfterMs,
    }
  }

  function getLimitForRequest(req, pathname) {
    const isAuthRoute = pathname === '/api/student/signin'
      || pathname === '/api/student/signup'
      || pathname === '/api/company/signin'
      || pathname === '/api/company/signup'
      || pathname === '/api/reviewer/signin'

    return isAuthRoute ? authMaxRequests : maxRequests
  }

  function buildKey(req, pathname) {
    const forwardedFor = req.headers['x-forwarded-for']
    const clientIp = typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : req.socket.remoteAddress || 'unknown'

    return `${clientIp}:${pathname}`
  }

  function check(req, pathname) {
    if (req.method === 'OPTIONS' || pathname === '/health' || pathname === '/ready' || pathname === '/live') {
      return { limited: false, remaining: maxRequests, retryAfterMs: 0 }
    }

    const key = buildKey(req, pathname)
    const limit = getLimitForRequest(req, pathname)
    return consume(key, limit)
  }

  function consumeDailyUser(subjectKey) {
    if (!subjectKey) {
      return {
        limited: false,
        remaining: dailyUserMaxRequests,
        retryAfterMs: 0,
      }
    }

    const now = new Date()
    const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
    const compositeKey = `${subjectKey}:${dateKey}`
    const currentCount = Number(dailyUserLog.get(compositeKey) || 0) + 1
    dailyUserLog.set(compositeKey, currentCount)

    const nextDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0))

    return {
      limited: currentCount > dailyUserMaxRequests,
      remaining: Math.max(dailyUserMaxRequests - currentCount, 0),
      retryAfterMs: Math.max(nextDay.getTime() - now.getTime(), 0),
    }
  }

  return {
    check,
    consumeDailyUser,
  }
}

module.exports = {
  createRateLimiter,
}
