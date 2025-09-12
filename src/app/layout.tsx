import type {Metadata} from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PasswordGate } from '@/components/PasswordGate';
import { OfflineProvider } from '@/components/providers/offline-provider';
import { MotionProvider } from '@/components/providers/motion-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nomad Navigator',
  description: 'Your AI-powered travel planner for digital nomads.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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
      <body className="font-body antialiased bg-background text-foreground h-full overflow-hidden">
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
