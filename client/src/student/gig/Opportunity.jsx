import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ACTION_WARNING = 'AI can detect cheating. Copy-paste, no typing, very fast typing, tab switching, idle-then-submit, same answers, multiple logins, rapid submissions, DevTools, and camera signals can reduce your TrustScore.'

const TYPE_META = {
  Internship: { bg: '#EFF6FF', color: '#1D4ED8' },
  'Part-Time GIG': { bg: '#F3E8FF', color: '#7C3AED' },
  'Project GIG': { bg: '#D1FAE5', color: '#065F46' },
}
const TASK_STATUS_META = {
  reviewed: {
    badge: '📝 Reviewed',
    bg: '#EDE9FE',
    color: '#6D28D9',
    copy: 'Your interview task was reviewed. Open the task page to see the latest notes.',
  },
  ready_to_hire: {
    badge: '🎉 Ready to Hire',
    bg: '#D1FAE5',
    color: '#065F46',
    copy: 'You moved forward in the company pipeline. Check your Active GIG tab for the next step.',
  },
  needs_revision: {
    badge: '🔁 Needs Revision',
    bg: '#FEF3C7',
    color: '#92400E',
    copy: 'The company asked for an updated submission. Open the task page to revise your work.',
  },
}

export default function Opportunity({
  opportunities = [],
  onAcceptOpportunity = async () => {},
  onDeclineOpportunity = () => {},
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(null)

  const toggle = (id) => setExpanded(current => current === id ? null : id)
  const visibleOpportunities = opportunities.filter(item => item.status !== 'declined')
  const newCount = visibleOpportunities.filter(item => item.status !== 'accepted').length

  return (
    <div>
      <div className="responsive-stack" style={{
        background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
        borderRadius: 14, padding: '16px 22px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ fontSize: 28 }}>📬</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Direct Invites from Companies</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            These companies personally reviewed your SkillBridge profile and chose to reach out to you.
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

          return (
            <div key={item.id} style={{
              background: 'var(--white)', borderRadius: 14,
              border: isAccepted ? '1.5px solid #10B981' : '1px solid var(--border)',
              boxShadow: isAccepted ? '0 0 0 3px #D1FAE5' : 'none',
              overflow: 'hidden', transition: 'all 0.2s',
            }}>
              <div className="responsive-stack" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: item.companyColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 900, fontSize: 18,
                }}>
                  {item.companyInitial}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{item.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: typeMeta.bg, color: typeMeta.color, padding: '2px 9px', borderRadius: 100 }}>{item.type}</span>
                    {isAccepted && <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '2px 9px', borderRadius: 100 }}>✓ Accepted</span>}
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
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>matched your profile</span>
                  </div>
                </div>

                <div className="responsive-opportunity-meta" style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{item.stipend}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>⏳ Deadline: {item.deadline}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>📅 {item.duration}</div>
                </div>
              </div>

              <div style={{ padding: '0 20px 14px 20px' }}>
                {isExpanded && (
                  <div style={{
                    background: '#F8FAFF', borderRadius: 10, padding: '12px 14px', marginBottom: 12,
                    border: '1px solid var(--border)', fontSize: 13, color: 'var(--dark)', lineHeight: 1.6,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Message from {item.company}
                    </div>
                    "{item.message}"
                  </div>
                )}

                <div className="responsive-opportunity-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {!isAccepted ? (
                    <>
                      <button
                        onClick={async () => {
                          const didAccept = await onAcceptOpportunity(item)
                          if (didAccept === false) {
                            return
                          }
                          setExpanded(null)
                          navigate('/student/task', {
                            state: {
                              taskType: 'company-interview',
                              opportunity: item,
                              showIntegrityWarning: true,
                              returnSection: 'gig',
                            },
                          })
                        }}
                        className="btn-primary"
                        style={{ padding: '7px 18px', fontSize: 13 }}
                      >
                        Accept for Interview Task
                      </button>
                      <button
                        onClick={() => onDeclineOpportunity(item)}
                        style={{
                          padding: '7px 14px', fontSize: 13, fontWeight: 600,
                          background: 'var(--bg)', color: 'var(--muted)',
                          border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                      <div style={{ width: '100%', fontSize: 11, fontWeight: 700, color: '#B91C1C', lineHeight: 1.5 }}>
                        {ACTION_WARNING}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, color: taskStatusMeta ? taskStatusMeta.color : '#10B981', fontWeight: 700 }}>
                        {taskStatusMeta ? taskStatusMeta.copy : '✓ You accepted this invite — company will contact you shortly'}
                      </span>
                      {item.companyFeedback ? (
                        <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                          Feedback: {item.companyFeedback}
                        </span>
                      ) : null}
                    </div>
                  )}
                  <button
                    onClick={() => toggle(item.id)}
                    className="responsive-opportunity-message-button"
                    style={{
                      marginLeft: 'auto', padding: '7px 14px', fontSize: 12, fontWeight: 600,
                      background: 'none', color: 'var(--primary)',
                      border: '1px solid var(--primary)', borderRadius: 8, cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? 'Hide Message ▲' : 'Read Message ▼'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {visibleOpportunities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
            No pending invites. Check back later for new company outreach.
          </div>
        )}
      </div>
    </div>
  )
}
