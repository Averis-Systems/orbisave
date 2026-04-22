/**
 * Validate an international phone number.
 * Must start with + and country code, followed by 6-14 digits.
 */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Validate an email address.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Normalize a phone number: strip spaces and dashes.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

/**
 * Generate a platform reference for a contribution (idempotency key).
 * Format: ORBISAVE-{groupId[:8]}-{userId[:8]}-{timestamp}
 */
export function generatePlatformReference(groupId: string, userId: string): string {
  const ts = Date.now();
  return `ORBISAVE-${groupId.slice(0, 8)}-${userId.slice(0, 8)}-${ts}`;
}
