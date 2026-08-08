const friendLinks = [
  {
    label: 'LinkedIn Profile',
    icon: 'in',
    href: 'https://www.linkedin.com/in/debarghya131',
  },
  {
    label: 'X',
    icon: 'X',
    href: 'https://x.com/debarghya131',
  },
  {
    label: 'GitHub',
    icon: 'GH',
    href: 'https://github.com/debarghya131',
  },
  {
    label: 'Portfolio',
    icon: '↗',
    href: 'https://portfolio.debarghya.org',
  },
  {
    label: 'Email',
    icon: '@',
    href: 'mailto:debarghyabandyopadhyay191@gmail.com',
  },
]

const footerLinkStyle = {
  fontSize: 14,
  transition: 'color 0.2s',
}

const socialLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: 'fit-content',
  marginBottom: 10,
  fontSize: 14,
  transition: 'color 0.2s',
}

const iconStyle = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.1)',
  color: 'white',
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
  flexShrink: 0,
}

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--dark)',
      color: 'rgba(255,255,255,0.7)',
      padding: '60px 0 32px',
    }}>
      <div className="container">
        <div className="landing-footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1.45fr 0.85fr 0.85fr 0.85fr 1.35fr',
          gap: '36px',
          marginBottom: '48px',
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <img
                src="/logo.png"
                alt="SkillBridge logo"
                style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <span style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>
                SkillBridge
              </span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.75, maxWidth: 280 }}>
              Bridging the opportunity gap between Tier-2/3 students and local businesses.
              Merit over pedigree.
            </p>
          </div>

          {/* Links */}
          <div>
            <div style={{ color: 'white', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Platform</div>
            {['Features', 'How it Works', 'TrustScore', 'SkillProof'].map(l => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#" style={footerLinkStyle}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Students</div>
            {['Get Started', 'Browse Gigs', 'Build Portfolio', 'Skill Challenges'].map(l => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#" style={footerLinkStyle}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Companies</div>
            {['Post a Project', 'Find Talent', 'Pricing', 'Contact Us'].map(l => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#" style={footerLinkStyle}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>{l}</a>
              </div>
            ))}
          </div>

          <div>
            <div style={{ color: 'white', fontWeight: 800, marginBottom: 10, fontSize: 15 }}>
              Be My Friend
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 16, maxWidth: 240 }}>
              I always like to make new friends. Follow me on
            </p>
            {friendLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={link.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                style={socialLinkStyle}
                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              >
                <span style={iconStyle}>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="landing-footer-bottom" style={{
          paddingTop: 28,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 13 }}>© 2025 SkillBridge. Built for Hackathon.</div>
          <div style={{ fontSize: 13 }}>Bridging merit, not privilege.</div>
        </div>
      </div>
    </footer>
  )
}
