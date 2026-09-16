const assert = require('node:assert/strict')
const { getEnvConfig } = require('../config/env')
const { connectToDatabase, disconnectFromDatabase } = require('../config/db')
const Student = require('../models/Student')
const { getCurrentStudent, getCurrentStudentProfileMedia, updateCurrentStudent } = require('../controllers/studentController')

async function run() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let studentId = null
  try {
    await connectToDatabase(getEnvConfig().mongoUrl)
    const student = await Student.create({
      name: 'Profile Integration Student', email: `profile-student-${suffix}@example.com`, passwordHash: 'integration-only',
      sessions: [{ token: `profile-${suffix}` }],
    })
    studentId = student._id
    const updated = await updateCurrentStudent(`profile-${suffix}`, {
      about: 'I build accessible interfaces and contribute clear technical documentation.',
      collaborationFocus: ['React product builds', 'Accessibility', 'React product builds'],
      workStyle: 'I plan in writing, share progress early, and review work carefully.',
      githubLink: [{ icon: 'GitHub', url: 'https://github.com/example', saved: true }, { icon: 'Unsafe', url: 'javascript:alert(1)', saved: true }],
      contactInfo: [{ label: 'Email', value: 'profile@example.com', saved: true }, { label: '', value: 'discarded', saved: true }],
      projects: [{ name: 'Accessibility checker', desc: 'An audited interface testing tool.', link: 'https://example.com/project', demoLink: 'https://example.com/demo', saved: true }],
      videoUrl: 'https://media.example.com/intro.mp4',
    })
    assert.deepEqual(updated.collaborationFocus, ['React product builds', 'Accessibility'])
    assert.equal(updated.githubLink.length, 1)
    assert.deepEqual(updated.contactInfo.map(item => ({ label: item.label, value: item.value, saved: item.saved })), [{ label: 'Email', value: 'profile@example.com', saved: true }])
    assert.equal(updated.projects[0].link, 'https://example.com/project')
    assert.equal(updated.videoUrl, 'https://media.example.com/intro.mp4')
    const reloaded = await getCurrentStudent(`profile-${suffix}`)
    assert.equal(reloaded.about, updated.about)
    assert.deepEqual(reloaded.collaborationFocus, updated.collaborationFocus)
    assert.equal(reloaded.workStyle, updated.workStyle)
    assert.equal(reloaded.projects[0].name, 'Accessibility checker')
    assert.equal((await getCurrentStudentProfileMedia(`profile-${suffix}`)).videoUrl, updated.videoUrl)
    const persisted = await Student.findById(student._id).lean()
    assert.equal(persisted.contactInfo[0].value, 'profile@example.com')
    assert.equal(persisted.githubLink.some(item => item.url.startsWith('javascript:')), false)
    console.log('Profile integration passed: authenticated persistence, sanitised media/links, bounded collaboration fields and reload consistency.')
  } finally {
    if (studentId) await Student.deleteOne({ _id: studentId })
    await disconnectFromDatabase()
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
