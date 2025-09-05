'use client';

import {
  Briefcase,
  Camera,
  Coffee,
  Utensils,
  Plane,
  Bed,
  MapPin,
} from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';

type Activity = GeneratePersonalizedItineraryOutput['itinerary'][0]['activities'][0];

const categoryIcons = {
  Work: <Briefcase className="h-5 w-5" />,
  Leisure: <Camera className="h-5 w-5" />,
  Food: <Utensils className="h-5 w-5" />,
  Travel: <Plane className="h-5 w-5" />,
  Accommodation: <Bed className="h-5 w-5" />,
  Default: <Coffee className="h-5 w-5" />,
};

const getCategoryIcon = (category: Activity['category']) => {
  return categoryIcons[category] || categoryIcons.Default;
};

type ItineraryDailyViewProps = {
  dailyPlans: GeneratePersonalizedItineraryOutput['itinerary'];
};

const ItineraryDailyView = ({ dailyPlans }: ItineraryDailyViewProps) => {
  if (!dailyPlans || dailyPlans.length === 0) {
    return <p className="text-slate-400 text-center py-8">No itinerary available.</p>;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Adjust for timezone differences
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return {
      weekday: adjustedDate.toLocaleDateString('en-US', { weekday: 'long' }),
      date: adjustedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };
  };

  return (
    <div className="space-y-8">
      {dailyPlans.map((plan, dayIndex) => {
        const { weekday, date } = formatDate(plan.date);
        return (
          <div key={plan.day}>
            {/* Day Header */}
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="text-xl font-semibold text-white">{weekday}</h3>
              <p className="text-slate-400">{date}</p>
            </div>

            {/* Timeline */}
            <div className="space-y-6 border-l-2 border-slate-700 ml-3">
              {plan.activities.map((activity, eventIndex) => (
                <div key={eventIndex} className="relative pl-8">
                  {/* Dot on the timeline */}
                  <div className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full bg-slate-600 border-2 border-slate-800"></div>
                  
                  {/* Dotted line for travel time */}
                  {activity.travelTime && (
                     <div className="absolute -left-0 top-[-24px] h-[24px] w-[2px] bg-transparent">
                       <div className="h-full w-full border-l-2 border-dashed border-slate-600"></div>
                     </div>
                  )}

                  <p className="font-semibold text-slate-300 text-sm">{activity.time}</p>
                  <div className="flex items-start gap-4 mt-1">
                    <div className="text-white mt-1 p-2 bg-slate-700/50 rounded-lg">
                      {getCategoryIcon(activity.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{activity.description}</h4>
                      <p className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                          <MapPin className="h-4 w-4" />
                          <span>{activity.address}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  );
};

export default ItineraryDailyView;
