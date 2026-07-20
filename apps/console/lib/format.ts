/**
 * Formatting helpers for Console.
 *
 * Currency is per country, not per platform. Kenya, Rwanda and Ghana use three
 * different currencies, so a single "total contributions" figure summed across
 * them is a meaningless number. Console therefore only ever renders money
 * alongside the country it belongs to.
 */

export const COUNTRY_CURRENCY: Record<string, string> = {
  kenya: 'KES',
  rwanda: 'RWF',
  ghana: 'GHS',
}

export const COUNTRY_LABEL: Record<string, string> = {
  kenya: 'Kenya',
  rwanda: 'Rwanda',
  ghana: 'Ghana',
}

export function countryLabel(country: string) {
  return COUNTRY_LABEL[country?.toLowerCase()] || country
}

export function formatMoney(amount: number, country: string) {
  const code = COUNTRY_CURRENCY[country?.toLowerCase()] || ''
  const value = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(amount || 0)
  return code ? `${code} ${value}` : value
}

export function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat('en-KE').format(value || 0)
}

export function formatDateTime(value: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
