export function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) return ''
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export function safeVideoUrl(value) {
  const externalUrl = safeExternalUrl(value)
  if (externalUrl) return externalUrl
  if (typeof value !== 'string' || value.length > 7_000_000) return ''
  return /^data:video\/(mp4|webm);base64,[A-Za-z0-9+/]+={0,2}$/i.test(value) ? value : ''
}
