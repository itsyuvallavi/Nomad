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
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: dayIndex * 0.1, ease: "easeOut" }}
    >
      <div 
        className="flex items-center gap-2 mb-3 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
          <span className="text-white font-medium text-sm">{day}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-white font-medium text-sm">Day {day}</h2>
          <p className="text-slate-400 text-xs">{date}</p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 group-hover:text-white transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>
      
      <motion.div
        initial={false}
        animate={{ 
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="space-y-2 ml-2 md:ml-4 border-l-2 border-slate-600 pl-3 md:pl-4">
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