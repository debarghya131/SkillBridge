import { createElement, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Users,
  FolderGit2,
  Search,
  ListChecks,
  Receipt,
  ChevronRight
} from 'lucide-react'
const features = [
  [
    BriefcaseBusiness,
    'GIG Center',
    'Browse work, save opportunities, apply, and respond to direct company invitations.',
    'STUDENTS'
  ],
  [
    Search,
    'Talent discovery',
    'Filter by skills, location, experience level, and TrustScore. Inspect projects before evaluating a candidate.',
    'ORGANIZATIONS'
  ],
  [
    FolderGit2,
    'Portfolio & profile',
    'Bring your projects, demo links, skills, and introduction video together in one place.',
    'STUDENTS'
  ],
  [
    Users,
    'Network & Team-Up',
    'Connect with peers and form teams around project needs, applications, and invitations.',
    'STUDENTS'
  ],
  [
    ListChecks,
    'Project workspace',
    'Move selected work through tasks, delivery, review, and revisions in a shared workflow.',
    'BOTH SIDES'
  ],
  [
    Receipt,
    'Earnings records',
    'Companies record completed external payments. Students see awaiting-payment and recorded-payment history.',
    'BOTH SIDES'
  ]
]
export default function Features() {
  const featuresRef = useRef(null)
  const gridRef = useRef(null)
  const faqRef = useRef(null)
  const ctaRef = useRef(null)
  const [headingVisible, setHeadingVisible] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)
  const [faqVisible, setFaqVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)

  useEffect(() => {
    const targets = [
      [featuresRef.current, setHeadingVisible],
      [gridRef.current, setGridVisible],
      [faqRef.current, setFaqVisible],
      [ctaRef.current, setCtaVisible]
    ]
    if (!window.IntersectionObserver) {
      setHeadingVisible(true)
      setGridVisible(true)
      setFaqVisible(true)
      setCtaVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const target = targets.find(([element]) => element === entry.target)
        target?.[1](true)
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.14 })

    targets.forEach(([element]) => {
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <section
        ref={featuresRef}
        id="features"
        className={[
          'sb-section sb-features--animated',
          headingVisible && 'is-heading-visible',
          gridVisible && 'is-grid-visible',
          faqVisible && 'is-faq-visible'
        ].filter(Boolean).join(' ')}
      >
        <div className="sb-wrap">
          <div className="sb-heading-row">
            <div>
              <p className="sb-eyebrow">04 / INSIDE SKILLBRIDGE</p>
              <h2>
                Everything connects
                <br />
                back to real work.
              </h2>
            </div>
            <p>
              From a first project link to a completed GIG, keep the evidence
              and the next step in view.
            </p>
          </div>
          <div ref={gridRef} className="sb-feature-grid">
            {features.map(([icon, title, description, audience]) => (
              <article key={title}>
                <div className="sb-feature-top">
                  {createElement(icon, { size: 24 })}
                  <span>{audience}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <p className="sb-payment-note">
            Payments happen outside SkillBridge. The platform records them; it
            does not hold funds or process withdrawals.
          </p>
          <div ref={faqRef} className="sb-faq">
            <h3>A little more clarity.</h3>
            <details>
              <summary>
                Does adding a skill make it verified?
                <ChevronRight size={18} />
              </summary>
              <p>
                No. A platform reviewer must approve your assessment. A project
                link or a self-declared skill alone does not award TrustScore.
              </p>
            </details>
            <details>
              <summary>
                Does a skill match guarantee selection?
                <ChevronRight size={18} />
              </summary>
              <p>
                No. Discovery helps organizations find relevant profiles.
                Companies evaluate applicants and interview tasks before
                selecting someone for the work.
              </p>
            </details>
            <details>
              <summary>
                Who is SkillBridge built for?
                <ChevronRight size={18} />
              </summary>
              <p>
                Students from Tier-2 and Tier-3 colleges looking to demonstrate
                ability, and startups, organizations, and local MSMEs looking
                for capable student talent.
              </p>
            </details>
          </div>
        </div>
      </section>
      <section
        ref={ctaRef}
        className={`sb-final-cta sb-final-cta--animated${ctaVisible ? ' is-visible' : ''}`}
        aria-labelledby="sb-cta-title"
      >
        <div className="sb-wrap">
          <p className="sb-eyebrow">YOUR NEXT CHAPTER</p>
          <h2 id="sb-cta-title">
            Let the work
            <br />
            make the introduction.
          </h2>
          <p>Bring your ability. Or bring the opportunity.</p>
          <div className="sb-actions">
            <Link
              className="sb-button sb-button-light"
              to="/student?mode=signup"
            >
              Build your student profile
              <ArrowUpRight size={18} />
            </Link>
            <Link
              className="sb-button sb-button-dark-outline"
              to="/company?mode=signup"
            >
              Find student talent
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
