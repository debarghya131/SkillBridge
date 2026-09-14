import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  buildDefaultCompanyDashboardState,
  mergeCompanyDashboardState,
  mergeCompanyProfile,
} from './companyDemoData'
import {
  clearCompanySessionToken,
  addCompanyFunds,
  createCompanyGig,
  fetchCompanyDashboard,
  fetchCompanyTaskSubmissions,
  fetchCurrentCompany,
  getCompanySessionToken,
  fetchCompanyTalent,
  fetchCompanyPayment,
  fetchCompanyWorkspace,
  logoutCompany,
  reviewCompanyTaskSubmission,
  sendCompanyInterviewTask,
  updateCompanyGig,
  saveCompanyGigManagement,
  saveCompanyPayment,
  saveCompanyProfile,
  saveCompanyWorkspace,
  setCompanyWorkspaceMilestone,
  setupCompanyPayouts,
  shareCompanyWorkspaceUpdate,
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

function formatActivityWhen(value) {
  if (!value) return 'Recently'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
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
  const [dashboardOverview, setDashboardOverview] = useState(null)
  const [gigManagementState, setGigManagementState] = useState(() => mergeCompanyGigManagementState(initialCompany.gigManagementState || buildDefaultCompanyGigManagementState()))
  const [paymentState, setPaymentState] = useState(() => mergeCompanyPaymentState(initialCompany.paymentState || buildDefaultCompanyPaymentState()))
  const [projectWorkspaceState, setProjectWorkspaceState] = useState(() => mergeCompanyWorkspaceState(initialCompany.projectWorkspaceState || buildDefaultCompanyWorkspaceState()))
  const [talentProfiles, setTalentProfiles] = useState(() => DEMO_TALENT_PROFILES)
  const [talentSearchMeta, setTalentSearchMeta] = useState({ availableLocations: [], availableSkills: [], total: 0 })
  const [taskSubmissions, setTaskSubmissions] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const availableLocations = ['All', ...new Set([
    ...(talentSearchMeta.availableLocations || []),
    ...talentProfiles.map(profile => profile.location),
  ])]
  const availableSkills = ['All', ...new Set([
    ...(talentSearchMeta.availableSkills || []),
    ...talentProfiles.flatMap(profile => profile.skills),
  ])]

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
    businessProfile.workModes.length > 0,
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
  const activeGigCount = gigManagementState.gigs.filter(gig => (
    ['active', 'in progress', 'hiring', 'reviewing'].includes(String(gig.status).toLowerCase())
  )).length
  const applicationCount = gigManagementState.gigs.reduce((total, gig) => total + (Number(gig.applicants) || 0), 0)
  const overviewStats = [
    { label: 'Active GIGs', value: activeGigCount, icon: '📋', target: 'gig' },
    { label: 'Applications', value: applicationCount, icon: '📥', target: 'gig' },
    { label: 'Total Talent', value: talentProfiles.length, icon: '👥', target: 'talent' },
  ]
  const submissionStatusLabels = {
    submitted: 'submitted an interview task for',
    reviewed: 'had their interview task reviewed for',
    ready_to_hire: 'is ready to hire for',
    needs_revision: 'was asked to revise their task for',
  }
  const recentHiringActivity = dashboardOverview?.recentHiringActivity || (taskSubmissions.length > 0
    ? [...taskSubmissions]
      .sort((left, right) => new Date(right.updatedAt || right.submittedAt) - new Date(left.updatedAt || left.submittedAt))
      .slice(0, 3)
      .map(submission => ({
        name: submission.studentName,
        status: `${submissionStatusLabels[submission.status] || 'updated their application for'} ${submission.gigTitle}`,
        when: submission.updatedAt || submission.submittedAt
          ? new Date(submission.updatedAt || submission.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : 'Recently',
        color: submission.status === 'ready_to_hire' ? '#065F46' : submission.status === 'needs_revision' ? '#92400E' : '#1D4ED8',
        bg: submission.status === 'ready_to_hire' ? '#D1FAE5' : submission.status === 'needs_revision' ? '#FEF3C7' : '#DBEAFE',
      }))
    : dashboardState.recentHiringActivity)
  const displayedOverviewStats = dashboardOverview?.stats || overviewStats
  const displayedProfileCompletion = dashboardOverview?.profileCompletion ?? profileCompletion
  const displayedChecklist = dashboardOverview?.checklist || checklist

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

    async function loadDashboardOverview() {
      if (!sessionTokenRef.current || active !== 'business') {
        return
      }

      try {
        const result = await fetchCompanyDashboard(sessionTokenRef.current)
        if (!cancelled && result.dashboard) {
          setDashboardOverview(result.dashboard)
        }
      } catch (error) {
        // Keep the local demo-backed dashboard if the overview request fails.
      }
    }

    loadDashboardOverview()

    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    let cancelled = false

    async function loadTaskSubmissions() {
      if (!sessionTokenRef.current || !['business', 'gig'].includes(active)) {
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
      if (!sessionTokenRef.current || active !== 'talent') {
        return
      }

      try {
        const result = await fetchCompanyTalent(sessionTokenRef.current, talentFilters)

        if (!cancelled) {
          setTalentProfiles(mergeTalentProfiles(result.talentProfiles || []))
          setTalentSearchMeta({
            availableLocations: result.availableLocations || [],
            availableSkills: result.availableSkills || [],
            total: Number(result.total) || 0,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setTalentProfiles(DEMO_TALENT_PROFILES)
          setTalentSearchMeta({ availableLocations: [], availableSkills: [], total: 0 })
        }
      }
    }

    loadTalentProfiles()

    return () => {
      cancelled = true
    }
  }, [active, talentFilters])

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

  const handleSendInterviewTask = async (applicant, gigTitle) => {
    const token = sessionTokenRef.current
    const studentId = applicant.studentId || applicant.taskSubmission?.studentId

    if (!token || !studentId) {
      throw new Error('This demo applicant is not linked to a student account yet.')
    }

    const result = await sendCompanyInterviewTask(token, {
      studentId,
      gigTitle: gigTitle || applicant.taskSubmission?.gigTitle,
    })

    if (result.gigManagementState) {
      setGigManagementState(mergeCompanyGigManagementState(result.gigManagementState))
    }
    toast.success('The interview task is now visible in the student Opportunity section.', { title: 'Interview Task Sent' })
    return result.opportunity
  }

  const handleCreateCompanyGig = async gig => {
    const token = sessionTokenRef.current
    if (!token) {
      return null
    }

    try {
      const result = await createCompanyGig(token, gig)
      const nextState = mergeCompanyGigManagementState(result.gigManagementState)
      setGigManagementState(nextState)
      toast.success('The new GIG is saved and visible to students.', { title: 'GIG Created' })
      return nextState
    } catch (error) {
      toast.error(error.message || 'The GIG could not be created.', { title: 'Create GIG Failed' })
      return false
    }
  }

  const handleUpdateCompanyGig = async gig => {
    const token = sessionTokenRef.current
    if (!token) {
      return null
    }

    try {
      const result = await updateCompanyGig(token, gig.id, gig)
      const nextState = mergeCompanyGigManagementState(result.gigManagementState)
      setGigManagementState(nextState)
      toast.success('GIG details updated.', { title: 'GIG Updated' })
      return nextState
    } catch (error) {
      toast.error(error.message || 'The GIG could not be updated.', { title: 'Update GIG Failed' })
      return false
    }
  }

  const handleSaveBusinessProfile = async profile => {
    const token = sessionTokenRef.current
    if (!token) {
      setBusinessProfile(mergeCompanyProfile(profile, { businessName: companyName, location }))
      return profile
    }

    const result = await saveCompanyProfile(token, {
      businessProfile: profile,
    })
    const savedProfile = mergeCompanyProfile(result.company?.businessProfile || profile, { businessName: companyName, location })
    setBusinessProfile(savedProfile)
    toast.success('Business profile saved successfully.', { title: 'Profile Updated' })
    return savedProfile
  }

  const handleAddCompanyFunds = async amount => {
    const token = sessionTokenRef.current
    if (!token) {
      throw new Error('Sign in again to add company funds.')
    }

    const result = await addCompanyFunds(token, amount)
    setPaymentState(mergeCompanyPaymentState(result.paymentState))
    toast.success(`${amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} added to the company wallet.`, { title: 'Funds Added' })
    return result.paymentState
  }

  const handleSetupCompanyPayouts = async () => {
    const token = sessionTokenRef.current
    if (!token) {
      throw new Error('Sign in again to set up payouts.')
    }

    const result = await setupCompanyPayouts(token)
    setPaymentState(mergeCompanyPaymentState(result.paymentState))
    toast.success('Payout methods were verified and saved.', { title: 'Payout Setup Updated' })
    return result.paymentState
  }

  const handleShareWorkspaceUpdate = async (projectId, message) => {
    const token = sessionTokenRef.current
    if (!token) {
      throw new Error('Sign in again to share a project update.')
    }

    const result = await shareCompanyWorkspaceUpdate(token, projectId, message)
    setProjectWorkspaceState(mergeCompanyWorkspaceState(result.projectWorkspaceState))
    toast.success('The project update was saved.', { title: 'Update Shared' })
    return result.projectWorkspaceState
  }

  const handleSetWorkspaceMilestone = async (projectId, milestone) => {
    const token = sessionTokenRef.current
    if (!token) {
      throw new Error('Sign in again to set a project milestone.')
    }

    const result = await setCompanyWorkspaceMilestone(token, projectId, milestone)
    setProjectWorkspaceState(mergeCompanyWorkspaceState(result.projectWorkspaceState))
    toast.success('The project milestone was saved.', { title: 'Milestone Set' })
    return result.projectWorkspaceState
  }

  const profileNavItem = NAV_ITEMS.find(item => item.key === 'profile')
  const primaryNavItems = NAV_ITEMS.filter(item => item.key !== 'profile')
  const renderSidebarItem = item => (
    <button key={item.key} type="button" onClick={() => {
      setActive(item.key)
      setSidebarOpen(false)
    }} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 10, border: 'none',
      background: active === item.key ? 'var(--accent-light)' : 'transparent',
      color: active === item.key ? 'var(--accent)' : 'var(--muted)',
      fontWeight: active === item.key ? 700 : 500,
      fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
      transition: 'all 0.15s',
      boxShadow: active === item.key ? 'inset 3px 0 0 var(--accent)' : 'inset 0 0 0 transparent',
    }}
    onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = 'var(--bg)' }}
    onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent' }}>
      <span style={{
        width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, background: active === item.key ? 'rgba(249,115,22,0.12)' : 'var(--bg)',
        fontSize: 15, flexShrink: 0,
      }}>{item.icon}</span>
      {item.label}
    </button>
  )

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
          <button type="button" className="mobile-only mobile-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open company workspace navigation">
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
          padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', gap: 5,
          position: 'sticky', top: 52, height: 'calc(100vh - 52px)', overflowY: 'auto',
        }}>
          <div style={{ padding: '2px 14px 12px', color: 'var(--muted)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Company workspace
          </div>
          {primaryNavItems.map(renderSidebarItem)}
          <div style={{ flex: 1 }} />
          <div style={{ height: 1, background: 'var(--border)', margin: '12px 8px 8px' }} />
          {profileNavItem && renderSidebarItem(profileNavItem)}
          <button type="button" onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 10, border: 'none',
            background: 'transparent', color: '#EF4444',
            fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#FEF2F2', fontSize: 15 }}>🚪</span>
            Logout
          </button>
        </aside>

        {/* Main content */}
        <main className="dashboard-main" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {active === 'business' && (
            <div>
              <div className="responsive-hero" style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                borderRadius: 16, padding: '24px 28px',
                boxShadow: '0 10px 28px rgba(249,115,22,0.16)',
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
                  <div style={{ color: 'white', fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{talentProfiles.length}</div>
                </div>
              </div>

              <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                {displayedOverviewStats.map(stat => (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={() => setActive(stat.target)}
                    style={{ background: 'var(--white)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = 'var(--shadow)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{stat.label}</div>
                  </button>
                ))}
              </div>

              <div className="responsive-split-main" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', borderTop: '3px solid var(--success)', padding: '18px 20px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>Business Setup Health</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Complete profile details to increase applicant trust and improve match quality.</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '4px 9px', borderRadius: 100 }}>
                      {displayedProfileCompletion}% complete
                    </span>
                  </div>

                  <div style={{ height: 9, borderRadius: 999, background: '#E2E8F0', marginBottom: 14, overflow: 'hidden' }}>
                    <div style={{ width: `${displayedProfileCompletion}%`, height: '100%', background: 'linear-gradient(90deg, #22C55E, #16A34A)' }} />
                  </div>

                  <div className="responsive-form-grid-tight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {displayedChecklist.map(item => (
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
                  <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
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

                  <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
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
                  {recentHiringActivity.map(item => (
                    <div key={item.name + item.status} style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '11px 12px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>{item.status}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: item.bg, color: item.color, padding: '3px 8px', borderRadius: 100 }}>
                        {formatActivityWhen(item.when)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'talent' && (
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
                <span style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'var(--accent-light)', fontSize: 16 }}>🔍</span>
                Top Talent Matches <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>({filteredTalent.length} found)</span>
              </h3>

              <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px', marginBottom: 14, boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
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
                    boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
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
            <SetupBusinessProfile profile={businessProfile} onSave={handleSaveBusinessProfile} />
          )}

          {active === 'gig'       && (
            <GigManagement
              gigManagementState={gigManagementState}
              onSaveState={setGigManagementState}
              taskSubmissions={taskSubmissions}
              talentProfiles={talentProfiles}
              onReviewTaskSubmission={handleReviewTaskSubmission}
              onSendInterviewTask={handleSendInterviewTask}
              onCreateGig={handleCreateCompanyGig}
              onUpdateGig={handleUpdateCompanyGig}
            />
          )}
          {active === 'workspace' && (
            <ProjectWorkspace
              projectWorkspaceState={projectWorkspaceState}
              onSaveState={setProjectWorkspaceState}
              onShareUpdate={handleShareWorkspaceUpdate}
              onSetMilestone={handleSetWorkspaceMilestone}
            />
          )}
          {active === 'payment'   && (
            <PaymentSection
              paymentState={paymentState}
              onSaveState={setPaymentState}
              onAddFunds={handleAddCompanyFunds}
              onSetupPayouts={handleSetupCompanyPayouts}
            />
          )}

        </main>
      </div>
      <TalentProfileModal profile={selectedTalent} onClose={() => setSelectedTalent(null)} />
    </div>
  )
}
