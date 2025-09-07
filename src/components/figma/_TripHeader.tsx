import { MapPin, Calendar, DollarSign, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface TripHeaderProps {
  destination: string;
  dates: string;
  budget: string;
  travelers: number;
}

export function TripHeader({ destination, dates, budget, travelers }: TripHeaderProps) {
  return (
    <motion.div 
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white text-2xl font-medium">{destination}</h1>
          <p className="text-slate-400">AI-generated itinerary for digital nomads</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">{dates}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <DollarSign className="w-4 h-4" />
          <span className="text-sm">{budget}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Users className="w-4 h-4" />
          <span className="text-sm">{travelers} traveler{travelers > 1 ? 's' : ''}</span>
        </div>
      </div>
    </motion.div>
  );
}