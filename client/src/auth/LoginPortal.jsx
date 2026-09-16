import { ArrowLeft, Building2, GraduationCap, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import './LoginPortal.css'

const OPTIONS = [
  { title: 'Student', description: 'Access your skills, opportunities, tasks, and TrustScore.', icon: GraduationCap, path: '/student?mode=signin', tone: 'student' },
  { title: 'Company', description: 'Manage GIGs, applicants, assignments, and project delivery.', icon: Building2, path: '/company?mode=signin', tone: 'company' },
  { title: 'Platform reviewer', description: 'Review blind Skill Hub evidence using the assessment rubric.', icon: ShieldCheck, path: '/reviewer', tone: 'reviewer' },
]

export default function LoginPortal() {
  const navigate = useNavigate()
  return <main className="login-portal">
    <section className="login-panel" aria-labelledby="login-title">
      <button className="login-back" onClick={() => navigate('/')}><ArrowLeft size={16}/>Back to home</button>
      <header><SkillBridgeBrand size="large"/><div><h1 id="login-title">Choose your login</h1><p>Continue to the workspace linked to your account.</p></div></header>
      <div className="login-options">{OPTIONS.map(option => {
        const Icon = option.icon
        return <button key={option.title} className={`login-option login-option-${option.tone}`} onClick={() => navigate(option.path)}>
          <span><Icon size={21}/></span><span><strong>{option.title}</strong><small>{option.description}</small></span>
        </button>
      })}</div>
      <footer><span>New to SkillBridge?</span><div><button onClick={() => navigate('/student?mode=signup')}>Create student account</button><button onClick={() => navigate('/company?mode=signup')}>Register a company</button></div></footer>
    </section>
  </main>
}
