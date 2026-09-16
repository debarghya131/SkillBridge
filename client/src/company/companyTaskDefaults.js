export const COMPANY_TASK_TYPES = [
  { value: 'live_project', label: 'Live Project Assignment' },
  { value: 'code', label: 'Code' },
  { value: 'mcq', label: 'MCQ' },
  { value: 'written', label: 'Written' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'design', label: 'Design Challenge' },
  { value: 'data_analysis', label: 'Data Analysis' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'research', label: 'Research Report' },
  { value: 'presentation', label: 'Presentation' },
]

export const COMPANY_TASK_TYPE_CONFIG = {
  live_project: {
    primaryLabel: 'Project Brief *',
    primaryPlaceholder: 'Describe the real business problem and the product or feature to build.',
    fields: [
      { key: 'deliverables', label: 'Deliverables *', placeholder: 'List the screens, features, links, or files the student must submit.', multiline: true, required: true },
      { key: 'acceptanceCriteria', label: 'Acceptance Criteria *', placeholder: 'Explain how the finished project will be evaluated.', multiline: true, required: true },
      { key: 'submissionRequirements', label: 'Submission Requirements', placeholder: 'GitHub link, deployed preview, screenshots, documentation...', multiline: true },
    ],
  },
  code: {
    primaryLabel: 'Problem Statement *',
    primaryPlaceholder: 'Describe the coding problem, expected behavior, and constraints.',
    fields: [
      { key: 'language', label: 'Preferred Language', placeholder: 'JavaScript, Python, Java...' },
      { key: 'testCases', label: 'Test Cases / Expected Output *', placeholder: 'Add sample input, expected output, edge cases, or evaluation tests.', multiline: true, required: true },
      { key: 'submissionRequirements', label: 'Submission Requirements', placeholder: 'Repository link, code file, README, test output...', multiline: true },
    ],
  },
  mcq: {
    primaryLabel: 'Question Set *',
    primaryPlaceholder: 'Describe the topic, difficulty, and questions the student must answer.',
    fields: [
      { key: 'questionCount', label: 'Number of Questions *', placeholder: '10', inputType: 'number', required: true },
      { key: 'questions', label: 'Questions *', placeholder: 'Add each question and its options.', multiline: true, required: true },
      { key: 'options', label: 'Answer Options *', placeholder: 'List the options students can choose from.', multiline: true, required: true },
      { key: 'answerKey', label: 'Private Answer Key *', placeholder: 'Store the correct answer for each question. Students will not see this.', multiline: true, required: true },
      { key: 'passingScore', label: 'Passing Score (%)', placeholder: '70', inputType: 'number' },
    ],
  },
  written: {
    primaryLabel: 'Writing Prompt *',
    primaryPlaceholder: 'Describe the question, viewpoint, or document the student must write.',
    fields: [
      { key: 'wordLimit', label: 'Word Limit', placeholder: '500', inputType: 'number' },
      { key: 'evaluationCriteria', label: 'Evaluation Criteria *', placeholder: 'Clarity, structure, evidence, accuracy, originality...', multiline: true, required: true },
      { key: 'submissionRequirements', label: 'Submission Requirements', placeholder: 'PDF, document link, or text response...', multiline: true },
    ],
  },
  mixed: {
    primaryLabel: 'Task Brief *',
    primaryPlaceholder: 'Describe the assignment and the combination of activities the student must complete.',
    fields: [
      { key: 'components', label: 'Included Components *', placeholder: 'Live project, code, MCQ, written response...', required: true },
      { key: 'evaluationCriteria', label: 'Evaluation Criteria *', placeholder: 'Explain how the complete submission will be scored.', multiline: true, required: true },
      { key: 'submissionRequirements', label: 'Submission Requirements', placeholder: 'List every link, file, or response the student must submit.', multiline: true },
    ],
  },
}

for (const [type, label, placeholder] of [
  ['design', 'Design Brief', 'Describe the audience, user journey, design constraints, and screens or assets to create.'],
  ['data_analysis', 'Analysis Brief', 'Provide the dataset link, business questions, and analysis or dashboard expected.'],
  ['case_study', 'Case Study Brief', 'Describe the business scenario, available evidence, and decisions to evaluate.'],
  ['research', 'Research Question', 'Specify the research question, scope, sources, and citation requirements.'],
  ['presentation', 'Presentation Brief', 'Describe the audience, topic, slide requirements, and presentation objectives.'],
]) {
  COMPANY_TASK_TYPE_CONFIG[type] = {
    primaryLabel: `${label} *`, primaryPlaceholder: placeholder,
    fields: [
      { key: 'deliverables', label: 'Deliverables *', placeholder: 'List the report, prototype, dashboard, slides, or other evidence required.', multiline: true, required: true },
      { key: 'evaluationCriteria', label: 'Evaluation Criteria *', placeholder: 'Specify how accuracy, reasoning, quality, and completeness will be assessed.', multiline: true, required: true },
      { key: 'submissionRequirements', label: 'Submission Requirements', placeholder: 'Public document, prototype, repository, or presentation link; written explanation.', multiline: true },
    ],
  }
}

export function getCompanyTaskTypeLabel(value) {
  return COMPANY_TASK_TYPES.find(type => type.value === value)?.label || 'Mixed'
}

export function buildDefaultCompanyTaskLibraryState() {
  return { tasks: [], revision: 0 }
}

export function mergeCompanyTaskLibraryState(state = {}) {
  const defaults = buildDefaultCompanyTaskLibraryState()
  return {
    revision: Number(state.revision) || 0,
    tasks: Array.isArray(state.tasks)
      ? state.tasks.map(task => ({ ...task, type: task.type || 'mixed' }))
      : defaults.tasks,
  }
}
