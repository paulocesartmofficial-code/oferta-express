/**
 * Formatting and Mathematical Utilities for Shopee Offers
 */

/**
 * Formats a number to Brazilian Real (R$) currency
 */
export function formatBRL(value?: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calculates mathematical discount percentage strictly from factual prices.
 * Returns undefined if either price is invalid or discount is <= 0.
 */
export function calculateDiscount(currentPrice?: number, originalPrice?: number): number | undefined {
  if (
    currentPrice === undefined ||
    originalPrice === undefined ||
    isNaN(currentPrice) ||
    isNaN(originalPrice) ||
    originalPrice <= 0 ||
    currentPrice >= originalPrice
  ) {
    return undefined;
  }

  const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  return discount > 0 && discount < 100 ? discount : undefined;
}

/**
 * Formats ISO date string to Brazilian Portuguese readable format
 */
export function formatDateBR(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Formats relative or short time e.g. "Hoje às 14:20"
 */
export function formatRelativeDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Hoje às ${timeStr}`;
    }
    return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;
  } catch {
    return isoString;
  }
}

/**
 * Formats sold count into friendly Brazilian abbreviation e.g. 1.2k vendidos
 */
export function formatSoldCount(count?: number): string {
  if (count === undefined || count === null || count <= 0) return '';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace('.', ',')} mil vendidos`;
  }
  return `${count} vendidos`;
}
