'use client';

/**
 * Trips List Component
 * Displays a list of trips with their details and actions
 */

import React, { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Heart,
  Star,
  MoreHorizontal,
  Eye,
  Plane
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Trip as FirestoreTrip } from '@/services/trips/trips-service';

// Use Trip type from trips service
type Trip = Omit<FirestoreTrip, 'userId' | 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> & {
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
};

interface TripsListProps {
  trips: Trip[];
  loading: boolean;
  onToggleFavorite: (tripId: string) => void;
  onDeleteTrip: (tripId: string) => void;
  onViewDetails: (trip: Trip) => void;
}

const getStatusColor = (status: Trip['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'draft':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTravelStyleIcon = (style: Trip['travelStyle']) => {
  switch (style) {
    case 'luxury':
      return <Star className="h-4 w-4 text-yellow-500" />;
    case 'mid-range':
      return <Star className="h-4 w-4 text-gray-400" />;
    case 'budget':
      return <DollarSign className="h-4 w-4 text-green-500" />;
  }
};

export const TripsList = memo<TripsListProps>(({
  trips,
  loading,
  onToggleFavorite,
  onDeleteTrip,
  onViewDetails
}) => {
  const router = useRouter();

  const handleToggleFavorite = useCallback((e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    onToggleFavorite(tripId);
  }, [onToggleFavorite]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900">Loading your trips...</h3>
        </CardContent>
      </Card>
    );
  }

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
          <p className="text-gray-600 mb-4">
            Start planning your first trip!
          </p>
          <Button onClick={() => router.push('/')}>
            Plan New Trip
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map(trip => (
        <Card key={trip.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              {/* Image */}
              <div className="lg:w-48 h-32 lg:h-auto bg-gray-200 relative">
                {trip.imageUrl ? (
                  <img
                    src={trip.imageUrl}
                    alt={trip.destination}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <MapPin className="h-8 w-8" />
                  </div>
                )}
                <Button
                  size="sm"
                  variant={trip.isFavorite ? "default" : "outline"}
                  className="absolute top-2 right-2 p-2 h-8 w-8"
                  onClick={(e) => handleToggleFavorite(e, trip.id)}
                >
                  <Heart className={`h-3 w-3 ${trip.isFavorite ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {trip.title}
                    </h3>
                    <p className="text-gray-600 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {trip.destination}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(trip)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewDetails(trip)}>
                        Continue Planning
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteTrip(trip.id)}
                      >
                        Delete Trip
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                  {trip.startDate && trip.endDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(trip.startDate, 'MMM d, yyyy')} - {format(trip.endDate, 'MMM d, yyyy')}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {trip.duration} days
                  </div>
                  {trip.budget && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {trip.budget.toLocaleString()} {trip.currency}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge className={getStatusColor(trip.status)}>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {getTravelStyleIcon(trip.travelStyle)}
                    <span className="text-sm text-gray-600 capitalize">
                      {trip.travelStyle}
                    </span>
                  </div>
                </div>

                {trip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {trip.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

TripsList.displayName = 'TripsList';