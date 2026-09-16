import { ArrowLeft, Compass, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import SkillBridgeBrand from './SkillBridgeBrand'
import './NotFound.css'

export default function NotFound() {
  return <main className="not-found-page">
    <nav className="not-found-nav" aria-label="Page not found navigation">
      <SkillBridgeBrand linkTo="/" />
    </nav>
    <section className="not-found-content" aria-labelledby="not-found-title">
      <div className="not-found-code" aria-hidden="true"><Compass size={34} /><span>404</span></div>
      <p className="not-found-kicker">PAGE NOT FOUND</p>
      <h1 id="not-found-title">This path does not lead to an opportunity.</h1>
      <p>The page may have moved, or the address may be incorrect. Return to SkillBridge and continue from a known starting point.</p>
      <div className="not-found-actions">
        <Link to="/" className="not-found-primary"><ArrowLeft size={18} />Back to home</Link>
        <Link to="/login" className="not-found-secondary"><LogIn size={18} />Log in</Link>
      </div>
    </section>
    <footer className="not-found-footer">Made with 💚 by Debarghya</footer>
  </main>
}
