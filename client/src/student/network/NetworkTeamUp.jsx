import { useRef, useState } from 'react'
import { Check, Lock, Plus, Rocket, Send, Trash2, UserRoundCheck, Users, X } from 'lucide-react'
import { createNetworkTeamPost, decideNetworkTeamInvitation, decideNetworkTeamRequest, deleteNetworkTeamPost, joinNetworkTeamPost, updateNetworkTeamPost, withdrawNetworkTeamRequest } from '../studentApi'
import { toast } from '../../ui/toast'
import { useNetworkState } from './NetworkContext'

const EMPTY_FORM = { title: '', description: '', type: 'Project', requiredSkills: '', slots: 2 }
const TEAM_TYPES = ['Project', 'Hackathon', 'Research', 'Open Source', 'Case Study', 'Startup', 'Study Group', 'Design Challenge', 'Data Challenge', 'Competition', 'Community Initiative', 'Content Collaboration']
const Status = ({ value }) => <span className={`network-status is-${String(value).toLowerCase().replaceAll(' ', '-')}`}>{value}</span>

function TeamTypePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  return <div ref={pickerRef} className="network-skill-picker network-team-type-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="network-skill-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>{value}<span>v</span></button>
    {open && <div className="network-skill-options" role="listbox" aria-label="Team-up type">
      {TEAM_TYPES.map(type => <button key={type} type="button" role="option" aria-selected={type === value} onClick={() => { onChange(type); setOpen(false) }}>{type}</button>)}
    </div>}
  </div>
}

export default function NetworkTeamUp() {
  const { networkState, reload, token } = useNetworkState()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [joinPost, setJoinPost] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const openPosts = networkState?.openTeamPosts || []
  const myPosts = networkState?.myTeamPosts || []
  const sent = networkState?.sentTeamRequests || []
  const invitations = networkState?.incomingTeamInvitations || []

  async function act(key, operation, success) {
    setBusy(key)
    try { await operation(); await reload({ quiet: true }); if (success) toast.success(success); return true }
    catch (error) { toast.error(error.message || 'Could not update this team-up.') ; return false }
    finally { setBusy('') }
  }
  async function create(event) {
    event.preventDefault()
    const completed = await act('create', () => createNetworkTeamPost(token, { ...form, requiredSkills: form.requiredSkills.split(',') }), 'Team-up published.')
    if (!completed) return
    setForm(EMPTY_FORM); setShowForm(false)
  }
  async function join(post) {
    const completed = await act(`join-${post.id}`, () => joinNetworkTeamPost(token, post.id, message), 'Join request sent.')
    if (!completed) return
    setJoinPost(''); setMessage('')
  }

  return <div className="network-page">
    <header className="network-page-header"><div><span>Collaboration board</span><h1>Build a team around real work</h1><p>Publish a clear need, review applicants, and keep membership synchronized.</p></div><button className="btn-primary" onClick={() => setShowForm(value => !value)}><Plus size={16}/>Create team-up</button></header>
    {showForm && <form className="network-team-form" onSubmit={create}><div className="network-form-grid"><label>Title<input required minLength="5" maxLength="120" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Build a campus event platform"/></label><label>Type<TeamTypePicker value={form.type} onChange={type => setForm({ ...form, type })} /></label><label>Required skills<input required value={form.requiredSkills} onChange={event => setForm({ ...form, requiredSkills: event.target.value })} placeholder="React, Node.js, UI/UX"/></label><label>Open slots<input type="number" min="1" max="20" value={form.slots} onChange={event => setForm({ ...form, slots: event.target.value })}/></label></div><label>Description<textarea required minLength="20" maxLength="1200" rows="3" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Explain the outcome, expected contribution, and working timeline."/></label><div className="network-form-actions"><button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" disabled={busy === 'create'}><Send size={15}/>{busy === 'create' ? 'Publishing...' : 'Publish'}</button></div></form>}
    <div className="network-columns network-team-columns">
      <section className="network-panel"><header><div><h2>Open team-ups</h2><p>Apply to open work or respond to an invitation.</p></div><span>{openPosts.length}</span></header>
        {invitations.length > 0 && <div className="network-invitation-list">{invitations.map(post => <article key={post.id}><div><Status value="Invited"/><strong>{post.owner.name} invited you to {post.title}</strong><p>{post.description}</p></div><div><button className="network-icon-button is-accept" title="Accept invitation" aria-label={`Accept invitation to ${post.title}`} disabled={Boolean(busy)} onClick={() => act(post.id, () => decideNetworkTeamInvitation(token, post.id, post.joinRequestId, 'accept'), `You joined ${post.title}.`)}><Check size={15}/></button><button className="network-icon-button is-decline" title="Decline invitation" aria-label={`Decline invitation to ${post.title}`} disabled={Boolean(busy)} onClick={() => act(post.id, () => decideNetworkTeamInvitation(token, post.id, post.joinRequestId, 'decline'))}><X size={15}/></button></div></article>)}</div>}
        <div className="network-post-list">{openPosts.map(post => <article className="network-post" key={post.id}><div className="network-post-top"><div><Status value={post.type}/><h3>{post.title}</h3><p>by {post.owner.name} · TrustScore {post.owner.trustScore}</p></div><strong>{post.filled}/{post.slots}</strong></div><p>{post.description}</p><div className="network-tags">{post.requiredSkills.map(skill => <span key={skill}>{skill}</span>)}</div>{post.requestSource === 'invitation' && post.joinStatus === 'pending' ? <span className="network-invite-pending"><Rocket size={14}/>Invitation waiting above</span> : post.joinStatus === 'pending' ? <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => act(post.id, () => withdrawNetworkTeamRequest(token, post.id))}><X size={14}/>Withdraw request</button> : post.joinStatus === 'accepted' ? <span className="network-accepted"><Check size={14}/>You joined this team</span> : joinPost === post.id ? <div className="network-join-box"><textarea autoFocus rows="2" minLength="10" maxLength="500" value={message} onChange={event => setMessage(event.target.value)} placeholder="Explain what you can contribute."/><div><button className="btn-secondary" onClick={() => { setJoinPost(''); setMessage('') }}>Cancel</button><button className="btn-primary" disabled={message.trim().length < 10 || Boolean(busy)} onClick={() => join(post)}><Send size={14}/>Send</button></div></div> : <button className="btn-primary" onClick={() => setJoinPost(post.id)}><UserRoundCheck size={14}/>Request to join</button>}</article>)}{!openPosts.length && !invitations.length && <div className="network-empty"><Users size={22}/><strong>No open team-ups</strong></div>}</div>
      </section>
      <section className="network-panel"><header><div><h2>My team-ups</h2><p>Manage posts and applicant decisions.</p></div><span>{myPosts.length}</span></header><div className="network-post-list">{myPosts.map(post => <article className="network-post" key={post.id}><div className="network-post-top"><div><Status value={post.status}/><h3>{post.title}</h3></div><strong>{post.filled}/{post.slots}</strong></div><div className="network-tags">{post.requiredSkills.map(skill => <span key={skill}>{skill}</span>)}</div><div className="network-owner-actions"><button className="btn-secondary" disabled={Boolean(busy)} onClick={() => act(post.id, () => updateNetworkTeamPost(token, post.id, { status: post.status === 'open' ? 'closed' : 'open' }))}>{post.status === 'open' ? <><Lock size={14}/>Close</> : 'Reopen'}</button>{post.filled === 0 && <button className="network-icon-button is-decline" title="Delete" aria-label={`Delete ${post.title}`} disabled={Boolean(busy)} onClick={() => act(post.id, () => deleteNetworkTeamPost(token, post.id))}><Trash2 size={15}/></button>}</div>{post.requests.filter(request => request.status === 'pending' && request.source === 'application').map(request => <div className="network-applicant" key={request.id}><div><strong>{request.student.name}</strong><span>TrustScore {request.student.trustScore}</span><p>{request.message}</p></div><div><button className="network-icon-button is-accept" title="Accept" aria-label={`Accept ${request.student.name}`} disabled={Boolean(busy)} onClick={() => act(request.id, () => decideNetworkTeamRequest(token, post.id, request.id, 'accept'), `${request.student.name} joined your team.`)}><Check size={15}/></button><button className="network-icon-button is-decline" title="Decline" aria-label={`Decline ${request.student.name}`} disabled={Boolean(busy)} onClick={() => act(request.id, () => decideNetworkTeamRequest(token, post.id, request.id, 'decline'))}><X size={15}/></button></div></div>)}{post.members?.length > 0 && <div className="network-member-list"><small>Members</small>{post.members.map(member => <span key={member.id}>{member.name}</span>)}</div>}</article>)}{!myPosts.length && <div className="network-empty"><Plus size={22}/><strong>Create your first team-up</strong></div>}</div></section>
    </div>
    {sent.length > 0 && <section className="network-panel network-sent-team"><header><div><h2>My join requests</h2><p>Status updates from team owners.</p></div><span>{sent.length}</span></header><div className="network-request-strip">{sent.map(post => <article key={post.id}><Status value={post.joinStatus}/><strong>{post.title}</strong><span>{post.owner.name}</span></article>)}</div></section>}
  </div>
}
