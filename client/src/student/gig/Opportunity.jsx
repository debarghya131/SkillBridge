import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CompanyLogo from '../../ui/CompanyLogo'

const TYPE_META = {
  Internship: { bg: '#EFF6FF', color: '#1D4ED8' },
  'Part-Time GIG': { bg: '#F3E8FF', color: '#7C3AED' },
  'Project GIG': { bg: '#D1FAE5', color: '#065F46' },
}
const TASK_TYPE_LABELS = {
  live_project: 'Live Project Assignment',
  code: 'Code',
  mcq: 'MCQ',
  written: 'Written',
  mixed: 'Mixed',
  design: 'Design Challenge',
  data_analysis: 'Data Analysis',
  case_study: 'Case Study',
}
const TASK_STATUS_META = {
  reviewed: {
    badge: '📝 Reviewed',
    bg: '#EDE9FE',
    color: '#6D28D9',
    copy: 'Your interview task was reviewed. Open the task page to see the latest notes.',
  },
  submitted: {
    badge: '📤 Submitted',
    bg: '#EDE9FE',
    color: '#6D28D9',
    copy: 'Your task was submitted and is waiting for company review.',
  },
  selected: {
    badge: '🎉 Selected',
    bg: '#D1FAE5',
    color: '#065F46',
    copy: 'You were selected. Complete the GIG work and submit the deliverable.',
  },
  work_started: {
    badge: '🚀 Work Started',
    bg: '#EDE9FE',
    color: '#6D28D9',
    copy: 'The company marked the GIG as started. Submit your completed work when ready.',
  },
  delivered: {
    badge: '📦 Work Delivered',
    bg: '#DBEAFE',
    color: '#1D4ED8',
    copy: 'Your completed work is with the company for review.',
  },
  approved: {
    badge: '✅ Approved',
    bg: '#D1FAE5',
    color: '#065F46',
    copy: 'Your work was approved. The company has not recorded an external payment yet.',
  },
  completed: {
    badge: '✓ Completed',
    bg: '#D1FAE5',
    color: '#065F46',
    copy: 'The GIG is complete. Check Earning for company-reported external payment records.',
  },
  rejected: {
    badge: '✕ Not Selected',
    bg: '#FEE2E2',
    color: '#B91C1C',
    copy: 'The company did not select this interview submission. Open the result to review its feedback.',
  },
  needs_revision: {
    badge: '🔁 Needs Revision',
    bg: '#FEF3C7',
    color: '#92400E',
    copy: 'The company requested changes to your interview submission. Review the feedback and resubmit it.',
  },
}

function isGigWorkStage(item) {
  return ['selected', 'work_started', 'delivered', 'approved', 'completed'].includes(item.taskSubmissionStatus)
    || (item.taskSubmissionStatus === 'needs_revision' && item.revisionReturnStatus === 'delivered')
}

function interviewActionLabel(status) {
  if (status === 'rejected') return 'View interview result'
  if (status === 'needs_revision') return 'Revise interview task'
  if (['submitted', 'reviewed'].includes(status)) return 'View interview submission'
  return 'Open interview task'
}

export default function Opportunity({
  opportunities = [],
  onAcceptOpportunity = async () => {},
  onDeclineOpportunity = () => {},
  onViewCompany = () => {},
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(null)
  const [pendingAccept, setPendingAccept] = useState(null)
  const [accepting, setAccepting] = useState(false)

  const toggle = (id) => setExpanded(current => current === id ? null : id)
  const visibleOpportunities = opportunities.filter(item => (
    item.status !== 'declined'
    && !isGigWorkStage(item)
  ))
  const newCount = visibleOpportunities.filter(item => item.status !== 'accepted').length

  async function confirmAccept() {
    if (!pendingAccept || accepting) return
    setAccepting(true)
    try {
      const opportunity = pendingAccept
      const didAccept = await onAcceptOpportunity(opportunity)
      if (didAccept === false) return
      setPendingAccept(null)
      setExpanded(null)
      navigate('/student/task', {
        state: {
          taskType: 'company-interview',
          opportunity: { ...opportunity, status: 'accepted' },
          showIntegrityWarning: true,
          returnSection: 'gig',
        },
      })
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div>
      <div className="responsive-stack opportunity-intro" style={{
        background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
        borderRadius: 14, padding: '16px 22px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ fontSize: 28 }}>📬</div>
        <div>
          <div className="opportunity-intro-title" style={{ color: 'white', fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Invitations and interview results</div>
          <div className="opportunity-intro-copy" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            Accept new invitations, track interview reviews, and respond when a company requests a revision.
          </div>
        </div>
        <div className="responsive-opportunity-badge" style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '5px 14px', color: 'white', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
          {newCount} New
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visibleOpportunities.map(item => {
          const isExpanded = expanded === item.id
          const isAccepted = item.status === 'accepted'
          const typeMeta = TYPE_META[item.type] || { bg: 'var(--bg)', color: 'var(--muted)' }
          const taskStatusMeta = item.taskSubmissionStatus ? TASK_STATUS_META[item.taskSubmissionStatus] : null
          const canOpenTask = isAccepted && !isGigWorkStage(item)
          const cardTone = item.taskSubmissionStatus === 'rejected' ? '#EF4444'
            : item.taskSubmissionStatus === 'needs_revision' ? '#F59E0B'
              : isAccepted ? '#10B981' : 'var(--border)'
          const deadlineLabel = /review/i.test(item.deadline || '') ? 'Review window' : 'Deadline'

          return (
            <div key={item.id} className="opportunity-card" style={{
              background: 'var(--white)', borderRadius: 14,
              border: `1.5px solid ${cardTone}`,
              boxShadow: 'none',
              overflow: 'hidden', transition: 'all 0.2s',
            }}>
              <div className="responsive-stack opportunity-card-header" style={{ padding: '16px 20px 12px', display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) minmax(150px, auto)', alignItems: 'start', gap: 14 }}>
                <CompanyLogo logo={item.companyLogo} name={item.company || item.companyInitial} size={44} style={{ background: item.companyColor || undefined }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{item.title}</span>
                    {item.demoData && <span className="demo-data-badge">Demo</span>}
                    <span style={{ fontSize: 11, fontWeight: 700, background: typeMeta.bg, color: typeMeta.color, padding: '2px 9px', borderRadius: 100 }}>{item.type}</span>
                    {item.source === 'direct_invite' && <span style={{ fontSize: 11, fontWeight: 700, background: '#DBEAFE', color: '#1D4ED8', padding: '2px 9px', borderRadius: 100 }}>Direct invite</span>}
                    {item.source === 'application_invite' && <span style={{ fontSize: 11, fontWeight: 700, background: '#f3e8ff', color: '#7c3aed', padding: '2px 9px', borderRadius: 100 }}>Applied through Browse GIGs</span>}
                    {isAccepted && !['rejected', 'needs_revision'].includes(item.taskSubmissionStatus) && <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '2px 9px', borderRadius: 100 }}>✓ Invitation accepted</span>}
                    {taskStatusMeta && <span style={{ fontSize: 11, fontWeight: 700, background: taskStatusMeta.bg, color: taskStatusMeta.color, padding: '2px 9px', borderRadius: 100 }}>{taskStatusMeta.badge}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                    🏢 {item.company} · 📍 {item.location} · 🕐 Sent {item.sentOn}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(Array.isArray(item.matchedSkills) ? item.matchedSkills : []).map(skill => (
                      <span key={skill} style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 9px', borderRadius: 100 }}>
                        ✓ {skill}
                      </span>
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>{item.matchSummary || (item.matchedSkills?.length ? 'matched your profile' : 'profile reviewed by company')}</span>
                  </div>
                  <div style={{ marginTop: 9, padding: '8px 10px', borderRadius: 8, background: '#F8FAFC', color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 }}>
                    {item.source === 'direct_invite'
                      ? `${item.company} found your profile and invited you directly to an interview task.`
                      : `${item.company} reviewed your Browse GIG application and invited you to the next step.`}
                  </div>
                </div>

                <div className="responsive-opportunity-meta opportunity-card-meta" style={{ textAlign: 'right', minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{item.stipend || 'Compensation not specified'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{deadlineLabel}: {item.deadline || 'Not specified'}</div>
                  {item.duration && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.duration}</div>}
                </div>
              </div>

              <div style={{ padding: '0 20px 16px' }}>
                {isExpanded && (
                  <div style={{
                    background: '#F8FAFF', borderRadius: 10, padding: '12px 14px', marginBottom: 12,
                    border: '1px solid var(--border)', fontSize: 13, color: 'var(--dark)', lineHeight: 1.6,
                  }}>
                    {item.taskTitle && (
                      <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>Interview task</div>
                        <div style={{ fontWeight: 800, marginBottom: 3 }}>{item.taskTitle}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {TASK_TYPE_LABELS[item.taskType] || 'Mixed'} · Due {item.taskDeadline || item.deadline || 'Not set'} · {Number(item.taskPoints) > 0 ? `${item.taskPoints} points` : 'Points not specified'}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Message from {item.company}
                    </div>
                    "{item.message}"
                  </div>
                )}

                <div className={`responsive-opportunity-actions opportunity-card-actions${!isAccepted ? ' opportunity-pending-actions' : ''}`} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {!isAccepted ? (
                    <button onClick={() => setPendingAccept(item)} className="btn-primary" style={{ padding: '8px 15px', fontSize: 13 }}>
                      Accept and open task
                    </button>
                  ) : (
                    <div className="opportunity-accepted-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: taskStatusMeta ? taskStatusMeta.color : '#059669', fontWeight: 750 }}>
                          {taskStatusMeta ? taskStatusMeta.copy : 'Accepted. Your interview task is ready when you are.'}
                        </div>
                        {item.companyFeedback && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>Feedback: {item.companyFeedback}</div>}
                      </div>
                      <div className="opportunity-action-buttons" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => onViewCompany(item)}
                        style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
                      >
                        View Company
                      </button>
                      {canOpenTask ? (
                        <button
                          type="button"
                          onClick={() => {
                            setExpanded(null)
                            navigate('/student/task', {
                              state: {
                                taskType: 'company-interview',
                                opportunity: item,
                                showIntegrityWarning: false,
                                returnSection: 'gig',
                              },
                            })
                          }}
                          className="btn-primary"
                          style={{ padding: '7px 14px', fontSize: 13 }}
                        >
                          {interviewActionLabel(item.taskSubmissionStatus)}
                        </button>
                      ) : null}
                      <button
                        onClick={() => toggle(item.id)}
                        className="responsive-opportunity-message-button"
                        style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 8, cursor: 'pointer' }}
                      >
                        {isExpanded ? 'Hide message' : 'Read message'}
                      </button>
                      </div>
                    </div>
                  )}
                  {!isAccepted && <div className="opportunity-action-buttons opportunity-pending-buttons" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => onViewCompany(item)} style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>View Company</button>
                    <button onClick={() => toggle(item.id)} className="responsive-opportunity-message-button" style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 8, cursor: 'pointer' }}>{isExpanded ? 'Hide message' : 'Read message'}</button>
                    <button onClick={() => onDeclineOpportunity(item)} style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>Decline</button>
                  </div>}
                </div>
              </div>
            </div>
          )
        })}

        {visibleOpportunities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
            No invitations or interview results are available yet.
          </div>
        )}
      </div>
      {pendingAccept && <div className="gig-integrity-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !accepting && setPendingAccept(null)}><section className="gig-integrity-modal" role="dialog" aria-modal="true" aria-labelledby="gig-integrity-title"><div className="gig-integrity-icon" aria-hidden="true">📩</div><h2 id="gig-integrity-title">Accept this interview invitation?</h2><p className="gig-integrity-note">Accepting unlocks the interview task from {pendingAccept.company}. You can review the task instructions and integrity requirements before submitting any work.</p><div className="gig-integrity-actions"><button type="button" className="btn-secondary" disabled={accepting} onClick={() => setPendingAccept(null)}>Cancel</button><button type="button" className="btn-primary" disabled={accepting} onClick={confirmAccept}>{accepting ? 'Accepting...' : 'Accept and open task'}</button></div></section></div>}
    </div>
  )
}
