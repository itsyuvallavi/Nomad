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
      className="relative bg-gradient-to-br from-slate-800/60 to-slate-700/60 backdrop-blur-md rounded-lg p-3 cursor-pointer border border-slate-600/40 shadow-md hover:shadow-lg hover:border-slate-500/60 transition-all duration-300 group overflow-hidden"
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      whileHover={{ 
        scale: 1.02, 
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" } 
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.08,
        ease: [0.4, 0, 0.2, 1]
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Gradient Overlay on Hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
        initial={false}
      />
      <div className="flex items-start gap-3">
        <motion.div 
          className={`w-8 h-8 bg-gradient-to-br ${categoryColors[category]} rounded-md flex items-center justify-center text-white flex-shrink-0 shadow-md relative overflow-hidden`}
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="scale-75">{getCategoryIcon(category)}</div>
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-white font-medium truncate text-sm">{title}</h3>
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <Clock className="w-3 h-3" />
              <span>{time}</span>
            </div>
          </div>
          
          {description && description !== title && (
            <p className="text-slate-300 text-xs mb-1.5 line-clamp-2">{description}</p>
          )}
          
          {/* Show venue name and rating if from Google Places */}
          {venue_name && (
            <motion.div 
              className="flex items-center gap-2 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-blue-400 text-xs font-medium bg-blue-400/10 px-1.5 py-0.5 rounded-full">{venue_name}</span>
              {rating && (
                <span className="text-yellow-400 text-xs flex items-center gap-1">
                  <motion.span
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, delay: index * 0.1 }}
                  >
                    ★
                  </motion.span>
                  {rating.toFixed(1)}
                </span>
              )}
            </motion.div>
          )}
          
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1.5 border-t border-slate-600/50">
              <div className="flex items-start gap-2 text-slate-400 text-xs">
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