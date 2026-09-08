import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerSiteView } from './landingApi'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeHref, setActiveHref] = useState('#home')
  const [siteViews, setSiteViews] = useState(null)
  const [siteViewsLoading, setSiteViewsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    registerSiteView()
      .then(({ count }) => {
        if (active && Number.isFinite(count)) {
          setSiteViews(count)
        }
      })
      .catch(() => {
        // The navbar remains usable when the public counter is unavailable.
      })
      .finally(() => {
        if (active) {
          setSiteViewsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)

      const threshold = window.scrollY + 140
      let currentHref = '#home'

      NAV_LINKS.forEach(link => {
        const section = document.querySelector(link.href)
        if (section && section.offsetTop <= threshold) {
          currentHref = link.href
        }
      })

      setActiveHref(currentHref)
    }

    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="landing-nav-shell" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border)' : 'none',
      transition: 'all 0.3s ease',
      padding: '0',
    }}>
      <div className="container landing-nav-inner" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px',
      }}>
        <div className="landing-nav-brand">
          <Link to="/" className="landing-nav-logo">
            <img
              src="/logo.png"
              alt="SkillBridge logo"
              style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
            />
            <span className="landing-nav-wordmark" style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-0.03em' }}>
              Skill<span style={{ color: 'var(--primary)' }}>Bridge</span>
            </span>
          </Link>

          {(siteViewsLoading || siteViews !== null) && (
            <span
              className={`landing-nav-view-count${siteViewsLoading ? ' is-loading' : ''}`}
              title={siteViewsLoading ? 'Loading website views' : `${siteViews.toLocaleString('en-IN')} total website views`}
              aria-label={siteViewsLoading ? 'Loading website views' : `${siteViews.toLocaleString('en-IN')} total website views`}
              aria-busy={siteViewsLoading}
              aria-live="polite"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.2 12s3.5-6 9.8-6 9.8 6 9.8 6-3.5 6-9.8 6-9.8-6-9.8-6Z" />
                <circle cx="12" cy="12" r="2.7" />
              </svg>
              {siteViewsLoading
                ? <span className="landing-nav-view-loader" aria-hidden="true" />
                : <span>{siteViews.toLocaleString('en-IN')}</span>}
            </span>
          )}
        </div>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-nav landing-nav-desktop">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setActiveHref(link.href)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 15,
                fontWeight: activeHref === link.href ? 700 : 500,
                color: activeHref === link.href ? 'var(--primary)' : (scrolled ? 'var(--text)' : 'var(--dark)'),
                background: activeHref === link.href ? 'var(--primary-light)' : 'transparent',
                boxShadow: activeHref === link.href ? 'inset 0 -2px 0 var(--primary)' : 'none',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={e => {
                if (activeHref !== link.href) {
                  e.currentTarget.style.background = 'var(--primary-light)'
                  e.currentTarget.style.color = 'var(--primary)'
                }
              }}
              onMouseLeave={e => {
                if (activeHref !== link.href) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = scrolled ? 'var(--text)' : 'var(--dark)'
                }
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="landing-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-secondary" style={{ padding: '9px 20px', fontSize: 14 }}
            onClick={() => navigate('/student')}>
            For Student
          </button>
          <button className="btn-primary" style={{ padding: '9px 20px', fontSize: 14 }}
            onClick={() => navigate('/company')}>
            For Company
          </button>
        </div>

        <button
          className="landing-nav-mobile-toggle"
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? '×' : '☰'}
        </button>
      </div>

      <div className={`landing-nav-mobile-menu${menuOpen ? ' is-open' : ''}`}>
        <div className="container">
          <div className="landing-nav-mobile-links">
            {NAV_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => {
                  setActiveHref(link.href)
                  setMenuOpen(false)
                }}
                style={{
                  background: activeHref === link.href ? 'var(--primary-light)' : 'var(--bg)',
                  color: activeHref === link.href ? 'var(--primary)' : 'var(--text)',
                  fontWeight: activeHref === link.href ? 700 : 600,
                  borderLeft: activeHref === link.href ? '3px solid var(--primary)' : '3px solid transparent',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="landing-nav-mobile-actions">
            <button className="btn-secondary" onClick={() => { setMenuOpen(false); navigate('/student') }}>
              For Student
            </button>
            <button className="btn-primary" onClick={() => { setMenuOpen(false); navigate('/company') }}>
              For Company
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
