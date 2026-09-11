import './DashboardSkeleton.css'

const SECTION_LABELS = {
  business: 'My Business', gig: 'GIG Center', tasks: 'Task Center', talent: 'Talent Search',
  workspace: 'Project Workspace', payment: 'Payment', profile: 'Profile',
  trustscore: 'TrustScore', skillhub: 'Skill Hub', network: 'Network', earning: 'Earning',
}

export default function DashboardSkeleton({ section = 'business' }) {
  return <div className={`dashboard-skeleton skeleton-${section}`} role="status" aria-live="polite" aria-busy="true" aria-label={`Loading ${SECTION_LABELS[section] || 'dashboard'}`}>
    <div aria-hidden="true">
      <div className="skeleton-heading"><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-action" /></div>
      <div className="skeleton-stats">{[0, 1, 2].map(item => <div className="skeleton-stat" key={item}><span className="skeleton-block skeleton-number" /><span className="skeleton-block skeleton-label" /></div>)}</div>
      <div className="skeleton-tabs">{[0, 1, 2].map(item => <span className="skeleton-block" key={item} />)}</div>
      <div className="skeleton-columns">{[0, 1].map(column => <div className="skeleton-panel" key={column}>
        <span className="skeleton-block skeleton-label" />
        {[0, 1, 2].map(row => <div className="skeleton-row" key={row}><span className="skeleton-block" /><span className="skeleton-block" /></div>)}
      </div>)}</div>
    </div>
  </div>
}
