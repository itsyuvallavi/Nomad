// A new component to render individual events in the timeline
'use client';

import { useState } from 'react';
import { Briefcase, Camera, Coffee, Utensils, Plane, Bed, MapPin, Clock, ExternalLink, ChevronDown } from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';

type Activity = GeneratePersonalizedItineraryOutput['itinerary'][0]['activities'][0];

const categoryInfo = {
  Work: { icon: <Briefcase className="h-5 w-5" />, color: 'from-blue-500 to-blue-600' },
  Leisure: { icon: <Camera className="h-5 w-5" />, color: 'from-green-500 to-green-600' },
  Food: { icon: <Utensils className="h-5 w-5" />, color: 'from-orange-500 to-orange-600' },
  Travel: { icon: <Plane className="h-5 w-5" />, color: 'from-purple-500 to-purple-600' },
  Accommodation: { icon: <Bed className="h-5 w-5" />, color: 'from-indigo-500 to-indigo-600' },
  Default: { icon: <Coffee className="h-5 w-5" />, color: 'from-slate-500 to-slate-600' },
};

const getCategoryInfo = (category: Activity['category']) => {
  return categoryInfo[category] || categoryInfo.Default;
};

type ItineraryEventCardProps = {
  activity: Activity;
};

export default function ItineraryEventCard({ activity }: ItineraryEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { icon, color } = getCategoryInfo(activity.category);

  return (
    <div
      className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-slate-700/70 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-white truncate">{activity.description}</h4>
            <div className="flex items-center gap-1.5 text-slate-400 text-sm flex-shrink-0 ml-2">
              <Clock className="w-3 h-3" />
              <span>{activity.time}</span>
            </div>
          </div>
          
          <p className="text-slate-300 text-sm mb-2">{activity.category}</p>

          {isExpanded && (
             <div className="pt-3 mt-2 border-t border-slate-600">
              <div className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{activity.address}</span>
                 <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
               {activity.travelTime && (
                <p className="text-xs text-slate-400 mt-2">Travel from previous: {activity.travelTime}</p>
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>
    </div>
  );
}
