import { useState } from 'react'
import { CalendarDays, Flame } from 'lucide-react'
import SkillBridgeBrand from '../ui/SkillBridgeBrand'

export default function StudentNav({
  avatar,
  name,
  trustScore,
  practiceStats,
  onOpenProfile,
  onPrefetchProfile,
  onToggleSidebar,
}) {
  const [activeMetric, setActiveMetric] = useState(null)
  const metricDetails = {
    practiceDays: {
      icon: <CalendarDays size={15} />,
      label: 'Approved practice days',
      value: practiceStats.totalPracticeDays,
      description: 'Total unique days with reviewer-approved practice.',
    },
    trustStreak: {
      icon: <Flame size={15} />,
      label: 'Current trust streak',
      value: practiceStats.overallCurrent,
      description: 'Consecutive approved practice days ending today or yesterday.',
    },
  }
  const selectedMetric = activeMetric ? metricDetails[activeMetric] : null
  const toggleMetric = metric => setActiveMetric(current => current === metric ? null : metric)

  return (
    <>
    <nav className="dashboard-nav" style={{
      height: 52, background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="mobile-only mobile-menu-toggle" onClick={onToggleSidebar} aria-label="Open student workspace navigation">
          ☰
        </button>
        <SkillBridgeBrand size="compact" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="dashboard-activity-metrics" aria-label="SkillBridge practice activity">
          <span className="dashboard-metric-tooltip" tabIndex={0} role="button" data-tooltip="Total unique days with reviewer-approved practice." aria-label="Total approved practice days" aria-expanded={activeMetric === 'practiceDays'} onClick={() => toggleMetric('practiceDays')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMetric('practiceDays') } }}><CalendarDays size={15}/><strong>{practiceStats.totalPracticeDays}</strong><small>days</small></span>
          <span className="dashboard-metric-tooltip" tabIndex={0} role="button" data-tooltip="Consecutive approved practice days ending today or yesterday." aria-label="Current trust streak" aria-expanded={activeMetric === 'trustStreak'} onClick={() => toggleMetric('trustStreak')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMetric('trustStreak') } }}><Flame size={15}/><strong>{practiceStats.overallCurrent}</strong><small>trust streak</small></span>
        </div>
        <div
          className="dashboard-user-meta"
          onClick={onOpenProfile}
          onFocus={onPrefetchProfile}
          onPointerEnter={onPrefetchProfile}
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenProfile()
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0,
            overflow: 'hidden',
          }}>
            {avatar
              ? <img src={avatar} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : name[0].toUpperCase()
            }
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>{name}</div>
            <div className="dashboard-user-subtitle" style={{ fontSize: 11, color: 'var(--muted)' }}>⭐TrustScore {trustScore}</div>
          </div>
        </div>
      </div>
    </nav>
    {selectedMetric && (
      <div className="dashboard-mobile-metric-detail" role="status">
        {selectedMetric.icon}
        <strong>{selectedMetric.value} {selectedMetric.label}</strong>
        <span>{selectedMetric.description}</span>
      </div>
    )}
    </>
  )
}
