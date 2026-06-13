/**
 * OrbiSave Centralized Formatters
 * Standardizes currency, dates, and phone numbers across the platform.
 */

export const formatCurrency = (amount: number | string, currency: string = "KES") => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatPhone = (phone: string) => {
  if (!phone) return "—";
  // Simple Kenyan format normalization for display
  return phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
};

// Compatibility export for old 'fmt' usage
export const fmt = (n: number) => formatCurrency(n);
