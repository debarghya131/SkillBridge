import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setCompanySessionToken, signInCompany, signUpCompany } from './companyApi'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import { toast } from '../ui/toast'

const inputStyle = {
  width: '100%', padding: '8px 12px',
  border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
  fontFamily: 'inherit', color: 'var(--text)', background: 'var(--white)',
}
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }
const errorStyle = { fontSize: 11, color: '#EF4444', marginTop: 3 }

function TogglePill({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 7, padding: 3, gap: 2, marginBottom: 7 }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          flex: 1, padding: '5px 8px', borderRadius: 5, border: 'none',
          background: value === opt.value ? 'var(--white)' : 'transparent',
          color: value === opt.value ? 'var(--accent)' : 'var(--muted)',
          fontWeight: 600, fontSize: 13,
          boxShadow: value === opt.value ? 'var(--shadow-sm)' : 'none',
          transition: 'all 0.18s', cursor: 'pointer',
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, error, required, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#EF4444' }}> *</span>}</label>
      {children}
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  )
}

export default function CompanyAuth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'signin' ? 'signin' : 'signup'
  const [contactMethod, setContactMethod] = useState('email')
  const [bizVerifyMethod, setBizVerifyMethod] = useState('gstin')
  const [form, setForm] = useState({
    companyName: '', email: '', phone: '',
    gstin: '', businessDoc: '',
    location: '', password: '',
    signInContact: '', signInPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const focusAccent = (e) => { e.target.style.borderColor = 'var(--accent)' }
  const blurBorder = (e) => { e.target.style.borderColor = 'var(--border)' }

  const validateSignup = () => {
    const e = {}
    if (!form.companyName.trim()) e.companyName = 'Company name is required'
    if (contactMethod === 'email' && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address'
    if (contactMethod === 'phone' && !/^\d{10}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit phone number'
    if (bizVerifyMethod === 'gstin' && !form.gstin.trim()) e.gstin = 'GSTIN is required'
    if (bizVerifyMethod !== 'gstin' && !form.businessDoc.trim()) {
      e.businessDoc = 'Business registration number is required'
    }
    if (!form.location.trim()) e.location = 'Location is required'
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignup = async () => {
    if (!validateSignup()) {
      return
    }

    setIsSubmitting(true)
    setServerError('')

    try {
      const result = await signUpCompany({
        companyName: form.companyName,
        email: form.email,
        phone: form.phone,
        gstin: form.gstin,
        businessDoc: form.businessDoc,
        location: form.location,
        password: form.password,
        contactMethod,
        verificationMethod: bizVerifyMethod,
      })

      setCompanySessionToken(result.token)
      toast.success('Business account created successfully.', { title: 'Company Onboarded' })
      window.location.assign('/company/dashboard')
    } catch (error) {
      setServerError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignin = async () => {
    const e = {}
    if (!form.signInContact.trim()) e.signInContact = 'Email or phone is required'
    if (!form.signInPassword) e.signInPassword = 'Password is required'
    setErrors(e)

    if (Object.keys(e).length > 0) {
      return
    }

    setIsSubmitting(true)
    setServerError('')

    try {
      const result = await signInCompany({
        contact: form.signInContact,
        password: form.signInPassword,
      })

      setCompanySessionToken(result.token)
      toast.success('Signed in successfully.', { title: 'Company Session Active' })
      window.location.assign('/company/dashboard')
    } catch (error) {
      setServerError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #FFF7ED 0%, #FFFFFF 55%, #F0F9FF 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <button onClick={() => navigate(mode === 'signin' ? '/login' : '/')} style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          fontSize: 14, fontWeight: 600, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>← {mode === 'signin' ? 'Login options' : 'Back to Home'}</button>

        <div style={{
          background: 'var(--white)', borderRadius: 20,
          padding: '24px 28px', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><SkillBridgeBrand /></div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {mode === 'signup' ? 'Register Your Business' : 'Company Sign In'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>
              {mode === 'signup' ? 'Find verified student talent for your MSME' : 'Welcome back! Access your talent dashboard'}
            </p>
          </div>

          {mode === 'signup' ? (
            <div>
              {/* 1. Company Name */}
              <Field label="Company / Business Name" error={errors.companyName} required>
                <input
                  type="text" placeholder="e.g. Sharma Traders"
                  value={form.companyName} onChange={e => update('companyName', e.target.value)}
                  style={inputStyle} onFocus={focusAccent} onBlur={blurBorder}
                />
              </Field>

              {/* 2. Contact method */}
              <Field label="Register Via" error={errors.email || errors.phone} required>
                <TogglePill
                  options={[{ value: 'email', label: '📧 Email' }, { value: 'phone', label: '📱 Phone' }]}
                  value={contactMethod} onChange={setContactMethod}
                />
                {contactMethod === 'email' ? (
                  <input
                    type="email" placeholder="business@example.com"
                    value={form.email} onChange={e => update('email', e.target.value)}
                    style={inputStyle} onFocus={focusAccent} onBlur={blurBorder}
                  />
                ) : (
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>+91</span>
                    <input
                      type="tel" placeholder="10-digit mobile number"
                      value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      style={{ ...inputStyle, paddingLeft: 46 }} onFocus={focusAccent} onBlur={blurBorder}
                    />
                  </div>
                )}
              </Field>

              {/* 3. Business verification */}
              <Field label="Business Verification" error={errors.gstin || errors.businessDoc} required>
                <TogglePill
                  options={[{ value: 'gstin', label: '🏛️ GSTIN' }, { value: 'udyam', label: '📋 Udyam Reg.' }]}
                  value={bizVerifyMethod} onChange={setBizVerifyMethod}
                />
                {bizVerifyMethod === 'gstin' ? (
                  <div>
                    <input
                      type="text" placeholder="e.g. 29ABCDE1234F1Z5"
                      value={form.gstin}
                      onChange={e => update('gstin', e.target.value.toUpperCase().slice(0, 15))}
                      style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      onFocus={focusAccent} onBlur={blurBorder}
                    />
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      15-character Goods and Services Tax Identification Number
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text" placeholder="Udyam Registration Number"
                      value={form.businessDoc} onChange={e => update('businessDoc', e.target.value.toUpperCase())}
                      style={{ ...inputStyle, fontFamily: 'monospace' }}
                      onFocus={focusAccent} onBlur={blurBorder}
                    />
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      UDYAM-XX-00-0000000 format
                    </div>
                  </div>
                )}
                <div style={{
                  marginTop: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600,
                  padding: '6px 10px', background: 'var(--accent-light)',
                  borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  🔒 Your business details are verified securely
                </div>
              </Field>

              {/* 4. Location */}
              <Field label="Business Location" error={errors.location} required>
                <input
                  type="text" placeholder="City, State (e.g. Ranchi, Jharkhand)"
                  value={form.location} onChange={e => update('location', e.target.value)}
                  style={inputStyle} onFocus={focusAccent} onBlur={blurBorder}
                />
              </Field>

              {/* 5. Password */}
              <Field label="Password" error={errors.password} required>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={form.password} onChange={e => update('password', e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }} onFocus={focusAccent} onBlur={blurBorder}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: 0 }}
                  >{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {form.password && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: form.password.length >= i * 2
                          ? (form.password.length >= 8 ? '#10B981' : '#F59E0B')
                          : 'var(--border)',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, whiteSpace: 'nowrap' }}>
                      {form.password.length < 6 ? 'Weak' : form.password.length < 8 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}
              </Field>

              <button className="btn-accent" style={{ width: '100%', justifyContent: 'center', marginTop: 6, padding: '10px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}
                disabled={isSubmitting}
                onClick={handleSignup}>
                {isSubmitting ? 'Registering...' : 'Register & Find Talent →'}
              </button>

              {serverError && <p style={{ textAlign: 'center', fontSize: 12, color: '#EF4444', marginTop: 10 }}>{serverError}</p>}

              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                By registering you agree to our Terms of Service and Privacy Policy
              </p>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 14 }}>Already registered?{' '}<button onClick={() => navigate('/login')} style={{ background: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>Log in</button></p>
            </div>
          ) : (
            <div>
              <Field label="Email or Phone" error={errors.signInContact} required>
                <input
                  type="text" placeholder="Enter your registered email or phone"
                  value={form.signInContact} onChange={e => update('signInContact', e.target.value)}
                  style={inputStyle} onFocus={focusAccent} onBlur={blurBorder}
                />
              </Field>

              <Field label="Password" error={errors.signInPassword} required>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    value={form.signInPassword} onChange={e => update('signInPassword', e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }} onFocus={focusAccent} onBlur={blurBorder}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: 0 }}
                  >{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </Field>

              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>

              <button className="btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '13px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}
                disabled={isSubmitting}
                onClick={handleSignin}>
                {isSubmitting ? 'Signing In...' : 'Sign In →'}
              </button>

              {serverError && <p style={{ textAlign: 'center', fontSize: 12, color: '#EF4444', marginTop: 10 }}>{serverError}</p>}

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20 }}>
                Not registered yet?{' '}
                <button onClick={() => navigate('/company?mode=signup')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Register your business
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
