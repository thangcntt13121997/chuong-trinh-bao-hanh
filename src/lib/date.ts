export function addMonths(dateText: string, months: number) {
  const [y, m, d] = dateText.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return target.toISOString().slice(0, 10)
}

export function warrantyState(expiry: string) {
  const today = new Date()
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = expiry.split('-').map(Number)
  const expiryUtc = Date.UTC(y, m - 1, d)
  const days = Math.ceil((expiryUtc - utcToday) / 86400000)
  if (days < 0) return { label: 'Hết bảo hành', className: 'danger', days }
  if (days <= 30) return { label: `Sắp hết (${days} ngày)`, className: 'warn', days }
  return { label: `Còn bảo hành (${days} ngày)`, className: 'success', days }
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}
