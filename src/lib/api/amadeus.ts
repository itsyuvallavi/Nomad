import Amadeus from 'amadeus';
import { logger } from '../logger';

// Lazy load Amadeus client to ensure env vars are loaded
let amadeusClient: Amadeus | null = null;

function getAmadeusClient(): Amadeus | null {
  if (!amadeusClient && process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET) {
    amadeusClient = new Amadeus({
      clientId: process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
      hostname: 'test' // Using test/sandbox environment
    });
  }
  return amadeusClient;
}

/**
 * Search for flights between two cities with pricing
 */
export async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  adults: number = 1
): Promise<any> {
  const amadeus = getAmadeusClient();
  if (!amadeus) {
    logger.warn('Amadeus', 'API not configured, returning mock data');
    return getMockFlightData(origin, destination, departureDate);
  }

  try {
    logger.info('Amadeus', `Searching flights: ${origin} → ${destination} on ${departureDate}`);
    
    // First, get IATA codes for cities
    const originCode = await getCityCode(origin);
    const destinationCode = await getCityCode(destination);
    
    if (!originCode || !destinationCode) {
      logger.warn('Amadeus', `Could not find airport codes for ${origin} or ${destination}`);
      return getMockFlightData(origin, destination, departureDate);
    }
    
    // Search for flight offers
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: departureDate,
      returnDate: returnDate,
      adults: adults,
      currencyCode: 'USD',
      max: 5 // Limit results
    });
    
    if (response.data && response.data.length > 0) {
      // Extract and format flight data
      const flights = response.data.map((offer: any) => ({
        id: offer.id,
        price: {
          total: parseFloat(offer.price.total),
          currency: offer.price.currency || 'USD',
          perPerson: parseFloat(offer.price.total) / adults
        },
        itineraries: offer.itineraries.map((itinerary: any) => ({
          duration: itinerary.duration,
          segments: itinerary.segments.map((segment: any) => ({
            departure: {
              airport: segment.departure.iataCode,
              time: segment.departure.at
            },
            arrival: {
              airport: segment.arrival.iataCode,
              time: segment.arrival.at
            },
            carrier: segment.carrierCode,
            flightNumber: segment.number,
            duration: segment.duration
          }))
        })),
        airline: offer.validatingAirlineCodes?.[0] || 'Unknown'
      }));
      
      logger.info('Amadeus', `Found ${flights.length} flight options`);
      return flights;
    }
    
    return getMockFlightData(origin, destination, departureDate);
  } catch (error) {
    logger.error('Amadeus', 'Flight search failed', { error });
    return getMockFlightData(origin, destination, departureDate);
  }
}

/**
 * Search for hotels in a city with pricing
 */
export async function searchHotels(
  city: string,
  checkIn: string,
  checkOut: string,
  adults: number = 1
): Promise<any> {
  const amadeus = getAmadeusClient();
  if (!amadeus) {
    logger.warn('Amadeus', 'API not configured, returning mock data');
    return getMockHotelData(city, checkIn, checkOut);
  }

  try {
    logger.info('Amadeus', `Searching hotels in ${city} from ${checkIn} to ${checkOut}`);
    
    // Get city coordinates
    const cityCode = await getCityCode(city);
    if (!cityCode) {
      return getMockHotelData(city, checkIn, checkOut);
    }
    
    // Search for hotels by city
    const hotelList = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: cityCode
    });
    
    if (!hotelList.data || hotelList.data.length === 0) {
      return getMockHotelData(city, checkIn, checkOut);
    }
    
    // Get hotel IDs (limit to first 10)
    const hotelIds = hotelList.data.slice(0, 10).map((hotel: any) => hotel.hotelId).join(',');
    
    // Search for hotel offers
    const response = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelIds,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults: adults,
      currency: 'USD',
      bestRateOnly: true
    });
    
    if (response.data && response.data.length > 0) {
      // Extract and format hotel data
      const hotels = response.data.map((hotel: any) => ({
        id: hotel.hotel.hotelId,
        name: hotel.hotel.name,
        description: hotel.hotel.description?.text || '',
        rating: hotel.hotel.rating || 0,
        address: {
          lines: hotel.hotel.address?.lines || [],
          cityName: hotel.hotel.address?.cityName || city,
          countryCode: hotel.hotel.address?.countryCode || ''
        },
        offers: hotel.offers?.map((offer: any) => ({
          id: offer.id,
          price: {
            total: parseFloat(offer.price.total),
            currency: offer.price.currency || 'USD',
            perNight: parseFloat(offer.price.total) / getDaysBetween(checkIn, checkOut)
          },
          room: {
            type: offer.room?.typeEstimated?.category || 'Standard',
            beds: offer.room?.typeEstimated?.beds || 1,
            bedType: offer.room?.typeEstimated?.bedType || 'Unknown'
          },
          policies: {
            cancellation: offer.policies?.cancellation?.description?.text || 'Check hotel policy',
            paymentType: offer.policies?.paymentType || 'AT_HOTEL'
          }
        })) || []
      }));
      
      logger.info('Amadeus', `Found ${hotels.length} hotel options`);
      return hotels;
    }
    
    return getMockHotelData(city, checkIn, checkOut);
  } catch (error) {
    logger.error('Amadeus', 'Hotel search failed', { error });
    return getMockHotelData(city, checkIn, checkOut);
  }
}

/**
 * Get IATA city/airport code
 */
async function getCityCode(city: string): Promise<string | null> {
  const amadeus = getAmadeusClient();
  if (!amadeus) return null;
  
  try {
    const response = await amadeus.referenceData.locations.get({
      keyword: city,
      subType: Amadeus.location.city
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0].iataCode;
    }
    
    // Try airport search as fallback
    const airportResponse = await amadeus.referenceData.locations.get({
      keyword: city,
      subType: Amadeus.location.airport
    });
    
    if (airportResponse.data && airportResponse.data.length > 0) {
      return airportResponse.data[0].iataCode;
    }
    
    return null;
  } catch (error) {
    logger.error('Amadeus', `Failed to get city code for ${city}`, { error });
    return null;
  }
}

/**
 * Calculate days between dates
 */
function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate realistic flight price based on route
 */
function calculateFlightPrice(origin: string, destination: string): number {
  const originLower = origin.toLowerCase();
  const destLower = destination.toLowerCase();
  
  // Domestic US flights
  if ((originLower.includes('new york') || originLower.includes('los angeles') || originLower.includes('chicago') || 
       originLower.includes('boston') || originLower.includes('san francisco') || originLower.includes('seattle')) &&
      (destLower.includes('new york') || destLower.includes('los angeles') || destLower.includes('chicago') || 
       destLower.includes('boston') || destLower.includes('san francisco') || destLower.includes('seattle'))) {
    return 250 + Math.random() * 350; // $250-600
  }
  
  // Transatlantic flights (US <-> Europe)
  if ((originLower.includes('new york') || originLower.includes('los angeles') || originLower.includes('chicago') || 
       originLower.includes('boston') || originLower.includes('san francisco')) &&
      (destLower.includes('london') || destLower.includes('paris') || destLower.includes('rome') || 
       destLower.includes('barcelona') || destLower.includes('lisbon') || destLower.includes('porto'))) {
    return 800 + Math.random() * 700; // $800-1500
  }
  
  // Europe to US
  if ((destLower.includes('new york') || destLower.includes('los angeles') || destLower.includes('chicago') || 
       destLower.includes('boston') || destLower.includes('san francisco')) &&
      (originLower.includes('london') || originLower.includes('paris') || originLower.includes('rome') || 
       originLower.includes('barcelona') || originLower.includes('lisbon') || originLower.includes('porto'))) {
    return 800 + Math.random() * 700; // $800-1500
  }
  
  // Intra-Europe flights
  if ((originLower.includes('london') || originLower.includes('paris') || originLower.includes('rome') || 
       originLower.includes('barcelona') || originLower.includes('lisbon') || originLower.includes('porto')) &&
      (destLower.includes('london') || destLower.includes('paris') || destLower.includes('rome') || 
       destLower.includes('barcelona') || destLower.includes('lisbon') || destLower.includes('porto'))) {
    return 100 + Math.random() * 200; // $100-300
  }
  
  // Long-haul international (US <-> Asia, etc)
  if ((originLower.includes('tokyo') || originLower.includes('singapore') || originLower.includes('hong kong')) ||
      (destLower.includes('tokyo') || destLower.includes('singapore') || destLower.includes('hong kong'))) {
    return 1200 + Math.random() * 1000; // $1200-2200
  }
  
  // Default international
  return 600 + Math.random() * 600; // $600-1200
}

/**
 * Mock flight data for testing
 */
function getMockFlightData(origin: string, destination: string, date: string) {
  const basePrice = calculateFlightPrice(origin, destination);
  return [
    {
      id: 'mock-flight-1',
      price: {
        total: basePrice,
        currency: 'USD',
        perPerson: basePrice
      },
      itineraries: [{
        duration: 'PT2H30M',
        segments: [{
          departure: { airport: origin.substring(0, 3).toUpperCase(), time: `${date}T10:00:00` },
          arrival: { airport: destination.substring(0, 3).toUpperCase(), time: `${date}T12:30:00` },
          carrier: 'AA',
          flightNumber: '123',
          duration: 'PT2H30M'
        }]
      }],
      airline: 'American Airlines'
    },
    {
      id: 'mock-flight-2',
      price: {
        total: basePrice * 0.8,
        currency: 'USD',
        perPerson: basePrice * 0.8
      },
      itineraries: [{
        duration: 'PT3H00M',
        segments: [{
          departure: { airport: origin.substring(0, 3).toUpperCase(), time: `${date}T14:00:00` },
          arrival: { airport: destination.substring(0, 3).toUpperCase(), time: `${date}T17:00:00` },
          carrier: 'UA',
          flightNumber: '456',
          duration: 'PT3H00M'
        }]
      }],
      airline: 'United Airlines'
    }
  ];
}

/**
 * Mock hotel data for testing
 */
function getMockHotelData(city: string, checkIn: string, checkOut: string) {
  const nights = getDaysBetween(checkIn, checkOut);
  
  // Calculate base price per night based on city
  const cityLower = city.toLowerCase();
  let basePricePerNight = 150; // Default
  
  // Expensive cities
  if (cityLower.includes('london') || cityLower.includes('paris') || cityLower.includes('new york') || 
      cityLower.includes('tokyo') || cityLower.includes('singapore')) {
    basePricePerNight = 200 + Math.random() * 150; // $200-350/night
  }
  // Moderate cities
  else if (cityLower.includes('lisbon') || cityLower.includes('porto') || cityLower.includes('barcelona') || 
           cityLower.includes('rome') || cityLower.includes('berlin')) {
    basePricePerNight = 120 + Math.random() * 100; // $120-220/night
  }
  // Budget-friendly cities
  else if (cityLower.includes('prague') || cityLower.includes('budapest') || cityLower.includes('krakow')) {
    basePricePerNight = 80 + Math.random() * 70; // $80-150/night
  }
  // Default
  else {
    basePricePerNight = 100 + Math.random() * 100; // $100-200/night
  }
  
  return [
    {
      id: 'mock-hotel-1',
      name: `${city} Grand Hotel`,
      description: 'Luxury hotel in city center',
      rating: 4,
      address: {
        lines: ['123 Main Street'],
        cityName: city,
        countryCode: 'US'
      },
      offers: [{
        id: 'offer-1',
        price: {
          total: basePricePerNight * nights,
          currency: 'USD',
          perNight: basePricePerNight
        },
        room: {
          type: 'DELUXE',
          beds: 1,
          bedType: 'KING'
        },
        policies: {
          cancellation: 'Free cancellation up to 24 hours before',
          paymentType: 'AT_HOTEL'
        }
      }]
    },
    {
      id: 'mock-hotel-2',
      name: `${city} Business Inn`,
      description: 'Modern business hotel',
      rating: 3,
      address: {
        lines: ['456 Commerce Ave'],
        cityName: city,
        countryCode: 'US'
      },
      offers: [{
        id: 'offer-2',
        price: {
          total: basePricePerNight * nights * 0.7,
          currency: 'USD',
          perNight: basePricePerNight * 0.7
        },
        room: {
          type: 'STANDARD',
          beds: 2,
          bedType: 'TWIN'
        },
        policies: {
          cancellation: 'Non-refundable',
          paymentType: 'AT_BOOKING'
        }
      }]
    }
  ];
}

/**
 * Estimate total trip cost including flights, hotels, and daily expenses
 */
export async function estimateTripCost(
  destinations: Array<{ city: string; days: number }>,
  origin: string,
  startDate: string,
  travelers: number = 1
): Promise<{
  flights: number;
  accommodation: number;
  dailyExpenses: number;
  total: number;
  currency: string;
  breakdown: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
}> {
  let flightsCost = 0;
  let accommodationCost = 0;
  const breakdown: Array<{ type: string; description: string; amount: number }> = [];
  
  // Calculate dates for the trip
  let currentDate = new Date(startDate);
  
  // Estimate flight from origin to first destination
  if (origin && destinations.length > 0) {
    const flights = await searchFlights(
      origin,
      destinations[0].city,
      currentDate.toISOString().split('T')[0],
      undefined,
      travelers
    );
    
    if (flights && flights.length > 0) {
      const cheapestFlight = flights.reduce((min: any, f: any) => 
        f.price.total < min.price.total ? f : min, flights[0]);
      
      flightsCost += cheapestFlight.price.total;
      breakdown.push({
        type: 'flight',
        description: `${origin} → ${destinations[0].city}`,
        amount: cheapestFlight.price.total
      });
    }
  }
  
  // Process each destination
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    const checkIn = currentDate.toISOString().split('T')[0];
    currentDate.setDate(currentDate.getDate() + dest.days);
    const checkOut = currentDate.toISOString().split('T')[0];
    
    // Search hotels for this destination
    const hotels = await searchHotels(dest.city, checkIn, checkOut, travelers);
    
    if (hotels && hotels.length > 0 && hotels[0].offers?.length > 0) {
      // Get average of mid-range hotels
      const avgPrice = hotels
        .slice(0, 3)
        .reduce((sum: number, h: any) => {
          const offer = h.offers[0];
          return sum + (offer?.price?.total || 0);
        }, 0) / Math.min(3, hotels.length);
      
      accommodationCost += avgPrice;
      breakdown.push({
        type: 'accommodation',
        description: `${dest.city} (${dest.days} nights)`,
        amount: avgPrice
      });
    } else {
      // Fallback estimate
      const estimatedHotelCost = 150 * dest.days * travelers;
      accommodationCost += estimatedHotelCost;
      breakdown.push({
        type: 'accommodation',
        description: `${dest.city} (${dest.days} nights)`,
        amount: estimatedHotelCost
      });
    }
    
    // Estimate flights between destinations
    if (i < destinations.length - 1) {
      const nextDest = destinations[i + 1];
      const flights = await searchFlights(
        dest.city,
        nextDest.city,
        currentDate.toISOString().split('T')[0],
        undefined,
        travelers
      );
      
      if (flights && flights.length > 0) {
        const cheapestFlight = flights.reduce((min: any, f: any) => 
          f.price.total < min.price.total ? f : min, flights[0]);
        
        flightsCost += cheapestFlight.price.total;
        breakdown.push({
          type: 'flight',
          description: `${dest.city} → ${nextDest.city}`,
          amount: cheapestFlight.price.total
        });
      } else {
        // Estimate based on distance
        const estimatedFlightCost = 200 * travelers;
        flightsCost += estimatedFlightCost;
        breakdown.push({
          type: 'flight',
          description: `${dest.city} → ${nextDest.city}`,
          amount: estimatedFlightCost
        });
      }
    }
  }
  
  // Estimate return flight if multi-destination
  if (destinations.length > 1 && origin) {
    const lastDest = destinations[destinations.length - 1];
    const flights = await searchFlights(
      lastDest.city,
      origin,
      currentDate.toISOString().split('T')[0],
      undefined,
      travelers
    );
    
    if (flights && flights.length > 0) {
      const cheapestFlight = flights.reduce((min: any, f: any) => 
        f.price.total < min.price.total ? f : min, flights[0]);
      
      flightsCost += cheapestFlight.price.total;
      breakdown.push({
        type: 'flight',
        description: `${lastDest.city} → ${origin}`,
        amount: cheapestFlight.price.total
      });
    }
  }
  
  // Estimate daily expenses (food, transport, activities)
  const totalDays = destinations.reduce((sum, d) => sum + d.days, 0);
  const dailyExpenses = totalDays * travelers * 100; // $100 per person per day
  
  breakdown.push({
    type: 'daily',
    description: `Daily expenses (${totalDays} days × ${travelers} people)`,
    amount: dailyExpenses
  });
  
  return {
    flights: flightsCost,
    accommodation: accommodationCost,
    dailyExpenses,
    total: flightsCost + accommodationCost + dailyExpenses,
    currency: 'USD',
    breakdown
  };
}