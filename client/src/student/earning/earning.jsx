import { useEffect, useRef, useState } from 'react'
import { clearStudentSessionToken, fetchStudentEarning, getStudentSessionToken, requestStudentWithdrawal, saveStudentEarning } from '../studentApi'
import { buildDemoEarningState } from './earningDemoData'
import { toast } from '../../ui/toast'

export default function Earning() {
  const sessionTokenRef = useRef(getStudentSessionToken())
  const didHydrateRef = useRef(false)
  const [earningState, setEarningState] = useState(() => buildDemoEarningState())
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadEarningState() {
      if (!sessionTokenRef.current) {
        didHydrateRef.current = true
        return
      }

      try {
        const result = await fetchStudentEarning(sessionTokenRef.current)

        if (!cancelled && result.earningState) {
          setEarningState(result.earningState)
        }
      } catch (error) {
        if (!cancelled) {
          clearStudentSessionToken()
          sessionTokenRef.current = ''
          setEarningState(buildDemoEarningState())
        }
      } finally {
        if (!cancelled) {
          didHydrateRef.current = true
        }
      }
    }

    loadEarningState()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sessionTokenRef.current || !didHydrateRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveStudentEarning(sessionTokenRef.current, { earningState }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [earningState])

  const walletStats = earningState.walletStats
  const paymentHistory = earningState.paymentHistory
  const withdrawAmount = earningState.withdrawAmount
  const selectedUpi = earningState.selectedUpi
  const upiAccounts = earningState.upiAccounts
  const availableNow = earningState.availableNow

  const panelStyle = {
    background: 'var(--white)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: '18px 16px',
    height: 'calc(100vh - 250px)',
    minHeight: 420,
    overflowY: 'auto',
    scrollbarWidth: 'thin',
  }

  const requestWithdraw = async () => {
    if (!withdrawAmount) {
      toast.warning('Enter a withdrawal amount first.', { title: 'Withdrawal Needed' })
      return
    }

    if (sessionTokenRef.current) {
      setIsWithdrawing(true)
      try {
        const result = await requestStudentWithdrawal(sessionTokenRef.current, {
          amount: withdrawAmount,
          upi: selectedUpi,
        })
        setEarningState(result.earningState)
        toast.success('Withdrawal request created.', { title: 'UPI Payout Requested' })
      } catch (error) {
        toast.error(error.message || 'The withdrawal request could not be created.', { title: 'Withdrawal Failed' })
      } finally {
        setIsWithdrawing(false)
      }
      return
    }

    setEarningState(current => ({
      ...current,
      paymentHistory: [
        {
          id: Date.now(),
          title: 'UPI withdrawal request',
          company: selectedUpi,
          amount: `-Rs ${withdrawAmount}`,
          date: 'Just now',
          status: 'Processing',
        },
        ...current.paymentHistory,
      ],
      withdrawAmount: '',
    }))

    toast.success('Withdrawal request created.', { title: 'UPI Payout Requested' })
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--dark), #1E1B4B)',
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 16,
        color: 'white',
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          Earnings
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Track your wallet, payouts, and withdrawals</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)' }}>Monitor incoming payments, review transaction history, and withdraw your balance directly to UPI.</div>
      </div>

      <div className="responsive-earning-grid" style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.2fr 0.9fr', gap: 14 }}>
        <div className="responsive-scroll-panel" style={panelStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>
            Wallet Balance
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #EEF2FF, #E0F2FE)',
            borderRadius: 16,
            padding: '18px 18px',
            border: '1px solid #C7D2FE',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Available Now
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--dark)', lineHeight: 1, marginBottom: 10 }}>{availableNow}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ready to withdraw to your linked UPI account.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {walletStats.map(item => (
              <div key={item.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: item.tone }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="responsive-scroll-panel" style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              Payment History
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 9px', borderRadius: 100 }}>
              {paymentHistory.length} entries
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paymentHistory.map(item => (
              <div key={item.id} style={{ background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.company}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.amount.startsWith('+') ? '#10B981' : '#EA580C' }}>{item.amount}</div>
                    <span style={{
                      display: 'inline-flex',
                      marginTop: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 100,
                      background: item.status === 'Credited' ? '#D1FAE5' : '#FEF3C7',
                      color: item.status === 'Credited' ? '#065F46' : '#92400E',
                    }}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="responsive-scroll-panel" style={panelStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 10 }}>
            Withdraw (UPI)
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Available to withdraw</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--dark)', lineHeight: 1 }}>{availableNow}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Choose UPI ID</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upiAccounts.map(account => (
                  <label key={account.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="upi"
                      checked={selectedUpi === account.value}
                      onChange={() => setEarningState(current => ({ ...current, selectedUpi: account.value }))}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{account.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{account.value}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Enter amount</div>
              <input
                value={withdrawAmount}
                onChange={e => setEarningState(current => ({ ...current, withdrawAmount: e.target.value }))}
                placeholder="Enter amount"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={requestWithdraw}
              disabled={isWithdrawing}
              style={{ justifyContent: 'center', padding: '10px 14px', fontSize: 13, opacity: isWithdrawing ? 0.65 : 1 }}
            >
              {isWithdrawing ? 'Processing...' : 'Withdraw to UPI'}
            </button>

            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#9A3412', lineHeight: 1.6 }}>
              Minimum withdrawal is Rs 100. Processing payouts may take up to 24 hours after request confirmation.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
