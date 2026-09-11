const assert = require('node:assert/strict')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Student = require('../models/Student')
const NetworkConnection = require('../models/NetworkConnection')
const TeamPost = require('../models/TeamPost')
const {
  createTeamPost, decideConnectionRequest, decideTeamInvitation, decideTeamRequest, getNetworkProfile,
  getStudentNetworkState, inviteStudentToTeam, requestToJoinTeam, sendConnectionRequest, updateTeamPost,
} = require('../controllers/networkController')

async function run() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const ids = []
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    const [first, second] = await Student.create([
      { name: 'Network Integration Owner', email: `network-owner-${suffix}@example.com`, passwordHash: 'integration-only', trustScore: 700, skills: ['React'], sessions: [{ token: `owner-${suffix}` }], contactInfo: [{ label: 'Email', value: `owner-${suffix}@example.com`, saved: true }] },
      { name: 'Network Integration Member', email: `network-member-${suffix}@example.com`, passwordHash: 'integration-only', trustScore: 650, skills: ['Node.js'], sessions: [{ token: `member-${suffix}` }], contactInfo: [{ label: 'Email', value: `member-${suffix}@example.com`, saved: true }] },
    ])
    ids.push(first._id, second._id)

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
    const memberState = await getStudentNetworkState(`member-${suffix}`)
    assert.equal(memberState.memberships[0].joinStatus, 'accepted')
    assert.equal(memberState.memberships[0].status, 'closed')
    await assert.rejects(updateTeamPost(`owner-${suffix}`, created.id, { status: 'open' }), /full team/)

    const invited = await createTeamPost(`owner-${suffix}`, { title: 'Direct invitation project', description: 'Build and validate a direct team invitation workflow.', type: 'Project', slots: 1, requiredSkills: ['Node.js'] })
    await inviteStudentToTeam(`owner-${suffix}`, invited.id, second._id, { message: 'Your Node.js work would be a strong fit for this team.' })
    const invitationState = await getStudentNetworkState(`member-${suffix}`)
    const invitation = invitationState.incomingTeamInvitations.find(item => item.id === invited.id)
    assert.equal(invitation.requestSource, 'invitation')
    await assert.rejects(decideTeamRequest(`owner-${suffix}`, invited.id, invitation.joinRequestId, 'accept'), /Pending join request/)
    await decideTeamInvitation(`member-${suffix}`, invited.id, invitation.joinRequestId, 'accept')
    const joinedByInvite = (await getStudentNetworkState(`member-${suffix}`)).memberships.find(item => item.id === invited.id)
    assert.equal(joinedByInvite.joinStatus, 'accepted')
    assert.equal(joinedByInvite.status, 'closed')
    console.log('Network integration passed: private profiles, two-sided connections, applications, direct invitations, recipient decisions, membership and full-team closure.')
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
