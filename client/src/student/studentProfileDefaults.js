import studentIntroVideo from '../assets/studentintro.mp4'

export function isBundledStudentIntroVideoUrl(videoUrl) {
  if (typeof videoUrl !== 'string' || !videoUrl.trim()) {
    return false
  }

  const rawValue = videoUrl.trim()
  const pathname = (() => {
    try {
      return new URL(rawValue, 'https://skillbridge.local').pathname
    } catch {
      return rawValue.split(/[?#]/)[0]
    }
  })()

  return (
    rawValue === studentIntroVideo ||
    pathname === '/src/assets/studentintro.mp4' ||
    /^\/assets\/studentintro-[A-Za-z0-9_-]+\.mp4$/.test(pathname)
  )
}

export const DEFAULT_STUDENT_PROFILE = {
  name: 'Student',
  trustScore: 0,
  avatar: null,
  skills: [],
  githubLink: [],
  contactInfo: [],
  projects: [],
  // A starter preview belongs to the application, not to the student's public profile.
  videoUrl: studentIntroVideo,
}

export function mergeStudentProfile(student = {}) {
  const videoUrl = isBundledStudentIntroVideoUrl(student.videoUrl)
    ? DEFAULT_STUDENT_PROFILE.videoUrl
    : student.videoUrl || DEFAULT_STUDENT_PROFILE.videoUrl

  return {
    name: student.name || DEFAULT_STUDENT_PROFILE.name,
    trustScore: Number.isFinite(student.trustScore) ? student.trustScore : DEFAULT_STUDENT_PROFILE.trustScore,
    avatar: student.avatar ?? DEFAULT_STUDENT_PROFILE.avatar,
    skills: Array.isArray(student.skills) && student.skills.length > 0 ? student.skills : [...DEFAULT_STUDENT_PROFILE.skills],
    githubLink: Array.isArray(student.githubLink) ? student.githubLink : [...DEFAULT_STUDENT_PROFILE.githubLink],
    contactInfo: Array.isArray(student.contactInfo) ? student.contactInfo : [...DEFAULT_STUDENT_PROFILE.contactInfo],
    projects: Array.isArray(student.projects) && student.projects.length > 0
      ? student.projects
      : DEFAULT_STUDENT_PROFILE.projects.map(project => ({ ...project })),
    videoUrl,
  }
}
