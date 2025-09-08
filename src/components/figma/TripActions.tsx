import { motion } from 'framer-motion';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

interface TripActionsProps {
  itinerary: GeneratePersonalizedItineraryOutput;
  selectedLocation?: string;
}

export function TripActions({ itinerary, selectedLocation }: TripActionsProps) {
  // Only render tips section
  // Ensure quickTips is an array
  const tips = Array.isArray(itinerary.quickTips) ? itinerary.quickTips : 
               (typeof itinerary.quickTips === 'object' && itinerary.quickTips?.tips) ? itinerary.quickTips.tips :
               [];
  
  if (!tips || tips.length === 0) {
    return null;
  }

  // Filter tips based on selected location if provided
  const filteredTips = selectedLocation 
    ? tips.filter(tip => 
        typeof tip === 'string' && (
          tip.toLowerCase().includes(selectedLocation.toLowerCase()) ||
          !tip.match(/\b(London|Brussels|Paris|Berlin|Tokyo|Amsterdam|Rome)\b/i) // Include generic tips
        )
      )
    : tips;

  // If no tips for this location, show generic message
  if (filteredTips.length === 0) {
    return (
      <motion.div
        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className="text-white font-medium mb-2">Tips for {selectedLocation || itinerary.destination}</h3>
        <div className="text-sm text-slate-400">
          <p>Enjoy exploring {selectedLocation}! Check local guides for specific recommendations.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h3 className="text-white font-medium mb-2">Quick Tips for {selectedLocation || itinerary.destination}</h3>
      <div className="space-y-1 text-sm text-slate-300">
        {filteredTips.map((tip: string, index: number) => (
          <p key={index}>• {tip}</p>
        ))}
      </div>
    </motion.div>
  );
}