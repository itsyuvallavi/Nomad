import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface DayTimelineProps {
  totalDays: number;
  selectedDay: number;
  onDaySelect: (day: number) => void;
  location?: string;
  dates?: string[];
}

export function DayTimelineV2({ totalDays, selectedDay, onDaySelect, location, dates }: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Auto-scroll to selected day
  useEffect(() => {
    if (scrollRef.current) {
      const selectedButton = scrollRef.current.querySelector(`[data-day="${selectedDay}"]`);
      if (selectedButton) {
        selectedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDay]);

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
      const date = new Date(dates[day - 1]);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '';
  };

  return (
    <div className="w-full bg-background/50 backdrop-blur-sm border-b border-border">
      <div className="px-4 py-3">
        {/* Location Header - simplified */}
        {location && (
          <div className="mb-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{location}</h3>
          </div>
        )}

        {/* Timeline Container */}
        <div className="relative">
          {/* Scroll Buttons */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center transition-opacity"
              >
                <ChevronLeft className="w-3 h-3" />
              </motion.button>
            )}
            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center transition-opacity"
              >
                <ChevronRight className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Days Container - smaller and more minimal */}
          <div 
            ref={scrollRef}
            className="flex items-center gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
            onScroll={checkScroll}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isSelected = day === selectedDay;
              const isPast = day < selectedDay;
              
              return (
                <motion.button
                  key={day}
                  data-day={day}
                  onClick={() => onDaySelect(day)}
                  className="relative flex-shrink-0 group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Minimal day indicator */}
                  <div className="flex flex-col items-center gap-2">
                    {/* Day number circle */}
                    <motion.div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        text-sm font-medium transition-all duration-200
                        ${isSelected 
                          ? 'bg-gray-900 text-white' 
                          : isPast
                          ? 'bg-gray-200 text-gray-600'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
                        }
                      `}
                      animate={{
                        scale: isSelected ? 1 : 0.9,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {day}
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
        <div className="mt-4">
          <div className="h-px bg-gray-200 relative">
            <motion.div 
              className="absolute top-0 left-0 h-px bg-gray-900"
              initial={{ width: 0 }}
              animate={{ width: `${((selectedDay - 1) / (totalDays - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
          <div className="flex justify-between mt-1">
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