import { useState } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Map, Satellite, Route, RotateCcw, Filter } from 'lucide-react';

export function MapView() {
  const [viewMode, setViewMode] = useState<'map' | 'satellite'>('map');
  const [showRoute, setShowRoute] = useState(true);

  const destinations = [
    { name: 'Copenhagen', position: { x: 45, y: 25 } },
    { name: 'London', position: { x: 35, y: 35 } },
    { name: 'Vilnius', position: { x: 55, y: 30 } }
  ];

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl tracking-tight text-foreground">Route overview</h2>
          <Button
            variant="outline"
            size="sm"
            className="border-border hover:bg-muted/50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showRoute ? "default" : "outline"}
            size="sm"
            onClick={() => setShowRoute(!showRoute)}
            className="text-sm"
          >
            <Route className="w-4 h-4 mr-2" />
            Route
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'map' ? 'satellite' : 'map')}
            className="border-border hover:bg-muted/50 text-sm"
          >
            {viewMode === 'map' ? <Satellite className="w-4 h-4" /> : <Map className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border hover:bg-muted/50"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Map Container */}
      <div className="flex-1 p-6">
        <div className="h-full relative bg-muted/30 rounded-lg overflow-hidden">
          {/* Simplified Map */}
          <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/50">
            {/* Map Grid */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Destination Points */}
            {destinations.map((destination, index) => (
              <div
                key={destination.name}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: `${destination.position.x}%`,
                  top: `${destination.position.y}%`
                }}
              >
                <div className="relative">
                  <div className="w-3 h-3 bg-foreground rounded-full shadow-sm" />
                  <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-background border border-border px-2 py-1 rounded text-xs text-foreground whitespace-nowrap shadow-sm">
                    {destination.name}
                  </div>
                </div>
              </div>
            ))}

            {/* Route Lines */}
            {showRoute && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-5">
                <defs>
                  <linearGradient id="routeLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="currentColor" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  d={`M ${destinations[0].position.x}% ${destinations[0].position.y}% 
                      Q ${(destinations[0].position.x + destinations[1].position.x) / 2}% ${destinations[0].position.y - 10}% 
                      ${destinations[1].position.x}% ${destinations[1].position.y}%
                      Q ${(destinations[1].position.x + destinations[2].position.x) / 2}% ${destinations[1].position.y - 10}%
                      ${destinations[2].position.x}% ${destinations[2].position.y}%`}
                  stroke="url(#routeLine)"
                  strokeWidth="1"
                  fill="none"
                  strokeDasharray="3,3"
                  className="text-foreground"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Map Summary */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total distance</span>
            <span className="text-foreground">~2,340 km</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Est. travel time</span>
            <span className="text-foreground">8h 45m</span>
          </div>
        </div>
      </div>
    </div>
  );
}