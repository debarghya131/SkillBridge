import { useMemo, useRef, useState } from 'react'
import { Check, Clock3, Rocket, Search, UserPlus, Users, X } from 'lucide-react'
import { fetchNetworkProfile, inviteNetworkStudentToTeam, sendNetworkConnection } from '../studentApi'
import { toast } from '../../ui/toast'
import { useNetworkState } from './NetworkContext'
import NetworkProfileModal from '../../ui/PublicStudentProfile'

function NetworkSkillPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  return <div ref={pickerRef} className="network-skill-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="network-skill-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>{value}<span>v</span></button>
    {open && <div className="network-skill-options" role="listbox" aria-label="Filter by skill">
      {options.map(option => <button key={option} type="button" role="option" aria-selected={option === value} onClick={() => { onChange(option); setOpen(false) }}>{option}</button>)}
    </div>}
  </div>
}

export default function NetworkHome() {
  const { networkState, reload, token, setActiveTab } = useNetworkState()
  const [query, setQuery] = useState('')
  const [skill, setSkill] = useState('All skills')
  const [busy, setBusy] = useState('')
  const [profile, setProfile] = useState(null)
  const profileRequest = useRef(0)
  const [invitePerson, setInvitePerson] = useState(null)
  const [invitePostId, setInvitePostId] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const people = useMemo(() => networkState?.suggestions || [], [networkState?.suggestions])
  const skills = useMemo(() => ['All skills', ...new Set(people.flatMap(person => person.skills || []))], [people])
  const filtered = people.filter(person => {
    const term = query.trim().toLowerCase()
    const matchesText = !term || [person.name, person.role, person.location, ...(person.skills || [])].some(value => String(value).toLowerCase().includes(term))
    return matchesText && (skill === 'All skills' || person.skills?.includes(skill))
  })
  const openOwnPosts = (networkState?.myTeamPosts || []).filter(post => post.status === 'open' && post.filled < post.slots)

  async function viewProfile(person) {
    const request = ++profileRequest.current
    setBusy(`profile-${person.id}`)
    setProfile({ ...person, practiceDays: 0, trustStreak: 0, completedGigs: 0, teamUps: 0, loading: true })
    try {
      const response = await fetchNetworkProfile(token, person.id)
      if (request === profileRequest.current) setProfile({ ...response.profile, loading: false })
    } catch (error) {
      if (request === profileRequest.current) {
        setProfile(null)
        toast.error(error.message || 'Could not load the current profile. Please try again.')
      }
    }
    finally { if (request === profileRequest.current) setBusy('') }
  }

  async function connect(person) {
    if (person.relationship.status === 'incoming_pending') { setActiveTab('my-network'); return }
    setBusy(`connect-${person.id}`)
    try {
      await sendNetworkConnection(token, person.id)
      await reload({ quiet: true })
      toast.success(`Connection request sent to ${person.name}.`)
    } catch (error) { toast.error(error.message || 'Could not send the connection request.') }
    finally { setBusy('') }
  }

  function openInvite(person) {
    if (!openOwnPosts.length) {
      toast.info('Create an open team-up before inviting students.')
      setActiveTab('team-up')
      return
    }
    setInvitePerson(person)
    setInvitePostId(openOwnPosts[0].id)
    setInviteMessage(`I would like you to join this team based on your ${person.skills?.[0] || 'project'} experience.`)
  }

  async function sendInvite() {
    setBusy(`invite-${invitePerson.id}`)
    try {
      await inviteNetworkStudentToTeam(token, invitePostId, invitePerson.id, inviteMessage)
      await reload({ quiet: true })
      toast.success(`Team invitation sent to ${invitePerson.name}.`)
      setInvitePerson(null)
    } catch (error) { toast.error(error.message || 'Could not send the team invitation.') }
    finally { setBusy('') }
  }

  return <div className="network-page">
    <header className="network-page-header"><div><span>Peer discovery</span><h1>Find students by proven skills</h1><p>Profiles come from active SkillBridge accounts and update with their verified work.</p></div><div className="network-header-stat"><Users size={18}/><strong>{people.length}</strong><small>available peers</small></div></header>
    <div className="network-toolbar"><label><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, location, or skill" /></label><NetworkSkillPicker value={skill} options={skills} onChange={setSkill} /></div>
    <div className="network-card-grid">{filtered.map(person => {
      const status = person.relationship.status
      const requestSent = status === 'outgoing_pending'
      return <article className="network-person-card" key={person.id}>
        <header><div className="network-avatar">{person.avatar ? <img src={person.avatar} alt=""/> : person.name[0]}</div><div><h2>{person.name}</h2><p>{person.role}</p></div><span className="network-score">{person.trustScore}</span></header>
        <p className="network-location">{person.location}</p><div className="network-tags">{person.skills.slice(0, 5).map(item => <span key={item}>{item}</span>)}</div>
        <div className="network-card-actions"><button className="btn-secondary" disabled={busy === `profile-${person.id}`} onClick={() => viewProfile(person)}>View profile</button><button className="btn-primary" disabled={requestSent || Boolean(busy)} onClick={() => connect(person)}>{status === 'outgoing_pending' ? <><Clock3 size={14}/>Sent</> : status === 'incoming_pending' ? <><Check size={14}/>Respond</> : <><UserPlus size={14}/>Connect</>}</button><button className="network-team-invite-button" disabled={Boolean(busy)} onClick={() => openInvite(person)}><Rocket size={14}/>Invite to Team-Up</button></div>
      </article>
    })}</div>
    {!filtered.length && <div className="network-empty"><Search size={22}/><strong>No matching students</strong><p>Change the search or skill filter.</p></div>}
    <NetworkProfileModal key={profile?.id || 'closed'} profile={profile} loading={profile?.loading} onClose={() => { profileRequest.current++; setProfile(null) }}/>
    {invitePerson && <div className="network-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setInvitePerson(null)}><section className="network-invite-modal" role="dialog" aria-modal="true" aria-labelledby="network-invite-title"><header><div><span>Direct invitation</span><h2 id="network-invite-title">Invite {invitePerson.name}</h2></div><button className="network-icon-button" title="Close" aria-label="Close invitation" onClick={() => setInvitePerson(null)}><X size={17}/></button></header><label>Team-up<select value={invitePostId} onChange={event => setInvitePostId(event.target.value)}>{openOwnPosts.map(post => <option value={post.id} key={post.id}>{post.title} ({post.slots - post.filled} open)</option>)}</select></label><label>Message<textarea rows="3" minLength="10" maxLength="500" value={inviteMessage} onChange={event => setInviteMessage(event.target.value)}/></label><footer><button className="btn-secondary" onClick={() => setInvitePerson(null)}>Cancel</button><button className="btn-primary" disabled={inviteMessage.trim().length < 10 || Boolean(busy)} onClick={sendInvite}><Rocket size={14}/>Send invitation</button></footer></section></div>}
  </div>
}
