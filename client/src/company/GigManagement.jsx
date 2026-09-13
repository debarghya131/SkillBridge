import { useEffect, useMemo, useRef, useState } from 'react'
import { buildDefaultCompanyGigManagementState, mergeCompanyGigManagementState } from './companyGigDemoData'
import { safeExternalUrl } from '../lib/safeExternalUrl'
import { fetchCompanyGigApplicants, fetchCompanyStudentProfile, getCompanySessionToken } from './companyApi'
import PublicStudentProfile from '../ui/PublicStudentProfile'
import { toast } from '../ui/toast'
import { getCompanyTaskTypeLabel } from './companyTaskDefaults'

const statusMeta = {
  Closed: { bg: '#F1F5F9', color: '#475569' },
  Hiring: { bg: '#D1FAE5', color: '#065F46' },
  Reviewing: { bg: '#FEF3C7', color: '#92400E' },
  'In Progress': { bg: '#EDE9FE', color: '#7C3AED' },
}

const PROFILE_LEVEL_META = {
  'Pro Mastery': { bg: '#FEF3C7', color: '#A16207' },
  Pro: { bg: '#F3E8FF', color: '#7C3AED' },
  Intermediate: { bg: '#EFF6FF', color: '#1D4ED8' },
  Beginner: { bg: '#F0FDF4', color: '#15803D' },
}
const REVIEW_STATUS_OPTIONS = [
  { value: 'reviewed', label: 'Mark Reviewed' },
  { value: 'selected', label: 'Select Student' },
  { value: 'rejected', label: 'Reject Submission' },
  { value: 'approved', label: 'Approve Work' },
  { value: 'needs_revision', label: 'Needs Revision' },
]

function GigFormMenu({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const normalizedOptions = options.map(option => typeof option === 'string' ? { value: option, label: option } : option)
  const closeWhenFocusLeaves = () => {
    window.requestAnimationFrame(() => {
      if (!menuRef.current?.contains(document.activeElement)) setOpen(false)
    })
  }

  return <div ref={menuRef} className="gig-form-menu" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="gig-form-menu-trigger" aria-haspopup="listbox" aria-expanded={open}
    onClick={() => setOpen(current => !current)}>{normalizedOptions.find(option => option.value === value)?.label || value}</button>
    {open && <div className="gig-form-menu-options" role="listbox" aria-label={label}>
      {normalizedOptions.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value}
        onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}
    </div>}
  </div>
}

function availableReviewOptions(status) {
  const next = {
    submitted: ['reviewed', 'rejected', 'needs_revision'],
    reviewed: ['selected', 'rejected', 'needs_revision'],
    delivered: ['approved', 'needs_revision'],
    ready_to_hire: ['selected'],
  }
  return REVIEW_STATUS_OPTIONS.filter(option => (next[status] || []).includes(option.value))
}

function buildApplicantProfile(applicant) {
  const name = applicant.name || applicant.studentName || 'Student'
  const skills = Array.isArray(applicant.profileSkills)
    ? applicant.profileSkills
    : (Array.isArray(applicant.skills)
    ? applicant.skills
    : (Array.isArray(applicant.studentSkills) ? applicant.studentSkills : []))
  const contactInfo = Array.isArray(applicant.contactInfo)
    ? applicant.contactInfo
    : (Array.isArray(applicant.studentContactInfo) ? applicant.studentContactInfo : [])
  const savedProjects = Array.isArray(applicant.savedProjects)
    ? applicant.savedProjects
    : (Array.isArray(applicant.studentProjects) ? applicant.studentProjects : [])

  return {
    ...applicant,
    studentId: applicant.studentId || applicant.taskSubmission?.studentId || '',
    name,
    location: applicant.location || applicant.studentLocation || '',
    score: applicant.score ?? applicant.trustScore ?? applicant.studentTrustScore ?? 0,
    skills,
    skillsByLevel: applicant.profileSkillsByLevel || applicant.skillsByLevel || applicant.studentSkillsByLevel || {
      'Pro Mastery': [],
      Pro: [],
      Intermediate: [],
      Beginner: [],
    },
    streak: applicant.streak ?? applicant.studentStreak ?? 0,
    avatar: applicant.isLiveProfile ? applicant.avatar : (applicant.avatar || applicant.studentAvatar || null),
    github: applicant.isLiveProfile ? applicant.github : (applicant.github || applicant.studentGithub || ''),
    contactInfo,
    savedProjects,
    videoUrl: applicant.isLiveProfile
      ? (applicant.videoUrl || null)
      : (applicant.videoUrl || applicant.studentVideoUrl || null),
  }
}

function getSkillLevel(profile, skill) {
  if (!profile.skillsByLevel) {
    return null
  }

  for (const [level, list] of Object.entries(profile.skillsByLevel)) {
    if (Array.isArray(list) && list.includes(skill)) {
      return level
    }
  }

  return null
}

function extractNumericBudget(value) {
  return String(value || '').replace(/[^0-9]/g, '')
}

function formatGigBudget(value, type) {
  const amount = Number(extractNumericBudget(value))
  const period = type === 'Project GIG' ? 'project' : 'month'
  return `₹${Math.max(0, amount).toLocaleString('en-IN')} / ${period}`
}

function CreateGigModal({ open, initialData, onClose, onCreate, onUpdate, onDelete, mode }) {
  const [form, setForm] = useState({
    title: '',
    mode: 'Remote',
    location: '',
    type: 'Internship',
    budget: '',
    status: 'Hiring',
    skills: '',
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (mode === 'edit' && initialData) {
      setForm({
        title: initialData.title || '',
        mode: initialData.mode || 'Remote',
        location: initialData.location || '',
        type: initialData.type || 'Internship',
        budget: extractNumericBudget(initialData.budget),
        status: initialData.status || 'Hiring',
        skills: Array.isArray(initialData.skills) ? initialData.skills.join(', ') : '',
      })
      return
    }

    setForm({
      title: '',
      mode: 'Remote',
      location: '',
      type: 'Internship',
      budget: '',
      status: 'Hiring',
      skills: '',
    })
  }, [initialData, mode, open])

  if (!open) return null

  const updateField = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const handleSubmit = e => {
    e.preventDefault()
    const trimmedTitle = form.title.trim()
    const trimmedLocation = form.location.trim()
    const trimmedBudget = form.budget.trim()
    const skills = form.skills
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean)

    if (!trimmedTitle || !trimmedLocation || !trimmedBudget) return

    const payload = {
      title: trimmedTitle,
      mode: form.mode,
      location: trimmedLocation,
      type: form.type,
      budget: formatGigBudget(trimmedBudget, form.type),
      status: form.status,
      skills: skills.length > 0 ? skills : ['General'],
    }

    if (mode === 'edit' && initialData) {
      onUpdate({
        ...initialData,
        ...payload,
      })
    } else {
      onCreate(payload)
    }
  }

  return (
    <div
      className="responsive-modal-shell"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.58)',
        backdropFilter: 'blur(7px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1200,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <form
        className="responsive-modal-card"
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--white)',
          maxHeight: 'calc(100vh - 40px)',
          borderRadius: 15,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div className="responsive-modal-header" style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>{mode === 'edit' ? 'Edit GIG' : 'Create New GIG'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{mode === 'edit' ? 'Update role details for this GIG.' : 'Add role details to publish this GIG.'}</div>
          </div>
          <button type="button" aria-label="Close create GIG dialog" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div className="responsive-modal-body responsive-form-grid" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflowY: 'auto' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Role Title *</span>
            <input
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="e.g. Frontend Internship"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }}
              required
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Work Mode</span>
            <GigFormMenu label="Work Mode" value={form.mode} options={['Remote', 'Hybrid', 'On-site']} onChange={value => updateField('mode', value)} />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Location *</span>
            <input
              value={form.location}
              onChange={e => updateField('location', e.target.value)}
              placeholder="e.g. Kolkata, West Bengal"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }}
              required
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>GIG Type</span>
            <GigFormMenu label="GIG Type" value={form.type} options={['Internship', 'Project GIG']} onChange={value => updateField('type', value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Status</span>
            <GigFormMenu label="GIG Status" value={form.status} options={['Hiring', 'Reviewing', 'In Progress', 'Closed']} onChange={value => updateField('status', value)} />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{form.type === 'Project GIG' ? 'Project Budget *' : 'Monthly Budget *'}</span>
            <input
              type="number"
              min="100"
              step="1"
              inputMode="numeric"
              value={form.budget}
              onChange={e => updateField('budget', e.target.value)}
              placeholder="e.g. 10000"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }}
              required
            />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{form.budget ? `Will display as ${formatGigBudget(form.budget, form.type)}` : 'Enter numbers only.'}</span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Skills (comma separated)</span>
            <input
              value={form.skills}
              onChange={e => updateField('skills', e.target.value)}
              placeholder="React, UI/UX Design"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${initialData?.title || 'this GIG'}"? This will remove it from student Browse GIGs.`)) {
                  onDelete?.(initialData)
                }
              }}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#B91C1C', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
            >
              Delete GIG
            </button>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginLeft: 'auto' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" className="btn-accent" style={{ padding: '8px 14px', fontSize: 12 }}>
              {mode === 'edit' ? 'Save Changes' : 'Create GIG'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ApplicantsModal({ gig, applicants, loading, error, onRetry, onClose, onViewProfile }) {
  if (!gig) return null

  return (
    <div
      className="responsive-modal-shell"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1000,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="responsive-modal-card" style={{
        width: '100%',
        maxWidth: 760,
        maxHeight: '88vh',
        overflowY: 'auto',
        background: 'var(--white)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="responsive-modal-header" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>{gig.title} Candidates</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{loading ? 'Loading applicants...' : error ? 'Applicants unavailable' : `${applicants.length} candidate${applicants.length !== 1 ? 's' : ''} available`}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div className="responsive-modal-body" style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {error && <div role="alert">{error} <button onClick={onRetry} className="btn-accent">Retry</button></div>}
          {!loading && !error && applicants.length === 0 && <div>No applicants or direct invitees yet.</div>}
          {applicants.map(applicant => (
            <div key={applicant.id} className="responsive-stack" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#E0E7FF', color: '#4338CA', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 900 }}>
                  {applicant.avatar
                    ? <img src={applicant.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (applicant.name || 'S').trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{applicant.name}</div>
                    {applicant.pipelineSource === 'direct_invite' && (
                      <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 800 }}>
                        Direct Invite
                      </span>
                    )}
                    {applicant.taskSubmission && (
                      <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 800 }}>
                        {applicant.taskSubmission.status === 'delivered' ? 'Work Delivered' : 'Task Submitted'}
                      </span>
                    )}
                    {applicant.interviewTaskSent && (
                      <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 800 }}>
                        ✓ Task Sent
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>📍 {applicant.location || 'Location not added'}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {(Array.isArray(applicant.profileSkills) ? applicant.profileSkills : (Array.isArray(applicant.skills) ? applicant.skills : [])).slice(0, 7).map(skill => (
                      <span key={skill} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                        {skill}
                      </span>
                    ))}
                    {((applicant.profileSkills || applicant.skills)?.length || 0) > 7 && (
                      <span style={{ color: 'var(--muted)', padding: '3px 4px', fontSize: 11, fontWeight: 700 }}>+{(applicant.profileSkills || applicant.skills).length - 7}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="responsive-company-gig-side applicant-decision-panel" style={{ minWidth: 122, paddingLeft: 16, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--dark)', lineHeight: 1 }}>{applicant.score ?? applicant.trustScore ?? 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontWeight: 700 }}>TRUSTSCORE</div>
                </div>
                <button className="btn-accent" onClick={() => onViewProfile(buildApplicantProfile(applicant))} style={{ padding: '8px 13px', fontSize: 12, whiteSpace: 'nowrap' }}>
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ApplicantProfileModal({ applicant, savedTasks = [], onClose, onReviewSubmission, onReviewSaved, onSendInterviewTask, onOpenTaskCenter }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [levelFilter, setLevelFilter] = useState('All')
  const [reviewStatus, setReviewStatus] = useState(() => availableReviewOptions(applicant?.taskSubmission?.status)[0]?.value || '')
  const [reviewScore, setReviewScore] = useState(applicant?.taskSubmission?.score ?? '')
  const [feedbackNote, setFeedbackNote] = useState(applicant?.taskSubmission?.feedback || '')
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteMessage, setInviteMessage] = useState(applicant?.interviewMessage || '')
  const [inviteSent, setInviteSent] = useState(Boolean(applicant?.interviewTaskSent && applicant?.taskTitle && applicant?.taskInstructions && applicant?.taskDeadline))
  const [selectedTaskId, setSelectedTaskId] = useState('')

  useEffect(() => {
    setInviteMessage(applicant?.interviewMessage || '')
    setInviteSent(Boolean(applicant?.interviewTaskSent && applicant?.taskTitle && applicant?.taskInstructions && applicant?.taskDeadline))
    setSelectedTaskId('')
    setInviteError('')
  }, [
    applicant?.studentId,
    applicant?.interviewTaskSent,
    applicant?.interviewMessage,
    applicant?.taskTitle,
    applicant?.taskType,
    applicant?.taskInstructions,
    applicant?.taskDeadline,
  ])

  if (!applicant) return null

  const selectedSavedTask = savedTasks.find(task => String(task.id) === String(selectedTaskId)) || null

  const filteredSkills = levelFilter === 'All'
    ? applicant.skills
    : (applicant.skillsByLevel?.[levelFilter] || [])

  const togglePlay = async () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        await videoRef.current.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }
  }

  const submissionStatusMeta = {
    submitted: { label: 'Submitted', bg: '#EDE9FE', color: '#6D28D9' },
    reviewed: { label: 'Reviewed', bg: '#DBEAFE', color: '#1D4ED8' },
    selected: { label: 'Selected', bg: '#D1FAE5', color: '#065F46' },
    rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#B91C1C' },
    work_started: { label: 'Work Started', bg: '#EDE9FE', color: '#7C3AED' },
    delivered: { label: 'Work Delivered', bg: '#DBEAFE', color: '#1D4ED8' },
    approved: { label: 'Approved', bg: '#D1FAE5', color: '#065F46' },
    completed: { label: 'Completed', bg: '#D1FAE5', color: '#065F46' },
    needs_revision: { label: 'Needs Revision', bg: '#FEF3C7', color: '#92400E' },
  }
  const currentSubmissionMeta = applicant.taskSubmission ? (submissionStatusMeta[applicant.taskSubmission.status] || submissionStatusMeta.submitted) : null

  const handleReview = async () => {
    if (!applicant.taskSubmission || !onReviewSubmission) {
      return
    }

    setReviewError('')
    setIsSavingReview(true)

    try {
      const reviewedSubmission = await onReviewSubmission(applicant.taskSubmission.id, {
        status: reviewStatus,
        feedback: feedbackNote,
        score: reviewScore === '' ? null : Number(reviewScore),
      })

      onReviewSaved?.(reviewedSubmission)
    } catch (error) {
      setReviewError(error.message || 'Could not save review right now.')
    } finally {
      setIsSavingReview(false)
    }
  }

  return (
    <div
      className="responsive-modal-shell"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1100,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="responsive-modal-card" style={{
        width: '100%',
        maxWidth: 760,
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'var(--white)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="responsive-modal-header" style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          borderRadius: '20px 20px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              overflow: 'hidden',
              background: applicant.avatar ? 'transparent' : 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 900,
              border: '3px solid rgba(255,255,255,0.2)',
            }}>
              {applicant.avatar
                ? <img src={applicant.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : applicant.name[0]}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{applicant.name}</div>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#10B981', color: 'white', padding: '2px 10px', borderRadius: 100 }}>
                  ✓ Verified
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 100,
                  boxShadow: '0 0 12px rgba(99,102,241,0.6)',
                }}>
                  ⭐ {applicant.score} <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>/ 1000</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{applicant.location}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>TrustScore™</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div className="responsive-modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="responsive-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Skills</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['All', 'Pro Mastery', 'Pro', 'Intermediate', 'Beginner'].map(level => {
                  const meta = level === 'All' ? { bg: '#F1F5F9', color: '#475569' } : PROFILE_LEVEL_META[level]
                  return (
                    <button
                      key={level}
                      onClick={() => setLevelFilter(level)}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: levelFilter === level ? meta.color : meta.bg,
                        color: levelFilter === level ? 'white' : meta.color,
                        padding: '3px 9px',
                        borderRadius: 100,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {level}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {filteredSkills.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 13 }}>No skills added in this category</span>}
              {filteredSkills.map(skill => {
                const level = getSkillLevel(applicant, skill)
                const levelMeta = level ? PROFILE_LEVEL_META[level] : null

                return (
                  <span key={skill} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    padding: '5px 12px',
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    {skill}
                    {levelMeta && <span style={{ background: levelMeta.bg, color: levelMeta.color, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 100 }}>{level}</span>}
                    <span style={{ background: '#FFF7ED', color: '#EA580C', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                      {applicant.streak} d streak
                    </span>
                  </span>
                )
              })}
            </div>
          </div>

          {applicant.videoUrl && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/7', maxWidth: 460 }}>
              <video ref={videoRef} src={safeExternalUrl(applicant.videoUrl) || undefined} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
            </div>
            <button
              onClick={togglePlay}
              style={{
                marginTop: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 18px',
                borderRadius: 7,
                border: isPlaying ? '1.5px solid #FCA5A5' : '1.5px solid #DC2626',
                background: isPlaying ? '#FEF2F2' : '#EF4444',
                color: isPlaying ? '#EF4444' : 'white',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play'}
            </button>
          </div>
          )}

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>GitHub</div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px', fontSize: 13, color: 'var(--dark)' }}>
              {applicant.github || 'No GitHub link added'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {applicant.contactInfo.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>No contact details added</div>}
              {applicant.contactInfo.map((item, index) => (
                <div key={`${item.label}-${index}`} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Recent Projects</div>
            <div className="responsive-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {applicant.savedProjects.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>No projects added</div>}
              {applicant.savedProjects.map(project => (
                <div key={project.name} style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{project.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {applicant.taskSubmission && (
            <div style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px' }}>
              <div className="responsive-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Interview Task Submission
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, background: currentSubmissionMeta.bg, color: currentSubmissionMeta.color, padding: '4px 10px', borderRadius: 100 }}>
                  {currentSubmissionMeta.label}
                </span>
              </div>

              {applicant.taskSubmission.submissionLink && <>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Submission Link</div>
                <a href={safeExternalUrl(applicant.taskSubmission.submissionLink) || undefined} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 13, color: 'var(--primary)', fontWeight: 700, marginBottom: 12, wordBreak: 'break-word' }}>
                  {applicant.taskSubmission.submissionLink}
                </a>
              </>}

              {applicant.taskSubmission.submissionContent && <>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Written Response</div>
                <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {applicant.taskSubmission.submissionContent}
                </div>
              </>}

              {applicant.taskSubmission.note && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Student Note</div>
                  <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.6, marginBottom: 12 }}>
                    {applicant.taskSubmission.note}
                  </div>
                </>
              )}

              {availableReviewOptions(applicant.taskSubmission.status).length > 0 ? <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Review Status</span>
                  <select
                    value={reviewStatus}
                    onChange={e => setReviewStatus(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', fontSize: 13, fontFamily: 'inherit' }}
                  >
                    {availableReviewOptions(applicant.taskSubmission.status).map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Score / {applicant.taskSubmission.taskPoints}</span>
                  <input type="number" min="0" max={applicant.taskSubmission.taskPoints} value={reviewScore} onChange={e => setReviewScore(e.target.value)} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Feedback for Student</span>
                  <textarea
                    maxLength={2000}
                    value={feedbackNote}
                    onChange={e => setFeedbackNote(e.target.value)}
                    rows={4}
                    placeholder="Add review notes, revision guidance, or shortlist feedback..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </label>
              </div> : applicant.taskSubmission.status === 'selected' ? <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                <span>Student selected. Add the GIG work brief and start work in Task Center.</span>
                <button type="button" className="btn-secondary" onClick={onOpenTaskCenter} style={{ justifySelf: 'start', padding: '8px 12px', fontSize: 12 }}>Open Task Center</button>
              </div> : <div style={{ fontSize: 13 }}>{applicant.taskSubmission.feedback || 'No review action available at this stage.'}</div>}

              {reviewError && (
                <div style={{ fontSize: 12, color: '#B91C1C', fontWeight: 700, marginTop: 10 }}>
                  {reviewError}
                </div>
              )}
            </div>
          )}

          <div className="responsive-stack" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {inviteSent ? (
              <div style={{ flex: '1 1 100%', order: -1, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 12px', color: '#065F46', fontSize: 13 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Interview Task Sent</div>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>{applicant.taskTitle || 'Task details saved'}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Type: {getCompanyTaskTypeLabel(applicant.taskType)}</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{applicant.taskInstructions || 'The student can now see this task in Opportunity.'}</div>
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700 }}>
                  Deadline: {applicant.taskDeadline || 'Not set'} · Points: {applicant.taskPoints || 0}
                </div>
                {inviteMessage && <div style={{ marginTop: 6 }}>Message: {inviteMessage}</div>}
              </div>
            ) : <div style={{ flex: '1 1 100%', order: -1, display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>Assign Interview Task</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Choose a saved assignment or create a new one in Task Center.</div>
              </div>
              {savedTasks.length > 0 ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Saved Assignment *</span>
                  <GigFormMenu
                    value={selectedTaskId}
                    options={[{ value: '', label: 'Choose a saved assignment' }, ...savedTasks.map(task => ({ value: task.id, label: `${task.title} · ${getCompanyTaskTypeLabel(task.type)}` }))]}
                    label="Saved Assignment"
                    onChange={setSelectedTaskId}
                  />
                </label>
              ) : (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>
                  No saved assignments yet. Create one in Task Center before sending it to this student.
                </div>
              )}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Message for Student</span>
                <textarea
                  value={inviteMessage}
                  onChange={event => setInviteMessage(event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="Add a short note for the student..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </label>
            </div>}
            <button
              onClick={async () => {
                setInviteError('')
                if (!selectedSavedTask) {
                  setInviteError('Choose a saved assignment before sending.')
                  return
                }
                setIsSendingInvite(true)
                try {
                  await onSendInterviewTask?.(applicant, {
                    message: inviteMessage.trim(),
                    taskTitle: selectedSavedTask.title,
                    taskType: selectedSavedTask.type || 'mixed',
                    taskInstructions: selectedSavedTask.instructions,
                    taskDeadline: selectedSavedTask.deadline,
                    taskPoints: selectedSavedTask.points,
                    taskDetails: selectedSavedTask.details || {},
                  })
                  setInviteSent(true)
                } catch (error) {
                  setInviteError(error.message || 'Could not send the interview task.')
                } finally {
                  setIsSendingInvite(false)
                }
              }}
              className="btn-accent"
              disabled={isSendingInvite || inviteSent || !selectedSavedTask}
              style={{ padding: '9px 16px', fontSize: 12, opacity: isSendingInvite ? 0.65 : 1 }}
            >
              {inviteSent ? '✓ Task Sent' : isSendingInvite ? 'Sending...' : 'Send Saved Task'}
            </button>
            {!inviteSent && <button
              type="button"
              onClick={onOpenTaskCenter}
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: 12 }}
            >
              Create New Task
            </button>}
            {applicant.taskSubmission && availableReviewOptions(applicant.taskSubmission.status).length > 0 && (
              <button
                onClick={handleReview}
                disabled={isSavingReview}
                className="btn-accent"
                style={{ padding: '9px 16px', fontSize: 12, opacity: isSavingReview ? 0.65 : 1 }}
              >
                {isSavingReview ? 'Saving Review...' : 'Save Review'}
              </button>
            )}
          </div>
          {inviteError && <div style={{ fontSize: 12, color: '#B91C1C', fontWeight: 700 }}>{inviteError}</div>}
        </div>
      </div>
    </div>
  )
}

export default function GigManagement({ gigManagementState, taskLibraryState, taskSubmissions = [], onReviewTaskSubmission, onSendInterviewTask, onOpenTaskCenter, onCreateGig, onUpdateGig, onDeleteGig }) {
  const [localState, setLocalState] = useState(() => mergeCompanyGigManagementState(gigManagementState || buildDefaultCompanyGigManagementState()))
  const [isCreateGigOpen, setIsCreateGigOpen] = useState(false)
  const [editingGig, setEditingGig] = useState(null)
  const [selectedGigId, setSelectedGigId] = useState(null)
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [publicApplicant, setPublicApplicant] = useState(null)
  const [applicantResponse, setApplicantResponse] = useState({ gigId: null, applicants: [], error: '' })
  const [applicantRequest, setApplicantRequest] = useState(0)
  const savedTasks = Array.isArray(taskLibraryState?.tasks) ? taskLibraryState.tasks : []

  useEffect(() => {
    if (selectedGigId === null) return
    let cancelled = false
    fetchCompanyGigApplicants(getCompanySessionToken(), selectedGigId)
      .then(result => {
        if (!cancelled) setApplicantResponse({ gigId: selectedGigId, applicants: result.applicants || [], error: '' })
      })
      .catch(error => {
        if (!cancelled) setApplicantResponse({ gigId: selectedGigId, applicants: [], error: error.message || 'Could not load applicants.' })
      })
    return () => { cancelled = true }
  }, [selectedGigId, applicantRequest])

  useEffect(() => {
    setLocalState(mergeCompanyGigManagementState(gigManagementState || buildDefaultCompanyGigManagementState()))
  }, [gigManagementState])

  const selectedGig = useMemo(
    () => localState.gigs.find(gig => gig.id === selectedGigId) || null,
    [localState.gigs, selectedGigId],
  )
  const applicantsLoading = selectedGigId !== null && applicantResponse.gigId !== selectedGigId
  const selectedGigApplicants = useMemo(() => {
    if (applicantResponse.gigId !== selectedGigId) return []
    return applicantResponse.applicants.map(applicant => ({
      ...applicant,
      taskSubmission: taskSubmissions.find(submission => (
        String(submission.studentId) === String(applicant.studentId)
        && (submission.companyGigPublicId
          ? submission.companyGigPublicId === applicant.companyGigPublicId
          : Number(submission.companyGigId) === Number(selectedGigId))
      )),
    }))
  }, [applicantResponse, selectedGigId, taskSubmissions])

  const createGig = async data => {
    const persistedState = await onCreateGig(data)
    if (!persistedState) return
    setLocalState(mergeCompanyGigManagementState(persistedState))
    setSelectedGigId(persistedState.gigs[0]?.id || null)
    setSelectedApplicant(null)
    setIsCreateGigOpen(false)
  }

  const updateGig = async gig => {
    const persistedState = await onUpdateGig(gig)
    if (!persistedState) return
    setLocalState(mergeCompanyGigManagementState(persistedState))
    setEditingGig(null)
  }

  const deleteGig = async gig => {
    const persistedState = await onDeleteGig(gig.id)
    if (!persistedState) return
    setLocalState(mergeCompanyGigManagementState(persistedState))
    if (selectedGigId === gig.id) setSelectedGigId(null)
    setEditingGig(null)
  }

  return (
    <div>
      <div className="responsive-hero" style={{
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1px solid #FED7AA',
        boxShadow: '0 8px 24px rgba(249,115,22,0.08)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, background: 'var(--accent)' }} />
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 9 }}>
            <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'rgba(249,115,22,0.14)', fontSize: 14 }}>📋</span>
            GIG Management
          </div>
          <div style={{ fontSize: 25, fontWeight: 850, color: 'var(--dark)', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Manage hiring, interview tasks, and student pipeline
          </div>
          <div style={{ fontSize: 13, color: '#9A3412', maxWidth: 700, lineHeight: 1.6 }}>
            Track every posted GIG, review incoming talent, send interview tasks, and monitor who is ready for selection.
          </div>
        </div>

        <button
          className="btn-accent"
          onClick={() => setIsCreateGigOpen(true)}
          style={{ padding: '11px 18px', fontSize: 13, alignSelf: 'flex-start', boxShadow: '0 6px 14px rgba(249,115,22,0.2)' }}
        >
          + Create New GIG
        </button>
      </div>

      <div className="responsive-card-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {localState.stats.map(item => (
          <div key={item.label} style={{ background: 'var(--white)', borderRadius: 12, padding: '17px 18px 15px', border: '1px solid var(--border)', borderTop: `3px solid ${item.tone}`, boxShadow: '0 2px 8px rgba(15,23,42,0.03)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.03)' }}
          >
            <div style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: item.bg, borderRadius: 9, fontSize: 18, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>{item.label}</div>
            <span style={{ fontSize: 11, fontWeight: 700, background: item.bg, color: item.tone, padding: '4px 10px', borderRadius: 100 }}>
              Live snapshot
            </span>
          </div>
        ))}
      </div>

      <div className="responsive-split-main" style={{ display: 'grid', gridTemplateColumns: '1.55fr 0.95fr', gap: 16 }}>
          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)' }}>Posted GIGs</div>
            <span style={{ background: 'var(--accent-light)', color: '#C2410C', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 800 }}>{localState.gigs.length} roles</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {localState.gigs.map(gig => {
              const meta = statusMeta[gig.status]
              const gigSubmissions = taskSubmissions.filter(submission => (
                submission.companyGigPublicId
                  ? submission.companyGigPublicId === gig.publicId
                  : Number(submission.companyGigId) === Number(gig.id)
              ))
              const shortlisted = Math.max(
                Number(gig.shortlisted) || 0,
                gigSubmissions.filter(submission => ['selected', 'work_started', 'delivered', 'approved', 'completed'].includes(submission.status)).length,
              )
              const pendingReview = gigSubmissions.length > 0
                ? gigSubmissions.filter(submission => ['submitted', 'reviewed', 'delivered', 'needs_revision'].includes(submission.status)).length
                : Math.max((Number(gig.applicants) || 0) - shortlisted, 0)
              return (
                <div key={gig.id} style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, var(--bg) 100%)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px', boxShadow: '0 2px 7px rgba(15,23,42,0.025)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#FDBA74'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(249,115,22,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 2px 7px rgba(15,23,42,0.025)' }}
                >
                  <div className="responsive-stack" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)' }}>{gig.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color, padding: '3px 9px', borderRadius: 100 }}>
                          {gig.status}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '3px 9px', borderRadius: 100 }}>
                          {gig.mode}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{gig.budget} · {gig.postedOn}</div>
                    </div>
                    <div className="responsive-company-gig-side" style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>Interview Tasks Sent</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--dark)' }}>{gig.interviewTasks}</div>
                    </div>
                  </div>

                  <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: 'Applicants', value: gig.applicants },
                      { label: 'Shortlisted', value: shortlisted },
                      { label: 'Pending Review', value: pendingReview },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--white)', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 12px' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>{item.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {gig.skills.map(skill => (
                      <span key={skill} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="responsive-company-gig-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn-accent"
                      onClick={() => {
                        setSelectedGigId(gig.id)
                        setSelectedApplicant(null)
                      }}
                      style={{ padding: '8px 16px', fontSize: 12 }}
                    >
                      View Applicants
                    </button>
                    <button
                      onClick={() => setEditingGig(gig)}
                      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                    >
                      Edit GIG
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="gig-insight-panels">
          <div className="gig-insight-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <h3 id="gig-pipeline-heading">Hiring Pipeline</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Live view</span>
            </div>
            <div className="gig-insight-content" role="region" tabIndex={0} aria-labelledby="gig-pipeline-heading">
              {localState.pipeline.map(item => (
                <div key={item.label} style={{ background: item.bg, color: item.color, borderRadius: 10, padding: '13px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, border: '1px solid rgba(255,255,255,0.7)' }}>
                  <span style={{ fontSize: 13 }}>{item.label}</span>
                  <span style={{ fontSize: 20, fontWeight: 900 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="gig-insight-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <h3 id="gig-activity-heading">Recent Activity</h3>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 4px #D1FAE5' }} />
            </div>
            <div className="gig-insight-content" role="region" tabIndex={0} aria-labelledby="gig-activity-heading">
              {localState.recentActivity.map(item => (
                <div key={item} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--dark)', lineHeight: 1.55, borderLeft: '3px solid #FDBA74' }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ApplicantsModal
        gig={selectedGig}
        applicants={selectedGigApplicants}
        loading={applicantsLoading}
        error={applicantsLoading ? '' : applicantResponse.error}
        onRetry={() => {
          setApplicantResponse({ gigId: null, applicants: [], error: '' })
          setApplicantRequest(value => value + 1)
        }}
        onClose={() => {
          setSelectedGigId(null)
          setApplicantResponse({ gigId: null, applicants: [], error: '' })
        }}
        onViewProfile={async applicant => {
          try {
            const result = await fetchCompanyStudentProfile(getCompanySessionToken(), applicant.studentId || applicant.id)
            setPublicApplicant({ profile: result.profile, applicant })
          } catch (error) { toast.error(error.message || 'Could not load this profile.') }
        }}
      />
      {publicApplicant && <PublicStudentProfile key={publicApplicant.profile.id} profile={publicApplicant.profile}
        onClose={() => setPublicApplicant(null)} action={<button onClick={() => {
          setSelectedApplicant(publicApplicant.applicant)
          setPublicApplicant(null)
        }}>Review application</button>}/>}
  {selectedApplicant && <ApplicantProfileModal
        key={`${selectedApplicant.studentId}-${selectedApplicant.taskSubmission?.status || 'applicant'}`}
    applicant={selectedApplicant}
    savedTasks={savedTasks}
    onClose={() => setSelectedApplicant(null)}
    onReviewSubmission={onReviewTaskSubmission}
    onSendInterviewTask={(applicant, taskPayload) => onSendInterviewTask(applicant, selectedGig?.title, { ...taskPayload, companyGigId: selectedGig?.id })}
    onOpenTaskCenter={() => {
      setSelectedApplicant(null)
      setSelectedGigId(null)
      onOpenTaskCenter?.()
    }}
        onReviewSaved={(reviewedSubmission) => {
          setSelectedApplicant(current => (
            current ? { ...current, taskSubmission: reviewedSubmission } : current
          ))
        }}
      />}
      <CreateGigModal
        open={isCreateGigOpen || Boolean(editingGig)}
        initialData={editingGig}
        mode={editingGig ? 'edit' : 'create'}
        onClose={() => {
          setIsCreateGigOpen(false)
          setEditingGig(null)
        }}
        onCreate={createGig}
        onUpdate={updateGig}
        onDelete={deleteGig}
      />
    </div>
  )
}
