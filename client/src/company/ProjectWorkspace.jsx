import { useMemo, useState } from 'react'
import { Check, CircleCheck, Clock3, FolderKanban, RotateCcw } from 'lucide-react'
import SectionTabs from './SectionTabs'
import SubmissionReview from './SubmissionReview'

const STATUS_META = {
  Planning: { className: 'planning', label: 'Planning' },
  'In Progress': { className: 'progress', label: 'In progress' },
  Review: { className: 'review', label: 'Awaiting approval' },
  Completed: { className: 'completed', label: 'Completed' },
}
const EMPTY_PROJECTS = []

function formatDate(value) {
  if (!value) return 'No deadline'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatUpdateDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export default function ProjectWorkspace({ projectWorkspaceState, taskSubmissions = [], onReviewTaskSubmission, onShareUpdate, onSetMilestone }) {
  const projects = projectWorkspaceState?.projects || EMPTY_PROJECTS
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('Delivery')
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const visible = useMemo(() => projects.filter(project => (filter === 'All' || project.status === filter)
    && `${project.title} ${(project.team || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())), [projects, filter, search])
  const project = visible.find(item => item.id === selectedId) || visible[0]
  const submission = taskSubmissions.find(item => item.id === project?.submissionId)
  const status = STATUS_META[project?.status] || STATUS_META.Planning

  const save = async (event, action, milestone) => {
    event.preventDefault()
    if (!project || busy) return
    setBusy(true)
    setError('')

    try {
      if (action === 'update') {
        await onShareUpdate(project.id, message)
        setMessage('')
      } else if (action === 'status') {
        await onSetMilestone(project.id, { id: milestone.id, status: milestone.status === 'Completed' ? 'Open' : 'Completed' })
      } else {
        await onSetMilestone(project.id, { title, dueDate })
        setTitle('')
        setDueDate('')
      }
    } catch (failure) {
      setError(failure.message || 'Could not save the project change.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="company-work-section workspace-section">
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">Delivery operations</p>
          <h2>Project Workspace</h2>
          <p className="work-muted">Track selected students, work delivery, reviews, and project milestones.</p>
        </div>
        <label className="workspace-filter">Status
          <select disabled={busy} value={filter} onChange={event => { setFilter(event.target.value); setSelectedId(''); setMessage(''); setTitle(''); setDueDate(''); setError('') }}>
            {['All', 'Planning', 'In Progress', 'Review', 'Completed'].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </header>

      <div className="workspace-summary" aria-label="Project summary">
        <div><FolderKanban size={20} aria-hidden="true" /><strong>{projects.filter(item => item.status !== 'Completed').length}</strong><small>Active projects</small></div>
        <div><Clock3 size={20} aria-hidden="true" /><strong>{projects.filter(item => item.status === 'Review').length}</strong><small>Awaiting approval</small></div>
        <div><CircleCheck size={20} aria-hidden="true" /><strong>{projects.filter(item => item.status === 'Completed').length}</strong><small>Completed projects</small></div>
      </div>

      {!projects.length ? (
        <div className="workspace-empty"><FolderKanban size={24} aria-hidden="true" /><strong>No selected students yet</strong></div>
      ) : (
        <div className="workspace-board">
          <aside className="workspace-projects">
            <div className="workspace-panel-title"><h3>Projects</h3><span>{visible.length} shown</span></div>
            <input type="search" aria-label="Search projects or students" placeholder="Search projects or students" disabled={busy} value={search} onChange={event => { setSearch(event.target.value); setMessage(''); setTitle(''); setDueDate(''); setError('') }} />
            <div className="workspace-project-list">
              {visible.map(item => {
                const itemStatus = STATUS_META[item.status] || STATUS_META.Planning
                return <button key={item.id} type="button" disabled={busy} aria-pressed={item.id === project?.id} className={item.id === project?.id ? 'workspace-project is-selected' : 'workspace-project'} onClick={() => { setSelectedId(item.id); setError(''); setMessage(''); setTitle(''); setDueDate('') }}>
                  <div className="workspace-project-top"><strong>{item.title}</strong><span className={'workspace-status ' + itemStatus.className}>{itemStatus.label}</span></div>
                  <span className="workspace-project-person">{(item.team || []).join(', ') || 'Unassigned'}</span>
                  <div className="workspace-project-progress"><span style={{ width: `${item.progress || 0}%` }} /></div>
                  <small>{item.progress || 0}% complete · {formatDate(item.deadline)}</small>
                </button>
              })}
              {!visible.length && <p className="work-muted">No projects match this status.</p>}
            </div>
          </aside>

          {project && (
            <section className="workspace-detail">
              <header className="workspace-detail-header">
                <div>
                  <p className="workspace-detail-kicker">Selected project</p>
                  <h3>{project.title}</h3>
                  <p className="work-muted">{(project.team || []).join(', ') || 'Unassigned'} · {formatDate(project.deadline)}</p>
                </div>
                <span className={'workspace-status ' + status.className}>{status.label}</span>
              </header>

              {project.paymentStatus && <p className="workspace-payment-status">{project.paymentStatus}</p>}

              <SectionTabs label="Project views" options={['Delivery', 'Updates', 'Milestones']} value={view} onChange={setView} />
              <div hidden={view !== 'Delivery'} className="workspace-delivery-panel">
                {submission ? <SubmissionReview key={submission.id + submission.status} submission={submission} onReview={onReviewTaskSubmission} /> : <p className="work-muted">No submission is linked to this project.</p>}
              </div>

              <div hidden={view === 'Delivery'} className="workspace-detail-grid">
                <section hidden={view !== 'Updates'} className="workspace-activity">
                  <div className="workspace-panel-title"><h3>Project updates</h3><span>{(project.updates || []).length}</span></div>
                  <div className="workspace-activity-list">
                    {[...(project.updates || [])].reverse().map(update => <article key={update.id} className="workspace-update"><p>{update.message}</p><time dateTime={update.sharedAt}>{formatUpdateDate(update.sharedAt)}</time></article>)}
                    {!project.updates?.length && <p className="work-muted">No project updates yet.</p>}
                  </div>
                  <form className="workspace-composer" onSubmit={event => save(event, 'update')}>
                    <label>Share an update<textarea required maxLength="500" rows="3" value={message} onChange={event => setMessage(event.target.value)} placeholder="Add a delivery update for this project..." /></label>
                    <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Share update'}</button>
                  </form>
                </section>

                <section hidden={view !== 'Milestones'} className="workspace-milestones">
                  <div className="workspace-panel-title"><h3>Milestones</h3><span>{(project.milestones || []).length}</span></div>
                  <div className="workspace-milestone-list">
                    {(project.milestones || []).map(item => <article key={item.id} className="workspace-milestone"><div><strong>{item.title}</strong><small>{formatDate(item.dueDate)}</small></div><em>{item.status}</em><button type="button" className="btn-secondary" disabled={busy} title={item.status === 'Completed' ? 'Reopen milestone' : 'Complete milestone'} aria-label={`${item.status === 'Completed' ? 'Reopen' : 'Complete'} milestone: ${item.title}`} onClick={event => save(event, 'status', item)}>{item.status === 'Completed' ? <RotateCcw size={16} /> : <Check size={16} />}</button></article>)}
                    {!project.milestones?.length && <p className="work-muted">No milestones added.</p>}
                  </div>
                  <form className="workspace-milestone-form" onSubmit={event => save(event, 'milestone')}>
                    <label>Milestone<input required maxLength="120" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Deliver first milestone" /></label>
                    <label>Due date<input type="date" required value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
                    <button className="btn-secondary" disabled={busy}>{busy ? 'Saving...' : 'Add milestone'}</button>
                  </form>
                </section>
              </div>
              {error && <p role="alert" className="work-error">{error}</p>}
            </section>
          )}
        </div>
      )}
    </section>
  )
}
