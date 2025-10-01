'use client';

/**
 * Trip Statistics Component
 * Displays statistics about the user's trips
 */

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Trip as FirestoreTrip } from '@/services/trips/trips-service';

// Use Trip type from trips service
type Trip = Omit<FirestoreTrip, 'userId' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> & {
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
};

interface TripStatsProps {
  trips: Trip[];
}

export const TripStats = memo<TripStatsProps>(({ trips }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{trips.length}</div>
          <p className="text-sm text-gray-600">Total Trips</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {trips.filter(t => t.status === 'completed').length}
          </div>
          <p className="text-sm text-gray-600">Completed</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {trips.filter(t => t.status === 'confirmed').length}
          </div>
          <p className="text-sm text-gray-600">Upcoming</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {trips.filter(t => t.isFavorite).length}
          </div>
          <p className="text-sm text-gray-600">Favorites</p>
        </CardContent>
      </Card>
    </div>
  );
});

TripStats.displayName = 'TripStats';