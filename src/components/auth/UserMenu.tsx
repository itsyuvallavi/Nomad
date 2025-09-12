'use client';

/**
 * User Menu Component
 * Displays user avatar and dropdown menu with account options
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Settings, 
  LogOut, 
  History, 
  Heart,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const UserMenu: React.FC = () => {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) return null;

  const displayName = userData?.displayName || user.displayName || '';
  const initials = displayName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0]?.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 sm:h-10 w-auto px-1.5 sm:px-2 min-w-[44px]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarImage 
                src={userData?.photoURL || user.photoURL || ''} 
                alt={displayName}
              />
              <AvatarFallback className="bg-blue-600 text-white text-xs sm:text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Hide user details on mobile to save space */}
            <div className="hidden sm:flex flex-col items-start text-left min-w-0">
              <span className="text-sm font-medium truncate max-w-24">
                {displayName || 'User'}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-24">
                {user.email}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50 hidden sm:block" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/trips')}>
          <History className="mr-2 h-4 w-4" />
          <span>Trip History</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/favorites')}>
          <Heart className="mr-2 h-4 w-4" />
          <span>Favorites</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-600 focus:text-red-600"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};