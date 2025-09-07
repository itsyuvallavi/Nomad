import { motion } from 'framer-motion';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

interface TripActionsProps {
  itinerary: GeneratePersonalizedItineraryOutput;
}

export function TripActions({ itinerary }: TripActionsProps) {
  // Only render tips section
  if (!itinerary.quickTips || itinerary.quickTips.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h3 className="text-white font-medium mb-2">Quick Tips for {itinerary.destination}</h3>
      <div className="space-y-1 text-sm text-slate-300">
        {itinerary.quickTips.map((tip: string, index: number) => (
          <p key={index}>• {tip}</p>
        ))}
      </div>
    </motion.div>
  );
}