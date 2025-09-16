'use client';

/**
 * Protected Route Component
 * Wraps components that require authentication
 */

import React from 'react';
import { useAuth } from '@/infrastructure/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { AuthModal } from '../navigation/auth/AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectTo = '/'
}) => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth modal if not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sign in required
            </h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access this feature. Create an account or sign in to continue.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
        
        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          redirectTo={redirectTo}
        />
      </>
    );
  }

  // User is authenticated, show protected content
  return <>{children}</>;
};

// HOC version for easier use
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) => {
  const AuthenticatedComponent = (props: P) => (
    <ProtectedRoute redirectTo={redirectTo}>
      <Component {...props} />
    </ProtectedRoute>
  );

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
};