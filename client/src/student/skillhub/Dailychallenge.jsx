import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const ranked = [...skills].sort((left, right) => (Number(right.streak) || 0) - (Number(left.streak) || 0) || left.name.localeCompare(right.name))
  const overallCurrent = Number(streaks.overallCurrent ?? streaks.current) || 0
  const overallLongest = Number(streaks.overallLongest ?? streaks.longest) || 0
  const totalPracticeDays = Number(streaks.totalPracticeDays) || 0
  const daysToMilestone = streaks.nextMilestone ? Math.max(0, streaks.nextMilestone - overallCurrent) : 0
  const serverToday = /^\d{4}-\d{2}-\d{2}$/.test(daily.date || '') ? daily.date : new Date().toISOString().slice(0, 10)
  const today = new Date(`${serverToday}T00:00:00`)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const practiceDaysBySkill = (skillHubState?.skillLog || []).reduce((days, item) => {
    if (item.eventType !== 'retention_completed' || !item.earnedDay || !item.skillName) return days
    const skillName = item.skillName.toLowerCase()
    if (!days[skillName]) days[skillName] = new Set()
    days[skillName].add(item.earnedDay)
    return days
  }, {})

  const moveMonth = direction => {
    const next = new Date(viewYear, viewMonth + direction, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  return <section className="sh-habit-tracker" aria-labelledby="practice-streak-title">
    <header className="sh-habit-header">
      <div><span className="sh-section-kicker">Track your habit</span><h2 id="practice-streak-title">Practice consistency</h2><p>Each filled square is a reviewer-approved practice day for that skill.</p></div>
      <div className="sh-habit-stats" aria-label="Practice totals">
        <span><Flame size={15}/><strong>{overallCurrent}</strong> trust streak</span>
        <span><CalendarDays size={15}/><strong>{totalPracticeDays}</strong> days practiced</span>
        <span><Trophy size={15}/><strong>{overallLongest}</strong> best</span>
        <span><Target size={15}/><strong>{streaks.activeSkills || 0}</strong> active skills</span>
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
          const eligible = skill.verified && ['valid', 'due'].includes(skill.renewalStatus)
          const skillDays = practiceDaysBySkill[skill.name.toLowerCase()] || new Set()
          const current = Number(skill.streak) || 0
          return <div className="sh-habit-row" key={skill.name}>
            <div className="sh-habit-skill"><div><strong>{skill.name}</strong><span>{skill.category} · {skill.stage}</span></div><div className="sh-habit-skill-meta"><span><Flame size={13}/>{current} days</span>{eligible ? <small>Active</small> : <small className="is-locked">Verify first</small>}</div></div>
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
    <footer className="sh-habit-footer"><span>{streaks.completedToday || 0} skills practiced today</span><span>{streaks.nextMilestone ? `${daysToMilestone} more consecutive ${daysToMilestone === 1 ? 'day' : 'days'} to reach the ${streaks.nextMilestone}-day milestone.` : 'You have reached every available streak milestone.'}</span></footer>
  </section>
}

export default function DailyChallenge({ skills = [], skillHubState, challenges = [], rewards, assessments = [] }) {
  const navigate = useNavigate()
  const daily = skillHubState?.daily || {}
  const verified = skills.filter(skill => skill.verified && ['valid', 'due'].includes(skill.renewalStatus))
  const open = (skill, mode, extra = {}) => navigate('/student/task', { state: { skillName: skill.name, mode, returnSection: 'skillhub', ...extra } })
  const reviewState = (name, mode, challengeId) => assessments.find(item => item.skillName.toLowerCase() === name.toLowerCase() && item.mode === mode
    && (mode !== 'challenge' || item.challengeId === challengeId) && ['pending', 'needs_revision'].includes(item.status))?.status
  const actionLabel = (status, fallback) => status === 'pending' ? 'Awaiting review' : status === 'needs_revision' ? 'Revise submission' : fallback
  return <div className="sh-daily-layout">
    <div className="sh-columns">
    <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Verified skills</span><h2>Daily Practice</h2></div><span>{daily.date} IST</span></header>
      <p className="sh-policy">Up to +{rewards.retain} Trust per submission day after review. No automatic penalties for missed practice.</p>
      <div className="sh-list">{verified.map(skill => {
        const done = (daily.completedRetention || []).includes(skill.name.toLowerCase())
        const status = reviewState(skill.name, 'retain')
        return <article className="sh-skill" key={skill.name}><div className="sh-skill-main"><strong>{skill.name}</strong><p className="sh-meta">{skill.stage} · Approved evidence only</p><StreakBadge skill={skill} done={done}/></div>
          {done ? <CheckCircle2 aria-label="Practice approved" size={20}/> : <button className="btn-secondary" onClick={() => open(skill, 'retain')}>{actionLabel(status, 'Submit practice')}<ArrowRight size={16}/></button>}</article>
      })}{!verified.length && <p className="sh-empty">No actively verified skills available for practice.</p>}</div>
    </section>
    <section className="sh-panel"><header className="sh-section-heading"><div><span className="sh-section-kicker">Evidence tasks</span><h2>Challenges</h2></div><span>+{daily.points || 0} Trust for today's submissions</span></header>
      <p className="sh-policy">Up to +{rewards.challenge} Trust per submission day across all challenges. Original evidence and reviewer approval required.</p>
      <div className="sh-list">{challenges.map(challenge => {
        const skill = skills.find(item => item.name.toLowerCase() === challenge.skill.toLowerCase())
        const done = (daily.completedChallenges || []).includes(challenge.id)
        const status = skill ? reviewState(skill.name, 'challenge', challenge.id) : ''
        return <article className="sh-assessment" key={challenge.id}><header><strong>{challenge.title}</strong><span>{challenge.skill}</span></header>
          <p>{challenge.instructions}</p>
          {done ? <span className="sh-positive">Approved</span> : <button className="btn-secondary" disabled={!skill} onClick={() => open(skill, 'challenge', { challengeId: challenge.id, challengeTitle: challenge.title, instructions: challenge.instructions })}>
            {!skill ? 'Skill not on profile' : actionLabel(status, 'Open challenge')}<ArrowRight size={16}/>
          </button>}
        </article>
      })}{!challenges.length && <p className="sh-empty">No challenges available.</p>}</div>
    </section>
    </div>
  </div>
}
