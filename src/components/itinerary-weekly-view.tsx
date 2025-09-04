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
    return <p>No itinerary to display.</p>;
  }

  // Create a map of dates to plans
  const plansByDate = new Map<string, typeof dailyPlans[0]>();
  dailyPlans.forEach(plan => {
    const dateKey = new Date(plan.date).toISOString().split('T')[0];
    plansByDate.set(dateKey, plan);
  });

  const startDate = new Date(dailyPlans[0].date);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="pt-4 grid grid-cols-1 md:grid-cols-7 gap-1">
      {weekDays.map(day => {
        const dateKey = day.toISOString().split('T')[0];
        const plan = plansByDate.get(dateKey);
        const isToday = new Date().toISOString().split('T')[0] === dateKey;

        return (
          <div key={dateKey} className="border rounded-lg bg-muted/20 flex flex-col">
            <div
              className={cn(
                'p-2 text-center border-b',
                isToday && 'bg-accent/20'
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </p>
              <p className={cn(
                'text-lg font-bold',
                 isToday && 'text-accent'
                 )}>
                {day.getDate()}
                </p>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto h-64">
              {plan ? (
                plan.activities.map((activity, index) => (
                  <div key={index} className="p-1.5 rounded-md bg-background/60 flex items-start gap-2 text-xs">
                     <div className="text-accent pt-0.5">{getCategoryIcon(activity.category)}</div>
                     <div>
                       <p className="font-semibold">{activity.time}</p>
                       <p className="text-muted-foreground leading-tight">{activity.description}</p>
                     </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-muted-foreground pt-4">
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
