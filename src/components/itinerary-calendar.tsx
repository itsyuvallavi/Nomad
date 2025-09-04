'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Coffee,
  Utensils,
  Camera,
  Bed,
  Plane,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';

type ItineraryCalendarProps = {
  dailyPlans: GeneratePersonalizedItineraryOutput['itinerary'];
};

const categoryIcons = {
  Work: <Briefcase className="h-4 w-4" />,
  Leisure: <Camera className="h-4 w-4" />,
  Food: <Utensils className="h-4 w-4" />,
  Travel: <Plane className="h-4 w-4" />,
  Accommodation: <Bed className="h-4 w-4" />,
  Default: <Coffee className="h-4 w-4" />,
};

type Activity = GeneratePersonalizedItineraryOutput['itinerary'][0]['activities'][0];

const getCategoryIcon = (category: Activity['category']) => {
  return categoryIcons[category] || categoryIcons.Default;
};


const ItineraryCalendar = ({ dailyPlans }: ItineraryCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date(dailyPlans[0].date));

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(endOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const monthDays = [];
  let day = new Date(startDate);

  while (day <= endDate) {
    monthDays.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const getActivitiesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const plan = dailyPlans.find(p => {
        // AI may add timezone, so just compare dates
        return new Date(p.date).toISOString().split('T')[0] === dateString;
    });
    return plan?.activities || [];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-headline">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 border-t border-l">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold p-2 border-b border-r bg-muted/50 text-muted-foreground text-sm">
            {day}
          </div>
        ))}
        {monthDays.map(date => {
          const activities = getActivitiesForDate(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = new Date().toISOString().split('T')[0] === date.toISOString().split('T')[0];
          
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'p-2 border-b border-r h-48 flex flex-col',
                !isCurrentMonth && 'bg-muted/30 text-muted-foreground'
              )}
            >
              <div className={cn(
                  'font-semibold text-right mb-1',
                   isToday && 'text-accent'
                   )}>
                {date.getDate()}
                </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-2 text-xs">
                {activities.map((activity, index) => (
                  <div key={index} className="p-1.5 rounded-md bg-secondary/80 flex items-start gap-2">
                    <div className="text-accent pt-0.5">{getCategoryIcon(activity.category)}</div>
                    <div>
                      <p className="font-semibold">{activity.time}</p>
                      <p className="text-muted-foreground leading-tight">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItineraryCalendar;
