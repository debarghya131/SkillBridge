import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import CompanyTaskpage from './ComanyTaskpage'
import SkillAssessmentPage from './SkillAssessmentPage'
import './assessment.css'

const CONTEXT_KEY = 'skillbridge.student.taskContext'

function savedTaskContext(context) {
  if (!context || context.taskType !== 'company-interview' || !context.opportunity) return context
  const opportunity = context.opportunity

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

export default function Taskpage() {
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
  const back = () => navigate('/student/dashboard?section=' + (isCompanyTask ? 'gig' : 'skillhub'))
  return <main className="assessment-page">
    <button type="button" className="assessment-back" onClick={back}><ArrowLeft size={16} /> Back to Dashboard</button>
    {isCompanyTask ? <CompanyTaskpage opportunity={context.opportunity} />
      : context?.skillName ? <SkillAssessmentPage key={[context.skillName, context.mode, context.challengeId, context.targetStage].join(':')} context={context} />
        : <section className="assessment-empty"><h2>No assessment selected</h2><button className="btn-primary" onClick={back}>Open Skill Hub</button></section>}
  </main>
}
