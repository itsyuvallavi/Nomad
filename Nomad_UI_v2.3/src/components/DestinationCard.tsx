import { ImageWithFallback } from './figma/ImageWithFallback';
import { ArrowRight } from 'lucide-react';

interface Destination {
  id: number;
  name: string;
  country: string;
  days: string;
  image: string;
  highlight: string;
}

interface DestinationCardProps {
  destination: Destination;
  index: number;
}

export function DestinationCard({ destination, index }: DestinationCardProps) {
  return (
    <div className="group relative border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs text-muted-foreground">{index + 1}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="text-foreground font-medium truncate">{destination.name}</h3>
              <span className="text-xs text-muted-foreground">{destination.country}</span>
            </div>
            
            <div className="flex items-center gap-4 mt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{destination.days}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">{destination.highlight}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-16 h-10 rounded overflow-hidden bg-muted ml-4 flex-shrink-0">
          <ImageWithFallback
            src={`https://images.unsplash.com/160x80/?${destination.image}`}
            alt={destination.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-200"
          />
        </div>

        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2" />
      </div>
    </div>
  );
}