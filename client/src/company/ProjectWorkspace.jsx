import { useEffect, useMemo, useState } from 'react'
import { buildDefaultCompanyWorkspaceState, mergeCompanyWorkspaceState } from './companyWorkspaceDemoData'
import { toast } from '../ui/toast'

const STATUS_META = {
  Planning: { bg: '#E0E7FF', color: '#3730A3' },
  'In Progress': { bg: '#FEF3C7', color: '#92400E' },
  Review: { bg: '#DBEAFE', color: '#1D4ED8' },
  Completed: { bg: '#D1FAE5', color: '#065F46' },
}

const TASK_META = {
  Todo: { bg: '#F1F5F9', color: '#475569' },
  'In Review': { bg: '#DBEAFE', color: '#1D4ED8' },
  Done: { bg: '#D1FAE5', color: '#065F46' },
}

const TASK_STATE_ORDER = ['Todo', 'In Review', 'Done']

export default function ProjectWorkspace({ projectWorkspaceState, onSaveState, onShareUpdate, onSetMilestone }) {
  const [localState, setLocalState] = useState(() => mergeCompanyWorkspaceState(projectWorkspaceState || buildDefaultCompanyWorkspaceState()))
  const [busyAction, setBusyAction] = useState('')

  useEffect(() => {
    setLocalState(mergeCompanyWorkspaceState(projectWorkspaceState || buildDefaultCompanyWorkspaceState()))
  }, [projectWorkspaceState])

  const updateWorkspaceState = (updater) => {
    setLocalState(current => {
      const nextState = typeof updater === 'function' ? updater(current) : updater
      const mergedState = mergeCompanyWorkspaceState(nextState)
      onSaveState(mergedState)
      return mergedState
    })
  }

  const statusOptions = ['All', 'Planning', 'In Progress', 'Review', 'Completed']

  const filteredProjects = useMemo(
    () => localState.projects.filter(project => localState.statusFilter === 'All' || project.status === localState.statusFilter),
    [localState.projects, localState.statusFilter]
  )

  const selectedProject = filteredProjects.find(project => project.id === localState.selectedProjectId) || filteredProjects[0] || null
  const allTasks = localState.projects.flatMap(project => project.tasks)

  const cycleTaskState = (projectId, taskName) => {
    updateWorkspaceState(current => {
      const projects = current.projects.map(project => {
        if (project.id !== projectId) return project

        const tasks = project.tasks.map(task => {
          if (task.name !== taskName) return task
          const currentIndex = TASK_STATE_ORDER.indexOf(task.state)
          return { ...task, state: TASK_STATE_ORDER[(currentIndex + 1) % TASK_STATE_ORDER.length] }
        })
        const completedCount = tasks.filter(task => task.state === 'Done').length

        return {
          ...project,
          tasks,
          progress: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : project.progress,
        }
      })

      return { ...current, projects }
    })
  }

  const handleShareUpdate = async () => {
    if (!selectedProject || busyAction) return
    const message = window.prompt('Share a short project update', selectedProject.updates?.[selectedProject.updates.length - 1]?.message || '')
    if (!message?.trim()) return

    setBusyAction('update')
    try {
      if (onShareUpdate) {
        await onShareUpdate(selectedProject.id, message)
      } else {
        updateWorkspaceState(current => ({
          ...current,
          projects: current.projects.map(project => project.id === selectedProject.id
            ? { ...project, updates: [...(project.updates || []), { id: `update-${Date.now()}`, message: message.trim(), sharedAt: new Date().toISOString() }].slice(-20) }
            : project),
        }))
        toast.success('The project update was saved.', { title: 'Update Shared' })
      }
    } catch (error) {
      toast.error(error.message || 'The project update could not be saved.', { title: 'Update Failed' })
    } finally {
      setBusyAction('')
    }
  }

  const handleSetMilestone = async () => {
    if (!selectedProject || busyAction) return
    const title = window.prompt('Set a milestone for this project', selectedProject.milestones?.[selectedProject.milestones.length - 1]?.title || '')
    if (!title?.trim()) return
    const dueDate = window.prompt('Milestone due date (optional)', selectedProject.deadline || '') || ''

    setBusyAction('milestone')
    try {
      const milestone = { title: title.trim(), dueDate: dueDate.trim() }
      if (onSetMilestone) {
        await onSetMilestone(selectedProject.id, milestone)
      } else {
        updateWorkspaceState(current => ({
          ...current,
          projects: current.projects.map(project => project.id === selectedProject.id
            ? { ...project, milestones: [...(project.milestones || []), { id: `milestone-${Date.now()}`, ...milestone, status: 'Open', createdAt: new Date().toISOString() }].slice(-20) }
            : project),
        }))
        toast.success('The project milestone was saved.', { title: 'Milestone Set' })
      }
    } catch (error) {
      toast.error(error.message || 'The milestone could not be saved.', { title: 'Milestone Failed' })
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
        borderRadius: 14,
        borderLeft: '5px solid #818CF8',
        boxShadow: '0 8px 24px rgba(30,27,75,0.14)',
        padding: '18px 20px',
        marginBottom: 16,
        color: 'white',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
          <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'rgba(129,140,248,0.2)', fontSize: 14 }}>🗂️</span>
          Project Workspace
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Track live project execution and delivery</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          Monitor task flow, deadlines, and team progress from one workspace.
        </div>
      </div>

      <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Active Projects', value: localState.projects.length, icon: '🗂️' },
          { label: 'In Progress Tasks', value: allTasks.filter(task => task.state === 'In Review').length, icon: '⚡' },
          { label: 'Completed Tasks', value: allTasks.filter(task => task.state === 'Done').length, icon: '✅' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderTop: '3px solid #818CF8', borderRadius: 12, padding: '16px 16px 14px', boxShadow: '0 2px 8px rgba(15,23,42,0.03)' }}>
            <div style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#EEF2FF', fontSize: 17, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>Projects Board</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {statusOptions.map(option => (
                <button
                  key={option}
                  onClick={() => updateWorkspaceState(current => ({ ...current, statusFilter: option }))}
                  style={{
                    border: 'none',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    background: localState.statusFilter === option ? 'var(--accent)' : 'var(--bg)',
                    color: localState.statusFilter === option ? 'white' : 'var(--muted)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredProjects.map(project => {
              const statusMeta = STATUS_META[project.status] || STATUS_META.Planning
              const isActive = selectedProject?.id === project.id
              return (
                <button
                  key={project.id}
                  onClick={() => updateWorkspaceState(current => ({ ...current, selectedProjectId: project.id }))}
                  style={{
                    border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10,
                    background: isActive ? 'var(--accent-light)' : 'var(--white)',
                    textAlign: 'left',
                    padding: '12px 13px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{project.title}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 100, padding: '3px 8px', background: statusMeta.bg, color: statusMeta.color }}>
                      {project.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>{project.company} · Deadline {project.deadline}</div>
                  <div style={{ height: 7, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{ width: `${project.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), #FB923C)' }} />
                  </div>
                </button>
              )
            })}
            {filteredProjects.length === 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px', fontSize: 13, color: 'var(--muted)' }}>
                No project found for this status.
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
          {selectedProject ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>{selectedProject.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                {selectedProject.company} · {selectedProject.progress}% completed · {selectedProject.team.join(', ')}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    updateWorkspaceState(current => ({ ...current, selectedProjectId: selectedProject.id, statusFilter: 'All' }))
                    toast.info('The selected project is open in this workspace.', { title: 'Workspace Open' })
                  }}
                  style={{ padding: '8px 12px', fontSize: 12 }}
                >
                  Open Workspace
                </button>
                <button className="btn-secondary" onClick={handleShareUpdate} disabled={Boolean(busyAction)} style={{ padding: '8px 12px', fontSize: 12 }}>
                  {busyAction === 'update' ? 'Saving...' : 'Share Update'}
                </button>
                <button className="btn-secondary" onClick={handleSetMilestone} disabled={Boolean(busyAction)} style={{ padding: '8px 12px', fontSize: 12 }}>
                  {busyAction === 'milestone' ? 'Saving...' : 'Set Milestone'}
                </button>
              </div>

              {selectedProject.milestones?.length > 0 && (
                <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 9, padding: '9px 11px', marginBottom: 14, fontSize: 12, color: '#3730A3' }}>
                  <strong>Next milestone:</strong> {selectedProject.milestones[selectedProject.milestones.length - 1].title}
                  {selectedProject.milestones[selectedProject.milestones.length - 1].dueDate && ` · ${selectedProject.milestones[selectedProject.milestones.length - 1].dueDate}`}
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Task Checklist
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedProject.tasks.map(task => {
                  const meta = TASK_META[task.state] || TASK_META.Todo
                  return (
                    <div key={task.name} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 2 }}>{task.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Owner: {task.owner}</div>
                      </div>
                      <button
                        type="button"
                        title="Advance task status"
                        onClick={() => cycleTaskState(selectedProject.id, task.name)}
                        style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '4px 9px', background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}
                      >
                        {task.state}
                      </button>
                    </div>
                  )
                })}
              </div>

              {selectedProject.updates?.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Recent Updates</div>
                  {selectedProject.updates.slice(-2).reverse().map(update => (
                    <div key={update.id} style={{ fontSize: 12, color: 'var(--text)', background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', marginTop: 6 }}>
                      {update.message}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Pick a project from the board to view details.</div>
          )}
        </div>
      </div>
    </div>
  )
}
