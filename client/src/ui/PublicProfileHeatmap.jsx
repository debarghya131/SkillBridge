import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY = 86400000
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dateKey = date => date.toISOString().slice(0, 10)

export default function PublicProfileHeatmap({ activityDays = [] }) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = type => parts.find(item => item.type === type).value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const [view, setView] = useState('month')
  const [period, setPeriod] = useState(() => today.slice(0, 7))
  const year = Number(period.slice(0, 4)), month = Number(period.slice(5)) - 1
  const start = Date.UTC(year, view === 'year' ? 0 : month, 1)
  const end = Date.UTC(year, view === 'year' ? 12 : month + 1, 1)
  const offset = (new Date(start).getUTCDay() + 6) % 7
  const cells = Array.from({ length: (end - start) / DAY }, (_, index) => dateKey(new Date(start + index * DAY)))
  const counts = new Map(activityDays.map(item => [item.date, Math.max(0, Number(item.count) || 0)]))
  const activeDays = cells.filter(key => key <= today && counts.get(key) > 0).length
  const total = cells.reduce((sum, key) => sum + (key <= today ? counts.get(key) || 0 : 0), 0)
  const columns = Math.ceil((offset + cells.length) / 7)
  const latest = view === 'year' ? year >= Number(part('year')) : period >= today.slice(0, 7)
  const earliest = year <= 2020 && (view === 'year' || month === 0)

  function shift(direction) {
    const next = dateKey(new Date(Date.UTC(year + (view === 'year' ? direction : 0), month + (view === 'month' ? direction : 0), 1))).slice(0, 7)
    setPeriod(next > today.slice(0, 7) ? today.slice(0, 7) : next)
  }

  function cell(key, index) {
    const count = key > today ? 0 : counts.get(key) || 0
    const label = `${key}: ${count} approved ${count === 1 ? 'activity' : 'activities'}`
    const position = offset + index
    return <span key={key} data-date={key} data-level={Math.min(4, count)} data-future={key > today}
      title={label} aria-label={label}
      style={view === 'year' ? { gridColumn: Math.floor(position / 7) + 1, gridRow: position % 7 + 1 } : undefined}>
      {view === 'month' ? Number(key.slice(-2)) : ''}
    </span>
  }

  return <section className="public-profile-heatmap">
    <div className="public-profile-section-heading"><h3>Contribution heatmap</h3><div className="public-profile-filters" role="group" aria-label="Heatmap period">
      {['month', 'year'].map(mode => <button key={mode} aria-pressed={view === mode} onClick={() => setView(mode)}>{mode === 'month' ? 'Monthly' : 'Yearly'}</button>)}
    </div></div>
    <div className="public-profile-calendar-nav">
      <button aria-label={`Previous ${view}`} title={`Previous ${view}`} disabled={earliest} onClick={() => shift(-1)}><ChevronLeft size={16}/></button>
      <strong>{view === 'year' ? year : new Date(start).toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
      <button aria-label={`Next ${view}`} title={`Next ${view}`} disabled={latest} onClick={() => shift(1)}><ChevronRight size={16}/></button>
    </div>
    {view === 'month' ? <div className="public-profile-calendar">
      {weekdays.map(day => <small key={day}>{day}</small>)}
      {Array.from({ length: offset }, (_, index) => <i key={index} aria-hidden="true"/>)}
      {cells.map(cell)}
    </div> : <div className="public-profile-year-scroll" role="region" aria-label={`${year} approved activity`} tabIndex={0}>
      <div className="public-profile-year" style={{ '--weeks': columns }}>
        <div className="public-profile-year-months">{Array.from({ length: 12 }, (_, index) => <small key={index} style={{ gridColumn: Math.floor((offset + (Date.UTC(year, index, 1) - start) / DAY) / 7) + 1 }}>
          {new Date(Date.UTC(year, index, 1)).toLocaleDateString('en', { month: 'short', timeZone: 'UTC' })}
        </small>)}</div>
        <div className="public-profile-year-weekdays">{weekdays.map(day => <small key={day}>{day}</small>)}</div>
        <div className="public-profile-year-cells">{cells.map(cell)}</div>
      </div>
    </div>}
    <div className="public-profile-heatmap-summary"><span><strong>{activeDays}</strong> active days</span><span><strong>{total}</strong> approved activities</span>
      <div className="public-profile-heatmap-legend"><small>Less</small>{[0, 1, 2, 3, 4].map(level => <i key={level} data-level={level}/>)}<small>More</small></div>
    </div>
  </section>
}
