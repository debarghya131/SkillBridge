import { useState } from 'react'

const GAP_DATA = [
  { skill: 'TypeScript', category: 'Frontend', demand: 92, yours: 0, gap: 'High', gigs: 18, trend: 'rising', resources: ['TypeScript Handbook', 'Total TypeScript'] },
  { skill: 'Next.js', category: 'Frontend', demand: 88, yours: 0, gap: 'High', gigs: 14, trend: 'rising', resources: ['Next.js Docs', 'Lee Robinson Course'] },
  { skill: 'Docker', category: 'Backend', demand: 84, yours: 0, gap: 'High', gigs: 11, trend: 'stable', resources: ['Docker Docs', 'TechWorld Course'] },
  { skill: 'Figma', category: 'Design', demand: 85, yours: 45, gap: 'Medium', gigs: 9, trend: 'rising', resources: ['Figma Learn', 'DesignCourse'] },
  { skill: 'REST APIs', category: 'Backend', demand: 88, yours: 60, gap: 'Medium', gigs: 16, trend: 'stable', resources: ['REST API Tutorial', 'Postman Academy'] },
  { skill: 'Git & GitHub', category: 'Frontend', demand: 95, yours: 70, gap: 'Low', gigs: 22, trend: 'stable', resources: ['Pro Git Book', 'GitHub Skills'] },
  { skill: 'Python', category: 'Backend', demand: 80, yours: 60, gap: 'Low', gigs: 13, trend: 'rising', resources: ['Python Docs', 'Real Python'] },
  { skill: 'PostgreSQL', category: 'Analytics', demand: 76, yours: 0, gap: 'High', gigs: 8, trend: 'stable', resources: ['PostgreSQL Tutorial', 'Neon Docs'] },
]

const STRENGTHS = [
  { skill: 'React', demand: 90, yours: 85, gigs: 20, category: 'Frontend' },
  { skill: 'Figma', demand: 85, yours: 88, gigs: 9, category: 'Design' },
  { skill: 'Node.js', demand: 82, yours: 70, gigs: 15, category: 'Backend' },
]

const CATEGORY_STATS = [
  { name: 'Frontend', match: 72, totalGigs: 38, color: '#6366F1', bg: '#EEF2FF' },
  { name: 'Backend', match: 48, totalGigs: 29, color: '#0891B2', bg: '#ECFEFF' },
  { name: 'Design', match: 61, totalGigs: 17, color: '#D946EF', bg: '#FDF4FF' },
  { name: 'Analytics', match: 40, totalGigs: 14, color: '#F59E0B', bg: '#FFFBEB' },
  { name: 'Marketing', match: 55, totalGigs: 11, color: '#10B981', bg: '#ECFDF5' },
]

const gapColor = {
  High: { bg: '#FEE2E2', color: '#991B1B' },
  Medium: { bg: '#FEF3C7', color: '#92400E' },
  Low: { bg: '#D1FAE5', color: '#065F46' },
}

const trendIcon = { rising: '📈', stable: '➡️', falling: '📉' }

export default function SkillGapReport({ skillHubState }) {
  const [gapFilter, setGapFilter] = useState('all')
  const [expandedSkill, setExpandedSkill] = useState(null)
  const report = skillHubState?.skillGapReport || {}
  const gapData = Array.isArray(report.gapData) ? report.gapData : GAP_DATA
  const strengths = Array.isArray(report.strengths) ? report.strengths : STRENGTHS
  const categoryStats = Array.isArray(report.categoryStats) ? report.categoryStats : CATEGORY_STATS

  const overallMatch = Math.round(
    gapData.reduce((sum, item) => sum + Math.min(item.yours / item.demand, 1) * 100, 0) / gapData.length
  )

  const highCount = gapData.filter(i => i.gap === 'High').length
  const medCount = gapData.filter(i => i.gap === 'Medium').length
  const lowCount = gapData.filter(i => i.gap === 'Low').length

  const filtered = gapData.filter(i => gapFilter === 'all' || i.gap === gapFilter)

  const totalGigsUnlockable = gapData.reduce((s, i) => s + i.gigs, 0)

  return (
    <div>
      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
        borderRadius: 14,
        padding: '16px 22px',
        marginBottom: 14,
        color: 'white',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          Skill Gap Report
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
          Your profile matches <span style={{ color: '#A5B4FC' }}>{overallMatch}%</span> of active GIG requirements
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            📊 24 active GIGs analysed
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '4px 12px', borderRadius: 100 }}>
            🔴 {highCount} High gaps
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '4px 12px', borderRadius: 100 }}>
            🟡 {medCount} Medium gaps
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '4px 12px', borderRadius: 100 }}>
            🟢 {lowCount} Low gaps
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.14)', padding: '4px 12px', borderRadius: 100 }}>
            🚀 Fix all gaps → unlock {totalGigsUnlockable} more GIGs
          </span>
        </div>
      </div>

      {/* Three-stat row */}
      <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Profile Match Score', value: `${overallMatch}%`, sub: 'vs. top GIG requirements', color: overallMatch >= 70 ? '#065F46' : overallMatch >= 50 ? '#92400E' : '#991B1B', bg: overallMatch >= 70 ? '#D1FAE5' : overallMatch >= 50 ? '#FEF3C7' : '#FEE2E2' },
          { label: 'GIGs You Can Unlock', value: totalGigsUnlockable, sub: 'by closing all skill gaps', color: '#1D4ED8', bg: '#DBEAFE' },
          { label: 'Strengths in Demand', value: strengths.length, sub: 'skills already above market need', color: '#065F46', bg: '#D1FAE5' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column main layout */}
      <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>

        {/* Left — Gap List */}
        <div className="responsive-scroll-panel" style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px', height: 'calc(100vh - 420px)', overflowY: 'auto', scrollbarWidth: 'thin' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              Skills to Close
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{filtered.length} skills</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Click any skill to see recommended learning resources.
          </div>

          {/* Gap filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All Gaps', count: gapData.length, bg: 'var(--bg)', color: 'var(--dark)' },
              { key: 'High', label: 'High', count: highCount, bg: '#FEE2E2', color: '#991B1B' },
              { key: 'Medium', label: 'Medium', count: medCount, bg: '#FEF3C7', color: '#92400E' },
              { key: 'Low', label: 'Low', count: lowCount, bg: '#D1FAE5', color: '#065F46' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setGapFilter(f.key)}
                style={{
                  fontSize: 12, fontWeight: 700,
                  background: gapFilter === f.key ? f.color : f.bg,
                  color: gapFilter === f.key ? 'white' : f.color,
                  padding: '4px 10px', borderRadius: 100, border: 'none', cursor: 'pointer',
                }}
              >
                {f.count} {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(item => {
              const gc = gapColor[item.gap]
              const isExpanded = expandedSkill === item.skill

              return (
                <div key={item.skill} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: `1px solid ${item.gap === 'High' ? '#FECACA' : 'var(--border)'}`, cursor: 'pointer' }}
                  onClick={() => setExpandedSkill(isExpanded ? null : item.skill)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{item.skill}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: gc.bg, color: gc.color, padding: '2px 7px', borderRadius: 100 }}>
                          {item.gap} Gap
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 100 }}>
                          {item.category}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{trendIcon[item.trend]} {item.trend}</span>
                      </div>

                      {/* Dual progress bar */}
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                          <span>Your level: <strong style={{ color: 'var(--dark)' }}>{item.yours}%</strong></span>
                          <span>Market demand: <strong style={{ color: 'var(--dark)' }}>{item.demand}%</strong></span>
                        </div>
                        <div style={{ background: '#E5E7EB', borderRadius: 100, height: 7, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', height: '100%', borderRadius: 100, width: `${item.demand}%`, background: '#E5E7EB' }} />
                          <div style={{
                            position: 'absolute', height: '100%', borderRadius: 100,
                            width: `${item.yours}%`,
                            background: item.gap === 'High' ? '#EF4444' : item.gap === 'Medium' ? '#F59E0B' : '#10B981',
                            transition: 'width 0.4s',
                          }} />
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${item.demand}%`, width: 2, background: '#6B7280', transform: 'translateX(-50%)' }} />
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        🏢 Needed in <strong style={{ color: 'var(--dark)' }}>{item.gigs} GIGs</strong>
                        &ensp;·&ensp;
                        Gap: <strong style={{ color: gc.color }}>{item.demand - item.yours}%</strong> to close
                      </div>
                    </div>

                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded resources */}
                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 8 }}>
                        Recommended Resources
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {item.resources.map(r => (
                          <span key={r} style={{ fontSize: 12, fontWeight: 600, background: 'var(--white)', color: 'var(--primary)', padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                            📚 {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Category match breakdown */}
          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 14 }}>
              Match by Category
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categoryStats.map(cat => (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)' }}>{cat.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, background: cat.bg, color: cat.color, padding: '1px 6px', borderRadius: 100 }}>
                        {cat.totalGigs} GIGs
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: cat.match >= 70 ? '#065F46' : cat.match >= 50 ? '#92400E' : '#991B1B' }}>
                      {cat.match}%
                    </span>
                  </div>
                  <div style={{ background: '#F3F4F6', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 100, width: `${cat.match}%`, background: cat.color, transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths card */}
          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 4 }}>
              Your Strengths in Demand
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>Skills where you already meet or exceed market need</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {strengths.map(s => (
                <div key={s.skill} style={{ background: '#F0FDF4', borderRadius: 8, padding: '9px 12px', border: '1px solid #BBF7D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 2 }}>✓ {s.skill}</div>
                    <div style={{ fontSize: 11, color: '#065F46', opacity: 0.75 }}>
                      Your {s.yours}% vs demand {s.demand}% · {s.gigs} GIGs
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 100 }}>
                    {s.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
