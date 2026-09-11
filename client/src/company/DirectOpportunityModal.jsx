import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Send, X } from 'lucide-react'
import CompanyLogo from '../ui/CompanyLogo'
import { getCompanyTaskTypeLabel } from './companyTaskDefaults'

const OPEN_GIG_STATUSES = new Set(['hiring', 'reviewing', 'in progress'])

function indiaDay() {
  return new Date(Date.now() + (330 * 60 * 1000)).toISOString().slice(0, 10)
}

export default function DirectOpportunityModal({ profile, gigs, tasks, companyProfile, onClose, onSend, onOpenTaskCenter, onOpenGigManagement }) {
  const openGigs = useMemo(() => (gigs || []).filter(gig => OPEN_GIG_STATUSES.has(String(gig.status).toLowerCase())), [gigs])
  const activeTasks = useMemo(() => (tasks || []).filter(task => task.deadline && task.deadline >= indiaDay()), [tasks])
  const [gigId, setGigId] = useState(() => String(openGigs[0]?.id || ''))
  const [taskId, setTaskId] = useState(() => String(activeTasks[0]?.id || ''))
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !isSending) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isSending, onClose])

  const selectedGig = openGigs.find(gig => String(gig.id) === gigId)
  const selectedTask = activeTasks.find(task => String(task.id) === taskId)

  const submit = async event => {
    event.preventDefault()
    if (!selectedGig || !selectedTask || isSending) {
      setError('Choose an open GIG and an active saved task.')
      return
    }

    setIsSending(true)
    setError('')
    try {
      await onSend(profile, selectedGig, selectedTask, message.trim())
      onClose()
    } catch (sendError) {
      setError(sendError.message || 'The opportunity could not be sent.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={event => event.target === event.currentTarget && !isSending && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15, 23, 42, 0.58)', backdropFilter: 'blur(3px)' }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="direct-opportunity-title"
        onSubmit={submit}
        style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <CompanyLogo logo={profile.avatar} name={profile.name} size={46} style={{ borderRadius: '50%' }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div id="direct-opportunity-title" style={{ color: 'var(--dark)', fontSize: 17, fontWeight: 800 }}>Send opportunity to {profile.name}</div>
            <div style={{ marginTop: 3, color: 'var(--muted)', fontSize: 12 }}>{profile.location} · TrustScore {profile.score}</div>
          </div>
          <button type="button" title="Close" aria-label="Close opportunity dialog" onClick={onClose} disabled={isSending} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', cursor: 'pointer' }}><X size={17} /></button>
        </div>

        <fieldset disabled={isSending} style={{ margin: 0, padding: 20, border: 0, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 8, background: '#EFF6FF', color: '#1E40AF', fontSize: 12, lineHeight: 1.5 }}>
            <BriefcaseBusiness size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            The student will receive the role and assignment in Opportunity. After acceptance, this follows the normal GIG review, work, completion, payment, and TrustScore flow.
          </div>

          {openGigs.length > 0 ? (
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Open GIG *</span>
              <select value={gigId} onChange={event => setGigId(event.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', font: 'inherit', fontSize: 13 }}>
                {openGigs.map(gig => <option key={gig.id} value={gig.id}>{gig.title} · {gig.budget || 'Compensation not specified'}</option>)}
              </select>
            </label>
          ) : <div role="alert" style={{ padding: 12, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#991B1B', fontSize: 13 }}>Create or reopen a GIG before sending an opportunity. <button type="button" onClick={onOpenGigManagement} style={{ border: 0, padding: 0, background: 'transparent', color: '#4338CA', fontWeight: 800, cursor: 'pointer' }}>Open GIG Management</button></div>}

          {activeTasks.length > 0 ? (
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Saved assignment *</span>
              <select value={taskId} onChange={event => setTaskId(event.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', font: 'inherit', fontSize: 13 }}>
                {activeTasks.map(task => <option key={task.id} value={task.id}>{task.title} · {getCompanyTaskTypeLabel(task.type)}</option>)}
              </select>
            </label>
          ) : (
            <div style={{ padding: 12, borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFBEB', color: '#92400E', fontSize: 13 }}>
              No active saved assignments. <button type="button" onClick={onOpenTaskCenter} style={{ border: 0, padding: 0, background: 'transparent', color: '#4338CA', fontWeight: 800, cursor: 'pointer' }}>Create a task</button>
            </div>
          )}

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>Message (optional)</span>
            <textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={1000} rows={3} placeholder={`Tell ${profile.name} why this role is a good match.`} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical', borderRadius: 8, border: '1px solid var(--border)', font: 'inherit', fontSize: 13 }} />
            <span style={{ justifySelf: 'end', color: 'var(--muted)', fontSize: 11 }}>{message.length}/1000</span>
          </label>

          {selectedGig && selectedTask && (
            <div style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 12, lineHeight: 1.6 }}>
              <strong style={{ display: 'block', color: 'var(--dark)', fontSize: 13 }}>{selectedGig.title}</strong>
              <span style={{ color: 'var(--muted)' }}>{selectedGig.location || companyProfile?.location || 'Location not specified'} · {selectedGig.budget || 'Compensation not specified'}</span>
              <span style={{ display: 'block', color: 'var(--text)', marginTop: 5 }}>{selectedTask.title} · Due {selectedTask.deadline} · {selectedTask.points} points</span>
            </div>
          )}

          {error && <div role="alert" style={{ color: '#B91C1C', fontSize: 12, fontWeight: 700 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!selectedGig || !selectedTask || isSending} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Send size={15} /> {isSending ? 'Sending...' : 'Send opportunity'}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
