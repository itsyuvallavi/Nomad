
/**
 * Authentication Context (Re-export)
 * This file re-exports the AuthProvider and useAuth hook for backward compatibility
 * The actual implementation is split into separate files for better maintainability:
 * - AuthProvider.tsx: Main provider component with auth logic
 * - /hooks/use-auth.ts: Custom hook to access auth context
 * - /hooks/use-google-auth.ts: Google authentication logic
 */

export { AuthProvider, type AuthContextType, type UserData } from './AuthProvider';
export { useAuth } from '@/hooks/use-auth';
