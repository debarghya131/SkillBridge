import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { fetchStudentActivityHeatmap, getStudentSessionToken } from '../studentApi'
import { loadStudentSectionCache, readStudentSectionCache } from '../sectionCache'

const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
const mondayOffset = (year, month, day = 1) => (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7
const monthCells = (year, month) => [
  ...Array.from({ length: mondayOffset(year, month) }, () => null),
  ...Array.from({ length: daysInMonth(year, month) }, (_, index) => dateKey(year, month, index + 1)),
]

export function indiaToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]))
  return { year: parts.year, month: parts.month - 1, day: parts.day, key: dateKey(parts.year, parts.month - 1, parts.day) }
}

export default function ProfileActivityHeatmap({ activityDays = [] }) {
  const today = useMemo(() => indiaToday(), [])
  const [token] = useState(getStudentSessionToken)
  const [view, setView] = useState('month')
  const [period, setPeriod] = useState({ year: today.year, month: today.month })
  const cacheSection = `profile-activity:${view}:${period.year}:${view === 'month' ? period.month + 1 : 'year'}`
  const [remoteHeatmap, setRemoteHeatmap] = useState(() => readStudentSectionCache(cacheSection, token))
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  const visibleActivity = remoteHeatmap?.days || activityDays
  const counts = useMemo(() => new Map(visibleActivity.map(item => [item.date, Math.max(0, Number(item.count) || 0)])), [visibleActivity])
  const cells = useMemo(() => {
    if (view === 'month') return monthCells(period.year, period.month)
    return Array.from({ length: 12 }, (_, month) => monthCells(period.year, month).filter(Boolean)).flat()
  }, [period, view])
  const visibleDates = cells.filter(Boolean)
  const activeDays = visibleDates.filter(key => (counts.get(key) || 0) > 0).length
  const approvedCount = visibleDates.reduce((total, key) => total + (counts.get(key) || 0), 0)
  const periodLabel = view === 'month'
    ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(period.year, period.month, 1)))
    : String(period.year)
  const atLatest = view === 'month' ? period.year === today.year && period.month === today.month : period.year === today.year

  useEffect(() => {
    let cancelled = false
    const section = `profile-activity:${view}:${period.year}:${view === 'month' ? period.month + 1 : 'year'}`
    const cached = readStudentSectionCache(section, token)
    if (cached && retry === 0) {
      setRemoteHeatmap(cached)
      setLoading(false)
      setLoadError('')
      return () => { cancelled = true }
    }
    setLoading(true)
    setLoadError('')
    setRemoteHeatmap(null)
    loadStudentSectionCache(section, token, () => fetchStudentActivityHeatmap(token, { view, year: period.year, month: period.month + 1 }).then(result => result.heatmap))
      .then(heatmap => { if (!cancelled) setRemoteHeatmap(heatmap) })
      .catch(error => { if (!cancelled) { setRemoteHeatmap(null); setLoadError(error.message || 'Could not load activity') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period.month, period.year, retry, token, view])

  function changePeriod(direction) {
    setPeriod(current => view === 'month'
      ? (() => { const date = new Date(Date.UTC(current.year, current.month + direction, 1)); return { year: date.getUTCFullYear(), month: date.getUTCMonth() } })()
      : { ...current, year: current.year + direction })
  }

  function changeView(next) {
    setView(next)
    setPeriod({ year: today.year, month: today.month })
  }

  function renderCell(key, index, showDay = false, style) {
    if (!key) return <span className="is-empty" aria-hidden="true" key={`empty-${index}`}/>
    const count = counts.get(key) || 0
    const future = key > today.key
    const level = future ? 0 : Math.min(4, count)
    const label = `${new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })}: ${count} approved ${count === 1 ? 'activity' : 'activities'}`
    return <span key={key} className={future ? 'is-future' : ''} data-level={level} title={label} aria-label={label} style={style}>{showDay ? Number(key.slice(-2)) : ''}</span>
  }

  return <section className="profile-activity" aria-labelledby="profile-activity-title">
    <header><div><span>Approved activity</span><h3 id="profile-activity-title">Contribution heatmap</h3></div><div className="profile-activity-modes" role="group" aria-label="Heatmap period"><button type="button" aria-pressed={view === 'month'} onClick={() => changeView('month')}>Monthly</button><button type="button" aria-pressed={view === 'year'} onClick={() => changeView('year')}>Yearly</button></div></header>
    <div className="profile-activity-period"><button type="button" title={`Previous ${view}`} aria-label={`Previous ${view}`} onClick={() => changePeriod(-1)}><ChevronLeft size={16}/></button><strong>{periodLabel}</strong><button type="button" title={`Next ${view}`} aria-label={`Next ${view}`} disabled={atLatest} onClick={() => changePeriod(1)}><ChevronRight size={16}/></button></div>
    <div className="profile-heatmap-scroll">
      {view === 'month' && <div className="profile-heatmap-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>}
      {view === 'month' && <div className="profile-heatmap-grid is-month">{cells.map((key, index) => renderCell(key, index, true))}</div>}
      {view === 'year' && <>
        <div className="profile-heatmap-months">{Array.from({ length: 12 }, (_, month) => {
          const dayIndex = (Date.UTC(period.year, month, 1) - Date.UTC(period.year, 0, 1)) / 86400000
          const column = Math.floor((mondayOffset(period.year, 0) + dayIndex) / 7) + 1
          return <span key={month} style={{ gridColumn: column }}>{new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(period.year, month, 1)))}</span>
        })}</div>
        <div className="profile-heatmap-grid is-year">{cells.map((key, index) => {
          const position = mondayOffset(period.year, 0) + index
          return renderCell(key, index, false, { gridColumn: Math.floor(position / 7) + 1, gridRow: (position % 7) + 1 })
        })}</div>
      </>}
    </div>
    <footer><span><strong>{remoteHeatmap?.activeDays ?? activeDays}</strong> active days</span><span><strong>{remoteHeatmap?.totalActivities ?? approvedCount}</strong> approved activities</span>{loading && <span role="status">Loading...</span>}{loadError && <button type="button" className="profile-heatmap-retry" title="Retry activity" aria-label="Retry activity" onClick={() => setRetry(value => value + 1)}><RefreshCw size={13}/></button>}<div className="profile-heatmap-legend"><small>Less</small>{[0,1,2,3,4].map(level => <i key={level} data-level={level}/>)}<small>More</small></div></footer>
  </section>
}
