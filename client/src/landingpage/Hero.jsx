import { useNavigate } from 'react-router-dom'

const stats = [
  { value: '50K+', label: 'Students Ready' },
  { value: '8K+', label: 'MSMEs Onboard' },
  { value: '92%', label: 'Match Rate' },
]

export default function Hero() {
  const navigate = useNavigate()

  return (
    <section id="home" style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F0F4FF 0%, #FFFFFF 50%, #FFF7ED 100%)',
      display: 'flex',
      alignItems: 'center',
      paddingTop: '68px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: '10%', right: '8%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', left: '5%',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div className="container landing-hero-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '60px',
        alignItems: 'center',
        padding: '80px 24px',
        width: '100%',
      }}>
        {/* Left: Text content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minWidth: 0 }}>
          <div className="animate-fadeup">
            <span className="badge">
              <span style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: '50%', display: 'inline-block' }} />
              · Tier-2/3 Opportunity Gap
            </span>
          </div>

          <h1 className="animate-fadeup delay-1" style={{
            fontSize: 'clamp(36px, 5vw, 60px)',
            fontWeight: 900,
            color: 'var(--dark)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}>
            Your Skills.<br />
            Your Merit.<br />
            <span style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Your Opportunity.
            </span>
          </h1>

          <p className="animate-fadeup delay-2" style={{
            fontSize: 18,
            color: 'var(--muted)',
            lineHeight: 1.75,
            maxWidth: 480,
          }}>
            We connect <strong style={{ color: 'var(--text)' }}>Tier-2/3 college students</strong> to real work at
            local MSMEs — based on what you can <em>do</em>, not where you studied.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fadeup delay-3 landing-hero-link-row" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="#features" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--white)',
              border: '1.5px solid var(--border)',
              color: 'var(--text)',
              padding: '11px 24px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 15, fontWeight: 600,
              transition: 'all var(--transition)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}>
              🔍 Explore Opportunities
            </a>
          </div>

          <div className="animate-fadeup delay-3 landing-hero-actions">
            <div>
            <button className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}
              onClick={() => navigate('/student?mode=signup')}>
              🎓 Get Started
              <span style={{ opacity: 0.7, fontSize: 13, fontWeight: 400 }}>for students</span>
            </button>
            <button className="btn-accent" style={{ fontSize: 16, padding: '14px 32px' }}
              onClick={() => navigate('/company?mode=signup')}>
              🏢 For Company
              <span style={{ opacity: 0.7, fontSize: 13, fontWeight: 400 }}>hire talent</span>
            </button>
            </div>
            <button className="landing-login-link" onClick={() => navigate('/login')}>Already have an account? Log in</button>
          </div>

          {/* Stats */}
          <div className="animate-fadeup delay-4 landing-hero-stats" style={{
            display: 'flex', gap: '32px', marginTop: '8px',
            paddingTop: '28px', borderTop: '1px solid var(--border)',
          }}>
            {stats.map(s => (
              <div key={s.value}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Visual card */}
        <div className="animate-fadeup delay-2 landing-hero-visual-wrap" style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}

function HeroVisual() {
  return (
    <div className="landing-hero-visual" style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
      {/* Main card */}
      <div className="landing-hero-card" style={{
        background: 'var(--white)',
        borderRadius: 20,
        padding: '28px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        animation: 'float 4s ease-in-out infinite',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 18,
          }}>R</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)' }}>Riya Sharma</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>B.Tech CSE</div>
          </div>
          <div style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: 'white', padding: '4px 12px',
            borderRadius: '100px', fontSize: 13, fontWeight: 700,
          }}>TrustScore™ 87</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {['React', 'Node.js', 'UI Design', 'Python'].map(skill => (
            <span key={skill} style={{
              background: 'var(--primary-light)', color: 'var(--primary)',
              padding: '4px 12px', borderRadius: '100px',
              fontSize: 13, fontWeight: 600,
            }}>{skill}</span>
          ))}
        </div>

        <div style={{
          background: 'var(--bg)', borderRadius: 12, padding: '16px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            New Match Found
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)', marginBottom: 4 }}>
            Gupta Electronics · Jamshedpur
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Needs: React Dashboard · ₹8,000/mo
          </div>
          <div style={{
            marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }} />
              <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>97% skill match</span>
            </div>
            <button style={{
              background: 'var(--primary)', color: 'white',
              padding: '6px 16px', borderRadius: 6,
              fontSize: 13, fontWeight: 600, border: 'none',
            }}>Apply</button>
          </div>
        </div>
      </div>

      {/* Floating badge top-right */}
      <div className="landing-hero-badge landing-hero-badge-top" style={{
        position: 'absolute', top: -16, right: -16,
        background: 'var(--accent)', color: 'white',
        padding: '10px 16px', borderRadius: 12,
        fontSize: 13, fontWeight: 700,
        boxShadow: '0 4px 16px rgba(249,115,22,0.4)',
        animation: 'float 3s ease-in-out infinite',
        animationDelay: '0.5s',
      }}>
        ✓ Skill Verified
      </div>

      {/* Floating badge bottom-left */}
      <div className="landing-hero-badge landing-hero-badge-bottom" style={{
        position: 'absolute', bottom: -16, left: -16,
        background: 'var(--white)', color: 'var(--dark)',
        padding: '10px 16px', borderRadius: 12,
        fontSize: 13, fontWeight: 700,
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        animation: 'float 3.5s ease-in-out infinite',
        animationDelay: '1s',
      }}>
        🎯 3 New Opportunities
      </div>
    </div>
  )
}
