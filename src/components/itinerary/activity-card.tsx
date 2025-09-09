import { 
  MapPin, 
  Clock, 
  ExternalLink, 
  Laptop,
  Camera,
  Utensils,
  Plane,
  Train,
  Building,
  Mountain,
  ShoppingBag,
  Coffee
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface EventCardProps {
  title: string;
  time: string;
  description: string;
  address: string;
  venue_name?: string;
  rating?: number;
  category: 'work' | 'activity' | 'food' | 'transport';
  index: number;
}

const categoryColors = {
  work: 'from-blue-500 to-blue-600',
  activity: 'from-green-500 to-green-600', 
  food: 'from-orange-500 to-orange-600',
  transport: 'from-purple-500 to-purple-600'
};

// Using Lucide React icons instead of emojis
const getCategoryIcon = (category: string) => {
  switch(category) {
    case 'work':
      return <Laptop className="w-5 h-5" />;
    case 'activity':
      return <Camera className="w-5 h-5" />;
    case 'food':
      return <Utensils className="w-5 h-5" />;
    case 'transport':
      return <Plane className="w-5 h-5" />;
    default:
      return <Mountain className="w-5 h-5" />;
  }
};

export function EventCard({ title, time, description, address, venue_name, rating, category, index }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-slate-700/70 transition-colors"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${categoryColors[category]} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
          {getCategoryIcon(category)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-medium truncate">{title}</h3>
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <Clock className="w-3 h-3" />
              <span>{time}</span>
            </div>
          </div>
          
          {description && description !== title && (
            <p className="text-slate-300 text-sm mb-2">{description}</p>
          )}
          
          {/* Show venue name and rating if from Google Places */}
          {venue_name && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400 text-sm font-medium">{venue_name}</span>
              {rating && (
                <span className="text-yellow-400 text-sm">
                  {'★'.repeat(Math.round(rating))}
                  <span className="text-slate-400 ml-1">({rating})</span>
                </span>
              )}
            </div>
          )}
          
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-slate-600">
              <div className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{address}</span>
                {address && (
                  <button 
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}