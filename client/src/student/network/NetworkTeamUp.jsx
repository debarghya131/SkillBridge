import { useMemo, useRef, useState } from 'react'
import { BriefcaseBusiness, Check, ChevronDown, Clock3, Lock, Pencil, Plus, Rocket, Search, Send, Trash2, UserPlus, UserRoundCheck, Users, X } from 'lucide-react'
import { createNetworkTeamPost, decideNetworkTeamInvitation, decideNetworkTeamRequest, deleteNetworkTeamPost, inviteNetworkStudentToTeam, joinNetworkTeamPost, leaveNetworkTeamPost, sendNetworkConnection, updateNetworkTeamPost, withdrawNetworkTeamRequest } from '../studentApi'
import { toast } from '../../ui/toast'
import { useNetworkState } from './NetworkContext'
import NetworkProfileModal from '../../ui/PublicStudentProfile'

const EMPTY_FORM = { title: '', description: '', type: 'Project', requiredSkills: '', slots: 2 }
const TEAM_TYPES = ['Project', 'Hackathon', 'Research', 'Open Source', 'Case Study', 'Startup', 'Study Group', 'Design Challenge', 'Data Challenge', 'Competition', 'Community Initiative', 'Content Collaboration']
const PAGE_SIZE = 6
const Status = ({ value }) => <span className={`network-status is-${String(value).toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
const DemoBadge = ({ show }) => show ? <span className="demo-data-badge">Demo</span> : null

function TeamTypePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  return <div ref={pickerRef} className="network-skill-picker network-team-type-picker" onBlur={closeWhenFocusLeaves}>
    <button type="button" className="network-skill-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>{value}<span>v</span></button>
    {open && <div className="network-skill-options" role="listbox" aria-label="Team-up type">{TEAM_TYPES.map(type => <button key={type} type="button" role="option" aria-selected={type === value} onClick={() => { onChange(type); setOpen(false) }}>{type}</button>)}</div>}
  </div>
}

function TeamCardHeader({ post, status }) {
  return <div className="network-team-card-head"><div><span className="network-status-row"><Status value={status || post.type}/>{post.demoData && <DemoBadge show />}</span><h3>{post.title}</h3><p><span className="network-created-label">Created by</span> {post.owner?.name || 'SkillBridge student'}{Number.isFinite(post.owner?.trustScore) ? ` · TrustScore ${post.owner.trustScore}` : ''}</p></div><span className="network-team-capacity"><Users size={13}/>{post.filled}/{post.slots}</span></div>
}

function SkillTags({ skills = [] }) {
  return <div className="network-tags">{skills.map(skill => <span key={skill}>{skill}</span>)}</div>
}

function ShowMore({ visible, total, onClick }) {
  if (visible >= total) return null
  return <button type="button" className="network-show-more" onClick={onClick}>Show {Math.min(PAGE_SIZE, total - visible)} more ({total - visible} remaining)</button>
}

function TeamMember({ person, busy, onViewProfile, onConnect }) {
  const relationship = person.relationship?.status || 'none'
  const action = relationship === 'connected'
    ? <button type="button" className="btn-secondary" disabled><Check size={14}/>Connected</button>
    : relationship === 'outgoing_pending'
      ? <button type="button" className="btn-secondary" disabled><Clock3 size={14}/>Request sent</button>
      : relationship === 'incoming_pending'
        ? <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={() => onConnect(person)}><Check size={14}/>Respond</button>
        : <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={() => onConnect(person)}><UserPlus size={14}/>Connect</button>
  return <article className="network-team-member"><div className="network-avatar">{person.avatar ? <img src={person.avatar} alt=""/> : person.name?.[0]}</div><div className="network-team-member-main"><strong>{person.name}<DemoBadge show={person.demoData}/></strong><span>{person.isTeamOwner ? 'Team creator' : (person.role || 'Team member')}</span></div><div className="network-team-member-actions"><button type="button" className="btn-secondary" disabled={busy === `profile-${person.id}`} onClick={() => onViewProfile(person)}>View profile</button>{action}</div></article>
}

function TeamUpTabs({ active, onChange, counts }) {
  const tabs = [
    { key: 'explore', label: 'Explore teams', icon: Search, count: counts.explore },
    { key: 'invitations', label: 'Invitations', icon: Rocket, count: counts.invitations },
    { key: 'requests', label: 'My requests', icon: Clock3, count: counts.requests },
    { key: 'joined', label: 'Joined teams', icon: Users, count: counts.joined },
    { key: 'manage', label: 'Manage teams', icon: BriefcaseBusiness, count: counts.manage },
  ]
  return <nav className="network-team-tabs" aria-label="Team-up sections">{tabs.map(tab => <button type="button" key={tab.key} className={active === tab.key ? 'is-active' : ''} aria-current={active === tab.key ? 'page' : undefined} onClick={event => { onChange(tab.key); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }}><tab.icon size={15}/><span>{tab.label}</span><strong>{tab.count}</strong></button>)}</nav>
}

export default function NetworkTeamUp() {
  const { networkState, reload, token, setActiveTab, loadProfile } = useNetworkState()
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [invitePost, setInvitePost] = useState(null)
  const [inviteStudentId, setInviteStudentId] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [joinPost, setJoinPost] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [activeSection, setActiveSection] = useState('explore')
  const [openVisible, setOpenVisible] = useState(PAGE_SIZE)
  const [ownedVisible, setOwnedVisible] = useState(PAGE_SIZE)
  const [profile, setProfile] = useState(null)
  const [expandedMemberLists, setExpandedMemberLists] = useState({})
  const profileRequest = useRef(0)

  const openPosts = useMemo(() => networkState?.openTeamPosts || [], [networkState?.openTeamPosts])
  const myPosts = networkState?.myTeamPosts || []
  const sent = networkState?.sentTeamRequests || []
  const invitations = networkState?.incomingTeamInvitations || []
  const memberships = networkState?.memberships || []
  const pendingSent = sent.filter(post => post.joinStatus === 'pending')
  const requestHistory = sent.filter(post => !['pending', 'accepted'].includes(post.joinStatus))
  const requestCount = pendingSent.length + requestHistory.length
  const inviteCandidates = useMemo(() => {
    if (!invitePost) return []
    const unavailable = new Set((invitePost.requests || []).filter(request => ['pending', 'accepted'].includes(request.status)).map(request => request.student.id))
    return (networkState?.suggestions || []).filter(person => !person.demoData && !unavailable.has(person.id))
  }, [invitePost, networkState?.suggestions])
  const availablePosts = useMemo(() => {
    const term = query.trim().toLowerCase()
    return openPosts.filter(post => !post.joinStatus).filter(post => {
      const matchesType = typeFilter === 'All types' || post.type === typeFilter
      const matchesText = !term || [post.title, post.description, post.owner?.name, ...(post.requiredSkills || [])].some(value => String(value || '').toLowerCase().includes(term))
      return matchesType && matchesText
    })
  }, [openPosts, query, typeFilter])

  async function act(key, operation, success) {
    setBusy(key)
    try { await operation(); await reload({ quiet: true }); if (success) toast.success(success); return true }
    catch (error) { toast.error(error.message || 'Could not update this team-up.'); return false }
    finally { setBusy('') }
  }

  function actTeam(record, key, operation, success) {
    if (record?.demoData) {
      toast.info('Demo team-ups are read-only and cannot be changed.', { title: 'Demo Team-Up' })
      return Promise.resolve(false)
    }
    return act(key, operation, success)
  }

  function closeEditor() {
    if (busy === 'save-team') return
    setShowForm(false)
    setEditingPost(null)
    setForm(EMPTY_FORM)
  }

  function openCreate() {
    setEditingPost(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(post) {
    if (post.demoData) {
      toast.info('Demo team-ups are read-only and cannot be edited.', { title: 'Demo Team-Up' })
      return
    }
    setEditingPost(post)
    setForm({ title: post.title, description: post.description, type: post.type, requiredSkills: (post.requiredSkills || []).join(', '), slots: post.slots })
    setShowForm(true)
  }

  function openInvite(post) {
    if (post.demoData) {
      toast.info('Demo team-ups are read-only and cannot send invitations.', { title: 'Demo Team-Up' })
      return
    }
    setInvitePost(post)
    setInviteStudentId('')
    setInviteMessage('')
  }

  function closeInvite() {
    if (busy === 'send-invitation') return
    setInvitePost(null)
    setInviteStudentId('')
    setInviteMessage('')
  }

  async function sendInvitation(event) {
    event.preventDefault()
    if (!invitePost || !inviteStudentId) return
    const completed = await actTeam(invitePost, 'send-invitation', () => inviteNetworkStudentToTeam(token, invitePost.id, inviteStudentId, inviteMessage), 'Team invitation sent.')
    if (completed) closeInvite()
  }

  async function saveTeam(event) {
    event.preventDefault()
    const payload = { ...form, slots: Number(form.slots), requiredSkills: form.requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean) }
    const completed = editingPost
      ? await actTeam(editingPost, 'save-team', () => updateNetworkTeamPost(token, editingPost.id, payload), 'Team-up updated.')
      : await act('save-team', () => createNetworkTeamPost(token, payload), 'Team-up published.')
    if (completed) closeEditor()
  }

  async function join(post) {
    if (post.demoData) {
      toast.info('Demo team-ups are read-only and cannot be joined.', { title: 'Demo Team-Up' })
      return
    }
    const completed = await act(`join-${post.id}`, () => joinNetworkTeamPost(token, post.id, message), 'Join request sent.')
    if (completed) { setJoinPost(''); setMessage('') }
  }

  async function removePost(post) {
    if (post.demoData) {
      toast.info('Demo team-ups are read-only and cannot be deleted.', { title: 'Demo Team-Up' })
      return
    }
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return
    await act(post.id, () => deleteNetworkTeamPost(token, post.id), 'Team-up deleted.')
  }

  async function viewProfile(person) {
    const request = ++profileRequest.current
    setBusy(`profile-${person.id}`)
    setProfile({ ...person, loading: true })
    try {
      const response = await loadProfile(person.id)
      if (request === profileRequest.current) setProfile({ ...response.profile, loading: false })
    } catch (error) {
      if (request === profileRequest.current) {
        setProfile(null)
        toast.error(error.message || 'Could not load this member profile.')
      }
    } finally { if (request === profileRequest.current) setBusy('') }
  }

  async function connectMember(person) {
    if (person.relationship?.status === 'incoming_pending') {
      setActiveTab('my-network')
      return
    }
    if (person.demoData) {
      toast.info('Demo profiles are read-only and cannot receive connection requests.', { title: 'Demo Profile' })
      return
    }
    await act(`connect-${person.id}`, () => sendNetworkConnection(token, person.id), `Connection request sent to ${person.name}.`)
  }

  async function leave(post) {
    if (post.demoData) {
      toast.info('Demo team-ups are read-only and cannot be left.', { title: 'Demo Team-Up' })
      return
    }
    if (!window.confirm(`Leave “${post.title}”? You will need a new invitation or accepted request to rejoin.`)) return
    await act(`leave-${post.id}`, () => leaveNetworkTeamPost(token, post.id), `You left ${post.title}.`)
  }

  return <div className="network-page network-team-page">
    <div className="network-team-controls"><TeamUpTabs active={activeSection} onChange={setActiveSection} counts={{ explore: openPosts.filter(post => !post.joinStatus).length, invitations: invitations.length, requests: requestCount, joined: memberships.length, manage: myPosts.length }}/><button type="button" className="btn-primary" onClick={openCreate}><Plus size={15}/>Create team-up</button></div>

    {activeSection === 'invitations' && <section className="network-panel network-team-invitations"><header><div><h2>Invitations requiring a response</h2><p>Accept only teams you are ready to participate in.</p></div><span>{invitations.length}</span></header><div className="network-invitation-list">{invitations.map(post => <article key={post.id}><div><span className="network-invitation-status"><Status value="Invited"/><DemoBadge show={post.demoData}/></span><strong>{post.owner.name} invited you to {post.title}</strong><p>{post.description}</p><SkillTags skills={post.requiredSkills}/><button type="button" className="network-invitation-profile" disabled={busy === `profile-${post.owner.id}`} onClick={() => viewProfile(post.owner)}>View sender profile</button></div><div><button type="button" className="network-icon-button is-accept" title="Accept invitation" aria-label={`Accept invitation to ${post.title}`} disabled={Boolean(busy)} onClick={() => actTeam(post, post.id, () => decideNetworkTeamInvitation(token, post.id, post.joinRequestId, 'accept'), `You joined ${post.title}.`)}><Check size={15}/></button><button type="button" className="network-icon-button is-decline" title="Decline invitation" aria-label={`Decline invitation to ${post.title}`} disabled={Boolean(busy)} onClick={() => actTeam(post, post.id, () => decideNetworkTeamInvitation(token, post.id, post.joinRequestId, 'decline'))}><X size={15}/></button></div></article>)}</div>{!invitations.length && <div className="network-empty"><Rocket size={22}/><strong>No invitations waiting</strong><p>New invitations will appear here.</p></div>}</section>}

    <div className="network-team-layout is-single">
      {activeSection === 'explore' && <section className="network-panel network-team-browse"><header><div><h2>Explore open team-ups</h2><p>Only teams you have not already joined or requested are listed here.</p></div><span>{availablePosts.length}</span></header>
        <div className="network-team-toolbar"><label><Search size={15}/><input value={query} onChange={event => { setQuery(event.target.value); setOpenVisible(PAGE_SIZE) }} placeholder="Search title, owner, or skill"/></label><TeamTypePicker value={typeFilter} onChange={value => { setTypeFilter(value); setOpenVisible(PAGE_SIZE) }}/></div>
        <div className="network-team-card-grid">{availablePosts.slice(0, openVisible).map(post => <article className="network-team-card" key={post.id}><TeamCardHeader post={post}/><button type="button" className="network-team-owner-profile" disabled={busy === `profile-${post.owner.id}`} onClick={() => viewProfile(post.owner)}>View owner profile</button><p className="network-team-description">{post.description}</p><SkillTags skills={post.requiredSkills}/>{joinPost === post.id ? <div className="network-join-box"><label>What will you contribute?<textarea autoFocus rows="3" minLength="10" maxLength="500" value={message} onChange={event => setMessage(event.target.value)} placeholder="Describe your relevant skills and contribution."/></label>{post.demoData && <p className="network-demo-note">Demo preview: you can complete the form, but sending will not create a real request.</p>}<div><button type="button" className="btn-secondary" onClick={() => { setJoinPost(''); setMessage('') }}>Cancel</button><button type="button" className="btn-primary" disabled={message.trim().length < 10 || Boolean(busy)} onClick={() => join(post)}><Send size={14}/>Send request</button></div></div> : <div className="network-team-card-actions"><button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={() => setJoinPost(post.id)}><UserRoundCheck size={14}/>Request to join</button></div>}</article>)}</div>
        {!availablePosts.length && <div className="network-empty"><Search size={22}/><strong>No matching team-ups</strong><p>Try another search or type filter.</p></div>}
        <ShowMore visible={openVisible} total={availablePosts.length} onClick={() => setOpenVisible(current => current + PAGE_SIZE)}/>
      </section>}

      {activeSection === 'requests' && <aside className="network-team-sidebar"><section className="network-panel"><header><div><h2>Your join requests</h2><p>Track pending requests and previous team-owner decisions.</p></div><span>{requestCount}</span></header><div className="network-team-activity-list">
        {pendingSent.map(post => <article key={post.id}><div><span className="network-request-status"><Status value="Pending"/><DemoBadge show={post.demoData}/></span><strong>{post.title}</strong><span>{post.owner.name} · waiting for a decision</span></div><button type="button" className="btn-secondary" disabled={Boolean(busy)} onClick={() => actTeam(post, post.id, () => withdrawNetworkTeamRequest(token, post.id), 'Join request withdrawn.')}><X size={14}/>Withdraw</button></article>)}
        {requestHistory.map(post => <article key={post.id}><div><span className="network-request-status"><Status value={post.joinStatus}/><DemoBadge show={post.demoData}/></span><strong>{post.title}</strong><span>{post.owner.name} · {post.joinStatus === 'declined' ? 'Owner declined this request' : 'You withdrew this request'}</span></div></article>)}
        {!requestCount && <div className="network-empty is-small"><Clock3 size={20}/><strong>No join requests yet</strong></div>}
      </div></section></aside>}

      {activeSection === 'joined' && <section className="network-panel network-joined-teams"><header><div><h2>Teams you joined</h2><p>Accepted memberships in teams created by other students.</p></div><span>{memberships.length}</span></header><div className="network-team-card-grid">{memberships.map(post => {
        const seen = new Set()
        const people = [{ ...post.owner, isTeamOwner: true }, ...(post.members || [])].filter(person => person?.id && !seen.has(person.id) && seen.add(person.id))
        const isExpanded = Boolean(expandedMemberLists[post.id])
        const visiblePeople = isExpanded ? people : []
        return <article className="network-team-card" key={post.id}><TeamCardHeader post={post} status="Accepted"/><p className="network-team-description">{post.description}</p><SkillTags skills={post.requiredSkills}/><span className="network-accepted"><Check size={14}/>You are an active member</span><section className={`network-team-members${isExpanded ? ' is-expanded' : ''}`}><h4><span>Team members</span><button type="button" className="network-members-toggle" aria-expanded={isExpanded} onClick={() => setExpandedMemberLists(current => ({ ...current, [post.id]: !isExpanded }))} aria-label={isExpanded ? 'Collapse team members' : `Show all ${people.length} team members`}><ChevronDown size={16}/></button></h4><p>View a member’s public profile or send a connection request when you are not connected.</p>{visiblePeople.map(person => <TeamMember key={person.id} person={person} busy={busy} onViewProfile={viewProfile} onConnect={connectMember}/>)}</section><button type="button" className="network-danger-button network-leave-team" disabled={Boolean(busy)} onClick={() => leave(post)}><X size={14}/>Leave team</button></article>
      })}</div>{!memberships.length && <div className="network-empty"><Users size={22}/><strong>No joined teams yet</strong><p>Accepted invitations and join requests will appear here.</p></div>}</section>}
    </div>

    {activeSection === 'manage' && <section className="network-panel network-owned-teams"><header><div><h2>Teams you manage</h2><p>Edit openings, review applicants, and see accepted members.</p></div><span>{myPosts.length}</span></header><div className="network-owned-grid">{myPosts.slice(0, ownedVisible).map(post => {
      const applicants = (post.requests || []).filter(request => request.status === 'pending' && request.source === 'application')
      return <article className="network-team-card network-owned-card" key={post.id}><TeamCardHeader post={post} status={post.status}/><p className="network-team-description">{post.description}</p><SkillTags skills={post.requiredSkills}/><div className="network-owner-actions"><button type="button" className="btn-secondary" disabled={Boolean(busy)} onClick={() => openEdit(post)}><Pencil size={14}/>Edit</button>{post.status === 'open' && post.filled < post.slots && <button type="button" className="btn-secondary" disabled={Boolean(busy)} onClick={() => openInvite(post)}><UserPlus size={14}/>Invite student</button>}<button type="button" className="btn-secondary" disabled={Boolean(busy)} onClick={() => actTeam(post, post.id, () => updateNetworkTeamPost(token, post.id, { status: post.status === 'open' ? 'closed' : 'open' }), `Team-up ${post.status === 'open' ? 'closed' : 'reopened'}.`)}>{post.status === 'open' ? <><Lock size={14}/>Close applications</> : <><Rocket size={14}/>Reopen</>}</button>{post.filled === 0 && <button type="button" className="network-danger-button" disabled={Boolean(busy)} onClick={() => removePost(post)}><Trash2 size={14}/>Delete</button>}</div>
        {applicants.length > 0 && <div className="network-applicant-section"><h4>Applicants awaiting review <span>{applicants.length}</span></h4>{applicants.map(request => <div className="network-applicant" key={request.id}><div><strong>{request.student.name}<DemoBadge show={request.student.demoData}/></strong><span className="network-applicant-meta">TrustScore {request.student.trustScore}</span><p>{request.message}</p></div><div><button type="button" className="btn-secondary network-applicant-profile" disabled={busy === `profile-${request.student.id}`} onClick={() => viewProfile(request.student)}>View profile</button><button type="button" className="network-icon-button is-accept" title="Accept applicant" aria-label={`Accept ${request.student.name}`} disabled={Boolean(busy)} onClick={() => actTeam(post, request.id, () => decideNetworkTeamRequest(token, post.id, request.id, 'accept'), `${request.student.name} joined your team.`)}><Check size={15}/></button><button type="button" className="network-icon-button is-decline" title="Decline applicant" aria-label={`Decline ${request.student.name}`} disabled={Boolean(busy)} onClick={() => actTeam(post, request.id, () => decideNetworkTeamRequest(token, post.id, request.id, 'decline'))}><X size={15}/></button></div></div>)}</div>}
        {post.members?.length > 0 && <div className="network-member-list"><small>Accepted members</small>{post.members.map(member => <div className="network-managed-member" key={member.id}><div className="network-avatar">{member.avatar ? <img src={member.avatar} alt=""/> : member.name?.[0]}</div><div className="network-managed-member-main"><strong>{member.name}<DemoBadge show={member.demoData}/></strong><span>{member.role || 'Team member'}</span></div><button type="button" className="btn-secondary" disabled={busy === `profile-${member.id}`} onClick={() => viewProfile(member)}>View profile</button></div>)}</div>}
      </article>
    })}</div>{!myPosts.length && <div className="network-empty"><BriefcaseBusiness size={22}/><strong>No teams created yet</strong><p>Create a team-up when you are ready to recruit collaborators.</p></div>}<ShowMore visible={ownedVisible} total={myPosts.length} onClick={() => setOwnedVisible(current => current + PAGE_SIZE)}/></section>}

    {showForm && <div className="network-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeEditor()}><form className="network-invite-modal network-team-modal network-team-form" onSubmit={saveTeam} role="dialog" aria-modal="true" aria-labelledby="team-editor-title"><header><div><span>{editingPost ? 'Edit team-up' : 'Create team-up'}</span><h2 id="team-editor-title">{editingPost ? 'Update collaboration details' : 'Build a collaboration'}</h2></div><button type="button" className="network-icon-button" title="Close" aria-label="Close team-up editor" onClick={closeEditor}><X size={17}/></button></header><div className="network-form-grid"><label>Title<input required minLength="5" maxLength="120" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Build a campus event platform"/></label><label>Type<TeamTypePicker value={form.type} onChange={type => setForm({ ...form, type })}/></label><label>Required skills<input required value={form.requiredSkills} onChange={event => setForm({ ...form, requiredSkills: event.target.value })} placeholder="React, Node.js, UI/UX"/></label><label>Open slots<input type="number" min="1" max="20" value={form.slots} onChange={event => setForm({ ...form, slots: event.target.value })}/></label></div><label>Description<textarea required minLength="20" maxLength="1200" rows="5" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Explain the outcome, expected contribution, and working timeline."/></label><footer><button type="button" className="btn-secondary" disabled={busy === 'save-team'} onClick={closeEditor}>Cancel</button><button className="btn-primary" disabled={busy === 'save-team'}><Send size={15}/>{busy === 'save-team' ? 'Saving...' : editingPost ? 'Save changes' : 'Publish team-up'}</button></footer></form></div>}
    {invitePost && <div className="network-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeInvite()}><form className="network-invite-modal" onSubmit={sendInvitation} role="dialog" aria-modal="true" aria-labelledby="team-invitation-title"><header><div><span>Invite to team-up</span><h2 id="team-invitation-title">Invite a student to {invitePost.title}</h2></div><button type="button" className="network-icon-button" title="Close" aria-label="Close invitation dialog" onClick={closeInvite}><X size={17}/></button></header><label>Student<select required value={inviteStudentId} onChange={event => setInviteStudentId(event.target.value)}><option value="">Select a student</option>{inviteCandidates.map(person => <option key={person.id} value={person.id}>{person.name} · {person.skills?.slice(0, 2).join(', ') || 'Student talent'}</option>)}</select></label>{!inviteCandidates.length && <p className="network-demo-note">No eligible students are available to invite right now.</p>}<label>Invitation message<textarea required minLength="10" maxLength="500" rows="4" value={inviteMessage} onChange={event => setInviteMessage(event.target.value)} placeholder="Explain why their skills are a good fit for this work."/></label><footer><button type="button" className="btn-secondary" disabled={busy === 'send-invitation'} onClick={closeInvite}>Cancel</button><button className="btn-primary" disabled={!inviteStudentId || inviteMessage.trim().length < 10 || busy === 'send-invitation'}><Send size={15}/>{busy === 'send-invitation' ? 'Sending...' : 'Send invitation'}</button></footer></form></div>}
    <NetworkProfileModal key={profile?.id || 'closed'} profile={profile} loading={profile?.loading} onClose={() => { profileRequest.current++; setProfile(null) }}/>
  </div>
}
