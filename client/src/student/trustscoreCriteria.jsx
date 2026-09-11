import { useNavigate } from 'react-router-dom'

const GAIN_FACTORS = [
  { label: 'Daily challenge approved', points: '+80 / day', desc: 'Human-reviewed original evidence. Credit is capped across all challenges for each submission day.' },
  { label: 'Daily practice approved', points: '+20 / day', desc: 'Human-reviewed practice for verified skills. Credit is capped across skills for each submission day.' },
  { label: 'Verify a new skill', points: '+60', desc: 'Approved evidence earns verification credit once per skill. Verification lasts 365 days.' },
  { label: 'Renew verification', points: '+50', desc: 'Renewal opens 30 days before expiry. Approval extends validity for 365 days; credit is awarded once per previous expiry cycle.' },
  { label: 'Add a skill', points: '0', desc: 'New skills are unverified. Adding a name does not award TrustScore.' },
  { label: 'Upgrade skill level', points: '+100', desc: 'Approved progression from Beginner to Intermediate or Intermediate to Pro. Credit is awarded once per skill and target level.' },
  { label: 'Upload a project', points: '+80', desc: 'Record project evidence with a live link or repository.' },
  { label: 'Complete GIG successfully', points: '+150', desc: 'Recorded GIG completion through the company delivery workflow.' },
]
const LOSS_FACTORS = [
  { label: 'Reviewed verification expires', points: '-80', desc: 'Applied once per expiry cycle after the final valid day. The active verification badge is removed. Legacy verification without a review timestamp does not incur a new penalty.' },
  { label: 'Pending or unsuccessful assessment', points: '0', desc: 'No credit until approval. Revisions and rejected evidence do not award new verification or level credit.' },
  { label: 'Missed daily practice', points: '0', desc: 'No automatic penalty, passive streak bonus or automatic level downgrade. Streaks reflect consecutive approved practice days.' },
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
              'Submit original evidence with reproducible results and explain your contribution.',
              'Daily credit belongs to the original submission day, even if review happens later.',
              'Renew before the final valid day to avoid an expiry penalty.',
              'New accounts start at zero. TrustScore stays within 0 to 1000.',
              'Refreshing or resubmitting does not award duplicate points.',
              'Profile badges and levels come from approved skill records.',
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
          onClick={() => navigate('/student/dashboard?section=trustscore', { replace: true })}
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
