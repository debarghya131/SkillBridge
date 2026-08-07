import { useRef, useState } from 'react'
import { useNetworkState } from './NetworkContext'
import demoIntroVideo from '../../assets/otherintroduction.mp4'

const VERIFIED_SKILL_SET = new Set(['React', 'Node.js', 'UI/UX Design'])
const DEMO_VIDEO_URL = demoIntroVideo

const suggestedConnections = [
  {
    id: 1,
    name: 'Aman Verma',
    role: 'Frontend Developer',
    trustScore: 920,
    skills: ['React', 'UI/UX Design', 'Figma'],
    streak: 21,
    skillsByLevel: { Pro: ['React', 'UI/UX Design'], Intermediate: ['Figma'], Beginner: [] },
    college: 'NSUT Delhi',
    year: '3rd Year',
    availability: 'Open for startup projects',
    contactInfo: [
      { label: 'Email', value: 'aman.verma@skillbridge.demo' },
      { label: 'WhatsApp', value: '+91 98765 12001' },
    ],
    githubLink: [],
    projects: [
      { name: 'Creator Portfolio Studio', desc: 'Built a React portfolio builder with reusable page sections, theme switching, and export-ready layouts.', link: 'https://github.com/topics/react-portfolio', demoLink: 'https://github.com/topics/react-portfolio', saved: true },
      { name: 'Campus Event Landing Page', desc: 'Designed and shipped a polished promo site for a college fest with ticket CTA sections and motion cards.', link: 'https://github.com/topics/landing-page', demoLink: 'https://github.com/topics/landing-page', saved: true },
      { name: 'Design System Kit', desc: 'Created a component library with typography, buttons, cards, and tokens for student startup teams.', link: 'https://github.com/topics/design-system', demoLink: 'https://github.com/topics/design-system', saved: true },
    ],
  },
  {
    id: 2,
    name: 'Neha Singh',
    role: 'Data Analyst',
    trustScore: 880,
    skills: ['Python', 'Power BI', 'SQL'],
    streak: 14,
    skillsByLevel: { Pro: ['Power BI'], Intermediate: ['Python', 'SQL'], Beginner: [] },
    college: 'DTU',
    year: 'Final Year',
    availability: 'Available on weekends',
    contactInfo: [
      { label: 'Email', value: 'neha.singh@skillbridge.demo' },
      { label: 'LinkedIn', value: 'linkedin.com/in/neha-singh-data' },
    ],
    githubLink: [],
    projects: [
      { name: 'Retail Analytics Dashboard', desc: 'Built a Power BI dashboard to track category sales, customer repeat rate, and month-over-month revenue shifts.', link: 'https://github.com/topics/powerbi-dashboard', demoLink: 'https://github.com/topics/powerbi-dashboard', saved: true },
      { name: 'Placement Trends Report', desc: 'Used Python and SQL to analyze department-wise placement performance and visualize role demand trends.', link: 'https://github.com/topics/data-analysis', demoLink: 'https://github.com/topics/data-analysis', saved: true },
      { name: 'Customer Churn Study', desc: 'Created a churn prediction case study with feature analysis, segmentation, and action recommendations.', link: 'https://github.com/topics/customer-churn', demoLink: 'https://github.com/topics/customer-churn', saved: true },
    ],
  },
  {
    id: 3,
    name: 'Ravi Kumar',
    role: 'Backend Developer',
    trustScore: 900,
    skills: ['Node.js', 'APIs', 'MongoDB'],
    streak: 8,
    skillsByLevel: { Pro: ['Node.js'], Intermediate: ['APIs', 'MongoDB'], Beginner: [] },
    college: 'IIIT Lucknow',
    year: '3rd Year',
    availability: 'Looking for team-based builds',
    contactInfo: [
      { label: 'Email', value: 'ravi.kumar@skillbridge.demo' },
      { label: 'Phone', value: '+91 98765 12003' },
    ],
    githubLink: [],
    projects: [
      { name: 'Job Board API', desc: 'Developed a Node.js backend with JWT auth, recruiter role controls, and filtered opportunity feeds.', link: 'https://github.com/topics/nodejs-api', demoLink: 'https://github.com/topics/nodejs-api', saved: true },
      { name: 'Team Collaboration Server', desc: 'Created a backend for task updates, team rooms, and file metadata with MongoDB and socket events.', link: 'https://github.com/topics/collaboration-tool', demoLink: 'https://github.com/topics/collaboration-tool', saved: true },
      { name: 'Inventory Service Layer', desc: 'Built order, stock, and alert APIs with reusable service modules and admin-level access control.', link: 'https://github.com/topics/inventory-management-system', demoLink: 'https://github.com/topics/inventory-management-system', saved: true },
    ],
  },
  {
    id: 4,
    name: 'Sneha Iyer',
    role: 'Content Marketer',
    trustScore: 860,
    skills: ['Content Marketing', 'SEO', 'Canva'],
    streak: 10,
    skillsByLevel: { Pro: ['SEO'], Intermediate: ['Content Marketing'], Beginner: ['Canva'] },
    college: 'Christ University',
    year: 'Final Year',
    availability: 'Open for remote campaigns',
    contactInfo: [
      { label: 'Email', value: 'sneha.iyer@skillbridge.demo' },
      { label: 'LinkedIn', value: 'linkedin.com/in/sneha-iyer-growth' },
    ],
    githubLink: [],
    projects: [
      { name: 'Campus Fest Growth Campaign', desc: 'Planned a multi-platform content calendar, promo creatives, and launch copy for a college fest.', link: 'https://github.com/topics/content-marketing', demoLink: 'https://github.com/topics/content-marketing', saved: true },
      { name: 'Student Brand Playbook', desc: 'Created repeatable content templates, caption formulas, and visual hooks for student startups.', link: 'https://github.com/topics/social-media', demoLink: 'https://github.com/topics/social-media', saved: true },
      { name: 'SEO Content Sprint', desc: 'Improved content structure and keyword coverage for an early-stage product blog.', link: 'https://github.com/topics/seo', demoLink: 'https://github.com/topics/seo', saved: true },
    ],
  },
  {
    id: 5,
    name: 'Kabir Nair',
    role: 'Full Stack Developer',
    trustScore: 905,
    skills: ['React', 'Node.js', 'PostgreSQL'],
    streak: 17,
    skillsByLevel: { Pro: ['React', 'Node.js'], Intermediate: ['PostgreSQL'], Beginner: [] },
    college: 'IIIT Hyderabad',
    year: '3rd Year',
    availability: 'Looking for serious product builds',
    contactInfo: [
      { label: 'Email', value: 'kabir.nair@skillbridge.demo' },
      { label: 'Phone', value: '+91 98765 12005' },
    ],
    githubLink: [],
    projects: [
      { name: 'SaaS Billing Console', desc: 'Built a full-stack subscription dashboard with invoices, usage tracking, and role-based access.', link: 'https://github.com/topics/saas', demoLink: 'https://github.com/topics/saas', saved: true },
      { name: 'Mentor Match Platform', desc: 'Developed matching flows, booking APIs, and admin tools for a mentorship platform.', link: 'https://github.com/topics/full-stack', demoLink: 'https://github.com/topics/full-stack', saved: true },
      { name: 'Project Review Portal', desc: 'Created a review and feedback system for student portfolios with comments and scoring.', link: 'https://github.com/topics/react-dashboard', demoLink: 'https://github.com/topics/react-dashboard', saved: true },
    ],
  },
  {
    id: 6,
    name: 'Tanvi Joshi',
    role: 'Analytics Specialist',
    trustScore: 845,
    skills: ['SQL', 'Power BI', 'Excel/Sheets'],
    streak: 11,
    skillsByLevel: { Pro: ['Power BI'], Intermediate: ['SQL', 'Excel/Sheets'], Beginner: [] },
    college: 'Pune University',
    year: 'Final Year',
    availability: 'Available on weekday evenings',
    contactInfo: [
      { label: 'Email', value: 'tanvi.joshi@skillbridge.demo' },
      { label: 'WhatsApp', value: '+91 98765 12006' },
    ],
    githubLink: [],
    projects: [
      { name: 'Market Research Dashboard', desc: 'Designed a Power BI dashboard on customer segments, demand gaps, and city-level sales insights.', link: 'https://github.com/topics/powerbi', demoLink: 'https://github.com/topics/powerbi', saved: true },
      { name: 'Operations KPI Tracker', desc: 'Built a spreadsheet and SQL workflow to monitor fulfillment, delays, and monthly team targets.', link: 'https://github.com/topics/sql', demoLink: 'https://github.com/topics/sql', saved: true },
      { name: 'Placement Metrics Explorer', desc: 'Analyzed role demand, salary bands, and placement outcomes across departments.', link: 'https://github.com/topics/data-analysis', demoLink: 'https://github.com/topics/data-analysis', saved: true },
    ],
  },
]

const getProjectLink = (project, index) => project.link?.trim() || `https://github.com/topics/project-${index + 1}`
const getProjectDemoLink = (project, index) => project.demoLink?.trim() || getProjectLink(project, index)

function RequestButton({ kind, active, sentLabel, idleLabel, onClick, onCancel, fullWidth }) {
  const className = active ? 'btn-secondary' : kind === 'teamup' ? 'btn-secondary' : 'btn-primary'

  return (
    <button
      className={className}
      onClick={active ? onCancel : onClick}
      style={{
        width: fullWidth ? '100%' : 'auto',
        justifyContent: 'center',
        padding: '8px 12px',
        fontSize: 12,
        opacity: active ? 0.82 : 1,
        cursor: 'pointer',
      }}
    >
      {active ? `Cancel ${sentLabel}` : idleLabel}
    </button>
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
          position: 'absolute', top: '130%', left: '50%', transform: 'translateX(-50%)',
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
          <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: 5, borderStyle: 'solid', borderColor: 'transparent transparent white transparent' }} />
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

function ProfileModal({ person, connectSent, teamUpSent, onClose, onConnect, onCancelConnect, onTeamUp, onCancelTeamUp }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [levelFilter, setLevelFilter] = useState('All')

  if (!person) return null

  const verifiedSkills = person.skills.filter(skill => VERIFIED_SKILL_SET.has(skill))
  const savedProjects = person.projects.filter(project => project.saved)
  const levels = ['All', 'Pro', 'Intermediate', 'Beginner']
  const filteredSkills = levelFilter === 'All'
    ? (verifiedSkills.length > 0 ? verifiedSkills : person.skills)
    : (person.skillsByLevel?.[levelFilter] ?? [])

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
        zIndex: 1000,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="responsive-modal-card"
        style={{
          background: 'var(--white)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="responsive-modal-header" style={{
          background: 'linear-gradient(135deg, var(--dark) 0%, #1E1B4B 100%)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #A5B4FC, #60A5FA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 900,
              fontSize: 22,
              border: '3px solid rgba(255,255,255,0.2)',
            }}>
              {person.name[0].toUpperCase()}
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
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              width: 32,
              height: 32,
              borderRadius: '50%',
              fontSize: 16,
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
                    }}>{lv}</button>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {filteredSkills.length === 0
                ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>No {levelFilter} skills</span>
                : filteredSkills.map(skill => {
                  const level = getSkillLevel(person, skill)
                  const lvMeta = level ? LEVEL_META[level] : null
                  return (
                    <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
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

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Intro Video</div>
            <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/7', maxWidth: 460 }}>
              <video ref={videoRef} src={DEMO_VIDEO_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onEnded={() => setIsPlaying(false)} />
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
                background: isPlaying ? '#FEF2F2' : '#EF4444',
                color: isPlaying ? '#EF4444' : 'white',
                border: isPlaying ? '1.5px solid #FCA5A5' : '1.5px solid #DC2626',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play'}
            </button>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>GitHub</div>
            {person.githubLink.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {person.githubLink.map((link, index) => (
                  <a
                    key={`${link.url}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--dark)',
                      color: 'white',
                      padding: '7px 16px',
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                      width: 'fit-content',
                    }}
                  >
                    {link.icon || '🐙'} View Profile ↗
                  </a>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>No links added</span>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Contact</div>
            {person.contactInfo?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {person.contactInfo.map((item, index) => (
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
            {savedProjects.length > 0 ? (
              <div className="responsive-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {savedProjects.map((project, index) => (
                  <div key={`${project.name}-${index}`} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark)', marginBottom: 6 }}>{project.name || 'Untitled'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{project.desc}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <a href={getProjectLink(project, index)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>🔗 View</a>
                      <a href={getProjectDemoLink(project, index)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>🧪 Demo Link</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>No projects saved yet</span>
            )}
          </div>

          <div className="responsive-stack" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <RequestButton kind="connect" active={connectSent} sentLabel="Request" idleLabel="Send Connect Request" onClick={onConnect} onCancel={onCancelConnect} />
            <RequestButton kind="teamup" active={teamUpSent} sentLabel="Team-Up" idleLabel="Send Team-Up Request" onClick={onTeamUp} onCancel={onCancelTeamUp} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NetworkHome() {
  const { networkState, setNetworkState } = useNetworkState()
  const [selectedProfile, setSelectedProfile] = useState(null)
  const connectRequests = networkState?.home?.connectRequests || []
  const teamUpRequests = networkState?.home?.teamUpRequests || []

  const sendConnectRequest = id => {
    setNetworkState(current => ({
      ...current,
      home: {
        ...current.home,
        connectRequests: current.home.connectRequests.includes(id)
          ? current.home.connectRequests
          : [...current.home.connectRequests, id],
      },
    }))
  }

  const cancelConnectRequest = id => {
    setNetworkState(current => ({
      ...current,
      home: {
        ...current.home,
        connectRequests: current.home.connectRequests.filter(item => item !== id),
      },
    }))
  }

  const sendTeamUpRequest = id => {
    setNetworkState(current => ({
      ...current,
      home: {
        ...current.home,
        teamUpRequests: current.home.teamUpRequests.includes(id)
          ? current.home.teamUpRequests
          : [...current.home.teamUpRequests, id],
      },
    }))
  }

  const cancelTeamUpRequest = id => {
    setNetworkState(current => ({
      ...current,
      home: {
        ...current.home,
        teamUpRequests: current.home.teamUpRequests.filter(item => item !== id),
      },
    }))
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, var(--dark), #1E1B4B)', borderRadius: 14, padding: '18px 20px', marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          Network Highlights
        </div>
        <div style={{ fontSize: 18, color: 'white', fontWeight: 800, marginBottom: 4 }}>Build your peer network and collaborate faster</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Discover students with matching skills and strong TrustScore.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {suggestedConnections.map(person => {
          const connectSent = connectRequests.includes(person.id)
          const teamUpSent = teamUpRequests.includes(person.id)

          return (
            <div key={person.id} style={{ background: 'var(--white)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, color: 'var(--dark)', fontWeight: 800 }}>{person.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{person.role}</div>
                </div>
                <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 100, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {person.trustScore}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{person.availability}</div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {person.skills.map(skill => (
                  <span key={skill} style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                    {skill}
                  </span>
                ))}
              </div>

              <div className="responsive-form-grid-tight" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedProfile(person)}
                  style={{ justifyContent: 'center', padding: '8px 10px', fontSize: 12 }}
                >
                  View Profile
                </button>
                <RequestButton
                  kind="connect"
                  active={connectSent}
                  sentLabel="Request"
                  idleLabel="Connect"
                  onClick={() => sendConnectRequest(person.id)}
                  onCancel={() => cancelConnectRequest(person.id)}
                  fullWidth
                />
              </div>

              <RequestButton
                kind="teamup"
                active={teamUpSent}
                sentLabel="Team-Up"
                idleLabel="Send Team-Up"
                onClick={() => sendTeamUpRequest(person.id)}
                onCancel={() => cancelTeamUpRequest(person.id)}
                fullWidth
              />
            </div>
          )
        })}
      </div>

      <ProfileModal
        person={selectedProfile}
        connectSent={selectedProfile ? connectRequests.includes(selectedProfile.id) : false}
        teamUpSent={selectedProfile ? teamUpRequests.includes(selectedProfile.id) : false}
        onClose={() => setSelectedProfile(null)}
        onConnect={() => selectedProfile && sendConnectRequest(selectedProfile.id)}
        onCancelConnect={() => selectedProfile && cancelConnectRequest(selectedProfile.id)}
        onTeamUp={() => selectedProfile && sendTeamUpRequest(selectedProfile.id)}
        onCancelTeamUp={() => selectedProfile && cancelTeamUpRequest(selectedProfile.id)}
      />
    </div>
  )
}
