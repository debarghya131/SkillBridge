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

export const DEFAULT_STUDENT_SKILLS = ['React', 'Node.js', 'UI/UX Design']

export const DEFAULT_STUDENT_PROJECTS = [
  {
    name: 'E-Commerce Dashboard',
    desc: 'Built a React admin dashboard with sales analytics, inventory tracking and order management for a local retailer.',
    link: 'https://github.com/topics/react-dashboard',
    demoLink: 'https://github.com/topics/react-dashboard',
    saved: true,
  },
  {
    name: 'College Notice Board App',
    desc: 'Flutter-based mobile app for college announcements with real-time push notifications and department filters.',
    link: 'https://github.com/topics/flutter-app',
    demoLink: 'https://github.com/topics/flutter-app',
    saved: true,
  },
  {
    name: 'Inventory Management System',
    desc: 'Excel-powered inventory tracker with automated reorder alerts and monthly report generation for Sharma Traders.',
    link: 'https://github.com/topics/inventory-management-system',
    demoLink: 'https://github.com/topics/inventory-management-system',
    saved: true,
  },
]

export const DEFAULT_STUDENT_PROFILE = {
  name: 'Student',
  trustScore: 750,
  avatar: null,
  skills: DEFAULT_STUDENT_SKILLS,
  githubLink: [],
  contactInfo: [],
  projects: DEFAULT_STUDENT_PROJECTS,
  videoUrl: studentIntroVideo,
}

export function mergeStudentProfile(student = {}) {
  const videoUrl = isBundledStudentIntroVideoUrl(student.videoUrl)
    ? studentIntroVideo
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
