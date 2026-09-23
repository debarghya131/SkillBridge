const DEMO_SKILL_REQUESTS = [
  {
    id: 'demo-request-react-native',
    demoData: true,
    requestedName: 'React Native (demo)',
    category: 'Mobile Development',
    note: 'I have built a small Android app and need a platform standard with evidence requirements for navigation, offline states, and release testing.',
    status: 'pending',
    createdAt: '2026-09-20T09:30:00.000Z',
  },
  {
    id: 'demo-request-product-analytics',
    demoData: true,
    requestedName: 'Product Analytics (demo)',
    category: 'Analytics',
    note: 'Please add a standard for event taxonomy, funnels, retention analysis, and a decision-focused product dashboard.',
    status: 'pending',
    createdAt: '2026-09-21T13:15:00.000Z',
  },
  {
    id: 'demo-request-graphql-approved',
    demoData: true,
    requestedName: 'GraphQL API Design (demo)',
    category: 'Backend',
    note: 'The requested skill needs a distinct standard for schema design, authorization, validation, and query cost controls.',
    status: 'approved',
    adminFeedback: 'Approved. A reviewer-ready GraphQL standard was published and added to the student skill inventory.',
    createdAt: '2026-09-14T10:10:00.000Z',
    decidedAt: '2026-09-16T08:45:00.000Z',
  },
  {
    id: 'demo-request-reactjs-merged',
    demoData: true,
    requestedName: 'ReactJS (demo)',
    category: 'Frontend',
    note: 'I could not find ReactJS in the catalog and requested it as a separate skill.',
    status: 'merged',
    adminFeedback: 'Merged with the published React standard. ReactJS is now recognized as an alias, so evidence is assessed against the same standard.',
    createdAt: '2026-09-11T15:25:00.000Z',
    decidedAt: '2026-09-12T11:20:00.000Z',
  },
  {
    id: 'demo-request-ethical-hacking-rejected',
    demoData: true,
    requestedName: 'Ethical Hacking in 7 Days (demo)',
    category: 'Cybersecurity',
    note: 'I want a fast certificate path for ethical hacking.',
    status: 'rejected',
    adminFeedback: 'Rejected because the request is too broad and outcome-based. Submit a specific, evidence-ready skill such as web application security testing.',
    createdAt: '2026-09-08T07:50:00.000Z',
    decidedAt: '2026-09-09T12:05:00.000Z',
  },
]

export function getAdminDemoSkillRequests(status = 'pending') {
  const activeStatus = status === 'all' ? 'pending' : status
  return DEMO_SKILL_REQUESTS.filter(request => request.status === activeStatus)
}
