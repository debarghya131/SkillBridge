import { useState } from 'react'
import { Clock3, CircleCheck, IndianRupee } from 'lucide-react'
import SectionTabs from './SectionTabs'
import { paymentCsv, paymentDateToday } from '../lib/paymentFormatting'

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0)

export default function PaymentSection({ paymentState, onRecordPayment }) {
  const [form, setForm] = useState({ submissionId: '', amount: '', method: 'bank_transfer', reference: '', paidOn: paymentDateToday(), confirmed: false })
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('Record payment')
  const [error, setError] = useState('')
  const pending = paymentState?.pending || []
  const transactions = paymentState?.transactions || []
  const totalRecorded = transactions.reduce((total, row) => total + Number(row.amount || 0), 0)

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const record = async event => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      await onRecordPayment(form.submissionId, { ...form, amount: Number(form.amount) })
      setForm(current => ({ ...current, submissionId: '', reference: '', amount: '', confirmed: false }))
    } catch (failure) {
      setError(failure.message || 'Could not record payment.')
    } finally {
      setBusy(false)
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
      <header className="payment-header">
        <div>
          <p className="payment-eyebrow">External payment ledger</p>
          <h2>Payment</h2>
          <p className="work-muted">Record payments your company has already sent to selected students.</p>
        </div>
        <button className="btn-secondary payment-export" disabled={!transactions.length} onClick={exportRecords} title="Export payment records">
          <span aria-hidden="true">↓</span> Export CSV
        </button>
      </header>

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
            {transactions.map(row => <tr key={row.id}><td><strong>{row.title}</strong><br /><span className="work-muted">{row.studentName}</span></td><td>{money(row.amount)}</td><td>{row.reference}</td><td>{row.paidOn}</td><td><span className="payment-recorded-badge">Recorded</span></td></tr>)}
          </tbody></table></div>
        ) : (
          <div className="payment-history-empty"><span aria-hidden="true">▤</span><p>No payment records yet.</p></div>
        )}
      </section>
    </section>
  )
}
