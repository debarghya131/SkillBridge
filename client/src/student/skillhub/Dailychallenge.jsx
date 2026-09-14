import { useNavigate } from 'react-router-dom'

const ACTION_WARNING = 'AI can detect cheating. Copy-paste, no typing, fast typing, tab switching, idle submit, same answers, multiple logins, rapid submissions, DevTools, and camera signals may reduce TrustScore.'

const todaySeed = () => {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

const VERIFIED_SKILLS = [
  { name: 'React', level: 85, category: 'Frontend', stage: 'Pro', streak: 5, missedDays: 0, wrongAnswers: 2 },
  { name: 'Node.js', level: 70, category: 'Backend', stage: 'Intermediate', streak: 2, missedDays: 2, wrongAnswers: 5 },
  { name: 'UI/UX Design', level: 78, category: 'Design', stage: 'Intermediate', streak: 0, missedDays: 3, wrongAnswers: 8 },
  { name: 'SQL', level: 58, category: 'Analytics', stage: 'Beginner', streak: 7, missedDays: 0, wrongAnswers: 1 },
  { name: 'Power BI', level: 74, category: 'Analytics', stage: 'Intermediate', streak: 3, missedDays: 1, wrongAnswers: 4 },
  { name: 'Content Marketing', level: 67, category: 'Marketing', stage: 'Intermediate', streak: 1, missedDays: 2, wrongAnswers: 6 },
  { name: 'Figma', level: 88, category: 'Design', stage: 'Pro', streak: 9, missedDays: 0, wrongAnswers: 0 },
  { name: 'REST APIs', level: 62, category: 'Backend', stage: 'Intermediate', streak: 4, missedDays: 0, wrongAnswers: 3 },
]

const RETAIN_TASK_TYPES = ['mcq', 'puzzle', 'code', 'describe']
const RETAIN_TASK_LABELS = {
  mcq: '📝 MCQ Quiz',
  puzzle: '🧩 Puzzle',
  code: '💻 Code Task',
  describe: '🗣 Describe Code',
}

const INITIAL_CHALLENGES = [
  { id: 1, type: 'puzzle', title: 'Linked List Reversal Puzzle', skill: 'Data Structures', difficulty: 'Medium', trustGain: 60, time: '20 min', done: false },
  { id: 2, type: 'project', title: 'Build a Form Validator in React', skill: 'React', difficulty: 'Easy', trustGain: 80, time: '30 min', done: false },
  { id: 3, type: 'code', title: 'Write a REST API Endpoint in Node.js', skill: 'Node.js', difficulty: 'Medium', trustGain: 70, time: '25 min', done: false },
  { id: 4, type: 'mcq', title: '10-Question SQL Mastery Quiz', skill: 'SQL', difficulty: 'Easy', trustGain: 40, time: '10 min', done: true },
  { id: 5, type: 'describe', title: 'Explain this useEffect Cleanup Code', skill: 'React', difficulty: 'Easy', trustGain: 30, time: '5 min', done: false },
  { id: 6, type: 'project', title: 'Design a Dashboard Component in Figma', skill: 'Figma', difficulty: 'Hard', trustGain: 100, time: '45 min', done: false },
  { id: 7, type: 'code', title: 'Optimize a Python Data Pipeline', skill: 'Python', difficulty: 'Hard', trustGain: 90, time: '40 min', done: false },
  { id: 8, type: 'mcq', title: 'Marketing Funnel Concepts Quiz', skill: 'Content Marketing', difficulty: 'Easy', trustGain: 40, time: '10 min', done: false },
]

const diffColor = {
  Easy: ['#D1FAE5', '#065F46'],
  Medium: ['#FEF3C7', '#92400E'],
  Hard: ['#FEE2E2', '#991B1B'],
}

const typeIcon = { puzzle: '🧩', project: '🚀', code: '💻', mcq: '📝', describe: '🗣' }
const typeLabel = { puzzle: 'Puzzle', project: 'Project', code: 'Coding', mcq: 'MCQ', describe: 'Describe' }

const getWarning = (skill) => {
  if (skill.missedDays >= 3 || skill.wrongAnswers >= 8) {
    return {
      level: 'critical',
      text: `Critical: Risk losing ${skill.stage} verified status`,
      detail: `${skill.missedDays} days missed · ${skill.wrongAnswers} wrong answers this week`,
      bg: '#FEE2E2',
      color: '#991B1B',
    }
  }
  if (skill.missedDays >= 2 || skill.wrongAnswers >= 5) {
    return {
      level: 'warning',
      text: `Warning: ${skill.missedDays} missed days may downgrade to ${skill.stage === 'Pro' ? 'Intermediate' : 'Beginner'}`,
      detail: `${skill.wrongAnswers} wrong answers · miss 1 more day to trigger downgrade`,
      bg: '#FEF3C7',
      color: '#92400E',
    }
  }
  if (skill.missedDays >= 1) {
    return {
      level: 'mild',
      text: '1 day missed — stay consistent to keep your badge',
      detail: 'Miss 2 more days to risk a level downgrade',
      bg: '#FFFBEB',
      color: '#A16207',
    }
  }
  return null
}

const getRetainTaskType = (skillName, seed) => {
  const types = RETAIN_TASK_TYPES
  const hash = (skillName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + seed) % types.length
  return types[hash]
}

const stageMeta = (stage) => {
  if (stage === 'Pro') return { color: '#065F46', bg: '#D1FAE5' }
  if (stage === 'Intermediate') return { color: '#1D4ED8', bg: '#DBEAFE' }
  return { color: '#92400E', bg: '#FEF3C7' }
}

export default function DailyChallenge({ skills = [], skillHubState }) {
  const navigate = useNavigate()
  const seed = todaySeed()
  const dailyState = skillHubState?.daily
  const retainDone = Object.fromEntries((dailyState?.completedRetention || []).map(skillName => [skillName, true]))
  const challenges = INITIAL_CHALLENGES.map(challenge => ({
    ...challenge,
    done: dailyState ? dailyState.completedChallenges.includes(challenge.id) : challenge.done,
  }))
  const verifiedSkills = (skills.length > 0 ? skills.filter(skill => skill.verified) : VERIFIED_SKILLS).map(skill => ({
    ...skill,
    wrongAnswers: Number(skill.wrongAnswers) || Number(dailyState?.wrongAnswers?.[skill.name.toLowerCase()]) || 0,
  }))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const retainCompleted = Object.values(retainDone).filter(Boolean).length
  const challengeCompleted = challenges.filter(c => c.done).length
  const totalTrustGain = challenges.filter(c => c.done).reduce((a, c) => a + c.trustGain, 0)

  const criticalSkills = verifiedSkills.filter(s => getWarning(s)?.level === 'critical').length
  const warningSkills = verifiedSkills.filter(s => getWarning(s)?.level === 'warning').length

  const goToTask = (state) => navigate('/student/task', {
    state: {
      ...state,
      showIntegrityWarning: true,
      returnSection: 'skillhub',
    },
  })

  const col = {
    background: 'var(--white)',
    borderRadius: 14,
    border: '1px solid var(--border)',
    padding: '20px',
    height: 'calc(100vh - 310px)',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 18,
        color: 'white',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          Daily Challenge — {today}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>
          Tasks reset at midnight · Keep your streak alive
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            🔒 {retainCompleted}/{verifiedSkills.length} Retention Done
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            ⚡ {challengeCompleted}/{challenges.length} Challenges Done
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            +{totalTrustGain} Trust Earned Today
          </span>
          {criticalSkills > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '4px 12px', borderRadius: 100 }}>
              ⚠️ {criticalSkills} skill{criticalSkills > 1 ? 's' : ''} at risk of downgrade
            </span>
          )}
          {warningSkills > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '4px 12px', borderRadius: 100 }}>
              ⚠️ {warningSkills} skill{warningSkills > 1 ? 's' : ''} with warning
            </span>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Column 1 — Retention Tasks */}
        <div className="responsive-scroll-panel" style={col}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              🔒 Retention Tasks
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#E0E7FF', color: '#3730A3', padding: '3px 8px', borderRadius: 100 }}>
              {retainCompleted}/{verifiedSkills.length} done
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Solve one task per verified skill each day to keep your badge. Missing or submitting wrong answers reduces your TrustScore and can trigger a level downgrade.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {verifiedSkills.map(skill => {
              const taskType = getRetainTaskType(skill.name, seed)
              const warning = getWarning(skill)
              const done = !!retainDone[skill.name.toLowerCase()]
              const sm = stageMeta(skill.stage)

              return (
                <div key={skill.name} style={{
                  background: done ? '#F0FDF4' : 'var(--bg)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  border: `1px solid ${done ? '#BBF7D0' : warning?.level === 'critical' ? '#FECACA' : warning?.level === 'warning' ? '#FDE68A' : 'var(--border)'}`,
                  opacity: done ? 0.78 : 1,
                }}>
                  <div className="responsive-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{skill.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color, padding: '2px 7px', borderRadius: 100 }}>
                          ✓ {skill.stage}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>
                          {skill.category}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>
                        Today: <strong style={{ color: 'var(--dark)' }}>{RETAIN_TASK_LABELS[taskType]}</strong>
                        &ensp;·&ensp;
                        <span style={{ color: '#991B1B', fontWeight: 700 }}>-3 Trust if missed</span>
                        &ensp;·&ensp;
                        <span style={{ color: '#B45309', fontWeight: 600 }}>-1 per wrong answer</span>
                      </div>

                      <div style={{ fontSize: 11, color: skill.streak >= 5 ? '#065F46' : 'var(--muted)', fontWeight: 700, marginBottom: warning ? 6 : 0 }}>
                        🔥 {skill.streak} day streak
                        {skill.streak === 0 && <span style={{ color: '#991B1B', marginLeft: 6 }}>· streak broken!</span>}
                      </div>

                      {warning && (
                        <div style={{ background: warning.bg, borderRadius: 7, padding: '6px 9px', marginTop: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: warning.color }}>⚠️ {warning.text}</div>
                          <div style={{ fontSize: 11, color: warning.color, opacity: 0.85, marginTop: 1 }}>{warning.detail}</div>
                        </div>
                      )}
                    </div>

                    <div className="responsive-daily-action" style={{ flexShrink: 0, maxWidth: 220 }}>
                      {done ? (
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '5px 11px', borderRadius: 100 }}>
                          ✓ Done
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => goToTask({
                              skillName: skill.name,
                              category: skill.category,
                              level: skill.level,
                              mode: 'retain',
                              taskType,
                              trustLoss: 3,
                              currentStage: skill.stage,
                            })}
                            style={{
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              padding: '7px 13px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Solve Task
                          </button>
                          <div style={{ marginTop: 8, fontSize: 10.5, fontWeight: 700, color: '#B91C1C', lineHeight: 1.45 }}>
                            {ACTION_WARNING}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Column 2 — Daily Challenges */}
        <div className="responsive-scroll-panel" style={col}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              ⚡ Daily Challenges
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 100 }}>
              +{totalTrustGain} Trust Earned
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Earn TrustScore by solving puzzles, building projects, answering MCQs, writing code, or describing code snippets. New challenges every day at midnight.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {challenges.map(ch => (
              <div key={ch.id} style={{
                background: ch.done ? '#F0FDF4' : 'var(--bg)',
                borderRadius: 10,
                padding: '12px 14px',
                border: `1px solid ${ch.done ? '#BBF7D0' : 'var(--border)'}`,
                opacity: ch.done ? 0.78 : 1,
              }}>
                  <div className="responsive-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginBottom: 6 }}>
                      {typeIcon[ch.type]} {ch.title}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: diffColor[ch.difficulty][0], color: diffColor[ch.difficulty][1], padding: '2px 7px', borderRadius: 100 }}>
                        {ch.difficulty}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>
                        {typeLabel[ch.type]}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg)', color: 'var(--muted)', padding: '2px 7px', borderRadius: 100, border: '1px solid var(--border)' }}>
                        🏷 {ch.skill}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>🕐 {ch.time}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>
                      +{ch.trustGain} Trust on completion
                    </div>
                  </div>

                  <div className="responsive-daily-action" style={{ flexShrink: 0, maxWidth: 220 }}>
                    {ch.done ? (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '5px 11px', borderRadius: 100 }}>
                        ✓ Done
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => goToTask({
                            skillName: ch.skill,
                            challengeId: ch.id,
                            category: ch.skill,
                            level: 65,
                            mode: 'challenge',
                            taskType: ch.type,
                            challengeTitle: ch.title,
                            trustGain: ch.trustGain,
                            difficulty: ch.difficulty,
                          })}
                          style={{
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            padding: '7px 13px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ch.type === 'mcq' ? 'Start Quiz' : ch.type === 'puzzle' ? 'Solve Puzzle' : ch.type === 'describe' ? 'Describe Code' : 'Solve Task'}
                        </button>
                        <div style={{ marginTop: 8, fontSize: 10.5, fontWeight: 700, color: '#B91C1C', lineHeight: 1.45 }}>
                          {ACTION_WARNING}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
