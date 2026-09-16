function submissionMatchesGig(submission, gig) {
  if (!submission || !gig) return false
  if (submission.companyGigPublicId && gig.publicId) {
    return String(submission.companyGigPublicId) === String(gig.publicId)
  }
  return Number.isFinite(Number(submission.companyGigId))
    && Number.isFinite(Number(gig.id))
    && Number(submission.companyGigId) === Number(gig.id)
}

function submissionMatchesApplicant(submission, gigId, applicantId) {
  return Number(submission.companyGigId) === Number(gigId)
    && String(submission.studentId || '') === String(applicantId || '')
}

function synchronizeCompanyGigMetrics(state, submissions = []) {
  const nextState = state
  const applicantsByGig = nextState.applicantsByGig && typeof nextState.applicantsByGig === 'object'
    ? nextState.applicantsByGig
    : {}
  const allApplicants = nextState.gigs.flatMap(gig => {
    const applicants = Array.isArray(applicantsByGig[gig.id]) ? applicantsByGig[gig.id] : []
    return applicants.map(applicant => ({ gig, applicant }))
  })
  const newApplications = allApplicants.filter(({ gig, applicant }) => !submissions.some(submission => (
    submissionMatchesGig(submission, gig)
      && submissionMatchesApplicant(submission, gig.id, applicant.studentId || applicant.id)
  ))).length
  const sentTasks = nextState.gigs.reduce((total, gig) => total + Math.max(0, Number(gig.interviewTasks) || 0), 0)
  const pendingReview = submissions.filter(submission => (
    ['submitted', 'reviewed'].includes(submission.status)
      || (submission.status === 'needs_revision' && submission.revisionReturnStatus !== 'delivered')
  )).length
  const activeHires = submissions.filter(submission => (
    ['selected', 'work_started', 'delivered', 'approved'].includes(submission.status)
      || (submission.status === 'needs_revision' && submission.revisionReturnStatus === 'delivered')
  )).length
  const selected = submissions.filter(submission => (
    ['selected', 'work_started', 'delivered', 'approved', 'completed'].includes(submission.status)
      || (submission.status === 'needs_revision' && submission.revisionReturnStatus === 'delivered')
  )).length

  nextState.stats = nextState.stats.map(item => {
    if (item.label === 'Applications') return { ...item, value: String(allApplicants.length) }
    if (item.label === 'Interview Tasks Sent') return { ...item, value: String(sentTasks) }
    if (item.label === 'Active Hires') return { ...item, value: String(activeHires) }
    return item
  })
  nextState.pipeline = nextState.pipeline.map(item => {
    if (item.label === 'New Applications') return { ...item, value: String(newApplications) }
    if (item.label === 'Interview Task Pending') return { ...item, value: String(Math.max(0, sentTasks - submissions.length)) }
    if (item.label === 'Task Submitted') return { ...item, value: String(pendingReview) }
    if (item.label === 'Selected') return { ...item, value: String(selected) }
    return item
  })

  return nextState
}

module.exports = { submissionMatchesGig, synchronizeCompanyGigMetrics }
