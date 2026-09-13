import {
  ArrowDownRight,
  FileCheck2,
  GraduationCap,
  Search,
  Building2
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function OpportunityGap() {
  const gapRef = useRef(null)
  const meritRef = useRef(null)
  const [gapVisible, setGapVisible] = useState(false)
  const [meritVisible, setMeritVisible] = useState(false)

  useEffect(() => {
    const targets = [
      [gapRef.current, setGapVisible],
      [meritRef.current, setMeritVisible]
    ]
    if (!window.IntersectionObserver) {
      setGapVisible(true)
      setMeritVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const target = targets.find(([element]) => element === entry.target)
        target?.[1](true)
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.18 })

    targets.forEach(([element]) => {
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <section id="opportunity-gap" className="sb-section sb-gap">
      <div
        ref={gapRef}
        className={`sb-wrap sb-gap-reveal${gapVisible ? ' is-visible' : ''}`}
      >
        <div className="sb-section-heading">
          <p className="sb-eyebrow">01 / THE OPPORTUNITY GAP</p>
          <h2>
            Talent is everywhere.
            <br />
            Access isn't.
          </h2>
          <p>
            For students from Tier-2 and Tier-3 colleges, the first opportunity
            can be the hardest to reach. For a small business, the right person
            can be the hardest to find.
          </p>
        </div>
        <div className="sb-gap-columns">
          <article>
            <GraduationCap />
            <h3>Ability without a spotlight</h3>
            <p>
              Projects and practical skills can get overlooked when a college
              name becomes the first filter.
            </p>
            <span>Students need a way to show their work.</span>
          </article>
          <div className="sb-gap-center" aria-hidden="true">
            <ArrowDownRight />
          </div>
          <article>
            <Building2 />
            <h3>Work without the right talent</h3>
            <p>
              Startups and MSMEs need capable people, with evidence they can
              evaluate before assigning real work.
            </p>
            <span>Organizations need a clearer way to discover ability.</span>
          </article>
        </div>
      </div>
      <div
        ref={meritRef}
        className={`sb-merit sb-merit--animated${meritVisible ? ' is-visible' : ''}`}
      >
        <div className="sb-wrap">
          <p className="sb-eyebrow sb-merit-eyebrow">A DIFFERENT STARTING POINT</p>
          <h2>
            <span className="sb-merit-word sb-merit-word-merit">Merit</span>
            <span className="sb-greater sb-merit-word sb-merit-word-greater" aria-label="over">
              &gt;
            </span>
            <span className="sb-merit-word sb-merit-word-brand">college brand</span>
          </h2>
          <p className="sb-merit-copy">Make demonstrated ability the conversation starter.</p>
          <div className="sb-merit-signals">
            <span style={{ '--sb-signal-delay': '0ms' }}>
              <FileCheck2 size={18} />
              Work you can inspect
            </span>
            <span style={{ '--sb-signal-delay': '90ms' }}>
              <Search size={18} />
              Skills you can discover
            </span>
            <span style={{ '--sb-signal-delay': '180ms' }}>
              <GraduationCap size={18} />
              Room to prove yourself
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
