'use client';

import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import ItineraryEventCard from './itinerary-event-card';

type DailyPlan = GeneratePersonalizedItineraryOutput['itinerary'][0];

type ItineraryDailyViewProps = {
  dailyPlans: DailyPlan[];
};

const ItineraryDailyView = ({ dailyPlans }: ItineraryDailyViewProps) => {
  if (!dailyPlans || dailyPlans.length === 0) {
    return <p className="text-slate-400 text-center py-8">No itinerary available.</p>;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return {
      weekday: adjustedDate.toLocaleDateString('en-US', { weekday: 'long' }),
      date: adjustedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    };
  };

  return (
    <div className="space-y-6">
      {dailyPlans.map((plan, dayIndex) => {
        const { weekday, date } = formatDate(plan.date);
        return (
          <div key={plan.day} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
               <div className="w-8 h-8 bg-slate-700/80 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-base">{plan.day}</span>
                </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{weekday}</h3>
                <p className="text-slate-400 text-sm">{date}</p>
              </div>
            </div>

            <div className="space-y-3 ml-4 pl-7 border-l-2 border-slate-700">
              {plan.activities.map((activity, eventIndex) => (
                <ItineraryEventCard key={eventIndex} activity={activity} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  );
};

export default ItineraryDailyView;
