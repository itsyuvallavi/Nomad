import { useState } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Download, Calendar, MapPin, Clock, DollarSign } from 'lucide-react';
import { DestinationCard } from './DestinationCard';
import { CostBreakdown } from './CostBreakdown';

const destinations = [
  {
    id: 1,
    name: 'Copenhagen',
    country: 'Denmark',
    days: '12 days',
    image: 'copenhagen architecture',
    highlight: 'Design capital'
  },
  {
    id: 2,
    name: 'London',
    country: 'United Kingdom', 
    days: '8 days',
    image: 'london minimalist',
    highlight: 'Cultural hub'
  },
  {
    id: 3,
    name: 'Vilnius',
    country: 'Lithuania',
    days: '6 days',
    image: 'vilnius modern',
    highlight: 'Tech scene'
  }
];

export function TripOverview() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <div className="h-full bg-background overflow-y-auto">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h1 className="text-2xl tracking-tight text-foreground">Multi-City Journey</h1>
            <p className="text-sm text-muted-foreground">43-day European expedition</p>
          </div>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
            size="sm"
            className="border-border hover:bg-muted/50"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting' : 'Export'}
          </Button>
        </div>

        {/* Trip Meta - Compact Grid */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">Duration</span>
            </div>
            <p className="text-foreground text-xs">Sep 8 - Oct 20</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="text-xs">Countries</span>
            </div>
            <p className="text-foreground text-xs">3 destinations</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-xs">Days</span>
            </div>
            <p className="text-foreground text-xs">43 days</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              <span className="text-xs">Cost</span>
            </div>
            <p className="text-foreground text-xs">$13,335</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Cost Summary - Compact */}
      <div className="p-6 py-4">
        <CostBreakdown />
      </div>

      <Separator />

      {/* Destinations - Compact */}
      <div className="p-6 py-4">
        <h2 className="text-lg tracking-tight text-foreground mb-3">Destinations</h2>
        <div className="space-y-2">
          {destinations.map((destination, index) => (
            <DestinationCard key={destination.id} destination={destination} index={index} />
          ))}
        </div>
      </div>

      <Separator />

      {/* Travel Tips - Compact */}
      <div className="p-6 py-4 pb-6">
        <h2 className="text-lg tracking-tight text-foreground mb-3">Preparations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h3 className="text-foreground font-medium">Documentation</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Verify passport validity (6+ months)</li>
              <li>• Check visa requirements</li>
              <li>• Obtain travel insurance</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-foreground font-medium">Planning</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Book accommodations early</li>
              <li>• Download offline maps</li>
              <li>• Notify banks of travel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}