'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Plane, Home, Utensils } from 'lucide-react';
import { ExportMenu } from '../Export-menu';
import { LazyImage } from '@/components/ui/lazy-image';
import { getIconicImageSearch } from '@/lib/constants/city-landmarks';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';
import type { PexelsImage } from '@/services/api/media/pexels';

interface ItineraryHeaderProps {
  itinerary: GeneratePersonalizedItineraryOutput & {
    cost?: {
      total: number;
      currency: string;
    };
    _costEstimate?: {
      total: number;
      flights: number;
      accommodation: number;
      dailyExpenses: number;
      currency: string;
      breakdown: Array<{
        type: string;
        description: string;
        amount: number;
      }>;
    };
  };
  tripDuration: string;
  dayCount: number;
  destinationImages: Record<string, PexelsImage[]>;
  selectedLocation: string;
  hasMetadata: boolean;
  isGenerating: boolean;
}

const ItineraryHeaderComponent: React.FC<ItineraryHeaderProps> = ({
  itinerary,
  tripDuration,
  dayCount,
  destinationImages,
  selectedLocation,
  hasMetadata,
  isGenerating
}) => {
  // Get destination name for image
  const destinationName = selectedLocation || itinerary.destination?.split(',')[0]?.trim() || 'destination';

  return (
    <div className="p-3 sm:p-4 border-b border-border">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl tracking-tight text-foreground font-medium">
              {itinerary.title || <span className="animate-pulse bg-muted rounded w-48 h-6 inline-block"/>}
            </h1>
            <p className="text-xs text-muted-foreground">
              {hasMetadata ? tripDuration : <span className="animate-pulse bg-muted rounded w-32 h-4 inline-block"/>}
            </p>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <ExportMenu itinerary={itinerary} className="self-start" />
          </div>
        </div>

        {/* Layout - Stack on mobile, side-by-side on tablet+ */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Left Side - Trip Meta and Cost Breakdown */}
          <div className="w-full sm:w-1/2">
            {/* Trip Meta - Responsive Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Duration</span>
                </div>
                <p className="text-foreground font-medium">
                  {dayCount > 0 ? `${dayCount} days` : <span className="animate-pulse bg-muted rounded w-12 h-4 inline-block"/>}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {hasMetadata ? tripDuration : <span className="animate-pulse bg-muted rounded w-24 h-3 inline-block"/>}
                </p>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>Location</span>
                </div>
                <p className="text-foreground font-medium truncate">
                  {itinerary.destination || <span className="animate-pulse bg-muted rounded w-20 h-4 inline-block"/>}
                </p>
              </div>
            </div>

            {/* Cost Breakdown - Compact */}
            {(itinerary._costEstimate || itinerary.cost || isGenerating) && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Cost breakdown</h3>
                {(itinerary._costEstimate || itinerary.cost) ? (
                <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                        <Plane className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-foreground">Flights</span>
                    </div>
                    <span className="text-xs text-foreground font-medium">
                      ${(itinerary._costEstimate?.flights || (itinerary.cost?.total ? Math.round(itinerary.cost.total * 0.4) : 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                        <Home className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-foreground">Stay</span>
                    </div>
                    <span className="text-xs text-foreground font-medium">
                      ${(itinerary._costEstimate?.accommodation || (itinerary.cost?.total ? Math.round(itinerary.cost.total * 0.35) : 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                        <Utensils className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-foreground">Food & Daily</span>
                    </div>
                    <span className="text-xs text-foreground font-medium">
                      ${(itinerary._costEstimate?.dailyExpenses || (itinerary.cost?.total ? Math.round(itinerary.cost.total * 0.25) : 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Total estimated</span>
                    <span className="text-sm text-foreground font-bold">
                      ${(itinerary._costEstimate?.total || itinerary.cost?.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Per person • {dayCount} days</p>
                </div>
                </>
                ) : (
                  // Loading skeleton for cost breakdown
                  <div className="space-y-2 animate-pulse">
                    <div className="h-8 bg-muted rounded-lg"/>
                    <div className="h-8 bg-muted rounded-lg"/>
                    <div className="h-8 bg-muted rounded-lg"/>
                    <div className="h-10 bg-muted rounded-lg mt-2"/>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Single Destination Image - Full width on mobile */}
          <div className="w-full sm:w-1/2 order-first sm:order-last">
            {(() => {
              // Get iconic landmark search for this destination
              const { fallbackEmoji } = getIconicImageSearch(destinationName);

              // Use first Pexels image if available
              const pexelsImages = destinationImages[destinationName] || [];
              const pexelsImage = pexelsImages[0];

              // Try to get image from various sources
              let imageUrl: string | null = pexelsImage?.src?.large || null;

              if (!imageUrl && itinerary.destination) {
                // Try to get image for the main destination
                const mainDest = itinerary.destination.split(',')[0].trim();
                const mainDestImages = destinationImages[mainDest] || [];
                imageUrl = mainDestImages[0]?.src?.large || null;
              }

              return (
                <div className="relative w-full h-[150px] sm:h-[200px] bg-muted rounded-lg sm:rounded-xl overflow-hidden group shadow-md sm:shadow-lg">
                  {/* Emoji fallback with city-specific icon */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                    <span className="text-6xl opacity-30">{fallbackEmoji}</span>
                  </div>

                  {/* Actual image on top with lazy loading */}
                  {imageUrl ? (
                    <LazyImage
                      src={imageUrl}
                      alt={`${destinationName} - Iconic view`}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                      quality={90}
                      threshold={0.1}
                      rootMargin="100px"
                    />
                  ) : (
                    // Loading skeleton while fetching images
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted/60" />
                  )}

                  {/* Subtle hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Location label on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-medium">{destinationName}</p>
                    <p className="text-white/80 text-xs">Iconic landmark</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const ItineraryHeader = memo(ItineraryHeaderComponent);