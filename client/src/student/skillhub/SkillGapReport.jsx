import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'

const EMPTY_REPORT = { activeGigs: 0, totalRequirements: 0, overallMatch: 0, gapData: [], strengths: [] }

function DemandPanel({ report, rows, demo = false }) {
  return <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">{demo ? 'Example opportunity demand' : 'Live opportunity demand'}</span><h2>GIG Skill Requirements {demo ? <span className="demo-data-badge">Demo</span> : <span className="sh-live-data-badge">Live data</span>}</h2></div><span>{report.activeGigs} {demo ? 'demo examples' : 'active GIGs'}</span></header>
    <p className="sh-policy">{report.overallMatch}% of {demo ? 'example' : 'live'} listed skill requirements covered by {demo ? 'the example profile' : 'your actively verified skills'}. This is skill coverage, not a hiring guarantee.</p>
    <div className="sh-list">{rows.map(item => <article className="sh-skill" key={`${demo ? 'demo' : 'live'}-${item.skill}`}><div><strong>{item.skill}{demo && <span className="demo-data-badge">Demo</span>}</strong><p className="sh-meta">{item.status === 'Missing' ? 'Not on profile' : item.status} · {item.gigs} GIGs</p></div><span>{item.category}</span></article>)}
      {!rows.length && <p className="sh-empty">{report.activeGigs ? 'No skill requirements match this search.' : 'No real active GIG requirements are available yet.'}</p>}</div>
  </section>
}

function StrengthPanel({ report, demo = false, demoPreview = null }) {
  return <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">{demo ? 'Example strengths' : 'Your current strengths'}</span><h2>Verified Skills in Demand {demo ? <span className="demo-data-badge">Demo</span> : <span className="sh-live-data-badge">Live data</span>}</h2></div></header><div className="sh-list">
    {(report.strengths || []).map(item => <article className="sh-skill" key={`${demo ? 'demo' : 'live'}-${item.skill}`}><div><strong>{item.skill}{demo && <span className="demo-data-badge">Demo</span>}</strong><p className="sh-meta">{item.gigs} GIGs</p></div><BadgeCheck className="sh-verified-icon" size={20} aria-label="Verified"/></article>)}
    {!report.strengths?.length && <p className="sh-empty">{demo ? 'No example verified skills match these requirements.' : 'No actively verified skills match live GIG requirements.'}</p>}
    {!demo && demoPreview?.strengths?.length > 0 && <aside className="sh-gap-preview" aria-label="Read-only example of matched skills">
      <header><div><span className="demo-data-badge">Read-only demo</span><h3>How matched strengths appear</h3></div><span>{demoPreview.overallMatch}% example coverage</span></header>
      <p>Illustration only. These skills and example GIGs never change your live coverage, profile, or matching.</p>
      <div className="sh-gap-preview-skills">
        {demoPreview.strengths.slice(0, 3).map(item => <div key={`preview-${item.skill}`}><span><BadgeCheck size={16}/><strong>{item.skill}</strong><span className="demo-data-badge">Demo</span></span><small>Verified · matched by {item.gigs} example {item.gigs === 1 ? 'GIG' : 'GIGs'}</small></div>)}
      </div>
    </aside>}
  </div></section>
}

export default function SkillGapReport({ skillHubState }) {
  const [search, setSearch] = useState('')
  const realReport = skillHubState?.skillGapReport || EMPTY_REPORT
  const demoReport = skillHubState?.demoSkillGapReport
  const query = search.trim().toLowerCase()
  const filterRows = report => (report?.gapData || []).filter(item => item.skill.toLowerCase().includes(query))

  return <div className="sh-gap-report">
    <label className="sh-gap-search"><span>Search requirements</span><input type="search" aria-label="Search skill gaps" placeholder="Search required skills" value={search} onChange={event => setSearch(event.target.value)}/></label>
    <div className="sh-columns sh-gap-columns">
      <DemandPanel report={realReport} rows={filterRows(realReport)} />
      <StrengthPanel report={realReport} demoPreview={demoReport} />
    </div>
  </div>
}
