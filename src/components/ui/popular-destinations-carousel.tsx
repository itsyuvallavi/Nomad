'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  description: string;
  recommendedDays: string;
  bestTime: string;
  popularFor: string[];
  prompt: string;
}

const destinations: Destination[] = [
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&q=80',
    description: 'City of Light and romance',
    recommendedDays: '3-5 days',
    bestTime: 'Spring & Fall',
    popularFor: ['Art', 'Culture', 'Romance'],
    prompt: 'Plan a romantic 4-day trip to Paris with museums, cafes, and iconic landmarks'
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
    description: 'Modern metropolis meets tradition',
    recommendedDays: '5-7 days',
    bestTime: 'Spring & Fall',
    popularFor: ['Food', 'Culture', 'Technology'],
    prompt: 'Create a 6-day Tokyo adventure with anime culture, street food, and traditional temples'
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&q=80',
    description: 'Tropical paradise and culture',
    recommendedDays: '7-10 days',
    bestTime: 'Dry Season',
    popularFor: ['Beaches', 'Wellness', 'Nature'],
    prompt: 'Design a 8-day Bali getaway with beaches, temples, and wellness retreats'
  },
  {
    id: 'iceland',
    name: 'Iceland',
    country: 'Iceland',
    image: 'https://images.unsplash.com/photo-1531168556467-80aace4d0144?w=800&q=80',
    description: 'Land of fire and ice',
    recommendedDays: '7-10 days',
    bestTime: 'Summer',
    popularFor: ['Nature', 'Adventure', 'Photography'],
    prompt: 'Plan a 9-day Iceland road trip with waterfalls, geysers, and Northern Lights'
  },
  {
    id: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
    description: 'Stunning sunsets and white villages',
    recommendedDays: '3-5 days',
    bestTime: 'Spring to Fall',
    popularFor: ['Sunsets', 'Romance', 'Wine'],
    prompt: 'Create a 4-day romantic Santorini escape with sunset views and wine tasting'
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'USA',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
    description: 'The city that never sleeps',
    recommendedDays: '4-6 days',
    bestTime: 'Spring & Fall',
    popularFor: ['Culture', 'Food', 'Shows'],
    prompt: 'Plan a 5-day NYC experience with Broadway shows, museums, and food tours'
  }
];

interface PopularDestinationsCarouselProps {
  onDestinationSelect: (prompt: string) => void;
}

export default function PopularDestinationsCarousel({ onDestinationSelect }: PopularDestinationsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-rotate carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % destinations.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % destinations.length);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + destinations.length) % destinations.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const currentDestination = destinations[currentIndex];

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h2 className="text-xl font-semibold text-center mb-4 text-foreground">
          Popular Destinations
        </h2>
        
        <Card className="relative overflow-hidden bg-card border-border group">
          <CardContent className="p-0">
            <div className="relative h-64 md:h-80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={currentDestination.image}
                    alt={currentDestination.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                </motion.div>
              </AnimatePresence>
              
              {/* Navigation Arrows */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <motion.div
                  key={`content-${currentIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{currentDestination.country}</span>
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">
                    {currentDestination.name}
                  </h3>
                  
                  <p className="text-sm md:text-base mb-4 opacity-90">
                    {currentDestination.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{currentDestination.recommendedDays}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{currentDestination.bestTime}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentDestination.popularFor.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-white/20 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <Button
                    onClick={() => onDestinationSelect(currentDestination.prompt)}
                    className="bg-white text-black hover:bg-white/90"
                  >
                    Plan This Trip
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
          
          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {destinations.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}