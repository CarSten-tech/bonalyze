import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStoreName(store: string): string {
  if (!store) return "";
  const nameMap: Record<string, string> = {
    'aldi-sued': 'Aldi-Süd',
    'aldi-nord': 'Aldi-Nord',
    'kaufland': 'Kaufland',
    'edeka': 'Edeka',
    'rewe': 'REWE',
    'lidl': 'Lidl',
    'netto': 'Netto'
  };
  
  const lower = store.toLowerCase().trim();
  if (nameMap[lower]) return nameMap[lower];

  // Fallback: Capitalize first letter of each word and replace dashes
  return lower
    .split(/[-_ ]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
