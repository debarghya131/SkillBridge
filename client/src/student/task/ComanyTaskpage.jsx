import { useEffect, useState } from 'react'
import {
  fetchStudentCompanyInterviewTask,
  getStudentSessionToken,
  submitStudentCompanyInterviewTask,
} from '../studentApi'
import { toast } from '../../ui/toast'

const TASK_STAGES = [
  { key: 'brief', label: 'Brief', icon: '📋' },
  { key: 'submission', label: 'Submission', icon: '📤' },
  { key: 'feedback', label: 'Feedback', icon: '💬' },
]

export default function CompanyTaskpage({ opportunity }) {
  const [stage, setStage] = useState('brief')
  const [submissionLink, setSubmissionLink] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [note, setNote] = useState('')
  const [submissionStatus, setSubmissionStatus] = useState('submitted')
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submissionNotice, setSubmissionNotice] = useState('')
  const [serverAssignment, setServerAssignment] = useState(null)
  const [assignmentError, setAssignmentError] = useState('')

  useEffect(() => {
    let cancelled = false
    const token = getStudentSessionToken()

    setSubmissionLink('')
    setSubmitted(false)
    setNote('')
    setSubmissionStatus('submitted')
    setFeedback('')
    setSubmitError('')
    setSubmissionNotice('')
    setServerAssignment(null)
    setAssignmentError('')
    setIsLoading(false)

    if (!opportunity || !token) {
      return () => {
        cancelled = true
      }
    }

    async function loadSubmission() {
      setIsLoading(true)

      try {
        const result = await fetchStudentCompanyInterviewTask(token, {
          opportunityId: opportunity.id,
          gigTitle: opportunity.title,
        })

        if (cancelled || !result.taskSubmission) {
          if (!cancelled && result.taskAssignment) {
            setServerAssignment(result.taskAssignment)
          }
          return
        }

        if (result.taskAssignment) {
          setServerAssignment(result.taskAssignment)
        }
        setSubmissionLink(result.taskSubmission.submissionLink || '')
        setNote(result.taskSubmission.note || '')
        setSubmitted(true)
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
  }, [opportunity])

  if (!opportunity) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 14 }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <div style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 500 }}>No task assigned yet. Accept an invite from Opportunity tab.</div>
      </div>
    )
  }

  const task = serverAssignment ? { ...opportunity, ...serverAssignment } : opportunity
  const matchedSkills = Array.isArray(task.matchedSkills) && task.matchedSkills.length > 0
    ? task.matchedSkills
    : ['core skills']
  const primarySkill = matchedSkills[0]
  const secondarySkill = matchedSkills[1] || primarySkill
  const tasks = [
    { id: 1, title: `Build a sample ${primarySkill} project`, desc: `Create a small demo project showcasing your ${primarySkill} skills. It should be functional, well-structured, and hosted on GitHub.`, points: 40, required: true },
    { id: 2, title: 'Submit a short intro video (60–90 sec)', desc: 'Record a 60–90 second video introducing yourself, your background, and why you are a good fit for this role.', points: 30, required: true },
    { id: 3, title: `Write a brief on your ${secondarySkill} experience`, desc: 'Write 150–200 words about a real project or situation where you applied this skill.', points: 20, required: false },
    { id: 4, title: 'Share portfolio or relevant links', desc: 'Provide links to your GitHub, portfolio, or any relevant work that demonstrates your abilities.', points: 10, required: false },
  ]

  const statusMeta = {
    submitted: {
      badge: 'Submitted',
      bg: '#EDE9FE',
      color: '#6D28D9',
      title: 'Submission Received!',
      copy: `${task.company} has been notified. Expect a response within 5–7 business days.`,
    },
    reviewed: {
      badge: 'Reviewed',
      bg: '#DBEAFE',
      color: '#1D4ED8',
      title: 'Company Review Added',
      copy: `${task.company} reviewed your task. Check the feedback tab for their notes.`,
    },
    ready_to_hire: {
      badge: 'Ready to Hire',
      bg: '#D1FAE5',
      color: '#065F46',
      title: 'You Moved Forward',
      copy: `${task.company} marked this submission as ready to hire.`,
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
    const normalizedLink = submissionLink.trim()
    if (!normalizedLink) {
      setSubmitError('Add a public http:// or https:// link before submitting.')
      return
    }

    try {
      const parsedLink = new URL(normalizedLink)
      if (!['http:', 'https:'].includes(parsedLink.protocol)) {
        throw new Error('invalid protocol')
      }
    } catch {
      setSubmitError('Use a valid public http:// or https:// link.')
      return
    }

    if (note.length > 2000) {
      setSubmitError('Keep your note under 2,000 characters.')
      return
    }

    const token = getStudentSessionToken()
    setSubmitError('')
    setSubmissionNotice('')

    if (!token) {
      setSubmitted(true)
      setSubmissionStatus('submitted')
      setFeedback('')
      setSubmissionNotice('Saved in demo mode. Sign in to make this submission visible to the company.')
      toast.info('Saved in demo mode only.', { title: 'Submission Not Synced' })
      return
    }

    setIsLoading(true)

    try {
      const result = await submitStudentCompanyInterviewTask(token, {
        opportunityId: task.id,
        gigTitle: task.title,
        submissionLink: normalizedLink,
        note,
      })

      setSubmitted(true)
      setSubmissionLink(normalizedLink)
      setSubmissionStatus(result.taskSubmission?.status || 'submitted')
      setFeedback(result.taskSubmission?.feedback || '')
      setSubmissionNotice('Your submission is now linked to the company review queue.')
      toast.success('Interview task submitted successfully.', { title: 'Submission Sent' })
    } catch (error) {
      setSubmitError(error.message || 'Could not submit your work right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="company-task-page">
      {/* Header */}
      <div className="company-task-header" style={{
        background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: 12, flexShrink: 0,
          background: task.companyColor || 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 900, fontSize: 20,
        }}>
          {task.companyInitial || task.company?.charAt(0) || 'C'}
        </div>
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
          <div style={{
            background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12,
            padding: '14px 18px', fontSize: 13, color: '#166534',
          }}>
            <strong>🎉 You accepted this invite!</strong> Complete the tasks below and submit your work. {task.company} will review and get back to you within 5–7 days.
          </div>

          {tasks.map(task => (
            <div key={task.id} className="company-task-card" style={{
              background: 'var(--white)', borderRadius: 12, padding: '18px 20px',
              border: '1px solid var(--border)',
            }}>
              <div className="company-task-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div className="company-task-row-main" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 13, marginTop: 1,
                  }}>{task.id}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', marginBottom: 4 }}>
                      {task.title}
                      {task.required && <span style={{ marginLeft: 8, fontSize: 11, background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>Required</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{task.desc}</div>
                  </div>
                </div>
                <div className="company-task-points" style={{ flexShrink: 0, background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100, marginLeft: 12 }}>
                  +{task.points} pts
                </div>
              </div>
            </div>
          ))}
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
              <div style={{ fontSize: 12, color: 'var(--muted)', background: 'white', borderRadius: 8, padding: '8px 14px', display: 'inline-block', border: '1px solid var(--border)' }}>
                🔗 {submissionLink}
              </div>
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  {submissionStatus === 'needs_revision' ? 'Update Submission' : 'Edit Submission'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="company-task-submission-panel" style={{ background: 'var(--white)', borderRadius: 12, padding: '20px 22px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 14 }}>Submit Your Work</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>GitHub / Drive / Portfolio Link *</label>
                    <input
                      placeholder="https://github.com/yourname/project"
                      value={submissionLink}
                      onChange={e => setSubmissionLink(e.target.value)}
                      maxLength={500}
                      required
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Additional Note (optional)</label>
                    <textarea
                      placeholder="Any context or notes for the company..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      maxLength={2000}
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
                    disabled={!submissionLink.trim() || isLoading || Boolean(assignmentError)}
                    style={{ padding: '10px 24px', fontSize: 14, alignSelf: 'flex-start', opacity: submissionLink.trim() && !isLoading && !assignmentError ? 1 : 0.5, cursor: submissionLink.trim() && !isLoading && !assignmentError ? 'pointer' : 'not-allowed' }}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Work →'}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -4 }}>
                    {submissionLink.length}/500 link characters · {note.length}/2,000 note characters
                  </div>
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
              </div>
            </div>

            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>Latest submission</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Link</div>
              <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600, marginBottom: 14, wordBreak: 'break-word' }}>{submissionLink}</div>
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
