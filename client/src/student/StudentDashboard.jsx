import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, Flame, FolderPlus, Plus, RefreshCw, UsersRound, X } from 'lucide-react'
import StudentNav from './StudentNav'
import StudentSidebar from './StudentSidebar'
import DashboardSkeleton from '../ui/DashboardSkeleton'
import './StudentViewport.css'
import { TrustScoreCriteriaContent } from './TrustScoreCriteria'
import StudentTrustOverview from './TrustScoreOverview.jsx'
import { clearStudentSessionToken, deleteStudentAccount, fetchCurrentStudent, fetchSkillAssessments, fetchStudentActivityHeatmap, fetchStudentEarning, fetchStudentGigs, fetchStudentNetwork, fetchStudentProfileMedia, fetchStudentSkillHub, fetchStudentSkillRequests, fetchStudentTrustScore, getStudentSessionToken, logoutStudent, saveStudentProfile } from './studentApi'
import { clearAllStudentSectionCache, loadStudentSectionCache, readStudentSectionCache, writeStudentSectionCache } from './sectionCache'
import { isBundledStudentIntroVideoUrl, mergeStudentProfile } from './studentProfileDefaults'
import { toast } from '../ui/toast'
import { safeExternalUrl } from '../lib/safeExternalUrl'
import { ProfileLinkIcon } from '../lib/profileLinkIcon'

const NAV_ITEMS = [
  { key: 'gig',        icon: '💼', label: 'GIG Center' },
  { key: 'trustscore', icon: '⭐', label: 'TrustScore' },
  { key: 'skillhub',  icon: '🎯', label: 'Skill Hub' },
  { key: 'network',   icon: '🌐', label: 'Network' },
  { key: 'earning',   icon: '💰', label: 'Earning' },
  { key: 'profile',   icon: '👤', label: 'My Profile' },
]

const SECTION_LOADERS = {
  gig: () => import('./gig/GigCenter'),
  skillhub: () => import('./skillhub/SkillHub'),
  network: () => import('./network/Network'),
  earning: () => import('./earning/Earning'),
}
const GigCenter = lazy(SECTION_LOADERS.gig)
const SkillHub = lazy(SECTION_LOADERS.skillhub)
const Network = lazy(SECTION_LOADERS.network)
const Earning = lazy(SECTION_LOADERS.earning)

const MAX_PROFILE_PHOTO_SIZE = 600 * 1024
const MAX_INTRO_VIDEO_SIZE = 5 * 1024 * 1024
const STUDENT_ACTIVE_SECTION_KEY = 'skillbridge.student.activeSection'
const getProjectLink = project => safeExternalUrl(project?.link)
const getProjectDemoLink = project => safeExternalUrl(project?.demoLink)

function ProfilePicker({ value, options, onChange, width }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  return <div ref={pickerRef} style={{ position: 'relative', width, flexShrink: 0 }} onBlur={closeWhenFocusLeaves}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} style={{ width: '100%', minHeight: 38, padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--white)', color: 'var(--dark)', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>{value}<span style={{ float: 'right', color: 'var(--muted)' }}>v</span></button>
    {open && <div role="listbox" style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: 'calc(100% + 4px)', maxHeight: 210, overflowY: 'auto', padding: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--white)', boxShadow: '0 10px 24px rgba(15,23,42,.16)' }}>
      {options.map(([optionValue, label]) => <button key={optionValue} type="button" role="option" aria-selected={optionValue === value} onClick={() => { onChange(optionValue); setOpen(false) }} style={{ display: 'block', width: '100%', padding: '9px 10px', border: 0, borderRadius: 5, background: optionValue === value ? 'var(--primary-light)' : 'transparent', color: 'var(--dark)', textAlign: 'left', cursor: 'pointer' }}>{label}</button>)}
    </div>}
  </div>
}
const getPracticeStats = hub => {
  const streaks = hub?.skillHubState?.streaks || hub?.practiceStats || {}
  return {
    totalPracticeDays: Math.max(0, Number(streaks.totalPracticeDays) || 0),
    overallCurrent: Math.max(0, Number(streaks.overallCurrent ?? streaks.current) || 0),
  }
}
const getActivityDays = hub => {
  const saved = hub?.skillHubState?.activityDays || hub?.practiceStats?.activityDays
  if (Array.isArray(saved)) return saved
  const approved = new Set(['verify_completed', 'reverify_completed', 'upgrade_completed', 'retention_completed', 'challenge_completed'])
  const counts = new Map()
  for (const item of hub?.skillHubState?.skillLog || []) {
    if (!approved.has(item?.eventType) || !/^\d{4}-\d{2}-\d{2}$/.test(item?.earnedDay || '')) continue
    counts.set(item.earnedDay, (counts.get(item.earnedDay) || 0) + 1)
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, count]) => ({ date, count }))
}
const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
const mondayOffset = (year, month, day = 1) => (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7
const monthCells = (year, month) => [
  ...Array.from({ length: mondayOffset(year, month) }, () => null),
  ...Array.from({ length: daysInMonth(year, month) }, (_, index) => dateKey(year, month, index + 1)),
]

function indiaToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]))
  return { year: parts.year, month: parts.month - 1, day: parts.day, key: dateKey(parts.year, parts.month - 1, parts.day) }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

async function updateProfilePhoto(file, setAvatar) {
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.warning('Please choose an image file.', { title: 'Unsupported File' })
    return
  }

  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    toast.warning('Profile photos must be 600 KB or smaller.', { title: 'Image Too Large' })
    return
  }

  try {
    const imageUrl = await readFileAsDataUrl(file)
    setAvatar(imageUrl)
    toast.success('Your profile photo has been updated.', { title: 'Photo Added' })
  } catch {
    toast.error('The selected image could not be read. Please try another file.', { title: 'Upload Failed' })
  }
}

async function updateIntroVideo(file, setVideoUrl) {
  if (!file) return
  if (!['video/mp4', 'video/webm'].includes(file.type)) {
    toast.warning('Choose an MP4 or WEBM video.', { title: 'Unsupported Video' })
    return
  }
  if (file.size > MAX_INTRO_VIDEO_SIZE) {
    toast.warning('Intro videos must be 5 MB or smaller.', { title: 'Video Too Large' })
    return
  }
  try {
    setVideoUrl(await readFileAsDataUrl(file))
  } catch {
    toast.error('The selected video could not be read. Please try again.', { title: 'Upload Failed' })
  }
}

const registrationMethodDetails = {
  email: { icon: '📧', label: 'College Email' },
  phone: { icon: '📱', label: 'Phone Number' },
}

const identityMethodDetails = {
  aadhaar: { icon: '🪪', label: 'Aadhaar Card' },
  digilocker: { icon: '🔐', label: 'DigiLocker' },
}

function VerificationMethodRows({ contactMethod = 'email', verificationMethod = 'aadhaar' }) {
  const registration = registrationMethodDetails[contactMethod] || registrationMethodDetails.email
  const identity = identityMethodDetails[verificationMethod] || identityMethodDetails.aadhaar
  return <>
    <span>{registration.icon} Registered via {registration.label}</span>
    <span>{identity.icon} Identity verified via {identity.label}</span>
  </>
}

function VerifiedBadge({ contactMethod, verificationMethod }) {
  const [show, setShow] = useState(false)
  return (
    <span className="student-verified-badge" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button className="student-verification-button" type="button" aria-label="Show account verification" aria-expanded={show} onClick={() => setShow(current => !current)} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: 'white', fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
        padding: 0, border: 0,
      }}>✓</button>
      {show && (
        <span className="student-verification-popover" style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--dark)', color: 'white', fontSize: 11, fontWeight: 500,
          padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow)', zIndex: 10, pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Account verification</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <VerificationMethodRows contactMethod={contactMethod} verificationMethod={verificationMethod} />
          </div>
          <span className="student-verification-popover-arrow" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 4, borderStyle: 'solid', borderColor: 'var(--dark) transparent transparent transparent' }} />
        </span>
      )}
    </span>
  )
}

function ModalVerifiedBadge({ contactMethod, verificationMethod }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ background: '#10B981', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 100, cursor: 'default' }}>
        ✓ Verified
      </span>
      {show && (
        <span style={{
          position: 'absolute', top: '130%', left: '50%', transform: 'translateX(-50%)',
          background: 'white', color: 'var(--dark)', fontSize: 12, fontWeight: 500,
          padding: '8px 12px', borderRadius: 8, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 20, pointerEvents: 'none',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 700, color: '#10B981', marginBottom: 4 }}>Account verification</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <VerificationMethodRows contactMethod={contactMethod} verificationMethod={verificationMethod} />
          </div>
          <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: 'transparent transparent white transparent' }} />
        </span>
      )}
    </span>
  )
}

function ProfileSkills({ skills, records = [] }) {
  const [level, setLevel] = useState('All')
  // Skill Hub may include read-only showcase cards. Profiles must only ever
  // display skills saved on this student's account.
  const persistedRecords = records.filter(item => item?.demoData !== true)
  const profileSkills = skills.filter(name => !records.some(item => item?.demoData === true && item.name?.toLowerCase() === name.toLowerCase()))
  const visibleSkills = profileSkills.filter(name => {
    if (level === 'All') return true
    const skill = persistedRecords.find(item => item.name.toLowerCase() === name.toLowerCase())
    return skill?.verified && ['valid', 'due'].includes(skill.renewalStatus) && skill.stage === level
  })
  return <section className="profile-skills">
    <header className="profile-skills-heading">
      <h3>Skills</h3>
      <div className="profile-skill-filters" role="group" aria-label="Filter skills by level">
        {['All', 'Pro Mastery', 'Pro', 'Intermediate', 'Beginner'].map(value => <button
          key={value} type="button" data-level={value.toLowerCase()} aria-pressed={level === value}
          onClick={() => setLevel(value)}>{value}</button>)}
      </div>
    </header>
    <div className="profile-skill-list">
    {visibleSkills.map(name => {
      const skill = persistedRecords.find(item => item.name.toLowerCase() === name.toLowerCase())
      const verified = skill?.verified && ['valid', 'due'].includes(skill.renewalStatus)
      return <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: '100%', overflowWrap: 'anywhere',
        background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 10px', borderRadius: 6, fontSize: 13 }}>
        {name}
        {verified ? <><BadgeCheck size={16} aria-label="Verified skill" /><small>{skill.stage}</small>{skill.streak > 0 && <span className="profile-skill-streak" title={`${skill.streak} consecutive approved practice days`}><Flame size={13}/>{skill.streak}d</span>}</>
          : <small>{skill?.renewalStatus === 'expired' ? 'Expired' : 'Unverified'}</small>}
      </span>
    })}
    </div>
    {!visibleSkills.length && <p className="work-muted" role="status">{profileSkills.length ? `No actively verified ${level} skills.` : 'No skills added yet.'}</p>}
  </section>
}

function ProfileActivityHeatmap({ activityDays = [] }) {
  const today = useMemo(() => indiaToday(), [])
  const [token] = useState(getStudentSessionToken)
  const [view, setView] = useState('month')
  const [period, setPeriod] = useState({ year: today.year, month: today.month })
  const cacheSection = `profile-activity:${view}:${period.year}:${view === 'month' ? period.month + 1 : 'year'}`
  const [remoteHeatmap, setRemoteHeatmap] = useState(() => readStudentSectionCache(cacheSection, token))
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  const visibleActivity = remoteHeatmap?.days || activityDays
  const counts = useMemo(() => new Map(visibleActivity.map(item => [item.date, Math.max(0, Number(item.count) || 0)])), [visibleActivity])
  const cells = useMemo(() => {
    if (view === 'month') return monthCells(period.year, period.month)
    return Array.from({ length: 12 }, (_, month) => monthCells(period.year, month).filter(Boolean)).flat()
  }, [period, view])
  const visibleDates = cells.filter(Boolean)
  const activeDays = visibleDates.filter(key => (counts.get(key) || 0) > 0).length
  const approvedCount = visibleDates.reduce((total, key) => total + (counts.get(key) || 0), 0)
  const periodLabel = view === 'month'
    ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(period.year, period.month, 1)))
    : String(period.year)
  const atLatest = view === 'month' ? period.year === today.year && period.month === today.month : period.year === today.year

  useEffect(() => {
    let cancelled = false
    const section = `profile-activity:${view}:${period.year}:${view === 'month' ? period.month + 1 : 'year'}`
    const cached = readStudentSectionCache(section, token)
    if (cached && retry === 0) {
      setRemoteHeatmap(cached)
      setLoading(false)
      setLoadError('')
      return () => { cancelled = true }
    }
    setLoading(true)
    setLoadError('')
    setRemoteHeatmap(null)
    loadStudentSectionCache(section, token, () => fetchStudentActivityHeatmap(token, { view, year: period.year, month: period.month + 1 }).then(result => result.heatmap))
      .then(heatmap => { if (!cancelled) setRemoteHeatmap(heatmap) })
      .catch(error => { if (!cancelled) { setRemoteHeatmap(null); setLoadError(error.message || 'Could not load activity') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period.month, period.year, retry, token, view])

  function changePeriod(direction) {
    setPeriod(current => view === 'month'
      ? (() => { const date = new Date(Date.UTC(current.year, current.month + direction, 1)); return { year: date.getUTCFullYear(), month: date.getUTCMonth() } })()
      : { ...current, year: current.year + direction })
  }

  function changeView(next) {
    setView(next)
    setPeriod({ year: today.year, month: today.month })
  }

  function renderCell(key, index, showDay = false, style) {
    if (!key) return <span className="is-empty" aria-hidden="true" key={`empty-${index}`}/>
    const count = counts.get(key) || 0
    const future = key > today.key
    const level = future ? 0 : Math.min(4, count)
    const label = `${new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })}: ${count} approved ${count === 1 ? 'activity' : 'activities'}`
    return <span key={key} className={future ? 'is-future' : ''} data-level={level} title={label} aria-label={label} style={style}>{showDay ? Number(key.slice(-2)) : ''}</span>
  }

  return <section className="profile-activity" aria-labelledby="profile-activity-title">
    <header><div><span>Approved activity</span><h3 id="profile-activity-title">Contribution heatmap</h3></div><div className="profile-activity-modes" role="group" aria-label="Heatmap period"><button type="button" aria-pressed={view === 'month'} onClick={() => changeView('month')}>Monthly</button><button type="button" aria-pressed={view === 'year'} onClick={() => changeView('year')}>Yearly</button></div></header>
    <div className="profile-activity-period"><button type="button" title={`Previous ${view}`} aria-label={`Previous ${view}`} onClick={() => changePeriod(-1)}><ChevronLeft size={16}/></button><strong>{periodLabel}</strong><button type="button" title={`Next ${view}`} aria-label={`Next ${view}`} disabled={atLatest} onClick={() => changePeriod(1)}><ChevronRight size={16}/></button></div>
    <div className="profile-heatmap-scroll">
      {view === 'month' && <div className="profile-heatmap-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>}
      {view === 'month' && <div className="profile-heatmap-grid is-month">{cells.map((key, index) => renderCell(key, index, true))}</div>}
      {view === 'year' && <>
        <div className="profile-heatmap-months">{Array.from({ length: 12 }, (_, month) => {
          const dayIndex = (Date.UTC(period.year, month, 1) - Date.UTC(period.year, 0, 1)) / 86400000
          const column = Math.floor((mondayOffset(period.year, 0) + dayIndex) / 7) + 1
          return <span key={month} style={{ gridColumn: column }}>{new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(period.year, month, 1)))}</span>
        })}</div>
        <div className="profile-heatmap-grid is-year">{cells.map((key, index) => {
          const position = mondayOffset(period.year, 0) + index
          return renderCell(key, index, false, { gridColumn: Math.floor(position / 7) + 1, gridRow: (position % 7) + 1 })
        })}</div>
      </>}
    </div>
    <footer><span><strong>{remoteHeatmap?.activeDays ?? activeDays}</strong> active days</span><span><strong>{remoteHeatmap?.totalActivities ?? approvedCount}</strong> approved activities</span>{loading && <span role="status">Loading...</span>}{loadError && <button type="button" className="profile-heatmap-retry" title="Retry activity" aria-label="Retry activity" onClick={() => setRetry(value => value + 1)}><RefreshCw size={13}/></button>}<div className="profile-heatmap-legend"><small>Less</small>{[0,1,2,3,4].map(level => <i key={level} data-level={level}/>)}<small>More</small></div></footer>
  </section>
}

function ProfileViewModal({ onClose, name, trustScore, avatar, setAvatar, skills, skillHubSkills, about = '', collaborationFocus = [], workStyle = '', githubLink, projects, videoUrl, contactInfo, practiceStats, activityDays, contactMethod, verificationMethod, profileActivity }) {
  const videoRef = useRef(null)
  const closeButtonRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const activity = practiceStats || { totalPracticeDays: 0, overallCurrent: 0 }

  useEffect(() => {
    closeButtonRef.current?.focus()
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const toggle = async () => {
    if (!videoRef.current) return
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false) }
    else {
      try {
        await videoRef.current.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }
  }

  const savedProjects = projects.filter(p => p.saved)

  return (
    <div className="responsive-modal-shell student-profile-modal-shell" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="responsive-modal-card student-profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" style={{
        background: 'var(--white)', borderRadius: 20, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div className="responsive-modal-header student-profile-modal-header" style={{
          background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)',
          borderRadius: '20px 20px 0 0', padding: '24px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="student-profile-modal-avatar" style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 22,
              border: '3px solid rgba(255,255,255,0.2)',
            }}>
              {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span id="profile-dialog-title" style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>{name}</span>
                <ModalVerifiedBadge contactMethod={contactMethod} verificationMethod={verificationMethod} />
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
                  ⭐ {trustScore} <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>/ 1000</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>TrustScore™</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }} aria-label="Platform activity">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 6, background: 'rgba(96,165,250,.16)', color: '#bfdbfe', fontSize: 10, fontWeight: 700 }}><CalendarDays size={13}/>{activity.totalPracticeDays} practice days</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 6, background: 'rgba(251,146,60,.16)', color: '#fed7aa', fontSize: 10, fontWeight: 700 }}><Flame size={13}/>{activity.overallCurrent} trust streak</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 6, background: 'rgba(16,185,129,.16)', color: '#a7f3d0', fontSize: 10, fontWeight: 700 }}><BriefcaseBusiness size={13}/>{profileActivity.completedGigs ?? '...'} completed GIGs</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 7px', borderRadius: 6, background: 'rgba(168,85,247,.16)', color: '#e9d5ff', fontSize: 10, fontWeight: 700 }}><UsersRound size={13}/>{profileActivity.teamUps ?? '...'} team-ups</span>
              </div>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="Close profile" onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div className="responsive-modal-body student-profile-modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile Photo */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Profile Photo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, flexWrap: 'wrap' }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: avatar ? 'transparent' : 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 900, fontSize: 25,
                border: '3px solid white', boxShadow: '0 2px 10px rgba(15,23,42,0.12)',
              }}>
                {avatar
                  ? <img src={avatar} alt={`${name}'s profile`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : name[0].toUpperCase()
                }
              </div>
              <div style={{ flex: '1 1 190px' }}>
                <div style={{ color: 'var(--dark)', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  {avatar ? 'Change your profile photo' : 'Add a profile photo'}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>JPG, PNG, WEBP or GIF up to 600 KB.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'var(--primary)', color: 'white', padding: '7px 13px',
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>
                    📷 {avatar ? 'Change Photo' : 'Add Photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={async e => {
                        await updateProfilePhoto(e.target.files?.[0], setAvatar)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatar(null)
                        toast.info('Your profile photo has been removed.', { title: 'Photo Removed' })
                      }}
                      style={{
                        background: 'white', color: '#DC2626', padding: '7px 13px',
                        borderRadius: 8, border: '1px solid #FCA5A5', fontSize: 12,
                        fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <ProfileSkills skills={skills} records={skillHubSkills} />
          </div>

          {/* About & Collaboration */}
          <section aria-labelledby="profile-about-collaboration-title">
            <div id="profile-about-collaboration-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>About &amp; Collaboration</div>
            {about || collaborationFocus.length > 0 || workStyle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
                {about && <div><div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>ABOUT</div><p style={{ margin: 0, color: 'var(--dark)', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{about}</p></div>}
                {collaborationFocus.length > 0 && <div><div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, marginBottom: 7 }}>OPEN TO COLLABORATE ON</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{collaborationFocus.map(item => <span key={item} style={{ padding: '5px 8px', borderRadius: 999, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11, fontWeight: 700 }}>{item}</span>)}</div></div>}
                {workStyle && <div><div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>WORKING STYLE</div><p style={{ margin: 0, color: 'var(--dark)', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{workStyle}</p></div>}
              </div>
            ) : <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>No collaboration details added yet.</p>}
          </section>

          <ProfileActivityHeatmap activityDays={activityDays} />

          {/* Intro Video */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, overflow: 'hidden', position: 'relative', aspectRatio: '16/7', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {videoUrl ? (
                <video ref={videoRef} src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>No video uploaded</span>
              )}
            </div>
            {videoUrl && (
              <button type="button" onClick={toggle} style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 7,
                border: isPlaying ? '1.5px solid #FCA5A5' : '1.5px solid #DC2626',
                background: isPlaying ? '#FEF2F2' : '#EF4444',
                color: isPlaying ? '#EF4444' : 'white',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
                {isPlaying ? '⏹ Stop' : '▶ Play'}
              </button>
            )}
          </div>

          {/* GitHub */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>GitHub</div>
            {githubLink.filter(link => safeExternalUrl(link.url)).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {githubLink.filter(link => safeExternalUrl(link.url)).map((l, i) => (
                  <a key={i} href={safeExternalUrl(l.url)} target="_blank" rel="noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--dark)', color: 'white',
                    padding: '7px 16px', borderRadius: 7,
                    fontSize: 13, fontWeight: 700, textDecoration: 'none', width: 'fit-content',
                  }}><ProfileLinkIcon url={l.url} size={15} /> View Profile ↗</a>
                ))}
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>No links added</span>
            }
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Contact</div>
            {contactInfo.filter(item => item.saved).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contactInfo.filter(item => item.saved).map((item, index) => (
                  <div key={`${item.value}-${index}`} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>No contact details added</span>}
          </div>

          {/* Projects */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Projects</div>
            {savedProjects.length > 0 ? (
              <div className="responsive-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {savedProjects.map((p, i) => (
                  <div key={i} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', marginBottom: 6 }}>{p.name || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{p.desc}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {getProjectLink(p) && <a href={getProjectLink(p)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>View project</a>}
                      {getProjectDemoLink(p) && <a href={getProjectDemoLink(p)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>Open demo</a>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <span style={{ color: 'var(--muted)', fontSize: 13 }}>No projects saved yet</span>}
          </div>

        </div>
      </div>
    </div>
  )
}

function ProjectEditorModal({ project, isEditing, onChange, onSave, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement
    const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), input, textarea, a[href]')]
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    const focusFrame = window.requestAnimationFrame(() => dialog?.querySelector('input')?.focus())
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return createPortal(<div className="responsive-modal-shell project-editor-overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <form ref={dialogRef} className="responsive-modal-card project-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="project-editor-title" onSubmit={event => { event.preventDefault(); onSave() }}>
      <header className="responsive-modal-header project-editor-header">
        <div className="project-editor-title"><span><FolderPlus size={20}/></span><div><small>PROFILE PROJECT</small><h2 id="project-editor-title">{isEditing ? 'Edit project' : 'Add a project'}</h2></div></div>
        <button type="button" className="project-editor-close" onClick={onClose} aria-label="Close project editor"><X size={19}/></button>
      </header>
      <div className="responsive-modal-body project-editor-body">
        <label><span>Project name *</span><input value={project.name} onChange={event => onChange('name', event.target.value)} maxLength={160} placeholder="Project name" required /></label>
        <label><span>Description</span><textarea value={project.desc} onChange={event => onChange('desc', event.target.value)} maxLength={1200} rows={5} placeholder="Describe the problem, your contribution, and the outcome." /></label>
        <div className="project-editor-link-grid">
          <label><span>Project link</span><input type="url" value={project.link} onChange={event => onChange('link', event.target.value)} placeholder="https://github.com/..." /></label>
          <label><span>Live demo</span><input type="url" value={project.demoLink || ''} onChange={event => onChange('demoLink', event.target.value)} placeholder="https://..." /></label>
        </div>
      </div>
      <footer className="project-editor-footer"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary">{isEditing ? 'Save changes' : 'Add project'}</button></footer>
    </form>
  </div>, document.body)
}

function ProfileSection({ name, trustScore, avatar, setAvatar, about, setAbout, collaborationFocus, setCollaborationFocus, workStyle, setWorkStyle, skills, skillHubSkills, githubLink, setGithubLink, contactInfo, setContactInfo, projects, setProjects, videoUrl, setVideoUrl, onViewProfile, onPrefetchProfile, onDeleteAccount, saveState, contactMethod, verificationMethod }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [githubInput, setGithubInput] = useState({})
  const [contactInput, setContactInput] = useState({ label: 'Phone', value: '' })
  const [collaborationInput, setCollaborationInput] = useState('')
  const [projectEditor, setProjectEditor] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmationReady, setDeleteConfirmationReady] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const videoRef = useRef(null)
  const hasStarterVideo = isBundledStudentIntroVideoUrl(videoUrl)

  const togglePlay = async () => {
    if (!videoRef.current) return
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false) }
    else {
      try {
        await videoRef.current.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }
  }

  const saveProject = () => {
    const project = projectEditor?.project
    if (!project?.name.trim()) {
      toast.warning('Add a project name before saving.', { title: 'Project Name Required' })
      return
    }
    if ((project.link.trim() && !safeExternalUrl(project.link)) || (project.demoLink?.trim() && !safeExternalUrl(project.demoLink))) {
      toast.warning('Project links must use http:// or https://.', { title: 'Invalid Project Link' })
      return
    }
    const savedProject = { ...project, link: safeExternalUrl(project.link), demoLink: safeExternalUrl(project.demoLink), saved: true }
    setProjects(prev => projectEditor.index === null ? [...prev, savedProject] : prev.map((item, index) => index === projectEditor.index ? savedProject : item))
    setProjectEditor(null)
  }

  const editProject = index => setProjectEditor({ index, project: { ...projects[index] } })
  const addProject = () => setProjectEditor({ index: null, project: { name: '', desc: '', link: '', demoLink: '', saved: false } })
  const updateProjectDraft = (field, value) => setProjectEditor(current => ({ ...current, project: { ...current.project, [field]: value } }))
  const closeProjectEditor = useCallback(() => setProjectEditor(null), [])

  const addProfileLink = () => {
    const url = safeExternalUrl(githubInput.url)
    if (!url) {
      toast.warning('Enter a valid http:// or https:// profile URL.', { title: 'Invalid Profile Link' })
      return
    }
    if (githubLink.some(item => item.url === url)) {
      toast.info('This profile link is already saved.', { title: 'Duplicate Link' })
      return
    }
    setGithubLink(current => [...current, { icon: githubInput.icon || '🐙', url, saved: true }])
    setGithubInput({})
  }

  const addCollaborationFocus = () => {
    const value = collaborationInput.trim().slice(0, 60)
    if (!value) return
    if (collaborationFocus.some(item => item.toLowerCase() === value.toLowerCase())) {
      toast.info('This collaboration focus is already listed.', { title: 'Duplicate Focus' })
      return
    }
    if (collaborationFocus.length >= 10) {
      toast.warning('You can list up to 10 collaboration areas.', { title: 'Focus Limit' })
      return
    }
    setCollaborationFocus(current => [...current, value])
    setCollaborationInput('')
  }

  const card = { background: 'var(--white)', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--border)', marginBottom: 16 }
  const sectionTitle = { fontSize: 15, fontWeight: 700, color: 'var(--dark)', marginBottom: 14 }
  const dangerButton = { border: '1px solid #FCA5A5', borderRadius: 7, background: '#fff', color: '#DC2626', minHeight: 36, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
  const dangerInput = { width: '100%', minHeight: 38, padding: '8px 10px', border: '1px solid #FCA5A5', borderRadius: 7, background: '#fff', color: 'var(--dark)', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' }

  return (
    <div className="student-profile-editor">
      {/* 1. Profile Header */}
      <div className="responsive-hero student-profile-hero" style={{ ...card, background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div className="student-profile-identity" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
            title="Change profile picture">
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: avatar ? 'transparent' : 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 24,
              overflow: 'hidden', border: '3px solid rgba(255,255,255,0.25)',
            }}>
              {avatar
                ? <img src={avatar} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : name[0].toUpperCase()
              }
            </div>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--primary)', border: '2px solid #1E1B4B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11,
            }}>📷</div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
              onChange={async e => {
                await updateProfilePhoto(e.target.files?.[0], setAvatar)
                e.target.value = ''
              }} />
          </label>
          <div className="student-profile-identity-copy">
            <div className="student-profile-name-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>{name}</span>
              <VerifiedBadge contactMethod={contactMethod} verificationMethod={verificationMethod} />
              <button
                onClick={onViewProfile}
                onFocus={onPrefetchProfile}
                onPointerEnter={onPrefetchProfile}
                className="student-profile-view-button"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 100,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              >
                View Profile
              </button>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Student · Profile Active{saveState !== 'idle' && <span style={{ marginLeft: 8, color: saveState === 'error' ? '#fca5a5' : '#a5b4fc' }}>· {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save failed'}</span>}</div>
          </div>
        </div>
        <div className="student-profile-score" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>TrustScore™</div>
          <div style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, #A5B4FC, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{trustScore}</div>
        </div>
      </div>

      {/* 2. Skills */}
      <div style={card}>
        <ProfileSkills skills={skills} records={skillHubSkills} />
      </div>

      {/* 3. About & collaboration */}
      <div style={card}>
        <div style={sectionTitle}>About & Collaboration</div>
        <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>About you</label>
        <textarea value={about} maxLength={700} rows={4} onChange={event => setAbout(event.target.value)} placeholder="Describe your strengths, the work you enjoy, and what teammates can expect from you."
          style={{ width: '100%', resize: 'vertical', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, font: 'inherit', fontSize: 13, lineHeight: 1.55, outline: 'none' }} />
        <div style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{about.length}/700</div>
        <div style={{ marginTop: 14 }}><label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Open to collaborate on</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 9 }}>{collaborationFocus.map(item => <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 999, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11, fontWeight: 700 }}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => setCollaborationFocus(current => current.filter(value => value !== item))} style={{ border: 0, background: 'transparent', color: 'inherit', padding: 0, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button></span>)}</div>
          <div className="responsive-stack student-profile-input-row" style={{ display: 'flex', gap: 8 }}><input value={collaborationInput} maxLength={60} onChange={event => setCollaborationInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCollaborationFocus() } }} placeholder="e.g. React product builds" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} /><button type="button" className="btn-primary" onClick={addCollaborationFocus} style={{ padding: '8px 16px', fontSize: 13 }}>+ Add</button></div>
        </div>
        <div style={{ marginTop: 14 }}><label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Working style</label><textarea value={workStyle} maxLength={300} rows={2} onChange={event => setWorkStyle(event.target.value)} placeholder="How do you prefer to plan, communicate, and deliver work?" style={{ width: '100%', resize: 'vertical', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, font: 'inherit', fontSize: 13, lineHeight: 1.55, outline: 'none' }} /><div style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{workStyle.length}/300</div></div>
      </div>

      {/* 4. Intro Video */}
      <div className="student-profile-intro-card" style={card}>
        <div className="student-profile-card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={sectionTitle}>Intro Video</div>
          <label style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {hasStarterVideo ? 'Add video' : videoUrl ? 'Replace' : 'Add video'}
            <input
              type="file"
              accept="video/mp4,video/webm"
              style={{ display: 'none' }}
              onChange={async e => {
                await updateIntroVideo(e.target.files?.[0], setVideoUrl)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <div className="student-profile-video-preview" style={{ background: videoUrl ? '#000' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/7', maxWidth: 460, display: 'grid', placeItems: 'center' }}>
          {videoUrl ? <video ref={videoRef} src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} /> :
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Add a short MP4 or WEBM introduction, up to 5 MB.</span>}
        </div>
        {videoUrl && <div className="responsive-stack student-profile-media-actions" style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button type="button" onClick={togglePlay} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 20px', borderRadius: 8,
            border: isPlaying ? '1.5px solid #FCA5A5' : '1.5px solid #DC2626',
            background: isPlaying ? '#FEF2F2' : '#EF4444',
            color: isPlaying ? '#EF4444' : 'white',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {isPlaying ? '⏹ Stop' : '▶ Play'}
          </button>
          {!hasStarterVideo && <button type="button" className="btn-secondary" onClick={() => { setVideoUrl(null); setIsPlaying(false) }}>Remove video</button>}
        </div>}
      </div>

      {/* 4. Profile Links */}
      <div className="student-profile-links-card" style={card}>
        <div className="student-profile-card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={sectionTitle}>Profile Links</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {githubLink.filter(l => l.saved).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ display: 'inline-flex', color: 'var(--primary)' }}><ProfileLinkIcon url={l.url} size={16} /></span>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</a>
              <button onClick={() => setGithubLink(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
          <div className="responsive-stack student-profile-input-row" style={{ display: 'flex', gap: 8 }}>
            <ProfilePicker value={`${githubInput.icon || '🐙'} ${[['🐙','GitHub'],['💼','LinkedIn'],['🌐','Portfolio'],['🐦','Twitter/X'],['📺','YouTube'],['🎨','Dribbble']].find(([ic]) => ic === (githubInput.icon || '🐙'))?.[1] || 'GitHub'}`} options={[['🐙','🐙 GitHub'],['💼','💼 LinkedIn'],['🌐','🌐 Portfolio'],['🐦','🐦 Twitter/X'],['📺','📺 YouTube'],['🎨','🎨 Dribbble']]} onChange={icon => setGithubInput(p => ({ ...p, icon }))} width={145} />
            <input placeholder="Paste your profile URL"
              value={githubInput.url || ''}
              onChange={e => setGithubInput(p => ({ ...p, url: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProfileLink() } }}
              style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <button type="button" onClick={addProfileLink}
              className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>+ Add</button>
          </div>
        </div>
      </div>

      {/* 5. Contact */}
      <div className="student-profile-contact-card" style={card}>
        <div className="student-profile-card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={sectionTitle}>Contact</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contactInfo.filter(item => item.saved).map((item, i) => (
            <div key={`${item.value}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', minWidth: 72 }}>{item.label}</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--dark)', fontWeight: 600 }}>{item.value}</span>
              <button
                onClick={() => setContactInfo(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))}
          <div className="responsive-stack student-profile-input-row" style={{ display: 'flex', gap: 8 }}>
            <ProfilePicker value={contactInput.label} options={['Phone', 'Email', 'WhatsApp', 'LinkedIn'].map(option => [option, option])} onChange={label => setContactInput(prev => ({ ...prev, label }))} width={145} />
            <input
              placeholder="Add contact detail"
              value={contactInput.value}
              onChange={e => setContactInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter' && contactInput.value.trim()) {
                  setContactInfo(prev => [...prev, { label: contactInput.label, value: contactInput.value.trim(), saved: true }])
                  setContactInput({ label: 'Phone', value: '' })
                }
              }}
              style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => {
                if (contactInput.value.trim()) {
                  setContactInfo(prev => [...prev, { label: contactInput.label, value: contactInput.value.trim(), saved: true }])
                  setContactInput({ label: 'Phone', value: '' })
                }
              }}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* 6. Projects */}
      <div className="student-profile-project-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>Projects</div>
        <button type="button" onClick={addProject}
          className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}><Plus size={15}/>Add Project</button>
      </div>
      <div className="responsive-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {projects.filter(proj => proj.saved).map((proj) => {
          const i = projects.indexOf(proj)
          return (
          <div key={i} style={{ background: 'var(--white)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{proj.name || 'Untitled'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{proj.desc || 'No description'}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {getProjectLink(proj) && <a href={getProjectLink(proj)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>View project</a>}
              {getProjectDemoLink(proj) && <a href={getProjectDemoLink(proj)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>Open demo</a>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => editProject(i)} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
              <button type="button" aria-label={`Remove ${proj.name}`} onClick={() => setProjects(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}><X size={14}/></button>
            </div>
          </div>
        )})}
      </div>
      {projectEditor && <ProjectEditorModal project={projectEditor.project} isEditing={projectEditor.index !== null} onChange={updateProjectDraft} onSave={saveProject} onClose={closeProjectEditor} />}
      <section style={{ marginTop: 26, padding: '18px 20px', border: '1px solid #FECACA', borderRadius: 12, background: '#FFF7F7' }}>
        <h3 style={{ margin: 0, color: '#991B1B', fontSize: 15 }}>Delete account</h3>
        <p style={{ margin: '7px 0 14px', color: '#7F1D1D', fontSize: 12 }}>This permanently deletes your profile, assessments, projects, applications, network records, team-up participation, and external-payment records. This cannot be undone.</p>
        {!deleteOpen ? <button type="button" style={dangerButton} onClick={() => setDeleteOpen(true)}>Delete my account</button> : <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}><label style={{ display: 'grid', gap: 5, color: '#7F1D1D', fontSize: 12, fontWeight: 700 }}>Type DELETE to confirm<input name="delete-account-confirmation" value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} autoComplete="one-time-code" readOnly={!deleteConfirmationReady} onFocus={() => setDeleteConfirmationReady(true)} style={dangerInput} /></label><label style={{ display: 'grid', gap: 5, color: '#7F1D1D', fontSize: 12, fontWeight: 700 }}>Current password<input name="delete-account-password" type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} autoComplete="current-password" style={dangerInput} /></label><div style={{ display: 'flex', gap: 8 }}><button type="button" className="btn-secondary" disabled={deleting} onClick={() => { setDeleteOpen(false); setDeleteConfirmationReady(false); setDeleteConfirmation(''); setDeletePassword('') }}>Cancel</button><button type="button" style={{ ...dangerButton, background: deleting || deleteConfirmation !== 'DELETE' || !deletePassword ? '#FEE2E2' : '#DC2626', color: deleting || deleteConfirmation !== 'DELETE' || !deletePassword ? '#B91C1C' : '#fff', borderColor: '#DC2626', cursor: deleting || deleteConfirmation !== 'DELETE' || !deletePassword ? 'not-allowed' : 'pointer' }} disabled={deleting || deleteConfirmation !== 'DELETE' || !deletePassword} onClick={async () => { setDeleting(true); try { await onDeleteAccount({ confirmation: deleteConfirmation, password: deletePassword }) } catch (error) { toast.error(error.message || 'Could not delete your account.', { title: 'Account Deletion Failed' }); setDeleting(false) } }}>{deleting ? 'Deleting...' : 'Permanently delete account'}</button></div></div>}
      </section>
    </div>
  )
}

function TrustScoreSection({ trustScore }) {
  const [trustScoreData, setTrustScoreData] = useState(() => readStudentSectionCache('trustscore', getStudentSessionToken()))
  const [isLoadingScore, setIsLoadingScore] = useState(() => !readStudentSectionCache('trustscore', getStudentSessionToken()))
  const [showCriteria, setShowCriteria] = useState(false)
  const [scoreError, setScoreError] = useState('')
  const [retry, setRetry] = useState(0)
  const criteriaDialogRef = useRef(null)
  const criteriaCloseRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    const token = getStudentSessionToken()
    const cached = readStudentSectionCache('trustscore', token)
    if (cached && retry === 0) {
      setTrustScoreData(cached)
      setIsLoadingScore(false)
      return () => { cancelled = true }
    }
    setIsLoadingScore(true)
    setScoreError('')
    loadStudentSectionCache('trustscore', token, () => fetchStudentTrustScore(token).then(result => result.trustScore)).then(result => {
      if (!cancelled) setTrustScoreData(result)
    }).catch(error => { if (!cancelled) setScoreError(error.message || 'Could not load TrustScore.') })
      .finally(() => { if (!cancelled) setIsLoadingScore(false) })
    return () => { cancelled = true }
  }, [retry, trustScore])
  useEffect(() => {
    if (!showCriteria) return undefined

    const previouslyFocused = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowCriteria(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(criteriaDialogRef.current?.querySelectorAll(focusableSelector) || [])
      if (!focusable.length) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    criteriaCloseRef.current?.focus()
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [showCriteria])
  const factors = trustScoreData?.factors || []
  const activity = trustScoreData?.activity || []
  const earnedPoints = trustScoreData?.summary?.earnedPoints ?? factors.filter(f => f.earned && f.points > 0).reduce((a, f) => a + f.points, 0)
  const penalties = trustScoreData?.summary?.penalties ?? factors.filter(f => f.earned && f.points < 0).reduce((a, f) => a + f.points, 0)
  const displayedTrustScore = trustScoreData?.trustScore ?? trustScore
  // Static showcase rows explain the workflow but never count as evidence for
  // the signed-in student's actual reputation summary.
  const positiveEvents = activity.filter(item => !item.demoData && item.points > 0)
  const approvedActions = trustScoreData?.summary?.approvedActions ?? positiveEvents.length
  const formatActivityDate = value => {
    const date = value ? new Date(value) : null
    return date && Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
      : 'Recorded recently'
  }

  if (isLoadingScore) return <DashboardSkeleton section="trustscore" />
  if (scoreError) return <div role="alert" className="work-error">{scoreError}<button className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry</button></div>
  return (
    <div className="trustscore-workspace">
      {showCriteria && (
        <div
          className="responsive-modal-shell trustscore-criteria-shell"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={e => e.target === e.currentTarget && setShowCriteria(false)}
        >
          <div ref={criteriaDialogRef} className="responsive-modal-card trustscore-criteria-dialog" role="dialog" aria-modal="true" aria-label="TrustScore criteria" style={{
            position: 'relative', width: '100%', maxWidth: 1040, maxHeight: '90vh',
            overflowY: 'auto', background: 'var(--bg)', borderRadius: 18,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: 20,
          }}>
            <button
              ref={criteriaCloseRef}
              type="button"
              aria-label="Close TrustScore criteria"
              onClick={() => setShowCriteria(false)}
              style={{
                position: 'sticky', top: 0, zIndex: 2, float: 'right',
                width: 36, height: 36, borderRadius: '50%', border: '1px solid #c7d2fe',
                background: '#eef2ff', color: '#3730a3',
                fontSize: 18, fontWeight: 700, cursor: 'pointer', margin: '10px 10px -46px 0',
              }}
            >
              ✕
            </button>
            <TrustScoreCriteriaContent />
          </div>
        </div>
      )}

      <StudentTrustOverview score={displayedTrustScore} policy={trustScoreData?.policy} earnedPoints={earnedPoints}
        penalties={penalties} approvedActions={approvedActions} activity={activity} factors={factors}
        demoActivity={trustScoreData?.demoActivity || []} demoPenalties={trustScoreData?.demoPenalties || []}
        onCriteria={() => setShowCriteria(true)} formatDate={formatActivityDate}/>
    </div>
  )
}

function ComingSoon({ icon, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ fontSize: 52 }}>{icon}</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>{label}</h2>
      <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>Coming Soon</span>
    </div>
  )
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { state, search } = useLocation()
  const initialStudentPayload = state?.student || state || {}
  const initialStudent = mergeStudentProfile(initialStudentPayload)
  const sectionFromUrl = new URLSearchParams(search).get('section')
  const storedSection = window.sessionStorage.getItem(STUDENT_ACTIVE_SECTION_KEY)
  const requestedSection = NAV_ITEMS.some(item => item.key === sectionFromUrl)
    ? sectionFromUrl
    : (NAV_ITEMS.some(item => item.key === state?.activeSection)
      ? state.activeSection
      : (NAV_ITEMS.some(item => item.key === storedSection) ? storedSection : 'gig'))
  const sessionTokenRef = useRef(getStudentSessionToken())
  const didHydrateRef = useRef(false)
  const persistedProfileRef = useRef(null)

  const [active, setActive] = useState(() => {
    return requestedSection
  })
  const [name, setName] = useState(initialStudent.name)
  const [trustScore, setTrustScore] = useState(initialStudent.trustScore)
  const [contactMethod, setContactMethod] = useState(initialStudent.contactMethod || 'email')
  const [verificationMethod, setVerificationMethod] = useState(initialStudent.verificationMethod || 'aadhaar')
  const [avatar, setAvatar] = useState(initialStudent.avatar)
  const [about, setAbout] = useState(initialStudent.about)
  const [collaborationFocus, setCollaborationFocus] = useState(initialStudent.collaborationFocus)
  const [workStyle, setWorkStyle] = useState(initialStudent.workStyle)
  const [skills, setSkills] = useState(initialStudent.skills)
  const [skillHubSkills, setSkillHubSkills] = useState([])
  const [practiceStats, setPracticeStats] = useState(() => getPracticeStats(initialStudent))
  const [activityDays, setActivityDays] = useState(() => getActivityDays(initialStudent))
  const [profileActivity, setProfileActivity] = useState({ completedGigs: null, teamUps: null })
  const handleSkillProfileChange = useCallback(hub => {
    const persistedSkills = (hub.skills || []).filter(skill => skill?.demoData !== true)
    setSkillHubSkills(persistedSkills)
    setSkills(persistedSkills.map(skill => skill.name))
    setTrustScore(hub.trustScore)
    setPracticeStats(getPracticeStats(hub))
    setActivityDays(getActivityDays(hub))
  }, [])
  const [githubLink, setGithubLink] = useState(initialStudent.githubLink)
  const [contactInfo, setContactInfo] = useState(initialStudent.contactInfo)
  const [projects, setProjects] = useState(initialStudent.projects)
  const [videoUrl, setVideoUrl] = useState(initialStudent.videoUrl)
  const [profileMediaLoaded, setProfileMediaLoaded] = useState(() => Object.prototype.hasOwnProperty.call(initialStudentPayload, 'videoUrl'))
  const [showProfile, setShowProfile] = useState(false)
  const [isLoadingStudent, setIsLoadingStudent] = useState(() => Boolean(getStudentSessionToken()))
  const [studentLoadError, setStudentLoadError] = useState('')
  const [profileSaveState, setProfileSaveState] = useState('idle')
  const [studentRetry, setStudentRetry] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const profileSaveQueueRef = useRef(Promise.resolve())
  const profileSaveVersionRef = useRef(0)

  const retryStudentWorkspace = useCallback(() => {
    // Read the token again before retrying so a sign-in in another tab or a
    // refreshed session can recover without requiring a full page reload.
    sessionTokenRef.current = getStudentSessionToken()
    setStudentLoadError('')
    setIsLoadingStudent(true)
    setStudentRetry(value => value + 1)
  }, [])

  const prefetchProfile = useCallback(() => {
    const token = sessionTokenRef.current || getStudentSessionToken()
    if (!token) return
    const today = indiaToday()
    const heatmapSection = `profile-activity:month:${today.year}:${today.month + 1}`
    loadStudentSectionCache('profile-media', token, () => fetchStudentProfileMedia(token)).catch(() => {})
    loadStudentSectionCache('gig', token, () => fetchStudentGigs(token).then(result => result.gigState)).catch(() => {})
    loadStudentSectionCache('network', token, () => fetchStudentNetwork(token).then(result => result.networkState)).catch(() => {})
    loadStudentSectionCache(heatmapSection, token, () => fetchStudentActivityHeatmap(token, { view: 'month', year: today.year, month: today.month + 1 }).then(result => result.heatmap)).catch(() => {})
  }, [])

  const openProfile = useCallback(() => {
    prefetchProfile()
    setShowProfile(true)
  }, [prefetchProfile])

  useEffect(() => {
    setActive(current => current === requestedSection ? current : requestedSection)
  }, [requestedSection])

  const selectSection = section => {
    if (!NAV_ITEMS.some(item => item.key === section)) return
    setActive(section)
    setSidebarOpen(false)
    window.sessionStorage.setItem(STUDENT_ACTIVE_SECTION_KEY, section)
    navigate(`/student/dashboard?section=${encodeURIComponent(section)}`)
  }

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = event => event.key === 'Escape' && setSidebarOpen(false)
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setSidebarOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [sidebarOpen])

  const prefetchSection = useCallback(section => {
    SECTION_LOADERS[section]?.()
    const token = getStudentSessionToken()
    if (section === 'profile') {
      prefetchProfile()
      return
    }
    if (section === 'network') {
      if (!token || readStudentSectionCache('network', token)) return
      loadStudentSectionCache('network', token, () => fetchStudentNetwork(token).then(result => result.networkState)).catch(() => {})
      return
    }
    if (section === 'earning') {
      if (!token || readStudentSectionCache('earning', token)) return
      loadStudentSectionCache('earning', token, () => fetchStudentEarning(token).then(result => result.earningState)).catch(() => {})
      return
    }
    if (section !== 'skillhub') return
    if (!token || readStudentSectionCache('skillhub', token)) return
    loadStudentSectionCache('skillhub', token, async () => {
      const [hub, history, requests] = await Promise.all([
        fetchStudentSkillHub(token, { includeSkillGap: false }),
        fetchSkillAssessments(token),
        fetchStudentSkillRequests(token),
      ])
      return {
        hub: hub.skillHub,
        assessments: history?.assessments || [],
        skillRequests: requests?.requests || [],
        hasSkillGapReport: false,
      }
    }).catch(() => {})
  }, [prefetchProfile])

  useEffect(() => {
    window.sessionStorage.setItem(STUDENT_ACTIVE_SECTION_KEY, active)
  }, [active])

  useEffect(() => {
    if (!showProfile) return undefined
    const token = getStudentSessionToken()
    if (!token) {
      setProfileActivity({ completedGigs: 0, teamUps: 0 })
      return undefined
    }

    let cancelled = false
    setProfileActivity({ completedGigs: null, teamUps: null })

    // Resolve each metric independently so a delayed network request cannot
    // prevent the completed-GIG count from appearing.
    loadStudentSectionCache('gig', token, () => fetchStudentGigs(token).then(result => result.gigState))
      .then(gigState => {
        if (cancelled) return
        // Showcase GIGs are available to explore, but never represent the
        // signed-in student's own completed work or reputation.
        const completedGigs = Array.isArray(gigState?.completedGigs)
          ? gigState.completedGigs.filter(gig => !gig?.demoData).length
          : 0
        setProfileActivity(current => ({ ...current, completedGigs }))
      })
      .catch(() => {
        if (!cancelled) setProfileActivity(current => ({ ...current, completedGigs: 0 }))
      })

    loadStudentSectionCache('network', token, () => fetchStudentNetwork(token).then(result => result.networkState))
      .then(networkState => {
        if (cancelled) return
        // This server value excludes showcase fixtures and only counts an
        // accepted collaboration, including historical accepted memberships.
        const teamUps = Math.max(0, Number(networkState?.achievementProgress?.teamUps) || 0)
        setProfileActivity(current => ({ ...current, teamUps }))
      })
      .catch(() => {
        if (!cancelled) setProfileActivity(current => ({ ...current, teamUps: 0 }))
      })

    return () => {
      cancelled = true
    }
  }, [showProfile])

  useEffect(() => {
    if (profileMediaLoaded || (active !== 'profile' && !showProfile)) return undefined
    const token = sessionTokenRef.current || getStudentSessionToken()
    if (!token) return undefined

    let cancelled = false
    loadStudentSectionCache('profile-media', token, () => fetchStudentProfileMedia(token))
      .then(media => {
        if (cancelled) return
        const nextVideoUrl = mergeStudentProfile({ videoUrl: media.videoUrl }).videoUrl
        persistedProfileRef.current = {
          ...persistedProfileRef.current,
          videoUrl: isBundledStudentIntroVideoUrl(nextVideoUrl) ? null : nextVideoUrl,
        }
        setVideoUrl(nextVideoUrl)
        setProfileMediaLoaded(true)
      })
      .catch(error => {
        if (!cancelled && error.status !== 401) {
          toast.error(error.message || 'Your intro video could not be loaded.', { title: 'Profile Media Unavailable' })
        }
      })

    return () => { cancelled = true }
  }, [active, profileMediaLoaded, showProfile])

  useEffect(() => {
    let cancelled = false

    async function loadStudent() {
      setIsLoadingStudent(true)
      setStudentLoadError('')
      const token = getStudentSessionToken()
      sessionTokenRef.current = token
      if (!token) {
        navigate('/student', { replace: true })
        return
      }

      try {
        const result = await fetchCurrentStudent(token)

        if (cancelled) return

        const student = mergeStudentProfile(result.student)
        setName(student.name)
        setTrustScore(student.trustScore)
        setContactMethod(student.contactMethod || 'email')
        setVerificationMethod(student.verificationMethod || 'aadhaar')
        setAvatar(student.avatar)
        setAbout(student.about)
        setCollaborationFocus(student.collaborationFocus)
        setWorkStyle(student.workStyle)
        setSkills(student.skills)
        setSkillHubSkills(result.student.skillHubSkills || [])
        setPracticeStats(getPracticeStats(result.student))
        setActivityDays(getActivityDays(result.student))
        setGithubLink(student.githubLink)
        setContactInfo(student.contactInfo)
        setProjects(student.projects)
        if (Object.prototype.hasOwnProperty.call(result.student, 'videoUrl')) {
          setVideoUrl(student.videoUrl)
          setProfileMediaLoaded(true)
        }
        persistedProfileRef.current = {
          name: student.name,
          avatar: student.avatar,
          about: student.about,
          collaborationFocus: student.collaborationFocus,
          workStyle: student.workStyle,
          githubLink: student.githubLink,
          contactInfo: student.contactInfo,
          projects: student.projects,
          ...(Object.prototype.hasOwnProperty.call(result.student, 'videoUrl')
            ? { videoUrl: isBundledStudentIntroVideoUrl(student.videoUrl) ? null : student.videoUrl }
            : {}),
        }
        didHydrateRef.current = true
        // TrustScore is the next-most common destination after the GIG Center.
        // Warm it after the initial workspace is usable, rather than making a
        // student wait for a second API round trip after clicking its sidebar item.
        loadStudentSectionCache('trustscore', token, () => fetchStudentTrustScore(token).then(score => score.trustScore))
          .catch(() => {})
      } catch (error) {
        if (!cancelled) {
          if (error.status === 401) {
            clearStudentSessionToken()
            sessionTokenRef.current = ''
            navigate('/student', { replace: true })
          } else setStudentLoadError(error.message || 'Could not load your workspace. Please retry.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStudent(false)
        }
      }
    }

    loadStudent()

    return () => {
      cancelled = true
    }
  }, [navigate, studentRetry])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }
    const version = ++profileSaveVersionRef.current
    const timeoutId = window.setTimeout(() => {
      const snapshot = {
        name,
        avatar,
        about,
        collaborationFocus,
        workStyle,
        githubLink,
        contactInfo,
        projects,
        ...(profileMediaLoaded ? { videoUrl: isBundledStudentIntroVideoUrl(videoUrl) ? null : videoUrl } : {}),
      }
      // Only changed fields are sent. Serialize writes so quick edits cannot
      // finish out of order while avoiding repeated avatar/video uploads.
      profileSaveQueueRef.current = profileSaveQueueRef.current
        .catch(() => {})
        .then(async () => {
          if (version !== profileSaveVersionRef.current) return
          // Recompute after older queued saves finish. This also preserves a
          // deliberate edit back to the original value while a save is active.
          const persisted = persistedProfileRef.current || {}
          const payload = Object.fromEntries(Object.entries(snapshot).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(persisted[key])))
          if (!Object.keys(payload).length) return
          setProfileSaveState('saving')
          try {
            const result = await saveStudentProfile(sessionTokenRef.current, payload)
            persistedProfileRef.current = { ...persistedProfileRef.current, ...payload }
            if (Object.prototype.hasOwnProperty.call(payload, 'videoUrl')) {
              writeStudentSectionCache('profile-media', sessionTokenRef.current, { videoUrl: payload.videoUrl })
            }
            if (version === profileSaveVersionRef.current) {
              if (Number.isFinite(result?.student?.trustScore)) setTrustScore(result.student.trustScore)
              setProfileSaveState('saved')
            }
          } catch (error) {
            if (version === profileSaveVersionRef.current) {
              setProfileSaveState('error')
              toast.error(error.message || 'Your profile changes could not be saved. Please try again.', { title: 'Profile Save Failed' })
            }
          }
        })
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [about, avatar, collaborationFocus, contactInfo, githubLink, name, profileMediaLoaded, projects, videoUrl, workStyle])

  const handleLogout = async () => {
    const token = sessionTokenRef.current

    clearStudentSessionToken()
    window.sessionStorage.removeItem(STUDENT_ACTIVE_SECTION_KEY)
    sessionTokenRef.current = ''

    if (token) {
      try {
        await logoutStudent(token)
      } catch (error) {
        // Ignore logout failures so the user can still exit cleanly.
      }
    }

    toast.info('You have been signed out.', { title: 'Student Session Closed' })
    navigate('/')
  }

  const handleDeleteAccount = async payload => {
    const token = sessionTokenRef.current
    if (!token) throw new Error('Your session has expired. Please sign in again.')
    // Prevent a queued profile autosave from racing with deletion.
    profileSaveVersionRef.current += 1
    await profileSaveQueueRef.current.catch(() => {})
    await deleteStudentAccount(token, payload)
    clearAllStudentSectionCache(token)
    clearStudentSessionToken()
    window.sessionStorage.removeItem(STUDENT_ACTIVE_SECTION_KEY)
    sessionTokenRef.current = ''
    toast.success('Your account and associated data have been deleted.')
    navigate('/student', { replace: true })
  }

  return (
    <div className="dashboard-shell student-dashboard" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

      {showProfile && (
          <ProfileViewModal
          onClose={() => setShowProfile(false)}
          name={name} trustScore={trustScore} avatar={avatar} setAvatar={setAvatar}
          skills={skills} skillHubSkills={skillHubSkills} githubLink={githubLink} contactInfo={contactInfo} projects={projects} videoUrl={videoUrl} practiceStats={practiceStats} activityDays={activityDays}
          about={about} collaborationFocus={collaborationFocus} workStyle={workStyle}
          profileActivity={profileActivity}
          contactMethod={contactMethod} verificationMethod={verificationMethod}
        />
      )}

      <header className="student-navigation-shell">
        <StudentNav
          avatar={avatar}
          name={name}
          trustScore={trustScore}
          practiceStats={practiceStats}
          onOpenProfile={openProfile}
          onPrefetchProfile={prefetchProfile}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
      </header>

      {/* Body */}
      <div className="dashboard-body" style={{ display: 'flex', flex: 1 }}>
        <div className={`dashboard-overlay${sidebarOpen ? ' is-open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <StudentSidebar
          navItems={NAV_ITEMS}
          active={active}
          onSelect={selectSection}
          onPrefetch={prefetchSection}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main key={active} className={`dashboard-main student-viewport student-section-${active}`} style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

          {studentLoadError ? <div role="alert" className="work-error"><span>{studentLoadError}</span><button type="button" className="btn-secondary" onClick={retryStudentWorkspace}>Retry</button></div> : <Suspense fallback={<DashboardSkeleton section={active} />}>
          {active === 'profile' && (
            isLoadingStudent ? <DashboardSkeleton section="profile" /> : <ProfileSection
              name={name} trustScore={trustScore}
              avatar={avatar} setAvatar={setAvatar}
              about={about} setAbout={setAbout}
              collaborationFocus={collaborationFocus} setCollaborationFocus={setCollaborationFocus}
              workStyle={workStyle} setWorkStyle={setWorkStyle}
              skills={skills} skillHubSkills={skillHubSkills}
              githubLink={githubLink} setGithubLink={setGithubLink}
              contactInfo={contactInfo} setContactInfo={setContactInfo}
              projects={projects} setProjects={setProjects}
              videoUrl={videoUrl} setVideoUrl={setVideoUrl}
              onViewProfile={openProfile}
              onPrefetchProfile={prefetchProfile}
              onDeleteAccount={handleDeleteAccount}
              saveState={profileSaveState}
              contactMethod={contactMethod} verificationMethod={verificationMethod}
            />
          )}

          {active === 'gig'        && <GigCenter />}
          {active === 'trustscore' && (isLoadingStudent ? <DashboardSkeleton section="trustscore" /> : <TrustScoreSection trustScore={trustScore} skills={skills} projects={projects} githubLink={githubLink} />)}
          {active === 'skillhub'  && <SkillHub onProfileChange={handleSkillProfileChange} />}
          {active === 'earning'   && <Earning />}
          {active === 'network'   && <Network />}
          </Suspense>}

        </main>
      </div>
    </div>
  )
}
