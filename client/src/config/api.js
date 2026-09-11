const defaultApiUrl = import.meta.env.DEV
  ? ''
  : 'https://skill-bridge-backend-irq4.onrender.com'

export const API_BASE_URL = (import.meta.env.VITE_API_URL?.trim() || defaultApiUrl)
  .replace(/\/+$/, '')
