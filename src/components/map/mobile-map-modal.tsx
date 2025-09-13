'use client';

import { X, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { MapPanel } from './map-panel';

interface MobileMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: GeneratePersonalizedItineraryOutput;
  selectedLocation?: string;
  daysByLocation?: Record<string, { days: any[], startDay: number, endDay: number }>;
}

export function MobileMapModal({
  isOpen,
  onClose,
  itinerary,
  selectedLocation,
  daysByLocation
}: MobileMapModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(true);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              "fixed z-50 bg-background rounded-t-2xl shadow-xl md:hidden",
              isFullscreen 
                ? "inset-0" 
                : "bottom-0 left-0 right-0 h-[70vh]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Map View</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-9 w-9"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Map Content */}
            <div className="h-[calc(100%-60px)] overflow-hidden">
              <MapPanel
                itinerary={itinerary}
                selectedLocation={selectedLocation}
                daysByLocation={daysByLocation}
                className="h-full border-0 rounded-none"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}