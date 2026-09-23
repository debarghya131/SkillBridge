import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import { getAdminSessionToken, setAdminSession, signInAdmin } from './adminApi'
import './Admin.css'

export default function AdminAuth() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (getAdminSessionToken()) return <Navigate to="/admin/dashboard" replace />

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = await signInAdmin({ email, password })
      if (!['admin', 'reviewer'].includes(result.reviewer?.role)) throw new Error('This account does not have operations access.')
      setAdminSession(result.token, result.reviewer?.role)
      window.location.assign('/admin/dashboard')
    } catch (failure) { setError(failure.message || 'Sign in failed') }
    finally { setBusy(false) }
  }

  return <main className="admin-auth">
    <form className="admin-auth-card" onSubmit={submit}>
      <button type="button" className="admin-back" onClick={() => navigate('/login')}><ArrowLeft size={15}/>Login options</button>
      <SkillBridgeBrand />
      <div><span>PLATFORM OPERATIONS</span><h1>Admin workspace</h1><p>Administrators and authorized review staff use one workspace for standards, requests, and blind assessments.</p></div>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)}/></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}/></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy}><LockKeyhole size={16}/>{busy ? 'Signing in...' : 'Sign in to operations'}</button>
    </form>
  </main>
}
