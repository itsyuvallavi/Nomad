import { motion } from 'framer-motion';
import { useState } from 'react';
import { EventCard } from './Activity-card';
import { z } from 'genkit';
import { ActivitySchema } from '@/services/ai/schemas/validation.schemas';

type Activity = z.infer<typeof ActivitySchema>;

interface DayItineraryProps {
  day: number;
  date: string;
  activities: Activity[];
  dayIndex: number;
  isLoading?: boolean;
}

export function DayItinerary({ day, date, activities, dayIndex, isLoading = false }: DayItineraryProps) {
  const [isExpanded, setIsExpanded] = useState(dayIndex === 0); // First day expanded by default
  
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

  // Show skeleton loading state
  if (isLoading) {
    return (
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: dayIndex * 0.05 }}
      >
        <div className="flex items-center gap-3 mb-3 py-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-32 animate-pulse mb-1" />
            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 ml-5 pl-8 border-l-2 border-gray-100">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: dayIndex * 0.05 }}
    >
      <div 
        className="flex items-center gap-3 mb-3 cursor-pointer group py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-gray-900 font-semibold text-sm">{day}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-gray-900 font-semibold text-base">Day {day}</h2>
          <p className="text-gray-500 text-xs">{date}</p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 group-hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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
        <div className="space-y-2 ml-6 border-l border-gray-200 pl-6">
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