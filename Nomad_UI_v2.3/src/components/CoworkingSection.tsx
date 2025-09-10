import { Wifi, Coffee, Users, Star, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface CoworkingSpace {
  id: string;
  name: string;
  rating: number;
  pricePerDay: string;
  amenities: string[];
  address: string;
  distance: string;
}

const coworkingSpaces: CoworkingSpace[] = [
  {
    id: '1',
    name: 'Hub Lisbon',
    rating: 4.8,
    pricePerDay: '€25/day',
    amenities: ['High-speed WiFi', 'Coffee Bar', 'Meeting Rooms'],
    address: 'Rua Garrett 64, Chiado, Lisboa',
    distance: '0.3 km from accommodation'
  },
  {
    id: '2', 
    name: 'Second Home Lisboa',
    rating: 4.6,
    pricePerDay: '€30/day',
    amenities: ['24/7 Access', 'Rooftop Terrace', 'Phone Booths'],
    address: 'Cais do Sodré, Lisboa',
    distance: '0.8 km from accommodation'
  },
  {
    id: '3',
    name: 'Workplace',
    rating: 4.5,
    pricePerDay: '€20/day',
    amenities: ['Printing', 'Lockers', 'Networking Events'],
    address: 'Av. da República 6, Lisboa',
    distance: '1.2 km from accommodation'
  }
];

export function CoworkingSection() {
  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Wifi className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-white font-medium">Recommended Coworking Spaces</h2>
      </div>
      
      <div className="space-y-4">
        {coworkingSpaces.map((space, index) => (
          <motion.div
            key={space.id}
            className="bg-slate-700/50 rounded-xl p-4 hover:bg-slate-700/70 transition-colors cursor-pointer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-white font-medium">{space.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">{space.pricePerDay}</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-slate-300 text-sm">{space.rating}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <MapPin className="w-3 h-3" />
              <span>{space.distance}</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {space.amenities.map((amenity) => (
                <span 
                  key={amenity}
                  className="bg-slate-600/50 text-slate-300 px-2 py-1 rounded-md text-xs"
                >
                  {amenity}
                </span>
              ))}
            </div>
            
            <p className="text-slate-400 text-sm mt-2">{space.address}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}