import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  refreshIndicatorHeight?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  refreshIndicatorHeight = 60,
  disabled = false
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
    
    // Only enable pull-to-refresh if at the top of the page
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop === 0) {
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const distance = currentY.current - startY.current;
    
    if (distance > 0) {
      // Prevent default scroll behavior
      e.preventDefault();
      
      // Apply resistance formula for natural feel
      const resistance = Math.min(distance / 3, refreshIndicatorHeight * 1.5);
      setPullDistance(resistance);
    }
  }, [isPulling, disabled, isRefreshing, refreshIndicatorHeight]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled || isRefreshing) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(refreshIndicatorHeight);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, disabled, isRefreshing, onRefresh, refreshIndicatorHeight]);

  useEffect(() => {
    if (disabled) return;
    
    const container = containerRef.current || document.body;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1)
  };
}