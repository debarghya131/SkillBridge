const assert = require('node:assert/strict')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Student = require('../models/Student')
const NetworkConnection = require('../models/NetworkConnection')
const TeamPost = require('../models/TeamPost')
const {
  createTeamPost, decideConnectionRequest, decideTeamInvitation, decideTeamRequest, getNetworkProfile,
  deleteTeamPost, getStudentNetworkState, inviteStudentToTeam, leaveTeam, removeConnection, requestToJoinTeam,
  sendConnectionRequest, updateTeamPost, withdrawTeamRequest,
} = require('../controllers/networkController')

async function run() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ids = []
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    const [first, second, third] = await Student.create([
      { name: 'Network Integration Owner', email: `network-owner-${suffix}@example.com`, passwordHash: 'integration-only', trustScore: 700, skills: ['React'], sessions: [{ token: `owner-${suffix}` }], contactInfo: [{ label: 'Email', value: `owner-${suffix}@example.com`, saved: true }] },
      { name: 'Network Integration Member', email: `network-member-${suffix}@example.com`, passwordHash: 'integration-only', trustScore: 650, skills: ['Node.js'], sessions: [{ token: `member-${suffix}` }], contactInfo: [{ label: 'Email', value: `member-${suffix}@example.com`, saved: true }] },
      { name: 'Network Integration Invitee', email: `network-invitee-${suffix}@example.com`, passwordHash: 'integration-only', trustScore: 600, skills: ['SQL'], sessions: [{ token: `invitee-${suffix}` }], contactInfo: [{ label: 'Email', value: `invitee-${suffix}@example.com`, saved: true }] },
    ])
    ids.push(first._id, second._id, third._id)

    assert.equal((await getNetworkProfile(`owner-${suffix}`, second._id)).contactVisible, false)
    const sent = await sendConnectionRequest(`owner-${suffix}`, second._id)
    const recipientState = await getStudentNetworkState(`member-${suffix}`)
    assert.equal(recipientState.incomingConnections[0].id, sent.id)
    await decideConnectionRequest(`member-${suffix}`, sent.id, 'decline')
    const resent = await sendConnectionRequest(`owner-${suffix}`, second._id)
    assert.equal(resent.status, 'outgoing_pending')
    await assert.rejects(decideConnectionRequest(`owner-${suffix}`, resent.id, 'accept'), /Pending connection request not found/)
    await decideConnectionRequest(`member-${suffix}`, resent.id, 'accept')
    assert.equal((await getNetworkProfile(`owner-${suffix}`, second._id)).contactVisible, true)
    assert.equal((await getStudentNetworkState(`owner-${suffix}`)).connected[0].name, second.name)

    const created = await createTeamPost(`owner-${suffix}`, { title: 'Integration project team', description: 'Build and test an end-to-end collaboration workflow.', type: 'Project', slots: 1, requiredSkills: ['Node.js'] })
    await requestToJoinTeam(`member-${suffix}`, created.id, { message: 'I can build and validate the Node.js service.' })
    const ownerState = await getStudentNetworkState(`owner-${suffix}`)
    const ownerPost = ownerState.myTeamPosts.find(item => item.id === created.id)
    assert.equal(ownerPost.requests.length, 1)
    await assert.rejects(decideTeamRequest(`member-${suffix}`, created.id, ownerPost.requests[0].id, 'accept'), /Team-up post not found/)
    await decideTeamRequest(`owner-${suffix}`, created.id, ownerPost.requests[0].id, 'accept')
    const acceptedPost = await TeamPost.findById(created.id).lean()
    assert.ok(acceptedPost.requests[0].acceptedAt)
    const memberState = await getStudentNetworkState(`member-${suffix}`)
    assert.equal(memberState.memberships[0].joinStatus, 'accepted')
    assert.equal(memberState.memberships[0].status, 'closed')
    await assert.rejects(updateTeamPost(`owner-${suffix}`, created.id, { status: 'open' }), /full team/)
    await leaveTeam(`member-${suffix}`, created.id)
    assert.equal((await getStudentNetworkState(`member-${suffix}`)).memberships.some(item => item.id === created.id), false)
    const departedPost = await TeamPost.findById(created.id).lean()
    assert.equal(departedPost.requests[0].status, 'withdrawn')
    assert.ok(departedPost.requests[0].acceptedAt)
    await updateTeamPost(`owner-${suffix}`, created.id, { status: 'open' })
    await assert.rejects(deleteTeamPost(`owner-${suffix}`, created.id), /accepted members/)
    await requestToJoinTeam(`member-${suffix}`, created.id, { message: 'I am ready to rejoin and contribute to the Node.js service.' })
    await withdrawTeamRequest(`member-${suffix}`, created.id)
    assert.equal((await TeamPost.findById(created.id).lean()).requests[0].status, 'withdrawn')

    const requestDecision = await createTeamPost(`owner-${suffix}`, { title: 'Applicant decision project', description: 'Verify declined and withdrawn application history for a real student.', type: 'Project', slots: 2, requiredSkills: ['SQL'] })
    await requestToJoinTeam(`invitee-${suffix}`, requestDecision.id, { message: 'I can provide SQL schema design and reproducible query tests.' })
    const pendingApplication = (await getStudentNetworkState(`owner-${suffix}`)).myTeamPosts.find(item => item.id === requestDecision.id).requests[0]
    await decideTeamRequest(`owner-${suffix}`, requestDecision.id, pendingApplication.id, 'decline')
    assert.equal((await getStudentNetworkState(`invitee-${suffix}`)).sentTeamRequests.find(item => item.id === requestDecision.id).joinStatus, 'declined')
    await requestToJoinTeam(`invitee-${suffix}`, requestDecision.id, { message: 'I can revise the plan and deliver tested SQL reporting queries.' })
    assert.equal((await getStudentNetworkState(`invitee-${suffix}`)).sentTeamRequests.find(item => item.id === requestDecision.id).joinStatus, 'pending')
    await withdrawTeamRequest(`invitee-${suffix}`, requestDecision.id)
    assert.equal((await getStudentNetworkState(`invitee-${suffix}`)).sentTeamRequests.find(item => item.id === requestDecision.id).joinStatus, 'withdrawn')

    const managed = await createTeamPost(`owner-${suffix}`, { title: 'Managed project workspace', description: 'Verify that only the owner can maintain a live team-up listing.', type: 'Research', slots: 3, requiredSkills: ['React'] })
    assert.ok((await getStudentNetworkState(`owner-${suffix}`)).myTeamPosts.some(item => item.id === managed.id))
    await assert.rejects(updateTeamPost(`member-${suffix}`, managed.id, { title: 'Unauthorized edit attempt' }), /Team-up post not found/)
    await assert.rejects(deleteTeamPost(`member-${suffix}`, managed.id), /Team-up post not found/)
    await updateTeamPost(`owner-${suffix}`, managed.id, { title: 'Managed research workspace', description: 'The owner updated this real listing with a clear collaboration brief.', type: 'Research', slots: 4, requiredSkills: ['React', 'SQL'] })
    const updatedManaged = await TeamPost.findById(managed.id).lean()
    assert.equal(updatedManaged.title, 'Managed research workspace')
    assert.deepEqual(updatedManaged.requiredSkills, ['React', 'SQL'])
    await deleteTeamPost(`owner-${suffix}`, managed.id)
    assert.equal(await TeamPost.exists({ _id: managed.id }), null)

    const invited = await createTeamPost(`owner-${suffix}`, { title: 'Direct invitation project', description: 'Build and validate a direct team invitation workflow.', type: 'Project', slots: 1, requiredSkills: ['Node.js'] })
    await inviteStudentToTeam(`owner-${suffix}`, invited.id, second._id, { message: 'Your Node.js work would be a strong fit for this team.' })
    const invitationState = await getStudentNetworkState(`member-${suffix}`)
    const invitation = invitationState.incomingTeamInvitations.find(item => item.id === invited.id)
    assert.equal(invitation.requestSource, 'invitation')
    await assert.rejects(decideTeamRequest(`owner-${suffix}`, invited.id, invitation.joinRequestId, 'accept'), /Pending join request/)
    await decideTeamInvitation(`member-${suffix}`, invited.id, invitation.joinRequestId, 'accept')
    const acceptedInvitation = await TeamPost.findById(invited.id).lean()
    assert.ok(acceptedInvitation.requests[0].acceptedAt)
    const joinedByInvite = (await getStudentNetworkState(`member-${suffix}`)).memberships.find(item => item.id === invited.id)
    assert.equal(joinedByInvite.joinStatus, 'accepted')
    assert.equal(joinedByInvite.status, 'closed')

    const declinedInvite = await createTeamPost(`owner-${suffix}`, { title: 'Declinable invitation project', description: 'Verify invitation decisions and safe re-invitation for another student.', type: 'Project', slots: 1, requiredSkills: ['SQL'] })
    await inviteStudentToTeam(`owner-${suffix}`, declinedInvite.id, third._id, { message: 'Your SQL skills are a strong match for this project.' })
    const pendingInvitation = (await getStudentNetworkState(`invitee-${suffix}`)).incomingTeamInvitations.find(item => item.id === declinedInvite.id)
    await decideTeamInvitation(`invitee-${suffix}`, declinedInvite.id, pendingInvitation.joinRequestId, 'decline')
    assert.equal((await TeamPost.findById(declinedInvite.id).lean()).requests[0].status, 'declined')
    assert.equal((await getStudentNetworkState(`invitee-${suffix}`)).incomingTeamInvitations.some(item => item.id === declinedInvite.id), false)
    await inviteStudentToTeam(`owner-${suffix}`, declinedInvite.id, third._id, { message: 'We updated the scope and would value your SQL contribution.' })
    assert.equal((await TeamPost.findById(declinedInvite.id).lean()).requests[0].status, 'pending')

    await removeConnection(`owner-${suffix}`, resent.id)
    assert.equal((await getNetworkProfile(`owner-${suffix}`, second._id)).contactVisible, false)
    assert.equal((await getStudentNetworkState(`owner-${suffix}`)).connected.some(item => item.id === String(second._id)), false)

    const cancellable = await sendConnectionRequest(`member-${suffix}`, first._id)
    await removeConnection(`member-${suffix}`, cancellable.id)
    assert.equal((await getStudentNetworkState(`owner-${suffix}`)).incomingConnections.some(item => item.id === cancellable.id), false)
    console.log('Network integration passed: private profiles, two-sided connections, cancellation, removal/contact revocation, application history, owner-managed create/edit/delete, withdrawals, member departures/reopening, direct invitations, invitation decline/retry, recipient decisions, membership and full-team closure.')
  } finally {
    if (ids.length) {
      await NetworkConnection.deleteMany({ $or: [{ requester: { $in: ids } }, { recipient: { $in: ids } }] })
      await TeamPost.deleteMany({ $or: [{ owner: { $in: ids } }, { 'requests.student': { $in: ids } }] })
      await Student.deleteMany({ _id: { $in: ids } })
    }
    await disconnectFromDatabase()
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
