import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, memo } from 'react';
import { parseLocalDate } from '@/lib/utils/date-helpers';

interface DayTimelineProps {
  totalDays: number;
  selectedDay: number;
  onDaySelect: (day: number) => void;
  location?: string;
  dates?: string[];
}

function DayTimelineV2Component({ totalDays, selectedDay, onDaySelect, location, dates }: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Check scroll position for arrow visibility
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [totalDays]);

  // Auto-scroll to selected day (only when day changes, not on mount)
  const [hasMounted, setHasMounted] = useState(false);
  const [isUserInteraction, setIsUserInteraction] = useState(false);
  
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      return;
    }
    
    // Only scroll if this was triggered by user interaction (clicking a day)
    if (scrollRef.current && isUserInteraction) {
      const selectedButton = scrollRef.current.querySelector(`[data-day="${selectedDay}"]`);
      if (selectedButton) {
        selectedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    
    // Reset the flag after scrolling
    if (isUserInteraction) {
      setIsUserInteraction(false);
    }
  }, [selectedDay, hasMounted, isUserInteraction]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getDateLabel = (day: number) => {
    if (dates && dates[day - 1]) {
      const date = parseLocalDate(dates[day - 1]);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '';
  };

  // Handle keyboard navigation for day selection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, day: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (day < totalDays) {
          onDaySelect(day + 1);
          buttonsRef.current[day]?.focus();
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (day > 1) {
          onDaySelect(day - 1);
          buttonsRef.current[day - 2]?.focus();
        }
        break;

      case 'Home':
        e.preventDefault();
        onDaySelect(1);
        buttonsRef.current[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        onDaySelect(totalDays);
        buttonsRef.current[totalDays - 1]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        onDaySelect(day);
        // Scroll to the selected day in the itinerary
        const daySection = document.getElementById(`day-${day}`);
        if (daySection) {
          daySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
    }
  };

  return (
    <div className="w-full">
      <div className="px-4 py-4">
        {/* Location Header - show current destination */}
        {location && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground" aria-label={`Current location: ${location}`}>
              {location}
            </span>
          </div>
        )}

        {/* Timeline Container */}
        <div className="relative">
          {/* Scroll Buttons */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                key="scroll-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                onClick={() => scroll('left')}
                className="absolute -left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center transition-opacity shadow-sm"
                aria-label="Scroll days left"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </motion.button>
            )}
            {canScrollRight && (
              <motion.button
                key="scroll-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                onClick={() => scroll('right')}
                className="absolute -right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center transition-opacity shadow-sm"
                aria-label="Scroll days right"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Days Container - fixed height to prevent vertical scroll, adequate height for content */}
          <div
            ref={scrollRef}
            data-scrollable="horizontal"
            className="flex items-center gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide-mobile momentum-scroll py-2"
            onScroll={checkScroll}
            role="tablist"
            aria-label={`Select day from ${totalDays} days`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              minHeight: '90px',
              maxHeight: '90px'
            }}
          >
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isSelected = day === selectedDay;
              const isPast = day < selectedDay;
              
              return (
                <motion.button
                  key={day}
                  ref={(el) => { buttonsRef.current[day - 1] = el; }}
                  data-day={day}
                  onClick={() => onDaySelect(day)}
                  onKeyDown={(e) => handleKeyDown(e, day)}
                  className="relative flex-shrink-0 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`day-panel-${day}`}
                  aria-label={`Day ${day}${getDateLabel(day) ? `, ${getDateLabel(day)}` : ''}${isSelected ? ', currently selected' : ''}`}
                  tabIndex={isSelected ? 0 : -1}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Minimal day indicator */}
                  <div className="flex flex-col items-center gap-2">
                    {/* Day number circle with shadow hover effect */}
                    <motion.div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        text-sm font-medium transition-all duration-200 relative
                        ${isSelected 
                          ? 'bg-gray-900 text-white shadow-lg' 
                          : isPast
                          ? 'bg-gray-200 text-gray-600 hover:shadow-md'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-500 hover:shadow-md hover:bg-gray-50'
                        }
                      `}
                      animate={{
                        scale: isSelected ? 1 : 0.9,
                      }}
                      whileHover={{
                        y: -2,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <span aria-hidden="true">{day}</span>
                      {/* Glow effect on hover for non-selected days */}
                      {!isSelected && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-gray-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ filter: 'blur(8px)' }}
                          aria-hidden="true"
                        />
                      )}
                    </motion.div>
                    
                    {/* Date label - only if selected */}
                    <AnimatePresence>
                      {isSelected && getDateLabel(day) && (
                        <motion.span
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-[10px] text-gray-600 font-medium absolute -bottom-4"
                        >
                          {getDateLabel(day)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Connection line - thinner and more subtle */}
                  {day < totalDays && (
                    <div 
                      className={`absolute top-1/2 left-12 w-4 h-px -translate-y-1/2 transition-colors duration-200 ${
                        isPast ? 'bg-gray-400' : 'bg-gray-200'
                      }`} 
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Minimal progress indicator */}
        <div className="mt-4" aria-label={`Progress: Day ${selectedDay} of ${totalDays}`}>
          <div className="h-px bg-gray-200 relative" role="progressbar" aria-valuenow={selectedDay} aria-valuemin={1} aria-valuemax={totalDays}>
            <motion.div
              className="absolute top-0 left-0 h-px bg-gray-900"
              initial={{ width: 0 }}
              animate={{ width: `${((selectedDay - 1) / (totalDays - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
          <div className="flex justify-between mt-1" aria-hidden="true">
            <span className="text-[9px] text-gray-400">Day 1</span>
            <span className="text-[9px] text-gray-600 font-medium">
              {selectedDay} / {totalDays}
            </span>
            <span className="text-[9px] text-gray-400">Day {totalDays}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DayTimelineV2 = memo(DayTimelineV2Component);