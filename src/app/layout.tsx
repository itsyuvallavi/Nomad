import type {Metadata} from 'next';
// import { UserProvider } from '@auth0/nextjs-auth0/client'; // Disabled - using mock auth
import './globals.css';

export const metadata: Metadata = {
  title: 'Nomad Navigator',
  description: 'Your AI-powered travel planner for digital nomads.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Satoshi:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
        {children}
      </body>
    </html>
  );
}
