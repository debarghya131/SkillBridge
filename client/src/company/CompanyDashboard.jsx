import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  buildDefaultCompanyDashboardState,
  isBundledCompanyIntroVideoUrl,
  mergeCompanyDashboardState,
  mergeCompanyProfile,
} from './companyDemoData'
import {
  clearCompanySessionToken,
  createCompanyGig,
  deleteCompanyGig,
  fetchCompanyDashboard,
  fetchCompanyTaskSubmissions,
  fetchCurrentCompany,
  getCompanySessionToken,
  fetchCompanyTalent,
  fetchCompanyStudentProfile,
  fetchCompanyPayment,
  recordCompanyExternalPayment,
  logoutCompany,
  reviewCompanyTaskSubmission,
  sendCompanyInterviewTask,
  updateCompanyGig,
  saveCompanyProfile,
  saveCompanyTaskLibrary,
  setCompanyWorkspaceMilestone,
  shareCompanyWorkspaceUpdate,
} from './companyApi'
import { buildDefaultCompanyGigManagementState, mergeCompanyGigManagementState } from './companyGigDemoData'
import { buildDefaultCompanyPaymentState, mergeCompanyPaymentState } from './companyPaymentDemoData'
import { buildDefaultCompanyWorkspaceState, mergeCompanyWorkspaceState } from './companyWorkspaceDemoData'
import { buildDefaultCompanyTaskLibraryState, mergeCompanyTaskLibraryState } from './companyTaskDefaults'
import GigManagement from './GigManagement'
import PaymentSection from './PaymentSection'
import BusinessOverview from './BusinessOverview'
import DashboardSkeleton from '../ui/DashboardSkeleton'
import './CompanyViewport.css'
import SetupBusinessProfile from './SetupBusinessProfile'
import ProjectWorkspace from './ProjectWorkspace'
import TaskCenter from './TaskCenter'
import { toast } from '../ui/toast'
import { safeExternalUrl, safeVideoUrl } from '../lib/safeExternalUrl'
import CompanyLogo from '../ui/CompanyLogo'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import CompanyProfileModal from '../ui/CompanyProfileModal'
import { talentFilterOptions } from './talentFilterOptions'
import PublicStudentProfile from '../ui/PublicStudentProfile'
import DirectOpportunityModal from './DirectOpportunityModal'
import { ChevronDown, ExternalLink, Flame, Send, ShieldCheck, X } from 'lucide-react'
import { readCompanySectionCache, writeCompanySectionCache } from './sectionCache'

const SKILL_LEVELS = ['All', 'Beginner', 'Intermediate', 'Pro', 'Pro Mastery']
const TALENT_PAGE_SIZE = 12

const COMPANY_REGISTRATION_METHODS = {
  email: { icon: '📧', label: 'Business email' },
  phone: { icon: '📱', label: 'Phone number' },
}

const COMPANY_VERIFICATION_METHODS = {
  gstin: { icon: '🏛️', label: 'GSTIN' },
  udyam: { icon: '📋', label: 'Udyam registration' },
}

const STUDENT_REGISTRATION_METHODS = {
  email: { icon: '📧', label: 'College Email' },
  phone: { icon: '📱', label: 'Phone Number' },
}

const STUDENT_VERIFICATION_METHODS = {
  aadhaar: { icon: '🪪', label: 'Aadhaar Card' },
  digilocker: { icon: '🔐', label: 'DigiLocker' },
}

const LEVEL_META = {
  'Pro Mastery': { bg: '#fef3c7', color: '#a16207' },
  Pro: { bg: '#F3E8FF', color: '#7C3AED' },
  Intermediate: { bg: '#EFF6FF', color: '#1D4ED8' },
  Beginner: { bg: '#F0FDF4', color: '#15803D' },
}

function TalentSkillPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => {
    window.requestAnimationFrame(() => {
      if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
    })
  }

  return <div ref={pickerRef} className="talent-skill-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="talent-skill-trigger" aria-haspopup="listbox" aria-expanded={open}
      onClick={() => setOpen(value => !value)}>
      <span>{value || 'All'}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className="talent-skill-options" role="listbox" aria-label="Skill">
      {options.map(option => <button key={option} type="button" role="option" aria-selected={option === value}
        onClick={() => { onChange(option); setOpen(false) }}>{option}</button>)}
    </div>}
  </div>
}

function getSkillLevel(profile, skill) {
  if (!profile.skillsByLevel) return null
  for (const [level, list] of Object.entries(profile.skillsByLevel)) {
    if (list.includes(skill)) return level
  }
  return null
}

function CompanyVerificationBadge({ contactMethod = 'email', verificationMethod = 'gstin' }) {
  const [show, setShow] = useState(false)
  const registration = COMPANY_REGISTRATION_METHODS[contactMethod] || COMPANY_REGISTRATION_METHODS.email
  const verification = COMPANY_VERIFICATION_METHODS[verificationMethod] || COMPANY_VERIFICATION_METHODS.gstin

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span aria-label="Verified business" style={{ width: 20, height: 20, borderRadius: '50%', background: '#10B981', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>✓</span>
      {show && (
        <span style={{ position: 'absolute', top: '130%', left: '50%', transform: 'translateX(-50%)', zIndex: 1300, minWidth: 180, background: 'white', color: 'var(--dark)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', borderRadius: 8, padding: '8px 10px', fontSize: 12, pointerEvents: 'none' }}>
          <strong style={{ display: 'block', color: '#059669', marginBottom: 5 }}>Business verified</strong>
          <span style={{ display: 'block' }}>{registration.icon} Registered via {registration.label}</span>
          <span style={{ display: 'block', marginTop: 3 }}>{verification.icon} Verified via {verification.label}</span>
        </span>
      )}
    </span>
  )
}

function StudentVerificationBadge({ contactMethod = 'email', verificationMethod = 'aadhaar' }) {
  const [show, setShow] = useState(false)
  const registration = STUDENT_REGISTRATION_METHODS[contactMethod] || STUDENT_REGISTRATION_METHODS.email
  const identity = STUDENT_VERIFICATION_METHODS[verificationMethod] || STUDENT_VERIFICATION_METHODS.aadhaar

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span aria-label="Verified account" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#10B981', color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 100, cursor: 'default' }}>✓ Verified</span>
      {show && (
        <span style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 1300, minWidth: 205, background: 'white', color: 'var(--dark)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', borderRadius: 8, padding: '8px 10px', fontSize: 12, pointerEvents: 'none' }}>
          <strong style={{ display: 'block', color: '#059669', marginBottom: 5 }}>Account verification</strong>
          <span style={{ display: 'block' }}>{registration.icon} Registered via {registration.label}</span>
          <span style={{ display: 'block', marginTop: 3 }}>{identity.icon} Identity verified via {identity.label}</span>
        </span>
      )}
    </span>
  )
}

function getContactHref(item) {
  const label = String(item?.label || '').toLowerCase()
  const value = String(item?.value || '').trim()
  if (label.includes('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`
  if (label.includes('phone') || label.includes('mobile') || label.includes('whatsapp')) {
    const phone = value.replace(/[^+\d]/g, '')
    return phone.length >= 7 ? `tel:${phone}` : ''
  }
  return safeExternalUrl(value)
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
  { key: 'tasks',     icon: '📝', label: 'Task Center' },
  { key: 'talent',    icon: '🔍', label: 'Talent Search' },
  { key: 'workspace', icon: '🗂️',  label: 'Project Workspace' },
  { key: 'payment',   icon: '💳', label: 'Payment' },
]

function BusinessProfileModal({ profile, onClose, contactMethod, verificationMethod }) {
  return profile ? <CompanyProfileModal profile={{ ...profile, contactMethod, verificationMethod }} onClose={onClose}/> : null
}

function TalentProfileModal({ profile, onClose, onSendOpportunity }) {
  const videoRef = useRef(null)
  const closeButtonRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [levelFilter, setLevelFilter] = useState('All')

  useEffect(() => {
    if (!profile) return undefined
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    const closeOnEscape = event => event.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      previouslyFocused?.focus?.()
    }
  }, [profile, onClose])

  if (!profile) return null

  const levels = ['All', 'Pro Mastery', 'Pro', 'Intermediate', 'Beginner']
  const skillDetails = Array.isArray(profile.skillDetails) && profile.skillDetails.length > 0
    ? profile.skillDetails
    : (profile.skills || []).map(skill => ({
      name: skill,
      verified: (profile.verifiedSkills || []).includes(skill),
      level: getSkillLevel(profile, skill),
      streak: 0,
    }))
  const filteredSkills = levelFilter === 'All'
    ? skillDetails
    : skillDetails.filter(skill => skill.level === levelFilter)
  const verifiedSkillCount = skillDetails.filter(skill => skill.verified).length
  const githubUrl = safeExternalUrl(profile.github)
  const introVideoUrl = safeVideoUrl(profile.videoUrl)

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
      role="presentation"
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
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="responsive-modal-card talent-profile-modal" role="dialog" aria-modal="true" aria-labelledby="talent-profile-title" style={{
        width: '100%',
        maxWidth: 760,
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--white)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="responsive-modal-header" style={{
          background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)',
          borderRadius: '8px 8px 0 0',
          padding: '24px 28px',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div className="talent-profile-heading" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              overflow: 'hidden',
              position: 'relative',
            }}>
              <span>{profile.name[0]}</span>
              {profile.avatar && <img src={profile.avatar} alt={`${profile.name} profile`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={event => { event.currentTarget.remove() }} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <div id="talent-profile-title" style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{profile.name}</div>
                <StudentVerificationBadge contactMethod={profile.contactMethod} verificationMethod={profile.verificationMethod} />
                {verifiedSkillCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, background: '#D1FAE5', color: '#047857', padding: '3px 8px', borderRadius: 100 }}>
                  <ShieldCheck size={12} /> {verifiedSkillCount} verified skill{verifiedSkillCount === 1 ? '' : 's'}
                </span>}
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
              <div style={{ marginTop: 7, color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                {profile.location} · {profile.projects || 0} published project{profile.projects === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            title="Close"
            aria-label="Close talent profile"
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
            <X size={17} />
          </button>
        </div>

        <div className="responsive-modal-body" style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Skills</div>
              <div className="talent-profile-filters" style={{ display: 'flex', gap: 4 }}>
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
                  const level = skill.level
                  const levelMeta = level ? LEVEL_META[level] : null
                  return (
                    <span key={skill.name} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    }}>
                      {skill.name}
                      {skill.verified && <span title="Skill verified" aria-label="Skill verified" style={{ display: 'inline-flex', color: '#059669' }}><ShieldCheck size={13} /></span>}
                      {levelMeta && <span style={{ background: levelMeta.bg, color: levelMeta.color, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 100 }}>{level}</span>}
                      {skill.streak > 0 && <span title="Current retention streak" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: '#FFF7ED', color: '#C2410C', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                        <Flame size={10} /> {skill.streak}d
                      </span>}
                    </span>
                  )
                })}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            {introVideoUrl ? <>
              <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', maxWidth: 460 }}>
                <video ref={videoRef} src={introVideoUrl} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
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
            </> : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '18px', color: 'var(--muted)', fontSize: 13 }}>
                No introduction video published.
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>GitHub</div>
            {githubUrl ? (
              <a href={githubUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', padding: '12px 14px', fontSize: 13, color: 'var(--primary)', overflowWrap: 'anywhere' }}>
                <span>{profile.github}</span><ExternalLink size={15} style={{ flexShrink: 0 }} />
              </a>
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
                    {getContactHref(item)
                      ? <a href={getContactHref(item)} target={getContactHref(item).startsWith('http') ? '_blank' : undefined} rel={getContactHref(item).startsWith('http') ? 'noreferrer' : undefined} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, overflowWrap: 'anywhere' }}>{item.value}</a>
                      : <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600, overflowWrap: 'anywhere' }}>{item.value}</div>}
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
              {(profile.savedProjects || []).map(project => (
                <div key={project.name} style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>{project.desc}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {safeExternalUrl(project.link) && <a href={safeExternalUrl(project.link)} target="_blank" rel="noreferrer">View Project</a>}
                    {safeExternalUrl(project.demoLink) && <a href={safeExternalUrl(project.demoLink)} target="_blank" rel="noreferrer">Live Preview</a>}
                  </div>
                </div>
              ))}
              {(profile.savedProjects || []).length === 0 && <span style={{ color: 'var(--muted)', fontSize: 13 }}>No published projects yet.</span>}
            </div>
          </div>
        </div>
        <div className="talent-profile-actions" style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 28px', borderTop: '1px solid var(--border)', background: 'var(--white)' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={() => onSendOpportunity(profile)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Send size={15} /> Send opportunity
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const { state, search } = useLocation()
  const initialCompany = state?.company || state || {}
  const companyName = initialCompany.businessName || initialCompany.companyName || 'Your Business'
  const location = initialCompany.location || ''
  const sectionFromUrl = new URLSearchParams(search).get('section')
  const requestedSection = NAV_ITEMS.some(item => item.key === sectionFromUrl)
    ? sectionFromUrl
    : (NAV_ITEMS.some(item => item.key === state?.activeSection) ? state.activeSection : 'business')
  const sessionTokenRef = useRef(getCompanySessionToken())
  const didLoadCompanyRef = useRef(false)
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [active, setActive] = useState(requestedSection)
  const [selectedTalent, setSelectedTalent] = useState(null)
  const talentProfileRequest = useRef(0)
  const [showBusinessProfile, setShowBusinessProfile] = useState(false)
  const [directOpportunityTalent, setDirectOpportunityTalent] = useState(null)
  const [talentFilters, setTalentFilters] = useState({
    minTrustScore: 0,
    location: 'All',
    skill: 'All',
    level: 'All',
    query: '',
  })
  const [businessProfile, setBusinessProfile] = useState(() => mergeCompanyProfile(initialCompany.businessProfile || initialCompany, { businessName: companyName, location }))
  const [contactMethod, setContactMethod] = useState(initialCompany.contactMethod || 'email')
  const [verificationMethod, setVerificationMethod] = useState(initialCompany.verificationMethod || 'gstin')
  const [dashboardState, setDashboardState] = useState(() => mergeCompanyDashboardState(initialCompany.dashboardState || buildDefaultCompanyDashboardState()))
  const [dashboardOverview, setDashboardOverview] = useState(null)
  const [gigManagementState, setGigManagementState] = useState(() => mergeCompanyGigManagementState(initialCompany.gigManagementState || buildDefaultCompanyGigManagementState()))
  const [paymentState, setPaymentState] = useState(() => mergeCompanyPaymentState(initialCompany.paymentState || buildDefaultCompanyPaymentState()))
  const [projectWorkspaceState, setProjectWorkspaceState] = useState(() => mergeCompanyWorkspaceState(initialCompany.projectWorkspaceState || buildDefaultCompanyWorkspaceState()))
  const [taskLibraryState, setTaskLibraryState] = useState(() => mergeCompanyTaskLibraryState(initialCompany.taskLibraryState || buildDefaultCompanyTaskLibraryState()))
  const [talentProfiles, setTalentProfiles] = useState([])
  const [talentSearchMeta, setTalentSearchMeta] = useState({ availableLocations: [], availableSkills: [], total: 0, page: 1, pageSize: TALENT_PAGE_SIZE })
  const [talentPage, setTalentPage] = useState(1)
  const [isTalentLoading, setIsTalentLoading] = useState(false)
  const [talentError, setTalentError] = useState('')
  const [taskSubmissions, setTaskSubmissions] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setActive(current => current === requestedSection ? current : requestedSection)
  }, [requestedSection])

  const selectSection = section => {
    if (!NAV_ITEMS.some(item => item.key === section)) return
    setActive(section)
    setSidebarOpen(false)
    navigate(`/company/dashboard?section=${encodeURIComponent(section)}`)
  }

  const availableLocations = talentFilterOptions('location', talentSearchMeta.availableLocations)
  const availableSkills = talentFilterOptions('skill', talentSearchMeta.availableSkills)
  const talentTotalPages = Math.max(1, Math.ceil((talentSearchMeta.total || 0) / (talentSearchMeta.pageSize || TALENT_PAGE_SIZE)))

  const resetTalentFilters = () => {
    setTalentFilters({
      minTrustScore: 0,
      location: 'All',
      skill: 'All',
      level: 'All',
      query: '',
    })
    setTalentPage(1)
  }

  const updateTalentFilters = update => {
    setTalentFilters(current => typeof update === 'function' ? update(current) : { ...current, ...update })
    setTalentPage(1)
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
    const token = sessionTokenRef.current
    if (!token) { navigate('/company', { replace: true }); return }
    const initialLoad = !didLoadCompanyRef.current
    const cachedCompany = initialLoad ? readCompanySectionCache('shell', token) : null
    // GIG Management has its own persisted list, and My Business receives its
    // recent activity from /dashboard. Only Task Center needs full reviews.
    const needsSubmissions = ['tasks', 'workspace'].includes(active)
    const cachedSubmissions = needsSubmissions ? readCompanySectionCache('submissions', token) : null
    const cachedPayment = active === 'payment' ? readCompanySectionCache('payment', token) : null
    setIsLoading(initialLoad && !cachedCompany)
    setLoadError('')
    async function load() {
      try {
        const [result, overview, submissions, payments] = await Promise.all([
          initialLoad && !cachedCompany ? fetchCurrentCompany(token) : null,
          active === 'business' ? fetchCompanyDashboard(token) : null,
          needsSubmissions && !cachedSubmissions ? fetchCompanyTaskSubmissions(token) : null,
          active === 'payment' && !cachedPayment ? fetchCompanyPayment(token) : null,
        ])
        if (cancelled) return
        const companySnapshot = result?.company || cachedCompany
        if (companySnapshot) {
          setBusinessProfile(mergeCompanyProfile(companySnapshot.businessProfile || companySnapshot))
          setContactMethod(companySnapshot.contactMethod || 'email')
          setVerificationMethod(companySnapshot.verificationMethod || 'gstin')
          setDashboardState(mergeCompanyDashboardState(companySnapshot.dashboardState))
          setGigManagementState(mergeCompanyGigManagementState(companySnapshot.gigManagementState))
          setProjectWorkspaceState(mergeCompanyWorkspaceState(companySnapshot.projectWorkspaceState))
          setTaskLibraryState(mergeCompanyTaskLibraryState(companySnapshot.taskLibraryState))
          if (result?.company) writeCompanySectionCache('shell', token, result.company)
          didLoadCompanyRef.current = true
        }
        const submissionSnapshot = submissions?.taskSubmissions || cachedSubmissions
        if (submissionSnapshot) {
          const nextSubmissions = submissionSnapshot.filter(item => item?.id)
          setTaskSubmissions(nextSubmissions)
          if (submissions) writeCompanySectionCache('submissions', token, nextSubmissions)
        }
        if (overview) setDashboardOverview(overview.dashboard)
        const paymentSnapshot = payments?.paymentState || cachedPayment
        if (paymentSnapshot) {
          setPaymentState(mergeCompanyPaymentState(paymentSnapshot))
          if (payments) writeCompanySectionCache('payment', token, payments.paymentState)
        }
      } catch (error) {
        if (cancelled) return
        if (error.status === 401) {
          clearCompanySessionToken()
          navigate('/company', { replace: true })
        } else setLoadError(error.message || 'Could not load the company workspace.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [active, refreshVersion, navigate])

  useEffect(() => {
    if (active !== 'talent') return undefined

    let cancelled = false
    const token = sessionTokenRef.current
    if (!token) return undefined

    setIsTalentLoading(true)
    setTalentError('')
    const requestTimer = window.setTimeout(async () => {
      try {
        const talent = await fetchCompanyTalent(token, {
          ...talentFilters,
          page: talentPage,
          pageSize: TALENT_PAGE_SIZE,
        })
        if (cancelled) return
        setTalentProfiles(talent.talentProfiles || [])
        setTalentSearchMeta({
          availableLocations: talent.availableLocations || [],
          availableSkills: talent.availableSkills || [],
          total: talent.total || 0,
          page: talent.page || talentPage,
          pageSize: talent.pageSize || TALENT_PAGE_SIZE,
        })
      } catch (error) {
        if (cancelled) return
        if (error.status === 401) {
          clearCompanySessionToken()
          navigate('/company', { replace: true })
          return
        }
        setTalentError(error.message || 'Could not load talent matches.')
      } finally {
        if (!cancelled) setIsTalentLoading(false)
      }
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(requestTimer)
    }
  }, [active, talentFilters, talentPage, refreshVersion, navigate])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRefreshVersion(value => value + 1) }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  const handleSaveTaskLibrary = async nextState => {
    const result = await saveCompanyTaskLibrary(sessionTokenRef.current, { taskLibraryState: nextState, revision: taskLibraryState.revision || 0 })
    setTaskLibraryState(mergeCompanyTaskLibraryState(result.taskLibraryState))
    return result.taskLibraryState
  }

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
    const reviewedSubmission = result?.taskSubmission || result

    if (!reviewedSubmission?.id) {
      throw new Error('The review response was incomplete. Please refresh and try again.')
    }

    setTaskSubmissions(current => current.map(item => (
      item.id === reviewedSubmission.id ? { ...item, ...reviewedSubmission } : item
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

  const handleSendInterviewTask = async (applicant, gigTitle, taskPayload) => {
    const token = sessionTokenRef.current
    const studentId = applicant.studentId || applicant.taskSubmission?.studentId

    if (!token || !studentId) {
      throw new Error('Sign in and choose a registered applicant.')
    }

    const result = await sendCompanyInterviewTask(token, {
      studentId,
      gigTitle: gigTitle || applicant.taskSubmission?.gigTitle,
      ...taskPayload,
    })

    if (result.gigManagementState) {
      setGigManagementState(mergeCompanyGigManagementState(result.gigManagementState))
    }
    if (result.alreadyExists) {
      toast.info('This student already has the opportunity. The original task was not changed.', { title: 'Opportunity Already Sent' })
    } else {
      toast.success('The interview task is now visible in the student Opportunity section.', { title: 'Interview Task Sent' })
    }
    return result.opportunity
  }

  const handleSendDirectOpportunity = async (student, gig, task, message) => {
    const token = sessionTokenRef.current
    if (!token || !student?.id) throw new Error('Sign in again and choose a student.')

    const result = await sendCompanyInterviewTask(token, {
      studentId: student.id,
      companyGigId: gig.id,
      gigTitle: gig.title,
      directInvite: true,
      message,
      taskTitle: task.title,
      taskType: task.type || 'mixed',
      taskDetails: task.details || {},
      taskInstructions: task.instructions,
      taskDeadline: task.deadline,
      taskPoints: task.points,
    })

    if (result.gigManagementState) {
      setGigManagementState(mergeCompanyGigManagementState(result.gigManagementState))
    }
    if (result.alreadyExists) {
      toast.info(`${student.name} already has this opportunity. The original accepted task was not changed.`, { title: 'Opportunity Already Sent' })
    } else {
      toast.success(`${student.name} can now review this role and task in Opportunity.`, { title: 'Opportunity Sent' })
    }
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

  const handleDeleteCompanyGig = async gigId => {
    const token = sessionTokenRef.current
    if (!token) return null

    try {
      const result = await deleteCompanyGig(token, gigId)
      const nextState = mergeCompanyGigManagementState(result.gigManagementState)
      setGigManagementState(nextState)
      toast.success('The GIG was removed from student Browse GIGs.', { title: 'GIG Deleted' })
      return nextState
    } catch (error) {
      toast.error(error.message || 'The GIG could not be deleted.', { title: 'Delete GIG Failed' })
      return false
    }
  }

  const handleSaveBusinessProfile = async profile => {
    const token = sessionTokenRef.current
    if (!token) {
      setBusinessProfile(mergeCompanyProfile(profile))
      return profile
    }

    const profileToSave = {
      ...profile,
      // Bundled media is a UI fallback and must never become public profile content.
      introVideoUrl: isBundledCompanyIntroVideoUrl(profile.introVideoUrl) ? null : profile.introVideoUrl,
    }
    const result = await saveCompanyProfile(token, {
      businessProfile: profileToSave,
    })
    // The API response is authoritative. Do not merge the original sign-in
    // snapshot here or an edited business name/location will appear to revert.
    const savedProfile = mergeCompanyProfile(result.company?.businessProfile || profile)
    setBusinessProfile(savedProfile)
    toast.success('Business profile saved successfully.', { title: 'Profile Updated' })
    return savedProfile
  }

  const handleRecordPayment = async (submissionId, payload) => {
    const result = await recordCompanyExternalPayment(sessionTokenRef.current, submissionId, payload)
    setPaymentState(mergeCompanyPaymentState(result.paymentState))
    try {
      const [companySnapshot, submissionSnapshot] = await Promise.all([
        fetchCurrentCompany(sessionTokenRef.current),
        fetchCompanyTaskSubmissions(sessionTokenRef.current),
      ])
      setGigManagementState(mergeCompanyGigManagementState(companySnapshot.company.gigManagementState))
      setProjectWorkspaceState(mergeCompanyWorkspaceState(companySnapshot.company.projectWorkspaceState))
      setTaskLibraryState(mergeCompanyTaskLibraryState(companySnapshot.company.taskLibraryState))
      setTaskSubmissions((submissionSnapshot.taskSubmissions || []).filter(item => item?.id))
    } catch {
      // The payment is already committed; retry the read without showing a
      // false payment failure to the company.
      setRefreshVersion(value => value + 1)
    }
    toast.success('External payment recorded.', { title: 'Payment Recorded' })
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
  const renderSidebarItem = item => {
    const isProfileItem = item.key === 'profile'
    const isActive = active === item.key
    return (
      <button key={item.key} type="button" onClick={() => selectSection(item.key)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 10,
        border: isProfileItem && !isActive ? '1px solid rgba(249,115,22,0.34)' : '1px solid transparent',
        background: isActive ? 'var(--accent-light)' : 'transparent',
        color: isActive || isProfileItem ? 'var(--accent)' : 'var(--muted)',
        fontWeight: isActive ? 700 : isProfileItem ? 650 : 500,
        fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'all 0.15s',
        boxShadow: isActive ? 'inset 3px 0 0 var(--accent)' : 'none',
      }}
      onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = 'var(--bg)' }}
      onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent' }}>
        <span style={{
          width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, background: isActive || isProfileItem ? 'rgba(249,115,22,0.12)' : 'var(--bg)',
          fontSize: 15, flexShrink: 0,
        }}>{item.icon}</span>
        <span className="company-sidebar-label">{item.label}</span>
      </button>
    )
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
          <button type="button" className="mobile-only mobile-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open company workspace navigation">
            ☰
          </button>
          <SkillBridgeBrand size="compact" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="dashboard-user-meta"
            onClick={() => setShowBusinessProfile(true)}
            title="Open business profile"
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <CompanyLogo logo={businessProfile.logo} name={businessProfile.businessName} size={30} style={{ borderRadius: '50%' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>{businessProfile.businessName}</div><CompanyVerificationBadge contactMethod={contactMethod} verificationMethod={verificationMethod} /></div>
              <div className="dashboard-user-subtitle" style={{ fontSize: 11, color: 'var(--muted)' }}>{businessProfile.location || 'Business'}</div>
            </div>
          </button>
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
          <div className="company-sidebar-heading" style={{ padding: '2px 14px 12px', color: 'var(--muted)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <span>Company workspace</span>
            <button type="button" className="mobile-only company-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close company workspace navigation">×</button>
          </div>
          {primaryNavItems.map(renderSidebarItem)}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '4px 14px 6px', color: 'var(--muted)', fontSize: 10, textAlign: 'center' }}>
            Made with 🧡 by <a className="sidebar-author-link" href="https://portfolio.debarghya.org/" target="_blank" rel="noreferrer">Debarghya</a>
          </div>
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
            <span className="company-sidebar-label">Logout</span>
          </button>
        </aside>

        {/* Main content */}
        <main key={active} className={`dashboard-main company-viewport section-${active}${active === 'business' ? ' business-main' : ''}`} style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {isLoading && <DashboardSkeleton section={active} />}
          {loadError && <div role="alert" className="work-error">{loadError} <button className="btn-secondary" onClick={() => setRefreshVersion(value => value + 1)}>Retry</button></div>}
          {!isLoading && !loadError && <>
          {active === 'business' && (
            <BusinessOverview profile={businessProfile} stats={displayedOverviewStats}
              completion={displayedProfileCompletion} checklist={displayedChecklist}
              activity={recentHiringActivity} submissions={taskSubmissions}
              projects={projectWorkspaceState.projects || []} onNavigate={selectSection}
              formatWhen={formatActivityWhen} />
          )}

          {active === 'talent' && (
            <div className="talent-search-page">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: 'var(--dark)', marginBottom: 16 }}>
                <span style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'var(--accent-light)', fontSize: 16 }}>🔍</span>
                Top Talent Matches <span aria-live="polite" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>({isTalentLoading && talentProfiles.length === 0 ? 'Loading...' : `${talentSearchMeta.total} found`})</span>
              </h3>

              <div className="talent-search-filters" style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px', marginBottom: 14, boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
                <div className="responsive-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.1fr) 1.2fr 1fr 1fr auto', gap: 10, alignItems: 'end', marginBottom: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Search talent
                    </span>
                    <input
                      type="search"
                      value={talentFilters.query}
                      onChange={e => updateTalentFilters({ query: e.target.value })}
                      placeholder="Search by name"
                      aria-label="Search talent by name"
                      style={{ minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, fontFamily: 'inherit' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Min TrustScore
                    </span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        value={talentFilters.minTrustScore}
                        onChange={e => updateTalentFilters({ minTrustScore: Number(e.target.value) })}
                        style={{ flex: '1 1 auto', minWidth: 0, width: 'auto' }}
                      />
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={talentFilters.minTrustScore}
                        onChange={e => updateTalentFilters({ minTrustScore: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) })}
                        style={{ flex: '0 0 66px', width: 66, minWidth: 0, padding: '8px 9px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, fontFamily: 'inherit' }}
                      />
                    </div>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Location
                    </span>
                    <TalentSkillPicker
                      value={talentFilters.location}
                      options={availableLocations}
                      onChange={location => updateTalentFilters({ location })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Skill
                    </span>
                    <TalentSkillPicker
                      value={talentFilters.skill}
                      options={availableSkills}
                      onChange={skill => updateTalentFilters({ skill })}
                    />
                  </div>

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
                      onClick={() => updateTalentFilters({ level })}
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

              {talentError && (
                <div role="alert" className="work-error" style={{ marginBottom: 12 }}>
                  {talentError} <button className="btn-secondary" onClick={() => setRefreshVersion(value => value + 1)}>Retry</button>
                </div>
              )}

              <div aria-busy={isTalentLoading} style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: isTalentLoading ? 0.65 : 1, transition: 'opacity 0.15s' }}>
                {isTalentLoading && talentProfiles.length === 0 && (
                  <div role="status" style={{ background: 'var(--white)', borderRadius: 8, border: '1px solid var(--border)', padding: '24px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                    Loading talent matches...
                  </div>
                )}
                {talentProfiles.map((p, i) => (
                  <div className="responsive-hero talent-search-card" key={p.id} style={{
                    background: 'var(--white)', borderRadius: 12,
                    padding: '18px 22px', border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 12, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                    <div className="talent-search-card-main" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div aria-hidden="true" style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: `hsl(${(i * 60) + 220}, 70%, 55%)`,
                        display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative',
                        color: 'white', fontWeight: 800, fontSize: 17, flexShrink: 0,
                      }}>
                        <span>{p.name[0]}</span>
                        {p.avatar && <img src={p.avatar} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={event => { event.currentTarget.remove() }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)', marginBottom: 2 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>{p.location} · {p.projects} projects</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.skills.slice(0, 7).map(s => (
                            <span key={s} style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
                              {s}
                            </span>
                          ))}
                          {p.skills.length > 7 && (
                            <span style={{ background: 'var(--bg)', color: 'var(--muted)', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                              +{p.skills.length - 7} more
                            </span>
                          )}
                        </div>
                        {p.matchedSkills?.length > 0 && (
                          <div style={{ color: '#047857', fontSize: 11, fontWeight: 700, marginTop: 7 }}>
                            Matches {p.matchedSkills.length} required skill{p.matchedSkills.length === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="talent-search-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>{p.score}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TrustScore™</div>
                      </div>
                      <button
                        onClick={async () => {
                          const request = ++talentProfileRequest.current
                          setSelectedTalent({ ...p, practiceDays: 0, trustStreak: 0, completedGigs: 0, teamUps: 0, loading: true, opportunityProfile: p })
                          try {
                            const result = await fetchCompanyStudentProfile(getCompanySessionToken(), p.id)
                            if (request === talentProfileRequest.current) setSelectedTalent({ ...result.profile, loading: false, opportunityProfile: p })
                          } catch (error) {
                            if (request === talentProfileRequest.current) setSelectedTalent(null)
                            toast.error(error.message || 'Could not load this profile.')
                          }
                        }}
                        style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setDirectOpportunityTalent(p)}
                        style={{ padding: '8px 14px', fontSize: 13 }}
                      >
                        Send opportunity
                      </button>
                    </div>
                  </div>
                ))}
                {!isTalentLoading && !talentError && talentProfiles.length === 0 && (
                  <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                    No students match these filters. Try lowering the TrustScore threshold or broadening your search.
                  </div>
                )}
              </div>
              {talentSearchMeta.total > 0 && (
                <div className="responsive-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>
                  <span>Showing {((talentPage - 1) * (talentSearchMeta.pageSize || TALENT_PAGE_SIZE)) + 1}-{Math.min(talentPage * (talentSearchMeta.pageSize || TALENT_PAGE_SIZE), talentSearchMeta.total)} of {talentSearchMeta.total}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" title="Previous page" aria-label="Previous page" disabled={talentPage === 1 || isTalentLoading} onClick={() => setTalentPage(page => Math.max(1, page - 1))} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', cursor: talentPage === 1 ? 'not-allowed' : 'pointer', opacity: talentPage === 1 ? 0.45 : 1 }}>←</button>
                    <span>Page {talentPage} of {talentTotalPages}</span>
                    <button type="button" title="Next page" aria-label="Next page" disabled={talentPage >= talentTotalPages || isTalentLoading} onClick={() => setTalentPage(page => Math.min(talentTotalPages, page + 1))} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', cursor: talentPage >= talentTotalPages ? 'not-allowed' : 'pointer', opacity: talentPage >= talentTotalPages ? 0.45 : 1 }}>→</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'profile' && (
            <SetupBusinessProfile profile={businessProfile} onSave={handleSaveBusinessProfile} />
          )}

          {active === 'gig'       && (
            <GigManagement
              gigManagementState={gigManagementState}
              onSaveState={setGigManagementState}
              taskLibraryState={taskLibraryState}
              taskSubmissions={taskSubmissions}
              onReviewTaskSubmission={handleReviewTaskSubmission}
              onSendInterviewTask={handleSendInterviewTask}
              onOpenTaskCenter={() => selectSection('tasks')}
              onCreateGig={handleCreateCompanyGig}
              onUpdateGig={handleUpdateCompanyGig}
              onDeleteGig={handleDeleteCompanyGig}
            />
          )}
          {active === 'tasks' && (
            <TaskCenter
              taskLibraryState={taskLibraryState}
              onSaveState={handleSaveTaskLibrary}
              gigManagementState={gigManagementState}
              taskSubmissions={taskSubmissions}
              onSendInterviewTask={handleSendInterviewTask}
              onReviewTaskSubmission={handleReviewTaskSubmission}
            />
          )}
          {active === 'workspace' && (
            <ProjectWorkspace
              projectWorkspaceState={projectWorkspaceState}
              taskSubmissions={taskSubmissions}
              onReviewTaskSubmission={handleReviewTaskSubmission}
              onPayment={() => selectSection('payment')}
              onShareUpdate={handleShareWorkspaceUpdate}
              onSetMilestone={handleSetWorkspaceMilestone}
            />
          )}
          {active === 'payment'   && (
            <PaymentSection
              paymentState={paymentState}
              onRecordPayment={handleRecordPayment}
              onRefresh={() => setRefreshVersion(value => value + 1)}
            />
          )}

          </>}
        </main>
      </div>
      {selectedTalent && <PublicStudentProfile
        key={selectedTalent.id}
        profile={selectedTalent}
        loading={selectedTalent.loading}
        onClose={() => { talentProfileRequest.current += 1; setSelectedTalent(null) }}
        action={!selectedTalent.loading && <button onClick={() => {
          const profile = selectedTalent.opportunityProfile
          setSelectedTalent(null)
          setDirectOpportunityTalent(profile)
        }}>Send opportunity</button>}
      />}
      {showBusinessProfile && (
        <BusinessProfileModal profile={businessProfile} onClose={() => setShowBusinessProfile(false)} contactMethod={contactMethod} verificationMethod={verificationMethod} />
      )}
      {directOpportunityTalent && (
        <DirectOpportunityModal
          profile={directOpportunityTalent}
          gigs={gigManagementState.gigs}
          tasks={taskLibraryState.tasks}
          companyProfile={businessProfile}
          onClose={() => setDirectOpportunityTalent(null)}
          onSend={handleSendDirectOpportunity}
          onOpenTaskCenter={() => {
            setDirectOpportunityTalent(null)
            selectSection('tasks')
          }}
          onOpenGigManagement={() => {
            setDirectOpportunityTalent(null)
            selectSection('gig')
          }}
        />
      )}
    </div>
  )
}
