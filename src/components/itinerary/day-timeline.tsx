import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface DayTimelineProps {
  totalDays: number;
  selectedDay: number;
  onDaySelect: (day: number) => void;
  location?: string;
}

export function DayTimeline({ totalDays, selectedDay, onDaySelect, location }: DayTimelineProps) {
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    // Calculate progress width based on selected day
    const progress = ((selectedDay - 1) / (totalDays - 1)) * 100;
    setProgressWidth(progress);
  }, [selectedDay, totalDays]);

  return (
    <div className="w-full px-6 py-4">
      {/* Location label if provided */}
      {location && (
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground">{location}</p>
        </div>
      )}
      
      {/* Timeline Container */}
      <div className="relative">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-border -translate-y-1/2" />
        
        {/* Progress Line */}
        <motion.div 
          className="absolute top-1/2 left-0 h-[2px] bg-orange-500 -translate-y-1/2 z-10"
          initial={{ width: 0 }}
          animate={{ width: `${progressWidth}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
        
        {/* Day Markers */}
        <div className="relative flex justify-between">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const isSelected = day === selectedDay;
            const isPast = day < selectedDay;
            const isFirst = day === 1;
            const isLast = day === totalDays;
            
            return (
              <motion.button
                key={day}
                onClick={() => onDaySelect(day)}
                className={`relative z-20 flex flex-col items-center group ${
                  isFirst ? 'items-start' : isLast ? 'items-end' : 'items-center'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Circle Marker */}
                <motion.div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isSelected 
                      ? 'bg-orange-500 border-orange-500' 
                      : isPast
                      ? 'bg-orange-100 border-orange-500'
                      : 'bg-background border-border hover:border-muted-foreground'
                  }`}
                  initial={false}
                  animate={{
                    scale: isSelected ? 1.2 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <span className={`text-xs font-bold ${
                    isSelected ? 'text-white' : isPast ? 'text-orange-600' : 'text-foreground'
                  }`}>
                    {day}
                  </span>
                </motion.div>
                
                {/* Day Label */}
                <motion.span 
                  className={`mt-2 text-xs font-medium transition-colors duration-300 ${
                    isSelected 
                      ? 'text-orange-500' 
                      : isPast 
                      ? 'text-orange-400' 
                      : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                  initial={false}
                  animate={{
                    fontWeight: isSelected ? 700 : 400,
                  }}
                >
                  Day {day}
                </motion.span>
                
                {/* Selected Indicator */}
                {isSelected && (
                  <motion.div
                    className="absolute -bottom-8 w-12 h-1 bg-orange-500 rounded-full"
                    layoutId="selectedIndicator"
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}