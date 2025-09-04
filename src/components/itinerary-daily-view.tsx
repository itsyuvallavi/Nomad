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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from './ui/badge';

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
    return <p>No itinerary available.</p>;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Adjust for timezone differences
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4 pt-4">
      <Accordion type="single" collapsible defaultValue={`day-${dailyPlans[0].day}`}>
        {dailyPlans.map(plan => (
          <AccordionItem key={plan.day} value={`day-${plan.day}`}>
            <AccordionTrigger>
              <div className="flex flex-col items-start text-left">
                <p className="font-semibold text-sm text-muted-foreground">
                  Day {plan.day} &bull; {formatDate(plan.date)}
                </p>
                <h3 className="text-lg font-headline text-primary">{plan.title}</h3>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 ml-2 border-l-2 border-accent/50 pl-6 py-2">
                {plan.activities.map((activity, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-8 top-1.5 h-4 w-4 rounded-full bg-accent" />
                    <p className="font-bold text-muted-foreground">
                      {activity.time}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="text-accent">
                        {getCategoryIcon(activity.category)}
                      </div>
                      <p className="text-foreground/80">{activity.description}</p>
                    </div>
                     <Badge variant="outline" className="mt-2 ml-8">{activity.category}</Badge>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ItineraryDailyView;
