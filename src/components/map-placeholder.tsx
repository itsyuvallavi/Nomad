import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function MapPlaceholder() {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" />
          <span>Location Explorer</span>
        </CardTitle>
        <CardDescription>
          Key spots from your itinerary will appear here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video relative rounded-lg overflow-hidden border">
          <Image
            src="https://picsum.photos/800/600"
            alt="Abstract map placeholder"
            data-ai-hint="map abstract"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-4">
            <p className="text-white bg-black/50 px-4 py-2 rounded-md text-sm">
              Interactive Map Coming Soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
