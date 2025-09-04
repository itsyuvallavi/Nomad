import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Building2, Wifi, Coffee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const coworkingSpaces = [
  {
    name: 'The Hive',
    city: 'Tokyo',
    amenities: ['24/7 Access', 'Fast WiFi', 'Coffee'],
  },
  {
    name: 'Impact Hub',
    city: 'Kyoto',
    amenities: ['Events', 'Community', 'Meeting Rooms'],
  },
  {
    name: 'WeWork Shibuya Scramble',
    city: 'Tokyo',
    amenities: ['Global Network', 'Phone Booths', 'Beer'],
  },
];

export default function DatabaseInfo() {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="font-headline text-xl">
          Top Coworking Spaces
        </CardTitle>
        <CardDescription>
          Highly-rated spots for productivity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {coworkingSpaces.map(space => (
          <div
            key={space.name}
            className="p-4 rounded-lg border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-accent transition-colors"
          >
            <div>
              <h3 className="font-semibold">{space.name}</h3>
              <p className="text-sm text-muted-foreground">{space.city}</p>
            </div>
            <div className="flex gap-2 text-muted-foreground items-center">
              <Badge variant="outline">
                <Wifi className="h-4 w-4 mr-1" /> WiFi
              </Badge>
              <Badge variant="outline">
                <Coffee className="h-4 w-4 mr-1" /> Coffee
              </Badge>
              <Badge variant="outline">
                <Building2 className="h-4 w-4 mr-1" /> Spaces
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
