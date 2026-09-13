import { useEffect, useMemo, useRef, useState } from 'react'
import SectionTabs from './SectionTabs'
import { COMPANY_TASK_TYPES, COMPANY_TASK_TYPE_CONFIG, getCompanyTaskTypeLabel, mergeCompanyTaskLibraryState } from './companyTaskDefaults'
import SubmissionReview from './SubmissionReview'
import { toast } from '../ui/toast'
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'

const EMPTY_FORM = {
  type: 'live_project',
  title: '',
  instructions: '',
  deadline: '',
  points: '50',
  skills: '',
  details: {},
}

function formatDate(value) {
  if (!value) return 'Not set'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TaskTypePicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => {
    window.requestAnimationFrame(() => {
      if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
    })
  }

  return <div ref={pickerRef} className="task-type-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="task-type-trigger" aria-haspopup="listbox" aria-expanded={open}
      onClick={() => setOpen(current => !current)}>{options.find(option => option.value === value)?.label || value}</button>
    {open && <div className="task-type-options" role="listbox" aria-label="Assignment Type">
      {options.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value}
        onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}
    </div>}
  </div>
}

function TaskDatePicker({ value, onChange }) {
  const today = new Date()
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : today
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
  const pickerRef = useRef(null)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  while (cells.length % 7) cells.push(null)
  const closeWhenFocusLeaves = () => {
    window.requestAnimationFrame(() => {
      if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
    })
  }
  const selectDay = day => {
    if (!day) return
    onChange(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    setOpen(false)
  }

  return <div ref={pickerRef} className="task-date-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="task-date-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span>{value || 'YYYY-MM-DD'}</span><CalendarDays size={15} aria-hidden="true" />
    </button>
    {open && <div className="task-date-calendar" role="dialog" aria-label="Choose deadline">
      <div className="task-date-calendar-header"><button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={15}/></button><strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={15}/></button></div>
      <div className="task-date-weekdays">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="task-date-days">{cells.map((day, index) => <button key={`${year}-${monthIndex}-${index}`} type="button" disabled={!day} aria-pressed={day && value === `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`} onClick={() => selectDay(day)}>{day || ''}</button>)}</div>
    </div>}
  </div>
}

function TaskForm({ form, setForm, onCancel, onSave, isEditing, busy }) {
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const updateDetail = (key, value) => setForm(current => ({ ...current, details: { ...current.details, [key]: value } }))
  const typeConfig = COMPANY_TASK_TYPE_CONFIG[form.type] || COMPANY_TASK_TYPE_CONFIG.mixed

  return (
    <form onSubmit={event => { event.preventDefault(); onSave() }} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>{isEditing ? 'Edit Saved Assignment' : 'Create Real-World Assignment'}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Define the work a student will complete before you select them for the GIG.</div>
      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Assignment Type *</span>
          <TaskTypePicker value={form.type} options={COMPANY_TASK_TYPES} onChange={type => setForm(current => ({ ...current, type, details: {} }))} />
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Assignment Title *</span>
          <input value={form.title} onChange={event => update('title', event.target.value)} maxLength={160} placeholder="e.g. Redesign the mobile checkout flow" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{typeConfig.primaryLabel}</span>
          <textarea value={form.instructions} onChange={event => update('instructions', event.target.value)} maxLength={4000} rows={4} placeholder={typeConfig.primaryPlaceholder} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
        </label>
        {typeConfig.fields.map(field => (
          <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: field.multiline ? '1 / -1' : 'auto' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{field.label}</span>
            {field.multiline
              ? <textarea value={form.details?.[field.key] || ''} onChange={event => updateDetail(field.key, event.target.value)} maxLength={2000} rows={3} placeholder={field.placeholder} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
              : <input type={field.inputType || 'text'} min={field.inputType === 'number' ? 1 : undefined} max={field.key === 'passingScore' ? 100 : undefined} value={form.details?.[field.key] || ''} onChange={event => updateDetail(field.key, event.target.value)} placeholder={field.placeholder} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />}
          </label>
        ))}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Deadline *</span>
          <TaskDatePicker value={form.deadline} onChange={deadline => update('deadline', deadline)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Maximum Score *</span>
          <input type="number" min="1" max="100" value={form.points} onChange={event => update('points', event.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Skills Tested</span>
          <input value={form.skills} onChange={event => update('skills', event.target.value)} placeholder="UX research, Figma, responsive design" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={busy} className="btn-accent" style={{ padding: '8px 16px', fontSize: 12 }}>{busy ? 'Saving...' : isEditing ? 'Save Assignment' : 'Save Assignment Template'}</button>
      </div>
      </fieldset>
    </form>
  )
}

export default function TaskCenter({ taskLibraryState, onSaveState, gigManagementState, taskSubmissions = [], onSendInterviewTask, onReviewTaskSubmission }) {
  const [localState, setLocalState] = useState(() => mergeCompanyTaskLibraryState(taskLibraryState))
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('Assignments')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selectedGigId, setSelectedGigId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [assignmentMessage, setAssignmentMessage] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [search, setSearch] = useState('')
  const [reviewFilter, setReviewFilter] = useState('All')

  useEffect(() => {
    setLocalState(mergeCompanyTaskLibraryState(taskLibraryState))
  }, [taskLibraryState])

  const gigs = Array.isArray(gigManagementState?.gigs) ? gigManagementState.gigs : []
  const selectedTask = localState.tasks.find(task => task.id === selectedTaskId) || null
  const selectedGig = gigs.find(gig => String(gig.id) === String(selectedGigId)) || null
  const interviewSubmissions = taskSubmissions.flatMap(submission => {
    if (submission.interviewSubmission) return [{ ...submission, ...submission.interviewSubmission, status: 'selected', workBrief: '', interviewSubmission: null, archived: true }]
    if (['work_started', 'delivered', 'approved', 'completed'].includes(submission.status)
      || (submission.status === 'needs_revision' && submission.revisionReturnStatus === 'delivered')) return []
    return [submission]
  })
  const reviewQueue = interviewSubmissions.filter(submission => submission.status === 'submitted')
  const visibleSubmissions = interviewSubmissions.filter(submission => (reviewFilter === 'All' || submission.status === reviewFilter)
    && `${submission.studentName} ${submission.gigTitle} ${submission.taskTitle}`.toLowerCase().includes(search.toLowerCase()))
  const selectedCount = taskSubmissions.filter(submission => submission.status === 'selected').length

  const applicantOptions = useMemo(() => {
    const applicants = selectedGig
      ? (gigManagementState?.applicantsByGig?.[selectedGig.id] || gigManagementState?.applicantsByGig?.[String(selectedGig.id)] || [])
      : []
    return applicants.map(applicant => ({
      id: applicant.studentId || applicant.id,
      name: applicant.name || applicant.studentName || 'Applicant',
    })).filter(applicant => applicant.id)
  }, [gigManagementState?.applicantsByGig, selectedGig])

  const updateState = async nextState => {
    const mergedState = mergeCompanyTaskLibraryState(nextState)
    const saved = await onSaveState(mergedState)
    setLocalState(mergeCompanyTaskLibraryState(saved || mergedState))
  }

  const openCreateForm = () => {
    setEditingTaskId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = task => {
    setEditingTaskId(task.id)
    setForm({
      type: task.type || 'mixed',
      title: task.title || '',
      instructions: task.instructions || '',
      deadline: task.deadline || '',
      points: String(task.points || 50),
      skills: Array.isArray(task.skills) ? task.skills.join(', ') : '',
      details: task.details || {},
    })
    setShowForm(true)
  }

  const saveTask = async () => {
    if (busyAction) return
    const title = form.title.trim()
    const instructions = form.instructions.trim()
    const points = Number(form.points)
    const typeConfig = COMPANY_TASK_TYPE_CONFIG[form.type] || COMPANY_TASK_TYPE_CONFIG.mixed
    const missingTypeField = typeConfig.fields.find(field => field.required && !String(form.details?.[field.key] || '').trim())
    if (!title || !instructions || !form.deadline || !Number.isInteger(points) || points < 1 || points > 100 || missingTypeField) {
      toast.warning(missingTypeField ? `Complete ${missingTypeField.label.replace(' *', '')} before saving.` : 'Add a title, brief, deadline, and points from 1 to 100.', { title: 'Task Details Required' })
      return
    }

    const now = new Date().toISOString()
    const task = {
      id: editingTaskId || `task-${Date.now()}`,
      type: form.type || 'mixed',
      title,
      instructions,
      details: Object.fromEntries(Object.entries(form.details || {}).map(([key, value]) => [key, String(value || '').trim()])),
      deadline: form.deadline,
      points,
      skills: form.skills.split(',').map(skill => skill.trim()).filter(Boolean),
      createdAt: localState.tasks.find(item => item.id === editingTaskId)?.createdAt || now,
      updatedAt: now,
    }
    setBusyAction('save')
    try {
    await updateState({ ...localState, tasks: editingTaskId ? localState.tasks.map(item => item.id === editingTaskId ? task : item) : [task, ...localState.tasks] })
    setShowForm(false)
    setEditingTaskId(null)
    toast.success('The task template was saved.', { title: 'Task Saved' })
    } catch (error) { toast.error(error.message || 'Could not save the task.') }
    finally { setBusyAction('') }
  }

  const deleteTask = async task => {
    if (busyAction) return
    if (!window.confirm(`Delete "${task.title}" from saved tasks?`)) return
    setBusyAction('delete')
    try {
      await updateState({ ...localState, tasks: localState.tasks.filter(item => item.id !== task.id) })
      if (selectedTaskId === task.id) setSelectedTaskId(null)
    } catch (error) { toast.error(error.message || 'Could not delete the task.') }
    finally { setBusyAction('') }
  }

  const assignTask = async () => {
    if (busyAction) return
    const applicant = applicantOptions.find(item => String(item.id) === String(selectedStudentId))
    if (!selectedTask || !selectedGig || !applicant || !onSendInterviewTask) {
      toast.warning('Choose a saved task, GIG, and applicant first.', { title: 'Assignment Incomplete' })
      return
    }

    setBusyAction('assign')
    try {
      await onSendInterviewTask({ studentId: applicant.id, name: applicant.name }, selectedGig.title, {
        companyGigId: selectedGig.id,
        message: assignmentMessage.trim(),
        taskTitle: selectedTask.title,
        taskInstructions: selectedTask.instructions,
        taskDeadline: selectedTask.deadline,
        taskPoints: selectedTask.points,
        taskType: selectedTask.type || 'mixed',
        taskDetails: selectedTask.details || {},
      })
      toast.success(`${selectedTask.title} was sent to ${applicant.name}.`, { title: 'Task Assigned' })
      setAssignmentMessage('')
    } catch (error) {
      toast.error(error.message || 'The task could not be sent.', { title: 'Assignment Failed' })
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div className="company-work-section task-viewport">
      <div className="work-heading task-center-heading"><h2>Task Center</h2><button className="btn-primary task-create-button" onClick={openCreateForm} disabled={Boolean(busyAction)}>Create Task</button></div>

      <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          ['Saved Tasks', localState.tasks.length, '📋', '#4F46E5'],
          ['Awaiting Review', reviewQueue.length, '📝', '#D97706'],
          ['Selected Students', selectedCount, '✓', '#059669'],
        ].map(([label, value, icon, color]) => (
          <div key={label} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--dark)' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>

      <SectionTabs label="Task Center views" options={['Assignments', 'Submissions']} value={view} onChange={setView} />
      {showForm && <div className="company-task-editor"><button type="button" className="btn-secondary" disabled={Boolean(busyAction)} onClick={() => setShowForm(false)}>Back to tasks</button><TaskForm form={form} setForm={setForm} onCancel={() => setShowForm(false)} onSave={saveTask} isEditing={Boolean(editingTaskId)} busy={Boolean(busyAction)} /></div>}

      {!showForm && view === 'Assignments' && <div className="responsive-split-main task-assignment-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <section className="task-template-panel" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><div style={{ fontSize: 17, fontWeight: 800 }}>Saved Assignment Templates</div><span style={{ fontSize: 12, color: 'var(--muted)' }}>{localState.tasks.length} saved</span></div>
          {localState.tasks.length === 0 && <div style={{ padding: '34px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Create a practical work sample to send to a GIG applicant.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {localState.tasks.map(task => (
              <div key={task.id} style={{ border: `1px solid ${selectedTaskId === task.id ? '#818CF8' : 'var(--border)'}`, background: selectedTaskId === task.id ? '#F8FAFF' : 'var(--white)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div><div style={{ fontWeight: 800, color: 'var(--dark)', marginBottom: 5 }}>{task.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{getCompanyTaskTypeLabel(task.type)} · Due {formatDate(task.deadline)} · {task.points} points</div></div>
                  <div className="task-template-actions"><button type="button" disabled={Boolean(busyAction)} title="Edit assignment" aria-label={`Edit ${task.title}`} onClick={() => openEditForm(task)} className="btn-secondary task-icon-button"><Pencil size={15} /></button><button type="button" disabled={Boolean(busyAction)} title="Delete assignment" aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task)} className="btn-secondary task-icon-button"><Trash2 size={15} /></button></div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--dark)', lineHeight: 1.5, margin: '9px 0' }}>{task.instructions}</div>
                <button type="button" onClick={() => { setSelectedTaskId(task.id); setSelectedGigId(''); setSelectedStudentId('') }} className="btn-primary task-assign-button">{selectedTaskId === task.id ? 'Selected for Assignment' : 'Assign to Applicant'}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="task-assignment-panel" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 5 }}>Assign Saved Task</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Only students who applied to the selected GIG can receive a task.</div>
          {!selectedTask && <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, color: 'var(--muted)', fontSize: 13 }}>Select a saved task first.</div>}
          {selectedTask && <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 9, padding: '10px 12px', fontSize: 13, fontWeight: 800, color: '#3730A3' }}>{selectedTask.title}</div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>GIG</span><select aria-label="GIG" value={selectedGigId} onChange={event => { setSelectedGigId(event.target.value); setSelectedStudentId('') }} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)' }}><option value="">Choose a GIG</option>{gigs.filter(gig => gig.status !== 'Closed').map(gig => <option key={gig.id} value={gig.id}>{gig.title}</option>)}</select></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Applicant</span><select aria-label="Applicant" value={selectedStudentId} onChange={event => setSelectedStudentId(event.target.value)} disabled={!selectedGigId} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)' }}><option value="">{selectedGig ? (applicantOptions.length ? 'Choose an applicant' : 'No applicants yet') : 'Choose a GIG first'}</option>{applicantOptions.map(applicant => <option key={applicant.id} value={applicant.id}>{applicant.name}</option>)}</select></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Message (optional)</span><textarea value={assignmentMessage} onChange={event => setAssignmentMessage(event.target.value)} maxLength={1000} rows={3} placeholder="Add a short note for the student..." style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical' }} /></label>
            <div className="task-assignment-actions">
              <button type="button" onClick={() => { setSelectedTaskId(null); setSelectedGigId(''); setSelectedStudentId(''); setAssignmentMessage('') }} disabled={Boolean(busyAction)} className="btn-secondary" style={{ padding: '10px 14px', fontSize: 13 }}>Cancel</button>
              <button type="button" onClick={assignTask} disabled={Boolean(busyAction) || !selectedStudentId} className="btn-accent" style={{ padding: '10px 14px', fontSize: 13 }}>{busyAction === 'assign' ? 'Sending...' : 'Send Task to Student'}</button>
            </div>
          </div>}
        </section>
      </div>}

      {!showForm && view === 'Submissions' && <section className="task-submission-panel" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><div style={{ fontSize: 17, fontWeight: 800 }}>Submitted Tasks</div><span style={{ fontSize: 12, color: 'var(--muted)' }}>Review evidence before selection</span></div>
        <div className="work-form-grid" style={{ marginBottom: 12 }}>
          <input type="search" aria-label="Search submissions" placeholder="Search student or assignment" value={search} onChange={event => setSearch(event.target.value)} />
          <TaskTypePicker
            value={reviewFilter}
            options={[
              ['All', 'All'], ['submitted', 'Awaiting review'], ['reviewed', 'Reviewed'],
              ['needs_revision', 'Revision requested'], ['selected', 'Selected'], ['rejected', 'Rejected'],
            ].map(([value, label]) => ({ value, label }))}
            onChange={setReviewFilter}
          />
        </div>
        {visibleSubmissions.length === 0 && <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No matching interview submissions.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleSubmissions.map(submission => <SubmissionReview key={submission.id + submission.status} readOnly={submission.archived} submission={submission} onReview={onReviewTaskSubmission} />)}
        </div>
      </section>}
    </div>
  )
}
