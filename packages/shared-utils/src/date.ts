/**
 * Check if a person is at least 18 years old from a date-of-birth string (YYYY-MM-DD).
 */
export function isAdult(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
}

/**
 * Format a datetime string or Date to a readable local date.
 * e.g. '2024-04-15' => '15 Apr 2024'
 */
export function formatDate(date: string | Date, locale = 'en-KE'): string {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a datetime string to a readable date + time.
 * e.g. '2024-04-15T14:30:00Z' => '15 Apr 2024, 5:30 PM'
 */
export function formatDateTime(date: string | Date, locale = 'en-KE'): string {
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Return a human-readable relative time string (e.g. '3 days ago', 'in 2 weeks').
 */
export function relativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = then - now;
  const abs = Math.abs(diff);

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (abs < minute) return 'just now';
  const past = diff < 0;
  const label = (n: number, unit: string) =>
    past ? `${n} ${unit}${n > 1 ? 's' : ''} ago` : `in ${n} ${unit}${n > 1 ? 's' : ''}`;

  if (abs < hour) return label(Math.round(abs / minute), 'minute');
  if (abs < day) return label(Math.round(abs / hour), 'hour');
  if (abs < week) return label(Math.round(abs / day), 'day');
  return label(Math.round(abs / week), 'week');
}
