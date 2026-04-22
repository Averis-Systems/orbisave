import type { Country } from '@orbisave/shared-types';
import { CURRENCY_SYMBOLS } from '@orbisave/shared-types';

/**
 * Format a numeric amount into a human-readable currency string for the given country.
 * Example: formatCurrency(284500, 'kenya') => 'KSh 284,500.00'
 */
export function formatCurrency(amount: number, country: Country): string {
  const symbol = CURRENCY_SYMBOLS[country];
  const localeMap: Record<Country, string> = {
    kenya: 'en-KE',
    rwanda: 'en-RW',
    ghana: 'en-GH',
  };
  const formatted = amount.toLocaleString(localeMap[country], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

/**
 * Format a number as a compact value (e.g., 1200000 => '1.2M')
 */
export function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
}

/**
 * Calculate service fee for a payout.
 * Kenya: 3%, Rwanda: 2.5%, Ghana: 2.5%
 */
export function calculateServiceFee(amount: number, country: Country): number {
  const rates: Record<Country, number> = {
    kenya: 0.03,
    rwanda: 0.025,
    ghana: 0.025,
  };
  return Math.round(amount * rates[country] * 100) / 100;
}

/**
 * Calculate net payout after service fee.
 */
export function calculateNetPayout(
  grossAmount: number,
  country: Country,
): { gross: number; fee: number; net: number } {
  const fee = calculateServiceFee(grossAmount, country);
  return { gross: grossAmount, fee, net: grossAmount - fee };
}
