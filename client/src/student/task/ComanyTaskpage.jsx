import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import CompanyLogo from '../../ui/CompanyLogo'
import { readTaskDraft, taskDraftKey } from './taskDraft'
import {
  fetchStudentCompanyInterviewTask,
  getStudentSessionToken,
  startStudentCompanyInterviewTask,
  submitStudentCompanyInterviewTask,
} from '../studentApi'
import { toast } from '../../ui/toast'

const TASK_STAGES = [
  { key: 'brief', label: 'Brief', icon: '📋' },
  { key: 'submission', label: 'Submission', icon: '📤' },
  { key: 'feedback', label: 'Feedback', icon: '💬' },
]
const TASK_TYPE_LABELS = {
  live_project: 'Live Project Assignment',
  code: 'Code',
  mcq: 'MCQ',
  written: 'Written',
  mixed: 'Mixed',
  design: 'Design Challenge',
  data_analysis: 'Data Analysis',
  case_study: 'Case Study',
  research: 'Research Report',
  presentation: 'Presentation',
}
const TASK_DETAIL_LABELS = {
  deliverables: 'Deliverables',
  acceptanceCriteria: 'Acceptance Criteria',
  submissionRequirements: 'Submission Requirements',
  language: 'Preferred Language',
  testCases: 'Test Cases / Expected Output',
  questionCount: 'Number of Questions',
  questions: 'Questions',
  options: 'Answer Options',
  passingScore: 'Passing Score',
  wordLimit: 'Word Limit',
  evaluationCriteria: 'Evaluation Criteria',
  components: 'Included Components',
}

function getOpportunityIdentity(opportunity) {
  // Active/completed GIG cards use a display-only synthetic id. The original
  // invitation id is the stable key accepted by the task API.
  return opportunity?.opportunityId
    ?? opportunity?.id
    ?? opportunity?.companyGigPublicId
    ?? opportunity?.companyGigId
    ?? ''
}

export default function CompanyTaskpage({ opportunity }) {
  const [retry, setRetry] = useState(0)
  const [reviewData, setReviewData] = useState(null)
  const [stage, setStage] = useState('brief')
  const [submissionLink, setSubmissionLink] = useState('')
  const [submissionContent, setSubmissionContent] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [note, setNote] = useState('')
  const [submissionStatus, setSubmissionStatus] = useState('submitted')
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submissionNotice, setSubmissionNotice] = useState('')
  const [serverAssignment, setServerAssignment] = useState(null)
  const [assignmentError, setAssignmentError] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [draftVersion, setDraftVersion] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const operation = useRef(false)

  useEffect(() => {
    if (!draftKey || !serverAssignment || submitted || isLoading) return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ submissionLink, submissionContent, note, version: draftVersion, savedAt: Date.now() }))
      setDraftNotice('Draft saved in this browser tab')
    } catch { setDraftNotice('Draft could not be saved on this device') }
  }, [draftKey, draftVersion, serverAssignment, submitted, isLoading, submissionLink, submissionContent, note])

  useEffect(() => {
    let cancelled = false
    const token = getStudentSessionToken()

    setSubmissionLink('')
    setSubmissionContent('')
    setSubmitted(false)
    setNote('')
    setSubmissionStatus('submitted')
    setFeedback('')
    setSubmitError('')
    setSubmissionNotice('')
    setServerAssignment(null)
    setAssignmentError('')
    setIsLoading(true)
    setReviewData(null)
    setDraftKey('')
    setDraftNotice('')

    if (!opportunity || !token) {
      setAssignmentError('Sign in and reopen an accepted company invitation.')
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    async function loadSubmission() {
      setIsLoading(true)

      try {
        const result = await fetchStudentCompanyInterviewTask(token, {
          opportunityId: getOpportunityIdentity(opportunity),
          gigTitle: opportunity.title,
          companyName: opportunity.company,
        })

        if (!cancelled && !result.taskAssignment) throw new Error('The server did not return an assigned task.')
        if (cancelled) return
        const version = `${result.taskSubmission?.status || 'new'}:${result.taskSubmission?.updatedAt || result.taskSubmission?.submittedAt || ''}`
        let key = ''
        try { key = await taskDraftKey(token, [opportunity.companyId, getOpportunityIdentity(opportunity)]) } catch { /* Draft storage is optional. */ }
        if (cancelled) return
        const draft = key ? readTaskDraft(sessionStorage, key, version) : null
        setDraftKey(key)
        setDraftVersion(version)
        if (cancelled || !result.taskSubmission) {
          if (!cancelled && result.taskAssignment) {
            setServerAssignment(result.taskAssignment)
            if (draft) { setSubmissionLink(draft.submissionLink); setSubmissionContent(draft.submissionContent); setNote(draft.note) }
          }
          return
        }

        if (result.taskAssignment) {
          setServerAssignment(result.taskAssignment)
        }
        setReviewData(result.taskSubmission)
        const editable = ['submitted', 'needs_revision', 'work_started'].includes(result.taskSubmission.status)
        setSubmissionLink(editable && draft ? draft.submissionLink : result.taskSubmission.submissionLink || '')
        setSubmissionContent(editable && draft ? draft.submissionContent : result.taskSubmission.submissionContent || '')
        setNote(editable && draft ? draft.note : result.taskSubmission.note || '')
        setSubmitted(!(editable && draft))
        setSubmissionStatus(result.taskSubmission.status || 'submitted')
        setFeedback(result.taskSubmission.feedback || '')
      } catch (error) {
        if (!cancelled) {
          setAssignmentError(error.message || 'Could not load this interview task.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadSubmission()

    return () => {
      cancelled = true
    }
  }, [opportunity, retry])

  if (!opportunity) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 14 }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 500 }}>No task assigned yet. Accept an invite from Opportunity tab.</div>
      </div>
    )
  }

  if (!serverAssignment || assignmentError) {
    return <div className="company-task-page">
      {isLoading ? <DashboardSkeleton section="tasks" /> : <div role="alert" className="work-error">
        <p>{assignmentError || 'This assigned task is unavailable.'}</p>
        <button className="btn-primary" onClick={() => setRetry(value => value + 1)}>Retry</button>
      </div>}
    </div>
  }

  const task = { ...opportunity, ...serverAssignment }
  const isWorkDelivery = ['selected', 'work_started', 'delivered', 'approved', 'completed'].includes(submissionStatus)
    || (submissionStatus === 'needs_revision' && reviewData?.revisionReturnStatus === 'delivered')
  if (isWorkDelivery) task.taskType = 'mixed'
  const taskTitle = isWorkDelivery ? 'GIG work delivery' : task.taskTitle || 'Interview task'
  const taskInstructions = isWorkDelivery
    ? reviewData?.workBrief || 'No separate GIG work brief has been added. Confirm delivery requirements with the company.'
    : task.taskInstructions || 'The company has not added task instructions yet. Contact the company before submitting your work.'
  const taskDeadline = isWorkDelivery ? reviewData?.workspace?.deadline || 'Not set' : task.taskDeadline || task.deadline || 'Not set'
  const taskPoints = Number(task.taskPoints) || 0
  const taskTypeLabel = TASK_TYPE_LABELS[task.taskType] || 'Mixed'
  const taskDetails = !isWorkDelivery && task.taskDetails && typeof task.taskDetails === 'object' ? task.taskDetails : {}
  const needsLink = ['live_project', 'code'].includes(task.taskType)
  const needsWrittenResponse = ['mcq', 'written'].includes(task.taskType)
  const allowsWrittenResponse = ['mcq', 'written', 'mixed', 'design', 'data_analysis', 'case_study', 'research', 'presentation'].includes(task.taskType)
  const responseLabel = task.taskType === 'mcq' ? 'Your Answers *' : task.taskType === 'written' ? 'Written Response *' : 'Response / Explanation'
  const responsePlaceholder = task.taskType === 'mcq'
    ? 'Enter your answers and brief explanations where requested.'
    : task.taskType === 'written'
      ? 'Write your response according to the prompt and evaluation criteria.'
      : 'Add your explanation, answers, or implementation notes.'

  const statusMeta = {
    submitted: {
      badge: 'Submitted',
      bg: '#EDE9FE',
      color: '#6D28D9',
      title: 'Submission Received!',
      copy: `${task.company} can now review your submission.`,
    },
    reviewed: {
      badge: 'Reviewed',
      bg: '#DBEAFE',
      color: '#1D4ED8',
      title: 'Company Review Added',
      copy: `${task.company} reviewed your task. Check the feedback tab for their notes.`,
    },
    selected: {
      badge: 'Selected',
      bg: '#D1FAE5',
      color: '#065F46',
      title: 'You Were Selected',
      copy: `${task.company} selected you. Complete the GIG work and submit the deliverable.`,
    },
    work_started: {
      badge: 'Work Started',
      bg: '#EDE9FE',
      color: '#6D28D9',
      title: 'GIG Work Started',
      copy: `${task.company} marked the GIG as started. Submit your completed work when ready.`,
    },
    delivered: {
      badge: 'Work Delivered',
      bg: '#DBEAFE',
      color: '#1D4ED8',
      title: 'Work Delivered',
      copy: `${task.company} received your completed GIG work and will review it.`,
    },
    approved: {
      badge: 'Approved',
      bg: '#D1FAE5',
      color: '#065F46',
      title: 'Work Approved',
      copy: 'Your work is approved. External payment has not been recorded yet.',
    },
    completed: {
      badge: 'Completed',
      bg: '#D1FAE5',
      color: '#065F46',
      title: 'GIG Completed',
      copy: 'The company marked this GIG complete. Any recorded external payment is shown in Feedback.',
    },
    rejected: {
      badge: 'Not Selected',
      bg: '#FEE2E2',
      color: '#B91C1C',
      title: 'Application Not Selected',
      copy: `${task.company} did not select this submission for the GIG.`,
    },
    needs_revision: {
      badge: 'Needs Revision',
      bg: '#FEF3C7',
      color: '#92400E',
      title: 'Revision Requested',
      copy: `${task.company} asked for an updated submission. Review the feedback and resubmit.`,
    },
  }

  const currentStatusMeta = statusMeta[submissionStatus] || statusMeta.submitted
  const handleSubmit = async () => {
    if (operation.current) return
    const normalizedLink = submissionLink.trim()
    const normalizedContent = submissionContent.trim()
    if (needsLink && !normalizedLink) {
      setSubmitError('Add a public http:// or https:// link before submitting.')
      return
    }
    if (needsWrittenResponse && !normalizedContent) {
      setSubmitError('Add your response before submitting.')
      return
    }
    if (!normalizedLink && !normalizedContent) {
      setSubmitError('Add a link or written response before submitting.')
      return
    }

    if (normalizedLink) {
      try {
        const parsedLink = new URL(normalizedLink)
        if (!['http:', 'https:'].includes(parsedLink.protocol)) {
          throw new Error('invalid protocol')
        }
      } catch {
        setSubmitError('Use a valid public http:// or https:// link.')
        return
      }
    }

    if (note.length > 2000) {
      setSubmitError('Keep your note under 2,000 characters.')
      return
    }

    const token = getStudentSessionToken()
    setSubmitError('')
    setSubmissionNotice('')

    if (!token) {
      setSubmitError('Sign in again before submitting your work.')
      return
    }

    setIsLoading(true)
    operation.current = true

    try {
      const result = await submitStudentCompanyInterviewTask(token, {
        opportunityId: getOpportunityIdentity(task),
        gigTitle: task.title,
        companyName: task.company,
        submissionLink: normalizedLink,
        submissionContent: normalizedContent,
        note,
      })

      if (!result.taskSubmission?.id) throw new Error('Submission was not confirmed. Refresh before trying again.')
      setReviewData(result.taskSubmission)
      setDraftVersion(`${result.taskSubmission.status}:${result.taskSubmission.updatedAt || result.taskSubmission.submittedAt || ''}`)
      try { sessionStorage.removeItem(draftKey) } catch { /* Server submission is already saved. */ }
      setDraftNotice('')
      setSubmitted(true)
      setSubmissionLink(normalizedLink)
      setSubmissionContent(normalizedContent)
      setSubmissionStatus(result.taskSubmission?.status || 'submitted')
      setFeedback(result.taskSubmission?.feedback || '')
      setSubmissionNotice('Your submission is now linked to the company review queue.')
      toast.success(isWorkDelivery ? 'GIG work submitted successfully.' : 'Interview task submitted successfully.', { title: 'Submission Sent' })
    } catch (error) {
      setSubmitError(error.message || 'Could not submit your work right now.')
    } finally {
      operation.current = false
      setIsLoading(false)
    }
  }

  const handleStartWork = async () => {
    if (operation.current) return
    const token = getStudentSessionToken()
    setSubmitError('')
    setSubmissionNotice('')

    if (!token) {
      setSubmitError('Sign in again before starting work.')
      return
    }

    setIsLoading(true)
    operation.current = true
    try {
      const result = await startStudentCompanyInterviewTask(token, {
        opportunityId: getOpportunityIdentity(task),
        gigTitle: task.title,
        companyName: task.company,
      })
      if (!result.taskSubmission?.id) throw new Error('Work start was not confirmed. Refresh before trying again.')
      setDraftVersion(`${result.taskSubmission.status}:${result.taskSubmission.updatedAt || result.taskSubmission.submittedAt || ''}`)
      setSubmissionLink(result.taskSubmission?.submissionLink || '')
      setSubmissionContent(result.taskSubmission?.submissionContent || '')
      setNote(result.taskSubmission?.note || '')
      setSubmissionStatus(result.taskSubmission?.status || 'work_started')
      setReviewData(result.taskSubmission)
      setSubmitted(false)
      setSubmissionNotice('Work started. Complete the assignment and submit your deliverable when ready.')
      toast.success('GIG work started.', { title: 'Work Started' })
    } catch (error) {
      setSubmitError(error.message || 'Could not start the GIG right now.')
    } finally {
      operation.current = false
      setIsLoading(false)
    }
  }

  return (
    <div className="company-task-page">
      <button type="button" className="btn-secondary" title="Refresh task status" aria-label="Refresh task status" disabled={isLoading} onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} /></button>
      {/* Header */}
      <div className="company-task-header" style={{
        background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <CompanyLogo logo={task.companyLogo} name={task.company} size={50} style={{ background: task.companyColor || 'var(--primary)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{task.title}</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 }}>
            🏢 {task.company} · 📍 {task.location} · {task.stipend}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '5px 16px', color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
          🗓 Deadline: {task.deadline}
        </div>
      </div>

      {/* Stage tabs */}
      <div className="company-task-stages" role="tablist" aria-label="Interview task stages" style={{ display: 'flex', gap: 4, background: 'var(--white)', borderRadius: 10, padding: 5, border: '1px solid var(--border)', marginBottom: 20, width: 'fit-content' }}>
        {TASK_STAGES.map(s => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={stage === s.key}
            onClick={() => setStage(s.key)}
            style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 18px', borderRadius: 7, border: 'none',
            background: stage === s.key ? 'var(--primary)' : 'transparent',
            color: stage === s.key ? 'white' : 'var(--muted)',
            fontWeight: stage === s.key ? 700 : 500,
            fontSize: 13, cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">{s.icon}</span>
            {s.label}
            {s.key === 'submission' && submitted && <span aria-label="complete">✓</span>}
          </button>
        ))}
      </div>

      {assignmentError && (
        <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 14, color: '#991B1B', fontSize: 13, fontWeight: 700 }}>
          {assignmentError} Refresh the page or return to Opportunity to reopen an active invite.
        </div>
      )}

      {/* Brief tab */}
      {stage === 'brief' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: '#166534' }}>
            <strong>✓ You accepted this interview task.</strong> Complete the assignment below and submit the requested evidence. {task.company} will review your result.
          </div>

          <div className="company-task-card" style={{ background: 'var(--white)', borderRadius: 12, padding: '20px', border: '1px solid var(--border)' }}>
            <div className="company-task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 6 }}>{taskTitle}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{taskTypeLabel} · {taskPoints > 0 ? `${taskPoints} points` : 'Points not specified'}</div>
              </div>
              <div className="company-task-points" style={{ flexShrink: 0, background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 100 }}>
                Due {taskDeadline}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Instructions</div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--dark)', lineHeight: 1.7 }}>{taskInstructions}</div>
            {isWorkDelivery && reviewData?.workspace && <div className="student-workspace-notes">
              <details><summary>Project milestones ({reviewData.workspace.milestones.length})</summary>
                {reviewData.workspace.milestones.map(item => <p key={item.id}><strong>{item.title}</strong> · {item.dueDate} · {item.status}</p>)}
                {!reviewData.workspace.milestones.length && <p>No milestones yet.</p>}
              </details>
              <details><summary>Company updates ({reviewData.workspace.updates.length})</summary>
                {[...reviewData.workspace.updates].reverse().map(item => <p key={item.id}>{item.message} <time dateTime={item.sharedAt}>{item.sharedAt ? new Date(item.sharedAt).toLocaleDateString('en-IN') : ''}</time></p>)}
                {!reviewData.workspace.updates.length && <p>No updates yet.</p>}
              </details>
            </div>}
            {Object.entries(taskDetails).filter(([, value]) => value).length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {Object.entries(taskDetails).filter(([, value]) => value).map(([key, value]) => (
                  <div key={key} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, marginBottom: 4 }}>{TASK_DETAIL_LABELS[key] || key}</div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--dark)', lineHeight: 1.55 }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission tab */}
      {stage === 'submission' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLoading && (
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 13,
              color: '#1D4ED8',
              fontWeight: 700,
            }}>
              Loading task submission...
            </div>
          )}
          {submitted ? (
            <div style={{
              background: currentStatusMeta.bg, border: `1.5px solid ${currentStatusMeta.color}`, borderRadius: 14,
              padding: '32px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: currentStatusMeta.color, marginBottom: 6 }}>{currentStatusMeta.title}</div>
              <div style={{ fontSize: 13, color: currentStatusMeta.color, marginBottom: 10 }}>
                {currentStatusMeta.copy}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, background: 'white', color: currentStatusMeta.color, borderRadius: 100, display: 'inline-block', padding: '4px 10px', border: `1px solid ${currentStatusMeta.color}`, marginBottom: 16 }}>
                {currentStatusMeta.badge}
              </div>
              {submissionLink && <div style={{ fontSize: 12, color: 'var(--muted)', background: 'white', borderRadius: 8, padding: '8px 14px', display: 'inline-block', border: '1px solid var(--border)', wordBreak: 'break-word' }}>
                🔗 {submissionLink}
              </div>}
              {submissionContent && <div style={{ fontSize: 12, color: 'var(--muted)', background: 'white', borderRadius: 8, padding: '8px 14px', marginTop: submissionLink ? 8 : 0, textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid var(--border)' }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>Response</strong>{submissionContent}
              </div>}
              {submissionStatus === 'selected' && <div style={{ marginTop: 14 }}>
                <button
                  onClick={handleStartWork}
                  disabled={isLoading || Boolean(assignmentError)}
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  {isLoading ? 'Starting...' : 'Start GIG Work'}
                </button>
              </div>}
              {['submitted', 'needs_revision', 'work_started'].includes(submissionStatus) && <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  {submissionStatus === 'work_started' ? 'Submit GIG Work' : submissionStatus === 'needs_revision' ? 'Update Submission' : 'Edit Submission'}
                </button>
              </div>}
            </div>
          ) : (
            <>
              <div className="company-task-submission-panel" style={{ background: 'var(--white)', borderRadius: 12, padding: '20px 22px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 14 }}>Submit Your Work</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{needsLink ? 'GitHub / Drive / Portfolio Link *' : 'Reference Link (optional)'}</label>
                    <input
                      placeholder={needsLink ? 'https://github.com/yourname/project' : 'https://example.com (optional)'}
                      value={submissionLink}
                      onChange={e => setSubmissionLink(e.target.value)}
                      maxLength={500}
                      required={needsLink}
                      aria-label={needsLink ? 'Submission link' : 'Reference link'}
                      disabled={isLoading}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  {allowsWrittenResponse && <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{responseLabel}</label>
                    <textarea
                      placeholder={responsePlaceholder}
                      value={submissionContent}
                      onChange={e => setSubmissionContent(e.target.value)}
                      maxLength={10000}
                      aria-label="Task response"
                      disabled={isLoading}
                      rows={7}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Additional Note (optional)</label>
                    <textarea
                      placeholder="Any context or notes for the company..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      maxLength={2000}
                      aria-label="Additional note"
                      disabled={isLoading}
                      rows={4}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn-primary"
                    disabled={(!submissionLink.trim() && !submissionContent.trim()) || isLoading || Boolean(assignmentError)}
                    style={{ padding: '10px 24px', fontSize: 14, alignSelf: 'flex-start', opacity: (submissionLink.trim() || submissionContent.trim()) && !isLoading && !assignmentError ? 1 : 0.5, cursor: (submissionLink.trim() || submissionContent.trim()) && !isLoading && !assignmentError ? 'pointer' : 'not-allowed' }}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Work →'}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -4 }}>
                    {submissionLink.length}/500 link characters · {submissionContent.length}/10,000 response characters · {note.length}/2,000 note characters
                  </div>
                  {draftNotice && <p role="status" className="work-muted">{draftNotice}</p>}
                  {submitError && (
                    <div role="alert" style={{ fontSize: 12, color: '#B91C1C', fontWeight: 700 }}>
                      {submitError}
                    </div>
                  )}
                  {submissionNotice && (
                    <div role="status" style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>
                      {submissionNotice}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Feedback tab */}
      {stage === 'feedback' && (
        submitted ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="company-task-feedback-card" style={{
              background: currentStatusMeta.bg,
              border: `1px solid ${currentStatusMeta.color}`,
              borderRadius: 12,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: currentStatusMeta.color }}>{currentStatusMeta.badge}</div>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'white', color: currentStatusMeta.color, padding: '3px 8px', borderRadius: 100, border: `1px solid ${currentStatusMeta.color}` }}>
                  Shared with {task.company}
                </span>
              </div>
              <div style={{ fontSize: 13, color: currentStatusMeta.color, lineHeight: 1.6 }}>
                {feedback || `Once ${task.company} reviews your work, their feedback will appear here.`}
                {reviewData?.score != null && <p>Score: {reviewData.score} / {taskPoints}</p>}
                {reviewData?.externalPayment && <div><p>External payment recorded by {task.company}: INR {reviewData.externalPayment.amount}</p><p>Reference: {reviewData.externalPayment.reference}</p><p>Payment date: {reviewData.externalPayment.paidOn}</p><p>This is a company-reported record, not a payment processed or verified by SkillBridge.</p></div>}
              </div>
            </div>

            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>Latest submission</div>
              {submissionLink && <><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Link</div><div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600, marginBottom: 14, wordBreak: 'break-word' }}>{submissionLink}</div></>}
              {submissionContent && <><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Response</div><div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{submissionContent}</div></>}
              {note && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Your note</div>
                  <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.6 }}>{note}</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '40vh', gap: 14, color: 'var(--muted)',
          }}>
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--dark)' }}>Submit your task first</div>
            <div style={{ fontSize: 13 }}>Once your work is submitted, company feedback will appear here.</div>
          </div>
        )
      )}
    </div>
  )
}
