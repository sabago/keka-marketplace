// Server-side utility functions

/**
 * Format a number as currency
 * This is a server-side version of the formatCurrency function
 */
export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}
