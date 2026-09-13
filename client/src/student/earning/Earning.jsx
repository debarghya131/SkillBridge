import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Download } from 'lucide-react'
import { paymentCsv } from '../../lib/paymentFormatting'
import { clearStudentSessionToken, fetchStudentEarning, getStudentSessionToken } from '../studentApi'
import { readStudentSectionCache, writeStudentSectionCache } from '../sectionCache'
import DashboardSkeleton from '../../ui/DashboardSkeleton'
import './Earning.css'

const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
const METHODS = { bank_transfer: 'Bank transfer', upi: 'UPI', other: 'Other' }

export default function Earning() {
  const navigate = useNavigate()
  const [state, setState] = useState(() => readStudentSectionCache('earning', getStudentSessionToken()))
  const [loading, setLoading] = useState(() => !readStudentSectionCache('earning', getStudentSessionToken()))
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [tab, setTab] = useState('History')
  const [page, setPage] = useState(0)

  function exportRecords() {
    const rows = [['GIG', 'Company', 'Amount INR', 'Method', 'Reference', 'Paid on'],
      ...(state?.transactions || []).map(item => [item.title, item.company, item.amount, item.method, item.reference, item.paidOn])]
    const url = URL.createObjectURL(new Blob([paymentCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'skillbridge-earnings.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let cancelled = false
    setError('')
    async function load() {
      const token = getStudentSessionToken()
      if (!token) { navigate('/student', { replace: true }); return }
      const cached = readStudentSectionCache('earning', token)
      if (cached && refresh === 0) {
        setState(cached)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const result = await fetchStudentEarning(token)
        writeStudentSectionCache('earning', token, result.earningState)
        if (!cancelled) setState(result.earningState)
      } catch (failure) {
        if (cancelled) return
        if (failure.status === 401) {
          clearStudentSessionToken()
          navigate('/student', { replace: true })
        } else setError(failure.message || 'Could not load payment records.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [navigate, refresh])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setRefresh(value => value + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (loading) return <DashboardSkeleton section="earning" />
  if (error) return <div role="alert" className="work-error">{error} <button className="btn-secondary" onClick={() => setRefresh(value => value + 1)}>Retry</button></div>
  if (!state) return null
  const rows = tab === 'History' ? state.transactions : state.pending
  const pages = Math.max(1, Math.ceil(rows.length / 10))
  const currentPage = Math.min(page, pages - 1)
  return <div className="student-external-earnings">
    <header className="work-heading earning-heading"><h2>Earning</h2><div className="earning-header-actions" style={{ display: 'flex', gap: 8 }}><button className="btn-secondary" title="Export earning records" aria-label="Export earning records" disabled={!state.transactions?.length} onClick={exportRecords}><Download size={18}/></button><button className="btn-secondary" title="Refresh payment records" aria-label="Refresh payment records" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={18} /></button></div></header>
    <p className="work-muted">Company-reported external payments. SkillBridge does not hold funds or process withdrawals.</p>
    <div className="external-earning-summary">
      <div><strong>{state.pending.length}</strong><span>Awaiting payment</span></div>
      <div><strong>{state.transactions.length}</strong><span>Recorded payments</span></div>
      <div><strong>{money(state.totalRecorded)}</strong><span>Total recorded</span></div>
    </div>
    <nav className="earning-tabs" aria-label="Earning views">{['History', 'Awaiting payment'].map(name => <button key={name} aria-pressed={tab === name} onClick={() => { setTab(name); setPage(0) }}>{name}</button>)}</nav>
    <div className="external-earning-records">
      {!rows.length ? <p className="work-empty">{tab === 'History' ? 'No external payments recorded yet.' : 'No approved work awaiting payment.'}</p> : <div className="work-table-scroll"><table className="work-table"><thead><tr><th>GIG / company</th><th>Status</th>{tab === 'History' && <><th>Amount</th><th>Reference</th><th>Method</th><th>Paid on</th></>}</tr></thead><tbody>
        {rows.slice(currentPage * 10, currentPage * 10 + 10).map(item => <tr key={item.id}><td className="earning-payment-title" data-label="GIG / company"><strong>{item.title}</strong><span>{item.company}</span></td><td data-label="Status">{tab === 'History' ? 'Company reported' : 'Payment pending'}</td>{tab === 'History' && <><td data-label="Amount">{money(item.amount)}</td><td data-label="Reference">{item.reference || 'Not provided'}</td><td data-label="Method">{METHODS[item.method] || item.method}</td><td data-label="Paid on">{item.paidOn}</td></>}</tr>)}
      </tbody></table></div>}
    </div>
    {pages > 1 && <footer className="earning-pagination"><button className="btn-secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span aria-live="polite">{currentPage + 1} / {pages}</span><button className="btn-secondary" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></footer>}
  </div>
}
