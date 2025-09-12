import { useRef, useEffect, TouchEvent } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
}

export function useSwipeGestures(config: SwipeConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultTouchmoveEvent = false,
  } = config;

  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const startTime = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    // Check if the touch started on a horizontally scrollable element
    const target = e.target as HTMLElement;
    const scrollableParent = target.closest('[data-scrollable="horizontal"]');
    
    // If we're touching a horizontally scrollable element, don't track swipe
    if (scrollableParent) {
      startX.current = 0;
      startY.current = 0;
      return;
    }
    
    const firstTouch = e.touches[0];
    startX.current = firstTouch.clientX;
    startY.current = firstTouch.clientY;
    startTime.current = new Date().getTime();
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (preventDefaultTouchmoveEvent) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!startX.current || !startY.current) {
      return;
    }

    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;
    const diffX = startX.current - currentX;
    const diffY = startY.current - currentY;
    const elapsedTime = new Date().getTime() - startTime.current;

    // Only trigger swipe if it's fast enough (less than 300ms)
    if (elapsedTime > 300) {
      return;
    }

    // Determine the predominant direction
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    // Horizontal swipe
    if (absDiffX > absDiffY && absDiffX > threshold) {
      if (diffX > 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }
    // Vertical swipe
    else if (absDiffY > threshold) {
      if (diffY > 0) {
        onSwipeUp?.();
      } else {
        onSwipeDown?.();
      }
    }

    // Reset
    startX.current = 0;
    startY.current = 0;
    startTime.current = 0;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}