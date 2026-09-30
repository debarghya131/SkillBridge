const {
  getStudentActivityHeatmap, getStudentSkillHub, recordStudentSkillHubEvent, setStudentSkillArchived, updateStudentSkillHub,
} = require('../controllers/skillHubController')
const { listStudentAssessments, submitSkillAssessment } = require('../controllers/skillAssessmentController')
const { listPublishedSkillCatalog, listStudentSkillRequests, requestCatalogSkill } = require('../controllers/skillCatalogController')
const { getBearerToken, getRequestUrl, readJsonBody } = require('../utils/request')

async function handleStudentSkillHubRoutes(req, res, pathname, sendJson) {
  if (req.method === 'GET' && pathname === '/api/student/skillhub') {
    const searchParams = getRequestUrl(req).searchParams
    const skillHub = await getStudentSkillHub(getBearerToken(req), {
      includeSkillGap: searchParams.get('includeSkillGap') !== 'false',
    })
    sendJson(res, 200, { skillHub })
    return true
  }

  if (req.method === 'GET' && pathname === '/api/student/skillhub/catalog') {
    const searchParams = getRequestUrl(req).searchParams
    sendJson(res, 200, { skills: await listPublishedSkillCatalog(getBearerToken(req), Object.fromEntries(searchParams.entries())) })
    return true
  }

  if (pathname === '/api/student/skillhub/skill-requests' && req.method === 'GET') {
    sendJson(res, 200, { requests: await listStudentSkillRequests(getBearerToken(req)) })
    return true
  }

  if (pathname === '/api/student/skillhub/skill-requests' && req.method === 'POST') {
    sendJson(res, 201, { request: await requestCatalogSkill(getBearerToken(req), await readJsonBody(req)) })
    return true
  }

  if (req.method === 'GET' && pathname === '/api/student/activity-heatmap') {
    const searchParams = getRequestUrl(req).searchParams
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

  if (req.method === 'PATCH' && pathname === '/api/student/skillhub/skill-visibility') {
    const payload = await readJsonBody(req)
    const skillHub = await setStudentSkillArchived(getBearerToken(req), payload)
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

  return false
}

module.exports = { handleStudentSkillHubRoutes }
