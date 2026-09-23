import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
export default function Footer() {
  return (
    <footer className="sb-footer">
      <div className="sb-wrap">
        <div className="sb-footer-grid">
          <div>
            <SkillBridgeBrand linkTo="/" className="sb-brand" />
            <p>
              Ability deserves a way forward.
              <br />
              Bridging the Tier-2/3 opportunity gap.
            </p>
          </div>
          <nav aria-label="Footer product links">
            <h3>Explore</h3>
            <a href="#opportunity-gap">Our purpose</a>
            <a href="#how-it-works">How it works</a>
            <a href="#proof">Proof of work</a>
            <a href="#features">Product features</a>
          </nav>
          <nav aria-label="Account links">
            <h3>Your workspace</h3>
            <Link to="/student?mode=signup">For students</Link>
            <Link to="/company?mode=signup">For organizations</Link>
            <Link to="/login">Log in</Link>
            <Link to="/admin">Admin sign in</Link>
          </nav>
          <nav aria-label="Contact links">
            <h3>Get in touch</h3>
            <a href="mailto:debarghyabandyopadhyay191@gmail.com">
              Email us
              <ArrowUpRight size={14} />
            </a>
            <a
              href="https://github.com/debarghya131/Skill-Bridge"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
              <ArrowUpRight size={14} />
            </a>
            <a
              href="https://portfolio.debarghya.org"
              target="_blank"
              rel="noreferrer"
            >
              Meet the builder
              <ArrowUpRight size={14} />
            </a>
          </nav>
        </div>
        <div className="sb-footer-bottom">
          <span>SkillBridge / Built around demonstrated ability.</span>
          <span className="sb-footer-credit">Made with 💚 by Debarghya</span>
          <a href="#home">Back to top ↑</a>
        </div>
      </div>
    </footer>
  )
}
