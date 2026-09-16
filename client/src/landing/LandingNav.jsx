import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Eye, Menu, X } from 'lucide-react'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import { registerSiteView } from './landingApi'
const links = [
  ['The opportunity gap', '#opportunity-gap'],
  ['How it works', '#how-it-works'],
  ['Inside SkillBridge', '#features']
]
export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const [siteViews, setSiteViews] = useState(null)
  const nav = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    let active = true
    registerSiteView()
      .then(({ count }) => {
        if (active) setSiteViews(Number(count) || 0)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!open) return
    const dismiss = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      } else if (
        event.type === 'pointerdown' &&
        !nav.current?.contains(event.target)
      )
        setOpen(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [open])
  return (
    <header className="sb-nav" ref={nav}>
      <div className="sb-wrap sb-nav-inner">
        <SkillBridgeBrand linkTo="/" className="sb-brand" />
        <div
          className={`sb-site-metric${siteViews === null ? ' is-loading' : ''}`}
          aria-label={siteViews === null ? 'Loading page views' : `${siteViews.toLocaleString()} page views`}
          title="Page views"
        >
          <Eye size={15} aria-hidden="true" />
          {siteViews === null ? <span className="sb-site-metric-loader" aria-hidden="true" /> : <strong>{siteViews.toLocaleString()}</strong>}
          <span>views</span>
        </div>
        <nav className="sb-desktop-links" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="sb-nav-actions">
          <Link to="/login" className="sb-login">
            Log in
          </Link>
          <Link to="/student?mode=signup" className="sb-button sb-button-small">
            Get started <ArrowUpRight size={16} />
          </Link>
        </div>
        <button
          ref={trigger}
          className="sb-menu-toggle"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="sb-mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <nav
        id="sb-mobile-nav"
        className="sb-mobile-links"
        aria-label="Mobile navigation"
        hidden={!open}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget) &&
            event.relatedTarget !== trigger.current
          )
            setOpen(false)
        }}
      >
        {links.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
            <ArrowUpRight size={16} />
          </a>
        ))}
        <Link to="/student?mode=signup">Join as a student</Link>
        <Link to="/company?mode=signup">Join as an organization</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </header>
  )
}
