export default function StudentNav({
  avatar,
  name,
  trustScore,
  onOpenProfile,
  onToggleSidebar,
}) {
  return (
    <nav className="dashboard-nav" style={{
      height: 52, background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="mobile-only mobile-menu-toggle" onClick={onToggleSidebar} aria-label="Open student workspace navigation">
          ☰
        </button>
        <img
          src="/logo.png"
          alt="SkillBridge logo"
          style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}
        />
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--dark)', letterSpacing: '-0.02em' }}>SkillBridge</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          className="dashboard-user-meta"
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenProfile()
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0,
            overflow: 'hidden',
          }}>
            {avatar
              ? <img src={avatar} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : name[0].toUpperCase()
            }
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>{name}</div>
            <div className="dashboard-user-subtitle" style={{ fontSize: 11, color: 'var(--muted)' }}>⭐TrustScore {trustScore}</div>
          </div>
        </div>
      </div>
    </nav>
  )
}
