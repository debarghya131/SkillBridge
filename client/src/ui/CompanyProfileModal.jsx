import { createElement, useEffect, useRef } from 'react'
import { X, MapPin, Globe, Mail, Phone, Building2, Users, BriefcaseBusiness, Fingerprint } from 'lucide-react'
import CompanyLogo from './CompanyLogo'
import { safeExternalUrl } from '../lib/safeExternalUrl'
import './CompanyProfileModal.css'

export default function CompanyProfileModal({ profile, gig, onClose, loading, error, onRetry }) {
  const close = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    close.current?.focus()
    const key = event => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const nodes = [...close.current.closest('[role="dialog"]').querySelectorAll('button, a[href], summary')].filter(node => !node.disabled)
        if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus() }
        else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', key); previous?.focus?.() }
  }, [onClose])
  const company = profile || {}
  const name = company.businessName || gig?.company || 'Business profile'
  const website = safeExternalUrl(company.website)
  const phone = String(company.contactPhone || '').replace(/[^+\d]/g, '')
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.contactEmail || '') ? company.contactEmail : ''
  const skills = gig ? gig.tags || [] : String(company.requiredSkills || '').split(',').map(item => item.trim()).filter(Boolean)
  const modes = gig ? gig.workMode : company.workModes?.join(' · ')
  return <div className="company-profile-overlay" onClick={event => event.target === event.currentTarget && onClose()}>
    <section className="company-profile-dialog" role="dialog" aria-modal="true" aria-label={`${name} details`}>
      <header className="company-profile-heading"><CompanyLogo logo={profile ? company.logo : gig?.companyLogo} name={name} size={50}/>
        <div><small>{gig ? 'Company details' : 'Business profile'}</small><h2>{name}</h2><p><MapPin size={13}/>{company.location || 'Location not provided'}</p>
          {company.workModes?.length > 0 && <div className="company-profile-modes">{company.workModes.map(mode => <span key={mode}>{mode}</span>)}</div>}
        </div><button ref={close} className="company-profile-close" aria-label="Close company profile" title="Close company profile" onClick={onClose}><X size={18}/></button>
      </header>
      <div className="company-profile-body">
        {gig && <section><h3 className="company-profile-role">{gig.title}</h3><dl className="company-profile-facts">{[
          ['Budget', gig.budget || 'Not specified'], ['Work mode', modes || 'Not specified'],
          ['Posted', gig.posted || gig.postedOn || 'Not specified'], ['Status', gig.progress || String(gig.status || 'Open for applications').replace(/_/g, ' ')],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
        {skills.length > 0 && <section><h3>Required skills</h3><div className="company-profile-skills">{skills.map(skill => <span key={skill}>{skill}</span>)}</div></section>}
        {loading && <p role="status">Loading company profile...</p>}
        {error && <div role="alert" className="company-profile-error"><p>{error}</p><button onClick={onRetry}>Retry</button></div>}
        {profile && <>
          <section><h3>Company profile</h3><dl className="company-profile-info">{[
            [Building2, 'Industry', company.industry], [Users, 'Team size', company.teamSize], [BriefcaseBusiness, 'Hiring', company.hiringCategories],
          ].filter(([, , value]) => value).map(([IconComponent, label, value]) => <div key={label}><dt>{createElement(IconComponent, { size: 15 })}{label}</dt><dd>{value}</dd></div>)}</dl>
            <p>{company.description || 'No company description published.'}</p>
          </section>
          <section><details className="company-profile-account"><summary><Fingerprint size={16}/>Account details</summary>
            <p>Registered via {({ email: 'Business Email', phone: 'Phone Number' })[company.contactMethod] || 'unavailable method'}</p>
            <p>Business identity method: {({ gstin: 'GSTIN', udyam: 'Udyam' })[company.verificationMethod] || 'Not provided'}</p>
          </details></section>
          <section><h3>Company contact</h3><div className="company-profile-contact">
            {website && <a href={website} target="_blank" rel="noreferrer"><Globe size={15}/>Website</a>}
            {email && <a href={`mailto:${email}`}><Mail size={15}/>Email company</a>}
            {phone.length >= 7 && <a href={`tel:${phone}`}><Phone size={15}/>Call {company.contactPhone}</a>}
          </div>{!website && !email && phone.length < 7 && <p>No contact details published.</p>}</section>
        </>}
      </div><footer><button onClick={onClose}>Close {gig ? 'Details' : 'Profile'}</button></footer>
    </section>
  </div>
}
