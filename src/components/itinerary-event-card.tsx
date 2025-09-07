// A new component to render individual events in the timeline
'use client';

import { useState } from 'react';
import { Briefcase, Camera, Coffee, Utensils, Plane, Bed, MapPin, Clock, ExternalLink, ChevronDown } from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

type Activity = GeneratePersonalizedItineraryOutput['itinerary'][0]['activities'][0];

const categoryInfo = {
  Work: { icon: <Briefcase className="h-4 w-4" />, color: 'from-blue-500 to-blue-600' },
  Leisure: { icon: <Camera className="h-4 w-4" />, color: 'from-green-500 to-green-600' },
  Food: { icon: <Utensils className="h-4 w-4" />, color: 'from-orange-500 to-orange-600' },
  Travel: { icon: <Plane className="h-4 w-4" />, color: 'from-purple-500 to-purple-600' },
  Accommodation: { icon: <Bed className="h-4 w-4" />, color: 'from-indigo-500 to-indigo-600' },
  Attraction: { icon: <MapPin className="h-4 w-4" />, color: 'from-pink-500 to-pink-600' },
  Default: { icon: <Coffee className="h-4 w-4" />, color: 'from-slate-500 to-slate-600' },
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
      className="bg-slate-700/50 backdrop-blur-sm rounded-lg p-2.5 cursor-pointer hover:bg-slate-700/70 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 bg-gradient-to-br ${color} rounded-md flex items-center justify-center text-white flex-shrink-0`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white truncate text-sm">{activity.description}</h4>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs flex-shrink-0 ml-2">
              <Clock className="w-3 h-3" />
              <span>{activity.time}</span>
            </div>
          </div>
          
          <p className="text-slate-400 text-xs">{activity.category}</p>

          {isExpanded && (
             <div className="pt-2 mt-2 border-t border-slate-600">
              <div className="flex items-start gap-2 text-slate-400 text-xs">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
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
            </div>
          )}
        </div>
        {!isExpanded && (
             <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform transform ${isExpanded ? 'rotate-180' : ''}`}
            />
        )}
      </div>
    </div>
  );
}
