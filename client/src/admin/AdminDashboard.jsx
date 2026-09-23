import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, BookOpenCheck, ChevronDown, ClipboardCheck, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Save, ScanSearch, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import ReviewQueue from './ReviewQueue'
import { clearAdminSession, createAdminReviewer, createAdminSkill, decideAdminSkillRequest, fetchAdminOverview, fetchAdminReviewers, fetchAdminSkillRequests, fetchAdminSkills, fetchCurrentAdminUser, getAdminSessionRole, getAdminSessionToken, logoutAdmin, setAdminSession, updateAdminReviewer, updateAdminSkill } from './adminApi'
import { getAdminDemoSkillRequests } from './adminDemoData'
import './Admin.css'

const CATEGORIES = ['Frontend', 'Backend', 'Full Stack', 'Mobile Development', 'Cloud Computing', 'DevOps', 'Cybersecurity', 'AI & Machine Learning', 'Data Engineering', 'Databases', 'Design', 'Analytics', 'Marketing', 'Content & Writing', 'Video & Animation', 'Game Development', 'Quality Assurance', 'Business & Finance', 'Product Management', 'Other']
const STAGES = ['Beginner', 'Intermediate', 'Pro', 'Pro Mastery']
const ADMIN_TABS = [['overview', 'Overview', LayoutDashboard], ['catalog', 'Skill Catalog', BookOpenCheck], ['requests', 'Skill Requests', ClipboardCheck], ['reviews', 'Review Queue', ScanSearch], ['reviewers', 'Review Team', Users]]
const REVIEW_STAFF_TABS = [['reviews', 'Review Queue', ScanSearch]]
const emptySkill = () => ({ name: '', aliases: [], category: 'Frontend', summary: '', status: 'draft', renewalDays: 365,
  stages: [...STAGES], verificationInstructions: '', upgradeRequirements: [], dailyTasks: [] })
const formatDate = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'

function Metric({ label, value, icon, tone }) {
  return <article className={`admin-metric admin-metric-${tone}`}>{createElement(icon, { size: 19 })}<strong>{value ?? 0}</strong><span>{label}</span></article>
}

function AdminSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const normalizedOptions = options.map(option => Array.isArray(option) ? option : [option, option])
  const selectedLabel = normalizedOptions.find(([optionValue]) => optionValue === value)?.[1] || value
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })

  return <div ref={pickerRef} className="admin-select" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="admin-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span>{selectedLabel}</span><ChevronDown size={16}/>
    </button>
    {open && <div className="admin-select-options" role="listbox" aria-label={ariaLabel}>
      {normalizedOptions.map(([optionValue, label]) => <button key={optionValue} type="button" role="option" aria-selected={optionValue === value} onClick={() => { onChange(optionValue); setOpen(false) }}>{label}</button>)}
    </div>}
  </div>
}

function SkillEditor({ value, busy, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => ({ ...emptySkill(), ...value, aliasesText: (value.aliases || []).join(', ') }))
  useEffect(() => setDraft({ ...emptySkill(), ...value, aliasesText: (value.aliases || []).join(', ') }), [value])
  const set = patch => setDraft(current => ({ ...current, ...patch }))
  const requirement = stage => draft.upgradeRequirements.find(item => item.stage === stage)?.instructions || ''
  const setRequirement = (stage, instructions) => set({ upgradeRequirements: [
    ...draft.upgradeRequirements.filter(item => item.stage !== stage),
    ...(instructions.trim() ? [{ stage, instructions }] : []),
  ] })
  const updateTask = (index, patch) => set({ dailyTasks: draft.dailyTasks.map((task, taskIndex) => taskIndex === index ? { ...task, ...patch } : task) })
  const removeTask = index => set({ dailyTasks: draft.dailyTasks.filter((_, taskIndex) => taskIndex !== index) })
  const submit = event => {
    event.preventDefault()
    onSave({ ...draft, aliases: draft.aliasesText.split(',').map(item => item.trim()).filter(Boolean) })
  }
  return <form className="admin-editor" onSubmit={submit}>
    <header><div><span>CATALOG STANDARD</span><h2>{draft.id ? `Edit ${draft.name}` : 'Create skill'}</h2></div><button type="button" className="admin-icon-button" title="Close editor" aria-label="Close editor" onClick={onCancel}><X size={17}/></button></header>
    <div className="admin-form-grid">
      <label>Skill name<input required maxLength={100} value={draft.name} onChange={event => set({ name: event.target.value })}/></label>
      <label>Category<AdminSelect ariaLabel="Skill category" value={draft.category} options={CATEGORIES} onChange={category => set({ category })}/></label>
      <label className="admin-span-2">Aliases<input maxLength={500} value={draft.aliasesText} onChange={event => set({ aliasesText: event.target.value })} placeholder="ReactJS, React.js"/><small>Comma-separated search aliases.</small></label>
      <label className="admin-span-2">Summary<textarea rows={2} maxLength={700} value={draft.summary} onChange={event => set({ summary: event.target.value })}/></label>
      <label>Status<AdminSelect ariaLabel="Skill status" value={draft.status} options={[["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]]} onChange={status => set({ status })}/></label>
      <label>Renewal period<input type="number" min="30" max="730" value={draft.renewalDays} onChange={event => set({ renewalDays: Number(event.target.value) })}/><small>Days before re-verification.</small></label>
    </div>
    <fieldset className="admin-stage-options"><legend>Available stages</legend>{STAGES.map(stage => <label key={stage}><input type="checkbox" checked={draft.stages.includes(stage)} disabled={stage === 'Beginner'} onChange={event => set({ stages: event.target.checked ? [...draft.stages, stage] : draft.stages.filter(item => item !== stage) })}/>{stage}</label>)}</fieldset>
    <label>Initial verification requirements<textarea required={draft.status === 'published'} minLength={draft.status === 'published' ? 20 : 0} rows={5} maxLength={4000} value={draft.verificationInstructions} onChange={event => set({ verificationInstructions: event.target.value })} placeholder="Describe the observable evidence a reviewer must evaluate."/></label>
    <label>Daily practice requirements<textarea rows={3} maxLength={4000} value={draft.practiceInstructions || ''} onChange={event => set({ practiceInstructions: event.target.value })} placeholder="Describe a small repeatable exercise and the fresh evidence required for each practice day."/></label>
    <section className="admin-editor-section"><header><div><h3>Upgrade requirements</h3><p>Define what evidence is required to reach each enabled stage.</p></div></header>
      <div className="admin-requirements">{STAGES.slice(1).filter(stage => draft.stages.includes(stage)).map(stage => <label key={stage}>{stage}<textarea rows={3} maxLength={4000} value={requirement(stage)} onChange={event => setRequirement(stage, event.target.value)}/></label>)}</div>
    </section>
    <section className="admin-editor-section"><header><div><h3>Daily practice library</h3><p>Tasks remain reviewer-checked until an objective evaluator is configured.</p></div><button type="button" className="btn-secondary" onClick={() => set({ dailyTasks: [...draft.dailyTasks, { title: '', instructions: '', kind: 'evidence', reviewMode: 'reviewer', active: true }] })}><Plus size={15}/>Add task</button></header>
      <div className="admin-task-list">{draft.dailyTasks.map((task, index) => <article key={task.id || index}><div><label>Title<input required maxLength={160} value={task.title} onChange={event => updateTask(index, { title: event.target.value })}/></label><label>Type<AdminSelect ariaLabel="Task type" value={task.kind} options={[["evidence", "Evidence"], ["code", "Code"], ["quiz", "Quiz"], ["project", "Project"]]} onChange={kind => updateTask(index, { kind })}/></label><label className="admin-task-active"><input type="checkbox" checked={task.active !== false} onChange={event => updateTask(index, { active: event.target.checked })}/>Active</label><button type="button" className="admin-icon-button" title="Remove task" aria-label="Remove task" onClick={() => removeTask(index)}><X size={16}/></button></div><label>Instructions<textarea required rows={3} maxLength={4000} value={task.instructions} onChange={event => updateTask(index, { instructions: event.target.value })}/></label></article>)}</div>
    </section>
    <footer><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button className="btn-primary" disabled={busy}><Save size={16}/>{busy ? 'Saving...' : 'Save skill standard'}</button></footer>
  </form>
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const token = getAdminSessionToken()
  const initialRole = getAdminSessionRole()
  const [role, setRole] = useState(initialRole)
  const [operator, setOperator] = useState(null)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationRef = useRef(null)
  const menuRef = useRef(null)
  const contentRef = useRef(null)
  useEffect(() => {
    if (!navigationOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const menuButton = menuRef.current
    document.body.style.overflow = 'hidden'
    const sidebar = navigationRef.current
    sidebar.querySelector('button')?.focus()
    const onKeyDown = event => {
      if (event.key === 'Escape') setNavigationOpen(false)
      if (event.key !== 'Tab') return
      const items = [...sidebar.querySelectorAll('button')]
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const media = window.matchMedia('(min-width: 1024px)')
    const onResize = () => { if (media.matches) setNavigationOpen(false) }
    media.addEventListener('change', onResize)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      media.removeEventListener('change', onResize)
      if (!media.matches) menuButton?.focus()
    }
  }, [navigationOpen])
  const [tab, setTab] = useState(() => initialRole === 'admin' ? 'overview' : 'reviews')
  const [overview, setOverview] = useState(null)
  const [skills, setSkills] = useState([])
  const [requests, setRequests] = useState([])
  const [reviewers, setReviewers] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null)
  const [requestDrafts, setRequestDrafts] = useState({})
  const [showRequestDemo, setShowRequestDemo] = useState(true)
  const [showReviewerForm, setShowReviewerForm] = useState(false)
  const [reviewerDraft, setReviewerDraft] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isAdmin = role === 'admin'
  const tabs = isAdmin ? ADMIN_TABS : REVIEW_STAFF_TABS
  const visibleRequests = useMemo(() => showRequestDemo ? [...requests, ...getAdminDemoSkillRequests(status)] : requests, [requests, showRequestDemo, status])
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [editing, tab])

  const signOut = useCallback(async () => {
    clearAdminSession()
    try { await logoutAdmin(token) } catch { /* Local sign out still completes. */ }
    navigate('/admin', { replace: true })
  }, [navigate, token])

  const handleFailure = useCallback(failure => {
    if ([401, 403].includes(failure.status)) { clearAdminSession(); navigate('/admin', { replace: true }); return }
    setError(failure.message || 'Could not load admin workspace')
  }, [navigate])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const identity = await fetchCurrentAdminUser(token)
      const resolvedRole = identity.reviewer?.role || 'reviewer'
      setOperator(identity.reviewer)
      if (resolvedRole !== role) {
        setRole(resolvedRole)
        setAdminSession(token, resolvedRole)
        setTab(resolvedRole === 'admin' ? 'overview' : 'reviews')
      }
      if (resolvedRole !== 'admin' || tab === 'reviews') return
      const summary = await fetchAdminOverview(token)
      setOverview(summary)
      if (tab === 'catalog' || tab === 'requests') {
        const result = await fetchAdminSkills(token, tab === 'catalog' ? { status } : { status: 'published' })
        setSkills(result.skills || [])
      }
      if (tab === 'requests') setRequests((await fetchAdminSkillRequests(token, status === 'all' ? 'pending' : status)).requests || [])
      if (tab === 'reviewers') setReviewers((await fetchAdminReviewers(token)).reviewers || [])
    } catch (failure) { handleFailure(failure) }
    finally { setLoading(false) }
  }, [handleFailure, role, status, tab, token])
  useEffect(() => { load() }, [load])

  const filteredSkills = useMemo(() => skills.filter(skill => !search || `${skill.name} ${skill.aliases.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [search, skills])
  async function saveSkill(payload) {
    setBusy(true); setError('')
    try {
      if (payload.id) await updateAdminSkill(token, payload.id, payload)
      else await createAdminSkill(token, payload)
      setEditing(null); await load()
    } catch (failure) { setError(failure.message || 'Could not save skill') }
    finally { setBusy(false) }
  }
  async function decideRequest(request, decision) {
    if (request.demoData) return
    const draft = requestDrafts[request.id] || {}
    setBusy(true); setError('')
    try {
      await decideAdminSkillRequest(token, request.id, { status: decision, feedback: draft.feedback || '', skillCatalogId: draft.skillCatalogId })
      await load()
    } catch (failure) { setError(failure.message || 'Could not decide request') }
    finally { setBusy(false) }
  }
  async function addReviewer(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await createAdminReviewer(token, reviewerDraft)
      setReviewerDraft({ name: '', email: '', password: '' }); setShowReviewerForm(false); await load()
    } catch (failure) { setError(failure.message || 'Could not create reviewer') }
    finally { setBusy(false) }
  }
  async function setReviewerActive(reviewer) {
    setBusy(true); setError('')
    try { await updateAdminReviewer(token, reviewer.id, { active: !reviewer.active }); await load() }
    catch (failure) { setError(failure.message || 'Could not update reviewer') }
    finally { setBusy(false) }
  }
  async function signOutNow() { await signOut() }

  const metrics = overview?.metrics || {}
  return <main className="admin-shell">
    <header className="admin-topbar"><div><button ref={menuRef} className="admin-icon-button admin-menu-toggle" aria-label="Open admin navigation" aria-expanded={navigationOpen} aria-controls="admin-navigation" onClick={() => setNavigationOpen(true)}><Menu size={19}/></button><SkillBridgeBrand size="compact"/><span>Admin Workspace</span></div><div><small>{isAdmin ? 'Administrator' : 'Review staff'}</small><strong>{operator?.name || overview?.admin?.name}</strong><button className="admin-icon-button" title="Sign out" aria-label="Sign out" onClick={signOutNow}><LogOut size={17}/></button></div></header>
    <div className="admin-body">
      {navigationOpen && <button className="admin-navigation-backdrop" aria-label="Dismiss admin navigation" tabIndex={-1} onClick={() => setNavigationOpen(false)}/>}
      <aside ref={navigationRef} id="admin-navigation" className={`admin-sidebar${navigationOpen ? ' is-open' : ''}`}><button className="admin-icon-button admin-menu-toggle" aria-label="Close admin navigation" onClick={() => setNavigationOpen(false)}><X size={19}/></button><nav aria-label="Admin sections">{tabs.map(([key, label, icon]) => <button key={key} aria-pressed={tab === key} onClick={() => { setTab(key); setEditing(null); setStatus('all'); setNavigationOpen(false) }}>{createElement(icon, { size: 17 })}<span>{label}</span></button>)}</nav><div><ShieldCheck size={17}/><span>{isAdmin ? 'Standards are versioned. Review staff work inside this Admin workspace.' : 'Blind review hides student identity and applies the captured platform standard.'}</span></div></aside>
      <section ref={contentRef} className={`admin-content${tab === 'reviews' ? ' admin-review-content' : ''}`}>
        {tab !== 'reviews' && <header className="admin-heading"><div><span>PLATFORM GOVERNANCE</span><h1>{tabs.find(([key]) => key === tab)?.[1]}</h1></div><button className="admin-icon-button" title="Refresh" aria-label="Refresh" disabled={loading || busy} onClick={load}><RefreshCw size={17}/></button></header>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {isAdmin && tab === 'overview' && <><div className="admin-metrics"><Metric label="Published skills" value={metrics.publishedSkills} icon={BookOpenCheck} tone="green"/><Metric label="Draft standards" value={metrics.draftSkills} icon={Archive} tone="blue"/><Metric label="Skill requests" value={metrics.pendingRequests} icon={ClipboardCheck} tone="amber"/><Metric label="Pending reviews" value={metrics.pendingAssessments} icon={ShieldCheck} tone="red"/><Metric label="Active reviewers" value={metrics.activeReviewers} icon={Users} tone="cyan"/></div><section className="admin-band"><h2>Governance boundary</h2><p>Admins publish the standard. Students submit evidence. Authorized review staff decide against the captured standard inside this workspace. TrustScore remains controlled by the platform policy engine.</p></section></>}
        {tab === 'reviews' && <ReviewQueue token={token} onUnauthorized={handleFailure}/>}
        {tab === 'catalog' && <>
          {editing ? <SkillEditor value={editing} busy={busy} onCancel={() => setEditing(null)} onSave={saveSkill}/> : <>
            <div className="admin-toolbar">
              <label><Search size={16}/><input type="search" placeholder="Search skills or aliases" value={search} onChange={event => setSearch(event.target.value)}/></label>
              <AdminSelect ariaLabel="Catalog status" value={status} options={[["all", "All statuses"], ["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]]} onChange={setStatus}/>
              <button className="btn-primary" onClick={() => setEditing(emptySkill())}><Plus size={16}/>New skill</button>
            </div>
            <div className="admin-table"><div className="admin-table-head"><span>Skill</span><span>Standard</span><span>Status</span><span></span></div>{loading ? <p>Loading catalog...</p> : filteredSkills.map(skill => <button key={skill.id} className="admin-table-row" onClick={() => setEditing(skill)}><span><strong>{skill.name}</strong><small>{skill.category}</small></span><span><small>{skill.dailyTasks.length} daily {skill.dailyTasks.length === 1 ? 'task' : 'tasks'} · {skill.renewalDays} day renewal</small></span><span className={`admin-status admin-status-${skill.status}`}>{skill.status}</span><span>Edit</span></button>)}{!loading && !filteredSkills.length && <p>No catalog skills match this view.</p>}</div>
          </>}
        </>}
        {tab === 'requests' && <><div className="admin-toolbar"><AdminSelect ariaLabel="Request status" value={status} options={[['all', 'Pending requests'], ['approved', 'Approved'], ['merged', 'Merged'], ['rejected', 'Rejected']]} onChange={setStatus}/><label className="admin-demo-toggle"><input type="checkbox" checked={showRequestDemo} onChange={event => setShowRequestDemo(event.target.checked)}/>Demo examples</label></div><div className="admin-request-list">{loading ? <p>Loading requests...</p> : visibleRequests.map(request => { const draft = requestDrafts[request.id] || {}; return <article key={request.id} data-demo={request.demoData ? "true" : undefined}><header><div><strong>{request.requestedName}</strong><span>{request.category}</span></div><time>{formatDate(request.createdAt)}</time></header>{request.note && <p>{request.note}</p>}{request.status === 'pending' ? <div className="admin-request-decision"><label>Published catalog match<AdminSelect ariaLabel="Published catalog match" value={draft.skillCatalogId || ''} options={[['', 'Select skill'], ...skills.map(skill => [skill.id, skill.name])]} onChange={skillCatalogId => setRequestDrafts(current => ({ ...current, [request.id]: { ...draft, skillCatalogId } }))}/></label><label>Decision note<textarea rows={2} maxLength={1000} value={draft.feedback || ''} onChange={event => setRequestDrafts(current => ({ ...current, [request.id]: { ...draft, feedback: event.target.value } }))}/></label><div><button className="btn-secondary" disabled={busy || request.demoData || !draft.feedback?.trim()} onClick={() => decideRequest(request, 'rejected')}>Reject</button><button className="btn-secondary" disabled={busy || request.demoData || !draft.feedback?.trim() || !draft.skillCatalogId} onClick={() => decideRequest(request, 'merged')}>Merge with skill</button><button className="btn-primary" disabled={busy || request.demoData || !draft.feedback?.trim() || !draft.skillCatalogId} onClick={() => decideRequest(request, 'approved')}>Approve</button></div></div> : <p className="admin-request-result">{request.status}: {request.adminFeedback}</p>}</article> })}{!loading && !visibleRequests.length && <p>No requests in this view.</p>}</div></>}
        {tab === 'reviewers' && <><div className="admin-toolbar admin-reviewer-toolbar"><div><strong>Assessment review staff</strong><span>Provision queue-only staff accounts and immediately revoke access when needed.</span></div><button className="btn-primary" onClick={() => setShowReviewerForm(current => !current)}><Plus size={16}/>{showReviewerForm ? 'Close form' : 'New reviewer'}</button></div>
          {showReviewerForm && <form className="admin-reviewer-form" onSubmit={addReviewer}><label>Name<input required maxLength={100} value={reviewerDraft.name} onChange={event => setReviewerDraft(current => ({ ...current, name: event.target.value }))}/></label><label>Email<input required type="email" maxLength={160} value={reviewerDraft.email} onChange={event => setReviewerDraft(current => ({ ...current, email: event.target.value }))}/></label><label>Temporary password<input required type="password" minLength={12} maxLength={200} value={reviewerDraft.password} onChange={event => setReviewerDraft(current => ({ ...current, password: event.target.value }))}/><small>Minimum 12 characters. Share it through a secure channel.</small></label><button className="btn-primary" disabled={busy}>{busy ? 'Creating...' : 'Create reviewer'}</button></form>}
          <div className="admin-table"><div className="admin-table-head admin-reviewer-columns"><span>Reviewer</span><span>Account</span><span>Last sign-in</span><span></span></div>{loading ? <p>Loading reviewers...</p> : reviewers.map(reviewer => <div className="admin-table-row admin-reviewer-columns" key={reviewer.id}><span><strong>{reviewer.name}</strong><small>{reviewer.email}</small></span><span className={`admin-status admin-status-${reviewer.active ? 'published' : 'archived'}`}>{reviewer.active ? 'Active' : 'Inactive'}</span><span>{formatDate(reviewer.lastSignedInAt)}</span><button className="btn-secondary" disabled={busy} onClick={() => setReviewerActive(reviewer)}>{reviewer.active ? 'Suspend' : 'Activate'}</button></div>)}</div></>}
      </section>
    </div>
  </main>
}
