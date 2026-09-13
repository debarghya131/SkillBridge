import { useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, FolderKanban, RotateCcw } from 'lucide-react'
import SectionTabs from './SectionTabs'
import SubmissionReview from './SubmissionReview'

const STATUS_META = {
  Planning: { className: 'planning', label: 'Planning' },
  'In Progress': { className: 'progress', label: 'In progress' },
  Review: { className: 'review', label: 'Awaiting approval' },
  Completed: { className: 'completed', label: 'Completed' },
}
const EMPTY_PROJECTS = []

function WorkspaceStatusPicker({ value, options, disabled, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => {
    window.requestAnimationFrame(() => {
      if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
    })
  }
  return <div ref={pickerRef} className="gig-form-menu workspace-status-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="gig-form-menu-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
      onClick={() => setOpen(current => !current)}>{value}</button>
    {open && <div className="gig-form-menu-options" role="listbox" aria-label="Status">
      {options.map(option => <button key={option} type="button" role="option" aria-selected={option === value}
        onClick={() => { onChange(option); setOpen(false) }}>{option}</button>)}
    </div>}
  </div>
}

function formatDate(value) {
  if (!value) return 'No deadline'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatUpdateDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function WorkspaceDatePicker({ value, onChange }) {
  const today = new Date()
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : today
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
  const pickerRef = useRef(null)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const cells = [...Array(new Date(year, monthIndex, 1).getDay()).fill(null), ...Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => index + 1)]
  while (cells.length % 7) cells.push(null)
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  const selectDay = day => {
    if (!day) return
    onChange(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    setOpen(false)
  }
  return <div ref={pickerRef} className="task-date-picker workspace-date-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="task-date-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span>{value || 'YYYY-MM-DD'}</span><CalendarDays size={15} aria-hidden="true" />
    </button>
    {open && <div className="task-date-calendar" role="dialog" aria-label="Choose due date">
      <div className="task-date-calendar-header"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={15} /></button><strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={15} /></button></div>
      <div className="task-date-weekdays">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="task-date-days">{cells.map((day, index) => <button key={`${year}-${monthIndex}-${index}`} type="button" disabled={!day} aria-pressed={day && value === `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`} onClick={() => selectDay(day)}>{day || ''}</button>)}</div>
    </div>}
  </div>
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
        if (!title.trim() || !dueDate) {
          setError('Add a milestone title and due date.')
          return
        }
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
        <div className="workspace-filter">Status
          <WorkspaceStatusPicker disabled={busy} value={filter} options={['All', 'Planning', 'In Progress', 'Review', 'Completed']} onChange={value => { setFilter(value); setSelectedId(''); setMessage(''); setTitle(''); setDueDate(''); setError('') }} />
        </div>
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
                    <label>Due date<WorkspaceDatePicker value={dueDate} onChange={setDueDate} /><small id="milestone-date-format">Use YYYY-MM-DD</small></label>
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
