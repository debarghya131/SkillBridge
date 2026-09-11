import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, ArrowUpCircle, BadgeCheck, ChartNoAxesCombined, Flame, Plus, RefreshCw, X, Zap } from 'lucide-react'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import { fetchStudentSkillHub, saveStudentSkillHub, fetchSkillAssessments, getStudentSessionToken } from '../studentApi'
import DailyChallenge, { PracticeStreak } from './Dailychallenge'
import SkillGapReport from './skillgapreport'
import './SkillHub.css'

const TABS = [
  ['myskills', 'My Skills', Award], ['upgrade', 'Upgrade Your Skill', ArrowUpCircle],
  ['verify', 'Verify Your Skill', BadgeCheck], ['daily', 'Daily Task', Zap], ['streak', 'Streak', Flame], ['gap', 'Skill Gap Report', ChartNoAxesCombined],
]
const CATEGORIES = ['Frontend', 'Backend', 'Design', 'Analytics', 'Marketing', 'Other']
const STATUS = { valid: 'Verified', due: 'Renew soon', expired: 'Expired', unverified: 'Unverified' }
const REVIEW_STATUS = { pending: 'Awaiting review', needs_revision: 'Revision requested', approved: 'Approved', rejected: 'Not approved' }
const LOG_LABELS = { created: 'Skill added', expired: 'Verification expired', verify_completed: 'Skill verified',
  reverify_completed: 'Verification renewed', upgrade_completed: 'Level upgraded', retention_completed: 'Practice approved', challenge_completed: 'Challenge approved' }
const date = value => value && value !== '-' ? new Date(value.length === 10 ? value + 'T00:00:00' : value).toLocaleDateString('en-IN') : 'Not set'
const activeSkill = skill => skill.verified && ['valid', 'due'].includes(skill.renewalStatus)

export default function SkillHub({ onProfileChange }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('myskills')
  const [data, setData] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ name: '', category: 'Frontend' })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const loadVersion = useRef(0)

  const load = useCallback(async () => {
    const version = ++loadVersion.current
    setRefreshing(true)
    try {
      const token = getStudentSessionToken()
      const [hub, history] = await Promise.all([fetchStudentSkillHub(token), fetchSkillAssessments(token)])
      if (version !== loadVersion.current) return
      if (!hub.skillHub || !Array.isArray(hub.skillHub.skills)) throw new Error('Skill Hub returned an invalid response.')
      setData(hub.skillHub)
      setAssessments(history.assessments || [])
      onProfileChange?.(hub.skillHub)
      setError('')
    } catch (failure) { if (version === loadVersion.current) setError(failure.message || 'Could not load Skill Hub.') }
    finally { if (version === loadVersion.current) { setLoading(false); setRefreshing(false) } }
  }, [onProfileChange])

  const invalidateLoad = useCallback(() => { loadVersion.current++ }, [])
  useEffect(() => { load(); return invalidateLoad }, [load, invalidateLoad])
  useEffect(() => {
    const refresh = () => { if (!busy && !showAdd && document.visibilityState === 'visible') load() }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [load, busy, showAdd])

  async function addSkill(event) {
    event.preventDefault()
    if (busy || refreshing) return
    setBusy(true); setError('')
    try {
      if (data.skills.some(skill => skill.name.toLowerCase() === draft.name.trim().toLowerCase())) throw new Error('This skill is already on your profile.')
      const result = await saveStudentSkillHub(getStudentSessionToken(), { skills: [draft] })
      setData(current => ({ ...current, ...result.skillHub, skillHubState: { ...current.skillHubState, ...result.skillHub.skillHubState } }))
      onProfileChange?.(result.skillHub)
      setDraft({ name: '', category: 'Frontend' }); setShowAdd(false)
      await load()
    } catch (failure) { setError(failure.message || 'Could not add this skill.') }
    finally { setBusy(false) }
  }

  const openAssessment = (skill, mode, extra = {}) => {
    navigate('/student/task', { state: { skillName: skill.name, category: skill.category, mode, returnSection: 'skillhub', ...extra } })
  }
  if (loading) return <DashboardSkeleton section="skillhub" />
  if (!data) return <section className="skillhub-page"><p role="alert" className="work-error">{error}</p><button className="btn-secondary" onClick={load}>Retry</button></section>

  const skills = data.skills
  const verified = skills.filter(activeSkill)
  const statusCounts = {
    all: skills.length,
    verified: verified.length,
    due: skills.filter(skill => skill.renewalStatus === 'due').length,
    expired: skills.filter(skill => skill.renewalStatus === 'expired').length,
    unverified: skills.filter(skill => skill.renewalStatus === 'unverified').length,
  }
  const queue = skills.filter(skill => !activeSkill(skill) || skill.renewalStatus === 'due')
  const upgrades = verified.filter(skill => skill.stage !== 'Pro')
  const filtered = skills.filter(skill => skill.name.toLowerCase().includes(search.toLowerCase())
    && (filter === 'all' || filter === 'verified' && activeSkill(skill) || skill.renewalStatus === filter))
  const logs = data.skillHubState?.skillLog || []

  const skillRow = (skill, mode) => {
    const targetStage = skill.stage === 'Beginner' ? 'Intermediate' : 'Pro'
    const relevant = assessments.find(item => item.skillName.toLowerCase() === skill.name.toLowerCase() && item.mode === mode
      && (mode !== 'upgrade' || item.targetStage === targetStage) && ['pending', 'needs_revision'].includes(item.status))
    return <article className="sh-skill" key={skill.name}>
      <div className="sh-skill-main"><strong>{skill.name}</strong>
        <div className="sh-meta"><span className={`sh-status sh-status-${skill.renewalStatus}`}>{STATUS[skill.renewalStatus]}</span>
          <span>{skill.category}</span><span>{activeSkill(skill) ? skill.stage : 'No active verified level'}</span></div>
        {activeSkill(skill) && <span className={`sh-inline-streak${skill.streak ? ' is-active' : ''}`}><Flame size={14}/>{skill.streak || 0} day streak{skill.longestStreak ? ` · Best ${skill.longestStreak}` : ''}</span>}
        <small>{skill.renewalDue !== '-' ? `Verification ${skill.renewalStatus === 'expired' ? 'expired' : 'expires'} ${date(skill.renewalDue)}` : 'No verification yet'}</small>
      </div>
      {mode && <button type="button" className="btn-secondary" onClick={() => openAssessment(skill, mode, mode === 'upgrade' ? { targetStage } : {})}>
        {relevant ? REVIEW_STATUS[relevant.status] : mode === 'upgrade' ? `Upgrade to ${targetStage}` : mode === 'reverify' ? 'Renew verification' : 'Submit evidence'}
      </button>}
      {!mode && activeSkill(skill) && <BadgeCheck size={20} aria-label="Verified skill" />}
    </article>
  }

  return <section className="skillhub-page">
    <header className="sh-toolbar">
      <nav className="sh-tabs" aria-label="Skill Hub sections">{TABS.map(([key, label, icon]) => {
        const Icon = icon
        return <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}><Icon size={17} />{label}</button>
      })}</nav>
      <button type="button" className="btn-secondary sh-refresh" title="Refresh Skill Hub" aria-label="Refresh Skill Hub" disabled={refreshing || busy} onClick={load}><RefreshCw size={18} /></button>
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
            </div>
            <button className="btn-primary" onClick={() => setShowAdd(true)} disabled={skills.length >= 100}><Plus size={16}/>Add skill</button>
          </header>
          {showAdd && <form className="sh-add-form" onSubmit={addSkill}><fieldset disabled={busy || refreshing}>
            <label>Skill name<input required maxLength={100} autoFocus value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
            <label>Category<select aria-label="Category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
            <div className="sh-actions"><button className="btn-primary" type="submit">{busy ? 'Saving...' : 'Add skill'}</button><button className="btn-secondary" type="button" aria-label="Cancel adding skill" title="Cancel" onClick={() => setShowAdd(false)}><X size={17}/></button></div>
          </fieldset></form>}
          <div className="sh-filters"><input type="search" aria-label="Search skills" placeholder="Search skills" value={search} onChange={event => setSearch(event.target.value)}/>
            <select aria-label="Skill status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option><option value="verified">Verified</option><option value="due">Renew soon</option><option value="expired">Expired</option><option value="unverified">Unverified</option></select></div>
          <div className="sh-list">{filtered.length ? filtered.map(skill => skillRow(skill)) : <div className="sh-empty">
            <p>{skills.length ? 'No matching skills.' : 'No skills added yet.'}</p>
            {!skills.length && <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16}/>Add your first skill</button>}
          </div>}</div>
        </section>
        <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Audit trail</span><h2>Skill Activity</h2></div><span>{logs.length} {logs.length === 1 ? 'event' : 'events'}</span></header>
          <div className="sh-list">{logs.length ? logs.map((item, index) => <article className="sh-activity" key={item.assessmentId || `${item.occurredAt}:${index}`}>
            <div><strong>{item.skillName}</strong><p>{LOG_LABELS[item.eventType] || item.eventType}</p><time>{date(item.occurredAt)}</time></div>
            {Number(item.points) !== 0 && <span className={item.points < 0 ? 'sh-negative' : 'sh-positive'}>{item.points > 0 ? '+' : ''}{item.points} Trust</span>}
          </article>) : <div className="sh-empty"><p>No skill activity yet.</p><small>Verified assessments and approved practice will appear here.</small></div>}</div>
        </section>
      </div>}
      {(tab === 'verify' || tab === 'upgrade') && <div className="sh-columns">
        <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Available actions</span><h2>{tab === 'verify' ? 'Verification & Renewal' : 'Level Upgrades'}</h2></div></header>
          <p className="sh-policy">{tab === 'verify' ? `Approved verification: +${data.rewards.verify} Trust. Renewal: +${data.rewards.reverify} Trust. Valid for 365 days.` : `Approved next-level assessment: +${data.rewards.upgrade} Trust, once per skill level.`}</p>
          <div className="sh-list">{(tab === 'verify' ? queue : upgrades).map(skill => skillRow(skill, tab === 'upgrade' ? 'upgrade' : skill.renewalStatus === 'unverified' ? 'verify' : 'reverify'))}
            {!(tab === 'verify' ? queue : upgrades).length && <p className="sh-empty">{tab === 'verify' ? 'No skills awaiting verification or renewal.' : 'No eligible level upgrades.'}</p>}</div>
        </section>
        <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Review status</span><h2>Assessment History</h2></div></header><div className="sh-list">
          {assessments.map(item => <article className={`sh-assessment sh-assessment-${item.status}`} key={item.id}><header><strong>{item.skillName}</strong><span>{REVIEW_STATUS[item.status]}</span></header>
            <p className="sh-assessment-meta">{item.mode}{item.targetStage ? ` / ${item.targetStage}` : ''} · {date(item.createdAt)}</p>
            {item.feedback && <p className="sh-assessment-feedback">{item.feedback}</p>}
            <footer><small>{item.status === 'approved' ? `Trust awarded: ${item.rewardPoints || 0}` : item.status === 'pending' ? 'Awaiting platform review' : item.status === 'needs_revision' ? 'Revision requested' : 'No Trust awarded'}</small>
              <button type="button" className="btn-secondary" onClick={() => openAssessment({ name: item.skillName }, item.mode, { targetStage: item.targetStage, challengeId: item.challengeId })}>View assessment</button></footer>
          </article>)}
          {!assessments.length && <p className="sh-empty">No assessments submitted yet.</p>}
        </div></section>
      </div>}
      {tab === 'daily' && <DailyChallenge skills={skills} skillHubState={data.skillHubState} challenges={data.challenges} rewards={data.rewards} assessments={assessments}/>}
      {tab === 'streak' && <PracticeStreak skills={skills} skillHubState={data.skillHubState}/>}
      {tab === 'gap' && <SkillGapReport skillHubState={data.skillHubState}/>}
    </div>
  </section>
}
