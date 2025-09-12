'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ 
  children, 
  onRefresh, 
  className,
  disabled = false 
}: PullToRefreshProps) {
  const { 
    containerRef, 
    pullDistance, 
    pullProgress,
    isRefreshing 
  } = usePullToRefresh({
    onRefresh,
    disabled
  });

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className={cn(
          "absolute left-0 right-0 top-0 z-50 flex items-center justify-center transition-all duration-300",
          "bg-gradient-to-b from-background to-transparent pointer-events-none"
        )}
        style={{
          height: `${pullDistance}px`,
          opacity: pullProgress,
          transform: `translateY(-${pullDistance}px)`
        }}
      >
        <div className="flex items-center justify-center py-4">
          <RefreshCw 
            className={cn(
              "h-6 w-6 text-muted-foreground transition-transform duration-300",
              isRefreshing && "animate-spin",
              pullProgress >= 1 && !isRefreshing && "text-primary scale-110"
            )}
            style={{
              transform: !isRefreshing ? `rotate(${pullProgress * 180}deg)` : undefined
            }}
          />
          {isRefreshing && (
            <span className="ml-2 text-sm text-muted-foreground">
              Refreshing...
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div 
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isRefreshing ? 'transform 0.3s' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}