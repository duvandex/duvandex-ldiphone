import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const fmt = formatCurrency;

export function extractGB(name: string, description?: string): string | null {
  const combined = `${name} ${description || ''}`;
  const match = combined.match(/(\d+)\s*GB/i);
  return match ? match[1] + 'GB' : null;
}

export function extractBattery(name: string, description?: string): string | null {
  const combined = `${name} ${description || ''}`;
  // Look for percentage, or "condición" followed by numbers
  const match = combined.match(/(\d+)\s*%/);
  if (match) return match[1] + '%';
  
  const conditionMatch = combined.match(/condici[oó]n\s*:?\s*(\d+)/i);
  if (conditionMatch) return conditionMatch[1] + '%';

  return null;
}
