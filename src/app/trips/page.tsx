'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  History,
  Search,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Filter,
  SortDesc,
  Eye,
  Heart,
  MoreHorizontal,
  Plane,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

// Mock trip data - in real app this would come from Firestore
interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  budget?: number;
  currency: string;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  isFavorite: boolean;
  tags: string[];
  imageUrl?: string;
}

const MOCK_TRIPS: Trip[] = [];

export default function TripsPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>(MOCK_TRIPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  // Filter and sort trips
  useEffect(() => {
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

    setFilteredTrips(filtered);
  }, [trips, searchQuery, statusFilter, sortBy]);

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

  const toggleFavorite = (tripId: string) => {
    setTrips(trips.map(trip =>
      trip.id === tripId ? { ...trip, isFavorite: !trip.isFavorite } : trip
    ));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen pt-16 bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <History className="h-8 w-8" />
              Trip History
            </h1>
            <p className="text-gray-600">View and manage all your travel plans</p>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search trips by destination, title, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SortDesc className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date Created</SelectItem>
                      <SelectItem value="destination">Destination</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trip Statistics */}
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

          {/* Trip List */}
          <div className="space-y-4">
            {filteredTrips.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Start planning your first trip!'}
                  </p>
                  <Button onClick={() => router.push('/')}>
                    Plan New Trip
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredTrips.map(trip => (
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
                          onClick={() => toggleFavorite(trip.id)}
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
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Edit Trip
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                Delete Trip
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(trip.startDate, 'MMM d, yyyy')} - {format(trip.endDate, 'MMM d, yyyy')}
                          </div>
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
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}