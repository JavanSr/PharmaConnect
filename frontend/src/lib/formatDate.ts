// Formats dates consistently for Tanzania (Africa/Nairobi timezone, EAT UTC+3)

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Africa/Nairobi',
};

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Africa/Nairobi',
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date as DD/MM/YYYY (Tanzania locale, EAT timezone).
 * Returns '' for null, undefined, or invalid dates.
 */
export function formatDate(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return '';
  // Intl.DateTimeFormat with en-GB gives DD/MM/YYYY naturally
  return new Intl.DateTimeFormat('en-GB', DATE_FORMAT).format(d);
}

/**
 * Formats a date as DD/MM/YYYY HH:mm (Tanzania locale, EAT timezone).
 * Returns '' for null, undefined, or invalid dates.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return '';
  // en-GB produces DD/MM/YYYY, HH:mm — strip the comma for cleaner output
  return new Intl.DateTimeFormat('en-GB', DATETIME_FORMAT).format(d).replace(',', '');
}

/**
 * Formats a number as a Tsh currency string: "Tsh 1,500".
 * No decimal places. Returns "Tsh 0" for null, undefined, or 0.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return 'Tsh 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Tsh 0';
  return `Tsh ${Math.round(num).toLocaleString('en-TZ')}`;
}
