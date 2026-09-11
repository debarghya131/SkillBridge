import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'

export default function SkillGapReport({ skillHubState }) {
  const [search, setSearch] = useState('')
  const report = skillHubState?.skillGapReport || { activeGigs: 0, overallMatch: 0, gapData: [], strengths: [] }
  const rows = (report.gapData || []).filter(item => item.skill.toLowerCase().includes(search.toLowerCase()))
  return <div className="sh-columns">
    <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Opportunity demand</span><h2>GIG Skill Requirements</h2></div><span>{report.activeGigs} active GIGs</span></header>
      <p className="sh-policy">{report.overallMatch}% of listed skill requirements covered by your actively verified skills. This is skill coverage, not a hiring guarantee.</p>
      <input type="search" aria-label="Search skill gaps" placeholder="Search required skills" value={search} onChange={event => setSearch(event.target.value)}/>
      <div className="sh-list">{rows.map(item => <article className="sh-skill" key={item.skill}><div><strong>{item.skill}</strong><p className="sh-meta">{item.status === 'Missing' ? 'Not on profile' : item.status} · {item.gigs} GIGs</p></div><span>{item.category}</span></article>)}
        {!rows.length && <p className="sh-empty">{report.activeGigs ? 'No matching skill gaps.' : 'No active GIG requirements available yet.'}</p>}</div>
    </section>
    <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Current strengths</span><h2>Verified Skills in Demand</h2></div></header><div className="sh-list">
      {(report.strengths || []).map(item => <article className="sh-skill" key={item.skill}><div><strong>{item.skill}</strong><p className="sh-meta">{item.gigs} GIGs</p></div><BadgeCheck size={20} aria-label="Verified"/></article>)}
      {!report.strengths?.length && <p className="sh-empty">No verified skills match current GIG requirements.</p>}
    </div></section>
  </div>
}
