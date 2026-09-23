import {
  Activity, ArrowRight, BriefcaseBusiness, CircleDot,
  ClipboardCheck, FolderKanban, ListTodo, Search, Users, WalletCards,
} from 'lucide-react'
import './BusinessOverview.css'
import CompanyLogo from '../ui/CompanyLogo'

const number = value => Number(value) || 0

export default function BusinessOverview({ profile, stats, completion, activity, operations, onNavigate, formatWhen }) {
  const statValue = label => number(stats.find(item => item.label === label)?.value)
  const data = operations || {
    openGigs: statValue('Active GIGs'),
    applications: statValue('Applications'),
    talentAvailable: statValue('Total Talent'),
    reviewsDue: 0,
    deliveriesDue: 0,
    activeWork: 0,
    awaitingPayment: 0,
    completedWork: 0,
    pipeline: {
      applications: statValue('Applications'), interviewTasks: 0, awaitingDecision: 0, selected: 0,
    },
  }
  const priorities = [
    {
      label: 'Interview submissions', value: data.reviewsDue, target: 'tasks',
      detail: data.reviewsDue ? 'Candidates are waiting for your feedback.' : 'No interview work is waiting for review.',
      icon: ClipboardCheck, tone: 'blue',
    },
    {
      label: 'Project deliveries', value: data.deliveriesDue, target: 'workspace',
      detail: data.deliveriesDue ? 'Delivered GIG work needs an approval decision.' : 'No project delivery is waiting for approval.',
      icon: FolderKanban, tone: 'violet',
    },
    {
      label: 'External payments', value: data.awaitingPayment, target: 'payment',
      detail: data.awaitingPayment ? 'Approved work is ready for payment recording.' : 'No approved work is awaiting payment.',
      icon: WalletCards, tone: 'green',
    },
  ]
  const metrics = [
    { label: 'Open GIGs', value: data.openGigs, detail: 'roles accepting or reviewing talent', target: 'gig', icon: BriefcaseBusiness, tone: 'orange' },
    { label: 'Applications', value: data.applications, detail: 'across your company GIGs', target: 'gig', icon: Users, tone: 'blue' },
    { label: 'Talent pool', value: data.talentAvailable, detail: 'student profiles available', target: 'talent', icon: Search, tone: 'green' },
    { label: 'Active GIG work', value: data.activeWork, detail: 'selected through approval', target: 'workspace', icon: FolderKanban, tone: 'violet' },
  ]
  const pipeline = [
    { label: 'Applications', value: data.pipeline?.applications || 0 },
    { label: 'Interview tasks', value: data.pipeline?.interviewTasks || 0 },
    { label: 'Awaiting decision', value: data.pipeline?.awaitingDecision || 0 },
    { label: 'Selected', value: data.pipeline?.selected || 0 },
  ]
  const maxPipeline = Math.max(1, ...pipeline.map(item => number(item.value)))

  return (
    <section className="business-overview" aria-label="Company command center">
      <header className="business-heading">
        <div className="business-identity">
          <CompanyLogo logo={profile.logo} name={profile.businessName} size={48} />
          <div>
            <p className="business-eyebrow">Company command center</p>
            <h1 title={profile.businessName}>{profile.businessName || 'Your business'}</h1>
            <p className="business-location">{profile.location || 'Location not set'}{profile.industry ? ` · ${profile.industry}` : ''}</p>
          </div>
        </div>
        <div className="business-heading-actions">
          <nav className="business-quick-actions" aria-label="Company shortcuts">
            <button onClick={() => onNavigate('gig')}><BriefcaseBusiness size={17} />Manage GIGs</button>
            <button onClick={() => onNavigate('tasks')}><ClipboardCheck size={17} />Task Center</button>
            <button onClick={() => onNavigate('talent')}><Search size={17} />Find talent</button>
            <button onClick={() => onNavigate('workspace')}><FolderKanban size={17} />Project workspace</button>
          </nav>
          <button className="business-profile-progress" onClick={() => onNavigate('profile')}>
            <span><strong>{completion}%</strong> profile complete</span>
            <span className="business-profile-track"><i style={{ width: `${completion}%` }} /></span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="business-metrics" aria-label="Business health">
        {metrics.map(metric => {
          const Icon = metric.icon
          return <button className={`business-metric business-tone-${metric.tone}`} key={metric.label} onClick={() => onNavigate(metric.target)}>
            <span className="business-metric-icon"><Icon size={20} aria-hidden="true" /></span>
            <span className="business-metric-copy"><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.detail}</em></span>
            <ArrowRight className="business-metric-arrow" size={16} aria-hidden="true" />
          </button>
        })}
      </section>

      <div className="business-dashboard-grid">
        <section className="business-card business-pipeline" aria-labelledby="business-pipeline-title">
          <header className="business-card-heading">
            <div><p>Hiring funnel</p><h2 id="business-pipeline-title">Candidate pipeline</h2></div>
            <button onClick={() => onNavigate('gig')}>Manage GIGs<ArrowRight size={14} /></button>
          </header>
          <div className="business-pipeline-list">
            {pipeline.map((stage, index) => <div className="business-pipeline-stage" key={stage.label}>
              <span className="business-stage-index">{index + 1}</span>
              <div><span><strong>{stage.label}</strong><b>{stage.value}</b></span><span className="business-stage-track"><i style={{ width: `${number(stage.value) ? Math.max(8, (number(stage.value) / maxPipeline) * 100) : 0}%` }} /></span></div>
            </div>)}
          </div>
          <p className="business-card-note">Live company records only. Demo examples are excluded from this funnel.</p>
        </section>

        <section className="business-card business-priorities" aria-labelledby="business-priorities-title">
          <header className="business-card-heading"><div><p>Action queue</p><h2 id="business-priorities-title">What needs attention</h2></div><ListTodo size={20} aria-hidden="true" /></header>
          <div className="business-priority-list">
            {priorities.map(item => {
              const Icon = item.icon
              return <button key={item.label} onClick={() => onNavigate(item.target)} className={`business-priority business-tone-${item.tone}`}>
                <span className="business-priority-icon"><Icon size={18} aria-hidden="true" /></span>
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                <b className={item.value ? 'has-work' : ''}>{item.value}</b>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            })}
          </div>
        </section>

        <section className="business-card business-activity" aria-labelledby="business-activity-title">
          <header className="business-card-heading"><div><p>Latest updates</p><h2 id="business-activity-title">Recent hiring activity</h2></div><Activity size={20} aria-hidden="true" /></header>
          <div className="business-activity-list">
            {activity.length === 0 ? <div className="business-empty-state"><Activity size={22} /><strong>No hiring activity yet</strong><span>New applications and project updates will appear here.</span></div> : activity.slice(0, 4).map((item, index) => <div className="business-activity-row" key={`${item.name}-${index}`}>
              <span className="business-activity-dot" style={{ background: item.bg, color: item.color }}><CircleDot size={14} /></span>
              <div><strong>{item.name}</strong><p>{item.status}</p></div>
              <time>{formatWhen(item.when)}</time>
            </div>)}
          </div>
        </section>

      </div>

    </section>
  )
}
