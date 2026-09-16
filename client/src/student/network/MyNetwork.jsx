import { useEffect, useRef, useState } from 'react'
import { Check, Clock3, UserMinus, Users, X } from 'lucide-react'
import { decideNetworkConnection, fetchNetworkProfile, removeNetworkConnection } from '../studentApi'
import { toast } from '../../ui/toast'
import { useNetworkState } from './NetworkContext'
import NetworkProfileModal from '../../ui/PublicStudentProfile'

function PersonRow({ person, actions }) {
  if (!person) return null
  return <article className="network-list-row"><div className="network-avatar">{person.avatar ? <img src={person.avatar} alt=""/> : person.name[0]}</div><div className="network-list-main"><strong>{person.name}{person.demoData && <span className="demo-data-badge">Demo</span>}<span className="network-inline-score">{person.trustScore}</span></strong><span>{person.role} · {person.location}</span><div className="network-tags">{person.skills?.slice(0, 4).map(skill => <span key={skill}>{skill}</span>)}</div></div><div className="network-row-actions">{actions}</div></article>
}

const REQUEST_PAGE_SIZE = 6
const CONNECTION_PAGE_SIZE = 12

function ShowMore({ shown, total, onShowMore, label }) {
  if (shown >= total) return null
  return <button type="button" className="network-show-more" onClick={onShowMore}>Show {Math.min(total - shown, shown)} more {label} ({total - shown} remaining)</button>
}

export default function MyNetwork() {
  const { networkState, reload, token } = useNetworkState()
  const [busy, setBusy] = useState('')
  const [profile, setProfile] = useState(null)
  const [incomingVisible, setIncomingVisible] = useState(REQUEST_PAGE_SIZE)
  const [outgoingVisible, setOutgoingVisible] = useState(REQUEST_PAGE_SIZE)
  const [connectedVisible, setConnectedVisible] = useState(CONNECTION_PAGE_SIZE)
  const profileRequest = useRef(0)
  const connected = networkState?.connected || []
  const incoming = networkState?.incomingConnections || []
  const outgoing = networkState?.outgoingConnections || []
  useEffect(() => {
    setIncomingVisible(current => Math.max(REQUEST_PAGE_SIZE, Math.min(current, incoming.length)))
  }, [incoming.length])
  useEffect(() => {
    setOutgoingVisible(current => Math.max(REQUEST_PAGE_SIZE, Math.min(current, outgoing.length)))
  }, [outgoing.length])
  useEffect(() => {
    setConnectedVisible(current => Math.max(CONNECTION_PAGE_SIZE, Math.min(current, connected.length)))
  }, [connected.length])

  async function action(key, operation, message) {
    setBusy(key)
    try { await operation(); await reload({ quiet: true }); if (message) toast.success(message) }
    catch (error) { toast.error(error.message || 'Could not update this network request.') }
    finally { setBusy('') }
  }
  function removePerson(person) {
    if (person.demoData) {
      toast.info('Demo connections are read-only and cannot be removed.', { title: 'Demo Connection' })
      return
    }
    action(person.relationship.connectionId, () => removeNetworkConnection(token, person.relationship.connectionId), `${person.name} removed from your network.`)
  }
  function decideIncoming(item, decision) {
    if (item.demoData || item.profile?.demoData) {
      toast.info('Demo connection requests are read-only and cannot be accepted or declined.', { title: 'Demo Connection' })
      return
    }
    action(item.id, () => decideNetworkConnection(token, item.id, decision), decision === 'accept' ? `${item.profile.name} added to your network.` : '')
  }
  function cancelOutgoing(item) {
    if (item.demoData || item.profile?.demoData) {
      toast.info('Demo connection requests are read-only and cannot be cancelled.', { title: 'Demo Connection' })
      return
    }
    action(item.id, () => removeNetworkConnection(token, item.id))
  }
  async function view(person) {
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

  return <div className="network-page">
    <div className="network-columns">
      <section className="network-panel"><header><div><h2>Incoming requests</h2><p>Only you can accept or decline these requests.</p></div><span>{incoming.length}</span></header><div className="network-list">{incoming.slice(0, incomingVisible).map(item => <PersonRow key={item.id} person={item.profile} actions={<><button className="network-icon-button is-accept" title="Accept" aria-label={`Accept ${item.profile.name}`} disabled={Boolean(busy)} onClick={() => decideIncoming(item, 'accept')}><Check size={16}/></button><button className="network-icon-button is-decline" title="Decline" aria-label={`Decline ${item.profile.name}`} disabled={Boolean(busy)} onClick={() => decideIncoming(item, 'decline')}><X size={16}/></button></>}/>) }{!incoming.length && <div className="network-empty is-small"><Check size={20}/><strong>You are up to date</strong></div>}<ShowMore shown={incomingVisible} total={incoming.length} label="requests" onShowMore={() => setIncomingVisible(current => current + REQUEST_PAGE_SIZE)}/></div></section>
      <section className="network-panel"><header><div><h2>Requests sent</h2><p>Pending until the other student responds.</p></div><span>{outgoing.length}</span></header><div className="network-list">{outgoing.slice(0, outgoingVisible).map(item => <PersonRow key={item.id} person={item.profile} actions={<button className="btn-secondary" disabled={Boolean(busy)} onClick={() => cancelOutgoing(item)}><X size={14}/>Cancel</button>}/>) }{!outgoing.length && <div className="network-empty is-small"><Clock3 size={20}/><strong>No pending requests</strong></div>}<ShowMore shown={outgoingVisible} total={outgoing.length} label="requests" onShowMore={() => setOutgoingVisible(current => current + REQUEST_PAGE_SIZE)}/></div></section>
    </div>
    <section className="network-panel network-connections"><header><div><h2>Connected students</h2><p>Contact details are shared while the connection remains active.</p></div><span>{connected.length}</span></header><div className="network-card-grid">{connected.slice(0, connectedVisible).map(person => <article className="network-person-card" key={person.id}><header><div className="network-avatar">{person.avatar ? <img src={person.avatar} alt=""/> : person.name[0]}</div><div><h2>{person.name}{person.demoData && <span className="demo-data-badge">Demo</span>}</h2><p>{person.role}</p></div><span className="network-score">{person.trustScore}</span></header><div className="network-tags">{person.skills?.slice(0, 5).map(skill => <span key={skill}>{skill}</span>)}</div><div className="network-card-actions"><button className="btn-secondary" onClick={() => view(person)}>View profile</button><button className="network-danger-button" disabled={Boolean(busy)} onClick={() => removePerson(person)}><UserMinus size={14}/>Remove</button></div></article>)}</div><ShowMore shown={connectedVisible} total={connected.length} label="connections" onShowMore={() => setConnectedVisible(current => current + CONNECTION_PAGE_SIZE)}/>{!connected.length && <div className="network-empty"><Users size={22}/><strong>No connections yet</strong><p>Discover students and send a connection request.</p></div>}</section>
    <NetworkProfileModal key={profile?.id || 'closed'} profile={profile} loading={profile?.loading} onClose={() => { profileRequest.current++; setProfile(null) }}/>
  </div>
}
