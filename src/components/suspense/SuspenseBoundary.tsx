'use client';

import React, { Suspense, type ReactNode } from 'react';

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

/**
 * Reusable Suspense boundary with default loading state
 */
export function SuspenseBoundary({ 
  children, 
  fallback,
  name = 'Component'
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-2 text-sm text-gray-600">Loading {name}...</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Page-level suspense boundary with full-screen loading
 */
export function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading page...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * List suspense boundary with skeleton loader
 */
export function ListSuspense({ 
  children, 
  itemCount = 3 
}: { 
  children: ReactNode;
  itemCount?: number;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {Array.from({ length: itemCount }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 rounded-lg h-24"
            />
          ))}
        </div>
      }
    >
      {children}
    </Suspense>
  );
}