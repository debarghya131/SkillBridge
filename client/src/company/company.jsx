import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  buildDefaultCompanyDashboardState,
  mergeCompanyDashboardState,
  mergeCompanyProfile,
} from './companyDemoData'
import {
  clearCompanySessionToken,
  fetchCompanyTaskSubmissions,
  fetchCurrentCompany,
  getCompanySessionToken,
  fetchCompanyTalent,
  fetchCompanyPayment,
  fetchCompanyWorkspace,
  logoutCompany,
  reviewCompanyTaskSubmission,
  saveCompanyGigManagement,
  saveCompanyPayment,
  saveCompanyProfile,
  saveCompanyWorkspace,
} from './companyApi'
import { buildDefaultCompanyGigManagementState, mergeCompanyGigManagementState } from './companyGigDemoData'
import { buildDefaultCompanyPaymentState, mergeCompanyPaymentState } from './companyPaymentDemoData'
import { DEMO_TALENT_PROFILES, mergeTalentProfiles } from './companyTalentDemoData'
import { buildDefaultCompanyWorkspaceState, mergeCompanyWorkspaceState } from './companyWorkspaceDemoData'
import GigManagement from './GigManagement'
import PaymentSection from './PaymentSection'
import SetupBusinessProfile from './SetupBusinessProfile'
import ProjectWorkspace from './ProjectWorkspace'
import { toast } from '../ui/toast'
import demoIntroVideo from '../assets/otherintroduction.mp4'

const SKILL_LEVELS = ['All', 'Beginner', 'Intermediate', 'Pro']
const VERIFIED_SKILL_SET = new Set(['React', 'Node.js', 'UI/UX Design', 'Python', 'SEO', 'Content Writing'])
const DEMO_VIDEO_URL = demoIntroVideo

const LEVEL_META = {
  Pro: { bg: '#F3E8FF', color: '#7C3AED' },
  Intermediate: { bg: '#EFF6FF', color: '#1D4ED8' },
  Beginner: { bg: '#F0FDF4', color: '#15803D' },
}

function getSkillLevel(profile, skill) {
  if (!profile.skillsByLevel) return null
  for (const [level, list] of Object.entries(profile.skillsByLevel)) {
    if (list.includes(skill)) return level
  }
  return null
}

const NAV_ITEMS = [
  { key: 'business',  icon: '🏢', label: 'My Business' },
  { key: 'profile',   icon: '🛠️', label: 'Setup Business Profile' },
  { key: 'gig',       icon: '📋', label: 'GIG Management' },
  { key: 'talent',    icon: '🔍', label: 'Talent Search' },
  { key: 'workspace', icon: '🗂️',  label: 'Project Workspace' },
  { key: 'payment',   icon: '💳', label: 'Payment' },
]

function ComingSoon({ icon, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ fontSize: 52 }}>{icon}</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>{label}</h2>
      <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '6px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>Coming Soon</span>
    </div>
  )
}

function TalentProfileModal({ profile, onClose }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [levelFilter, setLevelFilter] = useState('All')

  if (!profile) return null

  const verifiedSkills = profile.skills.filter(skill => VERIFIED_SKILL_SET.has(skill))
  const levels = ['All', 'Pro', 'Intermediate', 'Beginner']
  const filteredSkills = levelFilter === 'All'
    ? (verifiedSkills.length > 0 ? verifiedSkills : profile.skills)
    : (profile.skillsByLevel?.[levelFilter] ?? [])

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
        maxWidth: 560,
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'var(--white)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="responsive-modal-header" style={{
          background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
              {profile.name[0]}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{profile.name}</div>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#10B981', color: 'white', padding: '2px 10px', borderRadius: 100 }}>
                  ✓ Verified
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                  color: 'white', fontSize: 13, fontWeight: 800,
                  padding: '4px 12px', borderRadius: 100,
                  boxShadow: '0 0 12px rgba(99,102,241,0.6)',
                  letterSpacing: '0.01em',
                }}>
                  ⭐ {profile.score} <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>/ 1000</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>TrustScore™</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div className="responsive-modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Skills</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {levels.map(lv => {
                  const meta = lv === 'All' ? { bg: '#F1F5F9', color: '#475569' } : LEVEL_META[lv]
                  return (
                    <button key={lv} onClick={() => setLevelFilter(lv)} style={{
                      fontSize: 11, fontWeight: 700,
                      background: levelFilter === lv ? meta.color : meta.bg,
                      color: levelFilter === lv ? 'white' : meta.color,
                      padding: '3px 9px', borderRadius: 100, border: 'none', cursor: 'pointer',
                    }}>
                      {lv}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {filteredSkills.length === 0
                ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>No {levelFilter} skills</span>
                : filteredSkills.map(skill => {
                  const level = getSkillLevel(profile, skill)
                  const levelMeta = level ? LEVEL_META[level] : null
                  return (
                    <span key={skill} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    }}>
                      {skill}
                      {verifiedSkills.includes(skill) && <span style={{ background: '#10B981', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 100 }}>✓</span>}
                      {levelMeta && <span style={{ background: levelMeta.bg, color: levelMeta.color, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 100 }}>{level}</span>}
                      <span style={{ background: '#FFF7ED', color: '#EA580C', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                        {profile.streak || 0} d streak
                      </span>
                    </span>
                  )
                })}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/7', maxWidth: 460 }}>
              <video ref={videoRef} src={profile.videoUrl || DEMO_VIDEO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
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

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>GitHub</div>
            {profile.github ? (
              <div style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 14px', fontSize: 13, color: 'var(--dark)' }}>
                {profile.github}
              </div>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>No links added</span>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Contact</div>
            {profile.contactInfo?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.contactInfo.map((item, index) => (
                  <div key={`${item.label}-${index}`} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>No contact details added</span>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Projects</div>
            <div className="responsive-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {profile.savedProjects.map(project => (
                <div key={project.name} style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>{project.desc}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <a href="https://github.com/topics/project" target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>🔗 View</a>
                    <a href="https://github.com/topics/project" target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>🧪 Demo Link</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const initialCompany = state?.company || state || {}
  const companyName = initialCompany.businessName || initialCompany.companyName || 'Your Business'
  const location = initialCompany.location || ''
  const sessionTokenRef = useRef(getCompanySessionToken())
  const didHydrateRef = useRef(false)

  const [active, setActive] = useState('business')
  const [selectedTalent, setSelectedTalent] = useState(null)
  const [talentFilters, setTalentFilters] = useState({
    minTrustScore: 0,
    location: 'All',
    skill: 'All',
    level: 'All',
  })
  const [businessProfile, setBusinessProfile] = useState(() => mergeCompanyProfile(initialCompany.businessProfile || initialCompany, { businessName: companyName, location }))
  const [dashboardState, setDashboardState] = useState(() => mergeCompanyDashboardState(initialCompany.dashboardState || buildDefaultCompanyDashboardState()))
  const [gigManagementState, setGigManagementState] = useState(() => mergeCompanyGigManagementState(initialCompany.gigManagementState || buildDefaultCompanyGigManagementState()))
  const [paymentState, setPaymentState] = useState(() => mergeCompanyPaymentState(initialCompany.paymentState || buildDefaultCompanyPaymentState()))
  const [projectWorkspaceState, setProjectWorkspaceState] = useState(() => mergeCompanyWorkspaceState(initialCompany.projectWorkspaceState || buildDefaultCompanyWorkspaceState()))
  const [talentProfiles, setTalentProfiles] = useState(() => DEMO_TALENT_PROFILES)
  const [taskSubmissions, setTaskSubmissions] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const availableLocations = ['All', ...new Set(talentProfiles.map(profile => profile.location))]
  const availableSkills = ['All', ...new Set(talentProfiles.flatMap(profile => profile.skills))]

  const filteredTalent = talentProfiles.filter(profile => {
    const trustPass = profile.score >= talentFilters.minTrustScore
    const locationPass = talentFilters.location === 'All' || profile.location === talentFilters.location
    const skillPass = talentFilters.skill === 'All' || profile.skills.includes(talentFilters.skill)
    const levelPass = talentFilters.level === 'All'
      ? true
      : (profile.skillsByLevel?.[talentFilters.level] || []).length > 0

    return trustPass && locationPass && skillPass && levelPass
  })

  const resetTalentFilters = () => {
    setTalentFilters({
      minTrustScore: 0,
      location: 'All',
      skill: 'All',
      level: 'All',
    })
  }

  const businessFields = [
    businessProfile.businessName,
    businessProfile.location,
    businessProfile.industry,
    businessProfile.website,
    businessProfile.teamSize,
    businessProfile.description,
    businessProfile.hiringCategories,
    businessProfile.requiredSkills,
    businessProfile.contactEmail,
    businessProfile.contactPhone,
  ]
  const completedFields = businessFields.filter(Boolean).length
  const profileCompletion = Math.round((completedFields / businessFields.length) * 100)
  const checklist = [
    { label: 'Business name and location', done: Boolean(businessProfile.businessName && businessProfile.location) },
    { label: 'Industry, website, and team size', done: Boolean(businessProfile.industry && businessProfile.website && businessProfile.teamSize) },
    { label: 'Work mode and hiring categories', done: Boolean(businessProfile.workModes.length > 0 && businessProfile.hiringCategories) },
    { label: 'Company description and required skills', done: Boolean(businessProfile.description && businessProfile.requiredSkills) },
    { label: 'Contact details for applicants', done: Boolean(businessProfile.contactEmail && businessProfile.contactPhone) },
  ]
  const doneChecklist = checklist.filter(item => item.done).length

  useEffect(() => {
    let cancelled = false

    async function loadCompany() {
      if (!sessionTokenRef.current) {
        didHydrateRef.current = true
        return
      }

      try {
        const result = await fetchCurrentCompany(sessionTokenRef.current)

        if (cancelled) {
          return
        }

        setBusinessProfile(mergeCompanyProfile(result.company.businessProfile || result.company, { businessName: companyName, location }))
        setDashboardState(mergeCompanyDashboardState(result.company.dashboardState))
        setGigManagementState(mergeCompanyGigManagementState(result.company.gigManagementState))
        setPaymentState(mergeCompanyPaymentState(result.company.paymentState))
        setProjectWorkspaceState(mergeCompanyWorkspaceState(result.company.projectWorkspaceState))
      } catch (error) {
        if (!cancelled) {
          clearCompanySessionToken()
          sessionTokenRef.current = ''
          toast.warning('Your company session expired. Please sign in again.', { title: 'Authentication Required' })
          navigate('/company', { replace: true })
        }
      } finally {
        if (!cancelled) {
          didHydrateRef.current = true
        }
      }
    }

    loadCompany()

    return () => {
      cancelled = true
    }
  }, [companyName, location, navigate])

  useEffect(() => {
    let cancelled = false

    async function loadTaskSubmissions() {
      if (!sessionTokenRef.current || active !== 'gig') {
        return
      }

      try {
        const result = await fetchCompanyTaskSubmissions(sessionTokenRef.current)

        if (!cancelled) {
          setTaskSubmissions(Array.isArray(result.taskSubmissions) ? result.taskSubmissions : [])
        }
      } catch (error) {
        if (!cancelled) {
          setTaskSubmissions([])
        }
      }
    }

    loadTaskSubmissions()

    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    let cancelled = false

    async function loadTalentProfiles() {
      if (!sessionTokenRef.current) {
        return
      }

      try {
        const result = await fetchCompanyTalent(sessionTokenRef.current)

        if (!cancelled) {
          setTalentProfiles(mergeTalentProfiles(result.talentProfiles || []))
        }
      } catch (error) {
        if (!cancelled) {
          setTalentProfiles(DEMO_TALENT_PROFILES)
        }
      }
    }

    loadTalentProfiles()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPayment() {
      if (!sessionTokenRef.current) {
        return
      }

      try {
        const result = await fetchCompanyPayment(sessionTokenRef.current)

        if (!cancelled) {
          setPaymentState(mergeCompanyPaymentState(result.paymentState))
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentState(buildDefaultCompanyPaymentState())
        }
      }
    }

    loadPayment()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveCompanyPayment(sessionTokenRef.current, {
        paymentState,
      }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [paymentState])

  useEffect(() => {
    let cancelled = false

    async function loadWorkspace() {
      if (!sessionTokenRef.current) {
        return
      }

      try {
        const result = await fetchCompanyWorkspace(sessionTokenRef.current)

        if (!cancelled) {
          setProjectWorkspaceState(mergeCompanyWorkspaceState(result.projectWorkspaceState))
        }
      } catch (error) {
        if (!cancelled) {
          setProjectWorkspaceState(buildDefaultCompanyWorkspaceState())
        }
      }
    }

    loadWorkspace()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveCompanyProfile(sessionTokenRef.current, {
        businessProfile,
        dashboardState,
      }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [businessProfile, dashboardState])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveCompanyGigManagement(sessionTokenRef.current, {
        gigManagementState,
      }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [gigManagementState])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveCompanyWorkspace(sessionTokenRef.current, {
        projectWorkspaceState,
      }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [projectWorkspaceState])

  const handleLogout = async () => {
    const token = sessionTokenRef.current

    clearCompanySessionToken()
    sessionTokenRef.current = ''

    if (token) {
      try {
        await logoutCompany(token)
      } catch (error) {
        // Ignore logout failures so the user can still exit cleanly.
      }
    }

    toast.info('You have been signed out.', { title: 'Company Session Closed' })
    navigate('/')
  }

  const handleReviewTaskSubmission = async (submissionId, payload) => {
    const token = sessionTokenRef.current

    if (!token) {
      throw new Error('Sign in again to review submissions.')
    }

    const result = await reviewCompanyTaskSubmission(token, submissionId, payload)
    const reviewedSubmission = result.taskSubmission

    setTaskSubmissions(current => current.map(item => (
      item.id === reviewedSubmission.id ? reviewedSubmission : item
    )))

    if (result.gigManagementState) {
      setGigManagementState(mergeCompanyGigManagementState(result.gigManagementState))
    }

    if (result.projectWorkspaceState) {
      setProjectWorkspaceState(mergeCompanyWorkspaceState(result.projectWorkspaceState))
    }

    toast.success('Task review saved successfully.', { title: 'GIG Review Updated' })
    return reviewedSubmission
  }

  return (
    <div className="dashboard-shell company-dashboard" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Navbar */}
      <nav className="dashboard-nav" style={{
        height: 52, background: 'var(--white)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="mobile-only mobile-menu-toggle" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <img
            src="/logo.png"
            alt="SkillBridge logo"
            style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}
          />
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--dark)', letterSpacing: '-0.02em' }}>SkillBridge</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="dashboard-user-meta" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px', borderRadius: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #EA580C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0,
            }}>{businessProfile.businessName[0]?.toUpperCase() || 'B'}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>{businessProfile.businessName}</div>
              <div className="dashboard-user-subtitle" style={{ fontSize: 11, color: 'var(--muted)' }}>{businessProfile.location || 'Business'}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div className="dashboard-body" style={{ display: 'flex', flex: 1 }}>
        <div className={`dashboard-overlay${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <aside className={`dashboard-sidebar${sidebarOpen ? ' is-open' : ''}`} style={{
          width: 220, background: 'var(--white)',
          borderRight: '1px solid var(--border)',
          padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4,
          position: 'sticky', top: 52, height: 'calc(100vh - 52px)', overflowY: 'auto',
        }}>
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => {
              setActive(item.key)
              setSidebarOpen(false)
            }} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 9, border: 'none',
              background: active === item.key ? 'var(--accent-light)' : 'transparent',
              color: active === item.key ? 'var(--accent)' : 'var(--muted)',
              fontWeight: active === item.key ? 700 : 500,
              fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 9, border: 'none',
            background: 'transparent', color: '#EF4444',
            fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 16 }}>🚪</span> Logout
          </button>
        </aside>

        {/* Main content */}
        <main className="dashboard-main" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {active === 'business' && (
            <div>
              <div className="responsive-hero" style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                borderRadius: 16, padding: '24px 28px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 20, flexWrap: 'wrap', gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 900, fontSize: 22,
                  }}>{businessProfile.businessName[0]?.toUpperCase() || 'B'}</div>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{businessProfile.businessName} 🏢</h2>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{businessProfile.location || 'Location not set'}</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px 22px', textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 2 }}>Matched Students</div>
                  <div style={{ color: 'white', fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{dashboardState.matchedStudents}</div>
                </div>
              </div>

              <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                {dashboardState.stats.map(stat => (
                  <div key={stat.label} style={{ background: 'var(--white)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="responsive-split-main" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>Business Setup Health</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Complete profile details to increase applicant trust and improve match quality.</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '4px 9px', borderRadius: 100 }}>
                      {profileCompletion}% complete
                    </span>
                  </div>

                  <div style={{ height: 9, borderRadius: 999, background: '#E2E8F0', marginBottom: 14, overflow: 'hidden' }}>
                    <div style={{ width: `${profileCompletion}%`, height: '100%', background: 'linear-gradient(90deg, #22C55E, #16A34A)' }} />
                  </div>

                  <div className="responsive-form-grid-tight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {checklist.map(item => (
                      <div key={item.label} style={{ background: 'var(--bg)', borderRadius: 9, border: '1px solid var(--border)', padding: '9px 10px', fontSize: 12, color: item.done ? '#065F46' : 'var(--muted)', fontWeight: 600 }}>
                        {item.done ? '✅' : '⬜'} {item.label}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setActive('profile')}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Complete Setup Profile
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={() => setActive('gig')} className="btn-accent" style={{ fontSize: 12, padding: '8px 12px', justifyContent: 'center' }}>Create / Manage GIGs</button>
                      <button onClick={() => setActive('talent')} style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>
                        Search Talent
                      </button>
                      <button onClick={() => setActive('workspace')} style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>
                        Open Project Workspace
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 6 }}>Setup Checklist Progress</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{doneChecklist}/{checklist.length} tasks complete</div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: doneChecklist === checklist.length ? '#D1FAE5' : '#FEF3C7', color: doneChecklist === checklist.length ? '#065F46' : '#92400E', padding: '4px 9px', borderRadius: 100 }}>
                      {doneChecklist === checklist.length ? 'Profile Ready for Hiring' : 'Action Needed'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '18px 20px' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 10 }}>Recent Hiring Activity</div>
                <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {dashboardState.recentHiringActivity.map(item => (
                    <div key={item.name + item.status} style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '11px 12px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>{item.status}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: item.bg, color: item.color, padding: '3px 8px', borderRadius: 100 }}>
                        {item.when}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'talent' && (
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--dark)', marginBottom: 16 }}>
                Top Talent Matches <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>({filteredTalent.length} found)</span>
              </h3>

              <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 14 }}>
                <div className="responsive-filter-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 10, alignItems: 'end', marginBottom: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Min TrustScore
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        value={talentFilters.minTrustScore}
                        onChange={e => setTalentFilters(current => ({ ...current, minTrustScore: Number(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={talentFilters.minTrustScore}
                        onChange={e => setTalentFilters(current => ({ ...current, minTrustScore: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) }))}
                        style={{ width: 66, padding: '8px 9px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, fontFamily: 'inherit' }}
                      />
                    </div>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Location
                    </span>
                    <select
                      value={talentFilters.location}
                      onChange={e => setTalentFilters(current => ({ ...current, location: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--white)', fontFamily: 'inherit' }}
                    >
                      {availableLocations.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Skill
                    </span>
                    <select
                      value={talentFilters.skill}
                      onChange={e => setTalentFilters(current => ({ ...current, skill: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--white)', fontFamily: 'inherit' }}
                    >
                      {availableSkills.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <button
                    onClick={resetTalentFilters}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--white)',
                      color: 'var(--muted)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      height: 'fit-content',
                    }}
                  >
                    Reset
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SKILL_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setTalentFilters(current => ({ ...current, level }))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 100,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        background: talentFilters.level === level ? 'var(--accent)' : 'var(--bg)',
                        color: talentFilters.level === level ? 'white' : 'var(--muted)',
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredTalent.map((p, i) => (
                  <div className="responsive-hero" key={p.name} style={{
                    background: 'var(--white)', borderRadius: 12,
                    padding: '18px 22px', border: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 12, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: `hsl(${(i * 60) + 220}, 70%, 55%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: 17, flexShrink: 0,
                      }}>{p.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)', marginBottom: 2 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>{p.location} · {p.projects} projects</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.skills.map(s => (
                            <span key={s} style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
                              {s}
                            </span>
                          ))}
                          {talentFilters.level !== 'All' && (p.skillsByLevel?.[talentFilters.level] || []).map(levelSkill => (
                            <span key={`${levelSkill}-${talentFilters.level}`} style={{ background: '#EDE9FE', color: '#6D28D9', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                              {levelSkill} ({talentFilters.level})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>{p.score}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TrustScore™</div>
                      </div>
                      <button
                        onClick={() => setSelectedTalent(p)}
                        style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
                {filteredTalent.length === 0 && (
                  <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                    No students match these filters. Try lowering TrustScore or selecting broader skills.
                  </div>
                )}
              </div>
            </div>
          )}

          {active === 'profile' && (
            <SetupBusinessProfile profile={businessProfile} onSave={setBusinessProfile} />
          )}

          {active === 'gig'       && (
            <GigManagement
              gigManagementState={gigManagementState}
              onSaveState={setGigManagementState}
              taskSubmissions={taskSubmissions}
              onReviewTaskSubmission={handleReviewTaskSubmission}
            />
          )}
          {active === 'workspace' && <ProjectWorkspace projectWorkspaceState={projectWorkspaceState} onSaveState={setProjectWorkspaceState} />}
          {active === 'payment'   && <PaymentSection paymentState={paymentState} onSaveState={setPaymentState} />}

        </main>
      </div>
      <TalentProfileModal profile={selectedTalent} onClose={() => setSelectedTalent(null)} />
    </div>
  )
}
