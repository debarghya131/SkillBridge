import { useEffect, useState } from 'react'
import { buildDefaultCompanyPaymentState, mergeCompanyPaymentState } from './companyPaymentDemoData'
import { toast } from '../ui/toast'

function formatDateLabel(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function parseRupee(value) {
  const numeric = Number(String(value || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

function formatRupee(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`
}

export default function PaymentSection({ paymentState, onSaveState, onAddFunds, onSetupPayouts }) {
  const [localState, setLocalState] = useState(() => mergeCompanyPaymentState(paymentState || buildDefaultCompanyPaymentState()))
  const [busyAction, setBusyAction] = useState('')

  useEffect(() => {
    setLocalState(mergeCompanyPaymentState(paymentState || buildDefaultCompanyPaymentState()))
  }, [paymentState])

  const updatePaymentState = (updater) => {
    setLocalState(current => {
      const nextState = typeof updater === 'function' ? updater(current) : updater
      const mergedState = mergeCompanyPaymentState(nextState)
      onSaveState(mergedState)
      return mergedState
    })
  }

  const handleAddFunds = async () => {
    if (busyAction) return
    const input = window.prompt('Enter amount to add to the wallet', '10000')
    if (input === null || !input.trim()) return

    const amount = Math.round(parseRupee(input))
    if (amount < 100 || amount > 1000000) {
      toast.error('Enter an amount between ₹100 and ₹10,00,000.', { title: 'Invalid Amount' })
      return
    }

    setBusyAction('funds')
    try {
      if (onAddFunds) {
        await onAddFunds(amount)
      } else {
        updatePaymentState(current => {
          const nextSummary = current.summary.map(item => item.label === 'Available Balance'
            ? { ...item, value: formatRupee(parseRupee(item.value) + amount) }
            : item)

          return {
            ...current,
            summary: nextSummary,
            transactions: [
              {
                id: `payment-${Date.now()}`,
                title: 'Wallet top-up',
                amount: `+${formatRupee(amount)}`,
                date: formatDateLabel(),
                status: 'Added',
                color: '#065F46',
                bg: '#D1FAE5',
              },
              ...current.transactions,
            ].slice(0, 20),
          }
        })
        toast.success(`${formatRupee(amount)} added to the company wallet.`, { title: 'Funds Added' })
      }
    } catch (error) {
      toast.error(error.message || 'Funds could not be added.', { title: 'Payment Failed' })
    } finally {
      setBusyAction('')
    }
  }

  const handleSetupPayouts = async () => {
    if (busyAction) return
    setBusyAction('payouts')
    try {
      if (onSetupPayouts) {
        await onSetupPayouts()
      } else {
        updatePaymentState(current => ({
          ...current,
          methods: current.methods.map(method => ({
            ...method,
            status: method.label === 'Primary Bank Account' ? 'Verified' : 'Active',
          })),
          transactions: [
            {
              id: `payment-${Date.now()}`,
              title: 'Payout setup review',
              amount: 'Updated',
              date: formatDateLabel(),
              status: 'Ready',
              color: '#1D4ED8',
              bg: '#DBEAFE',
            },
            ...current.transactions,
          ].slice(0, 20),
        }))
        toast.info('Payout methods refreshed and verified.', { title: 'Payout Setup Updated' })
      }
    } catch (error) {
      toast.error(error.message || 'Payout setup could not be saved.', { title: 'Payout Setup Failed' })
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div>
      <div className="responsive-hero" style={{
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FFEDD5 100%)',
        borderRadius: 16,
        borderLeft: '5px solid #F59E0B',
        boxShadow: '0 8px 24px rgba(245,158,11,0.08)',
        padding: '24px 28px',
        border: '1px solid #FDE68A',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 9 }}>
            <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'rgba(245,158,11,0.16)', fontSize: 14 }}>💳</span>
            Payment Center
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>
            Manage company wallet, payouts, and payment methods
          </div>
          <div style={{ fontSize: 13, color: '#9A3412', maxWidth: 700, lineHeight: 1.6 }}>
            Track escrow amounts for active GIGs, review payout history, and keep your business payment setup ready for smooth student payments.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start', flexWrap: 'wrap' }}>
          <button className="btn-accent" onClick={handleAddFunds} disabled={Boolean(busyAction)} style={{ padding: '10px 18px', fontSize: 13 }}>
            {busyAction === 'funds' ? 'Saving...' : '+ Add Funds'}
          </button>
          <button onClick={handleSetupPayouts} disabled={Boolean(busyAction)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {busyAction === 'payouts' ? 'Saving...' : 'Setup Payouts'}
          </button>
        </div>
      </div>

      <div className="responsive-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {localState.summary.map(item => (
          <div key={item.label} style={{ background: 'var(--white)', borderRadius: 12, padding: '17px 18px 15px', border: '1px solid var(--border)', borderTop: `3px solid ${item.color}`, boxShadow: '0 2px 8px rgba(15,23,42,0.03)' }}>
            <div style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: item.bg, borderRadius: 9, fontSize: 18, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>{item.label}</div>
            <span style={{ fontSize: 11, fontWeight: 700, background: item.bg, color: item.color, padding: '4px 10px', borderRadius: 100 }}>
              Live overview
            </span>
          </div>
        ))}
      </div>

      <div className="responsive-split-two" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Recent Transactions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {localState.transactions.map(item => (
              <div key={`${item.id || item.title}-${item.date}`} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', borderLeft: '3px solid #FBBF24', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>{item.amount}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: item.bg, color: item.color, padding: '4px 9px', borderRadius: 100 }}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Payment Methods</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {localState.methods.map(item => (
                <div key={item.label} style={{ background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{item.value}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '4px 9px', borderRadius: 100 }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px', boxShadow: '0 3px 12px rgba(15,23,42,0.03)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', marginBottom: 14 }}>Recommended Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {localState.recommendedActions.map(item => (
                <div key={item} style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#9A3412', lineHeight: 1.55 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
