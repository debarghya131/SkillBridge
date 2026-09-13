import { useEffect } from 'react'
import LandingNav from './LandingNav'
import Hero from './Hero'
import OpportunityGap from './OpportunityGap'
import HowItWorks from './HowItWorks'
import ProofOfWork from './ProofOfWork'
import Features from './Features'
import Footer from './Footer'
import './LandingPage.css'
export default function LandingPage() {
  useEffect(() => {
    const canonical = document.createElement('link')
    canonical.rel = 'canonical'
    canonical.href = 'https://skillbridge.debarghya.org/'
    document.head.appendChild(canonical)
    return () => canonical.remove()
  }, [])
  return (
    <div className="sb-landing">
      <a className="sb-skip" href="#main">
        Skip to content
      </a>
      <LandingNav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <OpportunityGap />
        <HowItWorks />
        <ProofOfWork />
        <Features />
      </main>
      <Footer />
    </div>
  )
}
