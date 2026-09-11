const http = require('http')
const { connectToDatabase, disconnectFromDatabase, getDatabaseStatus } = require('./config/db')
const { getEnvConfig } = require('./config/env')
const {
  getCompanyStudentProfile,
  getCurrentCompany,
  getCurrentCompanyTaskLibraryState,
  getCurrentCompanyDashboard,
  getCurrentCompanyGigManagementState,
  getCompanyGigApplicants,
  getCurrentCompanyProjectWorkspaceState,
  getCompanyTalentProfiles,
  getPublicCompanyProfile,
  logoutCurrentCompany,
  signInCompany,
  signUpCompany,
  createCompanyGig,
  deleteCompanyGig,
  updateCurrentCompany,
  updateCurrentCompanyTaskLibraryState,
  updateCompanyGig,
  setCompanyWorkspaceMilestone,
  shareCompanyWorkspaceUpdate,
} = require('./controllers/companyController')
const {
  getCurrentStudent,
  logoutCurrentStudent,
  signInStudent,
  signUpStudent,
  updateCurrentStudent,
} = require('./controllers/studentController')
const {
  acceptOpportunity,
  applyToGig,
  declineOpportunity,
  getStudentGigState,
  saveGig,
  unsaveGig,
} = require('./controllers/gigController')
const { getStudentEarningState, requestStudentWithdrawal, updateStudentEarningState } = require('./controllers/earningController')
const {
  createTeamPost, decideConnectionRequest, decideTeamInvitation, decideTeamRequest, deleteTeamPost, getNetworkProfile,
  getStudentNetworkState, inviteStudentToTeam, removeConnection, requestToJoinTeam, sendConnectionRequest,
  updateTeamPost, withdrawTeamRequest,
} = require('./controllers/networkController')
const { getStudentActivityHeatmap, getStudentSkillHub, recordStudentSkillHubEvent, updateStudentSkillHub } = require('./controllers/skillHubController')
const { listStudentAssessments, submitSkillAssessment } = require('./controllers/skillAssessmentController')
const { claimAssessment, decideAssessment, getCurrentReviewer, listReviewQueue, logoutReviewer, releaseAssessment, signInReviewer } = require('./controllers/reviewerController')
const { getStudentTrustScore, recordStudentTrustScoreEvent } = require('./controllers/trustScoreController')
const {
  getCompanyTaskSubmissions,
  getStudentCompanyInterviewTask,
  reviewCompanyTaskSubmission,
  sendCompanyInterviewTask,
  startStudentCompanyInterviewTask,
  submitStudentCompanyInterviewTask,
} = require('./controllers/taskBridgeController')
const { getSiteViewCount, incrementSiteViewCount } = require('./controllers/siteMetricController')
const { createRateLimiter } = require('./utils/rateLimit')
const { createRequestId, serializeError, writeLog } = require('./utils/logger')
const { getBearerToken, readJsonBody } = require('./utils/request')
const { getSessionTtlMs, resolveSessionSubject } = require('./utils/session')
const { getCompanyPayments, recordExternalPayment } = require('./controllers/companyPaymentController')
const Student = require('./models/Student')
const Company = require('./models/Company')
const Reviewer = require('./models/Reviewer')

const env = getEnvConfig()
const port = env.port
const mongoUrl = env.mongoUrl
const rateLimiter = createRateLimiter({
  windowMs: env.rateLimitWindowMs,
  maxRequests: env.rateLimitMaxRequests,
  authMaxRequests: env.authRateLimitMaxRequests,
  dailyUserMaxRequests: env.dailyUserRateLimitMaxRequests,
})

function resolveAllowedOrigin(origin) {
  if (env.corsOrigins.includes('*')) {
    return '*'
  }

  if (origin && env.corsOrigins.includes(origin)) {
    return origin
  }

  return ''
}

function buildCommonHeaders(res) {
  const allowedOrigin = resolveAllowedOrigin(res.requestOrigin)

  return {
    'Access-Control-Allow-Origin': allowedOrigin || env.corsOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'no-referrer',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Request-Id': res.requestId,
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...buildCommonHeaders(res),
  })
  res.end(JSON.stringify(payload))
}

async function handlePublicApi(req, res, pathname) {
  try {
    if (req.method === 'GET' && pathname === '/api/site-views') {
      const count = await getSiteViewCount()
      sendJson(res, 200, { count })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/site-views') {
      const count = await incrementSiteViewCount()
      sendJson(res, 200, { count })
      return true
    }

    const companyProfileMatch = pathname.match(/^\/api\/companies\/profile\/(.+)$/)
    if (req.method === 'GET' && companyProfileMatch) {
      const companyProfile = await getPublicCompanyProfile(decodeURIComponent(companyProfileMatch[1]))
      sendJson(res, 200, { companyProfile })
      return true
    }
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      status: 'error',
      message: error.statusCode ? error.message : 'The server could not complete this request.',
      requestId: res.requestId,
    })
    return true
  }

  return false
}

async function handleCompanyApi(req, res, pathname) {
  try {
    const studentProfileMatch = pathname.match(/^\/api\/company\/students\/([a-f0-9]+)\/profile$/i)
    if (req.method === 'GET' && studentProfileMatch) {
      const profile = await getCompanyStudentProfile(getBearerToken(req), studentProfileMatch[1])
      sendJson(res, 200, { profile })
      return true
    }
    if (req.method === 'POST' && pathname === '/api/company/signup') {
      const payload = await readJsonBody(req)
      const result = await signUpCompany(payload)
      sendJson(res, 201, result)
      return true
    }

    if (req.method === 'POST' && pathname === '/api/company/signin') {
      const payload = await readJsonBody(req)
      const result = await signInCompany(payload)
      sendJson(res, 200, result)
      return true
    }

    if (req.method === 'GET' && pathname === '/api/company/me') {
      const company = await getCurrentCompany(getBearerToken(req))
      sendJson(res, 200, { company })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/company/dashboard') {
      const dashboard = await getCurrentCompanyDashboard(getBearerToken(req))
      sendJson(res, 200, { dashboard })
      return true
    }

    if (req.method === 'PATCH' && pathname === '/api/company/profile') {
      const payload = await readJsonBody(req)
      const company = await updateCurrentCompany(getBearerToken(req), payload)
      sendJson(res, 200, { company })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/company/gigs') {
      const gigManagementState = await getCurrentCompanyGigManagementState(getBearerToken(req))
      sendJson(res, 200, { gigManagementState })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/company/gigs') {
      const payload = await readJsonBody(req)
      const gigManagementState = await createCompanyGig(getBearerToken(req), payload)
      sendJson(res, 201, { gigManagementState })
      return true
    }

    const applicantsMatch = pathname.match(/^\/api\/company\/gigs\/(\d+)\/applicants$/)
    if (req.method === 'GET' && applicantsMatch) {
      const applicants = await getCompanyGigApplicants(getBearerToken(req), applicantsMatch[1])
      sendJson(res, 200, { applicants })
      return true
    }

    const gigIdMatch = pathname.match(/^\/api\/company\/gigs\/(\d+)$/)
    if (req.method === 'DELETE' && gigIdMatch) {
      const gigManagementState = await deleteCompanyGig(getBearerToken(req), gigIdMatch[1])
      sendJson(res, 200, { gigManagementState })
      return true
    }

    if (req.method === 'PATCH' && gigIdMatch) {
      const payload = await readJsonBody(req)
      const gigManagementState = await updateCompanyGig(getBearerToken(req), gigIdMatch[1], payload)
      sendJson(res, 200, { gigManagementState })
      return true
    }



    if (req.method === 'GET' && pathname === '/api/company/tasks/library') {
      const taskLibraryState = await getCurrentCompanyTaskLibraryState(getBearerToken(req))
      sendJson(res, 200, { taskLibraryState })
      return true
    }

    if (req.method === 'PATCH' && pathname === '/api/company/tasks/library') {
      const payload = await readJsonBody(req)
      const taskLibraryState = await updateCurrentCompanyTaskLibraryState(getBearerToken(req), payload)
      sendJson(res, 200, { taskLibraryState })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/company/talent') {
      const searchParams = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams
      const talentSearch = await getCompanyTalentProfiles(
        getBearerToken(req),
        Object.fromEntries(searchParams.entries()),
      )
      sendJson(res, 200, talentSearch)
      return true
    }

    if (req.method === 'GET' && pathname === '/api/company/workspace') {
      const projectWorkspaceState = await getCurrentCompanyProjectWorkspaceState(getBearerToken(req))
      sendJson(res, 200, { projectWorkspaceState })
      return true
    }



    const workspaceProjectMatch = pathname.match(/^\/api\/company\/workspace\/projects\/([^/]+)\/(update|milestone)$/)
    if (req.method === 'POST' && workspaceProjectMatch) {
      const payload = await readJsonBody(req)
      const projectId = decodeURIComponent(workspaceProjectMatch[1])
      const projectWorkspaceState = workspaceProjectMatch[2] === 'update'
        ? await shareCompanyWorkspaceUpdate(getBearerToken(req), projectId, payload)
        : await setCompanyWorkspaceMilestone(getBearerToken(req), projectId, payload)
      sendJson(res, 200, { projectWorkspaceState })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/company/payment') {
      const paymentState = await getCompanyPayments(getBearerToken(req))
      sendJson(res, 200, { paymentState })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/company/tasks/submissions') {
      const taskSubmissions = await getCompanyTaskSubmissions(getBearerToken(req))
      sendJson(res, 200, { taskSubmissions })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/company/tasks/invite') {
      const payload = await readJsonBody(req)
      const result = await sendCompanyInterviewTask(getBearerToken(req), payload)
      sendJson(res, 201, result)
      return true
    }







    const paymentMatch = pathname.match(/^\/api\/company\/payment\/submissions\/([a-f0-9]{24})$/i)
    if (req.method === 'POST' && paymentMatch) {
      const payload = await readJsonBody(req)
      const paymentState = await recordExternalPayment(getBearerToken(req), paymentMatch[1], payload)
      sendJson(res, 200, { paymentState })
      return true
    }

    const taskReviewMatch = pathname.match(/^\/api\/company\/tasks\/submissions\/([a-f0-9]+)$/i)
    if (req.method === 'PATCH' && taskReviewMatch) {
      const payload = await readJsonBody(req)
      const result = await reviewCompanyTaskSubmission(getBearerToken(req), taskReviewMatch[1], payload)
      sendJson(res, 200, result)
      return true
    }

    if (req.method === 'POST' && pathname === '/api/company/logout') {
      await logoutCurrentCompany(getBearerToken(req))
      sendJson(res, 200, { status: 'ok' })
      return true
    }
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      status: 'error',
      message: error.statusCode ? error.message : 'The server could not complete this request.',
      requestId: res.requestId,
    })
    return true
  }

  return false
}

async function handleReviewerApi(req, res, pathname) {
  try {
    if (req.method === 'POST' && pathname === '/api/reviewer/signin') {
      sendJson(res, 200, await signInReviewer(await readJsonBody(req)))
      return true
    }
    if (req.method === 'GET' && pathname === '/api/reviewer/me') {
      sendJson(res, 200, { reviewer: await getCurrentReviewer(getBearerToken(req)) })
      return true
    }
    if (req.method === 'POST' && pathname === '/api/reviewer/logout') {
      sendJson(res, 200, await logoutReviewer(getBearerToken(req)))
      return true
    }
    if (req.method === 'GET' && pathname === '/api/reviewer/assessments') {
      const searchParams = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams
      sendJson(res, 200, await listReviewQueue(getBearerToken(req), Object.fromEntries(searchParams.entries())))
      return true
    }
    const assessmentAction = pathname.match(/^\/api\/reviewer\/assessments\/([a-f0-9]{24})\/(claim|release|review)$/i)
    if (req.method === 'POST' && assessmentAction) {
      const [, id, action] = assessmentAction
      const result = action === 'claim'
        ? await claimAssessment(getBearerToken(req), id)
        : action === 'release'
          ? await releaseAssessment(getBearerToken(req), id)
          : await decideAssessment(getBearerToken(req), id, await readJsonBody(req))
      sendJson(res, 200, { assessment: result })
      return true
    }
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      status: 'error',
      message: error.statusCode ? error.message : 'The server could not complete this request.',
      requestId: res.requestId,
    })
    return true
  }
  return false
}

async function handleStudentApi(req, res, pathname) {
  try {
    if (req.method === 'POST' && pathname === '/api/student/signup') {
      const payload = await readJsonBody(req)
      const result = await signUpStudent(payload)
      sendJson(res, 201, result)
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/signin') {
      const payload = await readJsonBody(req)
      const result = await signInStudent(payload)
      sendJson(res, 200, result)
      return true
    }

    if (req.method === 'GET' && pathname === '/api/student/me') {
      const student = await getCurrentStudent(getBearerToken(req))
      sendJson(res, 200, { student })
      return true
    }

    if (req.method === 'PATCH' && pathname === '/api/student/profile') {
      const payload = await readJsonBody(req)
      const student = await updateCurrentStudent(getBearerToken(req), payload)
      sendJson(res, 200, { student })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/logout') {
      await logoutCurrentStudent(getBearerToken(req))
      sendJson(res, 200, { status: 'ok' })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/student/gigs') {
      const gigState = await getStudentGigState(getBearerToken(req))
      sendJson(res, 200, { gigState })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/student/trustscore') {
      const trustScore = await getStudentTrustScore(getBearerToken(req))
      sendJson(res, 200, { trustScore })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/trustscore/events') {
      const payload = await readJsonBody(req)
      const trustScore = await recordStudentTrustScoreEvent(getBearerToken(req), payload)
      sendJson(res, 200, trustScore)
      return true
    }

    if (req.method === 'GET' && pathname === '/api/student/network') {
      const networkState = await getStudentNetworkState(getBearerToken(req))
      sendJson(res, 200, { networkState })
      return true
    }

    const networkProfileMatch = pathname.match(/^\/api\/student\/network\/profiles\/([^/]+)$/)
    if (req.method === 'GET' && networkProfileMatch) {
      const profile = await getNetworkProfile(getBearerToken(req), decodeURIComponent(networkProfileMatch[1]))
      sendJson(res, 200, { profile })
      return true
    }

    const connectionTargetMatch = pathname.match(/^\/api\/student\/network\/connections\/([^/]+)$/)
    if (req.method === 'POST' && connectionTargetMatch) {
      sendJson(res, 201, { connection: await sendConnectionRequest(getBearerToken(req), decodeURIComponent(connectionTargetMatch[1])) })
      return true
    }
    if (req.method === 'DELETE' && connectionTargetMatch) {
      sendJson(res, 200, await removeConnection(getBearerToken(req), decodeURIComponent(connectionTargetMatch[1])))
      return true
    }

    const connectionDecisionMatch = pathname.match(/^\/api\/student\/network\/connection-requests\/([^/]+)$/)
    if (req.method === 'PATCH' && connectionDecisionMatch) {
      const payload = await readJsonBody(req)
      sendJson(res, 200, { connection: await decideConnectionRequest(getBearerToken(req), decodeURIComponent(connectionDecisionMatch[1]), payload.decision) })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/network/team-posts') {
      sendJson(res, 201, { teamPost: await createTeamPost(getBearerToken(req), await readJsonBody(req)) })
      return true
    }

    const teamPostMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)$/)
    if (req.method === 'PATCH' && teamPostMatch) {
      sendJson(res, 200, { teamPost: await updateTeamPost(getBearerToken(req), decodeURIComponent(teamPostMatch[1]), await readJsonBody(req)) })
      return true
    }
    if (req.method === 'DELETE' && teamPostMatch) {
      sendJson(res, 200, await deleteTeamPost(getBearerToken(req), decodeURIComponent(teamPostMatch[1])))
      return true
    }

    const teamJoinMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)\/join$/)
    if (req.method === 'POST' && teamJoinMatch) {
      sendJson(res, 201, { teamPost: await requestToJoinTeam(getBearerToken(req), decodeURIComponent(teamJoinMatch[1]), await readJsonBody(req)) })
      return true
    }

    const teamInviteMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)\/invitations\/([^/]+)$/)
    if (req.method === 'POST' && teamInviteMatch) {
      sendJson(res, 201, { teamPost: await inviteStudentToTeam(getBearerToken(req), decodeURIComponent(teamInviteMatch[1]), decodeURIComponent(teamInviteMatch[2]), await readJsonBody(req)) })
      return true
    }
    if (req.method === 'PATCH' && teamInviteMatch) {
      const payload = await readJsonBody(req)
      sendJson(res, 200, { teamPost: await decideTeamInvitation(getBearerToken(req), decodeURIComponent(teamInviteMatch[1]), decodeURIComponent(teamInviteMatch[2]), payload.decision) })
      return true
    }
    if (req.method === 'DELETE' && teamJoinMatch) {
      sendJson(res, 200, await withdrawTeamRequest(getBearerToken(req), decodeURIComponent(teamJoinMatch[1])))
      return true
    }

    const teamDecisionMatch = pathname.match(/^\/api\/student\/network\/team-posts\/([^/]+)\/requests\/([^/]+)$/)
    if (req.method === 'PATCH' && teamDecisionMatch) {
      const payload = await readJsonBody(req)
      sendJson(res, 200, { teamPost: await decideTeamRequest(getBearerToken(req), decodeURIComponent(teamDecisionMatch[1]), decodeURIComponent(teamDecisionMatch[2]), payload.decision) })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/student/earning') {
      const earningState = await getStudentEarningState(getBearerToken(req))
      sendJson(res, 200, { earningState })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/student/skillhub') {
      const skillHub = await getStudentSkillHub(getBearerToken(req))
      sendJson(res, 200, { skillHub })
      return true
    }

    if (req.method === 'GET' && pathname === '/api/student/activity-heatmap') {
      const searchParams = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams
      const heatmap = await getStudentActivityHeatmap(getBearerToken(req), Object.fromEntries(searchParams.entries()))
      sendJson(res, 200, { heatmap })
      return true
    }

    if (req.method === 'PATCH' && pathname === '/api/student/skillhub') {
      const payload = await readJsonBody(req)
      const skillHub = await updateStudentSkillHub(getBearerToken(req), payload)
      sendJson(res, 200, { skillHub })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/skillhub/events') {
      const payload = await readJsonBody(req)
      const skillHub = await recordStudentSkillHubEvent(getBearerToken(req), payload)
      sendJson(res, 200, { skillHub })
      return true
    }

    if (pathname === '/api/student/skillhub/assessments' && req.method === 'GET') {
      sendJson(res, 200, { assessments: await listStudentAssessments(getBearerToken(req)) })
      return true
    }
    if (pathname === '/api/student/skillhub/assessments' && req.method === 'POST') {
      sendJson(res, 201, { assessment: await submitSkillAssessment(getBearerToken(req), await readJsonBody(req)) })
      return true
    }

    if (req.method === 'PATCH' && pathname === '/api/student/earning') {
      const payload = await readJsonBody(req)
      const earningState = await updateStudentEarningState(getBearerToken(req), payload)
      sendJson(res, 200, { earningState })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/earning/withdraw') {
      const payload = await readJsonBody(req)
      const earningState = await requestStudentWithdrawal(getBearerToken(req), payload)
      sendJson(res, 200, { earningState })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/tasks/company-interview/load') {
      const payload = await readJsonBody(req)
      const taskResult = await getStudentCompanyInterviewTask(getBearerToken(req), payload)
      sendJson(res, 200, taskResult)
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/tasks/company-interview/submit') {
      const payload = await readJsonBody(req)
      const taskSubmission = await submitStudentCompanyInterviewTask(getBearerToken(req), payload)
      sendJson(res, 200, { taskSubmission })
      return true
    }

    if (req.method === 'POST' && pathname === '/api/student/tasks/company-interview/start') {
      const payload = await readJsonBody(req)
      const taskSubmission = await startStudentCompanyInterviewTask(getBearerToken(req), payload)
      sendJson(res, 200, { taskSubmission })
      return true
    }

    const applyMatch = pathname.match(/^\/api\/student\/gigs\/(\d+)\/apply$/)
    if (req.method === 'POST' && applyMatch) {
      const gigState = await applyToGig(getBearerToken(req), applyMatch[1])
      sendJson(res, 200, { gigState })
      return true
    }

    const saveMatch = pathname.match(/^\/api\/student\/gigs\/(\d+)\/save$/)
    if (req.method === 'POST' && saveMatch) {
      const gigState = await saveGig(getBearerToken(req), saveMatch[1])
      sendJson(res, 200, { gigState })
      return true
    }

    if (req.method === 'DELETE' && saveMatch) {
      const gigState = await unsaveGig(getBearerToken(req), saveMatch[1])
      sendJson(res, 200, { gigState })
      return true
    }

    const acceptMatch = pathname.match(/^\/api\/student\/opportunities\/([^/]+)\/accept$/)
    if (req.method === 'POST' && acceptMatch) {
      const gigState = await acceptOpportunity(getBearerToken(req), decodeURIComponent(acceptMatch[1]))
      sendJson(res, 200, { gigState })
      return true
    }

    const declineMatch = pathname.match(/^\/api\/student\/opportunities\/([^/]+)\/decline$/)
    if (req.method === 'POST' && declineMatch) {
      const gigState = await declineOpportunity(getBearerToken(req), decodeURIComponent(declineMatch[1]))
      sendJson(res, 200, { gigState })
      return true
    }
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      status: 'error',
      message: error.message || 'Something went wrong',
      requestId: res.requestId,
    })
    return true
  }

  return false
}

const server = http.createServer(async (req, res) => {
  const startTime = Date.now()
  req.requestId = createRequestId()
  res.requestId = req.requestId
  res.requestOrigin = req.headers.origin || ''
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  res.on('finish', () => {
    writeLog('info', 'request.completed', {
      requestId: req.requestId,
      method: req.method,
      pathname,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
    })
  })

  if (req.method === 'OPTIONS') {
    res.writeHead(204, buildCommonHeaders(res))
    res.end()
    return
  }

  const rateLimitResult = env.rateLimitingEnabled
    ? rateLimiter.check(req, pathname)
    : { limited: false, retryAfterMs: 0 }

  if (rateLimitResult.limited) {
    res.setHeader('Retry-After', String(Math.ceil(rateLimitResult.retryAfterMs / 1000)))
    sendJson(res, 429, {
      status: 'error',
      message: 'Too many requests. Please slow down and try again shortly.',
      requestId: req.requestId,
    })
    return
  }

  if (await handlePublicApi(req, res, pathname)) {
    return
  }

  const bearerToken = getBearerToken(req)
  const sessionSubject = await resolveSessionSubject({
    token: bearerToken,
    studentModel: Student,
    companyModel: Company,
    reviewerModel: Reviewer,
    sessionTtlMs: getSessionTtlMs(env.sessionTtlDays),
  })

  if (env.rateLimitingEnabled && sessionSubject) {
    const dailyUserLimitResult = rateLimiter.consumeDailyUser(`${sessionSubject.type}:${sessionSubject.id}`)

    if (dailyUserLimitResult.limited) {
      res.setHeader('Retry-After', String(Math.ceil(dailyUserLimitResult.retryAfterMs / 1000)))
      sendJson(res, 429, {
        status: 'error',
        message: 'Daily account request limit reached. Please try again tomorrow.',
        requestId: req.requestId,
      })
      return
    }
  }

  if (await handleStudentApi(req, res, pathname)) {
    return
  }

  if (await handleCompanyApi(req, res, pathname)) {
    return
  }

  if (await handleReviewerApi(req, res, pathname)) {
    return
  }

  if (req.method === 'GET' && pathname === '/') {
    sendJson(res, 200, {
      name: 'SkillBridge API',
      status: 'ok',
      message: 'Backend is running.',
      health: '/health',
    })
    return
  }

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      database: getDatabaseStatus(),
      port,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      uptimeSeconds: Math.round(process.uptime()),
    })
    return
  }

  if (req.method === 'GET' && pathname === '/live') {
    sendJson(res, 200, {
      status: 'ok',
      requestId: req.requestId,
      uptimeSeconds: Math.round(process.uptime()),
    })
    return
  }

  if (req.method === 'GET' && pathname === '/ready') {
    const databaseStatus = getDatabaseStatus()
    const isReady = databaseStatus === 'connected'

    sendJson(res, isReady ? 200 : 503, {
      status: isReady ? 'ready' : 'not_ready',
      database: databaseStatus,
      requestId: req.requestId,
    })
    return
  }

  sendJson(res, 404, {
    status: 'error',
    message: 'Route not found',
    requestId: req.requestId,
  })
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    writeLog('error', 'server.port_in_use', {
      port,
      error: serializeError(error),
    })
  } else {
    writeLog('error', 'server.start_failed', {
      port,
      error: serializeError(error),
    })
  }

  process.exit(1)
})

async function startServer() {
  try {
    await connectToDatabase(mongoUrl)
    writeLog('info', 'database.connected', {
      database: getDatabaseStatus(),
    })

    server.listen(port, () => {
      writeLog('info', 'server.started', {
        port,
        nodeEnv: env.nodeEnv,
        corsOrigins: env.corsOrigins,
      })
    })
  } catch (error) {
    writeLog('error', 'database.connection_failed', {
      error: serializeError(error),
    })
    process.exit(1)
  }
}

let shutdownPromise = null

async function shutdown(signal) {
  if (shutdownPromise) return shutdownPromise

  shutdownPromise = new Promise(resolve => {
    writeLog('warn', 'server.shutdown_requested', { signal })

    const finish = async closeError => {
      if (closeError && closeError.code !== 'ERR_SERVER_NOT_RUNNING') {
        writeLog('error', 'server.shutdown_close_failed', {
          signal,
          error: serializeError(closeError),
        })
      }

      try {
        await disconnectFromDatabase()
        writeLog('info', 'server.shutdown_complete', { signal })
        resolve()
        process.exit(0)
      } catch (error) {
        writeLog('error', 'server.shutdown_db_disconnect_failed', {
          signal,
          error: serializeError(error),
        })
        resolve()
        process.exit(1)
      }
    }

    if (server.listening) server.close(finish)
    else finish()
  })

  return shutdownPromise
}

process.on('SIGINT', () => { void shutdown('SIGINT') })
process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('uncaughtException', error => {
  writeLog('error', 'process.uncaught_exception', {
    error: serializeError(error),
  })
})
process.on('unhandledRejection', error => {
  writeLog('error', 'process.unhandled_rejection', {
    error: serializeError(error),
  })
})

startServer()
