'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Header } from '@/components/navigation/Header';
import { ScrollablePage } from '@/components/layout/scrollable-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart,
  Search,
  MapPin,
  Calendar,
  Star,
  Utensils,
  Building,
  Camera,
  Trash2,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock favorites data
interface Favorite {
  id: string;
  type: 'destination' | 'trip' | 'activity' | 'restaurant' | 'hotel';
  itemId: string;
  title: string;
  description: string;
  imageUrl?: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  createdAt: Date;
  rating?: number;
  price?: string;
  tags: string[];
}

const MOCK_FAVORITES: Favorite[] = [];

export default function FavoritesPage() {
  const { userData } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>(MOCK_FAVORITES);
  const [filteredFavorites, setFilteredFavorites] = useState<Favorite[]>(MOCK_FAVORITES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  // Filter and sort favorites
  useEffect(() => {
    let filtered = favorites;

    // Type filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(fav => fav.type === activeTab);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(fav =>
        fav.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.location.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        case 'location':
          return a.location.city.localeCompare(b.location.city);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    setFilteredFavorites(filtered);
  }, [favorites, activeTab, searchQuery, sortBy]);

  const getTypeIcon = (type: Favorite['type']) => {
    switch (type) {
      case 'destination':
        return <MapPin className="h-4 w-4" />;
      case 'restaurant':
        return <Utensils className="h-4 w-4" />;
      case 'hotel':
        return <Building className="h-4 w-4" />;
      case 'activity':
        return <Camera className="h-4 w-4" />;
      case 'trip':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Heart className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: Favorite['type']) => {
    switch (type) {
      case 'destination':
        return 'bg-blue-100 text-blue-800';
      case 'restaurant':
        return 'bg-red-100 text-red-800';
      case 'hotel':
        return 'bg-purple-100 text-purple-800';
      case 'activity':
        return 'bg-green-100 text-green-800';
      case 'trip':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const removeFavorite = (favoriteId: string) => {
    setFavorites(favorites.filter(fav => fav.id !== favoriteId));
  };

  const getFavoritesByType = (type: string) => {
    return type === 'all' ? favorites.length : favorites.filter(fav => fav.type === type).length;
  };

  return (
    <ProtectedRoute>
      <ScrollablePage>
        <Header />
        <div className="min-h-screen pt-12 md:pt-16 bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500" />
              Favorites
            </h1>
            <p className="text-gray-600">Your saved destinations, restaurants, hotels, and activities</p>
          </div>

          {/* Search and Sort */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search favorites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date Added</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-6 lg:w-fit">
              <TabsTrigger value="all" className="flex items-center gap-1">
                All ({getFavoritesByType('all')})
              </TabsTrigger>
              <TabsTrigger value="destination" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Places ({getFavoritesByType('destination')})
              </TabsTrigger>
              <TabsTrigger value="restaurant" className="flex items-center gap-1">
                <Utensils className="h-3 w-3" />
                Food ({getFavoritesByType('restaurant')})
              </TabsTrigger>
              <TabsTrigger value="hotel" className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                Hotels ({getFavoritesByType('hotel')})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Activities ({getFavoritesByType('activity')})
              </TabsTrigger>
              <TabsTrigger value="trip" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Trips ({getFavoritesByType('trip')})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredFavorites.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites found</h3>
                    <p className="text-gray-600">
                      {searchQuery 
                        ? 'Try adjusting your search query'
                        : 'Start exploring and save your favorite places!'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredFavorites.map(favorite => (
                    <Card key={favorite.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-video relative">
                        {favorite.imageUrl ? (
                          <img
                            src={favorite.imageUrl}
                            alt={favorite.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            {getTypeIcon(favorite.type)}
                          </div>
                        )}
                        <Badge 
                          className={`absolute top-2 left-2 ${getTypeColor(favorite.type)}`}
                        >
                          <span className="flex items-center gap-1">
                            {getTypeIcon(favorite.type)}
                            {favorite.type}
                          </span>
                        </Badge>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 p-2 h-8 w-8"
                          onClick={() => removeFavorite(favorite.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-gray-900 mb-1">{favorite.title}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {favorite.location.city}, {favorite.location.country}
                          </p>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {favorite.description}
                        </p>

                        <div className="flex items-center justify-between mb-3">
                          {favorite.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{favorite.rating}</span>
                            </div>
                          )}
                          {favorite.price && (
                            <Badge variant="outline" className="text-xs">
                              {favorite.price}
                            </Badge>
                          )}
                        </div>

                        {favorite.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {favorite.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {favorite.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{favorite.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {favorite.type === 'trip' && (
                            <Button size="sm" className="flex-1">
                              Book
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </ScrollablePage>
    </ProtectedRoute>
  );
}