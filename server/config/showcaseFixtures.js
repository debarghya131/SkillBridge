const clone = value => JSON.parse(JSON.stringify(value))

const DEMO_IDS = new Set([
  '990001', '990002', '990003', '990004', '990005', '990006',
  'demo-opportunity-1', 'demo-opportunity-2',
  'demo-task-1', 'demo-task-2', 'demo-task-3',
  'demo-project-1', 'demo-project-2',
  'demo-submission-1', 'demo-submission-2',
  'demo-student-1', 'demo-student-2', '990013', '990014', '990015',
  'demo-team-1', 'demo-team-2', 'demo-team-3', 'demo-team-4', 'demo-team-mine-1',
  'demo-team-request-outgoing-1', 'demo-team-invitation-1', 'demo-team-membership-1', 'demo-team-applicant-1', 'demo-team-member-1', 'demo-connection-1',
  'demo-assessment-available', 'demo-assessment-mine', 'demo-assessment-completed',
])

const DEMO_GIGS = [
  { id: 990001, demoData: true, company: 'Northstar Retail Labs', companyLogo: '/demo-companies/northstar.svg', location: 'Kolkata, West Bengal', workMode: 'Remote', title: 'Retail Inventory Dashboard', type: 'Project GIG', budget: '₹24,000 / project', tags: ['React', 'Node.js', 'SQL'], match: 82, posted: '2 days ago' },
  { id: 990002, demoData: true, company: 'GreenRoute Analytics', companyLogo: '/demo-companies/greenroute.svg', location: 'Bengaluru, Karnataka', workMode: 'Hybrid', title: 'Delivery Performance Analysis', type: 'Internship', budget: '₹15,000 / month', tags: ['Python', 'Power BI', 'SQL'], match: 74, posted: '4 days ago' },
  { id: 990003, demoData: true, company: 'CareConnect Studio', companyLogo: '/demo-companies/careconnect.svg', location: 'Pune, Maharashtra', workMode: 'Remote', title: 'Accessible Appointment Experience', type: 'Project GIG', budget: '₹30,000 / project', tags: ['Figma', 'React', 'Accessibility'], match: 68, posted: '1 week ago' },
  { id: 990004, demoData: true, company: 'MarketMitra', companyLogo: '/demo-companies/marketmitra.svg', location: 'Delhi, India', workMode: 'Remote', title: 'Local Business SEO Sprint', type: 'Part-time', budget: '₹12,000 / project', tags: ['SEO', 'Content Marketing', 'Research'], match: 61, posted: '8 days ago' },
  { id: 990005, demoData: true, company: 'LoopWorks Supply', companyLogo: '/demo-companies/loopworks.svg', location: 'Hyderabad, Telangana', workMode: 'Hybrid', title: 'Sustainable Procurement Tracker', type: 'Project GIG', budget: '₹28,000 / project', tags: ['React', 'Data Visualization', 'APIs'], match: 72, posted: '3 days ago' },
  { id: 990006, demoData: true, company: 'Horizon Support', companyLogo: '/demo-companies/horizon.svg', location: 'Chennai, Tamil Nadu', workMode: 'Remote', title: 'Customer Support Knowledge Base', type: 'Part-time', budget: '₹10,000 / project', tags: ['Content Strategy', 'Research', 'UX Writing'], match: 65, posted: '5 days ago' },
]

const DEMO_COMPANY_PROFILES = [
  { businessName: 'Northstar Retail Labs', location: 'Kolkata, West Bengal', logo: '/demo-companies/northstar.svg', industry: 'Retail Technology', website: 'https://northstar-retail.example', teamSize: '11–50 employees', workModes: ['Remote'], description: 'Northstar Retail Labs builds practical inventory and operations tools for growing retail teams. The team focuses on clear dashboards, reliable alerts, and workflows that make day-to-day decisions easier.', hiringCategories: 'Frontend, backend, and data product projects', requiredSkills: 'React, Node.js, SQL', contactEmail: 'hello@northstar-retail.test', contactPhone: '+91 90000 00001', contactMethod: 'email', verificationMethod: 'gstin' },
  { businessName: 'GreenRoute Analytics', location: 'Bengaluru, Karnataka', logo: '/demo-companies/greenroute.svg', industry: 'Operations Analytics', website: 'https://greenroute.example', teamSize: '51–200 employees', workModes: ['Hybrid', 'Remote'], description: 'GreenRoute Analytics helps operations teams understand delivery performance, identify bottlenecks, and turn complex logistics data into useful decisions.', hiringCategories: 'Analytics internships and reporting projects', requiredSkills: 'Python, Power BI, SQL', contactEmail: 'talent@greenroute.test', contactPhone: '+91 90000 00002', contactMethod: 'email', verificationMethod: 'udyam' },
  { businessName: 'CareConnect Studio', location: 'Pune, Maharashtra', logo: '/demo-companies/careconnect.svg', industry: 'Health Product Design', website: 'https://careconnect.example', teamSize: '11–50 employees', workModes: ['Remote'], description: 'CareConnect Studio designs accessible digital journeys for appointment booking, care coordination, and patient support.', hiringCategories: 'Accessible product design and frontend projects', requiredSkills: 'Figma, React, Accessibility', contactEmail: 'studio@careconnect.test', contactPhone: '+91 90000 00003', contactMethod: 'email', verificationMethod: 'gstin' },
  { businessName: 'MarketMitra', location: 'Delhi, India', logo: '/demo-companies/marketmitra.svg', industry: 'Local Business Growth', website: 'https://marketmitra.example', teamSize: '2–10 employees', workModes: ['Remote'], description: 'MarketMitra helps local businesses improve search visibility, content quality, and customer discovery with measurable growth plans.', hiringCategories: 'SEO, content, and research sprints', requiredSkills: 'SEO, Content Marketing, Research', contactEmail: 'projects@marketmitra.test', contactPhone: '+91 90000 00004', contactMethod: 'email', verificationMethod: 'udyam' },
  { businessName: 'LoopWorks Supply', location: 'Hyderabad, Telangana', logo: '/demo-companies/loopworks.svg', industry: 'Supply Chain Software', website: 'https://loopworks.example', teamSize: '51–200 employees', workModes: ['Hybrid'], description: 'LoopWorks Supply develops procurement and supply-chain tools that make sourcing decisions more transparent, measurable, and sustainable.', hiringCategories: 'Data dashboards and API integration projects', requiredSkills: 'React, Data Visualization, APIs', contactEmail: 'work@loopworks.test', contactPhone: '+91 90000 00005', contactMethod: 'email', verificationMethod: 'gstin' },
  { businessName: 'Horizon Support', location: 'Chennai, Tamil Nadu', logo: '/demo-companies/horizon.svg', industry: 'Customer Experience', website: 'https://horizonsupport.example', teamSize: '11–50 employees', workModes: ['Remote'], description: 'Horizon Support creates clear self-service content and knowledge systems that help customer teams resolve issues faster.', hiringCategories: 'Content strategy and knowledge-base projects', requiredSkills: 'Content Strategy, Research, UX Writing', contactEmail: 'team@horizonsupport.test', contactPhone: '+91 90000 00006', contactMethod: 'email', verificationMethod: 'udyam' },
]

const DEMO_COMPANY_GIG_VARIANTS = [
  { status: 'Hiring', mode: 'Remote', type: 'Project GIG', applicants: 2, shortlisted: 1, interviewTasks: 1, pendingReview: 0 },
  { status: 'Reviewing', mode: 'Hybrid', type: 'Internship', applicants: 2, shortlisted: 1, interviewTasks: 2, pendingReview: 1 },
  { status: 'In Progress', mode: 'On-site', type: 'Project GIG', applicants: 1, shortlisted: 1, interviewTasks: 1, pendingReview: 0 },
  { status: 'Closed', mode: 'Remote', type: 'Project GIG', applicants: 1, shortlisted: 1, interviewTasks: 1, pendingReview: 0 },
  { status: 'In Progress', mode: 'Hybrid', type: 'Project GIG', applicants: 1, shortlisted: 1, interviewTasks: 1, pendingReview: 1 },
  { status: 'Hiring', mode: 'Remote', type: 'Internship', applicants: 0, shortlisted: 0, interviewTasks: 0, pendingReview: 0 },
]

const DEMO_COMPANY_GIGS = DEMO_GIGS.map((gig, index) => ({
  ...gig,
  ...DEMO_COMPANY_GIG_VARIANTS[index],
  company: undefined,
  tags: undefined,
  skills: gig.tags,
  publicId: `demo-gig-${index + 1}`,
  postedOn: gig.posted,
}))

const DEMO_TALENT = [
  { id: 'demo-student-1', studentId: 'demo-student-1', demoData: true, name: 'Aarav Sen', location: 'Kolkata, West Bengal', trustScore: 612, streak: 14, role: 'React / Node.js Talent', skills: ['React', 'Node.js', 'SQL'], profileSkills: ['React', 'Node.js', 'SQL'], skillsByLevel: { Pro: ['React'], Intermediate: ['Node.js', 'SQL'], Beginner: [], 'Pro Mastery': [] }, profileSkillsByLevel: { Pro: ['React'], Intermediate: ['Node.js', 'SQL'], Beginner: [], 'Pro Mastery': [] }, projects: ['Inventory Forecast Dashboard'], match: 92, availability: 'Available for remote projects', verified: true },
  { id: 'demo-student-2', studentId: 'demo-student-2', demoData: true, name: 'Meera Das', location: 'Durgapur, West Bengal', trustScore: 548, streak: 9, role: 'Python / Power BI Talent', skills: ['Python', 'Power BI', 'Data Analysis'], profileSkills: ['Python', 'Power BI', 'Data Analysis'], skillsByLevel: { Pro: ['Python'], Intermediate: ['Power BI', 'Data Analysis'], Beginner: [], 'Pro Mastery': [] }, profileSkillsByLevel: { Pro: ['Python'], Intermediate: ['Power BI', 'Data Analysis'], Beginner: [], 'Pro Mastery': [] }, projects: ['Regional Sales Intelligence'], match: 86, availability: 'Open to internships', verified: true },
]

const DEMO_NETWORK_PEOPLE = [
  { id: 'demo-student-3', studentId: 'demo-student-3', demoData: true, name: 'Kavya Iyer', location: 'Pune, Maharashtra', trustScore: 574, streak: 6, role: 'Figma / React Talent', skills: ['Figma', 'React', 'Accessibility'], profileSkills: ['Figma', 'React', 'Accessibility'], skillsByLevel: { Pro: [], Intermediate: ['React'], Beginner: ['Figma', 'Accessibility'], 'Pro Mastery': [] }, profileSkillsByLevel: { Pro: [], Intermediate: ['React'], Beginner: ['Figma', 'Accessibility'], 'Pro Mastery': [] }, projects: ['Accessible Appointment Flow'], match: 84, availability: 'Available for design collaboration', verified: true },
  { id: 'demo-student-4', studentId: 'demo-student-4', demoData: true, name: 'Rohan Mukherjee', location: 'Bengaluru, Karnataka', trustScore: 631, streak: 11, role: 'Python / SQL Talent', skills: ['Python', 'SQL', 'Data Visualization'], profileSkills: ['Python', 'SQL', 'Data Visualization'], skillsByLevel: { Pro: ['Python'], Intermediate: ['SQL', 'Data Visualization'], Beginner: [], 'Pro Mastery': [] }, profileSkillsByLevel: { Pro: ['Python'], Intermediate: ['SQL', 'Data Visualization'], Beginner: [], 'Pro Mastery': [] }, projects: ['Sales Forecasting Pipeline'], match: 89, availability: 'Open to analytics projects', verified: true },
  { id: 'demo-student-5', studentId: 'demo-student-5', demoData: true, name: 'Ishita Rao', location: 'Hyderabad, Telangana', trustScore: 519, streak: 4, role: 'TypeScript / UX Talent', skills: ['TypeScript', 'UX Research', 'Node.js'], profileSkills: ['TypeScript', 'UX Research', 'Node.js'], skillsByLevel: { Pro: [], Intermediate: ['TypeScript', 'Node.js'], Beginner: ['UX Research'], 'Pro Mastery': [] }, profileSkillsByLevel: { Pro: [], Intermediate: ['TypeScript', 'Node.js'], Beginner: ['UX Research'], 'Pro Mastery': [] }, projects: ['Student Onboarding Toolkit'], match: 77, availability: 'Open to frontend teams', verified: true },
]

const DEMO_NETWORK_PROFILE_DETAILS = {
  'demo-student-1': { avatar: 'https://i.pravatar.cc/200?img=12', contactMethod: 'email', verificationMethod: 'digilocker', practiceDays: 18, trustStreak: 14, completedGigs: 2, teamUps: 3, activityDays: [{ date: '2026-09-03', count: 1 }, { date: '2026-09-05', count: 2 }, { date: '2026-09-08', count: 1 }, { date: '2026-09-10', count: 3 }, { date: '2026-09-12', count: 1 }, { date: '2026-09-13', count: 2 }], githubLink: [{ url: 'https://github.com/vercel/next.js' }], projects: [{ name: 'Inventory Forecast Dashboard', desc: 'A responsive dashboard for tracking stock levels, reorder thresholds, and weekly demand forecasts.', link: 'https://github.com/vercel/next.js' }] },
  'demo-student-2': { avatar: 'https://i.pravatar.cc/200?img=47', contactMethod: 'email', verificationMethod: 'aadhaar', practiceDays: 12, trustStreak: 9, completedGigs: 1, teamUps: 2, activityDays: [{ date: '2026-09-02', count: 1 }, { date: '2026-09-06', count: 1 }, { date: '2026-09-09', count: 2 }, { date: '2026-09-11', count: 1 }, { date: '2026-09-13', count: 2 }], githubLink: [{ url: 'https://github.com/pandas-dev/pandas' }], projects: [{ name: 'Regional Sales Intelligence', desc: 'A sales-performance analysis with delivery, region, and product-level trend reporting.', link: 'https://github.com/pandas-dev/pandas' }] },
  'demo-student-3': { avatar: 'https://i.pravatar.cc/200?img=32', contactMethod: 'phone', verificationMethod: 'digilocker', practiceDays: 9, trustStreak: 6, completedGigs: 1, teamUps: 1, activityDays: [{ date: '2026-09-04', count: 1 }, { date: '2026-09-07', count: 2 }, { date: '2026-09-10', count: 1 }, { date: '2026-09-12', count: 1 }], githubLink: [{ url: 'https://github.com/w3c/wcag' }], projects: [{ name: 'Accessible Appointment Flow', desc: 'An appointment-booking prototype with keyboard navigation, focus states, and clear validation.', link: 'https://github.com/w3c/wcag' }] },
  'demo-student-4': { avatar: 'https://i.pravatar.cc/200?img=68', contactMethod: 'email', verificationMethod: 'aadhaar', practiceDays: 24, trustStreak: 11, completedGigs: 3, teamUps: 4, activityDays: [{ date: '2026-09-01', count: 2 }, { date: '2026-09-03', count: 1 }, { date: '2026-09-05', count: 2 }, { date: '2026-09-08', count: 1 }, { date: '2026-09-10', count: 2 }, { date: '2026-09-12', count: 3 }, { date: '2026-09-13', count: 1 }], githubLink: [{ url: 'https://github.com/apache/superset' }], projects: [{ name: 'Sales Forecasting Pipeline', desc: 'A reproducible forecasting workflow with validated data preparation and weekly sales projections.', link: 'https://github.com/apache/superset' }] },
  'demo-student-5': { avatar: 'https://i.pravatar.cc/200?img=49', contactMethod: 'phone', verificationMethod: 'digilocker', practiceDays: 7, trustStreak: 4, completedGigs: 0, teamUps: 2, activityDays: [{ date: '2026-09-05', count: 1 }, { date: '2026-09-09', count: 1 }, { date: '2026-09-11', count: 2 }], githubLink: [{ url: 'https://github.com/microsoft/TypeScript' }], projects: [{ name: 'Student Onboarding Toolkit', desc: 'A typed onboarding flow with research notes, progress states, and API error handling.', link: 'https://github.com/microsoft/TypeScript' }] },
}

const DEMO_NETWORK_PROFILE_SUMMARIES = {
  'demo-student-1': { about: 'Frontend-focused builder who turns operational workflows into fast, accessible product experiences. Comfortable owning the UI while partnering on API contracts and data models.', collaborationFocus: ['React product builds', 'Dashboard UX reviews', 'Node.js integrations'], workStyle: 'Async-first, clear written updates, and short weekly demos.', highlights: ['Built an inventory dashboard with stock-out alerts and role-based views.', 'Completed two verified project GIGs and three collaborative team-ups.'] },
  'demo-student-2': { about: 'Data analyst focused on making operational data understandable for non-technical teams. Enjoys combining clean analysis, useful visualizations, and practical recommendations.', collaborationFocus: ['SQL analysis', 'Power BI dashboards', 'KPI and reporting design'], workStyle: 'Starts with the business question, documents assumptions, and validates every metric.', highlights: ['Created a regional sales report covering delivery, product, and territory trends.', 'Completed a verified analytics GIG and participates in data-focused team-ups.'] },
  'demo-student-3': { about: 'Product designer with a strong accessibility mindset. Designs clear flows, reusable components, and inclusive interaction states before handoff to engineering.', collaborationFocus: ['Figma prototypes', 'Accessibility audits', 'React design systems'], workStyle: 'Collaborative workshops, concise rationale, and tested prototypes before implementation.', highlights: ['Designed an accessible appointment flow with keyboard-first navigation.', 'Combines design research with practical frontend implementation knowledge.'] },
  'demo-student-4': { about: 'Analytics developer who builds reliable pipelines and turns model outputs into clear decisions. Interested in data quality, reproducible reporting, and forecasting.', collaborationFocus: ['Python data workflows', 'SQL performance tuning', 'Forecasting and visualization'], workStyle: 'Reproducible notebooks, peer review for assumptions, and measurable delivery milestones.', highlights: ['Built a sales forecasting pipeline with documented validation checks.', 'Completed three verified project GIGs and four collaborative team-ups.'] },
  'demo-student-5': { about: 'Frontend developer who pairs TypeScript implementation with user research. Interested in reducing onboarding friction through clear feedback, resilient forms, and thoughtful content.', collaborationFocus: ['TypeScript frontends', 'UX research synthesis', 'Node.js API contracts'], workStyle: 'Small iterations, tested edge cases, and evidence-backed product decisions.', highlights: ['Created a student onboarding toolkit with typed states and research findings.', 'Open to early-stage product teams and frontend collaboration.'] },
}

const DEMO_NETWORK_PROFILE_EXTRAS = {
  'demo-student-1': { githubLink: [{ url: 'https://github.com/vercel/next.js' }, { url: 'https://developer.mozilla.org/' }], contactInfo: [{ label: 'Demo email', value: 'aarav.demo@skillbridge.test' }, { label: 'Preferred contact', value: 'GitHub discussion' }], projectDemoLink: 'https://github.com/vercel/next.js' },
  'demo-student-2': { githubLink: [{ url: 'https://github.com/pandas-dev/pandas' }, { url: 'https://www.kaggle.com/learn' }], contactInfo: [{ label: 'Demo email', value: 'meera.demo@skillbridge.test' }, { label: 'Preferred contact', value: 'Portfolio message' }], projectDemoLink: 'https://github.com/pandas-dev/pandas' },
  'demo-student-3': { githubLink: [{ url: 'https://github.com/w3c/wcag' }, { url: 'https://www.w3.org/WAI/' }], contactInfo: [{ label: 'Demo email', value: 'kavya.demo@skillbridge.test' }, { label: 'Preferred contact', value: 'Design collaboration request' }], projectDemoLink: 'https://www.w3.org/WAI/' },
  'demo-student-4': { githubLink: [{ url: 'https://github.com/apache/superset' }, { url: 'https://jupyter.org/' }], contactInfo: [{ label: 'Demo email', value: 'rohan.demo@skillbridge.test' }, { label: 'Preferred contact', value: 'Project brief' }], projectDemoLink: 'https://github.com/apache/superset' },
  'demo-student-5': { githubLink: [{ url: 'https://github.com/microsoft/TypeScript' }, { url: 'https://www.nngroup.com/' }], contactInfo: [{ label: 'Demo email', value: 'ishita.demo@skillbridge.test' }, { label: 'Preferred contact', value: 'UX research summary' }], projectDemoLink: 'https://github.com/microsoft/TypeScript' },
}

const DEMO_NETWORK_AVATARS = {
  'demo-student-1': '/demo-network/aarav-sen.png',
  'demo-student-2': '/demo-network/meera-das.png',
  'demo-student-3': '/demo-network/kavya-iyer.png',
  'demo-student-4': '/demo-network/aarav-rohan.png',
  'demo-student-5': '/demo-network/ishita-rao.png',
}

function demoNetworkCard(person) {
  return { ...person, avatar: DEMO_NETWORK_AVATARS[person.id] || null }
}

function demoNetworkProfile(person) {
  const details = DEMO_NETWORK_PROFILE_DETAILS[person.id] || {}
  const extras = DEMO_NETWORK_PROFILE_EXTRAS[person.id] || {}
  const isConnected = person.relationship?.status === 'connected'
  const stages = Object.entries(person.profileSkillsByLevel || {}).flatMap(([stage, names]) => names.map(name => [name, stage]))
  const stageByName = new Map(stages)
  return {
    ...person, ...details, ...DEMO_NETWORK_PROFILE_SUMMARIES[person.id], ...extras, avatar: DEMO_NETWORK_AVATARS[person.id] || null,
    skills: (person.profileSkills || []).map((name, index) => ({ name, stage: stageByName.get(name) || 'Beginner', verified: true, renewalStatus: 'valid', streak: Math.max(1, Number(person.streak || 0) - index * 2) })),
    githubLink: (extras.githubLink || details.githubLink || []).map((link, index) => ({ icon: index ? '🌐' : '🐙', url: link.url, saved: true })),
    // Match the real privacy rule: contact details are shared only after an
    // accepted connection. Demo contact data is deliberately fictional.
    contactInfo: isConnected ? (extras.contactInfo || []).map(item => ({ ...item, saved: true })) : [],
    projects: (details.projects || []).map(project => ({ ...project, demoLink: extras.projectDemoLink || '', saved: true })),
    videoUrl: null,
    contactVisible: isConnected,
  }
}

const DEMO_TASK_VARIANTS = [
  { type: 'live_project', title: 'Inventory workflow live project', details: { deliverables: 'Responsive inventory workflow, repository, deployed preview, screenshots, and README.', acceptanceCriteria: 'Managers can identify low stock, review reorder recommendations, and use the interface with a keyboard.', submissionRequirements: 'Public repository and deployed preview.' } },
  { type: 'code', title: 'Delivery metrics API challenge', details: { language: 'JavaScript or TypeScript', testCases: 'Validate empty data, invalid dates, duplicate routes, and aggregate delivery-time calculations.', submissionRequirements: 'Repository with tests and setup instructions.' } },
  { type: 'mcq', title: 'SQL reporting fundamentals', details: { questionCount: '10', questions: 'Ten questions covering joins, grouping, indexes, null handling, and query plans.', options: 'Four options per question.', answerKey: 'Stored privately for company review.', passingScore: '70' } },
  { type: 'written', title: 'Local SEO recommendation brief', details: { wordLimit: '500', evaluationCriteria: 'Specific recommendations, prioritization, evidence, clarity, and measurable outcomes.', submissionRequirements: 'Structured written response.' } },
  { type: 'mixed', title: 'Accessible product audit', details: { components: 'Written audit, corrected component code, and a short verification checklist.', evaluationCriteria: 'Accessibility accuracy, implementation quality, testing, and communication.', submissionRequirements: 'Audit document and repository link.' } },
  { type: 'design', title: 'Appointment booking design challenge', details: { deliverables: 'User flow, responsive screens, component states, and accessibility annotations.', evaluationCriteria: 'Clarity, usability, consistency, accessibility, and handoff quality.', submissionRequirements: 'Public prototype link and design rationale.' } },
  { type: 'data_analysis', title: 'Regional delivery analysis', details: { deliverables: 'Cleaned dataset, reproducible analysis, dashboard, and three operational recommendations.', evaluationCriteria: 'Accuracy, reproducibility, visualization quality, and business relevance.', submissionRequirements: 'Notebook or repository plus dashboard link.' } },
  { type: 'case_study', title: 'Customer-support case study', details: { deliverables: 'Root-cause analysis, prioritised solution, risks, and success measures.', evaluationCriteria: 'Reasoning, evidence, feasibility, and measurable impact.', submissionRequirements: 'Public document or PDF link.' } },
  { type: 'research', title: 'Sustainable procurement research', details: { deliverables: 'Source review, research findings, limitations, and actionable recommendations.', evaluationCriteria: 'Source quality, methodology, synthesis, citations, and clarity.', submissionRequirements: 'Cited research report.' } },
  { type: 'presentation', title: 'Business dashboard presentation', details: { deliverables: 'Eight-to-ten slides presenting the problem, evidence, recommendation, and next steps.', evaluationCriteria: 'Narrative, evidence, visual communication, and audience relevance.', submissionRequirements: 'Public slide deck link.' } },
]

const DEMO_TASKS = DEMO_TASK_VARIANTS.map((variant, index) => {
  const gig = DEMO_COMPANY_GIGS[index % DEMO_COMPANY_GIGS.length]
  return {
    id: `demo-task-${index + 1}`, demoData: true, type: variant.type, title: variant.title,
    instructions: 'Complete a focused work sample, document assumptions, validate important edge cases, and explain the expected business impact.',
    details: variant.details, deadline: '2026-12-15', points: 100, skills: gig.skills,
    createdAt: '2026-09-01T10:30:00.000Z', updatedAt: '2026-09-10T10:30:00.000Z',
  }
})

const DEMO_SUBMISSIONS = [
  { id: 'demo-submission-1', demoData: true, studentId: 'demo-student-1', studentName: 'Aarav Sen', gigTitle: 'Retail Inventory Dashboard', taskTitle: 'Inventory dashboard practical assignment', taskType: 'code', taskPoints: 100, score: 91, status: 'delivered', submissionLink: 'https://github.com/github/docs', submissionContent: 'Implemented the inventory workflow with validation, accessible states, automated tests, and deployment documentation.', feedback: '', submittedAt: '2026-09-09T10:30:00.000Z', workBrief: 'Deliver a responsive inventory dashboard with reorder alerts and a documented handover.', matchedSkills: ['React', 'Node.js', 'SQL'] },
  { id: 'demo-submission-2', demoData: true, studentId: 'demo-student-2', studentName: 'Meera Das', gigTitle: 'Delivery Performance Analysis', taskTitle: 'Delivery analysis practical assignment', taskType: 'data_analysis', taskPoints: 100, score: 88, status: 'completed', submissionLink: 'https://github.com/pandas-dev/pandas', submissionContent: 'Cleaned the operational dataset, documented assumptions, and created an actionable performance dashboard.', feedback: 'Clear analysis with useful operational recommendations.', submittedAt: '2026-09-04T10:30:00.000Z', completedAt: '2026-09-12T10:30:00.000Z', externalPayment: { amount: 18000, currency: 'INR', reference: 'DEMO-TXN-2026-001', method: 'bank_transfer', paidOn: '2026-09-12', recordedAt: '2026-09-12T10:30:00.000Z', source: 'company_reported' }, matchedSkills: ['Python', 'Power BI', 'SQL'] },
  { id: 'demo-submission-review-1', demoData: true, studentId: 'demo-student-1', studentName: 'Aarav Sen', gigTitle: 'Retail Inventory Dashboard', taskTitle: 'Inventory workflow live project', taskType: 'live_project', taskPoints: 100, score: null, status: 'submitted', submissionLink: 'https://github.com/vercel/next.js', submissionContent: 'Submitted the inventory workflow, validation notes, test evidence, and deployment instructions.', feedback: '', submittedAt: '2026-09-14T10:30:00.000Z' },
  { id: 'demo-submission-review-2', demoData: true, studentId: 'demo-student-2', studentName: 'Meera Das', gigTitle: 'Delivery Performance Analysis', taskTitle: 'Regional delivery analysis', taskType: 'data_analysis', taskPoints: 100, score: 88, status: 'reviewed', submissionLink: 'https://github.com/pandas-dev/pandas', submissionContent: 'Provided a reproducible analysis and dashboard with operational recommendations.', feedback: 'Strong analysis; ready for the selection decision.', submittedAt: '2026-09-13T10:30:00.000Z' },
  { id: 'demo-submission-review-3', demoData: true, studentId: 'demo-student-1', studentName: 'Aarav Sen', gigTitle: 'Accessible Appointment Experience', taskTitle: 'Accessible product audit', taskType: 'mixed', taskPoints: 100, score: 72, status: 'needs_revision', submissionLink: 'https://github.com/w3c/wcag', submissionContent: 'Submitted the audit and corrected components for review.', feedback: 'Add keyboard testing evidence and document the focus-order decision.', submittedAt: '2026-09-12T10:30:00.000Z' },
  { id: 'demo-submission-review-4', demoData: true, studentId: 'demo-student-2', studentName: 'Meera Das', gigTitle: 'Sustainable Procurement Tracker', taskTitle: 'Sustainable procurement research', taskType: 'research', taskPoints: 100, score: 91, status: 'selected', submissionLink: '', submissionContent: '', feedback: 'Selected after a clear, evidence-backed interview submission.', submittedAt: '2026-09-11T10:30:00.000Z' },
  { id: 'demo-submission-review-5', demoData: true, studentId: 'demo-student-1', studentName: 'Aarav Sen', gigTitle: 'Customer Support Knowledge Base', taskTitle: 'Customer-support case study', taskType: 'case_study', taskPoints: 100, score: 45, status: 'rejected', submissionLink: 'https://developer.mozilla.org/', submissionContent: 'Submitted a short support workflow proposal.', feedback: 'The evidence and success measures need substantially more detail.', submittedAt: '2026-09-10T10:30:00.000Z' },
  { id: 'demo-submission-workspace-1', demoData: true, studentId: 'demo-student-3', studentName: 'Kavya Iyer', gigTitle: 'Accessible Appointment Experience', taskTitle: 'Appointment booking design challenge', taskType: 'design', taskPoints: 100, score: 89, status: 'selected', submissionLink: 'https://www.w3.org/WAI/', submissionContent: 'Created the accessible booking flow, annotated component states, and documented keyboard-first interactions.', feedback: 'Selected for the accessibility-focused design work.', submittedAt: '2026-09-13T10:30:00.000Z', matchedSkills: ['Figma', 'React', 'Accessibility'] },
  { id: 'demo-submission-workspace-2', demoData: true, studentId: 'demo-student-4', studentName: 'Rohan Mukherjee', gigTitle: 'Retail Inventory Dashboard', taskTitle: 'Inventory forecasting data workflow', taskType: 'data_analysis', taskPoints: 100, score: 93, status: 'work_started', submissionLink: 'https://github.com/apache/superset', submissionContent: '', feedback: '', submittedAt: '2026-09-12T10:30:00.000Z', matchedSkills: ['Python', 'SQL', 'Data Visualization'] },
  { id: 'demo-submission-workspace-3', demoData: true, studentId: 'demo-student-5', studentName: 'Ishita Rao', gigTitle: 'Local Business SEO Sprint', taskTitle: 'Local SEO recommendation brief', taskType: 'written', taskPoints: 75, score: 86, status: 'delivered', submissionLink: 'https://www.nngroup.com/', submissionContent: 'Delivered a prioritised SEO brief with research notes, success measures, and a practical implementation sequence.', feedback: '', submittedAt: '2026-09-14T10:30:00.000Z', matchedSkills: ['TypeScript', 'UX Research', 'Node.js'] },
]

const DEMO_PROJECT_VARIANTS = [
  { submissionIndex: 5, status: 'Planning', progress: 15, update: 'Selection confirmed and the kickoff agenda has been shared.', milestone: 'Confirm scope and success measures' },
  { submissionIndex: 7, status: 'Planning', progress: 10, update: 'Kavya was selected and the accessible design kickoff is ready to start.', milestone: 'Confirm accessible flow and component states' },
  { submissionIndex: 4, status: 'In Progress', progress: 55, update: 'The first delivery was reviewed and accessibility evidence is being added.', milestone: 'Submit revised delivery evidence' },
  { submissionIndex: 8, status: 'In Progress', progress: 40, update: 'Rohan started the data workflow for the same inventory GIG.', milestone: 'Validate the inventory forecasting dataset' },
  { submissionIndex: 2, status: 'Review', progress: 85, update: 'Aarav submitted the product delivery and it is awaiting company approval.', milestone: 'Complete final company review' },
  { submissionIndex: 9, status: 'Review', progress: 80, update: 'Ishita delivered the SEO brief with practical recommendations for review.', milestone: 'Review SEO recommendations and measures' },
  { submissionIndex: 1, status: 'Completed', progress: 100, update: 'Delivery was approved, handed over, and marked complete.', milestone: 'Production-ready delivery' },
]

const DEMO_PROJECTS = DEMO_PROJECT_VARIANTS.map((variant, index) => {
  const submission = DEMO_SUBMISSIONS[variant.submissionIndex]
  return {
    id: `demo-project-${index + 1}`, submissionId: submission.id, demoData: true, title: submission.gigTitle,
    studentId: submission.studentId, studentAvatar: DEMO_NETWORK_AVATARS[submission.studentId] || '',
    team: [submission.studentName], deadline: `2026-12-${String(17 + index).padStart(2, '0')}`, status: variant.status, progress: variant.progress,
    tasks: [{ name: variant.milestone, owner: submission.studentName, state: variant.status === 'Completed' ? 'Done' : variant.status === 'Review' ? 'In Review' : 'Todo' }],
    updates: [{ id: `demo-update-${index + 1}`, message: variant.update, sharedAt: `2026-09-${String(8 + index).padStart(2, '0')}T10:30:00.000Z` }],
    milestones: [{ id: `demo-milestone-${index + 1}`, title: variant.milestone, dueDate: `2026-12-${String(17 + index).padStart(2, '0')}`, status: variant.status === 'Completed' ? 'Completed' : 'Open', createdAt: '2026-09-05T10:30:00.000Z' }],
    submission,
  }
})

const demoCompanyGigState = () => clone({
  stats: [{ label: 'Open GIGs', value: '6', tone: '#1D4ED8', bg: '#DBEAFE', icon: '📋' }, { label: 'Applications', value: '11', tone: '#065F46', bg: '#D1FAE5', icon: '📥' }, { label: 'Interview Tasks Sent', value: '3', tone: '#92400E', bg: '#FEF3C7', icon: '🚀' }, { label: 'Active Hires', value: '2', tone: '#7C3AED', bg: '#EDE9FE', icon: '⚡' }],
  gigs: DEMO_COMPANY_GIGS, pipeline: [{ label: 'New Applications', value: '6', bg: '#EFF6FF', color: '#1D4ED8' }, { label: 'Interview Task Pending', value: '3', bg: '#FEF3C7', color: '#92400E' }, { label: 'Task Submitted', value: '2', bg: '#EDE9FE', color: '#7C3AED' }, { label: 'Selected', value: '2', bg: '#D1FAE5', color: '#065F46' }],
  recentActivity: ['Demo preview · Aarav Sen delivered the inventory dashboard.', 'Demo preview · Meera Das completed the analytics assignment.', 'Demo preview · A new application was received for the SEO sprint.'],
  applicantsByGig: {
    990001: [demoNetworkCard(DEMO_TALENT[0]), demoNetworkCard(DEMO_TALENT[1])],
    990002: [demoNetworkCard(DEMO_TALENT[1]), demoNetworkCard(DEMO_TALENT[0])],
    990003: [demoNetworkCard(DEMO_TALENT[0])],
    990004: [demoNetworkCard(DEMO_TALENT[1])],
    990005: [demoNetworkCard(DEMO_TALENT[0])],
    990006: [],
  },
})

const demoStudentGigState = () => clone({
  opportunities: [{
    id: 'demo-opportunity-1', demoData: true, source: 'direct_invite', status: 'new',
    title: 'Retail Inventory Dashboard', company: 'Northstar Retail Labs', companyLogo: '/demo-companies/northstar.svg', location: 'Kolkata, West Bengal',
    type: 'Project GIG', stipend: '₹24,000 / project', duration: '4-week remote project',
    deadline: 'Respond by 20 Sep 2026', sentOn: 'Today', matchedSkills: ['React', 'SQL'],
    taskTitle: 'Inventory dashboard planning task', taskType: 'code', taskDeadline: '22 Sep 2026', taskPoints: 100,
    taskInstructions: 'Outline a responsive inventory dashboard for a regional retailer. Explain the primary views, stock-out alerts, data assumptions, and how a store manager can act on an alert.',
    taskDetails: { deliverables: 'A public repository or document with a short solution outline, wireframe or component plan, and README.', acceptanceCriteria: 'The plan covers inventory visibility, reorder alerts, accessibility, and clear assumptions.', submissionRequirements: 'Share one public link and a concise implementation explanation.', language: 'JavaScript or TypeScript' },
    message: 'Your React and SQL work stood out. We would like you to review a short planning task for an inventory dashboard that helps store teams prevent stock-outs.',
  }, {
    id: 'demo-opportunity-2', demoData: true, source: 'application_invite', status: 'new',
    title: 'Local Business SEO Sprint', company: 'MarketMitra', companyLogo: '/demo-companies/marketmitra.svg', location: 'Delhi, India',
    type: 'Part-Time GIG', stipend: '₹12,000 / project', duration: '2-week remote sprint',
    deadline: 'Respond by 21 Sep 2026', sentOn: 'Yesterday', matchedSkills: [], matchSummary: 'Company reviewed your profile after your Browse GIG application.',
    taskTitle: 'Local search opportunity review', taskType: 'written', taskDeadline: '23 Sep 2026', taskPoints: 75,
    taskInstructions: 'Review a local business search scenario and propose three practical SEO improvements. Explain the expected impact, priority, and how you would measure the result.',
    taskDetails: { deliverables: 'A structured written recommendation with three prioritized actions.', acceptanceCriteria: 'Recommendations are specific, measurable, and relevant to a local business.', wordLimit: '500 words', evaluationCriteria: 'Research quality, prioritization, clarity, and expected business impact.' },
    message: 'Thanks for applying through Browse GIGs. Your profile matches this local-search project, and we would like to invite you to complete a short practical task before selection.',
  }, {
    id: 'demo-opportunity-result-rejected', demoData: true, source: 'application_invite', status: 'accepted', taskSubmissionStatus: 'rejected',
    title: 'Delivery Performance Analysis', company: 'GreenRoute Analytics', companyLogo: '/demo-companies/greenroute.svg', location: 'Bengaluru, Karnataka',
    type: 'Internship', stipend: '₹15,000 / month', duration: '3-month hybrid internship',
    deadline: 'Review completed', sentOn: '4 days ago', matchedSkills: ['Python', 'SQL'], companyFeedback: 'The analysis needs stronger validation evidence and clearer ownership of the dashboard implementation.',
    taskTitle: 'Delivery metrics analysis', taskType: 'data_analysis', taskDeadline: '11 Sep 2026', taskPoints: 100,
    taskInstructions: 'Analyze the delivery dataset and present operational findings supported by reproducible evidence.',
    taskDetails: { deliverables: 'Analysis notebook and dashboard.', evaluationCriteria: 'Accuracy, validation, clarity, and practical recommendations.', submissionRequirements: 'Public evidence link with a concise explanation.' },
    message: 'Your interview task has been reviewed. Open the interview result to read the company feedback.',
    demoTaskSubmission: {
      id: 'demo-interview-result-rejected', status: 'rejected', score: 48, revisionReturnStatus: 'submitted',
      submissionLink: 'https://github.com/pandas-dev/pandas', submissionContent: 'Submitted an initial delivery summary and dashboard outline.', note: '',
      feedback: 'The analysis needs stronger validation evidence and clearer ownership of the dashboard implementation.',
    },
  }, {
    id: 'demo-opportunity-result-revision', demoData: true, source: 'direct_invite', status: 'accepted', taskSubmissionStatus: 'needs_revision', revisionReturnStatus: 'submitted',
    title: 'Accessible Appointment Experience', company: 'CareConnect Studio', companyLogo: '/demo-companies/careconnect.svg', location: 'Pune, Maharashtra',
    type: 'Project GIG', stipend: '₹30,000 / project', duration: '4-week remote project',
    deadline: 'Revision due 18 Sep 2026', sentOn: '2 days ago', matchedSkills: ['Figma', 'Accessibility'], companyFeedback: 'Add keyboard-navigation evidence and explain the focus order before resubmitting.',
    taskTitle: 'Accessible booking flow interview task', taskType: 'design', taskDeadline: '18 Sep 2026', taskPoints: 100,
    taskInstructions: 'Design and explain an accessible appointment-booking flow with responsive and keyboard interaction states.',
    taskDetails: { deliverables: 'Public prototype and accessibility notes.', evaluationCriteria: 'Usability, accessibility, clarity, and implementation readiness.', submissionRequirements: 'Prototype link and concise design rationale.' },
    message: 'We reviewed your interview task and would like one focused revision before making the selection decision.',
    demoTaskSubmission: {
      id: 'demo-interview-result-revision', status: 'needs_revision', score: 72, revisionReturnStatus: 'submitted',
      submissionLink: 'https://www.w3.org/WAI/', submissionContent: 'Submitted the appointment flow and annotated component states.', note: '',
      feedback: 'Add keyboard-navigation evidence and explain the focus order before resubmitting.',
    },
  }],
  browseGigs: DEMO_GIGS,
  savedGigIds: [990005],
  appliedGigIds: [990004],
  appliedGigs: [{ ...DEMO_GIGS[3], demoData: true, progress: 'Application under company review' }],
  activeGigBase: [
    {
      ...DEMO_GIGS[5], id: 990015, opportunityId: 'demo-work-opportunity-selected', demoData: true, demoWork: true,
      status: 'accepted', bridgeStatus: 'selected', taskSubmissionStatus: 'selected', progress: 'Selected · company preparing work brief',
      taskTitle: 'Customer-support interview result', taskType: 'case_study', taskPoints: 100,
      demoTaskSubmission: {
        id: 'demo-work-submission-selected', status: 'selected', revisionReturnStatus: 'submitted', score: 87,
        workBrief: '', submissionLink: 'https://developer.mozilla.org/', submissionContent: 'Submitted a structured support workflow with prioritisation, risks, and measurable service outcomes.',
        feedback: 'Strong reasoning and clear success measures. Selected for the paid GIG work.', note: 'Interview submission accepted.',
        workspace: { deadline: '', updates: [], milestones: [] },
      },
    },
    {
      ...DEMO_GIGS[2], id: 990011, opportunityId: 'demo-work-opportunity-1', demoData: true, demoWork: true,
      status: 'accepted', bridgeStatus: 'needs_revision', taskSubmissionStatus: 'needs_revision', progress: 'Accessibility evidence revision requested',
      taskTitle: 'Accessible appointment GIG delivery', taskType: 'mixed', taskPoints: 100,
      demoTaskSubmission: {
        id: 'demo-work-submission-1', status: 'needs_revision', revisionReturnStatus: 'delivered', score: 89,
        workBrief: 'Deliver an accessible appointment-booking experience with responsive screens, keyboard navigation, focus states, validation, and a concise engineering handoff.',
        submissionLink: 'https://www.w3.org/WAI/', submissionContent: 'Delivered the booking flow, annotated component states, and accessibility verification notes.',
        feedback: 'Add final keyboard-testing evidence and document the confirmed focus order.', note: 'Updated accessibility evidence is being prepared.',
        workspace: {
          deadline: '2026-12-18',
          updates: [
            { id: 'demo-student-update-1', message: 'The first delivery was reviewed. Please add keyboard-testing evidence before resubmitting.', sharedAt: '2026-09-13T10:30:00.000Z' },
            { id: 'demo-student-update-2', message: 'Keep the current visual design; only the accessibility evidence needs revision.', sharedAt: '2026-09-14T10:30:00.000Z' },
          ],
          milestones: [
            { id: 'demo-student-milestone-1', title: 'Complete booking flow', dueDate: '2026-12-12', status: 'Completed' },
            { id: 'demo-student-milestone-2', title: 'Add keyboard testing evidence', dueDate: '2026-12-18', status: 'Open' },
          ],
        },
      },
    },
    {
      ...DEMO_GIGS[0], id: 990013, opportunityId: 'demo-work-opportunity-2', demoData: true, demoWork: true,
      status: 'accepted', bridgeStatus: 'work_started', taskSubmissionStatus: 'work_started', progress: 'Kickoff completed · work in progress',
      taskTitle: 'Retail inventory GIG delivery', taskType: 'mixed', taskPoints: 100,
      demoTaskSubmission: {
        id: 'demo-work-submission-2', status: 'work_started', revisionReturnStatus: 'delivered', score: 93,
        workBrief: 'Build a responsive inventory dashboard with stock visibility, reorder alerts, accessible controls, validation, automated tests, and deployment documentation.',
        submissionLink: '', submissionContent: '', feedback: '', note: '',
        workspace: {
          deadline: '2026-12-20',
          updates: [
            { id: 'demo-student-update-3', message: 'Kickoff completed. Start with inventory visibility and the low-stock alert workflow.', sharedAt: '2026-09-12T10:30:00.000Z' },
          ],
          milestones: [
            { id: 'demo-student-milestone-3', title: 'Confirm dashboard data model', dueDate: '2026-12-12', status: 'Completed' },
            { id: 'demo-student-milestone-4', title: 'Deliver stock-alert workflow', dueDate: '2026-12-17', status: 'Open' },
            { id: 'demo-student-milestone-5', title: 'Submit tested final dashboard', dueDate: '2026-12-20', status: 'Open' },
          ],
        },
      },
    },
    {
      ...DEMO_GIGS[4], id: 990014, opportunityId: 'demo-work-opportunity-3', demoData: true, demoWork: true,
      status: 'accepted', bridgeStatus: 'delivered', taskSubmissionStatus: 'delivered', progress: 'Final delivery submitted for company review',
      taskTitle: 'Sustainable procurement GIG delivery', taskType: 'mixed', taskPoints: 100,
      demoTaskSubmission: {
        id: 'demo-work-submission-3', status: 'delivered', revisionReturnStatus: 'delivered', score: null,
        workBrief: 'Deliver a procurement tracker with supplier comparisons, sustainability indicators, clear sourcing assumptions, and a documented handover.',
        submissionLink: 'https://github.com/apache/superset', submissionContent: 'Submitted the procurement tracker, source review, sustainability indicators, limitations, and deployment notes.',
        feedback: '', note: 'Final delivery is ready for company review.',
        workspace: {
          deadline: '2026-12-22',
          updates: [
            { id: 'demo-student-update-4', message: 'All requested indicators are confirmed. Include limitations in the final handover.', sharedAt: '2026-09-13T10:30:00.000Z' },
            { id: 'demo-student-update-5', message: 'Final delivery received and queued for company approval.', sharedAt: '2026-09-15T10:30:00.000Z' },
          ],
          milestones: [
            { id: 'demo-student-milestone-6', title: 'Confirm supplier comparison model', dueDate: '2026-12-14', status: 'Completed' },
            { id: 'demo-student-milestone-7', title: 'Complete sustainability indicators', dueDate: '2026-12-19', status: 'Completed' },
            { id: 'demo-student-milestone-8', title: 'Company reviews final delivery', dueDate: '2026-12-22', status: 'Open' },
          ],
        },
      },
    },
  ],
  completedGigs: [{
    ...DEMO_GIGS[1], id: 990012, opportunityId: 'demo-work-opportunity-completed-1', demoData: true, demoWork: true,
    status: 'accepted', bridgeStatus: 'completed', taskSubmissionStatus: 'completed', completedOn: '2026-09-12', progress: 'Completed · payment reported',
    taskTitle: 'Delivery analysis GIG delivery', taskType: 'mixed', taskPoints: 100,
    demoTaskSubmission: {
      id: 'demo-work-submission-completed-1', status: 'completed', revisionReturnStatus: 'delivered', score: 88,
      workBrief: 'Deliver a reproducible regional delivery analysis with a cleaned dataset, operational dashboard, documented assumptions, and three measurable recommendations.',
      submissionLink: 'https://github.com/pandas-dev/pandas', submissionContent: 'Delivered the cleaned analysis, performance dashboard, validation notes, and operational recommendations.',
      feedback: 'Clear analysis with useful operational recommendations.', note: 'Final handover completed.',
      externalPayment: { amount: 18000, currency: 'INR', reference: 'DEMO-TXN-2026-001', method: 'bank_transfer', paidOn: '2026-09-12', source: 'company_reported' },
      workspace: {
        deadline: '2026-09-12',
        updates: [
          { id: 'demo-student-update-completed-1', message: 'Dashboard validation completed and the final handover was approved.', sharedAt: '2026-09-12T10:30:00.000Z' },
        ],
        milestones: [
          { id: 'demo-student-milestone-completed-1', title: 'Validate delivery dataset', dueDate: '2026-09-08', status: 'Completed' },
          { id: 'demo-student-milestone-completed-2', title: 'Deliver operations dashboard', dueDate: '2026-09-10', status: 'Completed' },
          { id: 'demo-student-milestone-completed-3', title: 'Company approval and handover', dueDate: '2026-09-12', status: 'Completed' },
        ],
      },
    },
  }],
})
const demoTaskLibraryState = () => clone({ tasks: DEMO_TASKS, revision: 0 })
const demoWorkspaceState = () => clone({ projects: DEMO_PROJECTS, selectedProjectId: 'demo-project-1', statusFilter: 'All' })
const demoPaymentState = () => clone({ mode: 'external', pending: [
  { id: 'demo-submission-1', demoData: true, title: DEMO_SUBMISSIONS[0].gigTitle, studentName: DEMO_SUBMISSIONS[0].studentName, budget: '₹24,000 / project', approvedAt: '2026-09-13' },
  { id: 'demo-submission-pending-2', demoData: true, title: 'Accessible Appointment Experience', studentName: 'Kavya Iyer', budget: '₹30,000 / project', approvedAt: '2026-09-11' },
  { id: 'demo-submission-pending-3', demoData: true, title: 'Local Business SEO Sprint', studentName: 'Ishita Rao', budget: '₹12,000 / project', approvedAt: '2026-09-09' },
], transactions: [
  { id: 'demo-submission-2', demoData: true, title: DEMO_SUBMISSIONS[1].gigTitle, studentName: DEMO_SUBMISSIONS[1].studentName, ...DEMO_SUBMISSIONS[1].externalPayment },
  { id: 'demo-payment-upi-1', demoData: true, title: 'Retail Inventory Dashboard', studentName: 'Rohan Mukherjee', amount: 24000, currency: 'INR', reference: 'DEMO-UPI-2026-014', method: 'upi', paidOn: '2026-09-08', recordedAt: '2026-09-08T10:30:00.000Z', source: 'company_reported' },
  { id: 'demo-payment-other-1', demoData: true, title: 'Accessible Appointment Experience', studentName: 'Kavya Iyer', amount: 30000, currency: 'INR', reference: 'DEMO-EXT-2026-009', method: 'other', paidOn: '2026-08-27', recordedAt: '2026-08-27T10:30:00.000Z', source: 'company_reported' },
] })

const DEMO_ASSESSMENTS = [
  { id: 'demo-assessment-available', demoData: true, skillName: 'React', mode: 'upgrade', targetStage: 'Pro Mastery', challengeId: null, evidenceLink: 'https://github.com/facebook/react', response: 'A production-style component architecture was implemented with accessible states, validation, automated tests, and a documented trade-off analysis.', status: 'pending', feedback: '', createdAt: '2026-09-10T10:30:00.000Z', reviewedAt: null, earnedDay: '2026-09-10', brief: 'Demonstrate advanced React architecture and evidence of production-ready decisions.', rewardPoints: 0, rubric: null, reviewHistory: [], assignedReviewerId: '', assignedReviewerName: '', claimedAt: null },
  { id: 'demo-assessment-mine', demoData: true, skillName: 'SQL', mode: 'reverify', targetStage: '', challengeId: null, evidenceLink: 'https://github.com/github/docs', response: 'A realistic reporting query was rebuilt, validated against edge cases, and explained with performance considerations.', status: 'needs_revision', feedback: 'Add query-plan evidence and explain how the indexes support the reporting workload.', createdAt: '2026-09-08T10:30:00.000Z', reviewedAt: '2026-09-09T10:30:00.000Z', earnedDay: '2026-09-08', brief: 'Show retained SQL knowledge through a practical example.', rewardPoints: 0, rubric: null, reviewHistory: [], assignedReviewerId: 'demo-reviewer', assignedReviewerName: 'Platform Reviewer', claimedAt: '2026-09-08T12:00:00.000Z' },
  { id: 'demo-assessment-completed', demoData: true, skillName: 'TypeScript', mode: 'upgrade', targetStage: 'Intermediate', challengeId: null, evidenceLink: 'https://github.com/microsoft/TypeScript', response: 'The submission demonstrates typed API contracts, error handling, tests, and a clear migration note.', status: 'approved', feedback: 'Clear evidence, thoughtful validation, and relevant practical outcomes.', createdAt: '2026-08-20T10:30:00.000Z', reviewedAt: '2026-08-22T10:30:00.000Z', earnedDay: '2026-08-20', brief: 'Provide original evidence of applied TypeScript skills.', rewardPoints: 100, rubric: { correctness: 5, evidence: 4, understanding: 5, testing: 4, communication: 5, total: 92 }, reviewHistory: [], assignedReviewerId: 'demo-reviewer', assignedReviewerName: 'Platform Reviewer', claimedAt: '2026-08-21T10:30:00.000Z' },
  { id: 'demo-assessment-figma-pending', demoData: true, skillName: 'Figma', mode: 'verify', targetStage: '', challengeId: null, evidenceLink: 'https://www.figma.com', response: 'A mobile booking flow includes reusable components, accessible labels, and a short usability rationale.', status: 'pending', feedback: '', createdAt: '2026-09-12T10:30:00.000Z', reviewedAt: null, earnedDay: '2026-09-12', brief: 'Provide original design evidence for an initial verification.', rewardPoints: 0, rubric: null, reviewHistory: [], assignedReviewerId: '', assignedReviewerName: '', claimedAt: null },
  { id: 'demo-assessment-python-rejected', demoData: true, skillName: 'Python', mode: 'reverify', targetStage: '', challengeId: null, evidenceLink: 'https://github.com/pandas-dev/pandas', response: 'The solution outlines data cleanup and a basic summary of the findings.', status: 'rejected', feedback: 'Include reproducible source work, validation results, and a clearer explanation of your contribution before resubmitting.', createdAt: '2026-08-18T10:30:00.000Z', reviewedAt: '2026-08-19T10:30:00.000Z', earnedDay: '2026-08-18', brief: 'Renew Python verification with current practical evidence.', rewardPoints: 0, rubric: { correctness: 2, evidence: 1, understanding: 3, testing: 1, communication: 3, total: 40 }, reviewHistory: [], assignedReviewerId: 'demo-reviewer', assignedReviewerName: 'Platform Reviewer', claimedAt: '2026-08-18T12:00:00.000Z' },
  { id: 'demo-assessment-docker-approved', demoData: true, skillName: 'Docker', mode: 'verify', targetStage: '', challengeId: null, evidenceLink: 'https://www.docker.com', response: 'The project includes a reproducible container setup, health checks, and deployment notes.', status: 'approved', feedback: 'The delivery met the verification standard before this skill was archived.', createdAt: '2026-01-09T10:30:00.000Z', reviewedAt: '2026-01-10T10:30:00.000Z', earnedDay: '2026-01-09', brief: 'Provide original DevOps evidence for Docker verification.', rewardPoints: 60, rubric: { correctness: 5, evidence: 4, understanding: 4, testing: 4, communication: 4, total: 84 }, reviewHistory: [], assignedReviewerId: 'demo-reviewer', assignedReviewerName: 'Platform Reviewer', claimedAt: '2026-01-09T12:00:00.000Z' },
]

function demoNetworkRelationship(person) {
  if (person.id === 'demo-student-1') return { connectionId: 'demo-connection-1', status: 'connected' }
  if (person.id === 'demo-student-3') return { connectionId: 'demo-connection-incoming-1', status: 'incoming_pending' }
  if (person.id === 'demo-student-4') return { connectionId: 'demo-connection-outgoing-1', status: 'outgoing_pending' }
  return { status: 'none' }
}

function demoNetworkPerson(person) {
  return { ...demoNetworkCard(person), relationship: demoNetworkRelationship(person) }
}

const DEMO_NETWORK_STATE = {
  people: [...DEMO_TALENT, ...DEMO_NETWORK_PEOPLE].map(demoNetworkPerson),
  incomingRequests: [{ id: 'demo-connection-incoming-1', demoData: true, profile: demoNetworkPerson(DEMO_NETWORK_PEOPLE[0]), createdAt: '2026-09-13T09:30:00.000Z' }],
  outgoingRequests: [{ id: 'demo-connection-outgoing-1', demoData: true, profile: demoNetworkPerson(DEMO_NETWORK_PEOPLE[1]), createdAt: '2026-09-12T15:45:00.000Z' }],
  connections: [demoNetworkPerson(DEMO_TALENT[0])],
  suggestions: [demoNetworkPerson(DEMO_TALENT[1]), ...DEMO_NETWORK_PEOPLE.map(demoNetworkPerson)],
  openTeamPosts: [
    { id: 'demo-team-1', demoData: true, title: 'Build an accessibility checker for local businesses', description: 'Create an open-source tool that checks contrast, labels, headings, and keyboard navigation, then produces a practical report.', type: 'Open Source', requiredSkills: ['React', 'Accessibility', 'Testing'], slots: 3, filled: 1, status: 'open', createdAt: '2026-09-05T10:30:00.000Z', owner: demoNetworkCard(DEMO_TALENT[0]), joinStatus: null, joinRequestId: '', requestSource: null, requests: [], members: [demoNetworkCard(DEMO_TALENT[1])] },
    { id: 'demo-team-2', demoData: true, title: 'Map delivery delays with reproducible data', description: 'Analyse delivery delays by route and time window, then create a concise dashboard with clear recommendations.', type: 'Data Challenge', requiredSkills: ['Python', 'SQL', 'Data Visualization'], slots: 4, filled: 2, status: 'open', createdAt: '2026-09-07T10:30:00.000Z', owner: demoNetworkCard(DEMO_TALENT[1]), joinStatus: 'pending', joinRequestId: 'demo-team-request-outgoing-1', requestSource: 'application', requests: [], members: [] },
    { id: 'demo-team-3', demoData: true, title: 'Redesign a student onboarding flow', description: 'Pair UX research with a responsive prototype and document the accessibility decisions for the handoff.', type: 'Design Challenge', requiredSkills: ['Figma', 'UX Research', 'Accessibility'], slots: 3, filled: 1, status: 'open', createdAt: '2026-09-09T10:30:00.000Z', owner: demoNetworkCard(DEMO_NETWORK_PEOPLE[0]), joinStatus: 'pending', joinRequestId: 'demo-team-invitation-1', requestSource: 'invitation', requests: [], members: [] },
    { id: 'demo-team-4', demoData: true, title: 'Ship a typed API starter kit', description: 'Build reusable typed API helpers, error states, and a small example app with integration tests.', type: 'Project', requiredSkills: ['TypeScript', 'Node.js', 'Testing'], slots: 3, filled: 3, status: 'open', createdAt: '2026-09-03T10:30:00.000Z', owner: demoNetworkPerson(DEMO_NETWORK_PEOPLE[1]), joinStatus: 'accepted', joinRequestId: 'demo-team-membership-1', requestSource: 'application', requests: [], members: [demoNetworkPerson(DEMO_TALENT[0]), demoNetworkPerson(DEMO_TALENT[1])] },
  ],
  myTeamPosts: [{ id: 'demo-team-mine-1', demoData: true, title: 'Create a campus sustainability tracker', description: 'Build a small web app that helps campus groups record actions, review monthly progress, and share practical insights.', type: 'Project', requiredSkills: ['React', 'Node.js', 'Data Visualization'], slots: 3, filled: 1, status: 'open', createdAt: '2026-09-11T10:30:00.000Z', owner: { id: 'demo-viewer', name: 'Demo student' }, joinStatus: null, joinRequestId: '', requestSource: null, requests: [{ id: 'demo-team-applicant-1', demoData: true, message: 'I can create the accessible dashboard components and document the data views.', status: 'pending', source: 'application', createdAt: '2026-09-13T10:30:00.000Z', student: demoNetworkCard(DEMO_NETWORK_PEOPLE[2]) }, { id: 'demo-team-member-1', demoData: true, message: 'I will help define the data model and validation checks.', status: 'accepted', source: 'application', createdAt: '2026-09-10T10:30:00.000Z', student: demoNetworkCard(DEMO_TALENT[0]) }], members: [demoNetworkCard(DEMO_TALENT[0])] }],
  sentTeamRequests: [],
  incomingTeamInvitations: [],
  memberships: [],
}

DEMO_NETWORK_STATE.sentTeamRequests = [DEMO_NETWORK_STATE.openTeamPosts[1]]
DEMO_NETWORK_STATE.incomingTeamInvitations = [DEMO_NETWORK_STATE.openTeamPosts[2]]
DEMO_NETWORK_STATE.memberships = [DEMO_NETWORK_STATE.openTeamPosts[3]]
DEMO_NETWORK_STATE.openTeamPosts.push(
  { ...DEMO_NETWORK_STATE.openTeamPosts[0], id: 'demo-team-startup', title: 'Launch a student services marketplace', description: 'Validate a campus marketplace idea, define the first release, and test a simple matching workflow with students.', type: 'Startup', requiredSkills: ['Product Strategy', 'React', 'User Research'], slots: 4, filled: 0, owner: demoNetworkPerson(DEMO_NETWORK_PEOPLE[0]), joinStatus: null, joinRequestId: '', requestSource: null },
  { ...DEMO_NETWORK_STATE.openTeamPosts[0], id: 'demo-team-study-group', title: 'Run a practical SQL study group', description: 'Meet weekly to solve realistic reporting problems, review query plans, and publish a shared learning notebook.', type: 'Study Group', requiredSkills: ['SQL', 'Data Analysis', 'Technical Writing'], slots: 6, filled: 1, owner: demoNetworkPerson(DEMO_TALENT[1]), joinStatus: null, joinRequestId: '', requestSource: null },
  { ...DEMO_NETWORK_STATE.openTeamPosts[0], id: 'demo-team-competition', title: 'Compete in a climate data sprint', description: 'Build a reproducible analysis and presentation for a timed climate-data competition with clear evidence and testing.', type: 'Competition', requiredSkills: ['Python', 'Data Visualization', 'Presentation'], slots: 5, filled: 2, owner: demoNetworkPerson(DEMO_NETWORK_PEOPLE[1]), joinStatus: null, joinRequestId: '', requestSource: null },
  { ...DEMO_NETWORK_STATE.openTeamPosts[0], id: 'demo-team-community', title: 'Create a local digital literacy toolkit', description: 'Design practical, accessible learning resources for community workshops and measure which lessons help most.', type: 'Community Initiative', requiredSkills: ['Figma', 'Content Design', 'Accessibility'], slots: 4, filled: 1, owner: demoNetworkPerson(DEMO_NETWORK_PEOPLE[0]), joinStatus: null, joinRequestId: '', requestSource: null },
  { ...DEMO_NETWORK_STATE.openTeamPosts[0], id: 'demo-team-content', title: 'Publish a frontend testing series', description: 'Collaborate on short technical lessons covering component tests, browser automation, and maintainable examples.', type: 'Content Collaboration', requiredSkills: ['React', 'Testing', 'Technical Writing'], slots: 3, filled: 0, owner: demoNetworkPerson(DEMO_TALENT[0]), joinStatus: null, joinRequestId: '', requestSource: null },
)
DEMO_NETWORK_STATE.incomingTeamInvitations.push(
  { ...DEMO_NETWORK_STATE.openTeamPosts[0], id: 'demo-team-invitation-hackathon', title: 'Prototype a campus safety dashboard', description: 'Join a short hackathon sprint to turn incident reports into an accessible, privacy-aware dashboard.', type: 'Hackathon', requiredSkills: ['React', 'Data Visualization', 'Accessibility'], slots: 4, filled: 2, owner: demoNetworkPerson(DEMO_TALENT[1]), joinStatus: 'pending', joinRequestId: 'demo-team-invitation-hackathon-1', requestSource: 'invitation', createdAt: '2026-09-12T10:30:00.000Z' },
  { ...DEMO_NETWORK_STATE.openTeamPosts[0], id: 'demo-team-invitation-research', title: 'Study peer learning outcomes', description: 'Research study habits across student groups and publish a clear, reproducible findings report.', type: 'Research', requiredSkills: ['Python', 'Research', 'SQL'], slots: 3, filled: 1, owner: demoNetworkPerson(DEMO_NETWORK_PEOPLE[1]), joinStatus: 'pending', joinRequestId: 'demo-team-invitation-research-1', requestSource: 'invitation', createdAt: '2026-09-10T10:30:00.000Z' },
)
// Request-history fixtures stay out of the browse list but make each lifecycle state understandable.
DEMO_NETWORK_STATE.sentTeamRequests.push(
  { ...DEMO_NETWORK_STATE.openTeamPosts[1], id: 'demo-team-request-declined', title: 'Audit a campus design system', description: 'Review components for consistency, accessibility, and implementation readiness before the next release.', type: 'Design Challenge', joinStatus: 'declined', joinRequestId: 'demo-team-request-declined-1', createdAt: '2026-09-01T10:30:00.000Z' },
  { ...DEMO_NETWORK_STATE.openTeamPosts[1], id: 'demo-team-request-withdrawn', title: 'Build a student event API', description: 'Create a documented API for events, registrations, reminders, and reliable validation.', type: 'Project', joinStatus: 'withdrawn', joinRequestId: 'demo-team-request-withdrawn-1', createdAt: '2026-08-28T10:30:00.000Z' },
)

const DEMO_SKILLS = [
  { name: 'React', demoData: true, category: 'Frontend', stage: 'Pro', level: 0, verified: true, archived: false, renewalStatus: 'valid', renewalDue: '2027-05-12', verifiedAt: '2026-05-12T10:30:00.000Z', assessmentId: 'demo-assessment-completed', lastRetentionDate: '2026-09-13', trustGain: 160, trustLoss: 0, createdOn: '2026-03-01', lastEvent: 'verified', streak: 8, longestStreak: 14, missedDays: 1, wrongAnswers: 2 },
  { name: 'SQL', demoData: true, category: 'Databases', stage: 'Intermediate', level: 0, verified: true, archived: false, renewalStatus: 'due', renewalDue: '2026-10-05', verifiedAt: '2025-10-05T10:30:00.000Z', assessmentId: 'demo-sql', lastRetentionDate: '2026-09-12', trustGain: 60, trustLoss: 0, createdOn: '2026-02-10', lastEvent: 'retained', streak: 5, longestStreak: 11, missedDays: 2, wrongAnswers: 1 },
  { name: 'TypeScript', demoData: true, category: 'Frontend', stage: 'Intermediate', level: 0, verified: true, archived: false, renewalStatus: 'valid', renewalDue: '2027-02-18', verifiedAt: '2026-02-18T10:30:00.000Z', assessmentId: 'demo-typescript', lastRetentionDate: '2026-09-10', trustGain: 100, trustLoss: 0, createdOn: '2026-02-01', lastEvent: 'upgraded', streak: 3, longestStreak: 7, missedDays: 0, wrongAnswers: 0 },
  { name: 'Figma', demoData: true, category: 'Design', stage: 'Beginner', level: 0, verified: false, archived: false, renewalStatus: 'unverified', renewalDue: '-', verifiedAt: '', assessmentId: '', lastRetentionDate: '', trustGain: 0, trustLoss: 0, createdOn: '2026-09-08', lastEvent: 'created', streak: 0, longestStreak: 0, missedDays: 0, wrongAnswers: 0 },
  { name: 'Python', demoData: true, category: 'Analytics', stage: 'Intermediate', level: 0, verified: false, archived: false, renewalStatus: 'expired', renewalDue: '2026-08-18', verifiedAt: '2025-08-18T10:30:00.000Z', assessmentId: 'demo-python-expired', lastRetentionDate: '2026-08-12', trustGain: 60, trustLoss: 0, createdOn: '2025-08-01', lastEvent: 'expired', streak: 0, longestStreak: 9, missedDays: 0, wrongAnswers: 0 },
  { name: 'Docker', demoData: true, category: 'DevOps', stage: 'Intermediate', level: 0, verified: true, archived: true, renewalStatus: 'archived', renewalDue: '2027-01-09', verifiedAt: '2026-01-09T10:30:00.000Z', assessmentId: 'demo-docker', lastRetentionDate: '2026-08-28', trustGain: 100, trustLoss: 0, createdOn: '2026-01-01', lastEvent: 'archived', streak: 0, longestStreak: 4, missedDays: 0, wrongAnswers: 0 },
]

const DEMO_SKILL_ACTIVITY = [
  { id: 'demo-skill-activity-1', demoData: true, eventType: 'verify_completed', skillName: 'React', occurredAt: '2026-09-08T10:30:00.000Z', points: 60 },
  { id: 'demo-skill-activity-2', demoData: true, eventType: 'retention_completed', skillName: 'SQL', occurredAt: '2026-09-10T10:30:00.000Z', points: 20 },
  { id: 'demo-skill-activity-3', demoData: true, eventType: 'upgrade_completed', skillName: 'TypeScript', occurredAt: '2026-09-11T10:30:00.000Z', points: 100 },
  { id: 'demo-skill-activity-4', demoData: true, eventType: 'archived', skillName: 'Docker', occurredAt: '2026-09-12T10:30:00.000Z', points: 0 },
]

const DEMO_DAILY_PRACTICE = [
  { id: 'demo-daily-react', demoData: true, skillName: 'React', mode: 'retain', status: 'approved', points: 20, occurredAt: '2026-09-13T10:30:00.000Z', response: 'Added accessible validation states, tests, and a short explanation of the component trade-offs.' },
  { id: 'demo-daily-sql', demoData: true, skillName: 'SQL', mode: 'retain', status: 'pending', points: 0, occurredAt: '2026-09-14T09:30:00.000Z', response: 'Rebuilt a reporting query, validated edge cases, and documented the index choices for the reporting workload.' },
  { id: 'demo-daily-typescript', demoData: true, skillName: 'TypeScript', mode: 'retain', status: 'needs_revision', points: 0, occurredAt: '2026-09-11T10:30:00.000Z', response: 'Added typed API contracts and tests; the reviewer requested stronger error-handling evidence.' },
]

const DEMO_CHALLENGE_STATES = [
  { id: 'demo-challenge-react-approved', demoData: true, challengeId: 2, skillName: 'React', status: 'approved', points: 80, response: 'Built an accessible form validator with inline errors, success states, and keyboard interaction tests.' },
  { id: 'demo-challenge-sql-pending', demoData: true, challengeId: 4, skillName: 'SQL', status: 'pending', points: 0, response: 'Created sample customers and orders, monthly totals, and an index rationale with test queries.' },
  { id: 'demo-challenge-react-revision', demoData: true, challengeId: 5, skillName: 'React', status: 'needs_revision', points: 0, response: 'Implemented effect cleanup and documented stale-request handling; reviewer requested an unmount test.' },
]

const DEMO_STREAK_DAYS = [
  { skillName: 'React', demoData: true, days: ['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'] },
  { skillName: 'SQL', demoData: true, days: ['2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'] },
  { skillName: 'TypeScript', demoData: true, days: ['2026-09-11', '2026-09-12', '2026-09-13'] },
]

const DEMO_SKILL_GAP_REPORT = {
  demoData: true,
  activeGigs: 5,
  totalRequirements: 10,
  overallMatch: 50,
  gapData: [
    { skill: 'Node.js', category: 'Backend', gigs: 1, status: 'Missing', covered: false, demoData: true },
    { skill: 'Python', category: 'Analytics', gigs: 1, status: 'Expired', covered: false, demoData: true },
    { skill: 'Power BI', category: 'Analytics', gigs: 1, status: 'Missing', covered: false, demoData: true },
    { skill: 'Figma', category: 'Design', gigs: 1, status: 'Unverified', covered: false, demoData: true },
    { skill: 'Accessibility', category: 'Quality Assurance', gigs: 1, status: 'Missing', covered: false, demoData: true },
    { skill: 'Data Visualization', category: 'Analytics', gigs: 1, status: 'Missing', covered: false, demoData: true },
    { skill: 'APIs', category: 'Backend', gigs: 1, status: 'Missing', covered: false, demoData: true },
  ],
  strengths: [
    { skill: 'React', category: 'Frontend', gigs: 3, status: 'Verified', covered: true, demoData: true },
    { skill: 'SQL', category: 'Databases', gigs: 2, status: 'Verified', covered: true, demoData: true },
  ],
}

const DEMO_TRUST_ACTIVITY = [
  { id: 'demo-trust-1', demoData: true, type: 'skill_verified', label: 'Skill verified after evidence review', points: 60, category: 'Skills', referenceId: 'demo-assessment-completed', occurredAt: '2026-09-08T10:30:00.000Z' },
  { id: 'demo-trust-2', demoData: true, type: 'gig_completed', label: 'Completed GIG with approved delivery', points: 150, category: 'GIGs', referenceId: 'demo-submission-2', occurredAt: '2026-09-12T10:30:00.000Z' },
  { id: 'demo-trust-3', demoData: true, type: 'retention_task_completed', label: 'Daily retention practice approved', points: 20, category: 'Daily', referenceId: '2026-09-13', occurredAt: '2026-09-13T10:30:00.000Z' },
]

const DEMO_TRUST_PENALTIES = [
  { id: 'demo-trust-penalty-1', demoData: true, label: 'Assessment below standard', desc: 'Sample reviewer outcome: an assessment below the quality threshold can apply a deduction.', points: -10, category: 'Penalty', earned: true },
]

function isDemoIdentifier(value) {
  const normalized = String(value || '')
  return DEMO_IDS.has(normalized) || normalized.startsWith('demo-') || [990011, 990012].includes(Number(normalized))
}

module.exports = { DEMO_ASSESSMENTS, DEMO_CHALLENGE_STATES, DEMO_DAILY_PRACTICE, DEMO_COMPANY_PROFILES, DEMO_GIGS, DEMO_NETWORK_STATE, DEMO_NETWORK_PEOPLE, DEMO_SKILL_ACTIVITY, DEMO_SKILL_GAP_REPORT, DEMO_SKILLS, DEMO_STREAK_DAYS, DEMO_SUBMISSIONS, DEMO_TALENT, DEMO_TRUST_ACTIVITY, DEMO_TRUST_PENALTIES, clone, demoCompanyGigState, demoNetworkProfile, demoPaymentState, demoStudentGigState, demoTaskLibraryState, demoWorkspaceState, isDemoIdentifier }
