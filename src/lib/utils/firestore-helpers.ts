/**
 * Firestore Helpers — redirect shim
 * This file is kept for backward import compatibility.
 * All utilities now live in supabase-helpers.ts
 */

export {
  stripUndefined,
  prepareForFirestore,
  prepareForSupabase,
} from './supabase-helpers';

// Legacy alias
export { stripUndefined as undefinedToNull } from './supabase-helpers';
