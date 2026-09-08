import { useEffect, useMemo, useState } from 'react'
import Opportunity from './Opportunity'
import {
  acceptStudentOpportunity,
  applyStudentGig,
  declineStudentOpportunity,
  fetchPublicCompanyProfile,
  fetchStudentGigs,
  getStudentSessionToken,
  saveStudentGig,
  unsaveStudentGig,
} from '../studentApi'
import { buildDemoGigState } from './gigDemoData'
import { toast } from '../../ui/toast'

const GIG_SUBNAV = [
  { key: 'opportunity', label: 'Opportunity', icon: '🎯' },
  { key: 'browse', label: 'Browse GIGs', icon: '🔍' },
  { key: 'active', label: 'Active GIG', icon: '⚡' },
  { key: 'applied', label: 'Applied GIGs', icon: '📤' },
  { key: 'completed', label: 'Completed GIGs', icon: '✅' },
  { key: 'saved', label: 'Saved GIGs', icon: '🔖' },
]

function EmptyState({ icon, msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: 12 }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>{msg}</div>
    </div>
  )
}

function GigCard({ gig, isApplied, isSaved, onApply, onToggleSave, onViewCompany, showApply = false, showSave = false, status }) {
  const statusMeta = {
    active: { label: '⚡ In Progress', bg: '#D1FAE5', color: '#065F46' },
    applied: { label: '📤 Applied', bg: '#EFF6FF', color: '#1D4ED8' },
    reviewed: { label: '📝 Reviewed', bg: '#EDE9FE', color: '#6D28D9' },
    ready_to_hire: { label: '🎉 Ready to Hire', bg: '#D1FAE5', color: '#065F46' },
    needs_revision: { label: '🔁 Needs Revision', bg: '#FEF3C7', color: '#92400E' },
  }
  const resolvedStatus = typeof status === 'string' ? (statusMeta[status] || { label: status, bg: '#FEF9C3', color: '#854D0E' }) : null

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 12, padding: '18px 22px',
      border: '1px solid var(--border)', transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--primary)' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)', marginBottom: 3 }}>{gig.title}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            🏢 {gig.company} · 📍 {gig.location}
            {gig.workMode ? ` · ${gig.workMode}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>{gig.budget}</div>
          {gig.match ? <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>{gig.match}% match</div> : null}
          {gig.progress ? <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{gig.progress}</div> : null}
          {gig.completedOn ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>Done {gig.completedOn}</div> : null}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {gig.tags.map(tag => (
          <span key={tag} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>{tag}</span>
        ))}
        {gig.posted ? <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>🕐 {gig.posted}</span> : null}
      </div>
      {resolvedStatus ? (
        <div style={{ marginBottom: 10 }}>
          <span style={{
            padding: '3px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
            background: resolvedStatus.bg,
            color: resolvedStatus.color,
          }}>
            {resolvedStatus.label}
          </span>
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onViewCompany(gig)}
          style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          View Company
        </button>
        {showApply ? (
          <button onClick={() => onApply(gig.id)} className="btn-primary" style={{ padding: '7px 18px', fontSize: 13 }}
            disabled={isApplied}>
            {isApplied ? '✓ Applied' : 'Apply Now'}
          </button>
        ) : null}
        {showSave ? (
          <button onClick={() => onToggleSave(gig.id)} style={{
            padding: '7px 14px', borderRadius: 7, border: '1.5px solid var(--border)',
            background: isSaved ? 'var(--primary-light)' : 'var(--white)',
            color: isSaved ? 'var(--primary)' : 'var(--muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {isSaved ? '🔖 Saved' : '🔖 Save'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function CompanyDetailsModal({ gig, onClose }) {
  const [companyProfile, setCompanyProfile] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!gig?.company) {
      setCompanyProfile(null)
      return undefined
    }

    setIsLoadingProfile(true)
    fetchPublicCompanyProfile(gig.company)
      .then(result => {
        if (!cancelled) setCompanyProfile(result.companyProfile || null)
      })
      .catch(() => {
        if (!cancelled) setCompanyProfile(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false)
      })

    return () => {
      cancelled = true
    }
  }, [gig?.company])

  if (!gig) return null

  const displayCompany = companyProfile?.businessName || gig.company
  const displayLocation = companyProfile?.location || gig.location || 'Location not specified'
  const displayWorkModes = companyProfile?.workModes?.length > 0 ? companyProfile.workModes.join(' · ') : gig.workMode
  const displaySkills = companyProfile?.requiredSkills
    ? companyProfile.requiredSkills.split(',').map(item => item.trim()).filter(Boolean)
    : (gig.tags || [])

  return (
    <div
      className="responsive-modal-shell"
      role="dialog"
      aria-modal="true"
      aria-label={`${displayCompany} details`}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="responsive-modal-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--white)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '22px 24px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.78, marginBottom: 7 }}>Company details</div>
            <div style={{ fontSize: 22, fontWeight: 850, marginBottom: 4 }}>{displayCompany}</div>
            <div style={{ fontSize: 13, opacity: 0.82 }}>{displayLocation}{displayWorkModes ? ` · ${displayWorkModes}` : ''}</div>
          </div>
          <button type="button" aria-label="Close company details" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', color: 'white', border: '1px solid rgba(255,255,255,0.24)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>{gig.title}</div>
          <div className="responsive-card-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              ['Budget', gig.budget || 'Not specified'],
              ['Work mode', displayWorkModes || 'Not specified'],
              ['Posted', gig.posted || gig.postedOn || 'Recently'],
              ['Status', gig.progress || statusLabel(gig.status) || 'Open for applications'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Required skills</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
            {displaySkills.map(tag => <span key={tag} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>{tag}</span>)}
          </div>
          {isLoadingProfile && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Loading saved company profile...</div>}
          {companyProfile?.industry && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}><strong style={{ color: 'var(--dark)' }}>Industry:</strong> {companyProfile.industry}</div>}
          {companyProfile?.description && <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>{companyProfile.description}</div>}
          <button type="button" className="btn-primary" onClick={onClose} style={{ padding: '9px 16px', fontSize: 13 }}>Close Details</button>
        </div>
      </div>
    </div>
  )
}

function statusLabel(status) {
  return typeof status === 'string' ? status.replace(/_/g, ' ') : ''
}

export default function GigCenter() {
  const [sub, setSub] = useState('opportunity')
  const [isSubnavOpen, setIsSubnavOpen] = useState(false)
  const [gigState, setGigState] = useState(buildDemoGigState())
  const [selectedCompanyGig, setSelectedCompanyGig] = useState(null)
  const [sessionToken] = useState(() => getStudentSessionToken())

  useEffect(() => {
    let cancelled = false

    async function loadGigState() {
      if (!sessionToken) {
        return
      }

      try {
        const result = await fetchStudentGigs(sessionToken)

        if (!cancelled) {
          setGigState(result.gigState)
        }
      } catch (error) {
        // Keep demo fallback data in place if the backend fetch fails.
      }
    }

    loadGigState()

    return () => {
      cancelled = true
    }
  }, [sessionToken])

  const browseGigs = useMemo(() => gigState.browseGigs || [], [gigState.browseGigs])
  const opportunities = useMemo(() => gigState.opportunities || [], [gigState.opportunities])
  const savedGigIds = useMemo(() => gigState.savedGigIds || [], [gigState.savedGigIds])
  const appliedGigIds = useMemo(() => gigState.appliedGigIds || [], [gigState.appliedGigIds])
  const completedGigs = useMemo(() => gigState.completedGigs || [], [gigState.completedGigs])
  const activeGigBase = useMemo(() => gigState.activeGigBase || [], [gigState.activeGigBase])

  const savedGigs = useMemo(
    () => browseGigs.filter(gig => savedGigIds.includes(gig.id)),
    [browseGigs, savedGigIds],
  )

  const appliedGigs = useMemo(
    () => browseGigs.filter(gig => appliedGigIds.includes(gig.id)),
    [browseGigs, appliedGigIds],
  )

  const activeGigs = useMemo(() => activeGigBase, [activeGigBase])
  const activeSubnav = GIG_SUBNAV.find(item => item.key === sub) || GIG_SUBNAV[0]

  const syncGigState = async (updater, requestFn) => {
    if (!sessionToken) {
      setGigState(current => updater(current))
      return true
    }

    try {
      const result = await requestFn()
      setGigState(result.gigState)
      return true
    } catch (error) {
      return false
    }
  }

  const handleApply = async (gigId) => {
    const didSucceed = await syncGigState(
      current => current.appliedGigIds.includes(gigId)
        ? current
        : { ...current, appliedGigIds: [...current.appliedGigIds, gigId] },
      () => applyStudentGig(sessionToken, gigId),
    )

    if (didSucceed) {
      toast.success('GIG application submitted.', { title: 'Applied Successfully' })
    }
  }

  const handleToggleSave = async (gigId) => {
    const isSaved = savedGigIds.includes(gigId)

    const didSucceed = await syncGigState(
      current => ({
        ...current,
        savedGigIds: isSaved
          ? current.savedGigIds.filter(id => id !== gigId)
          : [...current.savedGigIds, gigId],
      }),
      () => isSaved ? unsaveStudentGig(sessionToken, gigId) : saveStudentGig(sessionToken, gigId),
    )

    if (didSucceed) {
      toast.info(isSaved ? 'Removed from Saved GIGs.' : 'Added to Saved GIGs.', {
        title: isSaved ? 'GIG Unsaved' : 'GIG Saved',
      })
    }
  }

  const handleAcceptOpportunity = async (opportunity) => {
    const didSucceed = await syncGigState(
      current => ({
        ...current,
        opportunities: current.opportunities.map(item => (
          item.id === opportunity.id ? { ...item, status: 'accepted' } : item
        )),
      }),
      () => acceptStudentOpportunity(sessionToken, opportunity.id),
    )

    if (didSucceed) {
      toast.success('Company invite accepted.', { title: 'Interview Task Unlocked' })
    }

    return didSucceed
  }

  const handleDeclineOpportunity = async (opportunity) => {
    const didSucceed = await syncGigState(
      current => ({
        ...current,
        opportunities: current.opportunities.map(item => (
          item.id === opportunity.id ? { ...item, status: 'declined' } : item
        )),
      }),
      () => declineStudentOpportunity(sessionToken, opportunity.id),
    )

    if (didSucceed) {
      toast.info('Invite declined successfully.', { title: 'Opportunity Updated' })
    }
  }

  return (
    <div>
      <div className="responsive-pill-nav responsive-pill-nav-menu gig-subnav" style={{ display: 'flex', gap: 4, background: 'var(--white)', borderRadius: 12, padding: 6, border: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="responsive-pill-nav-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{activeSubnav.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeSubnav.label}
            </span>
          </div>
          <button
            type="button"
            className="responsive-pill-nav-toggle"
            onClick={() => setIsSubnavOpen(open => !open)}
            aria-label="Toggle GIG navigation"
            aria-expanded={isSubnavOpen}
          >
            ☰
          </button>
        </div>

        <div className={`responsive-pill-nav-list${isSubnavOpen ? ' is-open' : ''}`}>
          {GIG_SUBNAV.map(item => (
          <button key={item.key} type="button" className={`gig-subnav-item${sub === item.key ? ' is-active' : ''}`} aria-pressed={sub === item.key} onClick={() => {
            setSub(item.key)
            setIsSubnavOpen(false)
          }} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: sub === item.key ? 'var(--primary)' : 'transparent',
            color: sub === item.key ? 'white' : 'var(--muted)',
            fontWeight: sub === item.key ? 700 : 500,
            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (sub !== item.key) e.currentTarget.style.background = 'var(--bg)' }}
          onMouseLeave={e => { if (sub !== item.key) e.currentTarget.style.background = 'transparent' }}>
            {item.icon} {item.label}
            {item.key === 'applied' && appliedGigs.length > 0 ? (
              <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 100, padding: '0 6px', fontSize: 11, fontWeight: 800 }}>{appliedGigs.length}</span>
            ) : null}
            {item.key === 'saved' && savedGigs.length > 0 ? (
              <span style={{ background: sub === 'saved' ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)', color: sub === 'saved' ? 'white' : 'var(--primary)', borderRadius: 100, padding: '0 6px', fontSize: 11, fontWeight: 800 }}>{savedGigs.length}</span>
            ) : null}
          </button>
        ))}
        </div>
      </div>

      {sub === 'browse' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{browseGigs.length} GIGs available for you</div>
          {browseGigs.map(gig => (
            <GigCard
              key={gig.id}
              gig={gig}
              showApply
              showSave
              isApplied={appliedGigIds.includes(gig.id)}
              isSaved={savedGigIds.includes(gig.id)}
              onApply={handleApply}
              onToggleSave={handleToggleSave}
              onViewCompany={setSelectedCompanyGig}
            />
          ))}
        </div>
      ) : null}

      {sub === 'applied' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {appliedGigs.length > 0
            ? appliedGigs.map(gig => (
              <GigCard
                key={gig.id}
                gig={gig}
                status="applied"
                isApplied
                isSaved={savedGigIds.includes(gig.id)}
                onApply={handleApply}
                onToggleSave={handleToggleSave}
                onViewCompany={setSelectedCompanyGig}
              />
            ))
            : <EmptyState icon="📤" msg="You haven't applied to any GIGs yet. Browse and apply!" />}
        </div>
      ) : null}

      {sub === 'active' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeGigs.length > 0
            ? activeGigs.map(gig => (
              <GigCard
                key={gig.id}
                gig={gig}
                status={gig.bridgeStatus || 'active'}
                isApplied={appliedGigIds.includes(gig.id)}
                isSaved={savedGigIds.includes(gig.id)}
                onApply={handleApply}
                onToggleSave={handleToggleSave}
                onViewCompany={setSelectedCompanyGig}
              />
            ))
            : <EmptyState icon="⚡" msg="No active GIGs right now. Apply to get started!" />}
        </div>
      ) : null}

      {sub === 'completed' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {completedGigs.map(gig => (
            <GigCard
              key={gig.id}
              gig={gig}
              isApplied={appliedGigIds.includes(gig.id)}
              isSaved={savedGigIds.includes(gig.id)}
              onApply={handleApply}
              onToggleSave={handleToggleSave}
              onViewCompany={setSelectedCompanyGig}
            />
          ))}
        </div>
      ) : null}

      {sub === 'saved' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {savedGigs.length > 0
            ? savedGigs.map(gig => (
              <GigCard
                key={gig.id}
                gig={gig}
                showApply
                showSave
                isApplied={appliedGigIds.includes(gig.id)}
                isSaved
                onApply={handleApply}
                onToggleSave={handleToggleSave}
                onViewCompany={setSelectedCompanyGig}
              />
            ))
            : <EmptyState icon="🔖" msg="No saved GIGs yet. Save GIGs from Browse to find them here!" />}
        </div>
      ) : null}

      {sub === 'opportunity' ? (
        <Opportunity
          opportunities={opportunities}
          onAcceptOpportunity={handleAcceptOpportunity}
          onDeclineOpportunity={handleDeclineOpportunity}
        />
      ) : null}

      <CompanyDetailsModal gig={selectedCompanyGig} onClose={() => setSelectedCompanyGig(null)} />
    </div>
  )
}
