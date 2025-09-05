'use client';
import {
  Briefcase,
  Camera,
  Coffee,
  Utensils,
  Plane,
  Bed,
} from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

type Activity = GeneratePersonalizedItineraryOutput['itinerary'][0]['activities'][0];

const categoryIcons: { [key in Activity['category'] | 'Default']: JSX.Element } = {
  Work: <Briefcase className="h-4 w-4" />,
  Leisure: <Camera className="h-4 w-4" />,
  Food: <Utensils className="h-4 w-4" />,
  Travel: <Plane className="h-4 w-4" />,
  Accommodation: <Bed className="h-4 w-4" />,
  Default: <Coffee className="h-4 w-4" />,
};

const getCategoryIcon = (category: Activity['category']) => {
  return categoryIcons[category] || categoryIcons.Default;
};


const ItineraryWeeklyView = ({ dailyPlans }: { dailyPlans: GeneratePersonalizedItineraryOutput['itinerary'] }) => {
  if (!dailyPlans || dailyPlans.length === 0) {
    return <p className="text-slate-400 text-center py-8">No itinerary to display.</p>;
  }

  // Create a map of dates to plans
  const plansByDate = new Map<string, typeof dailyPlans[0]>();
  dailyPlans.forEach(plan => {
    const adjustedDate = new Date(plan.date);
    adjustedDate.setDate(adjustedDate.getDate() + 1); // Fix off-by-one error
    const dateKey = adjustedDate.toISOString().split('T')[0];
    plansByDate.set(dateKey, plan);
  });

  const firstDate = new Date(dailyPlans[0].date);
  firstDate.setDate(firstDate.getDate() + 1); // Fix off-by-one
  
  const startDate = new Date(firstDate);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="pt-4 grid grid-cols-1 md:grid-cols-7 gap-1 text-white">
      {weekDays.map(day => {
        const dateKey = day.toISOString().split('T')[0];
        const plan = plansByDate.get(dateKey);
        const isToday = new Date().toISOString().split('T')[0] === dateKey;

        return (
          <div key={dateKey} className="border rounded-lg bg-slate-800/50 border-slate-700 flex flex-col">
            <div
              className={cn(
                'p-2 text-center border-b border-slate-700',
                isToday && 'bg-slate-700/50'
              )}
            >
              <p className="text-xs font-semibold text-slate-400">
                {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </p>
              <p className={cn(
                'text-lg font-bold',
                 isToday && 'text-white'
                 )}>
                {day.getDate()}
                </p>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto h-64">
              {plan ? (
                plan.activities.map((activity, index) => (
                  <div key={index} className="p-1.5 rounded-md bg-slate-700/80 flex items-start gap-2 text-xs">
                     <div className="text-white pt-0.5">{getCategoryIcon(activity.category)}</div>
                     <div>
                       <p className="font-semibold text-white">{activity.time}</p>
                       <p className="text-slate-400 leading-tight">{activity.description}</p>
                     </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 pt-4">
                  -
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ItineraryWeeklyView;
