import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
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

  // Get shortened day labels
  const getDayLabel = (day: number) => {
    if (dates && dates[day - 1]) {
      const date = new Date(dates[day - 1]);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return `Day ${day}`;
  };

  const getDateLabel = (day: number) => {
    if (dates && dates[day - 1]) {
      const date = new Date(dates[day - 1]);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '';
  };

  return (
    <div className="w-full bg-background/50 backdrop-blur-sm border-y border-border">
      <div className="px-4 py-4">
        {/* Location Header */}
        {location && (
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-foreground">{location}</h3>
          </div>
        )}

        {/* Timeline Container */}
        <div className="relative">
          {/* Scroll Buttons */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-background/90 backdrop-blur-sm border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
            )}
            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-background/90 backdrop-blur-sm border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Days Container */}
          <div 
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
            onScroll={checkScroll}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isSelected = day === selectedDay;
              const isPast = day < selectedDay;
              const isFuture = day > selectedDay;
              
              return (
                <motion.button
                  key={day}
                  data-day={day}
                  onClick={() => onDaySelect(day)}
                  className="relative flex-shrink-0 group"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Card */}
                  <motion.div
                    className={`
                      relative w-20 h-20 rounded-xl border-2 transition-all duration-300
                      flex flex-col items-center justify-center gap-1 cursor-pointer
                      ${isSelected 
                        ? 'bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/20' 
                        : isPast
                        ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                        : 'bg-background border-border hover:border-muted-foreground hover:bg-muted/50'
                      }
                    `}
                    layout
                    initial={false}
                    animate={{
                      scale: isSelected ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Day Number */}
                    <span className={`text-2xl font-bold ${
                      isSelected ? 'text-white' : isPast ? 'text-orange-600' : 'text-foreground'
                    }`}>
                      {day}
                    </span>
                    
                    {/* Day Label */}
                    <span className={`text-[10px] font-medium ${
                      isSelected ? 'text-white/90' : 'text-muted-foreground'
                    }`}>
                      {getDayLabel(day)}
                    </span>

                    {/* Date */}
                    {getDateLabel(day) && (
                      <span className={`text-[9px] ${
                        isSelected ? 'text-white/70' : 'text-muted-foreground/70'
                      }`}>
                        {getDateLabel(day)}
                      </span>
                    )}

                    {/* Selected Indicator Dot */}
                    {isSelected && (
                      <motion.div
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full"
                        layoutId="selectedDot"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30
                        }}
                      />
                    )}

                    {/* Completed Check (for past days) */}
                    {isPast && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Connection Line (except for last day) */}
                  {day < totalDays && (
                    <div className={`absolute top-1/2 -right-2 w-2 h-0.5 -translate-y-1/2 ${
                      isPast || (day === selectedDay - 1) ? 'bg-orange-300' : 'bg-border'
                    }`} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 relative">
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((selectedDay - 1) / (totalDays - 1)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">Start</span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Day {selectedDay} of {totalDays}
            </span>
            <span className="text-[10px] text-muted-foreground">End</span>
          </div>
        </div>
      </div>
    </div>
  );
}