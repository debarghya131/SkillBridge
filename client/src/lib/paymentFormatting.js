export function paymentDateToday(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function paymentCsv(rows) {
  return rows.map(row => row.map(value => {
    const text = String(value ?? '')
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text
    return '"' + safe.replaceAll('"', '""') + '"'
  }).join(',')).join('\r\n')
}
