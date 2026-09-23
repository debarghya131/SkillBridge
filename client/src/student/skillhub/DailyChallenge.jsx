import { useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Flame, Target, Trophy } from 'lucide-react'

const dayLabel = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

function StreakBadge({ skill, done }) {
  const streak = Number(skill.streak) || 0
  const longest = Math.max(streak, Number(skill.longestStreak) || 0)
  const state = done ? 'done' : streak ? 'due' : 'idle'
  const message = done ? 'Protected today' : streak ? 'Practice today to continue' : 'Complete practice to start'
  return <div className={`sh-streak-badge sh-streak-${state}`}>
    <Flame size={16}/><strong>{streak} day{streak === 1 ? '' : 's'}</strong><span>{message}</span>{longest > 0 && <small>Best {longest}</small>}
  </div>
}

export function PracticeStreak({ skills = [], skillHubState }) {
  const daily = skillHubState?.daily || {}
  const streaks = skillHubState?.streaks || { current: 0, longest: 0, overallCurrent: 0, overallLongest: 0, totalPracticeDays: 0, activeSkills: 0, completedToday: 0, nextMilestone: 3, week: [] }
  const realSkills = skills.filter(skill => skill?.demoData !== true)
  const demoSkills = skills.filter(skill => skill?.demoData === true)
  const ranked = [...realSkills, ...demoSkills]
    .sort((left, right) => (Number(right.streak) || 0) - (Number(left.streak) || 0) || left.name.localeCompare(right.name))
  const demoStreakDays = Array.isArray(skillHubState?.demoStreakDays) ? skillHubState.demoStreakDays : []
  const showDemoPreview = demoSkills.length > 0
  const overallCurrent = Number(streaks.overallCurrent ?? streaks.current) || 0
  const overallLongest = Number(streaks.overallLongest ?? streaks.longest) || 0
  const totalPracticeDays = Number(streaks.totalPracticeDays) || 0
  const activeSkills = Number(streaks.activeSkills) || 0
  const nextMilestone = streaks.nextMilestone
  const daysToMilestone = nextMilestone ? Math.max(0, nextMilestone - overallCurrent) : 0
  const serverToday = /^\d{4}-\d{2}-\d{2}$/.test(daily.date || '') ? daily.date : new Date().toISOString().slice(0, 10)
  const completedToday = Number(streaks.completedToday) || 0
  const today = new Date(`${serverToday}T00:00:00`)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const practiceDaysBySkill = (skillHubState?.skillLog || []).reduce((days, item) => {
    if (item.demoData === true || item.eventType !== 'retention_completed' || !item.earnedDay || !item.skillName) return days
    const skillName = item.skillName.toLowerCase()
    if (!days[skillName]) days[skillName] = new Set()
    days[skillName].add(item.earnedDay)
    return days
  }, {})
  for (const item of demoStreakDays) {
    if (!item?.skillName || !demoSkills.some(skill => skill.name.toLowerCase() === item.skillName.toLowerCase())) continue
    const skillName = item.skillName.toLowerCase()
    if (!practiceDaysBySkill[skillName]) practiceDaysBySkill[skillName] = new Set()
    for (const practiceDay of item.days || []) practiceDaysBySkill[skillName].add(practiceDay)
  }
  const moveMonth = direction => {
    const next = new Date(viewYear, viewMonth + direction, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  return <section className="sh-habit-tracker" aria-labelledby="practice-streak-title">
    <header className="sh-habit-header">
      <div><span className="sh-section-kicker">Track your habit</span><h2 id="practice-streak-title">Practice consistency{showDemoPreview && <span className="demo-data-badge">Demo preview</span>}</h2><p>Each filled square is a reviewer-approved practice day for that skill.</p></div>
      <div className="sh-habit-stats" aria-label="Practice totals">
        <span className="sh-metric-tooltip" tabIndex={0} data-tooltip="Consecutive approved practice days ending today or yesterday." aria-label="Current trust streak"><Flame size={15}/><strong>{overallCurrent}</strong> trust streak</span>
        <span className="sh-metric-tooltip" tabIndex={0} data-tooltip="Total unique days with reviewer-approved practice." aria-label="Total practice days"><CalendarDays size={15}/><strong>{totalPracticeDays}</strong> days practiced</span>
        <span className="sh-metric-tooltip" tabIndex={0} data-tooltip="Longest consecutive run of approved practice days." aria-label="Best trust streak"><Trophy size={15}/><strong>{overallLongest}</strong> best</span>
        <span className="sh-metric-tooltip" tabIndex={0} data-tooltip="Verified skills with an active practice streak." aria-label="Active skills"><Target size={15}/><strong>{activeSkills}</strong> active skills</span>
      </div>
    </header>
    <div className="sh-habit-controls">
      <div className="sh-habit-year"><span>Year</span><button type="button" onClick={() => setViewYear(year => year - 1)} aria-label="Previous year"><ChevronLeft size={15}/></button><strong>{viewYear}</strong><button type="button" onClick={() => setViewYear(year => year + 1)} aria-label="Next year"><ChevronRight size={15}/></button></div>
      <div className="sh-habit-months" aria-label="Choose month">{MONTHS.map((label, index) => <button type="button" key={label} className={index === viewMonth ? 'is-selected' : ''} onClick={() => setViewMonth(index)}>{label}</button>)}</div>
      <div className="sh-habit-step"><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ArrowLeft size={15}/></button><button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><ArrowRight size={15}/></button></div>
    </div>
    <div className="sh-habit-scroll">
      <div className="sh-habit-grid" style={{ '--habit-days': daysInMonth }}>
        <div className="sh-habit-skill-head">Skill</div>
        {Array.from({ length: daysInMonth }, (_, index) => <div className="sh-habit-day-head" key={index + 1}><span>{dayLabel(monthKey(viewYear, viewMonth, index + 1))}</span>{index + 1}</div>)}
        {ranked.map(skill => {
          const eligible = skill.assessmentEligible !== false && !skill.archived && skill.verified && ['valid', 'due'].includes(skill.renewalStatus)
          const skillDays = practiceDaysBySkill[skill.name.toLowerCase()] || new Set()
          const current = Number(skill.streak) || 0
          return <div className="sh-habit-row" key={skill.name}>
            <div className="sh-habit-skill"><div><strong>{skill.name}{skill.demoData && <span className="demo-data-badge">Demo</span>}</strong><span>{skill.category} · {skill.stage}</span></div><div className="sh-habit-skill-meta"><span><Flame size={13}/>{current} {current === 1 ? 'day' : 'days'}</span>{eligible ? <small>Active</small> : <small className="is-locked">{skill.archived ? 'Archived' : skill.renewalStatus === 'expired' ? 'Renew first' : 'Verify first'}</small>}</div></div>
            {Array.from({ length: daysInMonth }, (_, index) => {
              const dateKey = monthKey(viewYear, viewMonth, index + 1)
              const practiced = skillDays.has(dateKey)
              const isToday = dateKey === daily.date
              return <span className={`sh-habit-cell${practiced ? ' is-done' : ''}${isToday ? ' is-today' : ''}${eligible ? '' : ' is-disabled'}`} key={dateKey} title={`${skill.name}: ${practiced ? 'approved practice' : 'no approved practice'} on ${dateKey}`} aria-label={`${skill.name}, ${dateKey}: ${practiced ? 'approved practice' : 'no approved practice'}`}>{practiced && <Check size={12}/>}</span>
            })}
          </div>
        })}
      </div>
      {!ranked.length && <p className="sh-empty">Add a skill to start tracking your practice rhythm.</p>}
    </div>
    <footer className="sh-habit-footer"><span>{completedToday} skills practiced today</span><span>{nextMilestone ? `${daysToMilestone} more consecutive ${daysToMilestone === 1 ? 'day' : 'days'} to reach the ${nextMilestone}-day milestone.` : 'You have reached every available streak milestone.'}</span></footer>
  </section>
}

export default function DailyChallenge({ skills = [], skillHubState, challenges = [], rewards, assessments = [], onOpenTask }) {
  const daily = skillHubState?.daily || {}
  const verified = skills.filter(skill => skill.assessmentEligible !== false && !skill.archived && skill.verified && ['valid', 'due'].includes(skill.renewalStatus))
  const open = (skill, mode, extra = {}) => onOpenTask?.(skill, mode, { returnTab: 'daily', ...extra })
  const todayAssessment = mode => assessments.find(item => !item.demoData && item.mode === mode && item.earnedDay === daily.date
    && ['pending', 'needs_revision', 'approved'].includes(item.status))
  const reviewRecord = (name, mode, challengeId) => assessments.find(item => !item.demoData && item.skillName.toLowerCase() === name.toLowerCase() && item.mode === mode
    && item.earnedDay === daily.date && (mode !== 'challenge' || String(item.challengeId) === String(challengeId)) && ['pending', 'needs_revision'].includes(item.status))
  const actionLabel = (status, fallback) => status === 'pending' ? 'Awaiting review' : status === 'needs_revision' ? 'Revise submission' : fallback
  const demoPractice = skillHubState?.demoDailyPractice || []
  const demoChallenges = skillHubState?.demoChallengeStates || []
  const demoAssessment = item => item ? ({ id: item.id, demoData: true, skillName: item.skillName, mode: item.mode || 'challenge', challengeId: item.challengeId || null, targetStage: '', response: item.response || '', evidenceLink: '', status: item.status, feedback: item.status === 'needs_revision' ? 'The reviewer requested stronger evidence before approval.' : '', createdAt: item.occurredAt || new Date().toISOString(), rewardPoints: item.points || 0, reviewHistory: [] }) : null
  return <div className="sh-daily-layout">
    <div className="sh-columns">
    <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Verified skills</span><h2>Daily Practice</h2></div><span>{daily.date} IST</span></header>
      <p className="sh-policy">One practice submission per IST day, across all skills. Approval earns +{rewards.retain} base credits and counts toward the submission day's streak. No automatic penalties for missed practice.</p>
      <div className="sh-list">{verified.map(skill => {
        const done = (daily.completedRetention || []).includes(skill.name.toLowerCase())
        const record = reviewRecord(skill.name, 'retain')
        const status = record?.status
        const blocked = !skill.demoData && !record && (Boolean(todayAssessment('retain')) || daily.completedRetention?.length > 0)
        const demoState = skill.demoData ? demoPractice.find(item => item.skillName.toLowerCase() === skill.name.toLowerCase()) : null
        const demoDone = demoState?.status === 'approved'
        const effectiveStatus = demoState?.status || status
        return <article className="sh-skill" key={skill.name}><div className="sh-skill-main"><strong>{skill.name}{skill.demoData && <span className="demo-data-badge">Demo</span>}</strong><p className="sh-meta">{skill.stage} · Approved evidence only</p><StreakBadge skill={skill} done={done || demoDone}/></div>
          {done || demoDone ? <><CheckCircle2 aria-label="Practice approved" size={20}/><span className="sh-positive">Approved</span></> : <button className="btn-secondary" disabled={blocked} onClick={() => open(skill, 'retain', demoState ? { demoAssessment: demoAssessment(demoState) } : { assessmentId: record?.id })}>{blocked ? 'Daily submission recorded' : actionLabel(effectiveStatus, 'Submit practice')}<ArrowRight size={16}/></button>}</article>
      })}{!verified.length && <p className="sh-empty">No actively verified skills available for practice.</p>}</div>
    </section>
    <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Evidence tasks</span><h2>Challenges</h2></div><span>+{daily.points || 0} base credits today</span></header>
      <p className="sh-policy">One challenge submission per IST day. Approval earns +{rewards.challenge} base credits. TrustScore gains depend on caps and evidence tiers.</p>
      <div className="sh-list">{challenges.map(challenge => {
        const skill = skills.find(item => challenge.catalogSkillId ? item.catalogSkillId === challenge.catalogSkillId : item.name.toLowerCase() === challenge.skill.toLowerCase())
        const eligible = skill && skill.assessmentEligible !== false && !skill.archived && skill.verified && ['valid', 'due'].includes(skill.renewalStatus)
        const done = (daily.completedChallenges || []).includes(challenge.id)
        const demoState = skill?.demoData ? demoChallenges.find(item => item.challengeId === challenge.id && item.skillName.toLowerCase() === skill.name.toLowerCase()) : null
        const demoDone = demoState?.status === 'approved'
        const record = skill ? reviewRecord(skill.name, 'challenge', challenge.id) : null
        const status = demoState?.status || record?.status
        const blocked = !skill?.demoData && !record && (Boolean(todayAssessment('challenge')) || daily.completedChallenges?.length > 0)
        const unavailableLabel = !skill ? 'Skill not on profile' : skill.archived ? 'Restore skill first' : skill.catalogAvailable === false ? 'Standard unavailable' : skill.renewalStatus === 'expired' ? 'Renew verification first' : 'Verify skill first'
        return <article className="sh-assessment" key={challenge.id}><header><strong>{challenge.title}</strong><span>{challenge.skill}</span></header>
          <p>{challenge.instructions}</p>
          {done || demoDone ? <span className="sh-positive">Approved</span> : <button className="btn-secondary" disabled={!eligible || blocked} onClick={() => open(skill, 'challenge', { assessmentId: record?.id, challengeId: challenge.id, challengeTitle: challenge.title, instructions: challenge.instructions, ...(demoState ? { demoAssessment: demoAssessment({ ...demoState, mode: 'challenge' }) } : {}) })}>
            {!eligible ? unavailableLabel : blocked ? 'Daily submission recorded' : actionLabel(status, 'Open challenge')}<ArrowRight size={16}/>
          </button>}
        </article>
      })}{!challenges.length && <p className="sh-empty">No challenges available.</p>}</div>
    </section>
    </div>
  </div>
}
