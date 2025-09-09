import { Icon } from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { 
  Utensils, 
  Camera, 
  Briefcase, 
  Plane, 
  Home,
  MapPin
} from 'lucide-react';
import type { Coordinates } from './utils/geocoding';

interface ActivityMarkerProps {
  position: Coordinates;
  activity: {
    time: string;
    description: string;
    category: string;
    address: string;
  };
  dayNumber: number;
  isSelected?: boolean;
  onClick?: () => void;
}

// Create custom icons for different categories
const createCustomIcon = (category: string, dayNumber: number) => {
  const iconHtml = getIconHtml(category, dayNumber);
  
  // Use encodeURIComponent instead of btoa to handle Unicode characters
  const encodedSvg = encodeURIComponent(iconHtml);
  
  return new Icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodedSvg}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

function getIconHtml(category: string, dayNumber: number): string {
  const color = getColorForCategory(category);
  
  // Simple circle marker instead of complex pin
  return `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer circle -->
      <circle cx="16" cy="16" r="14" 
              fill="${color}" 
              opacity="0.2"/>
      
      <!-- Inner circle -->
      <circle cx="16" cy="16" r="10" 
              fill="${color}" 
              stroke="white" 
              stroke-width="2"/>
      
      <!-- Day number -->
      <text x="16" y="20" text-anchor="middle" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="11" 
            font-weight="600" 
            fill="white">
        ${dayNumber}
      </text>
    </svg>
  `;
}

function getColorForCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('restaurant')) return '#fb923c'; // orange-400
  if (cat.includes('work') || cat.includes('cowork')) return '#60a5fa'; // blue-400
  if (cat.includes('travel') || cat.includes('transport')) return '#a78bfa'; // purple-400
  if (cat.includes('accommodation') || cat.includes('hotel')) return '#34d399'; // emerald-400
  if (cat.includes('attraction') || cat.includes('leisure')) return '#f472b6'; // pink-400
  return '#94a3b8'; // slate-400 default
}

function getSymbolForCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('restaurant')) return '🍽️';
  if (cat.includes('work') || cat.includes('cowork')) return '💼';
  if (cat.includes('travel') || cat.includes('transport')) return '✈️';
  if (cat.includes('accommodation') || cat.includes('hotel')) return '🏨';
  if (cat.includes('attraction') || cat.includes('leisure')) return '📸';
  return '📍';
}

export function ActivityMarker({
  position,
  activity,
  dayNumber,
  isSelected = false,
  onClick
}: ActivityMarkerProps) {
  const icon = createCustomIcon(activity.category, dayNumber);

  return (
    <Marker 
      position={[position.lat, position.lng]} 
      icon={icon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup className="activity-popup">
        <div className="p-2 min-w-[150px] max-w-[250px]">
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Day {dayNumber} • {activity.time}
          </div>
          <div className="text-sm text-gray-900">
            {activity.description}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}