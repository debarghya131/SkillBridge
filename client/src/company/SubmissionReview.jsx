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

export default function SubmissionReview({ submission, onReview, readOnly = false }) {
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [score, setScore] = useState(submission.score ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [workBrief, setWorkBrief] = useState(submission.workBrief || '')
  const actions = readOnly ? [] : REVIEW_ACTIONS[submission.status] || []
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
    <article className="work-review">
      <header className="work-review-header">
        <div>
          <h3>{submission.studentName}</h3>
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

      {submission.workBrief && submission.status !== 'selected' && <div className="work-evidence"><strong>GIG work brief</strong><p className="work-response">{submission.workBrief}</p></div>}
      {!readOnly && submission.status === 'selected' && <label className="workspace-work-brief">GIG work brief<textarea rows="4" maxLength="4000" value={workBrief} disabled={busy} onChange={event => setWorkBrief(event.target.value)} /></label>}

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
