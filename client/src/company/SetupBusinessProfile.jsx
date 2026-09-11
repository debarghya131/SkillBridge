import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageUp, Trash2 } from 'lucide-react'
import SectionTabs from './SectionTabs'
import CompanyLogo from '../ui/CompanyLogo'

const WORK_MODE_OPTIONS = ['Remote', 'Hybrid', 'On-site']
const MAX_BUSINESS_LOGO_SIZE = 600 * 1024
const BUSINESS_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function calcCompletion(profile) {
  const checks = [
    profile.businessName.trim(),
    profile.location.trim(),
    profile.industry.trim(),
    profile.website.trim(),
    profile.teamSize.trim(),
    profile.description.trim(),
    profile.hiringCategories.trim(),
    profile.requiredSkills.trim(),
    profile.contactEmail.trim(),
    profile.contactPhone.trim(),
    profile.workModes.length > 0,
  ]

  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}

export default function SetupBusinessProfile({ profile, onSave }) {
  const [draft, setDraft] = useState(profile)
  const [view, setView] = useState('Business details')
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingLogo, setIsSavingLogo] = useState(false)
  const [saveError, setSaveError] = useState('')
  const logoInputRef = useRef(null)

  useEffect(() => {
    setDraft(profile)
  }, [profile])

  const completion = useMemo(() => calcCompletion(draft), [draft])

  const updateField = (field, value) => {
    setDraft(current => ({ ...current, [field]: value }))
  }

  const saveLogo = async logo => {
    setIsSavingLogo(true)
    setSaveError('')

    try {
      // Save only the logo from the last persisted profile so a logo upload
      // never publishes unrelated form edits that are still in progress.
      const savedProfile = await onSave({ ...profile, logo })
      updateField('logo', savedProfile?.logo ?? logo)
    } catch (error) {
      setSaveError(error.message || 'The business logo could not be saved.')
    } finally {
      setIsSavingLogo(false)
    }
  }

  const handleLogoChange = (file) => {
    if (!file) return
    if (!BUSINESS_LOGO_TYPES.has(file.type)) {
      setSaveError('Choose a PNG, JPG, or WEBP logo.')
      return
    }
    if (file.size > MAX_BUSINESS_LOGO_SIZE) {
      setSaveError('Business logos must be 600 KB or smaller.')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const logo = typeof reader.result === 'string' ? reader.result : ''
      if (!logo) {
        setSaveError('The selected logo could not be read.')
        return
      }
      await saveLogo(logo)
    }
    reader.onerror = () => setSaveError('The selected logo could not be read.')
    reader.readAsDataURL(file)
  }

  const toggleWorkMode = (mode) => {
    setDraft(current => ({
      ...current,
      workModes: current.workModes.includes(mode)
        ? current.workModes.filter(item => item !== mode)
        : [...current.workModes, mode],
    }))
  }

  const handleSave = async () => {
    const emailIsValid = !draft.contactEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())
    const websiteIsValid = !draft.website || /^https?:\/\/[^\s]+$/i.test(draft.website.trim())
    const phoneDigits = draft.contactPhone.replace(/\D/g, '')

    if (!draft.businessName.trim() || !draft.location.trim()) {
      setSaveError('Business name and primary location are required.')
      return
    }

    if (!websiteIsValid) {
      setSaveError('Website must start with http:// or https://.')
      return
    }

    if (!emailIsValid) {
      setSaveError('Enter a valid contact email address.')
      return
    }

    if (draft.contactPhone && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
      setSaveError('Contact phone must contain 10 to 15 digits.')
      return
    }

    setSaveError('')
    setIsSaving(true)
    try {
      await onSave({
        ...draft,
        businessName: draft.businessName.trim(),
        location: draft.location.trim(),
        website: draft.website.trim(),
        contactEmail: draft.contactEmail.trim().toLowerCase(),
        contactPhone: draft.contactPhone.trim(),
      })
    } catch (error) {
      setSaveError(error.message || 'The business profile could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
        borderRadius: 16,
        borderLeft: '5px solid var(--accent)',
        boxShadow: '0 8px 24px rgba(249,115,22,0.08)',
        padding: '24px 28px',
        border: '1px solid #FED7AA',
        marginBottom: 20,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 9 }}>
          <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'rgba(249,115,22,0.14)', fontSize: 14 }}>🛠️</span>
          Business Profile
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>
          Edit your business profile
        </div>
        <div style={{ fontSize: 13, color: '#9A3412', maxWidth: 760, lineHeight: 1.6 }}>
          Update your business identity, work type, hiring goals, and contact details so students can trust your brand and apply with confidence.
        </div>
      </div>

      <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Business Name', value: draft.businessName || 'Add business name', icon: '🏷️' },
          { label: 'Primary Location', value: draft.location || 'Add location', icon: '📍' },
          { label: 'Profile Status', value: `${completion}% Complete`, icon: '✅' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--white)', borderRadius: 12, padding: '17px 18px 15px', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)', boxShadow: '0 2px 8px rgba(15,23,42,0.03)' }}>
            <div style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-light)', borderRadius: 9, fontSize: 18, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <SectionTabs label="Business profile views" options={['Business details', 'Hiring', 'Contact']} value={view} onChange={setView} />
      <div className="profile-tab-content" style={{ background: 'var(--white)', borderRadius: 8, border: '1px solid var(--border)', padding: '16px', marginBottom: 0 }}>
        <div hidden={view !== 'Business details'} className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <CompanyLogo logo={draft.logo} name={draft.businessName} size={64} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 3 }}>Business Logo</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>PNG, JPG, or WEBP up to 600 KB. Changes save immediately.</div>
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={event => { handleLogoChange(event.target.files?.[0]); event.target.value = '' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                <button type="button" className="btn-accent" disabled={isSavingLogo} onClick={() => logoInputRef.current?.click()} style={{ padding: '7px 10px', fontSize: 12 }}><ImageUp size={15} />{isSavingLogo ? 'Saving Logo...' : draft.logo ? 'Replace Logo' : 'Upload Logo'}</button>
                {draft.logo && <button type="button" disabled={isSavingLogo} onClick={() => saveLogo('')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fff', color: '#b91c1c', fontSize: 12, fontWeight: 700, cursor: isSavingLogo ? 'wait' : 'pointer', opacity: isSavingLogo ? 0.65 : 1 }}><Trash2 size={14} />Remove</button>}
              </div>
            </div>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Business Name</span>
            <input value={draft.businessName} onChange={e => updateField('businessName', e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Primary Location</span>
            <input value={draft.location} onChange={e => updateField('location', e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Industry</span>
            <input value={draft.industry} onChange={e => updateField('industry', e.target.value)} placeholder="EdTech, Retail, SaaS..." style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Website</span>
            <input type="url" value={draft.website} onChange={e => updateField('website', e.target.value)} placeholder="https://yourbusiness.com" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Team Size</span>
            <input value={draft.teamSize} onChange={e => updateField('teamSize', e.target.value)} placeholder="10-25 employees" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Hiring Categories</span>
            <input value={draft.hiringCategories} onChange={e => updateField('hiringCategories', e.target.value)} placeholder="Frontend, Marketing, Analytics" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
        </div>

        <div hidden={view !== 'Hiring'} style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Work Modes</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WORK_MODE_OPTIONS.map(mode => {
              const active = draft.workModes.includes(mode)
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleWorkMode(mode)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 100,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? 'var(--accent)' : 'var(--bg)',
                    color: active ? 'white' : 'var(--muted)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {mode}
                </button>
              )
            })}
          </div>
        </div>

        <div hidden={view !== 'Contact'} className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Contact Email</span>
            <input type="email" value={draft.contactEmail} onChange={e => updateField('contactEmail', e.target.value)} placeholder="hiring@business.com" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Contact Phone</span>
            <input value={draft.contactPhone} onChange={e => updateField('contactPhone', e.target.value)} placeholder="+91 98765 43210" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
        </div>

        <label hidden={view !== 'Hiring'} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Business Description</span>
          <textarea value={draft.description} onChange={e => updateField('description', e.target.value)} rows={4} placeholder="Describe your company, mission, and hiring goals..." style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'none' }} />
        </label>

        <label hidden={view !== 'Hiring'} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Required Skills</span>
          <textarea value={draft.requiredSkills} onChange={e => updateField('requiredSkills', e.target.value)} rows={3} placeholder="React, Node.js, Canva, Power BI..." style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'none' }} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Current completion: <strong style={{ color: 'var(--dark)' }}>{completion}%</strong>
            </div>
            {saveError && <div style={{ color: '#B91C1C', fontSize: 12, fontWeight: 600, marginTop: 5 }}>{saveError}</div>}
          </div>
          <button className="btn-accent" type="button" onClick={handleSave} disabled={isSaving} style={{ padding: '10px 18px', fontSize: 13 }}>
            {isSaving ? 'Saving...' : 'Save Business Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
