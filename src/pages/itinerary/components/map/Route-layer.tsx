import { Polyline } from 'react-leaflet';
import type { Coordinates } from './utils/geocoding';

interface RouteLayerProps {
  coordinates: Coordinates[];
  dayNumber: number;
  isSelected?: boolean;
}

// Color palette for different days - matching the app's theme
const DAY_COLORS = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#a78bfa', // purple-400
  '#f472b6', // pink-400
  '#22d3ee', // cyan-400
  '#fb923c', // orange-400
  '#a3e635', // lime-400
];

export default function RouteLayer({ 
  coordinates, 
  dayNumber,
  isSelected = false 
}: RouteLayerProps) {
  const color = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
  
  // Convert coordinates to Leaflet format
  const positions = coordinates.map(coord => [coord.lat, coord.lng] as [number, number]);
  
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 0.7 : 0.4,
        dashArray: isSelected ? undefined : '2, 4',
      }}
    />
  );
}