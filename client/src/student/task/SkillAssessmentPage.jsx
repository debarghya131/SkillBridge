import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardList, Clock3, ExternalLink, RefreshCw, Send } from 'lucide-react'
import { fetchSkillAssessments, fetchStudentSkillHub, getStudentSessionToken, submitSkillAssessment } from '../studentApi'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import { safeExternalUrl } from '../../lib/safeExternalUrl'
import { readTaskDraft, taskDraftKey } from './taskDraft'

const MODES = { verify: 'Verification', reverify: 'Re-verification', upgrade: 'Level upgrade', retain: 'Retention', challenge: 'Challenge' }
const STATUS = { pending: 'Awaiting review', needs_revision: 'Revision requested', approved: 'Approved', rejected: 'Not approved' }
const getIndiaDateKey = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)

export default function SkillAssessmentPage({ context }) {
  const isDemo = context.demoData === true
  const demoAssessment = context.demoAssessment || null
  const [tab, setTab] = useState('Submission')
  const [history, setHistory] = useState(() => demoAssessment ? [demoAssessment] : [])
  const [hub, setHub] = useState(null)
  const [response, setResponse] = useState(() => demoAssessment?.response || '')
  const [evidenceLink, setEvidenceLink] = useState(() => demoAssessment?.evidenceLink || '')
  const [revisionId, setRevisionId] = useState(() => demoAssessment?.status === 'needs_revision' ? demoAssessment.id : '')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [draftKey, setDraftKey] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const [today, setToday] = useState('')
  const operation = useRef(false)
  const mode = context.mode || 'verify'
  const targetStage = context.targetStage
  const matchesContext = useCallback(item => item.skillName.toLowerCase() === context.skillName.toLowerCase()
    && item.mode === mode && (mode !== 'upgrade' || item.targetStage === targetStage)
    && (mode !== 'challenge' || item.challengeId === Number(context.challengeId)), [context.challengeId, context.skillName, mode, targetStage])
  const matching = history.filter(matchesContext)
  const daily = ['retain', 'challenge'].includes(mode)
  const pending = matching.some(item => item.status === 'pending' && (!daily || !today || item.earnedDay === today))

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (isDemo) {
        setHistory(demoAssessment ? [demoAssessment] : [])
        setResponse(demoAssessment?.response || '')
        setEvidenceLink(demoAssessment?.evidenceLink || '')
        setRevisionId(demoAssessment?.status === 'needs_revision' ? demoAssessment.id : '')
        setLoading(false)
        return
      }
      const currentDay = getIndiaDateKey()
      setToday(currentDay)
      setLoading(true)
      setError('')
      try {
        const token = getStudentSessionToken()
        const [result, skillsResult] = await Promise.all([fetchSkillAssessments(token), fetchStudentSkillHub(token)])
        if (cancelled) return
        const serverHistory = result.assessments || []
        const revision = serverHistory.find(item => matchesContext(item) && item.status === 'needs_revision'
          && (!['retain', 'challenge'].includes(mode) || item.earnedDay === currentDay))
        setHub(skillsResult.skillHub)
        setHistory(serverHistory)
        try {
          const key = await taskDraftKey(token, ['skill', context.skillName, mode, targetStage, context.challengeId,
            ...(['retain', 'challenge'].includes(mode) ? [currentDay] : [])])
          if (cancelled) return
          const draft = readTaskDraft(sessionStorage, key, 'skill-v1')
          if (draft) {
            setResponse(draft.submissionContent)
            setEvidenceLink(draft.submissionLink)
            setRevisionId(revision?.id || draft.note)
          } else if (revision) {
            setResponse(revision.response || '')
            setEvidenceLink(revision.evidenceLink || '')
            setRevisionId(revision.id)
          }
          setDraftKey(key)
        } catch { /* Draft storage is optional. */ }
      } catch (failure) { if (!cancelled) setError(failure.message || 'Could not load assessments') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [context.skillName, context.challengeId, demoAssessment, isDemo, matchesContext, mode, targetStage, retry])

  useEffect(() => {
    if (isDemo || !draftKey || loading || busy) return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ version: 'skill-v1', savedAt: Date.now(), submissionContent: response, submissionLink: evidenceLink, note: revisionId }))
      setDraftNotice('Draft saved in this browser tab')
    } catch { setDraftNotice('Draft could not be saved on this device') }
  }, [draftKey, response, evidenceLink, revisionId, loading, busy, isDemo])

  async function submit(event) {
    event.preventDefault()
    if (isDemo || operation.current || pending) return
    operation.current = true
    setBusy(true)
    setError('')
    try {
      const result = await submitSkillAssessment(getStudentSessionToken(), { id: revisionId || undefined, skillName: context.skillName, mode,
        targetStage, challengeId: context.challengeId, evidenceLink, response })
      if (!result.assessment?.id) throw new Error('The submission was not confirmed. Refresh history before retrying.')
      setHistory(current => [result.assessment, ...current.filter(item => item.id !== result.assessment.id)])
      setResponse(''); setEvidenceLink(''); setRevisionId(''); setTab('History')
      try { sessionStorage.removeItem(draftKey) } catch { /* Submission is safely stored on the server. */ }
    } catch (failure) { setError(failure.message || 'Submission failed') }
    finally { operation.current = false; setBusy(false) }
  }

  return <section className="skill-assessment">
    <header className="assessment-heading"><div><span className="assessment-eyebrow">Skill assessment</span><h1>{context.skillName}</h1><p>{MODES[mode] || 'Assessment'}{mode === 'upgrade' ? `: ${targetStage}` : ''}</p></div>
      <button type="button" className="btn-secondary" title="Refresh assessments" aria-label="Refresh assessments" disabled={busy || loading} onClick={() => setRetry(value => value + 1)}><RefreshCw size={18} /></button>
    </header>
    <nav className="company-section-tabs" aria-label="Assessment views">{['Submission', 'History'].map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</button>)}</nav>
    {error && <p role="alert" className="work-error">{error}</p>}
    {loading ? <DashboardSkeleton section="tasks" /> : tab === 'Submission' ? <div className="assessment-layout">
      <section className="assessment-brief"><h2><ClipboardList size={18} /> Evidence requirements</h2>
        {mode === 'challenge' && <p>{hub?.challenges?.find(item => item.id === Number(context.challengeId))?.instructions}</p>}
        {mode === 'upgrade' && <p>Demonstrate {targetStage} proficiency with evidence appropriate to that level.</p>}
        <ul><li>Provide an original example of your {context.skillName} work.</li><li>Describe the problem, your approach, and your contribution.</li><li>Include test results or other evidence, limitations, and improvements.</li></ul>
        <p className="work-muted">Human review required. Verification and TrustScore changes occur only after approval.</p>
      </section>
      <form className="assessment-form" onSubmit={submit}>
        {pending ? <div className="assessment-awaiting" role="status"><Clock3 size={22} /><div><strong>Submission under review</strong><p>Your evidence has been received and is awaiting a reviewer decision.</p></div></div> : <fieldset disabled={busy || isDemo}>
          {revisionId && <p>Revising a reviewed assessment</p>}
          <label>Evidence link (optional)<input type="url" maxLength={500} value={evidenceLink} onChange={event => setEvidenceLink(event.target.value)} placeholder="https://github.com/yourname/project" /></label>
          <label>Your response<textarea aria-label="Your response" required minLength={50} maxLength={10000} rows={10} value={response} onChange={event => setResponse(event.target.value)} /></label>
          <small>{response.length} / 10,000 characters</small>
          {!isDemo && <><button type="submit" className="btn-primary" disabled={busy || response.trim().length < 50}><Send size={16} /> {busy ? 'Submitting...' : revisionId ? 'Resubmit for review' : 'Submit for review'}</button><p role="status" className="work-muted">{draftNotice}</p></>}
        </fieldset>}
      </form>
    </div> : <section className="assessment-history">
      {!matching.length && <p>No assessment submissions yet.</p>}
      {matching.map(item => <article key={item.id} className={`assessment-history-item status-${item.status}`}><header><div><span className={`assessment-status status-${item.status}`}>{STATUS[item.status]}</span><small>Assessment submission</small></div><time>{new Date(item.createdAt).toLocaleString('en-IN')}</time></header>
        {safeExternalUrl(item.evidenceLink) && <a className="assessment-evidence-link" href={safeExternalUrl(item.evidenceLink)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open submitted evidence</a>}
        <details><summary>Submitted response</summary><p>{item.response}</p></details>
        {item.feedback && <p><strong>Review feedback:</strong> {item.feedback}</p>}
        {item.rubric?.total != null && <p><strong>Evidence score:</strong> {item.rubric.total}/100</p>}
        {item.brief && <details><summary>Assigned requirements</summary><p>{item.brief}</p></details>}
        {item.status === 'approved' && <p>Trust awarded: {item.rewardPoints || 0}</p>}
        {item.reviewHistory?.length > 1 && <details><summary>Previous reviews</summary>{item.reviewHistory.slice(0, -1).map((review, index) => <p key={index}>{new Date(review.reviewedAt).toLocaleDateString('en-IN')}: {review.feedback}</p>)}</details>}
        {item.status === 'needs_revision' && !pending && !isDemo && <button className="btn-secondary" disabled={busy} onClick={() => { setRevisionId(item.id); setResponse(item.response); setEvidenceLink(item.evidenceLink); setTab('Submission') }}>Revise submission</button>}
      </article>)}
    </section>}
  </section>
}
