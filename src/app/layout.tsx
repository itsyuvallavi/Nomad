import type {Metadata, Viewport} from 'next';
import { AuthProvider } from '@/infrastructure/contexts/AuthContext';
import { ErrorBoundary } from '@/infrastructure/components/ErrorBoundary';
import { PasswordGate } from '@/infrastructure/components/PasswordGate';
import { OfflineProvider } from '@/infrastructure/providers/offline';
import { MotionProvider } from '@/infrastructure/providers/motion';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nomad Navigator',
  description: 'Your AI-powered travel planner for digital nomads.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground h-full">
        <ErrorBoundary>
          <PasswordGate>
            <AuthProvider>
              <OfflineProvider>
                <MotionProvider>
                  {children}
                </MotionProvider>
              </OfflineProvider>
            </AuthProvider>
          </PasswordGate>
        </ErrorBoundary>
      </body>
    </html>
  );
}
