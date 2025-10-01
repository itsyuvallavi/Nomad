'use client';

/**
 * Trips Page Component (Refactored)
 * Main page component for viewing and managing trip history
 * Now split into smaller components for better maintainability
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/infrastructure/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { tripsService, type Trip as FirestoreTrip } from '@/services/trips/trips-service';
import { clearAllTrips } from '@/lib/helpers/clear-all-trips';

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
import { TripFilters } from '@/components/trips/TripFilters';
import { TripStats } from '@/components/trips/TripStats';
import { TripsList } from '@/components/trips/TripsList';

// Use Trip type from trips service
type Trip = Omit<FirestoreTrip, 'userId' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> & {
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
};

export default function TripsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [loading, setLoading] = useState(true);

  // Load trips from Firestore
  useEffect(() => {
    const loadTrips = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load all trips from Firestore
        const firestoreTrips = await tripsService.getUserTrips(user.uid);

        // Convert Firestore timestamps to Date objects
        const convertedTrips = firestoreTrips.map(trip => ({
          ...trip,
          createdAt: trip.createdAt?.toDate() || new Date(),
          updatedAt: trip.updatedAt?.toDate() || new Date(),
          startDate: trip.startDate ? (
            trip.startDate instanceof Timestamp
              ? trip.startDate.toDate()
              : new Date(trip.startDate)
          ) : undefined,
          endDate: trip.endDate ? (
            trip.endDate instanceof Timestamp
              ? trip.endDate.toDate()
              : new Date(trip.endDate)
          ) : undefined
        }));

        setTrips(convertedTrips);
        console.log(`✅ Loaded ${convertedTrips.length} trips from Firestore`);
      } catch (error) {
        console.error('Error loading trips:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [user]);

  // Filter and sort trips (memoized)
  const filteredTrips = useMemo(() => {
    let filtered = trips;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(trip =>
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    // Sort
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'destination':
          return a.destination.localeCompare(b.destination);
        case 'duration':
          return b.duration - a.duration;
        case 'budget':
          return (b.budget || 0) - (a.budget || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [trips, searchQuery, statusFilter, sortBy]);

  // Toggle favorite (memoized)
  const toggleFavorite = useCallback(async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    const newFavoriteStatus = !trip.isFavorite;

    // Update UI optimistically
    setTrips(trips.map(t =>
      t.id === tripId ? { ...t, isFavorite: newFavoriteStatus } : t
    ));

    // Update in Firestore
    try {
      await tripsService.toggleFavorite(tripId, newFavoriteStatus);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setTrips(trips.map(t =>
        t.id === tripId ? { ...t, isFavorite: !newFavoriteStatus } : t
      ));
    }
  }, [trips]);

  // Delete trip (memoized)
  const deleteTrip = useCallback(async (tripId: string) => {
    try {
      await tripsService.deleteTrip(tripId);
      setTrips(trips.filter(t => t.id !== tripId));
      console.log('✅ Trip deleted');
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  }, [trips]);

  // View trip details (memoized)
  const viewTripDetails = useCallback((trip: Trip) => {
    // Navigate to chat view with the trip's chat state
    if (trip.chatState) {
      // Pass the trip ID in the URL to track we're viewing an existing trip
      router.push(`/?tripId=${trip.id}&mode=view`);
    }
  }, [router]);

  // Clear all trips (memoized)
  const handleClearAll = useCallback(async () => {
    if (confirm('Are you sure you want to delete ALL trips? This cannot be undone.')) {
      clearAllTrips();
    }
  }, []);

  return (
    <ProtectedRoute>
      <ScrollablePage>
        <Header />
        <div className="min-h-screen pt-12 md:pt-16 bg-gray-50">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <History className="h-8 w-8" />
                  Trip History
                </h1>
                <p className="text-gray-600">View and manage all your travel plans</p>
              </div>
              {trips.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                >
                  Clear All Trips
                </Button>
              )}
            </div>

            {/* Filters and Search */}
            <TripFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />

            {/* Trip Statistics */}
            <TripStats trips={trips} />

            {/* Trip List */}
            <TripsList
              trips={filteredTrips}
              loading={loading}
              onToggleFavorite={toggleFavorite}
              onDeleteTrip={deleteTrip}
              onViewDetails={viewTripDetails}
            />
          </div>
        </div>
      </ScrollablePage>
    </ProtectedRoute>
  );
}