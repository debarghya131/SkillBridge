import { ArrowRight, BadgeCheck, BriefcaseBusiness, FileCheck2, FolderGit2, ReceiptText, UserRound } from 'lucide-react'
import './HeroWorkflow.css'

const steps = [
  { title: 'Build your profile', role: 'Student / Portfolio', icon: UserRound,
    text: 'Add skills, project links, demos, and your contribution. A listed skill starts unverified.', outcome: 'Your work becomes inspectable' },
  { title: 'Submit skill evidence', role: 'Student / Skill Hub', icon: FolderGit2,
    text: 'Complete a skill assessment. Explain your approach, testing, and results, with an evidence link where useful.', outcome: 'Evidence enters the review queue' },
  { title: 'Earn verification', role: 'Platform reviewer / Blind review', icon: BadgeCheck,
    text: 'A reviewer assesses your work without seeing your identity or college. They approve, request revisions, or reject it.', outcome: 'Approval updates verification and TrustScore' },
  { title: 'Apply, interview, get selected', role: 'Student + company / GIG Center', icon: BriefcaseBusiness,
    text: 'Companies post GIGs and search profiles. Apply or accept a direct invite, submit the interview task, and await the company\'s decision.', outcome: 'Company selection opens the work stage' },
  { title: 'Deliver and refine', role: 'Student + company / Project workspace', icon: FileCheck2,
    text: 'The company starts work with a brief. Follow tasks and milestones, submit your delivery, and address requested revisions.', outcome: 'Approved delivery awaits payment' },
  { title: 'Get paid, build your record', role: 'Company / Payment record', icon: ReceiptText,
    text: 'The company pays you outside SkillBridge, then records the transfer details. The GIG moves to completed and your earnings history updates.', outcome: 'Completed work contributes to TrustScore' },
]

export default function HeroWorkflow() {
  return <div className="sb-workflow">
    <div className="sb-workflow-intro"><h2>How skills become real work</h2><p>Build evidence, meet an opportunity, and carry the work through to completion.</p></div>
    <ol className="sb-workflow-steps" aria-label="From skills to completed work">
      {steps.map(({ title, role, icon, text, outcome }, index) => {
        const Icon = icon
        return <li key={title} className={`sb-workflow-step sb-workflow-step-${index + 1}`} style={{ '--step-delay': `${index * 1.4}s` }}>
        <div className="sb-workflow-heading"><span className="sb-workflow-icon"><Icon size={22} aria-hidden="true" /></span><span className="sb-workflow-number">0{index + 1}</span></div>
        <span className="sb-workflow-role">{role}</span>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="sb-workflow-outcome"><span>Result</span>{outcome}</div>
        {index < steps.length - 1 && <span className="sb-workflow-connector" aria-hidden="true"><ArrowRight size={18} /></span>}
      </li>})}
    </ol>
    <p className="sb-workflow-note">Skill verification supports your application; it does not guarantee selection. Payment records are company-reported. SkillBridge does not hold or transfer funds.</p>
  </div>
}
