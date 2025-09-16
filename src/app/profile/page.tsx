'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/infrastructure/contexts/AuthContext';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar,
  MapPin,
  Heart,
  Settings,
  Save,
  Loader2,
  Camera,
  Globe,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

export default function ProfilePage() {
  const { user, userData, updateUserProfile, loading } = useAuth();
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

  React.useEffect(() => {
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

  const onSubmit = async (data: ProfileFormData) => {
    setIsUpdating(true);
    try {
      await updateUserProfile({
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
  };

  const toggleInterest = (interest: string) => {
    const updated = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    setSelectedInterests(updated);
    setValue('interests', updated);
  };

  const initials = userData?.displayName
    ?.split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || 'U';

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
            <Card className="md:col-span-1">
              <CardHeader className="text-center">
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage 
                      src={userData?.photoURL || user?.photoURL || ''} 
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
                    <span>Member since {userData?.createdAt ? new Date(userData.createdAt.toDate?.() || userData.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span>0 trips planned</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-gray-500" />
                    <span>0 favorites</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Settings */}
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
          </div>
        </div>
      </div>
      </ScrollablePage>
    </ProtectedRoute>
  );
}