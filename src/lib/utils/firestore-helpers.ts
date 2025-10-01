/**
 * Firestore Helper Utilities
 * Utilities for working with Firestore data
 */

/**
 * Recursively remove undefined values from an object
 * Firestore doesn't accept undefined values, they must be null or omitted
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null ? stripUndefined(item) : item
    ) as unknown as T;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const cleaned: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined values entirely
    if (value === undefined) {
      continue;
    }

    // Recursively clean nested objects
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        cleaned[key] = value.map(item =>
          typeof item === 'object' && item !== null ? stripUndefined(item) : item
        );
      } else {
        cleaned[key] = stripUndefined(value);
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
}

/**
 * Convert undefined to null for fields that need a value
 */
export function undefinedToNull<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null ? undefinedToNull(item) : item
    ) as unknown as T;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const converted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      converted[key] = null;
    } else if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        converted[key] = value.map(item =>
          typeof item === 'object' && item !== null ? undefinedToNull(item) : item
        );
      } else {
        converted[key] = undefinedToNull(value);
      }
    } else {
      converted[key] = value;
    }
  }

  return converted as T;
}

/**
 * Prepare data for Firestore by removing undefined values
 * This is the recommended approach - omit undefined fields entirely
 */
export function prepareForFirestore<T extends Record<string, any>>(data: T): Partial<T> {
  return stripUndefined(data);
}
