'use client';

/**
 * Profile Stats Component
 * Displays user statistics and overview information
 */

import React, { memo } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, Calendar, TrendingUp, Heart, Camera } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { UserData } from '@/infrastructure/contexts/AuthProvider';

interface ProfileStatsProps {
  user: User | null;
  userData: UserData | null;
}

export const ProfileStats = memo<ProfileStatsProps>(({ user, userData }) => {
  const initials = userData?.displayName
    ?.split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || 'U';

  const memberSince = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString()
    : 'N/A';

  return (
    <Card className="md:col-span-1">
      <CardHeader className="text-center">
        <div className="relative mx-auto w-24 h-24 mb-4">
          <Avatar className="w-24 h-24">
            <AvatarImage
              src={userData?.photoURL || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''}
              alt={userData?.displayName || 'User'}
            />
            <AvatarFallback className="bg-blue-600 text-white text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            className="absolute -bottom-2 -right-2 rounded-full p-2 h-8 w-8"
          >
            <Camera className="h-3 w-3" />
          </Button>
        </div>
        <CardTitle className="text-lg">{userData?.displayName || 'User'}</CardTitle>
        <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
          <Mail className="h-3 w-3" />
          {user?.email}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>Member since {memberSince}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <span>{userData?.stats?.totalTripsPlanned || 0} trips planned</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Heart className="h-4 w-4 text-gray-500" />
            <span>{userData?.stats?.favoriteDestinations?.length || 0} favorites</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ProfileStats.displayName = 'ProfileStats';