'use client';

/**
 * Authentication Modal
 * Combined login/signup modal with tab switching
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { AuthSuccess } from './AuthSuccess';
import { useAuth } from '@/infrastructure/contexts/AuthContext';

type AuthView = 'login' | 'signup' | 'forgot-password';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialView?: AuthView;
  redirectTo?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  initialView = 'login',
  redirectTo = '/'
}) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<AuthView>(initialView);

  const handleClose = () => {
    onClose();
    // Reset to initial view when modal closes
    setTimeout(() => setCurrentView(initialView), 200);
  };

  const renderContent = () => {
    // Show success state if user is authenticated
    if (user && open) {
      return <AuthSuccess message="Welcome! Redirecting you now..." />;
    }

    switch (currentView) {
      case 'signup':
        return (
          <SignupForm
            onSwitchToLogin={() => setCurrentView('login')}
            redirectTo={redirectTo}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onBackToLogin={() => setCurrentView('login')}
          />
        );
      case 'login':
      default:
        return (
          <LoginForm
            onSwitchToSignup={() => setCurrentView('signup')}
            onForgotPassword={() => setCurrentView('forgot-password')}
            redirectTo={redirectTo}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription>
            Sign in to your account or create a new one
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};