import { useState } from 'react'
import { ShieldCheck, ArrowUpRight, ArrowDownRight, Check, LockKeyhole, ArrowRight, Activity } from 'lucide-react'
import './TrustScoreOverview.css'

export default function TrustScoreOverview({ score, policy, earnedPoints, penalties, approvedActions, activity, factors, demoActivity = [], demoPenalties = [], onCriteria, formatDate }) {
  const [view, setView] = useState('Activity')
  const tiers = policy?.tiers || []
  const realRows = view === 'Activity'
    ? activity
    : factors.filter(item => view === 'Penalties'
      ? item.category === 'Penalty' && item.earned
      : item.category !== 'Penalty')
  const previewRows = view === 'Activity'
    ? [...demoActivity].sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt))
    : view === 'Penalties' ? demoPenalties : []
  const rows = [...realRows, ...previewRows]
  // Counts remain account-only even when read-only examples are visible.
  const incurredPenaltyCount = factors.filter(item => item.category === 'Penalty' && item.earned).length
  return <div className="trust-overview">
    <div className="trust-overview-left" role="region" aria-label="TrustScore overview" tabIndex={0}>
    <header className="trust-overview-heading"><div><span className="trust-eyebrow">REPUTATION</span><h1>TrustScore</h1></div><button className="trust-button" onClick={onCriteria}>Score criteria<ArrowUpRight size={16}/></button></header>
    <section className="trust-score-band" aria-label="TrustScore summary">
      <div className="trust-primary-score"><span className="trust-shield"><ShieldCheck size={26}/></span><div><div className="trust-score-number">{score}<small>/ 1000</small></div><span className="trust-current-tier">{policy?.tier || 'Foundation'}</span></div></div>
      <dl className="trust-metrics"><div><dt>Approved actions</dt><dd>{approvedActions}</dd></div><div><dt>Lifetime base points</dt><dd className="trust-positive">+{earnedPoints}</dd></div><div><dt>Active penalties</dt><dd className={policy?.penalties < 0 ? 'trust-negative' : ''}>{policy?.penalties ?? penalties}</dd></div><div><dt>Evidence ceiling</dt><dd>{policy?.ceiling ?? 1000}<small>/ 1000</small></dd></div></dl>
    </section>
    <section className="trust-roadmap" aria-label="Score tiers">{tiers.map((tier, index) => {
      const starts = [0, 500, 700, 899], ends = [500, 700, 899, 1000]
      const current = tier.name === policy.tier
      const complete = score > ends[index]
      return <div key={tier.name} className={`trust-tier-step ${current ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`}>
        <div><strong>{tier.name}</strong>{complete ? <Check size={14}/> : current ? <span>Current</span> : <LockKeyhole size={13}/>}</div>
        <p>{tier.range}</p><div className="trust-tier-track"><i style={{ width: `${Math.min(100, Math.max(0, (score - starts[index]) / (ends[index] - starts[index]) * 100))}%` }}/></div>
      </div>
    })}</section>
    <div className="trust-detail-columns">
      <section className="trust-eligibility"><div className="trust-section-heading"><div><h2>Evidence requirements</h2><p>{policy?.requirements?.length ? `To progress beyond ${policy.ceiling}` : 'Tier eligibility'}</p></div><ShieldCheck size={19}/></div>
        {(policy?.requirements || []).map(item => <div className="trust-requirement" key={item.label}>
          <div><span>{item.label}</span><strong>{item.actual}<small> / {item.required}</small>{item.actual >= item.required && <Check size={14}/>}</strong></div>
          <progress value={Math.min(item.actual, item.required)} max={item.required} aria-label={item.label}/>
        </div>)}
        {policy && !policy.requirements.length && <p className="trust-complete-message"><Check size={16}/>All evidence requirements met.</p>}
      </section>
      <section className="trust-calculation"><div className="trust-section-heading"><div><h2>Score calculation</h2><p>Policy v{policy?.version || 2}</p></div></div><dl>
        <div><dt>Eligible base points</dt><dd>{policy?.basePoints ?? 0}</dd></div><div><dt>Evidence ceiling</dt><dd>{policy?.ceiling ?? 1000}</dd></div><div><dt>Active deductions</dt><dd className="trust-negative">{policy?.penalties ?? penalties}</dd></div><div className="trust-final-score"><dt>Current TrustScore</dt><dd>{score}</dd></div>
      </dl></section>
    </div>
    </div>
    <section className="trust-ledger"><div className="trust-ledger-heading"><div className="trust-view-tabs" role="group" aria-label="TrustScore views">{['Activity', 'Opportunities', 'Penalties'].map(tab => <button key={tab} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab}<span>{tab === 'Activity' ? activity.length : tab === 'Penalties' ? incurredPenaltyCount : factors.filter(item => item.category !== 'Penalty').length}</span></button>)}</div><Activity size={18}/></div>
      <div className="trust-ledger-table" role="region" aria-label={view} tabIndex={0}><table><thead><tr><th>{view === 'Activity' ? 'Recent activity' : 'Score factor'}</th><th>Category</th><th>{view === 'Activity' ? 'Date' : 'Status'}</th><th>Base points</th></tr></thead><tbody>{rows.map(item => <tr key={item.id || item.label}>
        <td><div className="trust-event-label"><span className={`trust-event-icon ${item.points < 0 ? 'is-negative' : ''}`}>{item.points < 0 ? <ArrowDownRight size={17}/> : <ArrowUpRight size={17}/>}</span><div><strong>{item.label}{item.demoData && <span className="demo-data-badge">Demo</span>}</strong>{view !== 'Activity' && <p>{item.desc}</p>}</div></div></td><td><span className="trust-category">{item.category}</span></td><td>{view === 'Activity' ? formatDate(item.occurredAt) : item.demoData ? 'Demo preview' : item.category === 'Penalty' ? item.earned ? 'Recorded' : 'Not incurred' : item.points === 0 ? 'No score credit' : item.earned ? 'Recorded' : 'Available'}</td><td className={item.points < 0 ? 'trust-negative' : 'trust-positive'}>{item.points > 0 ? '+' : ''}{item.points}</td>
      </tr>)}</tbody></table>{!rows.length && <p className="trust-ledger-empty">{view === 'Activity' ? 'No recorded activity yet.' : view === 'Penalties' ? 'No penalties recorded.' : 'No factors in this category.'}</p>}</div>
      <div className="trust-ledger-footer"><span>{view === 'Activity' ? 'Latest recorded events' : 'Base credits are subject to policy caps and tier weighting'}</span><button onClick={onCriteria}>View policy<ArrowRight size={14}/></button></div>
    </section>
  </div>
}
