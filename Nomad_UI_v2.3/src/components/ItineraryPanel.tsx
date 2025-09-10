import { TripHeader } from './TripHeader';
import { DayItinerary } from './DayItinerary';
import { CoworkingSection } from './CoworkingSection';
import { TripActions } from './TripActions';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';

interface Event {
  id: string;
  title: string;
  time: string;
  description: string;
  address: string;
  category: 'work' | 'activity' | 'food' | 'transport';
}

interface EventItemProps {
  event: Event;
  eventIndex: number;
}

function EventItem({ event, eventIndex }: EventItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-700/30 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-200">
      <div 
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-8 h-8 bg-slate-600/50 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
          {event.category === 'transport' ? '✈️' : 
           event.category === 'activity' ? '🏛️' : 
           event.category === 'food' ? '🍽️' : '📍'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-white truncate">{event.title}</h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-500">{event.time}</span>
              <ChevronDown 
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">{event.description}</p>
        </div>
      </div>
      
      {/* Expandable Address Section */}
      <div className={`overflow-hidden transition-all duration-200 ${
        isExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-3 pb-3">
          <div className="flex items-start gap-2 p-2 bg-slate-600/30 rounded-lg">
            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-slate-300 leading-relaxed">{event.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data for the trip
const tripData = {
  destination: "3-Week Budget Europe City Tour",
  dates: "Oct 8 - 28 • 1 traveler",
  budget: "budget travel",
  travelers: 1
};

const itineraryData = [
  {
    day: "1",
    date: "Lisbon",
    events: [
      {
        id: '1',
        title: 'Arrive & Check-in',
        time: '10:00 AM',
        description: 'Airport pickup and accommodation check-in',
        address: 'Lisbon Portela Airport (LIS), Alameda das Comunidades Portuguesas, 1700-111 Lisboa',
        category: 'transport' as const
      },
      {
        id: '2',
        title: 'Explore Alfama District',
        time: '2:00 PM',
        description: 'Walking tour of historic neighborhood',
        address: 'Alfama, Lisboa, Portugal',
        category: 'activity' as const
      },
      {
        id: '3',
        title: 'Traditional Dinner',
        time: '7:00 PM',
        description: 'Local Portuguese cuisine',
        address: 'Bairro Alto, Lisboa',
        category: 'food' as const
      }
    ]
  },
  {
    day: "2", 
    date: "Porto",
    events: [
      {
        id: '4',
        title: 'Porto Day Trip',
        time: '9:00 AM',
        description: 'Explore the colorful riverside city',
        address: 'Porto, Portugal',
        category: 'transport' as const
      },
      {
        id: '5',
        title: 'Ribeira District',
        time: '11:00 AM',
        description: 'UNESCO World Heritage site',
        address: 'Cais da Ribeira, Porto',
        category: 'activity' as const
      },
      {
        id: '6',
        title: 'Port Wine Tasting',
        time: '4:00 PM',
        description: 'Traditional port cellars',
        address: 'Vila Nova de Gaia, Porto',
        category: 'activity' as const
      }
    ]
  },
  {
    day: "3",
    date: "Lisbon",
    events: [
      {
        id: '7',
        title: 'Return to Lisbon',
        time: '10:00 AM',
        description: 'Quick overnight stay',
        address: 'Lisboa, Portugal',
        category: 'transport' as const
      },
      {
        id: '8',
        title: 'Last Night Out',
        time: '8:00 PM',
        description: 'Farewell dinner in Chiado',
        address: 'Chiado, Lisboa',
        category: 'food' as const
      }
    ]
  },
  {
    day: "4",
    date: "London", 
    events: [
      {
        id: '9',
        title: 'Flight to London',
        time: '7:00 AM',
        description: 'Morning flight departure',
        address: 'London Heathrow Airport',
        category: 'transport' as const
      },
      {
        id: '10',
        title: 'Check-in & Rest',
        time: '2:00 PM',
        description: 'Settle into accommodation',
        address: 'Central London',
        category: 'activity' as const
      }
    ]
  }
];

export function ItineraryPanel() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      {/* Trip Overview */}
      <div className="p-6 border-b border-slate-600/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">New Trip</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">USD</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">🇺🇸</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">1T</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-sm text-slate-400 hover:text-white transition-colors">📝 Modify Trip</button>
            <button className="text-sm text-slate-400 hover:text-white transition-colors">📥 Download</button>
            <button className="text-sm text-slate-400 hover:text-white transition-colors">📤 Share</button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">Go Trip Card</button>
          </div>
        </div>
        
        <h1 className="text-2xl font-medium mb-2 text-white">{tripData.destination}</h1>
        <p className="text-slate-400 mb-4">{tripData.dates}</p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">{tripData.budget}</span>
          <span className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">Europe city tour</span>
          <span className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">multi-city trip</span>
        </div>

        {/* City Images */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="relative aspect-video bg-slate-600/50 rounded-xl overflow-hidden">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1442265367415-27e484dcdceb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMaXNib24lMjBQb3J0dWdhbCUyMGNvbG9yZnVsJTIwYnVpbGRpbmdzfGVufDF8fHx8MTc1NzIwNzkzOXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Lisbon"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2">
              <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">LISBOA</span>
            </div>
          </div>
          <div className="relative aspect-video bg-slate-600/50 rounded-xl overflow-hidden">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1590582811612-1dcc5c9bbfb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQb3J0byUyMFBvcnR1Z2FsJTIwcml2ZXJzaWRlJTIwY29sb3JmdWwlMjBob3VzZXN8ZW58MXx8fHwxNzU3MjA3OTQyfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Porto"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2">
              <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">PORTO</span>
            </div>
          </div>
          <div className="relative aspect-video bg-slate-600/50 rounded-xl overflow-hidden">
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1634440919887-e802e5446958?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMb25kb24lMjBFbmdsYW5kJTIwQmlnJTIwQmVuJTIwdG93ZXIlMjBicmlkZ2V8ZW58MXx8fHwxNzU3MjA3OTQ2fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="London"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2">
              <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">LONDON</span>
            </div>
            <div className="absolute top-2 right-2">
              <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">+3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Section */}
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4 text-white">Itinerary</h2>
        
        {/* City Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-slate-300">Lisbon</span>
            <span className="text-xs text-slate-500">5</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-slate-300">Porto</span>
            <span className="text-xs text-slate-500">5</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-slate-300">Lisbon</span>
            <span className="text-xs text-slate-500">1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-slate-300">London</span>
          </div>
        </div>

        {/* Current Location */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-slate-700/50 backdrop-blur-sm rounded-xl">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            1
          </div>
          <div>
            <h3 className="font-medium text-white">Lisbon, Portugal</h3>
            <p className="text-sm text-slate-400">(Day 1-6)</p>
          </div>
        </div>

        {/* Itinerary Items */}
        <div className="space-y-8">
          {itineraryData.map((day, dayIndex) => (
            <div key={day.day} className="space-y-4">
              {/* Day Header */}
              <div className="flex items-center gap-3 pb-2 border-b border-slate-600/30">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">{day.day}</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">{day.date}</h3>
                </div>
              </div>
              
              {/* Day Events */}
              <div className="space-y-3 ml-3">
                {day.events.map((event, eventIndex) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    eventIndex={eventIndex}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}