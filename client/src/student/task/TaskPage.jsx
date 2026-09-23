import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import CompanyTaskPage from './CompanyTaskPage'
import SkillAssessmentPage from './SkillAssessmentPage'
import './TaskPage.css'

const CONTEXT_KEY = 'skillbridge.student.taskContext'

function savedTaskContext(context) {
  if (!context || context.taskType !== 'company-interview' || !context.opportunity) return context
  const opportunity = context.opportunity

  // Demo assignments are self-contained fixtures. Keep their safe task brief
  // in browser session storage so refresh continues to show the read-only
  // preview without asking the API for a stored assignment.
  if (opportunity.demoData) return context

  // The API resolves accepted tasks by stable id. Persisting only that identity
  // prevents a browser refresh from restoring stale company or GIG metadata.
  return {
    taskType: 'company-interview',
    opportunity: {
      id: opportunity.id,
      opportunityId: opportunity.opportunityId,
      companyGigId: opportunity.companyGigId,
      companyGigPublicId: opportunity.companyGigPublicId,
      title: opportunity.title,
      company: opportunity.company,
    },
  }
}

export default function TaskPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const saved = useMemo(() => {
    try {
      const context = JSON.parse(sessionStorage.getItem(CONTEXT_KEY))
      if (context) return context
      const opportunity = JSON.parse(sessionStorage.getItem('skillbridge.student.companyTask'))
      return opportunity ? { taskType: 'company-interview', opportunity } : null
    } catch { return null }
  }, [])
  const context = state || saved
  const isCompanyTask = context?.taskType === 'company-interview' && Boolean(context.opportunity)
  useEffect(() => {
    if (!state) return
    try { sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(savedTaskContext(state))) } catch { /* Navigation still works without storage. */ }
  }, [state])
  const back = () => {
    if (isCompanyTask) return navigate('/student/dashboard?section=gig')
    const tab = typeof context?.returnTab === 'string' ? context.returnTab : 'myskills'
    return navigate(`/student/dashboard?section=skillhub&skillhubTab=${encodeURIComponent(tab)}`)
  }
  return <main className="assessment-page">
    <button type="button" className="assessment-back" onClick={back}><ArrowLeft size={16} /> Back to Dashboard</button>
    {isCompanyTask ? <CompanyTaskPage opportunity={context.opportunity} />
      : context?.skillName ? <SkillAssessmentPage key={[context.skillName, context.mode, context.challengeId, context.targetStage, context.assessmentId].join(':')} context={context} />
        : <section className="assessment-empty"><h2>No assessment selected</h2><button className="btn-primary" onClick={back}>Open Skill Hub</button></section>}
  </main>
}
