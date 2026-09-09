export function buildDefaultCompanyGigManagementState() {
  return {
    stats: [
      { label: 'Open GIGs', value: '4', tone: '#1D4ED8', bg: '#DBEAFE', icon: '📋' },
      { label: 'Applications', value: '26', tone: '#065F46', bg: '#D1FAE5', icon: '📥' },
      { label: 'Interview Tasks Sent', value: '9', tone: '#92400E', bg: '#FEF3C7', icon: '🚀' },
      { label: 'Active Hires', value: '3', tone: '#7C3AED', bg: '#EDE9FE', icon: '⚡' },
    ],
    gigs: [
      {
        id: 1,
        title: 'Frontend Internship',
        mode: 'Remote',
        budget: '₹10,000 / month',
        applicants: 11,
        shortlisted: 4,
        interviewTasks: 3,
        status: 'Hiring',
        skills: ['React', 'UI/UX Design'],
        postedOn: 'Posted 2 days ago',
      },
      {
        id: 2,
        title: 'Social Media Content Role',
        mode: 'Hybrid',
        budget: '₹6,000 / month',
        applicants: 8,
        shortlisted: 3,
        interviewTasks: 2,
        status: 'Reviewing',
        skills: ['Canva', 'Content Marketing'],
        postedOn: 'Posted 4 days ago',
      },
      {
        id: 3,
        title: 'Node.js API Task',
        mode: 'On-site',
        budget: '₹12,000 / month',
        applicants: 5,
        shortlisted: 2,
        interviewTasks: 2,
        status: 'In Progress',
        skills: ['Node.js', 'REST APIs'],
        postedOn: 'Posted 1 week ago',
      },
    ],
    pipeline: [
      { label: 'New Applications', value: '12', bg: '#EFF6FF', color: '#1D4ED8' },
      { label: 'Interview Task Pending', value: '7', bg: '#FEF3C7', color: '#92400E' },
      { label: 'Task Submitted', value: '5', bg: '#EDE9FE', color: '#7C3AED' },
      { label: 'Selected', value: '3', bg: '#D1FAE5', color: '#065F46' },
    ],
    recentActivity: [
      'Riya Sharma completed the Frontend Internship interview task.',
      'Aman Dubey applied for Node.js API Task 3 hours ago.',
      'Priya Singh was shortlisted for Social Media Content Role.',
      'Rohit Kumar submitted portfolio links for UI project review.',
    ],
    applicantsByGig: {
      1: [
        {
          id: 'g1-a1',
          name: 'Aman Verma',
          trustScore: 920,
          location: 'Delhi',
          college: 'NSUT Delhi',
          skills: ['React', 'UI/UX Design', 'Figma'],
          intro: 'Frontend-focused builder with strong component architecture and polished UI systems.',
          projects: ['Creator Portfolio Studio', 'Campus Event Landing Page', 'Design System Kit'],
        },
        {
          id: 'g1-a2',
          name: 'Ritika Sen',
          trustScore: 870,
          location: 'Bengaluru',
          college: 'PES University',
          skills: ['React', 'Tailwind', 'UI/UX Design'],
          intro: 'Ships responsive interfaces quickly and enjoys startup landing pages and dashboards.',
          projects: ['Skill Swap Marketplace', 'Hackathon Demo Site'],
        },
      ],
      2: [
        {
          id: 'g2-a1',
          name: 'Sneha Iyer',
          trustScore: 860,
          location: 'Bengaluru',
          college: 'Christ University',
          skills: ['Content Marketing', 'SEO', 'Canva'],
          intro: 'Campaign storyteller with strong social copy and creative post planning.',
          projects: ['Campus Fest Growth Campaign', 'SEO Content Sprint'],
        },
        {
          id: 'g2-a2',
          name: 'Priya Singh',
          trustScore: 790,
          location: 'Ranchi',
          college: 'BIT Mesra',
          skills: ['Content Writing', 'Social Media', 'Canva'],
          intro: 'Strong at audience-first writing and structured weekly social calendars.',
          projects: ['Festival Campaign Pack', 'Brand Voice Guide'],
        },
      ],
      3: [
        {
          id: 'g3-a1',
          name: 'Ravi Kumar',
          trustScore: 900,
          location: 'Lucknow',
          college: 'IIIT Lucknow',
          skills: ['Node.js', 'REST APIs', 'MongoDB'],
          intro: 'Backend engineer with strong API design and auth/role access patterns.',
          projects: ['Job Board API', 'Inventory Service Layer'],
        },
        {
          id: 'g3-a2',
          name: 'Kabir Nair',
          trustScore: 905,
          location: 'Hyderabad',
          college: 'IIIT Hyderabad',
          skills: ['Node.js', 'PostgreSQL', 'React'],
          intro: 'Full-stack builder focused on scalable service architecture and product delivery.',
          projects: ['SaaS Billing Console', 'Mentor Match Platform'],
        },
      ],
    },
  }
}

export function mergeCompanyGigManagementState(state = {}) {
  const defaults = buildDefaultCompanyGigManagementState()

  return {
    stats: Array.isArray(state.stats) ? state.stats : defaults.stats,
    gigs: Array.isArray(state.gigs) ? state.gigs : defaults.gigs,
    pipeline: Array.isArray(state.pipeline) ? state.pipeline : defaults.pipeline,
    recentActivity: Array.isArray(state.recentActivity) ? state.recentActivity : defaults.recentActivity,
    applicantsByGig: state.applicantsByGig && typeof state.applicantsByGig === 'object'
      ? state.applicantsByGig
      : defaults.applicantsByGig,
  }
}
