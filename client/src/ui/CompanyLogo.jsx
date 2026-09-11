import { useEffect, useState } from 'react'

function initials(name) {
  return String(name || 'Business').trim().charAt(0).toUpperCase() || 'B'
}

export default function CompanyLogo({ logo, name, size = 40, style = {}, className = '' }) {
  const [failed, setFailed] = useState(false)
  const fallbackBackground = style.background || 'linear-gradient(135deg, var(--accent), #ea580c)'

  useEffect(() => {
    setFailed(false)
  }, [logo])

  const sharedStyle = {
    width: size,
    height: size,
    borderRadius: Math.max(6, Math.round(size * 0.24)),
    flexShrink: 0,
    ...style,
  }

  if (logo && !failed) {
    return <img className={className} src={logo} alt={`${name || 'Company'} logo`} onError={() => setFailed(true)} style={{ ...sharedStyle, objectFit: 'cover', background: '#f8fafc', border: '1px solid #e2e8f0' }} />
  }

  return <span className={className} role="img" aria-label={`${name || 'Company'} logo`} style={{ ...sharedStyle, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: fallbackBackground, color: '#fff', fontSize: Math.max(12, Math.round(size * 0.42)), fontWeight: 800 }}>{initials(name)}</span>
}
