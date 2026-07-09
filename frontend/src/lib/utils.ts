import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to format values
export function formatNumber(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return '--';
  return val.toFixed(decimals);
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '--';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);

  if (hr > 0) {
    return `${hr}h ${min % 60}m`;
  }
  if (min > 0) {
    return `${min}m ${sec % 60}s`;
  }
  return `${sec}s`;
}
