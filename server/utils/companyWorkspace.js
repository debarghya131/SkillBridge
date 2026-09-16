const WORK_STATUSES = ['selected', 'ready_to_hire', 'work_started', 'delivered', 'approved', 'completed', 'needs_revision']

function isWorkSubmission(submission) {
  return WORK_STATUSES.includes(submission.status)
    && (submission.status !== 'needs_revision' || submission.revisionReturnStatus === 'delivered')
}

function workspaceDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function workspaceTimestamp(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
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
    const status = submission.status === 'completed' ? 'Completed'
      : submission.status === 'approved' ? 'Approved'
        : submission.status === 'delivered' ? 'Review'
        : ['work_started', 'needs_revision'].includes(submission.status) ? 'In Progress' : 'Planning'
    const savedMilestones = Array.isArray(previous?.milestones) ? previous.milestones : []
    const completionMilestoneId = `task-completed-${submissionId}`
    const completedOn = submission.completedAt || submission.reviewedAt || submission.updatedAt || submission.submittedAt
    const milestones = submission.status === 'completed' && !savedMilestones.some(item => item.id === completionMilestoneId)
      ? [...savedMilestones, {
        id: completionMilestoneId,
        title: `${submission.taskTitle || 'Project task'} completed`,
        dueDate: workspaceDate(completedOn),
        status: 'Completed',
        createdAt: workspaceTimestamp(completedOn),
      }]
      : savedMilestones
    return {
      id, submissionId,
      studentId: submission.studentId ? String(submission.studentId) : '',
      studentAvatar: submission.studentAvatar || '',
      companyGigId: submission.companyGigId,
      companyGigPublicId: submission.companyGigPublicId || '',
      title: projectTitle,
      company: submission.companyName,
      status,
      submissionStatus: submission.status,
      deadline: previous?.deadline || '',
      progress: status === 'Completed' ? 100 : status === 'Approved' ? 85 : status === 'Review' ? 75 : status === 'In Progress' ? 25 : 0,
      team: [submission.studentName],
      tasks: [{ name: 'GIG deliverable', owner: submission.studentName,
        state: ['Approved', 'Completed'].includes(status) ? 'Done' : status === 'Review' ? 'In Review' : 'Todo' }],
      updates: previous?.updates || [],
      milestones,
      submissionLink: submission.submissionLink || '',
      submissionContent: submission.submissionContent || '',
      feedback: submission.feedback || '',
      paymentStatus: submission.externalPayment ? 'External payment recorded'
        : submission.status === 'completed' ? 'Legacy completion' : status === 'Approved' ? 'Payment pending' : '',
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
