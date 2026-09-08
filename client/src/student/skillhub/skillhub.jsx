import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStudentSkillHub, getStudentSessionToken, recordStudentSkillHubEvent, saveStudentSkillHub } from '../studentApi'
import DailyChallenge from './Dailychallenge'
import { buildDemoSkillHubSkills } from './skillHubDemoData'
import SkillGapReport from './skillgapreport'

const ACTION_WARNING = 'AI can detect cheating. Copy-paste, no typing, very fast typing, tab switching, idle-then-submit, same answers, multiple logins, rapid submissions, DevTools, and camera signals can affect TrustScore.'

const SKILLHUB_NAV = [
  { key: 'myskills', icon: '🏅', label: 'My Skills' },
  { key: 'assessment', icon: '📝', label: 'Upgrade your skill' },
  { key: 'roadmap', icon: '✅', label: 'Verify Your Skill' },
  { key: 'challenge', icon: '⚡', label: 'Daily Task' },
  { key: 'gap', icon: '📊', label: 'Skill Gap Report' },
]

function SubNav({ sub, setSub }) {
  const [isOpen, setIsOpen] = useState(false)
  const activeItem = SKILLHUB_NAV.find(item => item.key === sub) || SKILLHUB_NAV[0]

  return (
    <div className="responsive-pill-nav responsive-pill-nav-menu skillhub-subnav" style={{ display: 'flex', gap: 4, background: 'var(--white)', borderRadius: 12, padding: 6, border: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap' }}>
      <div className="responsive-pill-nav-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{activeItem.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeItem.label}
          </span>
        </div>
        <button
          type="button"
          className="responsive-pill-nav-toggle"
          onClick={() => setIsOpen(open => !open)}
          aria-label="Toggle Skill Hub navigation"
          aria-expanded={isOpen}
        >
          ☰
        </button>
      </div>

      <div className={`responsive-pill-nav-list${isOpen ? ' is-open' : ''}`}>
      {SKILLHUB_NAV.map(item => (
        <button key={item.key} type="button" className={`skillhub-subnav-item${sub === item.key ? ' is-active' : ''}`} aria-pressed={sub === item.key} onClick={() => {
          setSub(item.key)
          setIsOpen(false)
        }} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: sub === item.key ? 'var(--primary)' : 'transparent',
          color: sub === item.key ? 'white' : 'var(--muted)',
          fontWeight: sub === item.key ? 700 : 500,
          fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (sub !== item.key) e.currentTarget.style.background = 'var(--bg)' }}
        onMouseLeave={e => { if (sub !== item.key) e.currentTarget.style.background = 'transparent' }}>
          <span className="skillhub-subnav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
      </div>
    </div>
  )
}

function VerifyAllSkillsPanel({ skills, statusMeta, skillStageMeta, trustCreditMeta }) {
  const [filter, setFilter] = useState('unverified')

  const verifiedCount = skills.filter(s => s.verified).length
  const unverifiedCount = skills.filter(s => !s.verified).length

  const filtered = skills.filter(s => {
    if (filter === 'verified') return s.verified && s.renewalStatus === 'valid'
    if (filter === 'unverified') return !s.verified
    return true
  })

  const filters = [
    { key: 'all', label: 'All', count: skills.length, bg: 'var(--bg)', color: 'var(--dark)' },
    { key: 'verified', label: 'Verified', count: verifiedCount, bg: '#D1FAE5', color: '#065F46' },
    { key: 'unverified', label: 'Unverified', count: unverifiedCount, bg: '#E0E7FF', color: '#3730A3' },
  ]

  return (
    <div className="responsive-scroll-panel" style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '20px', height: 'calc(100vh - 310px)', overflowY: 'auto', scrollbarWidth: 'thin' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
          All Skills
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{filtered.length} shown</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
        Filter by verification status to find skills that need your attention.
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              fontSize: 12,
              fontWeight: 700,
              background: filter === f.key ? f.color : f.bg,
              color: filter === f.key ? 'white' : f.color,
              padding: '4px 10px',
              borderRadius: 100,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {f.count} {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(skill => {
          const sm = statusMeta(skill)
          const stageMeta = skillStageMeta(skill)
          const tc = trustCreditMeta(skill)
          return (
            <div key={skill.name} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{skill.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color, padding: '2px 7px', borderRadius: 100 }}>
                      {sm.label}
                    </span>
                    {stageMeta && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: stageMeta.bg, color: stageMeta.color, padding: '2px 7px', borderRadius: 100 }}>
                        {stageMeta.label}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>
                      {skill.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {skill.verified ? sm.detail : 'Complete a task to earn a verified badge.'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{skill.level}%</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tc.color }}>{skill.verified && skill.renewalStatus === 'valid' ? 'Profile Ready' : tc.text}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SkillHub() {
  const navigate = useNavigate()
  const sessionTokenRef = useRef(getStudentSessionToken())
  const didHydrateRef = useRef(false)
  const [sub, setSub] = useState('myskills')
  const [skillFilter, setSkillFilter] = useState('all')
  const [assessmentFilter, setAssessmentFilter] = useState('all')
  const [skills, setSkills] = useState(() => buildDemoSkillHubSkills())
  const [skillHubState, setSkillHubState] = useState(null)
  const [showAddSkill, setShowAddSkill] = useState(false)
  const [newSkill, setNewSkill] = useState({ name: '', category: 'Frontend', level: '65' })

  useEffect(() => {
    let cancelled = false

    async function loadSkillHub() {
      if (!sessionTokenRef.current) {
        didHydrateRef.current = true
        return
      }

      try {
        const result = await fetchStudentSkillHub(sessionTokenRef.current)

        if (!cancelled && Array.isArray(result.skillHub?.skills)) {
          setSkills(result.skillHub.skills)
          setSkillHubState(result.skillHub.skillHubState || null)
        }
      } catch (error) {
        if (!cancelled) {
          sessionTokenRef.current = ''
          setSkills(buildDemoSkillHubSkills())
        }
      } finally {
        if (!cancelled) {
          didHydrateRef.current = true
        }
      }
    }

    loadSkillHub()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveStudentSkillHub(sessionTokenRef.current, { skills }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [skills])

  const handleSkillHubEvent = async payload => {
    if (!sessionTokenRef.current) {
      return null
    }

    const result = await recordStudentSkillHubEvent(sessionTokenRef.current, payload)
    if (Array.isArray(result.skillHub?.skills)) {
      setSkills(result.skillHub.skills)
    }
    if (result.skillHub?.skillHubState) {
      setSkillHubState(result.skillHub.skillHubState)
    }
    return result
  }

  const verifiedSkills = skills.filter(skill => skill.verified)
  const unverifiedSkills = skills.filter(skill => !skill.verified)
  const renewalSkills = verifiedSkills.filter(s => s.renewalStatus === 'due' || s.renewalStatus === 'expired')
  const dueRenewSkills = renewalSkills.filter(s => s.renewalStatus === 'due')
  const expiredSkills = renewalSkills.filter(s => s.renewalStatus === 'expired')
  const verificationQueue = skills.filter(skill => skill.renewalStatus === 'unverified' || skill.renewalStatus === 'due' || skill.renewalStatus === 'expired')
  const skillLog = skills.map(skill => {
    if (skill.lastEvent === 'expired') {
      return {
        skill,
        title: `${skill.name} expired`,
        date: skill.renewalDue,
        detail: `Trust impact: -${skill.trustLoss}`,
        badge: 'Expired',
        color: '#991B1B',
        bg: '#FEE2E2',
      }
    }
    if (skill.lastEvent === 'renewed') {
      return {
        skill,
        title: `${skill.name} renewed`,
        date: skill.renewalDue,
        detail: `Trust gained: +${skill.trustGain}`,
        badge: 'Renewed',
        color: '#065F46',
        bg: '#D1FAE5',
      }
    }
    if (skill.lastEvent === 'verified') {
      return {
        skill,
        title: `${skill.name} verified`,
        date: skill.createdOn,
        detail: 'Ready for matching',
        badge: 'Verified',
        color: '#065F46',
        bg: '#D1FAE5',
      }
    }
    return {
      skill,
      title: `${skill.name} created`,
      date: skill.createdOn,
      detail: `Pending verification · +${skill.trustGain} on verify`,
      badge: 'Created',
      color: '#3730A3',
      bg: '#E0E7FF',
    }
  })
  const filteredSkills = skills.filter(skill => {
    if (skillFilter === 'verified') return skill.verified
    if (skillFilter === 'due') return skill.renewalStatus === 'due'
    if (skillFilter === 'expired') return skill.renewalStatus === 'expired'
    if (skillFilter === 'unverified') return !skill.verified
    if (skillFilter === 'pro') return skill.stage === 'Pro'
    if (skillFilter === 'intermediate') return skill.stage === 'Intermediate'
    if (skillFilter === 'beginner') return skill.stage === 'Beginner'
    return true
  })
  const skillFilters = [
    { key: 'all', label: 'All Skills', count: skills.length, bg: 'var(--bg)', color: 'var(--dark)' },
    { key: 'verified', label: 'Verified', count: verifiedSkills.length, bg: '#D1FAE5', color: '#065F46' },
    { key: 'due', label: 'Need Renew', count: dueRenewSkills.length, bg: '#FEF3C7', color: '#92400E' },
    { key: 'expired', label: 'Expired', count: expiredSkills.length, bg: '#FEE2E2', color: '#991B1B' },
    { key: 'unverified', label: 'Unverified', count: unverifiedSkills.length, bg: '#E0E7FF', color: '#3730A3' },
  ]

  const addSkill = () => {
    const name = newSkill.name.trim()
    if (!name) return
    const exists = skills.some(skill => skill.name.toLowerCase() === name.toLowerCase())
    if (exists) return
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    const level = Number(newSkill.level) || 65
    const trustGain = level >= 80 ? 6 : level >= 65 ? 5 : 4
    const stage = level >= 80 ? 'Pro' : level >= 60 ? 'Intermediate' : 'Beginner'
    setSkills(prev => [
      ...prev,
      {
        name,
        level,
        stage,
        category: newSkill.category,
        verified: false,
        renewalStatus: 'unverified',
        renewalDue: '-',
        trustGain,
        trustLoss: 0,
        createdOn: today,
        lastEvent: 'created',
      },
    ])
    setSkillFilter('all')
    setNewSkill({ name: '', category: 'Frontend', level: '65' })
    setShowAddSkill(false)
  }
  const openVerificationTask = (skill) => {
    navigate('/student/task', {
      state: {
        skillName: skill.name,
        category: skill.category,
        level: skill.level,
        mode: skill.renewalStatus === 'unverified' ? 'verify' : 'reverify',
        renewalStatus: skill.renewalStatus,
        trustGain: skill.trustGain,
        trustLoss: skill.trustLoss,
        showIntegrityWarning: true,
        returnSection: 'skillhub',
      },
    })
  }
  const openUpgradeTask = (skill, plan) => {
    navigate('/student/task', {
      state: {
        skillName: skill.name,
        category: skill.category,
        level: skill.level,
        mode: 'upgrade',
        currentStage: skillStageMeta(skill)?.label || 'Verified',
        targetStage: plan.targetStage,
        criteria: plan.criteria,
        trustGain: plan.trustGain,
        showIntegrityWarning: true,
        returnSection: 'skillhub',
      },
    })
  }

  const card = { background: 'var(--white)', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--border)', marginBottom: 14 }
  const trustCreditMeta = (skill) => {
    if (skill.renewalStatus === 'expired') {
      return { text: `-${skill.trustLoss} Trust`, color: '#991B1B', bg: '#FEE2E2' }
    }
    if (skill.renewalStatus === 'due') {
      return { text: `+${skill.trustGain} on Renew`, color: '#065F46', bg: '#D1FAE5' }
    }
    if (skill.renewalStatus === 'unverified') {
      return { text: `+${skill.trustGain} on Verify`, color: '#3730A3', bg: '#E0E7FF' }
    }
    return { text: 'No change', color: 'var(--muted)', bg: 'var(--bg)' }
  }
  const statusMeta = (skill) => {
    if (skill.renewalStatus === 'expired') {
      return { label: 'Expired', color: '#991B1B', bg: '#FEE2E2', detail: `Expired on ${skill.renewalDue}` }
    }
    if (skill.renewalStatus === 'due') {
      return { label: 'Renew Soon', color: '#92400E', bg: '#FEF3C7', detail: `Renew by ${skill.renewalDue}` }
    }
    if (skill.verified) {
      return { label: 'Verified', color: '#065F46', bg: '#D1FAE5', detail: `Last checked ${skill.renewalDue}` }
    }
    return { label: 'Awaiting Verification', color: '#3730A3', bg: '#E0E7FF', detail: `Verify to gain +${skill.trustGain} Trust` }
  }
  const skillStageMeta = (skill) => {
    if (!skill.verified) return null
    if (skill.level >= 80) {
      return { label: 'Pro', color: '#065F46', bg: '#D1FAE5' }
    }
    if (skill.level >= 60) {
      return { label: 'Intermediate', color: '#1D4ED8', bg: '#DBEAFE' }
    }
    return { label: 'Beginner', color: '#92400E', bg: '#FEF3C7' }
  }
  const getUpgradePlan = (skill) => {
    const stage = skillStageMeta(skill)?.label || 'Beginner'
    const planByCategory = {
      Frontend: {
        Beginner: {
          targetStage: 'Intermediate',
          trustGain: 6,
          criteria: [
            'Solve 20 frontend coding problems',
            'Upload 3 responsive UI mini projects',
            'Score 80% in 40 React and JavaScript MCQs',
            'Complete 10 component debugging tasks',
          ],
        },
        Intermediate: {
          targetStage: 'Pro',
          trustGain: 10,
          criteria: [
            'Solve 40 advanced frontend coding problems',
            'Upload 10 production-style UI projects',
            'Score 85% in 100 framework MCQs',
            'Complete 20 performance and accessibility fixes',
          ],
        },
        Pro: {
          targetStage: 'Pro Mastery',
          trustGain: 12,
          criteria: [
            'Ship 2 end-to-end frontend case studies',
            'Solve 50 advanced architecture challenges',
            'Review and improve 10 real UI codebases',
            'Score 90% in 120 expert MCQs',
          ],
        },
      },
      Backend: {
        Beginner: {
          targetStage: 'Intermediate',
          trustGain: 6,
          criteria: [
            'Solve 20 API and logic coding problems',
            'Upload 3 backend mini projects',
            'Score 80% in 50 backend MCQs',
            'Complete 10 debugging and query tasks',
          ],
        },
        Intermediate: {
          targetStage: 'Pro',
          trustGain: 10,
          criteria: [
            'Solve 40 backend system problems',
            'Upload 8 service or API projects',
            'Score 85% in 100 backend MCQs',
            'Complete 20 database and scaling puzzles',
          ],
        },
        Pro: {
          targetStage: 'Pro Mastery',
          trustGain: 12,
          criteria: [
            'Design 3 scalable backend case studies',
            'Solve 50 architecture and optimization problems',
            'Upload 10 production backend repositories',
            'Score 90% in 120 advanced MCQs',
          ],
        },
      },
      Design: {
        Beginner: {
          targetStage: 'Intermediate',
          trustGain: 6,
          criteria: [
            'Upload 5 polished design screens',
            'Solve 20 UX audit challenges',
            'Score 80% in 40 design MCQs',
            'Complete 10 layout and accessibility fixes',
          ],
        },
        Intermediate: {
          targetStage: 'Pro',
          trustGain: 10,
          criteria: [
            'Upload 10 product design case studies',
            'Solve 30 advanced UX scenarios',
            'Score 85% in 100 product design MCQs',
            'Complete 20 design system exercises',
          ],
        },
        Pro: {
          targetStage: 'Pro Mastery',
          trustGain: 12,
          criteria: [
            'Ship 3 end-to-end design systems',
            'Upload 12 portfolio-ready projects',
            'Score 90% in 120 advanced design MCQs',
            'Solve 40 high-fidelity UX challenges',
          ],
        },
      },
      Analytics: {
        Beginner: {
          targetStage: 'Intermediate',
          trustGain: 6,
          criteria: [
            'Solve 20 data cleaning and SQL problems',
            'Upload 3 dashboard projects',
            'Score 80% in 50 analytics MCQs',
            'Complete 10 spreadsheet or BI puzzles',
          ],
        },
        Intermediate: {
          targetStage: 'Pro',
          trustGain: 10,
          criteria: [
            'Solve 40 analytics case problems',
            'Upload 8 reporting or BI projects',
            'Score 85% in 100 advanced MCQs',
            'Complete 20 data interpretation puzzles',
          ],
        },
        Pro: {
          targetStage: 'Pro Mastery',
          trustGain: 12,
          criteria: [
            'Publish 3 advanced analytics case studies',
            'Upload 10 data storytelling projects',
            'Score 90% in 120 expert MCQs',
            'Solve 50 statistical reasoning puzzles',
          ],
        },
      },
      Marketing: {
        Beginner: {
          targetStage: 'Intermediate',
          trustGain: 6,
          criteria: [
            'Solve 20 campaign strategy tasks',
            'Upload 3 marketing asset projects',
            'Score 80% in 40 marketing MCQs',
            'Complete 10 audience targeting exercises',
          ],
        },
        Intermediate: {
          targetStage: 'Pro',
          trustGain: 10,
          criteria: [
            'Run 10 campaign simulations',
            'Upload 8 portfolio-ready campaign plans',
            'Score 85% in 100 growth MCQs',
            'Solve 20 optimization and funnel tasks',
          ],
        },
        Pro: {
          targetStage: 'Pro Mastery',
          trustGain: 12,
          criteria: [
            'Ship 3 full-funnel strategy case studies',
            'Upload 12 campaign result reports',
            'Score 90% in 120 expert MCQs',
            'Solve 40 advanced growth puzzles',
          ],
        },
      },
    }

    return planByCategory[skill.category]?.[stage] || {
      targetStage: stage === 'Beginner' ? 'Intermediate' : stage === 'Intermediate' ? 'Pro' : 'Pro Mastery',
      trustGain: stage === 'Pro' ? 12 : stage === 'Intermediate' ? 10 : 6,
      criteria: [
        'Solve 20 skill-focused problems',
        'Upload 5 practice projects',
        'Score 80% in domain MCQs',
        'Complete 10 puzzle-based challenges',
      ],
    }
  }
  const assessmentSkills = verifiedSkills.filter(skill => {
    const stage = skillStageMeta(skill)?.label?.toLowerCase()
    if (assessmentFilter === 'all') return true
    return stage === assessmentFilter
  })

  return (
    <div>
      <SubNav sub={sub} setSub={setSub} />

      {sub === 'myskills' && (
        <div>
          <div className="responsive-skillhub-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div className="responsive-scroll-panel" style={{ ...card, height: 770, overflowY: 'auto', scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>All Skills</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>{skills.length}</div>
                </div>
                <button
                  onClick={() => setShowAddSkill(prev => !prev)}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {showAddSkill ? 'Close' : '+ Add New Skill'}
                </button>
              </div>
              {showAddSkill && (
                <div className="responsive-inline-form" style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1.4fr 1fr 110px auto', gap: 8, alignItems: 'end' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Skill Name
                    <input
                      value={newSkill.name}
                      onChange={e => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter skill name"
                      style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', outline: 'none', textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text)' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Category
                    <select
                      value={newSkill.category}
                      onChange={e => setNewSkill(prev => ({ ...prev, category: e.target.value }))}
                      style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none', textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text)' }}
                    >
                      {['Frontend', 'Backend', 'Design', 'Analytics', 'Marketing'].map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Skill Level (%)
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newSkill.level}
                      onChange={e => setNewSkill(prev => ({ ...prev, level: e.target.value }))}
                      placeholder="Level"
                      style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', outline: 'none', textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text)' }}
                    />
                  </label>
                  <button
                    onClick={addSkill}
                    style={{
                      background: 'var(--dark)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Save Skill
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {skillFilters.map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setSkillFilter(filter.key)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      background: skillFilter === filter.key ? filter.color : filter.bg,
                      color: skillFilter === filter.key ? 'white' : filter.color,
                      padding: '4px 10px',
                      borderRadius: 100,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {filter.count} {filter.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
                Showing {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {filteredSkills.map(skill => (
                  <div key={skill.name} className="responsive-stack" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: 'var(--bg)',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}>
                    {(() => {
                      const stageMeta = skillStageMeta(skill)
                      return (
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{skill.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: statusMeta(skill).bg, color: statusMeta(skill).color, padding: '2px 8px', borderRadius: 100 }}>
                          {statusMeta(skill).label}
                        </span>
                        {stageMeta && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: stageMeta.bg, color: stageMeta.color, padding: '2px 8px', borderRadius: 100 }}>
                            {stageMeta.label}
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--white)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 100 }}>
                          {skill.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: skill.verified ? 3 : 0 }}>
                        {skill.verified ? statusMeta(skill).detail : 'Complete a skill assessment to unlock verified level badges.'}
                      </div>
                      {skill.verified && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: skill.streak >= 5 ? '#065F46' : skill.streak >= 1 ? '#A16207' : '#991B1B',
                          }}>
                            🔥 {skill.streak} day streak
                          </span>
                          {skill.missedDays >= 3 && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '1px 6px', borderRadius: 100 }}>
                              ⚠️ {skill.missedDays} days missed
                            </span>
                          )}
                          {skill.missedDays >= 1 && skill.missedDays < 3 && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 100 }}>
                              {skill.missedDays} day{skill.missedDays > 1 ? 's' : ''} missed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                      )
                    })()}
                    <div className="responsive-skill-meta" style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{skill.level}%</div>
                      <div style={{ fontSize: 11, color: trustCreditMeta(skill).color, fontWeight: 700 }}>
                        {skill.verified ? (skill.renewalStatus === 'valid' ? 'Profile Ready' : trustCreditMeta(skill).text) : 'Level updates via assessment'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="responsive-scroll-panel" style={{ ...card, height: 770, overflowY: 'auto', scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Skill Log
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)', marginBottom: 10 }}>{skillLog.length}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 100 }}>
                  {skillLog.filter(item => item.badge === 'Created').length} New
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: 100 }}>
                  {skillLog.filter(item => item.badge === 'Expired').length} Expired
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#E0E7FF', color: '#3730A3', padding: '3px 8px', borderRadius: 100 }}>
                  {skillLog.filter(item => item.badge === 'Renewed').length} Renewed
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {skillLog.map(item => (
                  <div key={item.skill.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.date}</div>
                      <div style={{ fontSize: 11, color: item.color, fontWeight: 700 }}>
                        {item.detail}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100,
                      background: item.bg,
                      color: item.color,
                    }}>
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {sub === 'assessment' && (
        <div>
          <div style={{ ...card, marginBottom: 18, background: 'linear-gradient(135deg, var(--dark), #1E1B4B)' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Skill Assignment
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>
              Upgrade verified skills through assignments
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.66)' }}>
              Only verified skills get level upgrade opportunities. Complete assignment tasks to move from Beginner to Intermediate, or Intermediate to Pro.
            </div>
          </div>

          <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="responsive-scroll-panel" style={{ ...card, height: 'calc(100vh - 340px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Verified Skills
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>{assessmentSkills.length}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                  { key: 'all', label: 'All Verified', count: verifiedSkills.length, bg: 'var(--bg)', color: 'var(--dark)' },
                  { key: 'beginner', label: 'Beginner', count: verifiedSkills.filter(skill => skillStageMeta(skill)?.label === 'Beginner').length, bg: '#FEF3C7', color: '#92400E' },
                  { key: 'intermediate', label: 'Intermediate', count: verifiedSkills.filter(skill => skillStageMeta(skill)?.label === 'Intermediate').length, bg: '#DBEAFE', color: '#1D4ED8' },
                  { key: 'pro', label: 'Pro', count: verifiedSkills.filter(skill => skillStageMeta(skill)?.label === 'Pro').length, bg: '#D1FAE5', color: '#065F46' },
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setAssessmentFilter(filter.key)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      background: assessmentFilter === filter.key ? filter.color : filter.bg,
                      color: assessmentFilter === filter.key ? 'white' : filter.color,
                      padding: '4px 10px',
                      borderRadius: 100,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {filter.count} {filter.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assessmentSkills.map(skill => {
                  const stageMeta = skillStageMeta(skill)
                  return (
                    <div key={skill.name} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{skill.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, background: stageMeta.bg, color: stageMeta.color, padding: '2px 8px', borderRadius: 100 }}>
                              {stageMeta.label}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 100 }}>
                              {skill.category}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                            {skill.level}% current proficiency
                          </div>
                          <div style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 700 }}>
                            Next target: {getUpgradePlan(skill).targetStage}
                          </div>
                        </div>
                        <button
                          onClick={() => setAssessmentFilter(stageMeta.label.toLowerCase())}
                          style={{
                            background: 'var(--white)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--muted)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Focus
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="responsive-scroll-panel" style={{ ...card, height: 'calc(100vh - 340px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Upgrade Criteria
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {assessmentSkills.map(skill => {
                  const plan = getUpgradePlan(skill)
                  const stageMeta = skillStageMeta(skill)
                  return (
                    <div key={skill.name} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--dark)' }}>{skill.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, background: stageMeta.bg, color: stageMeta.color, padding: '2px 8px', borderRadius: 100 }}>
                              {stageMeta.label}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: 100 }}>
                              Upgrade to {plan.targetStage}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            Upgrade path is based on your current level and skill type.
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{skill.level}%</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>+{plan.trustGain} Trust</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        {plan.criteria.map(item => (
                          <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--primary)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.5 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => openUpgradeTask(skill, plan)}
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '9px 14px', fontSize: 13 }}
                      >
                        Upgrade
                      </button>
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#B91C1C', lineHeight: 1.5 }}>
                        {ACTION_WARNING}
                      </div>
                    </div>
                  )
                })}
                {assessmentSkills.length === 0 && (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '18px 16px', color: 'var(--muted)', fontSize: 13 }}>
                    No verified skills match this level filter yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {sub === 'roadmap' && (
        <div>
          <div style={{ ...card, marginBottom: 18, background: 'linear-gradient(135deg, var(--dark), #1E1B4B)' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Verify Your Skill
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>
              {verificationQueue.length} skills are waiting for action
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              Browse all your skills on the left or jump straight to the ones needing verification on the right.
            </div>
          </div>

          <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Column 1 — All Skills with filter */}
            <VerifyAllSkillsPanel
              skills={skills}
              statusMeta={statusMeta}
              skillStageMeta={skillStageMeta}
              trustCreditMeta={trustCreditMeta}
            />

            {/* Column 2 — Verification Queue */}
            <div className="responsive-scroll-panel" style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '20px', height: 'calc(100vh - 310px)', overflowY: 'auto', scrollbarWidth: 'thin' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
                  Action Required
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: 100 }}>
                  {verificationQueue.length} pending
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Skills that are unverified, due for renewal, or expired. Verify to gain Trust or recover lost Trust.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {verificationQueue.map(skill => {
                  const needsFirstVerification = skill.renewalStatus === 'unverified'
                  const isExpired = skill.renewalStatus === 'expired'
                  const stageMeta = skillStageMeta(skill)
                  const actionLabel = needsFirstVerification ? 'Verify Skill' : 'Re-Verify Skill'
                  const statusLabel = needsFirstVerification ? 'Unverified' : isExpired ? 'Expired' : 'Renew Soon'
                  const statusBg = needsFirstVerification ? '#E0E7FF' : isExpired ? '#FEE2E2' : '#FEF3C7'
                  const statusColor = needsFirstVerification ? '#3730A3' : isExpired ? '#991B1B' : '#92400E'
                  const trustLine = needsFirstVerification
                    ? `+${skill.trustGain} Trust on verify`
                    : isExpired
                      ? `Recover ${skill.trustLoss} Trust impact`
                      : `+${skill.trustGain} Trust on renew`

                  return (
                    <div key={skill.name} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: `1px solid ${isExpired ? '#FECACA' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{skill.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: statusBg, color: statusColor }}>
                              {statusLabel}
                            </span>
                            {stageMeta && (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: stageMeta.bg, color: stageMeta.color }}>
                                {stageMeta.label}
                              </span>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                              {skill.category}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>
                            {needsFirstVerification ? 'New skill added to profile.' : `Due on ${skill.renewalDue}`}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>
                            {trustLine}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, minWidth: 132, textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>{skill.level}%</div>
                          <button
                            onClick={() => openVerificationTask(skill)}
                            className="btn-primary"
                            style={{ padding: '8px 12px', fontSize: 12, justifyContent: 'center', width: '100%' }}
                          >
                            {actionLabel}
                          </button>
                        </div>
                      </div>
                      <div style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#B91C1C',
                        lineHeight: 1.5,
                      }}>
                        {ACTION_WARNING}
                      </div>
                    </div>
                  )
                })}
                {verificationQueue.length === 0 && (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '18px 16px', color: 'var(--muted)', fontSize: 13 }}>
                    All skills are verified and up to date.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {sub === 'challenge' && <DailyChallenge skills={skills} skillHubState={skillHubState} onEvent={handleSkillHubEvent} />}

      {sub === 'gap' && <SkillGapReport skillHubState={skillHubState} />}
    </div>
  )
}
