import { motion } from 'motion/react';
import { EventCard } from './EventCard';

interface Event {
  id: string;
  title: string;
  time: string;
  description: string;
  address: string;
  category: 'work' | 'activity' | 'food' | 'transport';
}

interface DayItineraryProps {
  day: string;
  date: string;
  events: Event[];
  dayIndex: number;
}

export function DayItinerary({ day, date, events, dayIndex }: DayItineraryProps) {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: dayIndex * 0.2 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
          <span className="text-white font-medium">{dayIndex + 1}</span>
        </div>
        <div>
          <h2 className="text-white font-medium">{day}</h2>
          <p className="text-slate-400 text-sm">{date}</p>
        </div>
      </div>
      
      <div className="space-y-3 ml-6 border-l-2 border-slate-600 pl-6">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            title={event.title}
            time={event.time}
            description={event.description}
            address={event.address}
            category={event.category}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}