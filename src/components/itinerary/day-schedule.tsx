import { motion } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EventCard } from './activity-card';
import { z } from 'genkit';
import { ActivitySchema } from '@/ai/schemas';

type Activity = z.infer<typeof ActivitySchema>;

interface DayItineraryProps {
  day: number;
  date: string;
  activities: Activity[];
  dayIndex: number;
}

export function DayItinerary({ day, date, activities, dayIndex }: DayItineraryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const getCategoryFromActivity = (activity: Activity): 'work' | 'activity' | 'food' | 'transport' => {
    const lowerDesc = activity.description.toLowerCase();
    const category = activity.category.toLowerCase();
    
    if (category === 'food' || lowerDesc.includes('breakfast') || lowerDesc.includes('lunch') || 
        lowerDesc.includes('dinner') || lowerDesc.includes('restaurant') || lowerDesc.includes('cafe')) {
      return 'food';
    }
    if (category === 'travel' || lowerDesc.includes('flight') || lowerDesc.includes('train') || 
        lowerDesc.includes('bus') || lowerDesc.includes('transport') || 
        lowerDesc.includes('arrival') || lowerDesc.includes('departure')) {
      return 'transport';
    }
    if (category === 'work' || lowerDesc.includes('work') || lowerDesc.includes('cowork')) {
      return 'work';
    }
    return 'activity';
  };

  return (
    <motion.div
      className="mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: dayIndex * 0.05 }}
    >
      <div 
        className="flex items-center gap-2 mb-2 cursor-pointer group py-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-7 h-7 bg-muted rounded-md flex items-center justify-center">
          <span className="text-foreground font-medium text-xs">{day}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-foreground font-medium text-sm">Day {day}</h2>
          <p className="text-muted-foreground text-[10px]">{date}</p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground group-hover:text-foreground transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </div>
      
      <motion.div
        initial={false}
        animate={{ 
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="space-y-1.5 ml-2 border-l border-border pl-3">
          {activities.map((activity, index) => (
            <EventCard
              key={`${day}-${index}`}
              title={activity.description}
              time={activity.time}
              description={activity.description}
              address={activity.address || ''}
              venue_name={(activity as any).venue_name}
              rating={(activity as any).rating}
              category={getCategoryFromActivity(activity)}
              index={index}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}