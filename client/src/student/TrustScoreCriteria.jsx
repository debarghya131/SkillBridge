import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const TIERS = [
  ['0-500', 'Foundation', 'Base credit counts at 100%. Build reviewed skills and reliable practice.'],
  ['501-700', 'Skilled', '2 active verified skills required. Base credit above 500 counts at 40%.'],
  ['701-899', 'Proven', '1 active Pro or Pro Mastery skill, 2 completed GIGs and 30 approved practice days required. Base credit above 1000 counts at 20%.'],
  ['900-1000', 'Distinguished', '2 active Pro Mastery skills, 5 completed GIGs, 90 approved practice days and 10 high-quality reviewed assessments required. Base credit above 2000 counts at 10%; 3000 eligible base points are needed for 1000 before penalties.'],
]
const RULES = [
  ['Skill Hub', 'Challenge approved', '+80', 'Once per submission day across all challenges.'],
  ['Skill Hub', 'Practice approved', '+20', 'Once per submission day across all skills. Practice and challenges share a 500-base-point lifetime cap.'],
  ['Skills', 'Skill verified', '+60', 'Once per skill after evidence approval.'],
  ['Skills', 'Next level approved', '+100', 'Once per skill and target level.'],
  ['Skills', 'Verification renewed', '+50', 'Once per renewal cycle. Skill credits share a 1500-base-point cap.'],
  ['Quality', 'Assessment approved at 90%+', '+25', 'Complete rubric from an assigned reviewer; once per assessment. Quality credit cap: 500.'],
  ['Consistency', '30 distinct practice days', '+25', 'One milestone per 30 approved days, up to 240 days. Consecutive days are not required. Cap: 200.'],
  ['GIG Center', 'GIG completed', '+150', 'Approved work with company-recorded payment, once per submission. Cap: 1500. Payment is company-reported, not bank-verified.'],
  ['Penalty', 'Reviewed skill expires', '-80', 'Once per expiry cycle. Losing active verification can also lower your tier ceiling.'],
  ['Penalty', 'Rejected assessment below 40%', '-10', 'Only with a completed rubric from an assigned reviewer. At most once per original submission day; pending work and revision requests carry no penalty.'],
  ['Profile / Network', 'Uploads, links, follows, invitations or team joins', '0', 'Participation alone is not proof of contribution. Submit original collaborative work through a reviewed skill assessment or GIG workflow.'],
  ['Streaks', 'Missed practice or login', '0', 'A missed day breaks the streak, not your score. No popularity or absence penalties.'],
]

export function TrustScoreCriteriaContent() {
  return <div className="trustscore-criteria-content" style={{ maxWidth: 1040, margin: '0 auto', padding: 20 }}>
    <h2>TrustScore policy v2</h2>
    <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>TrustScore measures reviewed evidence, not personal worth or passion. Base credits are capped and weighted; the public score is 0-1000. Historical ledger entries remain available, but unreviewed profile credits no longer count. Dated penalties affect the score for 90 days and are not discounted at higher tiers. Undated legacy penalties remain counted. Expired skills still cannot satisfy active-skill requirements.</p>
    <section aria-label="Score tiers">{TIERS.map(([range, name, description]) => <div key={name} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: 16, margin: '0 0 8px' }}>{range}: {name}</h3><p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{description}</p></div>)}</section>
    <h3 style={{ marginTop: 26 }}>Credits and penalties</h3>
    {RULES.map(([category, label, points, detail]) => <div className="trustscore-criteria-rule" key={label} style={{ display: 'flex', gap: 16, justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div><small style={{ color: 'var(--muted)' }}>{category}</small><h4 style={{ margin: '5px 0' }}>{label}</h4><p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{detail}</p></div>
      <strong style={{ color: points.startsWith('-') ? '#b91c1c' : '#047857', flexShrink: 0 }}>{points}</strong>
    </div>)}
    <p style={{ fontSize: 13, lineHeight: 1.7, marginTop: 22 }}>Review feedback and rubric explain assessment decisions. Rejected evidence can be improved and submitted as a new assessment. Reports, accusations, and peer ratings never automatically deduct points. This version does not provide an appeal or penalty-reversal workflow.</p>
  </div>
}

export default function TrustScoreCriteria() {
  const navigate = useNavigate()
  return <main className="trustscore-criteria-page"><button className="btn-secondary" onClick={() => navigate('/student/dashboard?section=trustscore')}><ArrowLeft size={16}/>Back to TrustScore</button><TrustScoreCriteriaContent/></main>
}
