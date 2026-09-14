import { useNavigate } from 'react-router-dom'

const GAIN_FACTORS = [
  { label: 'Solve daily challenge', points: '+30 to +100', desc: 'Complete puzzles, MCQs, coding tasks, or describe-code challenges every day to earn Trust.' },
  { label: 'Complete retention task', points: '+20', desc: 'Solve your daily skill retention task for each verified skill to maintain streak and earn Trust.' },
  { label: 'Verify a new skill', points: '+40 to +60', desc: 'Submit proof of work and pass AI review to earn a verified badge on a new skill.' },
  { label: 'Re-verify or renew a skill', points: '+40 to +60', desc: 'Complete re-verification before a skill expires to keep your badge and recover lost Trust.' },
  { label: 'Upload a project', points: '+80', desc: 'Add a project with a live link or GitHub repo to strengthen your proof of work.' },
  { label: 'Add a new skill to profile', points: '+20', desc: 'Adding a skill shows active learning intent and contributes to profile completeness.' },
  { label: 'Upgrade skill level', points: '+60 to +120', desc: 'Complete an upgrade track (Beginner → Intermediate → Pro) to earn a significant Trust boost.' },
  { label: 'Maintain a daily streak', points: '+10 per day', desc: 'Keep your retention tasks streak alive. Longer streaks add passive Trust each day.' },
  { label: 'Complete GIG successfully', points: '+150', desc: 'Deliver a GIG task and receive a company rating. Strong delivery is the biggest Trust multiplier.' },
]

const LOSS_FACTORS = [
  { label: 'Miss a daily retention task', points: '-30', desc: 'Skipping a verified skill\'s daily task breaks your streak and deducts Trust immediately.' },
  { label: 'Wrong answer on retention task', points: '-10 per wrong', desc: 'Submitting incorrect answers on daily skill tasks reduces Trust incrementally.' },
  { label: 'Skill verification expires', points: '-80', desc: 'A verified skill that crosses its expiry date drops Trust until re-verified.' },
  { label: 'Miss 2+ days in a row', points: 'Level downgrade risk', desc: 'Missing 2 or more consecutive retention days for a skill can trigger a Pro → Intermediate or Intermediate → Beginner downgrade.' },
  { label: '10+ wrong answers in a week', points: 'Level downgrade risk', desc: 'Accumulating too many wrong answers on a skill\'s retention tasks puts the verified level at risk.' },
  { label: 'Skill renewal overdue', points: '-40 to -60', desc: 'Skills past their due date but not yet expired still reduce Trust momentum every week.' },
]

export function TrustScoreCriteriaContent() {
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
          borderRadius: 16,
          padding: '28px 30px',
          color: 'white',
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            TrustScore Criteria
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>What affects your TrustScore</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', maxWidth: 760, lineHeight: 1.6 }}>
            This page explains which actions can increase trust, which issues can reduce it, and which profile gaps stop you from earning more TrustScore.
          </div>
        </div>

        <div className="responsive-card-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Ways to Gain Trust</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GAIN_FACTORS.map(item => (
                <div key={item.label} style={{ background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#065F46', opacity: 0.82, lineHeight: 1.55 }}>{item.desc}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#10B981', flexShrink: 0 }}>{item.points}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>What Can Reduce or Block Trust</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LOSS_FACTORS.map(item => (
                <div key={item.label} style={{ background: '#FFF7ED', borderRadius: 10, border: '1px solid #FED7AA', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#9A3412', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#9A3412', opacity: 0.82, lineHeight: 1.55 }}>{item.desc}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#EA580C', flexShrink: 0 }}>{item.points}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>How to Improve Faster</div>
          <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              'Solve at least one daily challenge every day — even the 5-min MCQ counts.',
              'Never skip a retention task for a verified skill; a broken streak costs -30 Trust instantly.',
              'Verify unverified skills — each badge earns +40 to +60 Trust immediately.',
              'Upload projects with a GitHub or live link to unlock the full +80 Trust.',
              'Renew expiring skills before the due date; waiting until expiry costs -80 Trust.',
              'Aim for skill upgrades — moving to Pro level is the second biggest single Trust gain after GIG delivery.',
            ].map(item => (
              <div key={item} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--dark)', lineHeight: 1.55 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
    </div>
  )
}

export default function TrustScoreCriteria() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/student/dashboard', { state: { activeSection: 'trustscore' } })}
          style={{
            marginBottom: 18,
            background: 'transparent',
            color: 'var(--muted)',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Back to Dashboard
        </button>
        <TrustScoreCriteriaContent />
      </div>
    </div>
  )
}
