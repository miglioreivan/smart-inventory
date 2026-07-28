const CURRENCY_FORMATTERS: Record<string, Intl.NumberFormat> = {};

export function formatCurrency(value: number, symbol = 'EUR', locale = 'en-US'): string {
  const key = `${symbol}_${locale}`;
  if (!CURRENCY_FORMATTERS[key]) {
    CURRENCY_FORMATTERS[key] = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: symbol,
    });
  }
  return CURRENCY_FORMATTERS[key].format(value);
}

export function formatPercentage(value: number, decimals = 0): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return formatter.format(value);
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string): Date | null {
  const parsed = new Date(value + 'T00:00:00');
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatColor(value: string, format: 'hex' | 'rgb' = 'hex'): string {
  return value.startsWith('#') ? value : `#${value}`;
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function parsePercentageInput(value: string): number {
  const cleaned = value.replace('%', '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num / 100;
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function debounce<T extends (...args: readonly unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}
