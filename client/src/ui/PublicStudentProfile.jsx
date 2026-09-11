import { useEffect, useRef, useState } from 'react'
import { X, ShieldCheck, Star, MapPin, CalendarDays, Flame, BriefcaseBusiness, Users, Mail, Fingerprint, Video } from 'lucide-react'
import PublicProfileHeatmap from './PublicProfileHeatmap'
import { safeExternalUrl, safeVideoUrl } from '../lib/safeExternalUrl'
import './PublicStudentProfile.css'

export default function PublicStudentProfile({ profile, onClose, action }) {
  const [level, setLevel] = useState('All')
  const close = useRef(null)
  useEffect(() => {
    if (!profile) return undefined
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    close.current?.focus()
    const key = event => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const nodes = [...close.current.closest('[role="dialog"]').querySelectorAll('button, a[href], video[controls], [tabindex="0"]')].filter(node => !node.disabled)
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', key); previous?.focus?.() }
  }, [profile, onClose])
  if (!profile) return null
  const skills = (profile.skills || []).filter(s => level === 'All' || (s.verified && s.stage === level))
  const video = safeVideoUrl(profile.videoUrl)
  return <div className="public-profile-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="public-profile" role="dialog" aria-modal="true" aria-label={`${profile.name} profile`}>
      <header><div className="public-profile-avatar">{profile.avatar ? <img src={profile.avatar} alt=""/> : profile.name?.[0]}</div><div><h2>{profile.name}</h2><div className="public-profile-score"><span><Star size={15} fill="currentColor"/><strong>{profile.trustScore}</strong><small>/ 1000</small></span><small>TrustScore</small></div><p className="public-profile-location"><MapPin size={13}/>{profile.location || 'Location not provided'}</p>
        <div className="public-profile-metrics"><span><CalendarDays size={13}/>{profile.practiceDays} practice days</span><span><Flame size={13}/>{profile.trustStreak} Trust Streak</span><span><BriefcaseBusiness size={13}/>{profile.completedGigs} completed GIGs</span><span><Users size={13}/>{profile.teamUps} team-ups</span></div>
      </div><button ref={close} onClick={onClose} aria-label="Close profile" title="Close profile"><X size={18}/></button></header>
      <div className="public-profile-body">
        <section className="public-profile-account"><h3><Fingerprint size={16}/>Account details</h3><div><p><Mail size={15}/>{({ email: 'Registered via College Email', phone: 'Registered via Phone Number' })[profile.contactMethod] || 'Registration method unavailable'}</p><p><Fingerprint size={15}/>{({ aadhaar: 'Identity method: Aadhaar Card', digilocker: 'Identity method: DigiLocker' })[profile.verificationMethod] || 'Identity method unavailable'}</p></div></section>
        <section><div className="public-profile-section-heading"><h3><ShieldCheck size={16}/>Skills</h3><div className="public-profile-filters">{['All', 'Pro', 'Intermediate', 'Beginner'].map(v => <button key={v} aria-pressed={level === v} onClick={() => setLevel(v)}>{v}</button>)}</div></div><div className="public-profile-skills">{skills.map(s => <span key={s.name}><strong>{s.name}</strong> {s.verified ? <><ShieldCheck size={13}/><small data-level={s.stage}>{s.stage}</small>{s.streak > 0 && <small className="public-profile-skill-streak"><Flame size={11}/>{s.streak}d</small>}</> : <small className="public-profile-skill-status">{s.renewalStatus === 'expired' ? 'Expired' : 'Unverified'}</small>}</span>)}</div>{!skills.length && <p>No skills in this category.</p>}</section>
        <PublicProfileHeatmap key={profile.id} activityDays={profile.activityDays}/>
        <section><h3><Video size={16}/>Intro video</h3>{video ? <video controls src={video}/> : <p className="public-profile-empty"><Video size={23}/>No video uploaded.</p>}</section>
        <section><h3>Profile links</h3>{profile.githubLink?.filter(l => safeExternalUrl(l.url)).map(l => <p key={l.url}><a href={safeExternalUrl(l.url)} target="_blank" rel="noreferrer">{l.url}</a></p>)}{!profile.githubLink?.length && <p>No links published.</p>}</section>
        <section><h3>Contact</h3>{profile.contactVisible ? profile.contactInfo?.length ? profile.contactInfo.map((c, i) => <p key={i}><strong>{c.label}</strong><br/>{c.value}</p>) : <p>No contact details published.</p> : <p>Contact details become available after both students connect.</p>}</section>
        <section><h3>Projects</h3><div className="public-profile-projects">{profile.projects?.map((p,i) => <article key={i}><h4>{p.name}</h4><p>{p.desc}</p>{safeExternalUrl(p.link) && <a href={safeExternalUrl(p.link)} target="_blank" rel="noreferrer">View project</a>}{safeExternalUrl(p.demoLink) && <a href={safeExternalUrl(p.demoLink)} target="_blank" rel="noreferrer">Open demo</a>}</article>)}</div>{!profile.projects?.length && <p>No projects published.</p>}</section>
      </div><footer><button onClick={onClose}>Close</button>{action}</footer>
    </section>
  </div>
}
