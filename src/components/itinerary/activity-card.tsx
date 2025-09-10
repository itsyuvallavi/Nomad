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
  work: 'bg-blue-100 text-blue-700',
  activity: 'bg-green-100 text-green-700', 
  food: 'bg-orange-100 text-orange-700',
  transport: 'bg-purple-100 text-purple-700'
};

// Using Lucide React icons instead of emojis
const getCategoryIcon = (category: string) => {
  switch(category) {
    case 'work':
      return <Laptop className="w-3 h-3" />;
    case 'activity':
      return <Camera className="w-3 h-3" />;
    case 'food':
      return <Utensils className="w-3 h-3" />;
    case 'transport':
      return <Plane className="w-3 h-3" />;
    default:
      return <Mountain className="w-3 h-3" />;
  }
};

export function EventCard({ title, time, description, address, venue_name, rating, category, index }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      className="relative bg-card border border-border rounded-md p-2 cursor-pointer hover:bg-muted/30 transition-all duration-200 group"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.2, 
        delay: index * 0.03
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-2">
        <div className={`w-6 h-6 ${categoryColors[category]} rounded flex items-center justify-center flex-shrink-0`}>
          {getCategoryIcon(category)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-medium text-xs truncate">{title}</h3>
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">{time}</span>
            </div>
          </div>
          
          {description && description !== title && (
            <p className="text-muted-foreground text-[10px] mt-0.5 line-clamp-1">{description}</p>
          )}
          
          {/* Compact address and venue */}
          {(address || venue_name) && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate flex-1">
                {venue_name || address}
              </span>
              {rating && (
                <span className="text-[10px] text-yellow-600">★{rating.toFixed(1)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}