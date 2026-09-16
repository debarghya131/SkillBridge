import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { subscribeToToasts } from './toast'

const TONE_MAP = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribeToToasts(toast => {
      setToasts(current => [...current, toast])

      window.setTimeout(() => {
        setToasts(current => current.filter(item => item.id !== toast.id))
      }, toast.duration)
    })
  }, [])

  const dismissToast = toastId => {
    setToasts(current => current.filter(item => item.id !== toastId))
  }

  return (
    <div className="app-toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map(item => {
        const type = TONE_MAP[item.type] ? item.type : 'info'
        const Icon = TONE_MAP[type]

        return (
          <div
            key={item.id}
            className={`app-toast app-toast--${type}`}
            role={type === 'error' ? 'alert' : 'status'}
          >
            <div className="app-toast__icon" aria-hidden="true">
              <Icon size={19} strokeWidth={2.4} />
            </div>

            <div className="app-toast__content">
              {item.title ? (
                <div className="app-toast__title">{item.title}</div>
              ) : null}
              <div className="app-toast__message">{item.message}</div>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Dismiss notification"
              className="app-toast__dismiss"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
            <span className="app-toast__progress" style={{ animationDuration: `${item.duration}ms` }} />
          </div>
        )
      })}
    </div>
  )
}
