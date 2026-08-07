import { useRef, useState } from 'react'
import { useNetworkState } from './NetworkContext'
import demoIntroVideo from '../../assets/otherintroduction.mp4'

const DEMO_VIDEO_URL = demoIntroVideo

const ALL_REQUESTS = [
  { id: 1, name: 'Aryan Mehta', college: 'IIT Kharagpur', role: 'Full-Stack Developer', skills: ['React', 'Node.js'], streak: 15, skillsByLevel: { Pro: ['React'], Intermediate: ['Node.js'], Beginner: [] }, title: 'Need a React teammate for startup landing page', type: 'Web Project', slots: '2/4 filled', trustScore: 880, avatar: 'A', availability: 'Open for startup projects', githubLink: [], projects: [{ name: 'Startup Dashboard', desc: 'React + Node.js SaaS dashboard with auth and analytics.', link: 'https://github.com/topics/react', demoLink: 'https://github.com/topics/react', saved: true }] },
  { id: 2, name: 'Priya Sharma', college: 'NIT Trichy', role: 'Data Analyst', skills: ['Data Analysis', 'Python'], streak: 6, skillsByLevel: { Pro: ['Data Analysis'], Intermediate: ['Python'], Beginner: [] }, title: 'Looking for data analyst for college hackathon', type: 'Hackathon', slots: '3/5 filled', trustScore: 740, avatar: 'P', availability: 'Available on weekends', githubLink: [], projects: [{ name: 'Sales Forecast Model', desc: 'Python ML pipeline for retail demand forecasting.', link: 'https://github.com/topics/python', demoLink: 'https://github.com/topics/python', saved: true }] },
  { id: 3, name: 'Rohan Das', college: 'BITS Pilani', role: 'UI/UX Designer', skills: ['UI/UX Design', 'Figma'], streak: 11, skillsByLevel: { Pro: ['UI/UX Design'], Intermediate: ['Figma'], Beginner: [] }, title: 'UI/UX partner for social impact app case study', type: 'Case Study', slots: '1/3 filled', trustScore: 810, avatar: 'R', availability: 'Looking for design collabs', githubLink: [], projects: [{ name: 'NGO App Design', desc: 'End-to-end Figma prototype for a donation tracking app.', link: 'https://github.com/topics/figma', demoLink: 'https://github.com/topics/figma', saved: true }] },
  { id: 4, name: 'Sneha Iyer', college: 'VIT Vellore', role: 'Content Marketer', skills: ['Content Marketing', 'SEO'], streak: 4, skillsByLevel: { Pro: ['SEO'], Intermediate: ['Content Marketing'], Beginner: [] }, title: 'Content writer for open-source project docs', type: 'Open Source', slots: '0/2 filled', trustScore: 690, avatar: 'S', availability: 'Open for remote collabs', githubLink: [], projects: [{ name: 'SEO Blog Campaign', desc: 'Grew organic traffic 3x for a tech blog in 60 days.', link: 'https://github.com/topics/seo', demoLink: 'https://github.com/topics/seo', saved: true }] },
  { id: 5, name: 'Kabir Nair', college: 'IIIT Hyderabad', role: 'Backend Developer', skills: ['Python', 'REST APIs'], streak: 18, skillsByLevel: { Pro: ['Python', 'REST APIs'], Intermediate: [], Beginner: [] }, title: 'Backend dev for SaaS prototype', type: 'Web Project', slots: '1/3 filled', trustScore: 910, avatar: 'K', availability: 'Open for serious builds', githubLink: [], projects: [{ name: 'SaaS API Layer', desc: 'Multi-tenant REST API with rate limiting and JWT auth.', link: 'https://github.com/topics/nodejs-api', demoLink: 'https://github.com/topics/nodejs-api', saved: true }] },
  { id: 6, name: 'Tanvi Joshi', college: 'Pune University', role: 'Data Analyst', skills: ['SQL', 'Power BI'], streak: 5, skillsByLevel: { Pro: ['Power BI'], Intermediate: ['SQL'], Beginner: [] }, title: 'Analytics partner for market research project', type: 'Research', slots: '0/2 filled', trustScore: 770, avatar: 'T', availability: 'Weekday evenings', githubLink: [], projects: [{ name: 'Market Research Dashboard', desc: 'Power BI report on consumer segmentation across 5 cities.', link: 'https://github.com/topics/powerbi', demoLink: 'https://github.com/topics/powerbi', saved: true }] },
  { id: 7, name: 'Aditya Roy', college: 'DTU Delhi', role: 'Frontend Developer', skills: ['React', 'Figma'], streak: 9, skillsByLevel: { Pro: ['React'], Intermediate: ['Figma'], Beginner: [] }, title: 'Full-stack teammate for college startup pitch', type: 'Startup', slots: '2/5 filled', trustScore: 830, avatar: 'A', availability: 'Building a startup', githubLink: [], projects: [{ name: 'Startup Pitch Deck App', desc: 'Interactive React app with animated pitch slides.', link: 'https://github.com/topics/react', demoLink: 'https://github.com/topics/react', saved: true }] },
  { id: 8, name: 'Meera Pillai', college: 'NSIT Delhi', role: 'Backend Developer', skills: ['Node.js', 'PostgreSQL'], streak: 7, skillsByLevel: { Pro: ['Node.js'], Intermediate: ['PostgreSQL'], Beginner: [] }, title: 'Backend partner for fintech hackathon', type: 'Hackathon', slots: '1/4 filled', trustScore: 790, avatar: 'M', availability: 'Open for hackathons', githubLink: [], projects: [{ name: 'Fintech Transaction API', desc: 'Node.js + PostgreSQL ledger API with double-entry accounting.', link: 'https://github.com/topics/fintech', demoLink: 'https://github.com/topics/fintech', saved: true }] },
]

const MY_REQUESTS_INIT = [
  { id: 101, title: 'React + Firebase web app for NGO', type: 'Web Project', slots: 2, filled: 0, skills: ['React', 'Firebase'], status: 'open' },
  { id: 102, title: 'ML model for crop yield prediction', type: 'Research', slots: 3, filled: 1, skills: ['Python', 'Data Analysis'], status: 'open' },
]

const INCOMING_INIT = [
  { id: 201, name: 'Vikram Singh', college: 'MNIT Jaipur', role: 'Full-Stack Developer', skills: ['React', 'Node.js'], streak: 13, skillsByLevel: { Pro: ['React', 'Node.js'], Intermediate: [], Beginner: [] }, trustScore: 850, avatar: 'V', message: 'Hey! I saw your NGO app post — I can contribute React components.', requestId: 101, availability: 'Open for projects', githubLink: [], projects: [{ name: 'NGO React App', desc: 'React + Firebase volunteer management app.', link: 'https://github.com/topics/react', demoLink: 'https://github.com/topics/react', saved: true }] },
  { id: 202, name: 'Divya Nair', college: 'Amrita University', role: 'Data Scientist', skills: ['Python', 'SQL'], streak: 5, skillsByLevel: { Pro: ['Python'], Intermediate: ['SQL'], Beginner: [] }, trustScore: 720, avatar: 'D', message: 'I have experience in crop data and ML pipelines, would love to join.', requestId: 102, availability: 'Looking for research collabs', githubLink: [], projects: [{ name: 'Crop Yield Predictor', desc: 'Scikit-learn regression model with weather and soil features.', link: 'https://github.com/topics/machine-learning', demoLink: 'https://github.com/topics/machine-learning', saved: true }] },
]

const ACCEPTED_INIT = [
  { id: 301, name: 'Siddharth Rao', college: 'IIT Bombay', role: 'Backend Developer', skills: ['Firebase', 'Node.js'], streak: 20, skillsByLevel: { Pro: ['Node.js', 'Firebase'], Intermediate: [], Beginner: [] }, trustScore: 930, avatar: 'S', projectTitle: 'React + Firebase web app for NGO', availability: 'Active collaborator', githubLink: [], projects: [{ name: 'Firebase Auth Service', desc: 'Serverless auth + Firestore integration for NGO platform.', link: 'https://github.com/topics/firebase', demoLink: 'https://github.com/topics/firebase', saved: true }] },
]

const TYPE_COLORS = {
  'Web Project': ['#DBEAFE', '#1D4ED8'],
  'Hackathon': ['#FEF3C7', '#92400E'],
  'Case Study': ['#F3E8FF', '#7C3AED'],
  'Open Source': ['#D1FAE5', '#065F46'],
  'Research': ['#E0E7FF', '#3730A3'],
  'Startup': ['#FEE2E2', '#991B1B'],
}

const avatarBg = ['#6366F1', '#0891B2', '#D946EF', '#10B981', '#F59E0B', '#EF4444']
const getAvatarBg = (name) => avatarBg[name.charCodeAt(0) % avatarBg.length]

function Avatar({ name, avatar, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarBg(name),
      color: 'white', fontWeight: 800,
      fontSize: size * 0.38,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {avatar}
    </div>
  )
}

const LEVEL_META = {
  Pro: { bg: '#F3E8FF', color: '#7C3AED' },
  Intermediate: { bg: '#EFF6FF', color: '#1D4ED8' },
  Beginner: { bg: '#F0FDF4', color: '#15803D' },
}
function VerifiedTooltipBadge() {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ background: '#10B981', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 100, cursor: 'default' }}>
        ✓ Verified
      </span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: 'white', color: 'var(--dark)', fontSize: 12, fontWeight: 500,
          padding: '10px 14px', borderRadius: 10, whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)', zIndex: 30, pointerEvents: 'none',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 700, color: '#10B981', marginBottom: 6 }}>Identity Verified via</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>📧 College Email</span>
            <span>🪪 Aadhaar Card</span>
            <span>🔐 DigiLocker</span>
          </div>
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: 'white transparent transparent transparent' }} />
        </span>
      )}
    </span>
  )
}

function getSkillLevel(person, skill) {
  if (!person.skillsByLevel) return null
  for (const [level, arr] of Object.entries(person.skillsByLevel)) {
    if (arr.includes(skill)) return level
  }
  return null
}

function ProfileModal({ person, onClose }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [levelFilter, setLevelFilter] = useState('All')
  if (!person) return null

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

  const savedProjects = (person.projects || []).filter(p => p.saved)
  const levels = ['All', 'Pro', 'Intermediate', 'Beginner']
  const allSkills = person.skills || []
  const filteredSkills = levelFilter === 'All' ? allSkills : (person.skillsByLevel?.[levelFilter] ?? [])

  return (
    <div
      className="responsive-modal-shell"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="responsive-modal-card" style={{ background: 'var(--white)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="responsive-modal-header" style={{ background: 'linear-gradient(135deg, var(--dark), #1E1B4B)', borderRadius: '20px 20px 0 0', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: getAvatarBg(person.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 22, border: '3px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
              {person.avatar}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>{person.name}</span>
                <VerifiedTooltipBadge />
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
                  ⭐ {person.trustScore} <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>/ 1000</span>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>TrustScore™</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', width: 32, height: 32, borderRadius: '50%', border: 'none', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="responsive-modal-body" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Availability */}
          <div style={{ fontSize: 13, color: 'var(--muted)', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
            🟢 {person.availability}
          </div>

          {/* Skills */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Skills</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {levels.map(lv => {
                  const meta = lv === 'All' ? { bg: '#F1F5F9', color: '#475569' } : LEVEL_META[lv]
                  return (
                    <button key={lv} onClick={() => setLevelFilter(lv)} style={{
                      fontSize: 11, fontWeight: 700,
                      background: levelFilter === lv ? meta.color : meta.bg,
                      color: levelFilter === lv ? 'white' : meta.color,
                      padding: '3px 9px', borderRadius: 100, border: 'none', cursor: 'pointer',
                    }}>{lv}</button>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {filteredSkills.length === 0
                ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>No {levelFilter} skills</span>
                : filteredSkills.map(skill => {
                  const level = getSkillLevel(person, skill)
                  const lvMeta = level ? LEVEL_META[level] : null
                  return (
                    <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
                      {skill}
                      <span style={{ background: '#10B981', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 100 }}>✓</span>
                      {lvMeta && <span style={{ background: lvMeta.bg, color: lvMeta.color, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 100 }}>{level}</span>}
                      <span style={{ background: '#FFF7ED', color: '#EA580C', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                        {person.streak} d streak
                      </span>
                    </span>
                  )
                })
              }
            </div>
          </div>

          {/* Intro Video */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/7', maxWidth: 460 }}>
              <video ref={videoRef} src={DEMO_VIDEO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
            </div>
            <button onClick={togglePlay} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 7, background: isPlaying ? '#FEF2F2' : '#EF4444', color: isPlaying ? '#EF4444' : 'white', border: isPlaying ? '1.5px solid #FCA5A5' : '1.5px solid #DC2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {isPlaying ? '⏹ Stop' : '▶ Play'}
            </button>
          </div>

          {/* Projects */}
          {savedProjects.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Projects</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {savedProjects.map((project, i) => (
                  <div key={i} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--dark)', marginBottom: 4 }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{project.desc}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <a href={project.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>🔗 View</a>
                      <a href={project.demoLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>🧪 Demo</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const col = {
  background: 'var(--white)',
  borderRadius: 14,
  border: '1px solid var(--border)',
  padding: '18px 16px',
  height: 'calc(100vh - 320px)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
}

export default function NetworkTeamUp() {
  const { networkState, setNetworkState } = useNetworkState()
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newReq, setNewReq] = useState({ title: '', type: 'Web Project', slots: '2', skills: '' })
  const [typeFilter, setTypeFilter] = useState('all')
  const myRequests = networkState?.teamUp?.myRequests || MY_REQUESTS_INIT
  const incoming = networkState?.teamUp?.incoming || INCOMING_INIT
  const accepted = networkState?.teamUp?.accepted || ACCEPTED_INIT
  const sentRequests = networkState?.teamUp?.sentRequests || [
    { id: 3, status: 'accepted', name: 'Rohan Das', title: 'UI/UX partner for social impact app case study', type: 'Case Study' },
    { id: 4, status: 'declined', name: 'Sneha Iyer', title: 'Content writer for open-source project docs', type: 'Open Source' },
  ]

  const allTypes = ['all', ...Array.from(new Set(ALL_REQUESTS.map(r => r.type)))]

  const filteredAll = ALL_REQUESTS.filter(r => typeFilter === 'all' || r.type === typeFilter)

  const sentIds = sentRequests.map(r => r.id)
  const sendRequest = (req) => {
    setNetworkState(current => ({
      ...current,
      teamUp: {
        ...current.teamUp,
        sentRequests: [...current.teamUp.sentRequests, { id: req.id, status: 'pending', name: req.name, title: req.title, type: req.type }],
      },
    }))
  }

  const acceptIncoming = (req) => {
    setNetworkState(current => ({
      ...current,
      teamUp: {
        ...current.teamUp,
        accepted: [...current.teamUp.accepted, {
          id: Date.now(),
          name: req.name,
          skills: req.skills,
          trustScore: req.trustScore,
          avatar: req.avatar,
          projectTitle: current.teamUp.myRequests.find(r => r.id === req.requestId)?.title || 'Your project',
        }],
        incoming: current.teamUp.incoming.filter(item => item.id !== req.id),
      },
    }))
  }

  const declineIncoming = (id) => {
    setNetworkState(current => ({
      ...current,
      teamUp: {
        ...current.teamUp,
        incoming: current.teamUp.incoming.filter(request => request.id !== id),
      },
    }))
  }

  const addRequest = () => {
    const title = newReq.title.trim()
    if (!title) return
    setNetworkState(current => ({
      ...current,
      teamUp: {
        ...current.teamUp,
        myRequests: [...current.teamUp.myRequests, {
          id: Date.now(),
          title,
          type: newReq.type,
          slots: Number(newReq.slots) || 2,
          filled: 0,
          skills: newReq.skills.split(',').map(s => s.trim()).filter(Boolean),
          status: 'open',
        }],
      },
    }))
    setNewReq({ title: '', type: 'Web Project', slots: '2', skills: '' })
    setShowAdd(false)
  }

  const inputStyle = {
    padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)',
    background: 'var(--white)', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
        borderRadius: 14, padding: '18px 22px', marginBottom: 16, color: 'white',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 5 }}>
          Team Up
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          Find collaborators · Post your own team request
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            🚀 {ALL_REQUESTS.length} open requests
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            📬 {incoming.length} incoming requests
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            ✅ {accepted.length} teammates joined
          </span>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

        {/* Column 1 — All open team-up requests */}
        <div className="responsive-scroll-panel" style={col}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              🚀 Open Requests
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{filteredAll.length} shown</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Browse and send a join request to any open team.
          </div>

          {/* Type filters */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {allTypes.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                fontSize: 11, fontWeight: 700,
                background: typeFilter === t ? 'var(--primary)' : 'var(--bg)',
                color: typeFilter === t ? 'white' : 'var(--muted)',
                padding: '3px 9px', borderRadius: 100, border: 'none', cursor: 'pointer',
              }}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredAll.map(req => {
              const [tbg, tc] = TYPE_COLORS[req.type] || ['var(--bg)', 'var(--dark)']
              const sent = sentIds.includes(req.id)
              return (
                <div key={req.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 13px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <Avatar name={req.name} avatar={req.avatar} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 2, lineHeight: 1.4 }}>{req.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{req.name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: tbg, color: tc, padding: '2px 7px', borderRadius: 100 }}>{req.type}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--white)', color: 'var(--muted)', padding: '2px 7px', borderRadius: 100, border: '1px solid var(--border)' }}>
                      👥 {req.slots}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 100 }}>
                      ⭐ {req.trustScore}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                    {req.skills.map(s => (
                      <span key={s} style={{ fontSize: 10, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button
                      onClick={() => setSelectedProfile(req)}
                      style={{ background: 'var(--bg)', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => sendRequest(req)}
                      disabled={sent}
                      style={{
                        background: sent ? 'var(--bg)' : 'var(--primary)',
                        color: sent ? 'var(--muted)' : 'white',
                        border: sent ? '1px solid var(--border)' : 'none',
                        borderRadius: 8, padding: '6px 14px', fontSize: 12,
                        fontWeight: 700, cursor: sent ? 'default' : 'pointer',
                      }}
                    >
                      {sent ? '✓ Sent' : 'Send Request'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Column 2 — My team-up requests */}
        <div className="responsive-scroll-panel" style={col}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              📋 My Requests
            </div>
            <button
              onClick={() => setShowAdd(p => !p)}
              style={{
                background: 'var(--primary)', color: 'white', border: 'none',
                borderRadius: 8, padding: '5px 11px', fontSize: 11,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              {showAdd ? '✕ Close' : '+ New Request'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Your active team-up posts. Others can send you join requests.
          </div>

          {/* Add new request form */}
          {showAdd && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 14, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Team-Up Post</div>
              <input
                value={newReq.title}
                onChange={e => setNewReq(p => ({ ...p, title: e.target.value }))}
                placeholder="What are you building? (title)"
                style={inputStyle}
              />
              <div className="responsive-inline-form" style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                <select
                  value={newReq.type}
                  onChange={e => setNewReq(p => ({ ...p, type: e.target.value }))}
                  style={inputStyle}
                >
                  {Object.keys(TYPE_COLORS).map(t => <option key={t}>{t}</option>)}
                </select>
                <input
                  type="number" min="1" max="10"
                  value={newReq.slots}
                  onChange={e => setNewReq(p => ({ ...p, slots: e.target.value }))}
                  placeholder="Slots"
                  style={inputStyle}
                />
              </div>
              <input
                value={newReq.skills}
                onChange={e => setNewReq(p => ({ ...p, skills: e.target.value }))}
                placeholder="Skills needed (comma separated)"
                style={inputStyle}
              />
              <button
                onClick={addRequest}
                style={{
                  background: 'var(--dark)', color: 'white', border: 'none',
                  borderRadius: 8, padding: '8px', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                Post Request
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myRequests.map(req => {
              const [tbg, tc] = TYPE_COLORS[req.type] || ['var(--bg)', 'var(--dark)']
              const pendingCount = incoming.filter(r => r.requestId === req.id).length
              return (
                <div key={req.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 13px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.4, flex: 1 }}>{req.title}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: tbg, color: tc, padding: '2px 7px', borderRadius: 100, flexShrink: 0 }}>{req.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--white)', color: 'var(--muted)', padding: '2px 7px', borderRadius: 100, border: '1px solid var(--border)' }}>
                      👥 {req.filled}/{req.slots} filled
                    </span>
                    {pendingCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 100 }}>
                        📬 {pendingCount} pending
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, background: req.status === 'open' ? '#D1FAE5' : '#F3F4F6', color: req.status === 'open' ? '#065F46' : 'var(--muted)', padding: '2px 7px', borderRadius: 100 }}>
                      {req.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {req.skills.map(s => (
                      <span key={s} style={{ fontSize: 10, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )
            })}
            {myRequests.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted)', padding: '16px 0' }}>No posts yet. Create your first team-up request above.</div>
            )}
          </div>

          {/* Sent Requests status */}
          {sentRequests.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Requests I Sent
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sentRequests.map(sr => {
                  const [tbg, tc] = TYPE_COLORS[sr.type] || ['var(--bg)', 'var(--dark)']
                  const statusMeta =
                    sr.status === 'accepted' ? { label: '✓ Accepted', bg: '#D1FAE5', color: '#065F46' } :
                    sr.status === 'declined' ? { label: '✕ Declined', bg: '#FEE2E2', color: '#991B1B' } :
                    { label: '⏳ Pending', bg: '#FEF3C7', color: '#92400E' }
                  return (
                    <div key={sr.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${sr.status === 'accepted' ? '#BBF7D0' : sr.status === 'declined' ? '#FECACA' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.4, flex: 1 }}>{sr.title}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, background: statusMeta.bg, color: statusMeta.color, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, background: tbg, color: tc, padding: '2px 7px', borderRadius: 100 }}>{sr.type}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>by {sr.name}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Column 3 — Team-up log: accepted + incoming */}
        <div className="responsive-scroll-panel" style={col}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 4 }}>
            📣 Team-Up Log
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            Incoming join requests and teammates who have joined your projects.
          </div>

          {/* Incoming requests */}
          {incoming.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', background: '#FEF3C7', borderRadius: 8, padding: '5px 10px', marginBottom: 10, display: 'inline-block' }}>
                📬 {incoming.length} Incoming Request{incoming.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {incoming.map(req => (
                  <div key={req.id} style={{ background: '#FFFBEB', borderRadius: 10, padding: '12px 13px', border: '1px solid #FDE68A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                      <Avatar name={req.name} avatar={req.avatar} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{req.name}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 100 }}>
                        ⭐ {req.trustScore}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                      {req.skills.map(s => (
                        <span key={s} style={{ fontSize: 10, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>{s}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>
                      "{req.message}"
                    </div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button
                        onClick={() => setSelectedProfile(req)}
                        style={{ background: 'var(--bg)', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => acceptIncoming(req)}
                        style={{ background: '#065F46', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => declineIncoming(req.id)}
                        style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted teammates */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', background: '#D1FAE5', borderRadius: 8, padding: '5px 10px', marginBottom: 10, display: 'inline-block' }}>
              ✅ {accepted.length} Teammate{accepted.length !== 1 ? 's' : ''} Joined
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {accepted.map(member => (
                <div key={member.id} style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 13px', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                    <Avatar name={member.name} avatar={member.avatar} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>{member.name}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '2px 7px', borderRadius: 100, flexShrink: 0 }}>
                      ⭐ {member.trustScore}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                    {member.skills.map(s => (
                      <span key={s} style={{ fontSize: 10, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#065F46', fontWeight: 600, marginBottom: 8 }}>
                    📁 {member.projectTitle}
                  </div>
                  <button
                    onClick={() => setSelectedProfile(member)}
                    style={{ background: 'var(--white)', color: 'var(--primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    View Profile
                  </button>
                </div>
              ))}
              {accepted.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>No teammates accepted yet.</div>
              )}
            </div>
          </div>
        </div>

      </div>

      <ProfileModal person={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  )
}
