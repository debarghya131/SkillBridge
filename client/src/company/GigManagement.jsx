import { useEffect, useMemo, useRef, useState } from 'react'
import { buildDefaultCompanyGigManagementState, mergeCompanyGigManagementState } from './companyGigDemoData'
import profileIntroVideo from '../assets/otherintroduction.mp4'

const statusMeta = {
  Hiring: { bg: '#D1FAE5', color: '#065F46' },
  Reviewing: { bg: '#FEF3C7', color: '#92400E' },
  'In Progress': { bg: '#EDE9FE', color: '#7C3AED' },
}

const PROFILE_VIDEO_URL = profileIntroVideo
const PROFILE_LEVEL_META = {
  Pro: { bg: '#F3E8FF', color: '#7C3AED' },
  Intermediate: { bg: '#EFF6FF', color: '#1D4ED8' },
  Beginner: { bg: '#F0FDF4', color: '#15803D' },
}
const REVIEW_STATUS_OPTIONS = [
  { value: 'reviewed', label: 'Mark Reviewed' },
  { value: 'ready_to_hire', label: 'Ready to Hire' },
  { value: 'needs_revision', label: 'Needs Revision' },
]

function slugifyName(name = '') {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '') || 'student'
}

function buildApplicantProfile(applicant) {
  const name = applicant.name || applicant.studentName || 'Student'
  const githubSlug = slugifyName(name)
  const skills = Array.isArray(applicant.skills)
    ? applicant.skills
    : (Array.isArray(applicant.studentSkills) ? applicant.studentSkills : [])
  const contactInfo = Array.isArray(applicant.contactInfo) && applicant.contactInfo.length > 0
    ? applicant.contactInfo
    : (Array.isArray(applicant.studentContactInfo) ? applicant.studentContactInfo : [])
  const savedProjects = Array.isArray(applicant.savedProjects) && applicant.savedProjects.length > 0
    ? applicant.savedProjects
    : (Array.isArray(applicant.studentProjects) ? applicant.studentProjects : [])

  return {
    ...applicant,
    name,
    location: applicant.location || applicant.studentLocation || '',
    score: applicant.score ?? applicant.trustScore ?? applicant.studentTrustScore ?? 0,
    skills,
    skillsByLevel: applicant.skillsByLevel || applicant.studentSkillsByLevel || {
      Pro: skills.slice(0, 1),
      Intermediate: skills.slice(1),
      Beginner: [],
    },
    streak: applicant.streak ?? applicant.studentStreak ?? 21,
    github: applicant.github || applicant.studentGithub || `github.com/${githubSlug}`,
    contactInfo: contactInfo.length > 0
      ? contactInfo
      : [
        { label: 'Email', value: `${githubSlug}@skillbridge.demo` },
        { label: 'WhatsApp', value: '+91 98765 41001' },
      ],
    savedProjects: savedProjects.length > 0
      ? savedProjects
      : (applicant.projects || []).map(project => (
        typeof project === 'string'
          ? { name: project, desc: 'Shared as a demo portfolio project for hiring review.' }
          : project
      )),
    videoUrl: applicant.videoUrl || applicant.studentVideoUrl || PROFILE_VIDEO_URL,
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

function updateCountString(value, delta) {
  const nextValue = (Number(value) || 0) + delta
  return String(Math.max(nextValue, 0))
}

function CreateGigModal({ open, initialData, onClose, onCreate, onUpdate, mode }) {
  const [form, setForm] = useState({
    title: '',
    mode: 'Remote',
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
        budget: initialData.budget || '',
        status: initialData.status || 'Hiring',
        skills: Array.isArray(initialData.skills) ? initialData.skills.join(', ') : '',
      })
      return
    }

    setForm({
      title: '',
      mode: 'Remote',
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
    const trimmedBudget = form.budget.trim()
    const skills = form.skills
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean)

    if (!trimmedTitle || !trimmedBudget) return

    const payload = {
      title: trimmedTitle,
      mode: form.mode,
      budget: trimmedBudget,
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
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
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
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div className="responsive-modal-header" style={{
          padding: '18px 20px',
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
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div className="responsive-modal-body responsive-form-grid" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Work Mode</span>
            <select value={form.mode} onChange={e => updateField('mode', e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--white)', fontFamily: 'inherit' }}>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Status</span>
            <select value={form.status} onChange={e => updateField('status', e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--white)', fontFamily: 'inherit' }}>
              <option>Hiring</option>
              <option>Reviewing</option>
              <option>In Progress</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Budget *</span>
            <input
              value={form.budget}
              onChange={e => updateField('budget', e.target.value)}
              placeholder="e.g. ₹15,000 / month"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }}
              required
            />
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" className="btn-accent" style={{ padding: '8px 14px', fontSize: 12 }}>
            {mode === 'edit' ? 'Save Changes' : 'Create GIG'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ApplicantsModal({ gig, applicants, onClose, onViewProfile }) {
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
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>{gig.title} Applicants</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{applicants.length} candidate{applicants.length !== 1 ? 's' : ''} available</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div className="responsive-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {applicants.map(applicant => (
            <div key={applicant.id} className="responsive-stack" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)', marginBottom: 3 }}>{applicant.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>{applicant.location}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {applicant.skills.map(skill => (
                    <span key={skill} style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                      {skill}
                    </span>
                  ))}
                  {applicant.taskSubmission && (
                    <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 800 }}>
                      Task Submitted
                    </span>
                  )}
                </div>
              </div>
              <div className="responsive-company-gig-side" style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--dark)' }}>{applicant.trustScore}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>TrustScore</div>
                <button className="btn-accent" onClick={() => onViewProfile(buildApplicantProfile(applicant))} style={{ padding: '8px 14px', fontSize: 12 }}>
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

function ApplicantProfileModal({ applicant, onClose, onReviewSubmission, onReviewSaved }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [levelFilter, setLevelFilter] = useState('All')
  const [reviewStatus, setReviewStatus] = useState(applicant?.taskSubmission?.status || 'reviewed')
  const [feedbackNote, setFeedbackNote] = useState(applicant?.taskSubmission?.feedback || '')
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')

  if (!applicant) return null

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
    ready_to_hire: { label: 'Ready to Hire', bg: '#D1FAE5', color: '#065F46' },
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
              background: 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 900,
              border: '3px solid rgba(255,255,255,0.2)',
            }}>
              {applicant.name[0]}
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
                {['All', 'Pro', 'Intermediate', 'Beginner'].map(level => {
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

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/7', maxWidth: 460 }}>
              <video ref={videoRef} src={applicant.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
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

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>GitHub</div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px', fontSize: 13, color: 'var(--dark)' }}>
              {applicant.github}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Submission Link</div>
              <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 700, marginBottom: 12, wordBreak: 'break-word' }}>
                {applicant.taskSubmission.submissionLink}
              </div>

              {applicant.taskSubmission.note && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Student Note</div>
                  <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.6, marginBottom: 12 }}>
                    {applicant.taskSubmission.note}
                  </div>
                </>
              )}

              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Review Status</span>
                  <select
                    value={reviewStatus}
                    onChange={e => setReviewStatus(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', fontSize: 13, fontFamily: 'inherit' }}
                  >
                    {REVIEW_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Feedback for Student</span>
                  <textarea
                    value={feedbackNote}
                    onChange={e => setFeedbackNote(e.target.value)}
                    rows={4}
                    placeholder="Add review notes, revision guidance, or shortlist feedback..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </label>
              </div>

              {reviewError && (
                <div style={{ fontSize: 12, color: '#B91C1C', fontWeight: 700, marginTop: 10 }}>
                  {reviewError}
                </div>
              )}
            </div>
          )}

          <div className="responsive-stack" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-accent" style={{ padding: '9px 16px', fontSize: 12 }}>Contact Applicant</button>
            <button style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
              Send Interview Task
            </button>
            {applicant.taskSubmission && (
              <button
                onClick={handleReview}
                className="btn-accent"
                style={{ padding: '9px 16px', fontSize: 12, opacity: isSavingReview ? 0.65 : 1 }}
              >
                {isSavingReview ? 'Saving Review...' : 'Save Review'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GigManagement({ gigManagementState, onSaveState, taskSubmissions = [], onReviewTaskSubmission }) {
  const [localState, setLocalState] = useState(() => mergeCompanyGigManagementState(gigManagementState || buildDefaultCompanyGigManagementState()))
  const [isCreateGigOpen, setIsCreateGigOpen] = useState(false)
  const [editingGig, setEditingGig] = useState(null)
  const [selectedGigId, setSelectedGigId] = useState(null)
  const [selectedApplicant, setSelectedApplicant] = useState(null)

  useEffect(() => {
    setLocalState(mergeCompanyGigManagementState(gigManagementState || buildDefaultCompanyGigManagementState()))
  }, [gigManagementState])

  const updateLocalState = (updater) => {
    setLocalState(current => {
      const nextState = typeof updater === 'function' ? updater(current) : updater
      const mergedState = mergeCompanyGigManagementState(nextState)
      onSaveState(mergedState)
      return mergedState
    })
  }

  const selectedGig = useMemo(
    () => localState.gigs.find(gig => gig.id === selectedGigId) || null,
    [localState.gigs, selectedGigId],
  )
  const selectedGigApplicants = useMemo(
    () => {
      const applicants = selectedGigId ? localState.applicantsByGig?.[selectedGigId] || [] : []

      if (!selectedGig) {
        return applicants
      }

      const relatedSubmissions = taskSubmissions.filter(item => item.gigTitle === selectedGig.title)
      const submissionsByName = new Map(relatedSubmissions.map(item => [item.studentName.toLowerCase(), item]))
      const applicantNames = new Set(applicants.map(item => item.name.toLowerCase()))

      const mergedApplicants = applicants.map(item => {
        const linkedSubmission = submissionsByName.get(item.name.toLowerCase())
        return linkedSubmission ? { ...item, taskSubmission: linkedSubmission } : item
      })

      const submissionOnlyApplicants = relatedSubmissions
        .filter(item => !applicantNames.has(item.studentName.toLowerCase()))
        .map(item => ({
          id: `submission-${item.id}`,
          name: item.studentName,
          trustScore: item.studentTrustScore,
          location: item.studentLocation,
          skills: item.studentSkills,
          taskSubmission: item,
          studentName: item.studentName,
          studentLocation: item.studentLocation,
          studentTrustScore: item.studentTrustScore,
          studentSkills: item.studentSkills,
          studentSkillsByLevel: item.studentSkillsByLevel,
          studentStreak: item.studentStreak,
          studentGithub: item.studentGithub,
          studentContactInfo: item.studentContactInfo,
          studentProjects: item.studentProjects,
          studentVideoUrl: item.studentVideoUrl,
        }))

      return [...submissionOnlyApplicants, ...mergedApplicants]
    },
    [localState.applicantsByGig, selectedGig, selectedGigId, taskSubmissions],
  )

  const createGig = data => {
    const nextId = localState.gigs.length ? Math.max(...localState.gigs.map(item => item.id)) + 1 : 1
    const newGig = {
      id: nextId,
      title: data.title,
      mode: data.mode,
      budget: data.budget,
      applicants: 0,
      shortlisted: 0,
      interviewTasks: 0,
      status: data.status,
      skills: data.skills,
      postedOn: 'Posted just now',
    }

    updateLocalState(current => ({
      ...current,
      gigs: [newGig, ...current.gigs],
      stats: current.stats.map((item, index) => (
        index === 0
          ? { ...item, value: updateCountString(item.value, 1) }
          : item
      )),
      recentActivity: [`New GIG created for ${newGig.title}.`, ...current.recentActivity].slice(0, 8),
      applicantsByGig: {
        ...current.applicantsByGig,
        [nextId]: [],
      },
    }))

    setSelectedGigId(newGig.id)
    setSelectedApplicant(null)
    setIsCreateGigOpen(false)
  }

  const updateGig = updatedGig => {
    updateLocalState(current => ({
      ...current,
      gigs: current.gigs.map(gig => (gig.id === updatedGig.id ? updatedGig : gig)),
      recentActivity: [`${updatedGig.title} was updated by your team.`, ...current.recentActivity].slice(0, 8),
    }))
    setEditingGig(null)
  }

  const sendInterviewTask = gigId => {
    const gig = localState.gigs.find(item => item.id === gigId)

    if (!gig) {
      return
    }

    updateLocalState(current => ({
      ...current,
      gigs: current.gigs.map(item => (
        item.id === gigId
          ? { ...item, interviewTasks: item.interviewTasks + 1 }
          : item
      )),
      stats: current.stats.map((item, index) => (
        index === 2
          ? { ...item, value: updateCountString(item.value, 1) }
          : item
      )),
      pipeline: current.pipeline.map((item, index) => (
        index === 1
          ? { ...item, value: updateCountString(item.value, 1) }
          : item
      )),
      recentActivity: [`Interview task sent for ${gig.title}.`, ...current.recentActivity].slice(0, 8),
    }))
  }

  return (
    <div>
      <div className="responsive-hero" style={{
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1px solid #FED7AA',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            GIG Management
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>
            Manage hiring, interview tasks, and student pipeline
          </div>
          <div style={{ fontSize: 13, color: '#9A3412', maxWidth: 700, lineHeight: 1.6 }}>
            Track every posted GIG, review incoming talent, send interview tasks, and monitor who is ready for selection.
          </div>
        </div>

        <button
          className="btn-accent"
          onClick={() => setIsCreateGigOpen(true)}
          style={{ padding: '10px 18px', fontSize: 13, alignSelf: 'flex-start' }}
        >
          + Create New GIG
        </button>
      </div>

      <div className="responsive-card-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {localState.stats.map(item => (
          <div key={item.label} style={{ background: 'var(--white)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>{item.label}</div>
            <span style={{ fontSize: 11, fontWeight: 700, background: item.bg, color: item.tone, padding: '4px 10px', borderRadius: 100 }}>
              Live snapshot
            </span>
          </div>
        ))}
      </div>

      <div className="responsive-split-main" style={{ display: 'grid', gridTemplateColumns: '1.55fr 0.95fr', gap: 16 }}>
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Posted GIGs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {localState.gigs.map(gig => {
              const meta = statusMeta[gig.status]
              return (
                <div key={gig.id} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px' }}>
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
                      { label: 'Shortlisted', value: gig.shortlisted },
                      { label: 'Pending Review', value: Math.max(gig.applicants - gig.shortlisted, 0) },
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
                      onClick={() => sendInterviewTask(gig.id)}
                      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                    >
                      Send Interview Task
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Hiring Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {localState.pipeline.map(item => (
                <div key={item.label} style={{ background: item.bg, color: item.color, borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                  <span style={{ fontSize: 13 }}>{item.label}</span>
                  <span style={{ fontSize: 20, fontWeight: 900 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {localState.recentActivity.map(item => (
                <div key={item} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--dark)', lineHeight: 1.55 }}>
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
        onClose={() => setSelectedGigId(null)}
        onViewProfile={setSelectedApplicant}
      />
      <ApplicantProfileModal
        applicant={selectedApplicant}
        onClose={() => setSelectedApplicant(null)}
        onReviewSubmission={onReviewTaskSubmission}
        onReviewSaved={(reviewedSubmission) => {
          setSelectedApplicant(current => (
            current ? { ...current, taskSubmission: reviewedSubmission } : current
          ))
        }}
      />
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
      />
    </div>
  )
}
