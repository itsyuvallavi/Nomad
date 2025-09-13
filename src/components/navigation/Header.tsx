'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  
  const isHomePage = pathname === '/';

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
          <div className="flex items-center gap-2 md:gap-3">
            {/* Show return button when not on home page */}
            {!isHomePage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="h-8 w-8 md:h-9 md:w-9 p-0"
                aria-label="Return to home"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            
            {/* Logo/Title - clickable to go home */}
            <button
              onClick={() => router.push('/')}
              className="hover:opacity-80 transition-opacity"
            >
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
                Nomad Navigator
              </h1>
            </button>
          </div>

          <div className="flex items-center">
            {user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Mobile: Icon-only buttons to save space */}
                <Button
                  size="sm"
                  onClick={handleShowLogin}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 min-w-[44px] min-h-[36px] sm:min-h-[32px]"
                >
                  <LogIn className="h-4 w-4" />
                  {/* Hide text on very small screens */}
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
                <Button
                  variant="ghost"
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