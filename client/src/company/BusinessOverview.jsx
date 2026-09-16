import { useState } from 'react'
import './BusinessOverview.css'
import CompanyLogo from '../ui/CompanyLogo'

export default function BusinessOverview({ profile, stats, completion, checklist, activity, submissions, projects, onNavigate, formatWhen }) {
  const [tab, setTab] = useState('Priorities')
  const [page, setPage] = useState(0)
  // The overview is a live company dashboard. Fixture records are useful in
  // their own sections, but must never change operational counters here.
  const realSubmissions = submissions.filter(item => !item.demoData)
  const realProjects = projects.filter(item => !item.demoData)
  const reviews = realSubmissions.filter(item => item.status === 'submitted').length
  const approvals = realSubmissions.filter(item => item.status === 'delivered').length
  const payments = realSubmissions.filter(item => item.status === 'approved' && !item.externalPayment).length
  const metrics = [...stats.slice(0, 3),
    { label: 'Tasks to review', value: reviews, target: 'tasks' },
    { label: 'Active projects', value: realProjects.filter(item => item.status !== 'Completed').length, target: 'workspace' },
    { label: 'Awaiting payment', value: payments, target: 'payment' },
  ]
  const priorities = [
    { name: 'Interview submissions', status: `${reviews} awaiting review`, target: 'tasks', action: 'Review tasks' },
    { name: 'Project deliveries', status: `${approvals} awaiting approval`, target: 'workspace', action: 'Open projects' },
    { name: 'External payments', status: `${payments} approved jobs awaiting payment`, target: 'payment', action: 'Open payments' },
  ]
  const rows = tab === 'Priorities' ? priorities : tab === 'Activity' ? activity : checklist.map(item => ({ name: item.label, status: item.done ? 'Complete' : 'Not complete', target: 'profile', action: 'Edit profile' }))
  const pages = Math.max(1, Math.ceil(rows.length / 2))
  const currentPage = Math.min(page, pages - 1)
  return (
    <section className="business-overview" aria-label="Business overview">
      <header className="business-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><CompanyLogo logo={profile.logo} name={profile.businessName} size={44} /><div><p className="business-eyebrow">My Business</p><h1 title={profile.businessName}>{profile.businessName || 'Your business'}</h1><p className="business-location">{profile.location || 'Location not set'}</p></div></div>
        <button className="business-profile-link" onClick={() => onNavigate('profile')}>Profile {completion}%</button>
      </header>
      <div className="business-metrics">
        {metrics.map((metric, index) => <button className={`business-metric metric-${index}`} key={metric.label} onClick={() => onNavigate(metric.target)}><strong>{metric.value}</strong><span>{metric.label}</span></button>)}
      </div>
      <nav className="business-actions" aria-label="Quick actions">
        <button onClick={() => onNavigate('gig')}>Manage GIGs</button>
        <button onClick={() => onNavigate('tasks')}>Task Center</button>
        <button onClick={() => onNavigate('talent')}>Find talent</button>
        <button onClick={() => onNavigate('workspace')}>Workspace</button>
      </nav>
      <div className="business-details">
        <div className="business-tabs" role="tablist" aria-label="Business details">
          {['Priorities', 'Activity', 'Profile'].map(name => <button key={name} id={`business-tab-${name}`} role="tab" aria-selected={tab === name} aria-controls="business-panel" onClick={() => { setTab(name); setPage(0) }}>{name}</button>)}
        </div>
        <div id="business-panel" role="tabpanel" aria-labelledby={`business-tab-${tab}`} className="business-rows">
          {rows.length === 0 ? <p className="business-empty">No recent hiring activity.</p> : rows.slice(currentPage * 2, currentPage * 2 + 2).map((item, index) => <div className="business-row" key={`${tab}-${currentPage}-${index}`}>
            <div><strong title={item.name}>{item.name}</strong><p title={item.status}>{item.status}</p></div>
            {item.target ? <button onClick={() => onNavigate(item.target)}>{item.action}</button> : <time>{formatWhen(item.when)}</time>}
          </div>)}
        </div>
        <footer className="business-pagination">
          <span>{rows.length} {tab === 'Activity' ? 'recent updates' : 'items'}</span>
          <div><button aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>&larr;</button><span aria-live="polite">{currentPage + 1} / {pages}</span><button aria-label="Next page" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>&rarr;</button></div>
        </footer>
      </div>
    </section>
  )
}
