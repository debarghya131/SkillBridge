import { useEffect, useRef } from 'react'
import { BadgeCheck, ExternalLink, LockKeyhole, MapPin, X } from 'lucide-react'
import { safeExternalUrl } from '../../lib/safeExternalUrl'

export default function NetworkProfileModal({ profile, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const close = event => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  if (!profile) return null
  return <div className="network-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="network-profile-modal" role="dialog" aria-modal="true" aria-labelledby="network-profile-name">
      <header>
        <div className="network-avatar is-large">{profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name?.[0]?.toUpperCase()}</div>
        <div><div className="network-profile-name"><h2 id="network-profile-name">{profile.name}</h2>{profile.verified && <BadgeCheck size={17}/>}</div><p>{profile.role}</p><span><MapPin size={13}/>{profile.location}</span></div>
        <div className="network-profile-score"><strong>{profile.trustScore}</strong><small>TrustScore</small></div>
        <button ref={closeRef} className="network-icon-button" aria-label="Close profile" title="Close" onClick={onClose}><X size={18}/></button>
      </header>
      <div className="network-profile-body">
        <section><h3>Verified skills</h3><div className="network-tags">{profile.skills?.length ? profile.skills.map(skill => <span key={skill}>{skill}</span>) : <p>No verified skills published.</p>}</div></section>
        {profile.videoUrl && <section><h3>Introduction</h3><video controls preload="metadata" src={profile.videoUrl}/></section>}
        <section><h3>Projects</h3><div className="network-project-grid">{profile.projects?.length ? profile.projects.map((project, index) => <article key={`${project.name}-${index}`}><strong>{project.name || 'Untitled project'}</strong><p>{project.desc || 'No description provided.'}</p>{safeExternalUrl(project.link) && <a href={safeExternalUrl(project.link)} target="_blank" rel="noreferrer">Open project <ExternalLink size={13}/></a>}</article>) : <p>No projects published.</p>}</div></section>
        <section><h3>Profile links</h3>{profile.githubLink?.length ? profile.githubLink.map((link, index) => <a className="network-profile-link" key={`${link.url}-${index}`} href={safeExternalUrl(link.url)} target="_blank" rel="noreferrer">{link.url}<ExternalLink size={13}/></a>) : <p>No links published.</p>}</section>
        <section><h3>Contact</h3>{profile.contactVisible ? <div className="network-contact-list">{profile.contactInfo?.length ? profile.contactInfo.map((item, index) => <div key={`${item.label}-${index}`}><small>{item.label}</small><strong>{item.value}</strong></div>) : <p>No contact details published.</p>}</div> : <div className="network-private-note"><LockKeyhole size={15}/>Contact details become available after both students connect.</div>}</section>
      </div>
    </section>
  </div>
}
