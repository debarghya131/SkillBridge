import { useRef, useState } from 'react'
import { Check, Clock3, UserMinus, Users, X } from 'lucide-react'
import { decideNetworkConnection, fetchNetworkProfile, removeNetworkConnection } from '../studentApi'
import { toast } from '../../ui/toast'
import { useNetworkState } from './NetworkContext'
import NetworkProfileModal from '../../ui/PublicStudentProfile'

function PersonRow({ person, actions }) {
  if (!person) return null
  return <article className="network-list-row"><div className="network-avatar">{person.avatar ? <img src={person.avatar} alt=""/> : person.name[0]}</div><div className="network-list-main"><strong>{person.name}</strong><span>{person.role} · {person.location}</span><div className="network-tags">{person.skills?.slice(0, 4).map(skill => <span key={skill}>{skill}</span>)}</div></div><span className="network-score">{person.trustScore}</span><div className="network-row-actions">{actions}</div></article>
}

export default function MyNetwork() {
  const { networkState, reload, token } = useNetworkState()
  const [busy, setBusy] = useState('')
  const [profile, setProfile] = useState(null)
  const profileRequest = useRef(0)
  const connected = networkState?.connected || []
  const incoming = networkState?.incomingConnections || []
  const outgoing = networkState?.outgoingConnections || []

  async function action(key, operation, message) {
    setBusy(key)
    try { await operation(); await reload({ quiet: true }); if (message) toast.success(message) }
    catch (error) { toast.error(error.message || 'Could not update this network request.') }
    finally { setBusy('') }
  }
  async function view(person) {
    const request = ++profileRequest.current
    setBusy(`profile-${person.id}`)
    setProfile(null)
    try {
      const response = await fetchNetworkProfile(token, person.id)
      if (request === profileRequest.current) setProfile(response.profile)
    } catch (error) {
      if (request === profileRequest.current) toast.error(error.message || 'Could not load the current profile. Please try again.')
    }
    finally { if (request === profileRequest.current) setBusy('') }
  }

  return <div className="network-page">
    <header className="network-page-header"><div><span>Relationship center</span><h1>My Network</h1><p>Review requests and manage peers who can see your contact details.</p></div><div className="network-header-stat"><Users size={18}/><strong>{connected.length}</strong><small>connections</small></div></header>
    <div className="network-columns">
      <section className="network-panel"><header><div><h2>Incoming requests</h2><p>Only you can accept or decline these requests.</p></div><span>{incoming.length}</span></header><div className="network-list">{incoming.map(item => <PersonRow key={item.id} person={item.profile} actions={<><button className="network-icon-button is-accept" title="Accept" aria-label={`Accept ${item.profile.name}`} disabled={Boolean(busy)} onClick={() => action(item.id, () => decideNetworkConnection(token, item.id, 'accept'), `${item.profile.name} added to your network.`)}><Check size={16}/></button><button className="network-icon-button is-decline" title="Decline" aria-label={`Decline ${item.profile.name}`} disabled={Boolean(busy)} onClick={() => action(item.id, () => decideNetworkConnection(token, item.id, 'decline'))}><X size={16}/></button></>}/>) }{!incoming.length && <div className="network-empty is-small"><Check size={20}/><strong>You are up to date</strong></div>}</div></section>
      <section className="network-panel"><header><div><h2>Requests sent</h2><p>Pending until the other student responds.</p></div><span>{outgoing.length}</span></header><div className="network-list">{outgoing.map(item => <PersonRow key={item.id} person={item.profile} actions={<button className="btn-secondary" disabled={Boolean(busy)} onClick={() => action(item.id, () => removeNetworkConnection(token, item.id))}><X size={14}/>Cancel</button>}/>) }{!outgoing.length && <div className="network-empty is-small"><Clock3 size={20}/><strong>No pending requests</strong></div>}</div></section>
    </div>
    <section className="network-panel network-connections"><header><div><h2>Connected students</h2><p>Contact details are shared while the connection remains active.</p></div><span>{connected.length}</span></header><div className="network-card-grid">{connected.map(person => <article className="network-person-card" key={person.id}><header><div className="network-avatar">{person.avatar ? <img src={person.avatar} alt=""/> : person.name[0]}</div><div><h2>{person.name}</h2><p>{person.role}</p></div><span className="network-score">{person.trustScore}</span></header><div className="network-tags">{person.skills?.slice(0, 5).map(skill => <span key={skill}>{skill}</span>)}</div><div className="network-card-actions"><button className="btn-secondary" onClick={() => view(person)}>View profile</button><button className="network-danger-button" disabled={Boolean(busy)} onClick={() => action(person.relationship.connectionId, () => removeNetworkConnection(token, person.relationship.connectionId), `${person.name} removed from your network.`)}><UserMinus size={14}/>Remove</button></div></article>)}</div>{!connected.length && <div className="network-empty"><Users size={22}/><strong>No connections yet</strong><p>Discover students and send a connection request.</p></div>}</section>
    <NetworkProfileModal key={profile?.id || 'closed'} profile={profile} onClose={() => { profileRequest.current++; setProfile(null) }}/>
  </div>
}
