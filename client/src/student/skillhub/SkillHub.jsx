import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Archive, Award, ArrowUpCircle, BadgeCheck, BookOpenCheck, ChartNoAxesCombined, Flame, PenLine, Plus, RefreshCw, RotateCcw, Send, X, Zap } from 'lucide-react'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import { fetchSkillAssessments, fetchSkillCatalog, fetchStudentSkillHub, fetchStudentSkillRequests, getStudentSessionToken, requestPlatformSkill, saveStudentSkillHub, setStudentSkillVisibility } from '../studentApi'
import DailyChallenge, { PracticeStreak } from './DailyChallenge'
import SkillGapReport from './SkillGapReport'
import './SkillHub.css'
import { clearStudentSectionCache, loadStudentSectionCache, readStudentSectionCache, writeStudentSectionCache } from '../sectionCache'

const TABS = [
  ['myskills', 'My Skills', Award], ['verify', 'Verify & Renew', BadgeCheck],
  ['upgrade', 'Upgrade', ArrowUpCircle], ['daily', 'Daily Practice', Zap], ['streak', 'Progress', Flame], ['gap', 'Skill Gap Report', ChartNoAxesCombined],
]
const CATEGORIES = ['Frontend', 'Backend', 'Full Stack', 'Mobile Development', 'Cloud Computing', 'DevOps', 'Cybersecurity', 'AI & Machine Learning', 'Data Engineering', 'Databases', 'Design', 'Analytics', 'Marketing', 'Content & Writing', 'Video & Animation', 'Game Development', 'Quality Assurance', 'Business & Finance', 'Product Management', 'Other']
const STATUS = { valid: 'Verified', due: 'Renew soon', expired: 'Expired', unverified: 'Unverified', archived: 'Archived' }
const REVIEW_STATUS = { pending: 'Awaiting review', needs_revision: 'Revision requested', approved: 'Approved', rejected: 'Not approved' }
const ASSESSMENT_MODE_LABELS = { verify: 'Verification', reverify: 'Renewal', upgrade: 'Upgrade', retain: 'Practice', challenge: 'Daily challenge' }
const LOG_LABELS = { created: 'Skill added', expired: 'Verification expired', verify_completed: 'Skill verified',
  reverify_completed: 'Verification renewed', upgrade_completed: 'Level upgraded', retention_completed: 'Practice approved', challenge_completed: 'Challenge approved', archived: 'Skill archived', restored: 'Skill restored' }
const date = value => value && value !== '-' ? new Date(value.length === 10 ? value + 'T00:00:00' : value).toLocaleDateString('en-IN') : 'Not set'
const activeSkill = skill => !skill.archived && skill.verified && ['valid', 'due'].includes(skill.renewalStatus)
const isDemoReadOnlyError = message => message === 'Demo data is read-only and cannot be modified or deleted.'
const ACTION_WARNING = 'Submit your own work and explain any tools or sources you used. A platform reviewer checks your evidence against the published criteria. Revisions may be requested before approval.'

function SkillStatusPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const options = [['all', 'All statuses'], ['verified', 'Verified'], ['due', 'Renew soon'], ['expired', 'Expired'], ['unverified', 'Unverified'], ['archived', 'Archived']]
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  return <div ref={pickerRef} className="sh-status-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="sh-status-picker-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>{options.find(([key]) => key === value)?.[1] || 'All statuses'}<span>v</span></button>
    {open && <div className="sh-status-picker-options" role="listbox" aria-label="Skill status">
      {options.map(([key, label]) => <button key={key} type="button" role="option" aria-selected={key === value} onClick={() => { onChange(key); setOpen(false) }}>{label}</button>)}
    </div>}
  </div>
}

function SkillCategoryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  return <div ref={pickerRef} className="sh-status-picker sh-category-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="sh-status-picker-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>{value}<span>v</span></button>
    {open && <div className="sh-status-picker-options" role="listbox" aria-label="Skill category">
      {CATEGORIES.map(category => <button key={category} type="button" role="option" aria-selected={category === value} onClick={() => { onChange(category); setOpen(false) }}>{category}</button>)}
    </div>}
  </div>
}

export default function SkillHub({ onProfileChange }) {
  const navigate = useNavigate()
  const { search: locationSearch } = useLocation()
  const sessionToken = getStudentSessionToken()
  const cachedSnapshot = readStudentSectionCache('skillhub', sessionToken)
  const requestedTab = new URLSearchParams(locationSearch).get('skillhubTab')
  const [tab, setTab] = useState(() => TABS.some(([key]) => key === requestedTab) ? requestedTab : 'myskills')
  const [data, setData] = useState(() => cachedSnapshot?.hub || null)
  const [assessments, setAssessments] = useState(() => cachedSnapshot?.assessments || [])
  const [loading, setLoading] = useState(() => !cachedSnapshot)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState('catalog')
  const [catalog, setCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [skillRequests, setSkillRequests] = useState(() => cachedSnapshot?.skillRequests || [])
  const [draft, setDraft] = useState({ name: '', category: 'Frontend' })
  const [requestReview, setRequestReview] = useState(true)
  const [requestNote, setRequestNote] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false)
  const [pendingTask, setPendingTask] = useState(null)
  const [showDemo, setShowDemo] = useState(false)
  const loadVersion = useRef(0)

  useEffect(() => {
    if (TABS.some(([key]) => key === requestedTab)) setTab(requestedTab)
  }, [requestedTab])

  const load = useCallback(async ({ useCache = false, includeSkillGap = false } = {}) => {
    const version = ++loadVersion.current
    const token = getStudentSessionToken()
    const cached = useCache ? readStudentSectionCache('skillhub', token) : null
    if (cached && (!includeSkillGap || cached.hasSkillGapReport)) {
      setData(cached.hub)
      setAssessments(cached.assessments)
      setSkillRequests(cached.skillRequests || [])
      onProfileChange?.(cached.hub)
      setLoading(false)
      setRefreshing(false)
      return
    }
    setRefreshing(true)
    try {
      const cacheSection = includeSkillGap ? 'skillhub-gap' : 'skillhub'
      const snapshot = await loadStudentSectionCache(cacheSection, token, async () => {
        const [hub, history, requestResult] = await Promise.all([
          fetchStudentSkillHub(token, { includeSkillGap }),
          fetchSkillAssessments(token),
          fetchStudentSkillRequests(token),
        ])
        if (!hub.skillHub || !Array.isArray(hub.skillHub.skills)) throw new Error('Skill Hub returned an invalid response.')
        return {
          hub: hub.skillHub,
          assessments: history?.assessments || [],
          skillRequests: requestResult?.requests || [],
          hasSkillGapReport: Boolean(hub.skillHub.skillHubState?.skillGapReport),
        }
      })
      if (version !== loadVersion.current) return
      setData(snapshot.hub)
      setAssessments(snapshot.assessments)
      setSkillRequests(snapshot.skillRequests || [])
      writeStudentSectionCache('skillhub', token, snapshot)
      onProfileChange?.(snapshot.hub)
      setError('')
      setLoading(false)
      setRefreshing(false)
    } catch (failure) { if (version === loadVersion.current) setError(failure.message || 'Could not load Skill Hub.') }
    finally { if (version === loadVersion.current) { setLoading(false); setRefreshing(false) } }
  }, [onProfileChange])

  const invalidateLoad = useCallback(() => { loadVersion.current++ }, [])
  useEffect(() => { load({ useCache: true, includeSkillGap: tab === 'gap' }); return invalidateLoad }, [load, invalidateLoad, tab])
  useEffect(() => {
    if (tab === 'gap' && !data?.skillHubState?.skillGapReport) load({ includeSkillGap: true })
  }, [data, load, tab])
  useEffect(() => {
    const refresh = () => { if (!busy && !showAdd && document.visibilityState === 'visible') load({ includeSkillGap: tab === 'gap' }) }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [load, busy, showAdd, tab])

  useEffect(() => {
    if (!showAdd) return undefined
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setCatalogLoading(true)
      try {
        const token = getStudentSessionToken()
        const catalogResult = await fetchSkillCatalog(token, { search: catalogSearch })
        if (cancelled) return
        setCatalog(catalogResult.skills || [])
      } catch (failure) {
        if (!cancelled) setError(failure.message || 'Could not load the platform skill catalog.')
      } finally { if (!cancelled) setCatalogLoading(false) }
    }, catalogSearch ? 250 : 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [catalogSearch, showAdd])

  async function addSkill(event) {
    event.preventDefault()
    if (busy || refreshing) return
    setBusy(true); setError('')
    try {
      const selected = catalog.find(skill => skill.id === selectedCatalogId)
      if (addMode === 'catalog' && !selected) throw new Error('Choose a platform skill to add.')
      const name = addMode === 'catalog' ? selected.name : draft.name.trim()
      if (data.skills.some(skill => !skill.demoData && (skill.name.toLowerCase() === name.toLowerCase()
        || selected && skill.catalogSkillId === selected.id) && (!selected || skill.source === 'catalog' || skill.verifiedAt))) throw new Error('This skill is already on your profile.')
      const token = getStudentSessionToken()
      const payload = addMode === 'catalog'
        ? { catalogSkillId: selected.id }
        : { ...draft, name, source: 'self_declared' }
      const result = await saveStudentSkillHub(token, { skills: [payload] })
      let requestFailure = ''
      if (addMode === 'custom' && requestReview) try {
        const requestResult = await requestPlatformSkill(token, { ...draft, name, note: requestNote })
        setSkillRequests(current => [requestResult.request, ...current])
      } catch (failure) { requestFailure = failure.message || 'The platform review request could not be created.' }
      setData(current => ({ ...current, ...result.skillHub, skillHubState: { ...current.skillHubState, ...result.skillHub.skillHubState } }))
      onProfileChange?.(result.skillHub)
      setDraft({ name: '', category: 'Frontend' }); setRequestNote(''); setSelectedCatalogId(''); setShowAdd(false)
      clearStudentSectionCache('skillhub', getStudentSessionToken())
      await load({ includeSkillGap: tab === 'gap' })
      if (requestFailure) setError(`Skill added to your profile. ${requestFailure}`)
    } catch (failure) { setError(failure.message || 'Could not add this skill.') }
    finally { setBusy(false) }
  }

  const openAssessment = (skill, mode, extra = {}) => {
    if (!skill?.name) return
    setPendingTask({ skill, mode, extra })
  }
  const confirmTask = () => {
    if (!pendingTask) return
    const { skill, mode, extra } = pendingTask
    setPendingTask(null)
    navigate('/student/task', { state: { skillName: skill.name, category: skill.category, catalogSkillId: skill.catalogSkillId, catalogVersion: skill.catalogVersion, mode, returnSection: 'skillhub', returnTab: tab, demoData: skill.demoData === true, ...extra } })
  }
  const changeVisibility = async skill => {
    if (busy || refreshing) return
    setBusy(true); setError('')
    try {
      const result = await setStudentSkillVisibility(getStudentSessionToken(), { skillName: skill.name, archived: !skill.archived })
      setData(current => ({ ...current, ...result.skillHub, skillHubState: { ...current.skillHubState, ...result.skillHub.skillHubState } }))
      onProfileChange?.(result.skillHub)
      clearStudentSectionCache('skillhub', getStudentSessionToken())
      await load({ includeSkillGap: tab === 'gap' })
    } catch (failure) {
      const message = failure.message || 'Could not update this skill.'
      if (!isDemoReadOnlyError(message)) setError(message)
    }
    finally { setBusy(false) }
  }
  if (loading) return <DashboardSkeleton section="skillhub" />
  if (!data) return <section className="skillhub-page"><p role="alert" className="work-error">{error}</p><button className="btn-secondary" onClick={load}>Retry</button></section>

  const skills = data.skills.filter(skill => showDemo || !skill.demoData)
  const visibleAssessments = assessments.filter(item => showDemo || !item.demoData)
  const visibleChallenges = (data.challenges || []).filter(challenge => showDemo || skills.some(skill => challenge.catalogSkillId
    ? skill.catalogSkillId === challenge.catalogSkillId
    : !skill.catalogSkillId && skill.name.toLowerCase() === challenge.skill.toLowerCase()))
  const visibleState = { ...data.skillHubState,
    skillLog: (data.skillHubState?.skillLog || []).filter(item => showDemo || !item.demoData),
    demoStreakDays: showDemo ? data.skillHubState?.demoStreakDays : [],
    demoSkillGapReport: showDemo ? data.skillHubState?.demoSkillGapReport : null }
  const verified = skills.filter(activeSkill)
  const nextStage = skill => skill.stage === 'Beginner' ? 'Intermediate' : skill.stage === 'Intermediate' ? 'Pro' : skill.stage === 'Pro' ? 'Pro Mastery' : ''
  const statusCounts = {
    all: skills.length,
    verified: verified.length,
    due: skills.filter(skill => !skill.archived && skill.renewalStatus === 'due').length,
    expired: skills.filter(skill => !skill.archived && skill.renewalStatus === 'expired').length,
    unverified: skills.filter(skill => !skill.archived && skill.renewalStatus === 'unverified').length,
    archived: skills.filter(skill => skill.archived).length,
  }
  const queue = skills.filter(skill => skill.assessmentEligible !== false && !skill.archived && (!activeSkill(skill) || skill.renewalStatus === 'due'))
  const upgrades = verified.filter(skill => {
    const target = nextStage(skill)
    return skill.assessmentEligible !== false && target
      && (!skill.catalogStages?.length || skill.catalogStages.includes(target))
  })
  const filtered = skills.filter(skill => skill.name.toLowerCase().includes(search.toLowerCase())
    && (filter === 'all' || filter === 'verified' && activeSkill(skill) || filter === 'archived' && skill.archived || skill.renewalStatus === filter && !skill.archived))
  const logs = visibleState.skillLog
  const activeTab = TABS.find(([key]) => key === tab) || TABS[0]
  const ActiveTabIcon = activeTab[2]

  const skillRow = (skill, mode) => {
    const targetStage = nextStage(skill)
    const matchingAssessments = visibleAssessments.filter(item => Boolean(item.demoData) === Boolean(skill.demoData) && item.skillName.toLowerCase() === skill.name.toLowerCase() && item.mode === mode
      && (mode !== 'upgrade' || item.targetStage === targetStage))
    const relevant = matchingAssessments.find(item => ['pending', 'needs_revision'].includes(item.status))
    const demoPreview = skill.demoData ? matchingAssessments[0] : null
    return <article className="sh-skill" key={skill.name}>
      <div className="sh-skill-main"><strong>{skill.name}{skill.demoData && <span className="demo-data-badge">Demo</span>}</strong>
        <div className="sh-meta"><span className={`sh-status sh-status-${skill.archived ? 'archived' : skill.renewalStatus}`}>{STATUS[skill.archived ? 'archived' : skill.renewalStatus]}</span>
          <span>{skill.category}</span><span>{activeSkill(skill) ? skill.stage : 'No active verified level'}</span>
          <span className={`sh-source sh-source-${skill.source || 'legacy'}`}>{skill.source === 'self_declared' ? 'Self-declared' : skill.source === 'catalog' ? `Platform standard v${skill.catalogVersion || 1}` : 'Existing profile skill'}</span></div>
        {activeSkill(skill) && <span className={`sh-inline-streak${skill.streak ? ' is-active' : ''}`}><Flame size={14}/>{skill.streak || 0} day streak{skill.longestStreak ? ` · Best ${skill.longestStreak}` : ''}</span>}
        <small>{skill.catalogAvailable === false ? 'This catalog standard is unavailable for new submissions.' : skill.assessmentEligible === false ? 'Profile-only skill. It does not affect verification, matching, or TrustScore.' : skill.renewalDue !== '-' ? `Verification ${skill.renewalStatus === 'expired' ? 'expired' : 'expires'} ${date(skill.renewalDue)}` : 'Ready for platform verification'}</small>
        {skill.certifiedCatalogVersion && skill.catalogVersion > skill.certifiedCatalogVersion && <small>Verified under v{skill.certifiedCatalogVersion}. New submissions use v{skill.catalogVersion}.</small>}
      </div>
      {mode && <button type="button" className="btn-secondary" onClick={() => openAssessment(skill, mode, { instructions: mode === 'upgrade' ? skill.upgradeRequirements?.find(item => item.stage === targetStage)?.instructions : skill.verificationInstructions,
        ...(mode === 'upgrade' ? { targetStage } : {}), ...(relevant ? { assessmentId: relevant.id } : {}), ...(demoPreview ? { demoAssessment: demoPreview } : {}) })}>
        {relevant ? REVIEW_STATUS[relevant.status] : mode === 'upgrade' ? `Upgrade to ${targetStage}` : mode === 'reverify' ? 'Renew verification' : 'Submit evidence'}
      </button>}
      {!mode && <div className="sh-skill-actions">
        {activeSkill(skill) && <BadgeCheck className="sh-verified-icon" size={20} aria-label="Verified skill" />}
        <button type="button" className="btn-secondary" disabled={busy || refreshing} onClick={() => changeVisibility(skill)} title={skill.archived ? 'Restore skill to your public profile and matching' : 'Archive skill from your public profile and matching'}>
          {skill.archived ? <><RotateCcw size={16}/>Restore</> : <><Archive size={16}/>Archive</>}
        </button>
      </div>}
    </article>
  }

  return <section className="skillhub-page">
    <header className="sh-toolbar">
      <div className="responsive-pill-nav responsive-pill-nav-menu skillhub-subnav">
        <div className="responsive-pill-nav-header">
          <div className="skillhub-subnav-current"><ActiveTabIcon size={16} /><strong>{activeTab[1]}</strong></div>
          <button type="button" className="responsive-pill-nav-toggle" aria-label="Toggle Skill Hub navigation" aria-expanded={mobileTabsOpen} onClick={() => setMobileTabsOpen(current => !current)}>☰</button>
        </div>
        <nav className={`responsive-pill-nav-list sh-tabs${mobileTabsOpen ? ' is-open' : ''}`} aria-label="Skill Hub sections">{TABS.map(([key, label, icon]) => {
          const Icon = icon
          return <button key={key} type="button" className={`skillhub-subnav-item${tab === key ? ' is-active' : ''}`} aria-pressed={tab === key} onClick={() => { setTab(key); setMobileTabsOpen(false) }}><span className="skillhub-subnav-icon"><Icon size={16} /></span>{label}</button>
        })}</nav>
      </div>
      <label className="sh-demo-toggle"><input type="checkbox" checked={showDemo} onChange={event => setShowDemo(event.target.checked)}/>Demo examples</label>
      <button type="button" className="btn-secondary sh-refresh" title="Refresh Skill Hub" aria-label="Refresh Skill Hub" disabled={refreshing || busy} onClick={() => load({ includeSkillGap: tab === 'gap' })}><RefreshCw size={18} /></button>
    </header>
    {error && <p role="alert" className="work-error">{error}</p>}
    <div className="sh-body">
      {tab === 'myskills' && <div className="sh-columns">
        <section className="sh-panel">
          <header className="sh-section-heading sh-skills-heading">
            <div><span className="sh-section-kicker">Skill inventory</span><h2>My Skills</h2></div>
            <div className="sh-status-summary" aria-label="Skill status summary">
              <span className="sh-count-all">{statusCounts.all} All Skills</span>
              <span className="sh-count-valid">{statusCounts.verified} Verified</span>
              <span className="sh-count-due">{statusCounts.due} Need Renew</span>
              <span className="sh-count-expired">{statusCounts.expired} Expired</span>
              <span className="sh-count-unverified">{statusCounts.unverified} Unverified</span>
              <span className="sh-count-archived">{statusCounts.archived} Archived</span>
            </div>
            <button className="btn-primary" onClick={() => setShowAdd(true)} disabled={skills.filter(skill => !skill.demoData).length >= 100}><Plus size={16}/>Add skill</button>
          </header>
          {showAdd && <form className="sh-add-form sh-catalog-add" onSubmit={addSkill}><fieldset disabled={busy || refreshing}>
            <div className="sh-add-mode" role="tablist" aria-label="Choose skill source">
              <button type="button" role="tab" aria-selected={addMode === 'catalog'} onClick={() => setAddMode('catalog')}><BookOpenCheck size={16}/>Platform catalog</button>
              <button type="button" role="tab" aria-selected={addMode === 'custom'} onClick={() => setAddMode('custom')}><PenLine size={16}/>Self-declared</button>
            </div>
            {addMode === 'catalog' ? <div className="sh-catalog-picker">
              <label>Search catalog<input type="search" autoFocus value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} placeholder="Search platform skills"/></label>
              <div className="sh-catalog-options" role="radiogroup" aria-label="Platform skills">
                {catalogLoading ? <p>Loading catalog...</p> : catalog.map(skill => <label key={skill.id} className={selectedCatalogId === skill.id ? 'is-selected' : ''}><input type="radio" name="catalogSkill" value={skill.id} checked={selectedCatalogId === skill.id} onChange={() => setSelectedCatalogId(skill.id)}/><span><strong>{skill.name}</strong><small>{skill.category}{skill.summary ? ` · ${skill.summary}` : ''}</small></span></label>)}
                {!catalogLoading && !catalog.length && <p>No published skills match this search.</p>}
              </div>
              <p className="sh-source-note">Catalog skills can be verified, upgraded, practiced, and used for GIG matching.</p>
            </div> : <div className="sh-custom-skill">
              <label>Skill name<input required maxLength={100} autoFocus value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
              <label>Category<SkillCategoryPicker value={draft.category} onChange={category => setDraft({ ...draft, category })} /></label>
              <p className="sh-source-note">Self-declared skills appear on your profile only. They cannot earn TrustScore or enter matching until the platform approves a standard.</p>
              <label className="sh-request-toggle"><input type="checkbox" checked={requestReview} onChange={event => setRequestReview(event.target.checked)}/><span><strong>Request platform review</strong><small>Ask an admin to add or map this skill to the catalog.</small></span></label>
              {requestReview && <label className="sh-request-note">Why should this skill be supported? <textarea maxLength={1000} rows={2} value={requestNote} onChange={event => setRequestNote(event.target.value)}/></label>}
              {skillRequests.some(item => item.status === 'pending' && item.requestedName.toLowerCase() === draft.name.trim().toLowerCase()) && <p className="sh-request-pending"><Send size={14}/>A matching request is already pending.</p>}
            </div>}
            <div className="sh-actions"><button className="btn-primary" type="submit" disabled={addMode === 'catalog' ? !selectedCatalogId : !draft.name.trim()}>{busy ? 'Saving...' : addMode === 'catalog' ? 'Add platform skill' : 'Add to profile'}</button><button className="btn-secondary" type="button" aria-label="Cancel adding skill" title="Cancel" onClick={() => setShowAdd(false)}><X size={17}/></button></div>
          </fieldset></form>}
          <div className="sh-filters"><input type="search" aria-label="Search skills" placeholder="Search skills" value={search} onChange={event => setSearch(event.target.value)}/>
            <SkillStatusPicker value={filter} onChange={setFilter} /></div>
          <div className="sh-list">{filtered.length ? filtered.map(skill => skillRow(skill)) : <div className="sh-empty">
            <p>{skills.length ? 'No matching skills.' : 'No skills added yet.'}</p>
            {!skills.length && <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16}/>Add your first skill</button>}
          </div>}</div>
        </section>
        <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Audit trail</span><h2>Skill Activity</h2></div><span>{logs.length} {logs.length === 1 ? 'event' : 'events'}</span></header>
          {skillRequests.length > 0 && <section className="sh-request-history" aria-label="Skill catalog requests"><h3>Catalog requests</h3>{skillRequests.slice(0, 4).map(item => <article key={item.id}><div><strong>{item.requestedName}</strong><small>{item.category}</small></div><span className={`sh-request-status sh-request-status-${item.status}`}>{item.status}</span>{item.adminFeedback && <p>{item.adminFeedback}</p>}</article>)}</section>}
          <div className="sh-list">{logs.length ? logs.map((item, index) => <article className="sh-activity" key={item.id || item.assessmentId || `${item.occurredAt}:${index}`}>
            <div><strong>{item.skillName}{item.demoData && <span className="demo-data-badge">Demo</span>}</strong><p>{LOG_LABELS[item.eventType] || item.eventType}</p><time>{date(item.occurredAt)}</time></div>
            {Number(item.points) !== 0 && <span className={item.points < 0 ? 'sh-negative' : 'sh-positive'}>{item.points > 0 ? '+' : ''}{item.points} credits</span>}
          </article>) : <div className="sh-empty"><p>No skill activity yet.</p><small>Verified assessments and approved practice will appear here.</small></div>}</div>
        </section>
      </div>}
      {(tab === 'verify' || tab === 'upgrade') && <div className="sh-columns">
        <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Available actions</span><h2>{tab === 'verify' ? 'Verification & Renewal' : 'Level Upgrades'}</h2></div></header>
          <p className="sh-policy">{tab === 'verify' ? `Verification: +${data.rewards.verify} base credits. Renewal: +${data.rewards.reverify}. Renewal preserves remaining validity.` : `Next-level approval: +${data.rewards.upgrade} base credits, once per skill level.`} TrustScore gains depend on credit caps and evidence tiers.</p>
          <div className="sh-list">{(tab === 'verify' ? queue : upgrades).map(skill => skillRow(skill, tab === 'upgrade' ? 'upgrade' : skill.renewalStatus === 'unverified' ? 'verify' : 'reverify'))}
            {!(tab === 'verify' ? queue : upgrades).length && <p className="sh-empty">{tab === 'verify' ? 'No skills awaiting verification or renewal.' : 'No eligible level upgrades.'}</p>}</div>
        </section>
        <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Review status</span><h2>Assessment History</h2></div></header><div className="sh-list">
          {visibleAssessments.map(item => <article className={`sh-assessment sh-assessment-${item.status}`} key={item.id}><header><strong>{item.skillName}{item.demoData && <span className="demo-data-badge">Demo</span>}</strong><span>{REVIEW_STATUS[item.status]}</span></header>
            <p className="sh-assessment-meta">{ASSESSMENT_MODE_LABELS[item.mode] || item.mode}{item.targetStage ? ` / ${item.targetStage}` : ''} · {date(item.createdAt)}</p>
            {item.feedback && <p className="sh-assessment-feedback">{item.feedback}</p>}
            <footer><small>{item.status === 'approved' ? `Base credits: ${item.rewardPoints || 0}` : item.status === 'pending' ? 'Awaiting platform review' : item.status === 'needs_revision' ? 'Revision requested' : 'Not approved'}{item.trustScoreChange != null && ` · Score change: ${item.trustScoreChange > 0 ? '+' : ''}${item.trustScoreChange}`}</small>
              <button type="button" className="btn-secondary" onClick={() => openAssessment({ name: item.skillName, demoData: item.demoData }, item.mode, { assessmentId: item.id, targetStage: item.targetStage, challengeId: item.challengeId, ...(item.demoData ? { demoAssessment: item } : {}) })}>View assessment</button></footer>
          </article>)}
          {!visibleAssessments.length && <p className="sh-empty">No assessments submitted yet.</p>}
        </div></section>
      </div>}
      {tab === 'daily' && <DailyChallenge skills={skills} skillHubState={visibleState} challenges={visibleChallenges} rewards={data.rewards} assessments={visibleAssessments} onOpenTask={openAssessment}/>}
      {tab === 'streak' && <PracticeStreak skills={skills} skillHubState={visibleState}/>}
      {tab === 'gap' && <SkillGapReport skillHubState={visibleState}/>}
    </div>
    {pendingTask && createPortal(<div className="gig-integrity-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setPendingTask(null)}><section className="gig-integrity-modal" role="dialog" aria-modal="true" aria-labelledby="skillhub-integrity-title"><div className="gig-integrity-icon" aria-hidden="true">⚠️</div><h2 id="skillhub-integrity-title">Before you open this task</h2><p className="gig-integrity-warning">{ACTION_WARNING}</p><p className="gig-integrity-note">By continuing, you confirm that you will complete the task yourself and follow the evidence and review rules.</p><div className="gig-integrity-actions"><button type="button" className="btn-secondary" onClick={() => setPendingTask(null)}>Cancel</button><button type="button" className="btn-primary" onClick={confirmTask}>I understand — open task</button></div></section></div>, document.body)}
  </section>
}
