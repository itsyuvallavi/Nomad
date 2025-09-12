import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  refreshThreshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  refreshThreshold = 80
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    
    // Only trigger refresh if pulled down past threshold
    if (offset.y > refreshThreshold && !disabled && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        controls.start({ y: 0 });
      }
    } else {
      // Snap back to original position
      setPullDistance(0);
      controls.start({ y: 0 });
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset } = info;
    const newDistance = Math.max(0, Math.min(offset.y, refreshThreshold * 1.5));
    setPullDistance(newDistance);
  };

  const pullProgress = pullDistance / refreshThreshold;
  const shouldTriggerRefresh = pullProgress >= 1;

  return (
    <div ref={containerRef} className="relative h-full overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-background/95 backdrop-blur-sm border-b border-border"
        style={{
          height: Math.min(pullDistance, refreshThreshold),
          opacity: pullDistance > 20 ? 1 : 0
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <motion.div
            animate={{
              rotate: isRefreshing ? 360 : shouldTriggerRefresh ? 180 : pullProgress * 180,
            }}
            transition={{
              rotate: isRefreshing 
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { duration: 0.2 }
            }}
          >
            <RefreshCw 
              size={20} 
              className={`${
                shouldTriggerRefresh 
                  ? 'text-emerald-500' 
                  : pullDistance > 40 
                    ? 'text-blue-500' 
                    : 'text-muted-foreground'
              }`} 
            />
          </motion.div>
          <span className="text-sm font-medium">
            {isRefreshing 
              ? 'Refreshing...' 
              : shouldTriggerRefresh 
                ? 'Release to refresh' 
                : pullDistance > 20 
                  ? 'Pull to refresh' 
                  : ''
            }
          </span>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        className="h-full"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{
          y: isRefreshing ? refreshThreshold : 0
        }}
      >
        <div style={{ paddingTop: Math.min(pullDistance, refreshThreshold) }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}