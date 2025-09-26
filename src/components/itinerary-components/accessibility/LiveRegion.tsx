'use client';

import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
  className?: string;
}

/**
 * Live region component for announcing dynamic content changes to screen readers
 * This component provides a way to announce changes that happen dynamically on the page
 */
export function LiveRegion({
  message,
  priority = 'polite',
  clearAfter = 5000,
  className = ''
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!message) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear the message after specified time
    if (clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {message}
    </div>
  );
}

/**
 * Hook to manage live region announcements
 */
export function useLiveAnnouncements() {
  const announcements = useRef<string[]>([]);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove the announcement after it's been read
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);

    // Keep track of announcements for debugging
    announcements.current.push(`[${priority}] ${message}`);
  };

  const announcePolite = (message: string) => announce(message, 'polite');
  const announceAssertive = (message: string) => announce(message, 'assertive');

  return {
    announce,
    announcePolite,
    announceAssertive,
    announcements: announcements.current
  };
}