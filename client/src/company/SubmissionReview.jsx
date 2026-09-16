import { useEffect, useRef, useState } from 'react'
import { safeExternalUrl } from '../lib/safeExternalUrl'

const REVIEW_ACTIONS = {
  submitted: [['reviewed', 'Save Review'], ['rejected', 'Reject'], ['needs_revision', 'Request Revision']],
  reviewed: [['selected', 'Select Student'], ['rejected', 'Reject'], ['needs_revision', 'Request Revision']],
  ready_to_hire: [['selected', 'Select Student']],
  selected: [['work_started', 'Start GIG Work']],
  delivered: [['approved', 'Approve Work'], ['needs_revision', 'Request Revision']],
}

const STATUS_LABELS = {
  submitted: 'Submitted for review',
  reviewed: 'Reviewed',
  selected: 'Selected for GIG work',
  work_started: 'GIG work in progress',
  delivered: 'Deliverable awaiting approval',
  approved: 'Work approved, payment pending',
  completed: 'Completed',
  rejected: 'Not selected',
  needs_revision: 'Revision requested',
}

function isReviewStage(status) {
  return ['submitted', 'reviewed', 'delivered'].includes(status)
}

export default function SubmissionReview({ submission, onReview, readOnly = false, kickoffInWorkspace = false, onOpenWorkspace }) {
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [score, setScore] = useState(submission.score ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [workBrief, setWorkBrief] = useState(submission.workBrief || '')
  const actions = readOnly || (kickoffInWorkspace && submission.status === 'selected')
    ? []
    : REVIEW_ACTIONS[submission.status] || []
  const formRef = useRef(null)
  const reviewStage = isReviewStage(submission.status)
  const link = safeExternalUrl(submission.submissionLink)

  useEffect(() => {
    setFeedback(submission.feedback || '')
    setScore(submission.score ?? '')
    setError('')
    setWorkBrief(submission.workBrief || '')
  }, [submission.id, submission.status, submission.feedback, submission.score, submission.workBrief])

  const review = async status => {
    if (busy || !actions.some(([value]) => value === status)) return
    if (formRef.current && !formRef.current.reportValidity()) return
    setBusy(true)
    setError('')
    try {
      if (status === 'work_started' && !workBrief.trim()) throw new Error('Add the GIG work requirements before starting.')
      await onReview(submission.id, {
        status,
        ...(status === 'work_started' ? { workBrief: workBrief.trim() } : {}),
        ...(reviewStage ? { feedback, score: score !== '' ? Number(score) : null } : {}),
      })
    } catch (failure) {
      setError(failure.message || 'Could not save the review.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`work-review${readOnly ? ' is-read-only' : ''}`}>
      <header className="work-review-header">
        <div>
          <h3>{submission.studentName}{submission.demoData && <span className="demo-data-badge">Demo</span>}</h3>
          <p className="work-muted">{submission.gigTitle} · {submission.taskTitle || 'Interview task'}</p>
        </div>
        <span className={'work-status work-status-' + submission.status}>{STATUS_LABELS[submission.status] || submission.status}</span>
      </header>

      {(link || submission.submissionContent || submission.note) && (
        <div className="work-evidence">
          <strong>Student submission</strong>
          {link && <a href={link} target="_blank" rel="noreferrer">Open submitted work</a>}
          {submission.submissionContent && <pre className="work-response">{submission.submissionContent}</pre>}
          {submission.note && <p className="work-response">{submission.note}</p>}
        </div>
      )}
      {submission.submittedLate && <p className="work-muted">Submitted after the interview deadline (India time).</p>}
      {Object.keys(submission.reviewGuide || {}).length > 0 && <details className="work-details"><summary>Private review guide</summary>
        {Object.entries(submission.reviewGuide).map(([key, value]) => <p key={key} className="work-response"><strong>{({ answerKey: 'Answer key', evaluationCriteria: 'Evaluation criteria', testCases: 'Test cases', acceptanceCriteria: 'Acceptance criteria', passingScore: 'Passing score (%)' })[key] || key}:</strong> {value}</p>)}
      </details>}

      {submission.interviewSubmission && (
        <details className="work-details">
          <summary>Interview submission</summary>
          {safeExternalUrl(submission.interviewSubmission.submissionLink) && <a href={safeExternalUrl(submission.interviewSubmission.submissionLink)} target="_blank" rel="noreferrer">Open interview work</a>}
          {submission.interviewSubmission.submissionContent && <pre className="work-response">{submission.interviewSubmission.submissionContent}</pre>}
        </details>
      )}

      {readOnly && submission.status === 'selected' && <p className="work-muted">The student passed the interview stage and is selected. Next, the company adds the work brief and starts the GIG.</p>}
      {readOnly && submission.status === 'work_started' && <p className="work-muted">The GIG is in progress. The student will submit the final delivery when the work is ready for review.</p>}

      {!readOnly && kickoffInWorkspace && submission.status === 'selected' && (
        <section className="gig-work-handoff" aria-label="Next step: start GIG Work">
          <div>
            <strong>Interview complete — set up the actual GIG Work</strong>
            <p>This student now has an independent GIG Work record. Add the paid work requirements, milestones, and due dates in Project Workspace.</p>
          </div>
          <button type="button" className="btn-primary" onClick={onOpenWorkspace}>Open Project Workspace</button>
        </section>
      )}

      {submission.workBrief && submission.status !== 'selected' && <div className="work-evidence"><strong>GIG work brief</strong><p className="work-response">{submission.workBrief}</p></div>}
      {!readOnly && !kickoffInWorkspace && submission.status === 'selected' && (
        <section className="gig-work-kickoff" aria-label="GIG Work setup">
          <div><strong>Actual GIG Work setup</strong><p>This is the paid delivery brief shown to the selected student. It is separate from the interview task above.</p></div>
          <label className="workspace-work-brief">GIG Work requirements *<textarea required rows="5" maxLength="4000" value={workBrief} disabled={busy} onChange={event => setWorkBrief(event.target.value)} placeholder="Describe the final deliverables, acceptance criteria, required evidence, and handover expectations." /></label>
        </section>
      )}

      {reviewStage && actions.length > 0 && (
        <form ref={formRef} className="work-review-form" onSubmit={event => { event.preventDefault(); review(actions[0][0]) }}>
          <div className="work-form-grid">
            <label>Score / {submission.taskPoints || 100}
              <input type="number" min="0" max={submission.taskPoints || 100} step="1" value={score} onChange={event => setScore(event.target.value)} />
            </label>
            <label>Feedback
              <textarea rows="3" maxLength="2000" value={feedback} onChange={event => setFeedback(event.target.value)} />
            </label>
          </div>
          <div className="work-actions">
            {actions.map(([status, label]) => (
              <button key={status} type="button" className={status === 'rejected' ? 'btn-secondary' : 'btn-primary'} disabled={busy} onClick={() => review(status)}>
                {busy ? 'Saving...' : label}
              </button>
            ))}
          </div>
        </form>
      )}

      {!reviewStage && actions.length > 0 && (
        <div className="work-actions">
          {actions.map(([status, label]) => (
            <button key={status} type="button" className="btn-primary" disabled={busy} onClick={() => review(status)}>
              {busy ? 'Saving...' : label}
            </button>
          ))}
        </div>
      )}

      {submission.feedback && (!reviewStage || readOnly) && <p className="work-feedback"><strong>Company feedback:</strong> {submission.feedback}</p>}
      {submission.score != null && (!reviewStage || readOnly) && <p className="work-muted">Score: {submission.score} / {submission.taskPoints || 100}</p>}
      {submission.status === 'approved' && <p className="work-muted">Record an already-made transfer in Payment to complete this GIG.</p>}
      {error && <p role="alert" className="work-error">{error}</p>}
    </article>
  )
}
