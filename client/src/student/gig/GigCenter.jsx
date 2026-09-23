import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import CompanyLogo from '../../ui/CompanyLogo'
import CompanyProfileModal from '../../ui/CompanyProfileModal'
import { readStudentSectionCache, writeStudentSectionCache } from '../sectionCache'

const GIG_SUBNAV = [
  { key: 'opportunity', label: 'Invitations', icon: '📩' },
  { key: 'browse', label: 'Browse GIGs', icon: '🔍' },
  { key: 'active', label: 'Active GIG', icon: '⚡' },
  { key: 'applied', label: 'Applied GIGs', icon: '📤' },
  { key: 'completed', label: 'Completed GIGs', icon: '✅' },
  { key: 'saved', label: 'Saved GIGs', icon: '🔖' },
]

const COMPANY_REGISTRATION_METHODS = {
  email: { icon: '📧', label: 'Business email' },
  phone: { icon: '📱', label: 'Phone number' },
}

const COMPANY_VERIFICATION_METHODS = {
  gstin: { icon: '🏛️', label: 'GSTIN' },
  udyam: { icon: '📋', label: 'Udyam registration' },
}

function CompanyVerificationBadge({ contactMethod = 'email', verificationMethod = 'gstin' }) {
  const [show, setShow] = useState(false)
  const registration = COMPANY_REGISTRATION_METHODS[contactMethod] || COMPANY_REGISTRATION_METHODS.email
  const verification = COMPANY_VERIFICATION_METHODS[verificationMethod] || COMPANY_VERIFICATION_METHODS.gstin

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span aria-label="Verified business" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#10B981', color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 100, cursor: 'default' }}>✓ Verified</span>
      {show && (
        <span style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 1200, minWidth: 190, background: 'white', color: 'var(--dark)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', borderRadius: 8, padding: '8px 10px', fontSize: 12, pointerEvents: 'none' }}>
          <strong style={{ display: 'block', color: '#059669', marginBottom: 5 }}>Business verification</strong>
          <span style={{ display: 'block' }}>{registration.icon} Registered via {registration.label}</span>
          <span style={{ display: 'block', marginTop: 3 }}>{verification.icon} Verified via {verification.label}</span>
        </span>
      )}
    </span>
  )
}

function EmptyState({ icon, msg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: 12 }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>{msg}</div>
    </div>
  )
}

function GigCard({ gig, isApplied, isSaved, onApply, onToggleSave, onViewCompany, onOpenTask, showApply = false, showSave = false, status }) {
  const statusMeta = {
    active: { label: '⚡ In Progress', bg: '#D1FAE5', color: '#065F46' },
    applied: { label: '📤 Applied', bg: '#EFF6FF', color: '#1D4ED8' },
    reviewed: { label: '📝 Reviewed', bg: '#EDE9FE', color: '#6D28D9' },
    selected: { label: '🎉 Selected', bg: '#D1FAE5', color: '#065F46' },
    work_started: { label: '🚀 Work Started', bg: '#EDE9FE', color: '#7C3AED' },
    delivered: { label: '📦 Work Delivered', bg: '#DBEAFE', color: '#1D4ED8' },
    approved: { label: '✅ Approved', bg: '#D1FAE5', color: '#065F46' },
    completed: { label: '✓ Completed', bg: '#D1FAE5', color: '#065F46' },
    needs_revision: { label: '🔁 Needs Revision', bg: '#FEF3C7', color: '#92400E' },
  }
  const resolvedStatus = typeof status === 'string' ? (statusMeta[status] || { label: status, bg: '#FEF9C3', color: '#854D0E' }) : null

  return (
    <div className="student-gig-card" style={{
      background: 'var(--white)', borderRadius: 12, padding: '18px 22px',
      border: '1px solid var(--border)', transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--primary)' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      <div className="student-gig-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div className="student-gig-card-company" style={{ display: 'flex', gap: 11, minWidth: 0 }}>
          <CompanyLogo logo={gig.companyLogo} name={gig.company} size={40} />
          <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)', marginBottom: 3 }}>{gig.title}{gig.demoData && <span className="demo-data-badge">Demo</span>}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            🏢 {gig.company} · 📍 {gig.location}
            {gig.workMode ? ` · ${gig.workMode}` : ''}
          </div>
          </div>
        </div>
        <div className="student-gig-card-meta" style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)' }}>{gig.budget}</div>
          {gig.match ? <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>{gig.match}% match</div> : null}
          {gig.progress ? <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{gig.progress}</div> : null}
          {gig.completedOn ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>Done {gig.completedOn}</div> : null}
        </div>
      </div>
      <div className="student-gig-card-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
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
      <div className="student-gig-card-actions" style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onViewCompany(gig)}
          style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          View Company
        </button>
        {onOpenTask && gig.opportunityId ? (
          <button
            type="button"
            onClick={() => onOpenTask(gig)}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: 13 }}
          >
            {status === 'completed' ? 'View GIG Work' : 'Open GIG Work'}
          </button>
        ) : null}
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
            {isSaved ? '🔖 Unsave' : '🔖 Save'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function CompanyDetailsModal({ gig, onClose }) {
  const [response, setResponse] = useState(null)
  const [retry, setRetry] = useState(0)
  const companyKey = gig?.companyId || gig?.company
  useEffect(() => {
    if (!companyKey) return undefined
    let cancelled = false
    setResponse(null)
    fetchPublicCompanyProfile(companyKey)
      .then(result => { if (!cancelled) setResponse({ key: companyKey, profile: result.companyProfile }) })
      .catch(error => { if (!cancelled) setResponse({ key: companyKey, error: error.message || 'Could not load company profile.' }) })
    return () => { cancelled = true }
  }, [companyKey, retry])
  if (!gig) return null
  const current = response?.key === companyKey ? response : null
  return <CompanyProfileModal gig={gig} profile={current?.profile} loading={!current}
    error={current?.error} onRetry={() => setRetry(value => value + 1)} onClose={onClose}/>
}

import DashboardSkeleton from '../../ui/DashboardSkeleton'

export default function GigCenter() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const tabFromUrl = new URLSearchParams(search).get('tab')
  const requestedTab = GIG_SUBNAV.some(item => item.key === tabFromUrl) ? tabFromUrl : 'opportunity'
  const [sub, setSub] = useState(requestedTab)
  const [isSubnavOpen, setIsSubnavOpen] = useState(false)
  const [sessionToken] = useState(() => getStudentSessionToken())
  const [gigState, setGigState] = useState(() => readStudentSectionCache('gig', getStudentSessionToken()) || buildDemoGigState())
  const [selectedCompanyGig, setSelectedCompanyGig] = useState(null)
  const [isLoading, setIsLoading] = useState(() => !readStudentSectionCache('gig', getStudentSessionToken()) && Boolean(getStudentSessionToken()))
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    setSub(current => current === requestedTab ? current : requestedTab)
  }, [requestedTab])

  const selectSubnav = tab => {
    if (!GIG_SUBNAV.some(item => item.key === tab)) return
    setSub(tab)
    setIsSubnavOpen(false)
    navigate(`/student/dashboard?section=gig&tab=${encodeURIComponent(tab)}`)
  }

  useEffect(() => {
    let cancelled = false

    async function loadGigState() {
      const cached = readStudentSectionCache('gig', sessionToken)
      if (cached && refresh === 0) {
        setGigState(cached)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setLoadError('')
      if (!sessionToken) {
        navigate('/student', { replace: true })
        return
      }

      try {
        const result = await fetchStudentGigs(sessionToken)

        if (!cancelled) {
          writeStudentSectionCache('gig', sessionToken, result.gigState)
          setGigState(result.gigState)
        }
      } catch (error) {
        if (!cancelled) {
          if (error.status === 401) navigate('/student', { replace: true })
          else setLoadError(error.message || 'Could not load GIGs. Please retry.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadGigState()

    return () => {
      cancelled = true
    }
  }, [sessionToken, refresh, navigate])

  useEffect(() => {
    // Keep the recently loaded state when returning to this tab. The cache is
    // short-lived, and every successful GIG action replaces it, so refetching
    // on every focus only adds a full loading cycle without improving freshness.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !readStudentSectionCache('gig', sessionToken)) {
        setRefresh(value => value + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [sessionToken])

  const browseGigs = useMemo(() => gigState.browseGigs || [], [gigState.browseGigs])
  const opportunities = useMemo(() => gigState.opportunities || [], [gigState.opportunities])
  const savedGigIds = useMemo(() => gigState.savedGigIds || [], [gigState.savedGigIds])
  const appliedGigIds = useMemo(() => gigState.appliedGigIds || [], [gigState.appliedGigIds])
  const appliedGigs = useMemo(
    () => Array.isArray(gigState.appliedGigs)
      ? gigState.appliedGigs
      : browseGigs.filter(gig => appliedGigIds.includes(gig.id)),
    [gigState.appliedGigs, browseGigs, appliedGigIds],
  )
  const completedGigs = useMemo(() => gigState.completedGigs || [], [gigState.completedGigs])
  const activeGigBase = useMemo(() => gigState.activeGigBase || [], [gigState.activeGigBase])

  const savedGigs = useMemo(
    () => browseGigs.filter(gig => savedGigIds.includes(gig.id)),
    [browseGigs, savedGigIds],
  )

  const activeGigs = useMemo(() => activeGigBase, [activeGigBase])
  const findGig = gigId => browseGigs.find(item => String(item.id) === String(gigId))
  const opportunityCount = useMemo(
    () => opportunities.filter(item => item.status !== 'declined'
      && !['selected', 'work_started', 'delivered', 'approved', 'completed'].includes(item.taskSubmissionStatus)
      && !(item.taskSubmissionStatus === 'needs_revision' && item.revisionReturnStatus === 'delivered')).length,
    [opportunities],
  )
  const activeSubnav = GIG_SUBNAV.find(item => item.key === sub) || GIG_SUBNAV[0]

  const syncGigState = async (updater, requestFn) => {
    if (!sessionToken) {
      setGigState(current => updater(current))
      return true
    }

    try {
      const result = await requestFn()
      writeStudentSectionCache('gig', sessionToken, result.gigState)
      setGigState(result.gigState)
      return true
    } catch (error) {
      return false
    }
  }

  const handleApply = async (gigId) => {
    if (findGig(gigId)?.demoData) {
      toast.info('Demo GIGs are read-only and cannot be applied to.', { title: 'Demo GIG' })
      return false
    }
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
    if (findGig(gigId)?.demoData) {
      toast.info('Demo GIGs are read-only and cannot be saved.', { title: 'Demo GIG' })
      return false
    }
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
    if (opportunity?.demoData) {
      toast.info('Opening a read-only demo task. Demo work cannot be submitted.', { title: 'Demo Task Preview' })
      return true
    }

    const didSucceed = await syncGigState(
      current => ({
        ...current,
        opportunities: current.opportunities.map(item => (
          item.id === opportunity.id ? { ...item, status: 'accepted' } : item
        )),
      }),
      () => acceptStudentOpportunity(sessionToken, opportunity.id),
    )

    if (didSucceed && !opportunity?.demoData) {
      toast.success('Company invite accepted.', { title: 'Interview Task Unlocked' })
    }

    return didSucceed
  }

  const handleDeclineOpportunity = async (opportunity) => {
    if (opportunity?.demoData) {
      toast.info('Demo opportunities are read-only.', { title: 'Demo Opportunity' })
      return
    }
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

  const handleOpenActiveTask = gig => {
    const opportunity = gig.demoData && gig.demoWork
      ? gig
      : opportunities.find(item => String(item.id) === String(gig.opportunityId))
    if (!opportunity) {
      toast.error('The accepted GIG task could not be found. Refresh your GIG Center.', { title: 'Task Unavailable' })
      return
    }

    navigate('/student/task', {
      state: {
        taskType: 'company-interview',
        opportunity,
        showIntegrityWarning: false,
        returnSection: 'gig',
      },
    })
  }

  return (
    <div>
      {isLoading ? <DashboardSkeleton section="gig" /> : loadError ? <div role="alert" className="work-error">{loadError} <button className="btn-secondary" onClick={() => setRefresh(value => value + 1)}>Retry</button></div> : <div className="student-tab-layout">
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
          <button key={item.key} type="button" className={`gig-subnav-item${sub === item.key ? ' is-active' : ''}`} aria-pressed={sub === item.key} onClick={() => selectSubnav(item.key)} style={{
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
            {item.key === 'opportunity' && opportunityCount > 0 ? (
              <span style={{ background: sub === 'opportunity' ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)', color: sub === 'opportunity' ? 'white' : 'var(--primary)', borderRadius: 100, minWidth: 18, height: 18, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{opportunityCount}</span>
            ) : null}
            {item.key === 'browse' && browseGigs.length > 0 ? (
              <span style={{ background: sub === 'browse' ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)', color: sub === 'browse' ? 'white' : 'var(--primary)', borderRadius: 100, minWidth: 18, height: 18, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{browseGigs.length}</span>
            ) : null}
            {item.key === 'active' && activeGigs.length > 0 ? (
              <span style={{ background: sub === 'active' ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)', color: sub === 'active' ? 'white' : 'var(--primary)', borderRadius: 100, minWidth: 18, height: 18, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{activeGigs.length}</span>
            ) : null}
            {item.key === 'applied' && appliedGigs.length > 0 ? (
              <span style={{
                background: sub === 'applied' ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)',
                color: sub === 'applied' ? 'white' : 'var(--primary)',
                borderRadius: 100,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                lineHeight: 1,
              }}>{appliedGigs.length}</span>
            ) : null}
            {item.key === 'saved' && savedGigs.length > 0 ? (
              <span style={{ background: sub === 'saved' ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)', color: sub === 'saved' ? 'white' : 'var(--primary)', borderRadius: 100, padding: '0 6px', fontSize: 11, fontWeight: 800 }}>{savedGigs.length}</span>
            ) : null}
            {item.key === 'completed' && completedGigs.length > 0 ? (
              <span style={{
                background: sub === 'completed' ? 'rgba(255,255,255,0.3)' : 'var(--primary-light)',
                color: sub === 'completed' ? 'white' : 'var(--primary)',
                borderRadius: 100,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                lineHeight: 1,
              }}>{completedGigs.length}</span>
            ) : null}
          </button>
        ))}
        </div>
      </div>

      <div key={sub} className="student-tab-content gig-tab-content">
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
                onOpenTask={handleOpenActiveTask}
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
              status="completed"
              isApplied={appliedGigIds.includes(gig.id)}
              isSaved={savedGigIds.includes(gig.id)}
              onApply={handleApply}
              onToggleSave={handleToggleSave}
              onViewCompany={setSelectedCompanyGig}
              onOpenTask={handleOpenActiveTask}
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
          onViewCompany={setSelectedCompanyGig}
        />
      ) : null}

      <CompanyDetailsModal gig={selectedCompanyGig} onClose={() => setSelectedCompanyGig(null)} />
      </div>
      </div>}
    </div>
  )
}
