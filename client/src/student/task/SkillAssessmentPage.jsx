import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardList, Clock3, ExternalLink, RefreshCw, Send } from 'lucide-react'
import { fetchSkillAssessments, fetchStudentSkillHub, getStudentSessionToken, submitSkillAssessment } from '../studentApi'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import { safeExternalUrl } from '../../lib/safeExternalUrl'
import { readTaskDraft, taskDraftKey } from './taskDraft'
import { clearAllStudentSectionCache } from '../sectionCache'

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
  const [loaded, setLoaded] = useState(false)
  const operation = useRef(false)
  const mode = context.mode || 'verify'
  const targetStage = context.targetStage
  const matchesContext = useCallback(item => item.skillName.toLowerCase() === context.skillName.toLowerCase()
    && item.mode === mode && (mode !== 'upgrade' || item.targetStage === targetStage)
    && (mode !== 'challenge' || String(item.challengeId) === String(context.challengeId)), [context.challengeId, context.skillName, mode, targetStage])
  const matching = history.filter(matchesContext).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const selected = matching.find(item => item.id === (revisionId || context.assessmentId))
  const skill = hub?.skills?.find(item => !item.demoData && item.name.toLowerCase() === context.skillName.toLowerCase())
  const currentChallenge = hub?.challenges?.find(item => String(item.id) === String(context.challengeId))
  const currentInstructions = mode === 'challenge' ? currentChallenge?.instructions
    : mode === 'upgrade' ? skill?.upgradeRequirements?.find(item => item.stage === targetStage)?.instructions
      : mode === 'retain' ? skill?.practiceInstructions || `Complete a small original ${context.skillName} practice exercise. Explain what you practiced, include reproducible results or an inspectable artifact, and identify one improvement. Use fresh evidence for each practice day.`
        : skill?.verificationInstructions
  const assignedInstructions = selected?.criteriaSnapshot?.instructions || currentInstructions || context.instructions
  const daily = ['retain', 'challenge'].includes(mode)
  const pending = selected?.status === 'pending' || !revisionId && matching.some(item => item.status === 'pending' && (!daily || !today || item.earnedDay === today))
  const dailyTaken = !revisionId && daily && history.some(item => !item.demoData && item.mode === mode && item.earnedDay === today && ['approved', 'pending', 'needs_revision'].includes(item.status))

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (isDemo) {
        setHistory(demoAssessment ? [demoAssessment] : [])
        setResponse(demoAssessment?.response || '')
        setEvidenceLink(demoAssessment?.evidenceLink || '')
        setRevisionId(demoAssessment?.status === 'needs_revision' ? demoAssessment.id : '')
        setLoading(false)
        setLoaded(true)
        return
      }
      setLoading(true)
      setLoaded(false)
      setError('')
      try {
        const token = getStudentSessionToken()
        const [result, skillsResult] = await Promise.all([fetchSkillAssessments(token), fetchStudentSkillHub(token)])
        if (cancelled) return
        const currentDay = skillsResult.skillHub?.skillHubState?.daily?.date || getIndiaDateKey()
        setToday(currentDay)
        const serverHistory = (result.assessments || []).filter(item => !item.demoData)
        const revision = serverHistory.find(item => matchesContext(item) && item.status === 'needs_revision'
          && (context.assessmentId ? item.id === context.assessmentId : !['retain', 'challenge'].includes(mode) || item.earnedDay === currentDay))
        setHub(skillsResult.skillHub)
        setHistory(serverHistory)
        setRevisionId(revision?.id || '')
        setResponse(revision?.response || '')
        setEvidenceLink(revision?.evidenceLink || '')
        if (context.assessmentId && !revision) setTab('History')
        setLoaded(true)
        try {
          const key = await taskDraftKey(token, ['skill', context.skillName, mode, targetStage, context.challengeId,
            ...(['retain', 'challenge'].includes(mode) ? [revision?.earnedDay || currentDay] : [])])
          if (cancelled) return
          const draft = readTaskDraft(sessionStorage, key, 'skill-v1')
          if (draft) {
            setResponse(draft.submissionContent)
            setEvidenceLink(draft.submissionLink)
            setRevisionId(revision?.id || '')
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
  }, [context.skillName, context.challengeId, context.assessmentId, demoAssessment, isDemo, matchesContext, mode, targetStage, retry])

  useEffect(() => {
    if (isDemo || !draftKey || loading || busy) return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ version: 'skill-v1', savedAt: Date.now(), submissionContent: response, submissionLink: evidenceLink, note: revisionId }))
      setDraftNotice('Draft saved in this browser tab')
    } catch { setDraftNotice('Draft could not be saved on this device') }
  }, [draftKey, response, evidenceLink, revisionId, loading, busy, isDemo])

  async function submit(event) {
    event.preventDefault()
    if (isDemo || operation.current || pending || dailyTaken || !loaded) return
    operation.current = true
    setBusy(true)
    setError('')
    try {
      const result = await submitSkillAssessment(getStudentSessionToken(), { id: revisionId || undefined, skillName: context.skillName, mode,
        targetStage, challengeId: context.challengeId, catalogVersion: skill?.catalogVersion, evidenceLink, response })
      if (!result.assessment?.id) throw new Error('The submission was not confirmed. Refresh history before retrying.')
      setHistory(current => [result.assessment, ...current.filter(item => item.id !== result.assessment.id)])
      clearAllStudentSectionCache(getStudentSessionToken())
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
        {mode === 'challenge' && <p>{assignedInstructions}</p>}
        {mode === 'upgrade' && <p>Demonstrate {targetStage} proficiency with evidence appropriate to that level.</p>}
        {mode !== 'challenge' && assignedInstructions && <p>{assignedInstructions}</p>}
        <ul><li>Provide an original example of your {context.skillName} work.</li><li>Describe the problem, your approach, and your contribution.</li><li>Include test results or other evidence, limitations, and improvements.</li></ul>
        <p className="work-muted">Human review required. Approved work earns base credits; TrustScore gains depend on caps and evidence tiers. Practice counts toward its original submission day after approval.</p>
        <p className="work-muted">Approval requires 70/100 overall and at least 3/5 each for correctness, evidence, and understanding. A rejected assessment below 40/100 carries a 10-point penalty, at most once per submission day.</p>
        {(selected?.catalogVersion || skill?.catalogVersion) && <p>Platform standard v{selected?.catalogVersion || skill.catalogVersion}</p>}
      </section>
      <form className="assessment-form" onSubmit={submit}>
        {pending || dailyTaken ? <div className="assessment-awaiting" role="status"><Clock3 size={22} /><div><strong>{pending ? 'Submission under review' : 'Today\'s submission is already recorded'}</strong><p>{pending ? 'Your evidence has been received and is awaiting a reviewer decision.' : 'One practice submission and one challenge submission are available per IST day.'}</p></div></div> : <fieldset disabled={busy || isDemo || !loaded}>
          {revisionId && <p>Revising the submission from {selected?.earnedDay}. {selected?.feedback}</p>}
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
        {['approved', 'rejected'].includes(item.status) && <p>Base credit change: {item.rewardPoints || 0}{item.trustScoreChange != null && <> · TrustScore change: {item.trustScoreChange > 0 ? '+' : ''}{item.trustScoreChange}</>}</p>}
        {item.rewardBreakdown?.length > 0 && <details><summary>Credit details</summary>{item.rewardBreakdown.map((entry, index) => <p key={index}>{entry.type.replaceAll('_', ' ')}: {entry.points > 0 ? '+' : ''}{entry.points}</p>)}</details>}
        {item.reviewHistory?.length > 1 && <details><summary>Previous reviews</summary>{item.reviewHistory.slice(0, -1).map((review, index) => <p key={index}>{new Date(review.reviewedAt).toLocaleDateString('en-IN')}: {review.feedback}</p>)}</details>}
        {item.status === 'needs_revision' && !isDemo && <button className="btn-secondary" disabled={busy} onClick={() => { setRevisionId(item.id); setResponse(item.response); setEvidenceLink(item.evidenceLink); setTab('Submission') }}>Revise submission</button>}
      </article>)}
    </section>}
  </section>
}
