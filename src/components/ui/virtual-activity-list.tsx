'use client';

import { useRef, useCallback, memo } from 'react';
import { FixedSizeList } from 'react-window';
import { Clock, MapPin, DollarSign, Star, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMotion } from '@/components/providers/motion-provider';
import type { Activity } from '@/ai/schemas';

interface VirtualActivityListProps {
  activities: Activity[];
  className?: string;
  estimatedItemHeight?: number;
  overscan?: number;
  onActivityClick?: (activity: Activity) => void;
}

// Memoized activity item component
const ActivityItem = memo(({ 
  activity, 
  style, 
  onActivityClick 
}: { 
  activity: Activity; 
  style: React.CSSProperties;
  onActivityClick?: (activity: Activity) => void;
}) => {
  const { motion, isLoaded, shouldAnimate } = useMotion();
  const MotionDiv = isLoaded && shouldAnimate && motion ? motion.div : 'div';
  
  return (
    <div style={style} className="px-3 sm:px-4">
      <MotionDiv
        {...(isLoaded && shouldAnimate ? {
          initial: { opacity: 0, x: -20 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.3 }
        } : {})}
        className={cn(
          "bg-card rounded-lg border p-3 sm:p-4 mb-2 sm:mb-3",
          "hover:shadow-md transition-shadow cursor-pointer",
          "touch-manipulation" // Optimize for touch
        )}
        onClick={() => onActivityClick?.(activity)}
      >
        {/* Activity Time */}
        {activity.time && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{activity.time}</span>
          </div>
        )}

        {/* Activity Name/Description */}
        <h4 className="font-semibold text-base sm:text-lg mb-2">
          {activity.venue_name || activity.description}
        </h4>

        {/* Activity Description */}
        {activity.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* Activity Metadata */}
        <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
          {activity.address && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{activity.address}</span>
            </div>
          )}
          
          {activity.rating && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              <span>{activity.rating}</span>
            </div>
          )}
        </div>

        {/* Tips or additional info */}
        {activity._tips && (
          <div className="mt-3 p-2 bg-muted/50 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">{activity._tips}</p>
            </div>
          </div>
        )}
      </MotionDiv>
    </div>
  );
});

ActivityItem.displayName = 'ActivityItem';

export function VirtualActivityList({
  activities,
  className,
  estimatedItemHeight = 150,
  overscan = 3,
  onActivityClick
}: VirtualActivityListProps) {
  const listRef = useRef<FixedSizeList>(null);

  // Row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const activity = activities[index];
    
    return (
      <ActivityItem
        activity={activity}
        style={style}
        onActivityClick={onActivityClick}
      />
    );
  }, [activities, onActivityClick]);

  // Get container height
  const containerHeight = typeof window !== 'undefined' 
    ? window.innerHeight - 200 // Adjust based on header/footer
    : 600;

  return (
    <div className={cn("relative", className)}>
      <FixedSizeList
        ref={listRef}
        height={containerHeight}
        itemCount={activities.length}
        itemSize={estimatedItemHeight}
        width="100%"
        overscanCount={overscan}
        className="scrollbar-hide-mobile momentum-scroll"
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}

// Hook for managing virtual list state
export function useVirtualActivityList(activities: Activity[]) {
  const scrollToActivity = useCallback((index: number) => {
    // Implementation for scrolling to specific activity
    const element = document.querySelector(`[data-activity-index="${index}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const getVisibleRange = useCallback(() => {
    // Get currently visible activities range
    const container = document.querySelector('.virtual-activity-list');
    if (!container) return { start: 0, end: 0 };
    
    const { top, bottom } = container.getBoundingClientRect();
    let start = 0;
    let end = activities.length - 1;
    
    // Calculate visible range based on scroll position
    // This is a simplified implementation
    return { start, end };
  }, [activities.length]);

  return {
    scrollToActivity,
    getVisibleRange
  };
}