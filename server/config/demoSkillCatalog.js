const { STAGES } = require('../utils/skillPolicy')

const DEMO_SKILLS = [
  {
    name: 'HTML & CSS', aliases: ['HTML/CSS', 'Responsive Web Design'], category: 'Frontend', kind: 'code',
    summary: 'Semantic HTML, responsive CSS, accessibility, and browser-compatible interface implementation.',
    proof: 'a responsive multi-page interface with semantic structure, keyboard support, and accessibility checks',
    practice: 'Build a responsive accessible landing page with mobile and desktop layouts and document the checks you performed.',
  },
  {
    name: 'JavaScript', aliases: ['JS', 'ECMAScript'], category: 'Frontend', kind: 'code',
    summary: 'Modern JavaScript fundamentals, asynchronous programming, browser APIs, testing, and maintainable application logic.',
    proof: 'an application using modules, asynchronous behavior, error handling, and automated tests',
    practice: 'Implement a debounced search component that handles loading, empty, success, and failure states and include tests.',
  },
  {
    name: 'TypeScript', aliases: ['TS'], category: 'Frontend', kind: 'code',
    summary: 'Type-safe application development using practical domain models, narrowing, generics, and strict compiler settings.',
    proof: 'a strict-mode application with meaningful domain types, safe error handling, and type-level or runtime tests',
    practice: 'Model a paginated API response with generics and safely handle success, validation, and network error variants.',
  },
  {
    name: 'React', aliases: ['ReactJS', 'React.js'], category: 'Frontend', kind: 'code',
    summary: 'Accessible React interfaces using component composition, state management, data fetching, and behavior tests.',
    proof: 'an accessible React feature with reusable components, server-state handling, and interaction tests',
    practice: 'Build and test an accessible form with inline validation, submission states, and keyboard navigation.',
  },
  {
    name: 'Next.js', aliases: ['NextJS', 'Next'], category: 'Full Stack', kind: 'project',
    summary: 'Production-oriented Next.js applications using routing, rendering strategies, server features, and performance controls.',
    proof: 'a deployed Next.js feature that justifies rendering choices and includes loading, error, metadata, and test evidence',
    practice: 'Create a data-backed route with loading, empty, error, and metadata states, then explain the rendering strategy.',
  },
  {
    name: 'Node.js', aliases: ['NodeJS', 'Node'], category: 'Backend', kind: 'code',
    summary: 'Server-side JavaScript with asynchronous I/O, API design, validation, testing, and operational error handling.',
    proof: 'a Node.js service with validated inputs, consistent errors, automated tests, and documented runtime decisions',
    practice: 'Implement a validated service endpoint with success and failure tests and structured error responses.',
  },
  {
    name: 'REST API Development', aliases: ['REST APIs', 'RESTful APIs'], category: 'Backend', kind: 'code',
    summary: 'Reliable HTTP API contracts covering resource design, validation, authentication, errors, testing, and documentation.',
    proof: 'a documented REST resource with authentication, validation, pagination, consistent errors, and integration tests',
    practice: 'Design and test a paginated CRUD endpoint, including validation, authorization, not-found, and conflict responses.',
  },
  {
    name: 'Python', aliases: ['Python 3'], category: 'Backend', kind: 'code',
    summary: 'Readable Python applications using sound data modeling, error handling, testing, packaging, and automation practices.',
    proof: 'a reproducible Python application with typed boundaries, tests, dependency instructions, and documented tradeoffs',
    practice: 'Build a command-line data validator with clear errors, unit tests, and reproducible setup instructions.',
  },
  {
    name: 'Java', aliases: ['Java SE'], category: 'Backend', kind: 'code',
    summary: 'Object-oriented Java development with collections, exceptions, testing, build tooling, and maintainable service design.',
    proof: 'a Java service or application with domain modeling, exception handling, automated tests, and a reproducible build',
    practice: 'Implement and test a small order service with validation, domain exceptions, and collection-based reporting.',
  },
  {
    name: 'SQL', aliases: ['Structured Query Language'], category: 'Databases', kind: 'code',
    summary: 'Relational querying, schema design, joins, aggregation, transactions, indexing, and query-plan analysis.',
    proof: 'a reproducible relational schema with analytical queries, constraints, indexes, expected results, and plan analysis',
    practice: 'Create customers and orders tables, then query monthly revenue and customers without orders and explain your indexes.',
  },
  {
    name: 'PostgreSQL', aliases: ['Postgres'], category: 'Databases', kind: 'code',
    summary: 'PostgreSQL schema design, constraints, transactions, indexing, query analysis, and safe database operations.',
    proof: 'a PostgreSQL-backed feature with migrations, constraints, transaction boundaries, indexes, and EXPLAIN evidence',
    practice: 'Model an inventory transaction, enforce data integrity, add an appropriate index, and compare query plans.',
  },
  {
    name: 'MongoDB', aliases: ['Mongo'], category: 'Databases', kind: 'code',
    summary: 'Document modeling, validation, aggregation, indexes, transactions, and performance-aware MongoDB application design.',
    proof: 'a MongoDB feature with justified document boundaries, validation, indexes, aggregation, and query evidence',
    practice: 'Model an order workflow, add validation and indexes, and build an aggregation for monthly product totals.',
  },
  {
    name: 'Git & GitHub', aliases: ['Git', 'GitHub', 'Version Control'], category: 'DevOps', kind: 'evidence',
    summary: 'Collaborative source control using focused commits, branches, pull requests, reviews, conflict resolution, and release history.',
    proof: 'a repository history showing focused commits, a reviewed pull request, conflict handling, and a tagged release',
    practice: 'Prepare a focused pull request with a clear description, linked issue, review response, and clean commit history.',
  },
  {
    name: 'Docker', aliases: ['Containers', 'Containerization'], category: 'DevOps', kind: 'code',
    summary: 'Reproducible container builds, Compose-based services, runtime configuration, health checks, and image hardening.',
    proof: 'a multi-stage containerized application with health checks, non-root execution, Compose setup, and size analysis',
    practice: 'Containerize a small service with a multi-stage build, non-root user, health check, and documented run command.',
  },
  {
    name: 'Amazon Web Services', aliases: ['AWS'], category: 'Cloud Computing', kind: 'project',
    summary: 'Secure cloud delivery using core AWS compute, storage, networking, identity, monitoring, and cost controls.',
    proof: 'an AWS deployment with least-privilege access, infrastructure documentation, monitoring, recovery, and cost notes',
    practice: 'Design a small web workload on AWS and document its IAM boundaries, monitoring, backup, and monthly cost assumptions.',
  },
  {
    name: 'Data Analysis', aliases: ['Data Analytics'], category: 'Analytics', kind: 'project',
    summary: 'Reproducible data cleaning, exploration, visualization, statistical reasoning, and decision-focused communication.',
    proof: 'a reproducible analysis with sourced data, cleaning steps, validated metrics, visual findings, and stated limitations',
    practice: 'Analyze a small sales dataset, validate the data, chart three useful findings, and explain one important limitation.',
  },
  {
    name: 'Microsoft Excel', aliases: ['Excel', 'Spreadsheets'], category: 'Analytics', kind: 'evidence',
    summary: 'Reliable spreadsheet models using structured data, formulas, lookups, pivots, charts, validation, and audit controls.',
    proof: 'an auditable workbook with structured inputs, robust formulas, validation, pivot analysis, and a decision dashboard',
    practice: 'Build an auditable monthly sales workbook with validation, lookup formulas, a pivot summary, and an exception check.',
  },
  {
    name: 'Power BI', aliases: ['Microsoft Power BI'], category: 'Analytics', kind: 'project',
    summary: 'Decision-ready Power BI models using clean transformations, relationships, DAX measures, and accessible dashboards.',
    proof: 'a Power BI report with a documented star schema, reusable measures, validated totals, interactions, and accessibility',
    practice: 'Build a one-page performance dashboard with a star schema, three DAX measures, drill-through, and metric validation.',
  },
  {
    name: 'UI/UX Design', aliases: ['UX Design', 'UI Design', 'Product Design'], category: 'Design', kind: 'project',
    summary: 'Evidence-led interface design covering user flows, wireframes, interaction states, accessibility, and usability validation.',
    proof: 'a case study linking user needs to flows, responsive screens, interaction states, accessibility, and usability findings',
    practice: 'Redesign a checkout flow with mobile and desktop states, accessibility annotations, and a short usability test plan.',
  },
  {
    name: 'Figma', aliases: ['Figma Design'], category: 'Design', kind: 'project',
    summary: 'Maintainable Figma design files using auto layout, components, variants, variables, prototypes, and developer handoff.',
    proof: 'an organized Figma file with reusable components, variants, variables, responsive layouts, prototype, and handoff notes',
    practice: 'Create a responsive form component set with auto layout, states, variables, a prototype, and developer annotations.',
  },
  {
    name: 'Canva', aliases: ['Canva Design'], category: 'Design', kind: 'project',
    summary: 'Consistent visual communication using reusable brand systems, layout, typography, accessible content, and export controls.',
    proof: 'an editable Canva campaign set with a documented brand system, reusable templates, responsive formats, and accessible exports',
    practice: 'Create a coordinated three-format campaign set with reusable brand styles, clear hierarchy, and export-ready assets.',
  },
  {
    name: 'Content Marketing', aliases: ['Content Strategy'], category: 'Marketing', kind: 'project',
    summary: 'Audience-led content planning, production, distribution, measurement, and iteration across a measurable campaign funnel.',
    proof: 'a content campaign linking audience research and funnel goals to original assets, distribution, metrics, and iteration',
    practice: 'Plan a four-week content campaign with audience, funnel stage, channel, owner, success metric, and experiment for each item.',
  },
  {
    name: 'Search Engine Optimization', aliases: ['SEO'], category: 'Marketing', kind: 'evidence',
    summary: 'Ethical technical, on-page, and content SEO using search intent, crawlability, structured evidence, and measured outcomes.',
    proof: 'an SEO audit and implementation showing search intent, technical findings, prioritized changes, and defensible measurements',
    practice: 'Audit one page for search intent, metadata, headings, internal links, performance, and indexability, then prioritize fixes.',
  },
  {
    name: 'Generative AI Applications', aliases: ['GenAI Apps', 'LLM Applications'], category: 'AI & Machine Learning', kind: 'project',
    summary: 'Responsible AI features using model APIs, grounded context, structured outputs, evaluation, safety, and cost controls.',
    proof: 'an AI-assisted feature with prompt and data boundaries, evaluations, failure handling, safety controls, and cost evidence',
    practice: 'Build a grounded question-answering prototype and test answer quality, unsupported claims, prompt injection, and cost.',
  },
]

function buildDemoSkillCatalog() {
  return DEMO_SKILLS.map(skill => ({
    name: skill.name,
    aliases: skill.aliases,
    category: skill.category,
    summary: skill.summary,
    status: 'published',
    renewalDays: 365,
    stages: [...STAGES],
    verificationInstructions: `Submit original work demonstrating ${skill.proof}. Include setup instructions, explain your contribution and decisions, and identify limitations. A platform reviewer must be able to reproduce or inspect the evidence.`,
    upgradeRequirements: [
      { stage: 'Intermediate', instructions: `Complete a realistic ${skill.name} project independently. Demonstrate sound fundamentals, handle common failure cases, and provide reproducible evidence and tests.` },
      { stage: 'Pro', instructions: `Deliver production-quality ${skill.name} work that addresses security, accessibility or reliability where relevant. Justify architecture and tradeoffs and include comprehensive validation.` },
      { stage: 'Pro Mastery', instructions: `Demonstrate advanced ${skill.name} leadership through a complex implementation, measurable improvement, review of alternatives, and reusable guidance that raises team quality.` },
    ],
    dailyTasks: [{
      title: `${skill.name}: practical evidence`,
      instructions: `${skill.practice} Submit original evidence, explain your decisions, and include a brief self-review.`,
      kind: skill.kind,
      reviewMode: 'reviewer',
      active: true,
    }],
  }))
}

module.exports = { buildDemoSkillCatalog }
