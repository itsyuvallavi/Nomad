'use client';

/**
 * Profile Settings Component
 * Handles user profile settings and preferences
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { UserData } from '@/infrastructure/contexts/AuthProvider';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name too long'),
  travelStyle: z.enum(['budget', 'mid-range', 'luxury']),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
  preferredLanguage: z.string().min(1, 'Language is required'),
  currency: z.string().min(1, 'Currency is required'),
  defaultTripLength: z.number().min(1).max(90)
});

type ProfileFormData = z.infer<typeof profileSchema>;

const AVAILABLE_INTERESTS = [
  'Culture & History', 'Food & Dining', 'Adventure Sports', 'Nature & Wildlife',
  'Nightlife & Entertainment', 'Art & Museums', 'Architecture', 'Shopping',
  'Beach & Water Sports', 'Mountain Activities', 'Photography', 'Local Festivals',
  'Wellness & Spa', 'Business & Networking', 'Technology', 'Music & Concerts'
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' }
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' }
];

interface ProfileSettingsProps {
  user: User | null;
  userData: UserData | null;
  onUpdateProfile: (data: Partial<UserData>) => Promise<void>;
}

export const ProfileSettings = memo<ProfileSettingsProps>(({ user, userData, onUpdateProfile }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userData?.displayName || '',
      travelStyle: userData?.preferences.travelStyle || 'mid-range',
      interests: userData?.preferences.interests || [],
      preferredLanguage: userData?.preferences.preferredLanguage || 'en',
      currency: userData?.preferences.currency || 'USD',
      defaultTripLength: userData?.preferences.defaultTripLength || 7
    }
  });

  useEffect(() => {
    if (userData) {
      setValue('displayName', userData.displayName);
      setValue('travelStyle', userData.preferences.travelStyle);
      setValue('interests', userData.preferences.interests);
      setValue('preferredLanguage', userData.preferences.preferredLanguage);
      setValue('currency', userData.preferences.currency);
      setValue('defaultTripLength', userData.preferences.defaultTripLength);
      setSelectedInterests(userData.preferences.interests);
    }
  }, [userData, setValue]);

  const onSubmit = useCallback(async (data: ProfileFormData) => {
    setIsUpdating(true);
    try {
      await onUpdateProfile({
        displayName: data.displayName,
        preferences: {
          travelStyle: data.travelStyle,
          interests: selectedInterests,
          preferredLanguage: data.preferredLanguage,
          currency: data.currency,
          defaultTripLength: data.defaultTripLength
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [selectedInterests, onUpdateProfile]);

  const toggleInterest = useCallback((interest: string) => {
    const updated = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    setSelectedInterests(updated);
    setValue('interests', updated);
  }, [selectedInterests, setValue]);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Profile Settings
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p className="text-sm text-red-600">{errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Travel Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Travel Preferences</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Travel Style</Label>
                <Select
                  value={watch('travelStyle')}
                  onValueChange={(value: any) => setValue('travelStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="mid-range">Mid-range</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Trip Length</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    {...register('defaultTripLength', { valueAsNumber: true })}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Preferred Language</Label>
                <Select
                  value={watch('preferredLanguage')}
                  onValueChange={(value) => setValue('preferredLanguage', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={watch('currency')}
                  onValueChange={(value) => setValue('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Interests */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Interests</h3>
            <p className="text-sm text-gray-600">
              Select your travel interests to get better personalized recommendations
            </p>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {AVAILABLE_INTERESTS.map(interest => (
                <Badge
                  key={interest}
                  variant={selectedInterests.includes(interest) ? "default" : "outline"}
                  className="cursor-pointer justify-center py-2 px-3 hover:bg-blue-50"
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>

            {errors.interests && (
              <p className="text-sm text-red-600">{errors.interests.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6">
            <Button
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

ProfileSettings.displayName = 'ProfileSettings';