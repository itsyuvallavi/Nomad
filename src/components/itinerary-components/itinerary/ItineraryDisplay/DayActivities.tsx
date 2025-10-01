'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { formatFullDate } from '@/lib/utils/date-helpers';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface Activity {
  time: string;
  description: string;
  category?: string;
  address?: string;
  venue_name?: string;
  rating?: number;
  _tips?: string[];
}

interface Day {
  day: number;
  date: string;
  title: string;
  activities: Activity[];
  weather?: string;
}

interface DayActivitiesProps {
  selectedDay: Day;
}

const DayActivitiesComponent: React.FC<DayActivitiesProps> = ({ selectedDay }) => {
  return (
    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
      <motion.div
        key={`day-${selectedDay.day}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
      >
        {/* Day Header - Mobile optimized */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Day {selectedDay.day}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {formatFullDate(selectedDay.date)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Activities</p>
            <p className="text-base sm:text-lg font-medium text-gray-900">{selectedDay.activities.length}</p>
          </div>
        </div>

        {/* Activities Grid - Responsive spacing */}
        <div className="space-y-2 sm:space-y-3">
          {selectedDay.activities.map((activity: Activity, index: number) => (
            <motion.div
              key={`activity-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.08,
                ease: [0.4, 0.0, 0.2, 1]
              }}
            >
              <motion.div
                className="group relative bg-background border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md sm:hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                whileHover={{ y: -2 }}
              >
                {/* Subtle hover background */}
                <div className="absolute inset-0 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                <div className="relative flex gap-2 sm:gap-3">
                  {/* Minimal time display - Hidden on very small screens */}
                  <div className="hidden xs:block flex-shrink-0 w-10 sm:w-12 text-right">
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                      {activity.time.split(' - ')[0]}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2">
                          {activity.description}
                        </h4>
                        {activity.address && (
                          <div className="flex items-center gap-1 mt-1 sm:mt-2">
                            <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground flex-shrink-0" />
                            <p className="text-[11px] sm:text-sm text-muted-foreground truncate">{activity.address}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {activity.time}
                          </span>
                          {activity.category && (
                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                              {activity.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Activity Number - Smaller on mobile */}
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// Wrap DayActivities with error boundary for each activity rendering
const DayActivitiesWithErrorBoundary = memo((props: DayActivitiesProps) => {
  return (
    <ErrorBoundary
      level="section"
      resetKeys={[props.selectedDay.day]}
      onError={(error) => {
        console.error('DayActivities rendering error:', error);
      }}
    >
      <DayActivitiesComponent {...props} />
    </ErrorBoundary>
  );
});

DayActivitiesWithErrorBoundary.displayName = 'DayActivities';

export const DayActivities = DayActivitiesWithErrorBoundary;