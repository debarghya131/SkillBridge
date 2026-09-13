import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  GraduationCap,
  MousePointer2,
  Check
} from 'lucide-react'
const journeys = {
  student: [
    [
      'Skills',
      'Start with what you know.',
      'Add your skills and build a profile around the work you want to do.'
    ],
    [
      'Projects',
      'Give your ability context.',
      'Bring project links, demos, your contribution, and an introduction video into your portfolio.'
    ],
    [
      'Proof',
      'Put evidence behind the claim.',
      'Submit a practical response for platform review. Approved assessments update verified skills and TrustScore.'
    ],
    [
      'Opportunity',
      'Take the next step.',
      'Browse GIGs or respond to a company invitation, complete the interview task, and deliver selected work.'
    ]
  ],
  company: [
    [
      'Requirement',
      'Define the work.',
      'Create your business profile and publish a GIG with its skills, budget, and requirements.'
    ],
    [
      'Discovery',
      'Find relevant ability.',
      'Search student profiles by skills, location, experience level, and TrustScore. Review the work behind a profile.'
    ],
    [
      'Evaluation',
      'See how someone thinks.',
      'Invite a student, assign an interview task, review the response, and select the right person for the work.'
    ],
    [
      'Talent',
      'Turn the brief into delivery.',
      'Track project tasks, review delivery, and record the payment your organization makes externally.'
    ]
  ]
}
export default function HowItWorks() {
  const [role, setRole] = useState('student')
  const [step, setStep] = useState(0)
  const active = journeys[role][step]
  return (
    <section id="how-it-works" className="sb-section">
      <div className="sb-wrap">
        <div className="sb-heading-row">
          <div>
            <p className="sb-eyebrow">02 / ONE BRIDGE. TWO JOURNEYS.</p>
            <h2>
              From potential
              <br />
              to working together.
            </h2>
          </div>
          <p>
            A shared path connects students who can do the work with
            organizations that need it done.
          </p>
        </div>
        <div className="sb-journey">
          <div className="sb-journey-top">
            <div
              className="sb-segment"
              role="group"
              aria-label="Choose a journey"
            >
              <button
                aria-pressed={role === 'student'}
                onClick={() => {
                  setRole('student')
                  setStep(0)
                }}
              >
                <GraduationCap size={18} />
                Student
                {role !== 'student' && <MousePointer2 className="sb-journey-click-cue" size={16} aria-hidden="true" />}
              </button>
              <button
                aria-pressed={role === 'company'}
                onClick={() => {
                  setRole('company')
                  setStep(0)
                }}
              >
                <Building2 size={18} />
                Organization
                {role !== 'company' && <MousePointer2 className="sb-journey-click-cue" size={16} aria-hidden="true" />}
              </button>
            </div>
            <span className="sb-bridge-label">
              <img src="/skillbridge-mark.svg" alt="" width="24" height="24" />
              CONNECTED BY SKILLBRIDGE
            </span>
          </div>
          <ol
            className="sb-flow"
            aria-label={
              role === 'student' ? 'Student journey' : 'Organization journey'
            }
          >
            {journeys[role].map(([label], index) => (
              <li key={label}>
                <button
                  className={index === step + 1 ? 'is-next-step' : undefined}
                  aria-pressed={index === step}
                  aria-controls="sb-step-detail"
                  onClick={() => setStep(index)}
                >
                  <span className="sb-step-number">
                    {index < step ? <Check size={18} /> : '0' + (index + 1)}
                    {index === step + 1 && <span className="sb-next-step-cue" aria-hidden="true"><MousePointer2 size={15} /><small>Next</small></span>}
                  </span>
                  <span>{label}</span>
                </button>
                {index < 3 && (
                  <ArrowRight className="sb-flow-arrow" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
          <div
            className="sb-step-detail"
            id="sb-step-detail"
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <span className="sb-eyebrow">
                STEP 0{step + 1} / {active[0].toUpperCase()}
              </span>
              <h3>{active[1]}</h3>
            </div>
            <p>{active[2]}</p>
            <Link
              to={
                role === 'student'
                  ? '/student?mode=signup'
                  : '/company?mode=signup'
              }
              className="sb-text-link"
            >
              {role === 'student'
                ? 'Build your profile'
                : 'Find your next collaborator'}
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
