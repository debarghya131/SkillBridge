import { useRef, useState } from 'react'
import { Clock3, CircleCheck, IndianRupee, RefreshCw, Download } from 'lucide-react'
import SectionTabs from './SectionTabs'
import { paymentCsv, paymentDateToday } from '../lib/paymentFormatting'

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0)

export default function PaymentSection({ paymentState, onRecordPayment, onRefresh }) {
  const [form, setForm] = useState({ submissionId: '', amount: '', method: 'bank_transfer', reference: '', paidOn: paymentDateToday(), confirmed: false })
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('Record payment')
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const recording = useRef(false)
  const pending = paymentState?.pending || []
  const transactions = paymentState?.transactions || []
  const demoPending = paymentState?.demoPending || []
  const demoTransactions = paymentState?.demoTransactions || []
  const totalRecorded = transactions.reduce((total, row) => total + Math.round(Number(row.amount || 0) * 100), 0) / 100
  const pages = Math.max(1, Math.ceil(transactions.length / 10))
  const currentPage = Math.min(page, pages - 1)

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const record = async event => {
    event.preventDefault()
    if (recording.current) return
    if (!pending.some(item => item.id === form.submissionId)) {
      setError('Choose work that is still awaiting payment.')
      return
    }
    recording.current = true
    setBusy(true)
    setError('')

    try {
      await onRecordPayment(form.submissionId, { ...form, amount: Number(form.amount) })
      setForm({ submissionId: '', reference: '', amount: '', method: 'bank_transfer', paidOn: paymentDateToday(), confirmed: false })
      setPage(0)
      setView('History')
    } catch (failure) {
      setError(failure.message || 'Could not record payment.')
    } finally {
      setBusy(false)
      recording.current = false
    }
  }

  const exportRecords = () => {
    const rows = [['GIG', 'Student', 'Amount INR', 'Method', 'Reference', 'Paid on'], ...transactions.map(row => [row.title, row.studentName, row.amount, row.method, row.reference, row.paidOn])]
    const csv = paymentCsv(rows)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'skillbridge-external-payments.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="company-work-section payment-section">
      <header className="payment-header payment-compact-header">
        <div>
          <p className="payment-eyebrow">External payment ledger</p>
          <h2>Payment</h2>
          <p className="work-muted">Record payments your company has already sent to selected students.</p>
        </div>
      <div className="payment-summary" aria-label="Payment summary">
        <div className="payment-stat">
          <span className="payment-stat-icon payment-stat-pending" aria-hidden="true"><Clock3 /></span>
          <div><strong>{pending.length}</strong><span>Awaiting payment</span></div>
        </div>
        <div className="payment-stat">
          <span className="payment-stat-icon payment-stat-recorded" aria-hidden="true"><CircleCheck /></span>
          <div><strong>{transactions.length}</strong><span>Payments recorded</span></div>
        </div>
        <div className="payment-stat">
          <span className="payment-stat-icon payment-stat-total" aria-hidden="true"><IndianRupee /></span>
          <div><strong>{money(totalRecorded)}</strong><span>Total recorded</span></div>
        </div>
      </div>

        <div className="payment-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onRefresh && <button className="btn-secondary" disabled={busy} onClick={onRefresh} title="Refresh payment records" aria-label="Refresh payment records"><RefreshCw size={16}/></button>}
          <button className="btn-secondary payment-export" disabled={!transactions.length} onClick={exportRecords} title="Export payment records"><Download size={16}/> Export CSV</button>
        </div>
      </header>

      <SectionTabs label="Payment views" options={['Record payment', 'History']} value={view} onChange={setView} />
      <section hidden={view !== 'Record payment'} className="payment-panel">
        <div className="payment-panel-heading">
          <div>
            <h3>Record external payment</h3>
            <p className="work-muted">Only approved GIG work can be recorded here.</p>
          </div>
          <span className="payment-count">{pending.length} pending</span>
        </div>

        {pending.length ? (
          <form className="work-form payment-form" onSubmit={record}>
            <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <label>Approved GIG
              <select required value={form.submissionId} onChange={event => change('submissionId', event.target.value)}>
                <option value="">Select approved work</option>
                {pending.map(item => <option key={item.id} value={item.id}>{item.title} / {item.studentName} / {item.budget}</option>)}
              </select>
            </label>
            <div className="work-form-grid">
              <label>Amount (INR)<input type="number" min="1" max="10000000" step="0.01" required value={form.amount} onChange={event => change('amount', event.target.value)} /></label>
              <label>Payment method<select value={form.method} onChange={event => change('method', event.target.value)}><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="other">Other</option></select></label>
              <label>Transaction reference<input required minLength="4" maxLength="120" value={form.reference} onChange={event => change('reference', event.target.value)} /></label>
              <label>Payment date<input type="date" required max={paymentDateToday()} value={form.paidOn} onChange={event => change('paidOn', event.target.value)} /></label>
            </div>
            <label className="work-check"><input type="checkbox" required checked={form.confirmed} onChange={event => change('confirmed', event.target.checked)} />I confirm this payment has already been sent to the student.</label>
            {error && <p role="alert" className="work-error">{error}</p>}
            <div className="payment-form-actions"><button className="btn-primary" disabled={busy}>{busy ? 'Recording...' : 'Record payment'}</button></div>
            </fieldset>
          </form>
        ) : (
          <div className="payment-empty-state">
            <span className="payment-empty-icon" aria-hidden="true">✓</span>
            <div>
              <strong>No approved GIG work awaiting payment</strong>
              <p>Payments appear here after a student delivers work and your company approves it.</p>
            </div>
          </div>
        )}
        {demoPending.length > 0 && <section className="payment-demo-preview" aria-label="Demo pending payments" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div className="payment-panel-heading"><div><span className="demo-data-badge">Read-only demo</span><h3 style={{ marginTop: 7 }}>Approved work awaiting payment</h3><p className="work-muted">These examples show what appears here after work is approved. Real payment records remain separate.</p></div><span className="payment-count">{demoPending.length} examples</span></div>
          <div className="work-table-scroll"><table className="work-table"><thead><tr><th>GIG / student</th><th>Budget</th><th>Approved</th><th>State</th></tr></thead><tbody>
            {demoPending.map(row => <tr key={row.id}><td data-label="GIG / student"><strong>{row.title}</strong><br /><span className="work-muted">{row.studentName}</span></td><td data-label="Budget">{row.budget}</td><td data-label="Approved">{row.approvedAt}</td><td data-label="State"><span className="payment-count">Awaiting payment</span></td></tr>)}
          </tbody></table></div>
        </section>}
      </section>

      <section hidden={view !== 'History'} className="payment-panel payment-history-panel">
        <div className="payment-panel-heading">
          <div>
            <h3>Payment history</h3>
            <p className="work-muted">Company-reported records only.</p>
          </div>
          <span className="payment-count">{transactions.length} records</span>
        </div>

        {transactions.length ? (
          <div className="work-table-scroll"><table className="work-table"><thead><tr><th>GIG / student</th><th>Amount</th><th>Reference</th><th>Paid on</th><th>Record</th></tr></thead><tbody>
            {transactions.slice(currentPage * 10, currentPage * 10 + 10).map(row => <tr key={row.id}><td data-label="GIG / student" className="payment-history-title"><strong>{row.title}</strong><br /><span className="work-muted">{row.studentName}</span></td><td data-label="Amount">{money(row.amount)}</td><td data-label="Reference">{row.reference}</td><td data-label="Paid on">{row.paidOn}</td><td data-label="Record"><span className="payment-recorded-badge">Recorded</span></td></tr>)}
          </tbody></table></div>
        ) : (
          <div className="payment-history-empty"><span aria-hidden="true">▤</span><p>No real payment records yet.</p></div>
        )}
        {demoTransactions.length > 0 && <section className="payment-demo-preview" aria-label="Demo payment history" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div className="payment-panel-heading"><div><span className="demo-data-badge">Read-only demo</span><h3 style={{ marginTop: 7 }}>Example payment history</h3><p className="work-muted">Company-reported payment examples. They are excluded from live totals and CSV exports.</p></div><span className="payment-count">{demoTransactions.length} examples</span></div>
          <div className="work-table-scroll"><table className="work-table"><thead><tr><th>GIG / student</th><th>Amount</th><th>Reference</th><th>Paid on</th><th>Record</th></tr></thead><tbody>
            {demoTransactions.map(row => <tr key={row.id}><td data-label="GIG / student" className="payment-history-title"><strong>{row.title}</strong><br /><span className="work-muted">{row.studentName}</span></td><td data-label="Amount">{money(row.amount)}</td><td data-label="Reference">{row.reference}</td><td data-label="Paid on">{row.paidOn}</td><td data-label="Record"><span className="payment-recorded-badge is-demo">Demo recorded</span></td></tr>)}
          </tbody></table></div>
        </section>}
        {transactions.length > 10 && <nav className="payment-history-pagination" aria-label="Payment history pages" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', padding: 12 }}>
          <button className="btn-secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage + 1} / {pages}</span><button className="btn-secondary" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button>
        </nav>}
      </section>
    </section>
  )
}
