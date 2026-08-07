import { useRef, useState } from 'react'
import { useNetworkState } from './NetworkContext'
import demoIntroVideo from '../../assets/otherintroduction.mp4'

const VERIFIED_SKILL_SET = new Set(['React', 'Node.js', 'UI/UX Design'])
const DEMO_VIDEO_URL = demoIntroVideo

const myNetworkPeople = [
  {
    id: 1,
    name: 'Priya Das',
    role: 'Product Design',
    trustScore: 910,
    status: 'Connected',
    availability: 'Open for design sprints',
    contactInfo: [
      { label: 'Email', value: 'priya.das@skillbridge.demo' },
      { label: 'LinkedIn', value: 'linkedin.com/in/priya-das-design' },
    ],
    skills: ['UI/UX Design', 'Figma', 'React'],
    streak: 12,
    skillsByLevel: { Pro: ['UI/UX Design', 'Figma'], Intermediate: ['React'], Beginner: [] },
    githubLink: [],
    projects: [
      { name: 'Creator Brand Kit', desc: 'Designed a visual identity and landing page kit for student founders building creator tools.', link: 'https://github.com/topics/design-system', demoLink: 'https://github.com/topics/design-system', saved: true },
      { name: 'Mobile Travel Planner', desc: 'Built app flows, wireframes, and polished screens for a city exploration planner.', link: 'https://github.com/topics/mobile-ui', demoLink: 'https://github.com/topics/mobile-ui', saved: true },
    ],
  },
  {
    id: 2,
    name: 'Kunal Roy',
    role: 'Full Stack Development',
    trustScore: 890,
    status: 'Connected',
    availability: 'Available after 6 PM',
    contactInfo: [
      { label: 'Email', value: 'kunal.roy@skillbridge.demo' },
      { label: 'Phone', value: '+91 98765 22102' },
    ],
    skills: ['React', 'Node.js', 'MongoDB'],
    streak: 7,
    skillsByLevel: { Pro: ['React', 'Node.js'], Intermediate: ['MongoDB'], Beginner: [] },
    githubLink: [],
    projects: [
      { name: 'Freelance CRM Dashboard', desc: 'Built a dashboard for client tracking, invoices, and follow-up reminders.', link: 'https://github.com/topics/react-dashboard', demoLink: 'https://github.com/topics/react-dashboard', saved: true },
      { name: 'Mentor Booking Platform', desc: 'Created a booking and scheduling flow with auth, payments, and admin controls.', link: 'https://github.com/topics/booking-system', demoLink: 'https://github.com/topics/booking-system', saved: true },
    ],
  },
  {
    id: 3,
    name: 'Shreya N',
    role: 'Digital Marketing',
    trustScore: 760,
    status: 'Pending',
    availability: 'Looking for campaign collaborations',
    contactInfo: [
      { label: 'Email', value: 'shreya.n@skillbridge.demo' },
      { label: 'WhatsApp', value: '+91 98765 22103' },
    ],
    skills: ['SEO', 'Content Strategy', 'Canva'],
    streak: 3,
    skillsByLevel: { Pro: ['SEO'], Intermediate: ['Content Strategy'], Beginner: ['Canva'] },
    githubLink: [],
    projects: [
      { name: 'Startup Growth Campaign', desc: 'Planned a 30-day content calendar and social launch strategy for a student startup.', link: 'https://github.com/topics/marketing-campaign', demoLink: 'https://github.com/topics/marketing-campaign', saved: true },
      { name: 'Brand Voice Playbook', desc: 'Created voice, tone, and content templates for outreach and landing page copy.', link: 'https://github.com/topics/content-marketing', demoLink: 'https://github.com/topics/content-marketing', saved: true },
    ],
  },
  {
    id: 4,
    name: 'Ritika Sen',
    role: 'Frontend Developer',
    trustScore: 870,
    status: 'Connect Available',
    availability: 'Open for web product builds',
    contactInfo: [
      { label: 'Email', value: 'ritika.sen@skillbridge.demo' },
      { label: 'LinkedIn', value: 'linkedin.com/in/ritika-sen-react' },
    ],
    skills: ['React', 'UI/UX Design', 'Tailwind'],
    streak: 9,
    skillsByLevel: { Pro: ['React'], Intermediate: ['UI/UX Design', 'Tailwind'], Beginner: [] },
    githubLink: [],
    projects: [
      { name: 'Skill Swap Marketplace', desc: 'Built a frontend marketplace flow for peer-to-peer micro-learning exchanges.', link: 'https://github.com/topics/frontend', demoLink: 'https://github.com/topics/frontend', saved: true },
      { name: 'Hackathon Demo Site', desc: 'Shipped a responsive demo site with pricing, FAQ, and live showcase sections.', link: 'https://github.com/topics/landing-page', demoLink: 'https://github.com/topics/landing-page', saved: true },
    ],
  },
  {
    id: 5,
    name: 'Aditya Menon',
    role: 'Backend Developer',
    trustScore: 900,
    status: 'Connected',
    availability: 'Open for backend-heavy team builds',
    contactInfo: [
      { label: 'Email', value: 'aditya.menon@skillbridge.demo' },
      { label: 'Phone', value: '+91 98765 22105' },
    ],
    skills: ['Node.js', 'REST APIs', 'PostgreSQL'],
    streak: 16,
    skillsByLevel: { Pro: ['Node.js', 'REST APIs'], Intermediate: ['PostgreSQL'], Beginner: [] },
    githubLink: [],
    projects: [
      { name: 'Fintech Ledger API', desc: 'Built transaction, settlement, and account history APIs with secure role controls.', link: 'https://github.com/topics/fintech', demoLink: 'https://github.com/topics/fintech', saved: true },
      { name: 'Order Routing Service', desc: 'Created a service layer for vendor assignments, delivery updates, and exception handling.', link: 'https://github.com/topics/nodejs-api', demoLink: 'https://github.com/topics/nodejs-api', saved: true },
    ],
  },
  {
    id: 6,
    name: 'Meera Pillai',
    role: 'UI Designer',
    trustScore: 840,
    status: 'Pending',
    availability: 'Available for product design reviews',
    contactInfo: [
      { label: 'Email', value: 'meera.pillai@skillbridge.demo' },
      { label: 'LinkedIn', value: 'linkedin.com/in/meera-pillai-ui' },
    ],
    skills: ['UI/UX Design', 'Figma', 'Design Systems'],
    streak: 8,
    skillsByLevel: { Pro: ['UI/UX Design'], Intermediate: ['Figma', 'Design Systems'], Beginner: [] },
    githubLink: [],
    projects: [
      { name: 'Fintech App Prototype', desc: 'Designed onboarding, transaction, and insights screens for a student fintech product.', link: 'https://github.com/topics/figma', demoLink: 'https://github.com/topics/figma', saved: true },
      { name: 'Design Token Library', desc: 'Structured reusable spacing, type, and color tokens for fast UI consistency.', link: 'https://github.com/topics/design-system', demoLink: 'https://github.com/topics/design-system', saved: true },
    ],
  },
  {
    id: 7,
    name: 'Harsh Jain',
    role: 'Growth Marketer',
    trustScore: 795,
    status: 'Connect Available',
    availability: 'Open for launch and growth experiments',
    contactInfo: [
      { label: 'Email', value: 'harsh.jain@skillbridge.demo' },
      { label: 'WhatsApp', value: '+91 98765 22107' },
    ],
    skills: ['SEO', 'Content Strategy', 'Analytics'],
    streak: 5,
    skillsByLevel: { Pro: ['SEO'], Intermediate: ['Content Strategy', 'Analytics'], Beginner: [] },
    githubLink: [],
    projects: [
      { name: 'Startup Launch Funnel', desc: 'Mapped acquisition, content hooks, and landing page experiments for an early-stage product.', link: 'https://github.com/topics/marketing-campaign', demoLink: 'https://github.com/topics/marketing-campaign', saved: true },
      { name: 'Organic Growth Audit', desc: 'Reviewed search visibility, page structure, and content gaps across product pages.', link: 'https://github.com/topics/seo', demoLink: 'https://github.com/topics/seo', saved: true },
    ],
  },
]

const requestActivityInit = [
  {
    id: 101,
    type: 'incoming',
    name: 'Aditi Rao',
    role: 'Backend Developer',
    trustScore: 900,
    note: 'Sent you a connection request for a product collaboration.',
    when: '2 hours ago',
  },
  {
    id: 102,
    type: 'accepted',
    name: 'Kabir Jain',
    role: 'Data Analyst',
    trustScore: 840,
    note: 'Accepted your connection request.',
    when: 'Yesterday',
  },
  {
    id: 103,
    type: 'rejected',
    name: 'Meera Thomas',
    role: 'UI Designer',
    trustScore: 790,
    note: 'Declined your request for now.',
    when: '2 days ago',
  },
  {
    id: 104,
    type: 'incoming',
    name: 'Rohit Sharma',
    role: 'Python Developer',
    trustScore: 880,
    note: 'Wants to connect after seeing your recent work.',
    when: '3 days ago',
  },
]

const getProjectLink = (project, index) => project.link?.trim() || `https://github.com/topics/project-${index + 1}`
const getProjectDemoLink = (project, index) => project.demoLink?.trim() || getProjectLink(project, index)

function StatusPill({ status }) {
  const meta = status === 'Connected'
    ? { bg: '#D1FAE5', color: '#065F46' }
    : status === 'Pending'
      ? { bg: '#FEF3C7', color: '#92400E' }
      : { bg: '#E0E7FF', color: '#3730A3' }

  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 100, background: meta.bg, color: meta.color }}>
      {status}
    </span>
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

function ProfileModal({ person, onClose, onConnect, connectSent }) {
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
                ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>No {levelFilter} skills</span>
                : filteredSkills.map(skill => {
                  const level = getSkillLevel(person, skill)
                  const lvMeta = level ? LEVEL_META[level] : null
                  return (
                    <span key={skill} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                    }}>
                      {skill}
                      {verifiedSkills.includes(skill) && <span style={{ background: '#10B981', color: 'white', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 100 }}>✓</span>}
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
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>No links added</span>
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

          <button
            className={connectSent ? 'btn-secondary' : 'btn-primary'}
            onClick={onConnect}
            disabled={connectSent}
            style={{ width: 'fit-content', padding: '8px 14px', fontSize: 12, opacity: connectSent ? 0.72 : 1 }}
          >
            {connectSent ? 'Connection Requested' : 'Send Connection Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyNetwork() {
  const { networkState, setNetworkState } = useNetworkState()
  const [selectedProfile, setSelectedProfile] = useState(null)
  const people = networkState?.myNetwork?.people || myNetworkPeople
  const activity = networkState?.myNetwork?.activity || requestActivityInit
  const teamUpRequests = networkState?.myNetwork?.teamUpRequests || []

  const sendConnectionRequest = person => {
    if (person.status === 'Connected' || person.status === 'Pending') return

    setNetworkState(current => ({
      ...current,
      myNetwork: {
        ...current.myNetwork,
        people: current.myNetwork.people.map(item => (
          item.id === person.id ? { ...item, status: 'Pending' } : item
        )),
        activity: [
          {
            id: Date.now(),
            type: 'sent',
            name: person.name,
            role: person.role,
            trustScore: person.trustScore,
            note: 'You sent a connection request.',
            when: 'Just now',
          },
          ...current.myNetwork.activity,
        ],
      },
    }))
  }

  const sendTeamUpRequest = person => {
    if (teamUpRequests.includes(person.id)) return

    setNetworkState(current => ({
      ...current,
      myNetwork: {
        ...current.myNetwork,
        teamUpRequests: [...current.myNetwork.teamUpRequests, person.id],
        activity: [
          {
            id: Date.now(),
            type: 'sent',
            name: person.name,
            role: person.role,
            trustScore: person.trustScore,
            note: 'You sent a team-up request.',
            when: 'Just now',
          },
          ...current.myNetwork.activity,
        ],
      },
    }))
  }

  const removeConnection = personId => {
    const removedPerson = people.find(person => person.id === personId)
    if (selectedProfile?.id === personId) setSelectedProfile(null)

    if (removedPerson) {
      setNetworkState(current => ({
        ...current,
        myNetwork: {
          ...current.myNetwork,
          people: current.myNetwork.people.filter(person => person.id !== personId),
          activity: [
            {
              id: Date.now(),
              type: 'rejected',
              name: removedPerson.name,
              role: removedPerson.role,
              trustScore: removedPerson.trustScore,
              note: 'Removed from your network list.',
              when: 'Just now',
            },
            ...current.myNetwork.activity,
          ],
        },
      }))
    }
  }

  const acceptIncomingRequest = requestId => {
    const request = activity.find(item => item.id === requestId && item.type === 'incoming')
    if (!request) return

    setNetworkState(current => {
      const alreadyExists = current.myNetwork.people.some(person => person.name === request.name)

      return {
        ...current,
        myNetwork: {
          ...current.myNetwork,
          activity: current.myNetwork.activity.map(item => (
            item.id === requestId
              ? { ...item, type: 'accepted', note: 'You accepted this connection request.', when: 'Just now' }
              : item
          )),
          people: alreadyExists
            ? current.myNetwork.people.map(person => (
              person.name === request.name ? { ...person, status: 'Connected' } : person
            ))
            : [
              {
                id: Date.now() + 1,
                name: request.name,
                role: request.role,
                trustScore: request.trustScore,
                status: 'Connected',
                availability: 'Open to collaborate',
                skills: ['React', 'Node.js'],
                contactInfo: [
                  { label: 'Email', value: `${request.name.toLowerCase().replace(/\s+/g, '.')}@skillbridge.demo` },
                  { label: 'WhatsApp', value: '+91 90000 10001' },
                ],
                githubLink: [],
                projects: [
                  { name: 'Connection Portfolio', desc: 'Demo project preview for accepted network members.', link: 'https://github.com/topics/project', demoLink: 'https://github.com/topics/project', saved: true },
                ],
              },
              ...current.myNetwork.people,
            ],
        },
      }
    })
  }

  const activityMeta = {
    incoming: { label: 'Incoming Request', bg: '#DBEAFE', color: '#1D4ED8' },
    accepted: { label: 'Accepted', bg: '#D1FAE5', color: '#065F46' },
    rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#B91C1C' },
    sent: { label: 'Sent', bg: '#EDE9FE', color: '#5B21B6' },
  }

  const panelStyle = {
    background: 'var(--white)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: '18px 16px',
    height: 'calc(100vh - 320px)',
    minHeight: 360,
    overflowY: 'auto',
    scrollbarWidth: 'thin',
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 16,
        color: 'white',
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          My Network
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Manage your connections and request updates</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.66)' }}>View profiles, send connection requests, and track how people respond to you.</div>
      </div>

      <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: 14 }}>
        <div className="responsive-scroll-panel" style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 4 }}>
                All My Network
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Browse everyone in your network list and open their profile.</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 9px', borderRadius: 100 }}>
              {people.length} people
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {people.map(person => (
              <div key={person.id} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>{person.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{person.role}</div>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>{person.availability}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 100, fontWeight: 700 }}>
                      {person.trustScore}
                    </span>
                    <StatusPill status={person.status} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {person.skills.map(skill => (
                    <span key={skill} style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '3px 8px', borderRadius: 100, fontWeight: 600 }}>
                      {skill}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedProfile(person)}
                    style={{ justifyContent: 'center', padding: '8px 12px', fontSize: 12 }}
                  >
                    View Profile
                  </button>
                  <button
                    className={person.status === 'Connect Available' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => sendConnectionRequest(person)}
                    disabled={person.status !== 'Connect Available'}
                    style={{ justifyContent: 'center', padding: '8px 12px', fontSize: 12, opacity: person.status !== 'Connect Available' ? 0.75 : 1 }}
                  >
                    {person.status === 'Connect Available' ? 'Send Connection Request' : person.status === 'Pending' ? 'Request Pending' : 'Already Connected'}
                  </button>
                  <button
                    className={teamUpRequests.includes(person.id) ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => sendTeamUpRequest(person)}
                    disabled={teamUpRequests.includes(person.id)}
                    style={{ justifyContent: 'center', padding: '8px 12px', fontSize: 12, opacity: teamUpRequests.includes(person.id) ? 0.75 : 1 }}
                  >
                    {teamUpRequests.includes(person.id) ? 'Team-Up Requested' : 'Send Team-Up Request'}
                  </button>
                  <button
                    onClick={() => removeConnection(person.id)}
                    style={{
                      justifyContent: 'center',
                      padding: '8px 12px',
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #FECACA',
                      background: '#FEF2F2',
                      color: '#B91C1C',
                      fontWeight: 700,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="responsive-scroll-panel" style={panelStyle}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 4 }}>
              Request Activity
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Track who sent you requests and who accepted or rejected your connection requests.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activity.map(item => {
              const meta = activityMeta[item.type]
              return (
                <div key={item.id} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginBottom: 3 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.role}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 100, background: meta.bg, color: meta.color, marginBottom: 6 }}>
                        {meta.label}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.when}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{item.note}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 100, fontWeight: 700 }}>
                        TrustScore {item.trustScore}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {item.type === 'incoming' && (
                        <button
                          className="btn-primary"
                          onClick={() => acceptIncomingRequest(item.id)}
                          style={{ padding: '7px 12px', fontSize: 12 }}
                        >
                          Accept
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        onClick={() => setSelectedProfile(people.find(person => person.name === item.name) || {
                          id: item.id,
                          name: item.name,
                          role: item.role,
                          trustScore: item.trustScore,
                          skills: ['React', 'Node.js'],
                          availability: 'Open to connect',
                          contactInfo: [
                            { label: 'Email', value: `${item.name.toLowerCase().replace(/\s+/g, '.')}@skillbridge.demo` },
                            { label: 'WhatsApp', value: '+91 90000 10002' },
                          ],
                          githubLink: [],
                          projects: [
                            { name: 'Collab Project', desc: 'Demo project preview for connection activity users.', link: 'https://github.com/topics/project', demoLink: 'https://github.com/topics/project', saved: true },
                          ],
                          status: 'Connect Available',
                        })}
                        style={{ padding: '7px 12px', fontSize: 12 }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ProfileModal
        person={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onConnect={() => selectedProfile && sendConnectionRequest(selectedProfile)}
        connectSent={selectedProfile ? people.find(person => person.id === selectedProfile.id)?.status === 'Pending' : false}
      />
    </div>
  )
}
