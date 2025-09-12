'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // Close modal when user successfully authenticates
  useEffect(() => {
    if (user && showAuthModal) {
      // Small delay to show success before closing
      setTimeout(() => {
        setShowAuthModal(false);
      }, 1000);
    }
  }, [user, showAuthModal]);

  const handleShowLogin = () => {
    setAuthView('login');
    setShowAuthModal(true);
  };

  const handleShowSignup = () => {
    setAuthView('signup');
    setShowAuthModal(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        {/* Mobile: h-12 (48px), Desktop: h-16 (64px) for better mobile space utilization */}
        <div className="w-full h-12 md:h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center">
            {/* Mobile: smaller text, Desktop: original size */}
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
              Nomad Navigator
            </h1>
          </div>

          <div className="flex items-center">
            {user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Mobile: Icon-only buttons to save space */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowLogin}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 min-w-[44px] min-h-[36px] sm:min-h-[32px]"
                >
                  <LogIn className="h-4 w-4" />
                  {/* Hide text on very small screens */}
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleShowSignup}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 min-w-[44px] min-h-[36px] sm:min-h-[32px]"
                >
                  <UserPlus className="h-4 w-4" />
                  {/* Hide text on very small screens */}
                  <span className="hidden sm:inline">Sign up</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialView={authView}
      />
    </>
  );
};