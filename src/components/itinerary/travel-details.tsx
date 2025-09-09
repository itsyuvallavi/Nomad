import { Plane, Hotel, DollarSign, Calendar, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface FlightDetails {
  origin: string;
  destination: string;
  price: number;
  airline?: string;
  duration?: string;
  departure?: string;
  arrival?: string;
}

interface HotelDetails {
  name: string;
  price: number;
  perNight: number;
  nights: number;
  rating?: number;
  address?: string;
  checkIn?: string;
  checkOut?: string;
}

interface TravelDetailsProps {
  flights?: FlightDetails[];
  hotels?: HotelDetails[];
  totalCost?: number;
  currency?: string;
}

export function TravelDetails({ flights = [], hotels = [], totalCost, currency = 'USD' }: TravelDetailsProps) {
  const totalFlightCost = flights.reduce((sum, f) => sum + (f.price || 0), 0);
  const totalHotelCost = hotels.reduce((sum, h) => sum + (h.price || 0), 0);
  const estimatedTotal = totalCost || (totalFlightCost + totalHotelCost);
  
  return (
    <div className="space-y-6">
      {/* Flights Section */}
      {flights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Plane className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold text-lg">Flights</h3>
          </div>
          
          <div className="space-y-3">
            {flights.map((flight, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-white font-medium">
                      {flight.origin} → {flight.destination}
                    </div>
                    {flight.airline && (
                      <div className="text-slate-400 text-sm">{flight.airline}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">
                      ${typeof flight.price === 'object' ? (flight.price as any).total?.toFixed(0) || (flight.price as any).perPerson?.toFixed(0) || '0' : flight.price.toFixed(0)}
                    </div>
                    {flight.duration && (
                      <div className="text-slate-400 text-sm">{flight.duration}</div>
                    )}
                  </div>
                </div>
                {(flight.departure || flight.arrival) && (
                  <div className="flex justify-between text-sm text-slate-400 mt-2 pt-2 border-t border-slate-600">
                    {flight.departure && <span>Depart: {flight.departure}</span>}
                    {flight.arrival && <span>Arrive: {flight.arrival}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Hotels Section */}
      {hotels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Hotel className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold text-lg">Accommodations</h3>
          </div>
          
          <div className="space-y-3">
            {hotels.map((hotel, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-white font-medium">{hotel.name}</div>
                    {hotel.address && (
                      <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{typeof hotel.address === 'object' ? (hotel.address as any).lines?.[0] || JSON.stringify(hotel.address) : hotel.address}</span>
                      </div>
                    )}
                    {hotel.rating && (
                      <div className="text-yellow-400 text-sm mt-1">
                        {'★'.repeat(Math.round(hotel.rating))}
                        <span className="text-slate-400 ml-1">({hotel.rating})</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">
                      ${hotel.price.toFixed(0)}
                    </div>
                    <div className="text-slate-400 text-sm">
                      ${hotel.perNight.toFixed(0)}/night
                    </div>
                    <div className="text-slate-400 text-sm">
                      {hotel.nights} nights
                    </div>
                  </div>
                </div>
                {(hotel.checkIn || hotel.checkOut) && (
                  <div className="flex items-center gap-4 text-sm text-slate-400 mt-2 pt-2 border-t border-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Check-in: {hotel.checkIn}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Check-out: {hotel.checkOut}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Cost Summary */}
      {estimatedTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur-sm rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-semibold text-lg">Estimated Costs</h3>
          </div>
          
          <div className="space-y-2">
            {totalFlightCost > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Flights</span>
                <span className="font-medium">${totalFlightCost.toFixed(0)}</span>
              </div>
            )}
            {totalHotelCost > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Accommodations</span>
                <span className="font-medium">${totalHotelCost.toFixed(0)}</span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-slate-600">
              <div className="flex justify-between text-white">
                <span className="font-semibold">Total Estimate</span>
                <span className="font-bold text-xl text-green-400">
                  ${estimatedTotal.toFixed(0)} {currency}
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-slate-400 text-xs mt-4">
            * Prices are estimates and may vary. Does not include meals, activities, or transportation.
          </p>
        </motion.div>
      )}
    </div>
  );
}