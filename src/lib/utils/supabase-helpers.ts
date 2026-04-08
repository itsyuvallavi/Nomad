/**
 * Supabase Helper Utilities
 * Replaces the old firestore-helpers.ts — utility functions for data preparation.
 */

/**
 * Recursively remove undefined values from an object.
 * Supabase/PostgreSQL doesn't accept undefined; omit those fields entirely.
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null ? stripUndefined(item) : item
    ) as unknown as T;
  }

  if (typeof obj !== 'object') return obj;

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    cleaned[key] = value !== null && typeof value === 'object'
      ? Array.isArray(value)
        ? value.map(item => typeof item === 'object' && item !== null ? stripUndefined(item) : item)
        : stripUndefined(value)
      : value;
  }
  return cleaned as T;
}

/**
 * Alias kept for backward compatibility.
 */
export const prepareForSupabase = stripUndefined;

/**
 * Kept for backward compatibility — callers that imported from firestore-helpers
 * can switch to this file without changing function names.
 */
export const prepareForFirestore = stripUndefined;
