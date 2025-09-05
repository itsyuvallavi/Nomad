'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Plane } from 'lucide-react';

const loadingMessages = [
  'Scouting the best photo spots...',
  'Finding the tastiest local eats...',
  'Packing your virtual bags...',
  'Asking locals for hidden gems...',
  'Booking your window seat...',
  'Translating the menu for you...',
  'Checking the weather forecast...',
  'Applying virtual sunscreen...',
];

export default function ItineraryLoader() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(
        prevIndex => (prevIndex + 1) % loadingMessages.length
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="shadow-lg flex flex-col items-center justify-center text-center p-8 min-h-[400px] bg-slate-800/50 border-slate-700">
      <div className="relative">
        <Plane className="h-16 w-16 text-slate-400 animate-fly" />
      </div>
      <p className="mt-6 text-lg font-semibold text-white transition-opacity duration-500">
        {loadingMessages[currentMessageIndex]}
      </p>
      <p className="text-sm text-slate-400 mt-2">
        Your adventure is being crafted...
      </p>
      <style jsx>{`
        @keyframes fly {
          0% {
            transform: translateX(-100px) translateY(20px) rotate(-20deg);
            opacity: 0;
          }
          20% {
            transform: translateX(0) translateY(0) rotate(0deg);
            opacity: 1;
          }
          80% {
            transform: translateX(0) translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateX(100px) translateY(-20px) rotate(20deg);
            opacity: 0;
          }
        }
        .animate-fly {
          animation: fly 2s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
