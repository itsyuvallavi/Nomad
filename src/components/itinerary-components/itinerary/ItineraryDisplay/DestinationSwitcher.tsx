'use client';

import { memo, useRef, useEffect } from 'react';

import { MapPin } from 'lucide-react';

interface DaysByLocation {
  days: any[];
  startDay: number;
  endDay: number;
}

interface DestinationSwitcherProps {
  locations: string[];
  daysByLocation: Record<string, DaysByLocation>;
  selectedLocation: string;
  onLocationSelect: (location: string) => void;
}

const DestinationSwitcherComponent: React.FC<DestinationSwitcherProps> = ({
  locations,
  daysByLocation,
  selectedLocation,
  onLocationSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const currentFocusIndex = useRef<number>(0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = locations.indexOf(selectedLocation);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % locations.length;
        onLocationSelect(locations[nextIndex]);
        buttonsRef.current[nextIndex]?.focus();
        currentFocusIndex.current = nextIndex;
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex === 0 ? locations.length - 1 : currentIndex - 1;
        onLocationSelect(locations[prevIndex]);
        buttonsRef.current[prevIndex]?.focus();
        currentFocusIndex.current = prevIndex;
        break;

      case 'Home':
        e.preventDefault();
        onLocationSelect(locations[0]);
        buttonsRef.current[0]?.focus();
        currentFocusIndex.current = 0;
        break;

      case 'End':
        e.preventDefault();
        const lastIndex = locations.length - 1;
        onLocationSelect(locations[lastIndex]);
        buttonsRef.current[lastIndex]?.focus();
        currentFocusIndex.current = lastIndex;
        break;
    }
  };

  // Update focus when selection changes
  useEffect(() => {
    const selectedIndex = locations.indexOf(selectedLocation);
    if (selectedIndex !== -1) {
      currentFocusIndex.current = selectedIndex;
    }
  }, [selectedLocation, locations]);

  if (locations.length <= 1) {
    return null;
  }

  return (
    <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Destinations</h2>
          <span className="text-[10px] sm:text-xs text-muted-foreground" aria-label={`${locations.length} destinations total`}>({locations.length})</span>
        </div>
      </div>

      {/* Destinations - Horizontal scrollable with momentum */}
      <div
        ref={containerRef}
        className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide"
        data-scrollable="horizontal"
        role="tablist"
        aria-label="Select a destination to view"
        onKeyDown={handleKeyDown}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {locations.map((location, index) => {
          const locationData = daysByLocation[location];
          const isSelected = selectedLocation === location;

          return (
            <button
              key={location}
              ref={(el) => { buttonsRef.current[index] = el; }}
              onClick={() => onLocationSelect(location)}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`destination-panel-${index}`}
              aria-label={`${location}, ${locationData.days.length} ${locationData.days.length === 1 ? 'day' : 'days'}, ${isSelected ? 'currently selected' : 'click to select'}`}
              tabIndex={isSelected ? 0 : -1}
              className={`flex-shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all border text-[11px] sm:text-xs min-w-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isSelected
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-muted/50 text-foreground hover:bg-muted border-border'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center ${
                  isSelected ? 'bg-background/20' : 'bg-muted'
                }`} aria-hidden="true">
                  {index + 1}
                </span>
                <div className="text-left">
                  <div className="font-medium truncate max-w-[60px] sm:max-w-none">{location}</div>
                  <div className="text-[8px] sm:text-[9px] opacity-70" aria-hidden="true">
                    {locationData.days.length} {locationData.days.length === 1 ? 'day' : 'days'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const DestinationSwitcher = memo(DestinationSwitcherComponent);