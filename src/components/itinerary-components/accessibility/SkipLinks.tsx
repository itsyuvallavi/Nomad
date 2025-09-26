'use client';

import { useEffect, useState } from 'react';

interface SkipLinksProps {
  mainContentId?: string;
  itinerarySectionId?: string;
  destinationsId?: string;
}

export function SkipLinks({
  mainContentId = 'main-content',
  itinerarySectionId = 'itinerary-section',
  destinationsId = 'destinations-section'
}: SkipLinksProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      // Show skip links when focus is on them
      const target = e.target as HTMLElement;
      if (target?.classList?.contains('skip-link')) {
        setIsVisible(true);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Hide skip links when focus leaves
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (!activeElement?.classList?.contains('skip-link')) {
          setIsVisible(false);
        }
      }, 100);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const handleSkipTo = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex gap-2 p-2 bg-white border-b border-gray-200 transform transition-transform ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      role="navigation"
      aria-label="Skip links"
    >
      <a
        href={`#${mainContentId}`}
        className="skip-link px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={(e) => {
          e.preventDefault();
          handleSkipTo(mainContentId);
        }}
      >
        Skip to main content
      </a>

      <a
        href={`#${itinerarySectionId}`}
        className="skip-link px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={(e) => {
          e.preventDefault();
          handleSkipTo(itinerarySectionId);
        }}
      >
        Skip to itinerary
      </a>

      {destinationsId && (
        <a
          href={`#${destinationsId}`}
          className="skip-link px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={(e) => {
            e.preventDefault();
            handleSkipTo(destinationsId);
          }}
        >
          Skip to destinations
        </a>
      )}
    </div>
  );
}