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

export function EventCard({ title, time, description, address, venue_name, rating, category, index }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Minimal category indicator - just a subtle left border
  const categoryAccents = {
    work: 'border-l-blue-600',
    activity: 'border-l-gray-600', 
    food: 'border-l-green-600',
    transport: 'border-l-purple-600'
  };

  return (
    <motion.div
      className={`relative bg-white border border-gray-200 rounded-sm pl-3 pr-3 py-3 cursor-pointer hover:bg-gray-50 transition-all duration-200 group ${categoryAccents[category]} border-l-2`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.2, 
        delay: index * 0.02
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-4">
        {/* Time - more prominent and readable */}
        <div className="flex-shrink-0 w-12 text-right">
          <span className="text-sm font-medium text-gray-900">{time.split(' - ')[0]}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Title - clear hierarchy */}
          <h3 className="text-sm font-medium text-gray-900 leading-tight">{title}</h3>
          
          {/* Description - only if different from title */}
          {description && description !== title && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{description}</p>
          )}
          
          {/* Location - simplified */}
          {(venue_name || address) && (
            <p className="text-xs text-gray-400 mt-1.5">
              {venue_name || address}
              {rating && rating > 0 && (
                <span className="ml-2 text-gray-500">
                  {rating.toFixed(1)}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}