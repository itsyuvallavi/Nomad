'use client';

/**
 * Profile Page Component (Refactored)
 * Main profile page that displays user information and settings
 * Now split into smaller components for better maintainability
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/infrastructure/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
const ProtectedRoute = dynamic(() => import('@/components/auth/ProtectedRoute').then(mod => ({ default: mod.ProtectedRoute })), {
  loading: () => <div className="min-h-screen" />,
});

const Header = dynamic(() => import('@/components/navigation/Header').then(mod => ({ default: mod.Header })), {
  loading: () => <div className="h-16" />,
});

const ScrollablePage = dynamic(() => import('@/components/layout/scrollable-page').then(mod => ({ default: mod.ScrollablePage })), {
  loading: () => <div className="min-h-screen animate-pulse bg-gray-50" />,
});

// Import new split components
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

export default function ProfilePage() {
  const { user, userData, updateUserProfile, loading } = useAuth();

  if (loading) {
    return (
      <ProtectedRoute>
        <ScrollablePage>
          <Header />
          <div className="min-h-screen pt-12 md:pt-16 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-sm text-gray-600">Loading profile...</p>
            </div>
          </div>
        </ScrollablePage>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ScrollablePage>
        <Header />
        <div className="min-h-screen pt-12 md:pt-16 bg-gray-50">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Profile Overview */}
              <ProfileStats user={user} userData={userData} />

              {/* Profile Settings */}
              <ProfileSettings
                user={user}
                userData={userData}
                onUpdateProfile={updateUserProfile}
              />
            </div>
          </div>
        </div>
      </ScrollablePage>
    </ProtectedRoute>
  );
}