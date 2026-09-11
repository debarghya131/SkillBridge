import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, ExternalLink, LogOut, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { safeExternalUrl } from '../lib/safeExternalUrl'
import { claimReview, clearReviewerSessionToken, fetchCurrentReviewer, fetchReviewQueue, getReviewerSessionToken, logoutReviewer, releaseReview, submitReviewDecision } from './reviewerApi'
import './reviewer.css'

const QUEUES = [['available', 'Available'], ['mine', 'My reviews'], ['completed', 'History']]
const MODES = { verify: 'Verification', reverify: 'Renewal', upgrade: 'Upgrade', retain: 'Daily practice', challenge: 'Challenge' }
const RUBRIC = [['correctness', 'Correctness', 40], ['evidence', 'Evidence quality', 20], ['understanding', 'Understanding', 20], ['testing', 'Testing', 10], ['communication', 'Communication', 10]]
const EMPTY_RUBRIC = { correctness: 0, evidence: 0, understanding: 0, testing: 0, communication: 0 }
const formatDate = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'

export default function ReviewerDashboard() {
  const navigate = useNavigate()
  const token = getReviewerSessionToken()
  const [reviewer, setReviewer] = useState(null)
  const [queue, setQueue] = useState('available')
  const [mode, setMode] = useState('all')
  const [records, setRecords] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [rubric, setRubric] = useState(EMPTY_RUBRIC)
  const [decision, setDecision] = useState('needs_revision')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [identity, result] = await Promise.all([fetchCurrentReviewer(token), fetchReviewQueue(token, { queue, mode, page })])
      setReviewer(identity.reviewer)
      setRecords(result.assessments || [])
      setTotalCount(result.total || 0)
      setSelectedId(current => result.assessments?.some(item => item.id === current) ? current : result.assessments?.[0]?.id || '')
    } catch (failure) {
      if (failure.status === 401) { clearReviewerSessionToken(); navigate('/reviewer', { replace: true }); return }
      setError(failure.message || 'Could not load review queue')
    } finally { setLoading(false) }
  }, [mode, navigate, page, queue, token])
  useEffect(() => { load() }, [load])

  const selected = records.find(item => item.id === selectedId)
  const total = useMemo(() => RUBRIC.reduce((sum, [key,, weight]) => sum + rubric[key] * weight / 5, 0), [rubric])
  useEffect(() => {
    setRubric(selected?.rubric ? { ...EMPTY_RUBRIC, ...selected.rubric } : EMPTY_RUBRIC)
    setFeedback(selected?.feedback || '')
    setDecision('needs_revision')
  }, [selectedId, selected?.feedback, selected?.rubric])

  async function run(action) {
    if (!selected || busy) return
    setBusy(true); setError('')
    try { await action(); await load() }
    catch (failure) { setError(failure.message || 'Action failed') }
    finally { setBusy(false) }
  }

  async function signOut() {
    clearReviewerSessionToken()
    try { await logoutReviewer(token) } catch { /* Local sign out must still complete. */ }
    navigate('/reviewer', { replace: true })
  }

  return <main className="reviewer-shell">
    <header className="reviewer-topbar"><div><ShieldCheck size={24}/><div><strong>SkillBridge Review</strong><span>Blind evidence operations</span></div></div><div><span>{reviewer?.name}</span><button title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={17}/></button></div></header>
    <section className="reviewer-workspace">
      <header className="reviewer-heading"><div><span>ASSESSMENT OPERATIONS</span><h1>Review queue</h1></div><button className="reviewer-icon-button" title="Refresh queue" aria-label="Refresh queue" onClick={load} disabled={loading || busy}><RefreshCw size={17}/></button></header>
      <div className="reviewer-controls"><nav aria-label="Review queues">{QUEUES.map(([key, label]) => <button key={key} aria-pressed={queue === key} onClick={() => { setQueue(key); setPage(1) }}>{label}</button>)}</nav><select aria-label="Assessment type" value={mode} onChange={event => { setMode(event.target.value); setPage(1) }}><option value="all">All assessment types</option>{Object.entries(MODES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="reviewer-privacy"><BadgeCheck size={17}/><span>Blind review active: student name, college, location, profile photo, and TrustScore are not included in this queue.</span></div>
      {error && <p role="alert" className="reviewer-error">{error}</p>}
      <div className="reviewer-layout">
        <aside className="reviewer-list" aria-label="Assessments">
          {loading ? <p>Loading assessments...</p> : records.map(item => <button key={item.id} className={item.id === selectedId ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)}><div><strong>{item.skillName}</strong><span>{MODES[item.mode] || item.mode}</span></div><time>{formatDate(item.createdAt)}</time><small>{item.status.replace('_', ' ')}</small></button>)}
          {!loading && !records.length && <p>No assessments in this queue.</p>}
          {totalCount > 25 && <footer className="reviewer-pagination"><button disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {Math.ceil(totalCount / 25)}</span><button disabled={loading || page * 25 >= totalCount} onClick={() => setPage(value => value + 1)}>Next</button></footer>}
        </aside>
        <section className="reviewer-detail">
          {!selected ? <div className="reviewer-empty">Select an assessment to inspect its evidence.</div> : <>
            <header><div><span>{MODES[selected.mode] || selected.mode}</span><h2>{selected.skillName}{selected.targetStage ? ` · ${selected.targetStage}` : ''}</h2><p>Submitted {formatDate(selected.createdAt)}</p></div><strong className={`reviewer-status reviewer-status-${selected.status}`}>{selected.status.replace('_', ' ')}</strong></header>
            <section><h3>Assigned requirements</h3><p>{selected.brief || 'Use the standard assessment requirements.'}</p></section>
            <section><h3>Student response</h3><p className="reviewer-response">{selected.response}</p>{safeExternalUrl(selected.evidenceLink) && <a href={safeExternalUrl(selected.evidenceLink)} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open submitted evidence</a>}</section>
            {queue === 'available' && <div className="reviewer-actions"><button className="btn-primary" disabled={busy} onClick={() => run(() => claimReview(token, selected.id))}>Claim assessment</button></div>}
            {queue === 'mine' && <section className="reviewer-rubric"><div className="reviewer-rubric-heading"><div><h3>Review rubric</h3><p>Score observable evidence only.</p></div><strong>{total}/100</strong></div>
              <div>{RUBRIC.map(([key, label, weight]) => <label key={key}><span>{label}<small>{weight}%</small></span><select value={rubric[key]} onChange={event => setRubric(current => ({ ...current, [key]: Number(event.target.value) }))}>{[0,1,2,3,4,5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div>
              <fieldset className="reviewer-decision"><legend>Decision</legend><div>
                <button type="button" className="is-approve" aria-pressed={decision === 'approved'} onClick={() => setDecision('approved')}>Approve</button>
                <button type="button" className="is-revision" aria-pressed={decision === 'needs_revision'} onClick={() => setDecision('needs_revision')}>Request revision</button>
                <button type="button" className="is-reject" aria-pressed={decision === 'rejected'} onClick={() => setDecision('rejected')}>Reject</button>
              </div></fieldset>
              <label className="reviewer-feedback">Feedback<textarea rows={4} maxLength={2000} required value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="Give specific, actionable evidence-based feedback."/><small>{feedback.length}/2000</small></label>
              <div className="reviewer-actions"><button className="btn-secondary" disabled={busy} onClick={() => run(() => releaseReview(token, selected.id))}><RotateCcw size={15}/>Release</button><button className="btn-primary" disabled={busy || !feedback.trim() || decision === 'approved' && total < 70} onClick={() => run(() => submitReviewDecision(token, selected.id, { status: decision, feedback, rubric }))}>{busy ? 'Saving...' : 'Submit decision'}</button></div>
              {decision === 'approved' && total < 70 && <p className="reviewer-score-warning">Approval requires at least 70/100.</p>}
            </section>}
            {queue === 'completed' && selected.rubric && <section><h3>Recorded decision</h3><p><strong>{selected.rubric.total}/100</strong> · {selected.feedback}</p></section>}
          </>}
        </section>
      </div>
    </section>
  </main>
}
