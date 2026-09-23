import { useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock3, FolderKanban, RotateCcw, Users } from 'lucide-react'
import SectionTabs from './SectionTabs'
import SubmissionReview from './SubmissionReview'

const STATUS_META = {
  Planning: { className: 'planning', label: 'Planning' },
  'In Progress': { className: 'progress', label: 'In progress' },
  Review: { className: 'review', label: 'Awaiting approval' },
  Approved: { className: 'approved', label: 'Payment pending' },
  Completed: { className: 'completed', label: 'Completed' },
}
const EMPTY_PROJECTS = []
const WORKFLOW_STEPS = ['Selected', 'Brief sent', 'In progress', 'Submitted', 'Approved', 'Completed']

function workflowStep(project, submission) {
  const submissionStatus = submission?.status || project?.submissionStatus
  if (submissionStatus === 'completed') return 5
  if (submissionStatus === 'approved') return 4
  if (submissionStatus === 'delivered') return 3
  if (['work_started', 'needs_revision'].includes(submissionStatus)) return 2
  if (submissionStatus === 'selected') return 0
  if (project?.status === 'Completed') return 5
  if (project?.status === 'Approved') return 4
  if (project?.status === 'Review') return 3
  if (project?.status === 'In Progress') return 2
  return 0
}

function workflowProgress(project, submission) {
  return [15, 30, 50, 70, 85, 100][workflowStep(project, submission)]
}

function gigGroupKey(project) {
  const scope = project.demoData ? 'demo' : 'real'
  if (project.companyGigPublicId) return `${scope}:public:${project.companyGigPublicId}`
  if (project.companyGigId !== undefined && project.companyGigId !== null && project.companyGigId !== '') return `${scope}:id:${project.companyGigId}`
  return `${scope}:title:${String(project.title || 'untitled').trim().toLowerCase()}`
}

function groupProjectsByGig(projects) {
  const groups = new Map()
  projects.forEach(project => {
    const key = gigGroupKey(project)
    if (!groups.has(key)) groups.set(key, { key, title: project.title || 'Untitled GIG', projects: [] })
    groups.get(key).projects.push(project)
  })
  return [...groups.values()]
}

function nextAction(project, submission) {
  const submissionStatus = submission?.status || project?.submissionStatus
  if (submissionStatus === 'selected') return { title: 'Add the work brief and start this GIG', copy: 'Define the delivery requirements, then start the project for the selected student.', button: 'Open work setup', view: 'Deliverables' }
  if (submissionStatus === 'delivered') return { title: 'Review the student’s deliverable', copy: 'Open the submitted evidence, provide feedback, and approve the work or request a revision.', button: 'Review deliverable', view: 'Deliverables' }
  if (submissionStatus === 'approved') return { title: 'Record the external payment', copy: 'The work is approved. Use Payment after transferring the agreed amount to the student.' }
  if (submissionStatus === 'completed') return { title: 'Project completed', copy: 'The delivery was approved and its external payment was recorded. No further action is required.' }
  if (submissionStatus === 'needs_revision') return { title: 'Revision is in progress', copy: 'The student is updating the delivery. Use Updates to keep instructions and progress visible.', button: 'Open updates', view: 'Updates' }
  if (submissionStatus === 'work_started') return { title: 'Work is in progress', copy: 'Track milestones and share concise updates while the student prepares the final delivery.', button: 'Share an update', view: 'Updates' }
  return { title: 'Prepare the GIG Work', copy: 'Review the selected student and define what should be delivered before work begins.', button: 'Open deliverables', view: 'Deliverables' }
}

function StudentAvatar({ name, avatar }) {
  return <span className="workspace-student-avatar" aria-hidden="true">
    <span>{String(name || '?').trim().charAt(0).toUpperCase()}</span>
    {avatar && <img src={avatar} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />}
  </span>
}

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

function WorkspaceDatePicker({ value, onChange, disabled = false }) {
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
    <button type="button" className="task-date-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span>{value || 'YYYY-MM-DD'}</span><CalendarDays size={15} aria-hidden="true" />
    </button>
    {open && <div className="task-date-calendar" role="dialog" aria-label="Choose due date">
      <div className="task-date-calendar-header"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={15} /></button><strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={15} /></button></div>
      <div className="task-date-weekdays">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="task-date-days">{cells.map((day, index) => <button key={`${year}-${monthIndex}-${index}`} type="button" disabled={!day} aria-pressed={day && value === `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`} onClick={() => selectDay(day)}>{day || ''}</button>)}</div>
    </div>}
  </div>
}

export default function ProjectWorkspace({ projectWorkspaceState, taskSubmissions = [], onReviewTaskSubmission, onShareUpdate, onSetMilestone, onViewStudent, onPrefetchStudent }) {
  const projects = projectWorkspaceState?.projects || EMPTY_PROJECTS
  const realProjects = projects.filter(project => !project.demoData)
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('Overview')
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedGigs, setExpandedGigs] = useState({})

  const visible = useMemo(() => projects.filter(project => (filter === 'All' || project.status === filter)
    && `${project.title} ${(project.team || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())), [projects, filter, search])
  const visibleReal = visible.filter(item => !item.demoData)
  const visibleDemo = visible.filter(item => item.demoData)
  const project = visible.find(item => item.id === selectedId) || visible[0]
  const submission = taskSubmissions.find(item => item.id === project?.submissionId) || project?.submission
  const status = STATUS_META[project?.status] || STATUS_META.Planning
  const activeStep = workflowStep(project, submission)
  const action = nextAction(project, submission)
  const studentName = (project?.team || [])[0] || submission?.studentName || 'Unassigned'
  const studentAvatar = project?.studentAvatar || submission?.studentAvatar || ''

  const resetSelection = () => {
    setSelectedId('')
    setView('Overview')
    setMessage('')
    setTitle('')
    setDueDate('')
    setError('')
  }

  const selectProject = id => {
    setSelectedId(id)
    setView('Overview')
    setMessage('')
    setTitle('')
    setDueDate('')
    setError('')
  }

  const save = async (event, action, milestone) => {
    event.preventDefault()
    if (!project || project.demoData || busy) return
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

  const renderAssignments = (items, label) => {
    const groups = groupProjectsByGig(items)
    return groups.length > 0 && <div className="workspace-assignment-group">
      <div className="workspace-assignment-group-label"><span>{label}</span><small>{groups.length}</small></div>
      {groups.map(group => {
        const containsSelected = group.projects.some(item => item.id === project?.id)
        const isExpanded = Object.hasOwn(expandedGigs, group.key) ? expandedGigs[group.key] : containsSelected
        return <section key={group.key} className={containsSelected ? 'workspace-gig-group is-active' : 'workspace-gig-group'}>
          <button type="button" className="workspace-gig-group-toggle" disabled={busy} aria-expanded={isExpanded} onClick={() => setExpandedGigs(current => ({ ...current, [group.key]: !isExpanded }))}>
            <span className="workspace-gig-group-title"><FolderKanban size={17} aria-hidden="true" /><span><strong>{group.title}</strong><small><Users size={12} aria-hidden="true" /> {group.projects.length} selected student{group.projects.length === 1 ? '' : 's'}</small></span></span>
            <ChevronDown className={isExpanded ? 'is-expanded' : ''} size={17} aria-hidden="true" />
          </button>
          {isExpanded && <div className="workspace-gig-members">
            {group.projects.map(item => {
              const itemStatus = STATUS_META[item.status] || STATUS_META.Planning
              const itemSubmission = taskSubmissions.find(entry => entry.id === item.submissionId) || item.submission
              const itemStudent = (item.team || [])[0] || itemSubmission?.studentName || 'Unassigned'
              const itemAvatar = item.studentAvatar || itemSubmission?.studentAvatar || ''
              const itemProgress = workflowProgress(item, itemSubmission)
              return <button key={item.id} type="button" disabled={busy} aria-pressed={item.id === project?.id} className={item.id === project?.id ? 'workspace-project workspace-member-project is-selected' : 'workspace-project workspace-member-project'} onClick={() => selectProject(item.id)}>
                <div className="workspace-project-top">
                  <div className="workspace-project-student"><StudentAvatar name={itemStudent} avatar={itemAvatar} /><span><strong>{itemStudent}</strong><small>Independent work record</small></span></div>
                  <span className={'workspace-status ' + itemStatus.className}>{itemStatus.label}</span>
                </div>
                <div className="workspace-project-progress" aria-label={`${itemProgress}% workflow progress`}><span style={{ width: `${itemProgress}%` }} /></div>
                <small>{itemProgress}% workflow progress · Due {formatDate(item.deadline)}</small>
              </button>
            })}
          </div>}
        </section>
      })}
    </div>
  }

  return (
    <section className="company-work-section workspace-section">
      <header className="workspace-header workspace-header-compact">
        <div>
          <p className="workspace-eyebrow">Delivery operations</p>
            <h2>Project Workspace</h2>
        </div>
            <div className="workspace-summary workspace-summary-inline" aria-label="Live project summary" title="These totals use only your real projects.">
              <div><FolderKanban size={18} aria-hidden="true" /><strong>{realProjects.filter(item => item.status !== 'Completed').length}</strong><small>Active GIG Work</small></div>
              <div><Clock3 size={18} aria-hidden="true" /><strong>{realProjects.filter(item => item.status === 'Review').length}</strong><small>Deliveries to review</small></div>
              <div><CircleCheck size={18} aria-hidden="true" /><strong>{realProjects.filter(item => item.status === 'Completed').length}</strong><small>Completed GIG Work</small></div>
            </div>
        <div className="workspace-filter">Status
          <WorkspaceStatusPicker disabled={busy} value={filter} options={['All', 'Planning', 'In Progress', 'Review', 'Approved', 'Completed']} onChange={value => { setFilter(value); resetSelection() }} />
        </div>
      </header>

      {!projects.length ? (
        <div className="workspace-empty"><FolderKanban size={24} aria-hidden="true" /><strong>No selected students yet</strong></div>
      ) : (
        <div className="workspace-board">
          <aside className="workspace-projects">
            <div className="workspace-panel-title"><div><h3>GIG Work by team</h3><p>Select a GIG, then choose a student</p></div><span>{groupProjectsByGig(realProjects).length} GIGs · {realProjects.length} students</span></div>
            <input type="search" aria-label="Search GIG Work or students" placeholder="Search GIG or student" disabled={busy} value={search} onChange={event => { setSearch(event.target.value); resetSelection() }} />
            <div className="workspace-project-list">
              {renderAssignments(visibleReal, 'Live GIG Work')}
              {renderAssignments(visibleDemo, 'Read-only examples')}
              {!visible.length && <p className="work-muted">No GIG Work matches this search or status.</p>}
            </div>
          </aside>

          {project && (
            <section className="workspace-detail">
              <header className="workspace-detail-header">
                <div>
                  <p className="workspace-detail-kicker">Selected GIG Work</p>
                  <h3>{project.title}</h3>
                  <div className="workspace-selected-student"><StudentAvatar name={studentName} avatar={studentAvatar} /><span><strong>{studentName}</strong><small>Due {formatDate(project.deadline)}</small></span>{onViewStudent && project.studentId && <button type="button" className="workspace-view-profile" onFocus={() => onPrefetchStudent?.({ id: project.studentId, studentId: project.studentId })} onPointerEnter={() => onPrefetchStudent?.({ id: project.studentId, studentId: project.studentId })} onClick={() => onViewStudent({ id: project.studentId, studentId: project.studentId, name: studentName, avatar: studentAvatar, demoData: project.demoData })}>View Profile</button>}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {project.demoData && <span className="demo-data-badge">Read-only example</span>}
                  <span className={'workspace-status ' + status.className}>{status.label}</span>
                </div>
              </header>

              {project.paymentStatus && <p className="workspace-payment-status">{project.paymentStatus}</p>}

              <div className="workspace-lifecycle" aria-label="GIG Work workflow">
                {WORKFLOW_STEPS.map((step, index) => <div key={step} className={`${index < activeStep ? 'is-complete' : ''}${index === activeStep ? ' is-current' : ''}`}>
                  <span>{index < activeStep ? <Check size={13} /> : index + 1}</span><small>{step}</small>
                </div>)}
              </div>

              <SectionTabs label="GIG Work views" options={['Overview', 'Deliverables', 'Updates', 'Milestones']} value={view} onChange={setView} />
              <p className="work-muted" style={{ margin: '10px 0 0' }}>
                {view === 'Overview' && 'See the current stage, the next company action, and the GIG Work context.'}
                {view === 'Deliverables' && 'Set up the work, or review the student’s submitted evidence when it arrives.'}
                {view === 'Updates' && 'Share progress notes and keep the delivery conversation visible.'}
                {view === 'Milestones' && 'Track project targets, due dates, and completion status.'}
              </p>

              <div hidden={view !== 'Overview'} className="workspace-overview">
                <section className="workspace-next-action">
                  <div><span>Next company action</span><h4>{action.title}</h4><p>{action.copy}</p></div>
                  {action.button && <button type="button" className="btn-primary" onClick={() => setView(action.view)}>{action.button}</button>}
                </section>
                <div className="workspace-overview-grid">
                  <section><span>Student</span><strong>{studentName}</strong><small>Independent work record for this selected student</small></section>
                  <section><span>Current stage</span><strong>{status.label}</strong><small>{workflowProgress(project, submission)}% based on the delivery workflow</small></section>
                  <section><span>Due date</span><strong>{formatDate(project.deadline)}</strong><small>{(project.milestones || []).length} milestone{(project.milestones || []).length === 1 ? '' : 's'} tracked</small></section>
                </div>
                {(submission?.feedback || submission?.score != null) && <section className="workspace-review-summary"><strong>Selection and review context</strong>{submission?.feedback && <p>{submission.feedback}</p>}{submission?.score != null && <small>Score: {submission.score} / {submission.taskPoints || 100}</small>}</section>}
              </div>

              <div hidden={view !== 'Deliverables'} className="workspace-delivery-panel">
                {submission ? <SubmissionReview key={submission.id + submission.status} submission={submission} readOnly={project.demoData} onReview={onReviewTaskSubmission} /> : <p className="work-muted">No submission is linked to this project.</p>}
              </div>

              <div hidden={!['Updates', 'Milestones'].includes(view)} className="workspace-detail-grid">
                <section hidden={view !== 'Updates'} className="workspace-activity">
                  <div className="workspace-panel-title"><h3>Project updates</h3><span>{(project.updates || []).length}</span></div>
                  <div className="workspace-activity-list">
                    {[...(project.updates || [])].reverse().map(update => <article key={update.id} className="workspace-update"><p>{update.message}</p><time dateTime={update.sharedAt}>{formatUpdateDate(update.sharedAt)}</time></article>)}
                    {!project.updates?.length && <p className="work-muted">No project updates yet.</p>}
                  </div>
                  {project.demoData ? <p className="work-muted">Example updates are read-only. Updates to live projects are saved to the company workspace.</p> : <form className="workspace-composer" onSubmit={event => save(event, 'update')}>
                    <label>Share an update<textarea required maxLength="500" rows="3" value={message} onChange={event => setMessage(event.target.value)} placeholder="Add a delivery update for this project..." /></label>
                    <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Share update'}</button>
                  </form>}
                </section>

                <section hidden={view !== 'Milestones'} className="workspace-milestones">
                  <div className="workspace-panel-title"><h3>Milestones</h3><span>{(project.milestones || []).length}</span></div>
                  <div className="workspace-milestone-list">
                    {(project.milestones || []).map(item => <article key={item.id} className="workspace-milestone"><div><strong>{item.title}</strong><small>{formatDate(item.dueDate)}</small></div><em>{item.status}</em><button type="button" className="btn-secondary" disabled={busy || project.demoData} title={project.demoData ? 'Demo milestones are read-only' : item.status === 'Completed' ? 'Reopen milestone' : 'Complete milestone'} aria-label={`${item.status === 'Completed' ? 'Reopen' : 'Complete'} milestone: ${item.title}`} onClick={event => save(event, 'status', item)}>{item.status === 'Completed' ? <RotateCcw size={16} /> : <Check size={16} />}</button></article>)}
                    {!project.milestones?.length && <p className="work-muted">No milestones added.</p>}
                  </div>
                  {project.demoData && <p className="work-muted">This example shows the milestone workflow. Example milestones are read-only and are never saved to the database.</p>}
                  <form className="workspace-milestone-form" onSubmit={event => save(event, 'milestone')}>
                    <label>Milestone<input required disabled={project.demoData} maxLength="120" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Deliver first milestone" /></label>
                    <label>Due date<WorkspaceDatePicker disabled={project.demoData} value={dueDate} onChange={setDueDate} /><small id="milestone-date-format">Use YYYY-MM-DD</small></label>
                    <button className="btn-secondary" disabled={busy || project.demoData}>{project.demoData ? 'Read-only example' : busy ? 'Saving...' : 'Add milestone'}</button>
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
