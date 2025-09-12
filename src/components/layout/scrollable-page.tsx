'use client';

import { ReactNode } from 'react';

interface ScrollablePageProps {
  children: ReactNode;
}

export function ScrollablePage({ children }: ScrollablePageProps) {
  return (
    <div className="fixed inset-0 overflow-y-auto">
      {children}
    </div>
  );
}