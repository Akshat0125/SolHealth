/**
 * Deterministic date and address formatting helpers.
 * Ensures 100% identical output on server and client to prevent Next.js hydration mismatch.
 */

export function formatUtcDateTime(timestamp: number | string | Date | null | undefined): string {
  if (!timestamp) return "----";
  const date = typeof timestamp === "object" && timestamp instanceof Date 
    ? timestamp 
    : new Date(typeof timestamp === "string" ? Number(timestamp) || timestamp : timestamp);

  if (isNaN(date.getTime())) return "----";

  // Use explicit UTC ISO-like format: YYYY-MM-DD HH:MM:SS UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export function formatShortAddress(address: string | null | undefined, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return "----";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatBalance(balance: number | null | undefined): string {
  if (balance === null || balance === undefined) return "0.00";
  return balance.toFixed(2);
}
