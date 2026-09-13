import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogIn } from 'lucide-react'
import { getReviewerSessionToken, setReviewerSessionToken, signInReviewer } from './reviewerApi'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import './Reviewer.css'

export default function ReviewerAuth() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (getReviewerSessionToken()) return <Navigate to="/reviewer/dashboard" replace />

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = await signInReviewer({ email, password })
      setReviewerSessionToken(result.token)
      navigate('/reviewer/dashboard', { replace: true })
    } catch (failure) { setError(failure.message || 'Sign in failed') }
    finally { setBusy(false) }
  }

  return <main className="reviewer-auth">
    <form onSubmit={submit} className="reviewer-auth-card">
      <button type="button" className="reviewer-auth-back" onClick={() => navigate('/login')}><ArrowLeft size={15}/>Login options</button>
      <SkillBridgeBrand />
      <div><span className="reviewer-auth-kicker">SKILLBRIDGE OPERATIONS</span><h1>Reviewer sign in</h1><p>Authorized reviewers only. Decisions are logged and affect student reputation.</p></div>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)}/></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}/></label>
      {error && <p className="reviewer-error" role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy}><LogIn size={16}/>{busy ? 'Signing in...' : 'Sign in'}</button>
    </form>
  </main>
}
