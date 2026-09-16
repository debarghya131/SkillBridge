import { Link } from 'react-router-dom'
import HeroWorkflow from './HeroWorkflow'
import {
  ArrowDown,
  ArrowUpRight,
  BriefcaseBusiness,
  GraduationCap
} from 'lucide-react'
export default function Hero() {
  return (
    <section id="home" className="sb-hero" aria-labelledby="sb-hero-title">
      <div className="sb-wrap sb-hero-copy">
        <p className="sb-eyebrow">
          <span className="sb-status-dot" />
          Built for ability. Open to opportunity.
        </p>
        <h1 id="sb-hero-title">
          SkillBridge<span>.</span>
        </h1>
        <p className="sb-hero-line">
          Your college is part of your story.
          <br />
          <strong>Your work should write the next chapter.</strong>
        </p>
        <p className="sb-hero-description">
          Prove your skills. Build your portfolio. Connect with startups and
          local businesses that need what you can do.
        </p>
        <div className="sb-actions">
          <Link className="sb-button" to="/student?mode=signup">
            <GraduationCap size={19} />
            I'm a student
            <ArrowUpRight size={18} />
          </Link>
          <Link
            className="sb-button sb-button-outline"
            to="/company?mode=signup"
          >
            <BriefcaseBusiness size={19} />
            I'm hiring
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <div className="sb-hero-product sb-wrap">
        <div className="sb-preview-label">
          <span>FROM ABILITY TO EVIDENCE</span>
          <a href="#proof">
            How verification works <ArrowDown size={14} />
          </a>
        </div>
        <HeroWorkflow />
      </div>
    </section>
  )
}
