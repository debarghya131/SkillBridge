const WORK_STATUSES = ['selected', 'ready_to_hire', 'work_started', 'delivered', 'approved', 'completed', 'needs_revision']

function isWorkSubmission(submission) {
  return WORK_STATUSES.includes(submission.status)
    && (submission.status !== 'needs_revision' || submission.revisionReturnStatus === 'delivered')
}

function buildWorkspaceState(savedState, submissions, gigs = []) {
  const savedProjects = Array.isArray(savedState?.projects) ? savedState.projects : []
  const work = submissions.filter(isWorkSubmission)
  const projects = work.map(submission => {
    const submissionId = String(submission._id || submission.id)
    const id = `submission-${submissionId}`
    const gig = gigs.find(item => (
      submission.companyGigPublicId
        ? String(item?.publicId || '') === String(submission.companyGigPublicId)
        : Number.isFinite(Number(submission.companyGigId))
          && Number.isFinite(Number(item?.id))
          && Number(item.id) === Number(submission.companyGigId)
    ))
    const projectTitle = gig?.title || submission.gigTitle
    // Adopt legacy notes only when the old title identifies exactly one assignment.
    const previous = savedProjects.find(project => project.id === id || project.submissionId === submissionId)
      || (work.filter(item => item.gigTitle === submission.gigTitle).length === 1
        ? savedProjects.find(project => !project.submissionId && (project.title === submission.gigTitle || project.title === projectTitle)) : null)
    const status = ['approved', 'completed'].includes(submission.status) ? 'Completed'
      : submission.status === 'delivered' ? 'Review'
        : ['work_started', 'needs_revision'].includes(submission.status) ? 'In Progress' : 'Planning'
    return {
      id, submissionId,
      companyGigId: submission.companyGigId,
      companyGigPublicId: submission.companyGigPublicId || '',
      title: projectTitle,
      company: submission.companyName,
      status,
      submissionStatus: submission.status,
      deadline: previous?.deadline || '',
      progress: status === 'Completed' ? 100 : status === 'Review' ? 75 : status === 'In Progress' ? 25 : 0,
      team: [submission.studentName],
      tasks: [{ name: 'GIG deliverable', owner: submission.studentName,
        state: status === 'Completed' ? 'Done' : status === 'Review' ? 'In Review' : 'Todo' }],
      updates: previous?.updates || [],
      milestones: previous?.milestones || [],
      submissionLink: submission.submissionLink || '',
      submissionContent: submission.submissionContent || '',
      feedback: submission.feedback || '',
      paymentStatus: submission.externalPayment ? 'External payment recorded'
        : submission.status === 'completed' ? 'Legacy completion' : status === 'Completed' ? 'Payment pending' : '',
    }
  })
  return {
    projects,
    selectedProjectId: projects.some(project => project.id === savedState?.selectedProjectId)
      ? savedState.selectedProjectId : projects[0]?.id || '',
    statusFilter: ['All', 'Planning', 'In Progress', 'Review', 'Completed'].includes(savedState?.statusFilter)
      ? savedState.statusFilter : 'All',
  }
}

module.exports = { buildWorkspaceState, isWorkSubmission }
