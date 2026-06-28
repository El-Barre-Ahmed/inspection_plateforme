/**
 * Parse pipe-separated string into array of non-empty values
 * Handles multiple formats:
 * - "R11" → ["R11"]
 * - "R1|R3|R4" → ["R1", "R3", "R4"]
 * - "[]" → []
 * - "{}" → []
 * - "" → []
 * - undefined → []
 */
export function parsePipeSeparated(value: string | undefined | any): string[] {
  if (value === undefined || value === null || value === '') return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'object') {
    return Object.keys(value)
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  const str = String(value).trim();
  if (str === '[]' || str === '{}' || str === 'null' || str === '') return [];

  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0);
      }
      if (parsed && typeof parsed === 'object') {
        return Object.keys(parsed)
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0);
      }
    } catch {
      // Continue with pipe-separated parsing
    }
  }

  return str
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Get color styling for badges based on type
 */
export function getBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    // Rules
    'R1': 'bg-blue-100 text-blue-700 border border-blue-200',
    'R2': 'bg-blue-100 text-blue-700 border border-blue-200',
    'R3': 'bg-purple-100 text-purple-700 border border-purple-200',
    'R4': 'bg-purple-100 text-purple-700 border border-purple-200',
    'R5': 'bg-pink-100 text-pink-700 border border-pink-200',
    // Default for any R*
  };
  
  if (colors[type]) return colors[type];
  
  // If it starts with R (rule), use default rule color
  if (type.startsWith('R')) {
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
  
  // If it starts with I (interaction), use interaction color
  if (type.startsWith('I')) {
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  }
  
  // Fallback
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}
