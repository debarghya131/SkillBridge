import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setStudentSessionToken, signInStudent, signUpStudent } from './studentApi'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'
import { toast } from '../ui/toast'

const LANGUAGES = [
  'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi',
  'Tamil', 'Gujarati', 'Kannada', 'Odia', 'Punjabi', 'Malayalam', 'Assamese',
]

const inputStyle = {
  width: '100%', padding: '8px 12px',
  border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
  fontFamily: 'inherit', color: 'var(--text)', background: 'var(--white)',
}
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }
const errorStyle = { fontSize: 11, color: '#EF4444', marginTop: 3 }

function TogglePill({ options, value, onChange, accentColor = 'var(--primary)' }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 7, padding: 3, gap: 2, marginBottom: 7 }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          flex: 1, padding: '5px 8px', borderRadius: 5, border: 'none',
          background: value === opt.value ? 'var(--white)' : 'transparent',
          color: value === opt.value ? accentColor : 'var(--muted)',
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

function LanguagePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const closeWhenFocusLeaves = () => window.requestAnimationFrame(() => {
    if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
  })
  return <div ref={pickerRef} style={{ position: 'relative' }} onBlur={closeWhenFocusLeaves}>
    <button type="button" onClick={() => setOpen(current => !current)} aria-haspopup="listbox" aria-expanded={open} style={{ ...inputStyle, appearance: 'none', textAlign: 'left', background: 'var(--white)', color: value ? 'var(--text)' : 'var(--muted)', cursor: 'pointer' }}>
      {value || 'Select language...'}<span style={{ float: 'right', color: 'var(--muted)' }}>v</span>
    </button>
    {open && <div role="listbox" aria-label="Preferred language" style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: 'calc(100% + 4px)', maxHeight: 210, overflowY: 'auto', padding: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--white)', boxShadow: '0 10px 24px rgba(15,23,42,.16)' }}>
      <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(''); setOpen(false) }} style={{ display: 'block', width: '100%', padding: '9px 10px', border: 0, background: 'transparent', color: 'var(--muted)', textAlign: 'left' }}>Select language...</button>
      {LANGUAGES.map(language => <button key={language} type="button" role="option" aria-selected={language === value} onClick={() => { onChange(language); setOpen(false) }} style={{ display: 'block', width: '100%', padding: '9px 10px', border: 0, borderRadius: 5, background: language === value ? 'var(--primary-light)' : 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>{language}</button>)}
    </div>}
  </div>
}

export default function StudentAuth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'signin' ? 'signin' : 'signup'
  const [contactMethod, setContactMethod] = useState('email')
  const [idMethod, setIdMethod] = useState('aadhaar')
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    aadhaarNumber: '', digilockerToken: '',
    language: '', location: '', password: '',
    signInContact: '', signInPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const focusStyle = (e) => { e.target.style.borderColor = 'var(--primary)' }
  const blurStyle = (e) => { e.target.style.borderColor = 'var(--border)' }

  const validateSignup = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (contactMethod === 'email' && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address'
    if (contactMethod === 'phone' && !/^\d{10}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit phone number'
    if (idMethod === 'aadhaar' && !/^\d{12}$/.test(form.aadhaarNumber.replace(/\s/g, ''))) e.aadhaarNumber = 'Enter a valid 12-digit Aadhaar number'
    if (idMethod === 'digilocker' && !form.digilockerToken.trim()) e.digilockerToken = 'DigiLocker ID is required'
    if (!form.language) e.language = 'Please select a preferred language'
    if (!form.location.trim()) e.location = 'Location is required'
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignup = async () => {
    if (!validateSignup()) return

    try {
      setIsSubmitting(true)
      setServerError('')

      const result = await signUpStudent({
        name: form.name,
        email: form.email,
        phone: form.phone,
        aadhaarNumber: form.aadhaarNumber,
        digilockerToken: form.digilockerToken,
        language: form.language,
        location: form.location,
        password: form.password,
        contactMethod,
        idMethod,
      })

      setStudentSessionToken(result.token)
      toast.success('Student account created successfully.', { title: 'Welcome to SkillBridge' })
      navigate('/student/dashboard', { state: { student: result.student } })
    } catch (error) {
      setServerError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignin = async () => {
    const e = {}
    const signInContact = form.signInContact.trim()
    const isEmail = /\S+@\S+\.\S+/.test(signInContact)
    const isPhone = /^\d{10}$/.test(signInContact)

    if (!signInContact) e.signInContact = 'Email or phone is required'
    else if (!isEmail && !isPhone) e.signInContact = 'Enter your registered email or 10-digit phone number'
    if (!form.signInPassword) e.signInPassword = 'Password is required'
    setErrors(e)

    if (Object.keys(e).length > 0) return

    try {
      setIsSubmitting(true)
      setServerError('')

      const result = await signInStudent({
        contact: form.signInContact,
        password: form.signInPassword,
      })

      setStudentSessionToken(result.token)
      toast.success('Signed in successfully.', { title: 'Student Session Active' })
      navigate('/student/dashboard', { state: { student: result.student } })
    } catch (error) {
      setServerError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F0F4FF 0%, #FFFFFF 55%, #F0FDF4 100%)',
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
              {mode === 'signup' ? 'Create Student Account' : 'Student Sign In'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>
              {mode === 'signup' ? 'Join thousands of students finding real opportunities' : 'Welcome back! Continue where you left off'}
            </p>
          </div>

          {mode === 'signup' ? (
            <div>
              {/* 1. Name */}
              <Field label="Full Name" error={errors.name} required>
                <input
                  type="text" placeholder="e.g. Riya Sharma"
                  value={form.name} onChange={e => update('name', e.target.value)}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              {/* 2. Contact method */}
              <Field label="Register Via" error={errors.email || errors.phone} required>
                <TogglePill
                  options={[{ value: 'email', label: '📧 College Email' }, { value: 'phone', label: '📱 Phone Number' }]}
                  value={contactMethod} onChange={setContactMethod}
                />
                {contactMethod === 'email' ? (
                  <input
                    type="email" placeholder="yourname@college.edu"
                    value={form.email} onChange={e => update('email', e.target.value)}
                    style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                  />
                ) : (
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>+91</span>
                    <input
                      type="tel" placeholder="10-digit mobile number"
                      value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      style={{ ...inputStyle, paddingLeft: 46 }} onFocus={focusStyle} onBlur={blurStyle}
                    />
                  </div>
                )}
              </Field>

              {/* 3. ID verification */}
              <Field label="Identity Verification" error={errors.aadhaarNumber || errors.digilockerToken} required>
                <TogglePill
                  options={[{ value: 'aadhaar', label: '🪪 Aadhaar' }, { value: 'digilocker', label: '🔐 DigiLocker' }]}
                  value={idMethod} onChange={setIdMethod}
                />
                {idMethod === 'aadhaar' ? (
                  <input
                    type="text" placeholder="1234 5678 9012"
                    value={form.aadhaarNumber}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
                      update('aadhaarNumber', raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim())
                    }}
                    style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                  />
                ) : (
                  <div>
                    <input
                      type="text" placeholder="DigiLocker username / ID"
                      value={form.digilockerToken} onChange={e => update('digilockerToken', e.target.value)}
                      style={{ ...inputStyle, marginBottom: 6 }} onFocus={focusStyle} onBlur={blurStyle}
                    />
                    <div style={{
                      fontSize: 12, color: 'var(--primary)', fontWeight: 600,
                      padding: '6px 10px', background: 'var(--primary-light)',
                      borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      🔗 You'll be redirected to DigiLocker for verification
                    </div>
                  </div>
                )}
              </Field>

              {/* 4. Preferred language */}
              <Field label="Preferred Language" error={errors.language} required>
                <LanguagePicker value={form.language} onChange={language => update('language', language)} />
              </Field>

              {/* 5. Location */}
              <Field label="Location" error={errors.location} required>
                <input
                  type="text" placeholder="City, State (e.g. Ranchi, Jharkhand)"
                  value={form.location} onChange={e => update('location', e.target.value)}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              {/* 6. Password */}
              <Field label="Password" error={errors.password} required>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={form.password} onChange={e => update('password', e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }} onFocus={focusStyle} onBlur={blurStyle}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: 0 }}
                  >{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {form.password && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                    {[1,2,3,4].map(i => (
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

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6, padding: '10px' }}
                onClick={handleSignup} disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account & Continue →'}
              </button>

              {serverError && (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#DC2626', marginTop: 10 }}>
                  {serverError}
                </p>
              )}

              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                By registering you agree to our Terms of Service and Privacy Policy
              </p>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 14 }}>Already registered?{' '}<button onClick={() => navigate('/login')} style={{ background: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700 }}>Log in</button></p>
            </div>
          ) : (
            <div>
              <Field label="Email or Phone" error={errors.signInContact} required>
                <input
                  type="text" placeholder="Enter your registered email or phone"
                  value={form.signInContact} onChange={e => {
                    update('signInContact', e.target.value)
                    setErrors(current => ({ ...current, signInContact: '' }))
                    setServerError('')
                  }}
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              <Field label="Password" error={errors.signInPassword} required>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    value={form.signInPassword} onChange={e => update('signInPassword', e.target.value)}
                    style={{ ...inputStyle, paddingRight: 44 }} onFocus={focusStyle} onBlur={blurStyle}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: 0 }}
                  >{showPassword ? '🙈' : '👁️'}</button>
                </div>
              </Field>

              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                onClick={handleSignin} disabled={isSubmitting}>
                {isSubmitting ? 'Signing In...' : 'Sign In →'}
              </button>

              {serverError && (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#DC2626', marginTop: 12 }}>
                  {serverError}
                </p>
              )}

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20 }}>
                Don't have an account?{' '}
                <button onClick={() => navigate('/student?mode=signup')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Create one
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
