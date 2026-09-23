import { ArrowDown, ArrowRight, BadgeCheck, ClipboardCheck, EyeOff, FileCode2, History, RotateCcw, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function ProofOfWork() {
  const proofRef = useRef(null)
  const figureRef = useRef(null)
  const pointsRef = useRef(null)
  const [headingVisible, setHeadingVisible] = useState(false)
  const [figureVisible, setFigureVisible] = useState(false)
  const [pointsVisible, setPointsVisible] = useState(false)

  useEffect(() => {
    const targets = [
      [proofRef.current, setHeadingVisible],
      [figureRef.current, setFigureVisible],
      [pointsRef.current, setPointsVisible]
    ]
    if (!window.IntersectionObserver) {
      setHeadingVisible(true)
      setFigureVisible(true)
      setPointsVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const target = targets.find(([element]) => element === entry.target)
        target?.[1](true)
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12 })

    targets.forEach(([element]) => {
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={proofRef}
      id="proof"
      className={`sb-section sb-proof sb-proof--animated${headingVisible ? ' is-heading-visible' : ''}${figureVisible ? ' is-figure-visible' : ''}${pointsVisible ? ' is-points-visible' : ''}`}
    >
      <div className="sb-wrap">
        <div className="sb-heading-row sb-proof-heading">
          <div>
            <p className="sb-eyebrow">03 / PROOF OF WORK</p>
            <h2>
              A skill on your profile.
              <br />
              <span className="sb-proof-emphasis">Evidence behind it.</span>
            </h2>
          </div>
          <div className="sb-proof-context">
            <span className="sb-proof-review-label"><ShieldCheck size={17} aria-hidden="true" />Human review. Evidence first.</span>
            <p>Submit original work in Skill Hub. Admin review staff assess the evidence without seeing your name or college. Approval adds verified proof to your profile.</p>
          </div>
        </div>
        <figure ref={figureRef} className="sb-product-figure sb-review-flow">
          <div className="sb-review-flow-header">
            <span><ShieldCheck size={18} />Evidence review flow</span>
            <span><EyeOff size={16} />Student identity and college hidden</span>
          </div>
          <ol className="sb-review-flow-track" aria-label="How submitted skill evidence becomes verified">
            <li style={{ '--review-delay': '0s' }}>
              <span className="sb-review-step-icon"><FileCode2 size={22} /></span>
              <small>Student</small>
              <h3>Submit evidence</h3>
              <p>Original response, approach, testing, and an optional work link.</p>
              <ArrowRight className="sb-review-flow-arrow" aria-hidden="true" />
            </li>
            <li style={{ '--review-delay': '1.4s' }}>
              <span className="sb-review-step-icon"><EyeOff size={22} /></span>
              <small>Platform</small>
              <h3>Enter blind queue</h3>
              <p>The reviewer sees the work and requirements, without profile influence.</p>
              <ArrowRight className="sb-review-flow-arrow" aria-hidden="true" />
            </li>
            <li style={{ '--review-delay': '2.8s' }}>
              <span className="sb-review-step-icon"><ClipboardCheck size={22} /></span>
              <small>Admin review</small>
              <h3>Score the rubric</h3>
              <div className="sb-review-criteria" aria-label="Review criteria">
                <span>Correctness 40%</span><span>Evidence 20%</span><span>Understanding 20%</span><span>Testing 10%</span><span>Communication 10%</span>
              </div>
              <ArrowRight className="sb-review-flow-arrow" aria-hidden="true" />
            </li>
            <li style={{ '--review-delay': '4.2s' }}>
              <span className="sb-review-step-icon"><ShieldCheck size={22} /></span>
              <small>Decision</small>
              <h3>Make a decision</h3>
              <div className="sb-review-decisions"><span>Approve</span><span><RotateCcw size={12} />Revision</span><span>Reject</span></div>
              <ArrowDown className="sb-review-flow-arrow sb-review-flow-arrow-down" aria-hidden="true" />
            </li>
          </ol>
          <div className="sb-review-outcome" style={{ '--review-delay': '5.6s' }}>
            <BadgeCheck size={26} />
            <div><small>Approved outcome</small><strong>Verified skill on the student profile</strong></div>
            <span>TrustScore updated</span><span>Review history saved</span><span>Renewal date set</span>
          </div>
          <figcaption>Approval requires observable evidence and a rubric score of at least 70/100. Revision requests return the same assessment to the student.</figcaption>
        </figure>
        <div ref={pointsRef} className="sb-proof-points">
          <article>
            <FileCode2 />
            <h3>Inspectable work</h3>
            <p>Show your approach, contribution, testing, and results.</p>
          </article>
          <article>
            <BadgeCheck />
            <h3>Evidence-based review</h3>
            <p>Admin review staff score the submitted work against a consistent rubric.</p>
          </article>
          <article>
            <History />
            <h3>A current record</h3>
            <p>Approvals, renewals, and practice build visible proof over time.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
