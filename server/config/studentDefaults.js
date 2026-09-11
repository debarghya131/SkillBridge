function buildDefaultStudentProfile(overrides = {}) {
  return { avatar: null, skills: [], githubLink: [], contactInfo: [], projects: [], videoUrl: null, ...overrides }
}
module.exports = { buildDefaultStudentProfile }
