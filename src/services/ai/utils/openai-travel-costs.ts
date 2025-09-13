/**
 * OpenAI-based Travel Cost Estimator
 * Uses GPT-4o-mini to provide accurate, real-world flight and hotel prices
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface FlightEstimate {
  origin: string;
  destination: string;
  price: {
    economy: number;
    business?: number;
  };
  duration: string;
  airlines: string[];
  notes?: string;
}

interface HotelEstimate {
  city: string;
  pricePerNight: {
    budget: number;
    midRange: number;
    luxury: number;
  };
  recommendedAreas: string[];
  notes?: string;
}

/**
 * Get flight price estimates using OpenAI
 */
export async function estimateFlightCost(
  origin: string,
  destination: string,
  month: string = 'next month'
): Promise<FlightEstimate> {
  const client = getOpenAIClient();
  
  const prompt = `Provide realistic flight price estimates for:
Route: ${origin} to ${destination}
Time: ${month}

Return a JSON object with:
{
  "origin": "${origin}",
  "destination": "${destination}",
  "price": {
    "economy": <realistic economy price in USD>,
    "business": <business class price if applicable>
  },
  "duration": "<flight duration>",
  "airlines": ["<airline1>", "<airline2>"],
  "notes": "<any important notes about this route>"
}

Consider:
- Current market prices (2024-2025)
- Seasonal variations
- Route popularity
- Direct vs connecting flights
- Major airlines that operate this route

Be realistic and accurate. For example:
- LA to Tokyo: $800-1200 economy
- LA to London: $600-1000 economy
- NYC to Paris: $500-900 economy`;

  try {
    logger.info('AI', `Getting flight estimate: ${origin} → ${destination}`);
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a travel pricing expert. Provide accurate, current flight prices based on real market data.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent pricing
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const estimate = JSON.parse(response.choices[0]?.message?.content || '{}') as FlightEstimate;
    
    logger.info('AI', 'Flight estimate received', {
      route: `${origin} → ${destination}`,
      economy: estimate.price?.economy,
      duration: estimate.duration
    });
    
    return estimate;
  } catch (error: any) {
    logger.error('AI', 'Failed to get flight estimate', { error: error.message });
    
    // Fallback to basic calculation
    return {
      origin,
      destination,
      price: {
        economy: calculateFallbackPrice(origin, destination),
        business: calculateFallbackPrice(origin, destination) * 3
      },
      duration: estimateDuration(origin, destination),
      airlines: ['Multiple Airlines'],
      notes: 'Estimated price'
    };
  }
}

/**
 * Get hotel price estimates using OpenAI
 */
export async function estimateHotelCost(
  city: string,
  nights: number = 1
): Promise<HotelEstimate> {
  const client = getOpenAIClient();
  
  const prompt = `Provide realistic hotel price estimates for:
City: ${city}
Duration: ${nights} nights

Return a JSON object with:
{
  "city": "${city}",
  "pricePerNight": {
    "budget": <budget hotel/hostel price per night in USD>,
    "midRange": <3-4 star hotel price per night>,
    "luxury": <5 star hotel price per night>
  },
  "recommendedAreas": ["<area1>", "<area2>", "<area3>"],
  "notes": "<any important notes about hotels in this city>"
}

Consider:
- Current market prices (2024-2025)
- City tier and cost of living
- Tourist vs business areas
- Seasonal variations

Be realistic. For example:
- Tokyo: Budget $50-80, Mid $150-250, Luxury $400+
- Bangkok: Budget $20-40, Mid $60-120, Luxury $200+
- London: Budget $60-100, Mid $150-300, Luxury $500+
- Paris: Budget $70-120, Mid $200-350, Luxury $600+`;

  try {
    logger.info('AI', `Getting hotel estimate for ${city}`);
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a hotel pricing expert. Provide accurate, current hotel prices based on real market data.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const estimate = JSON.parse(response.choices[0]?.message?.content || '{}') as HotelEstimate;
    
    logger.info('AI', 'Hotel estimate received', {
      city,
      budget: estimate.pricePerNight?.budget,
      midRange: estimate.pricePerNight?.midRange,
      luxury: estimate.pricePerNight?.luxury
    });
    
    return estimate;
  } catch (error: any) {
    logger.error('AI', 'Failed to get hotel estimate', { error: error.message });
    
    // Fallback to basic tier-based pricing
    return {
      city,
      pricePerNight: {
        budget: calculateFallbackHotelPrice(city, 'budget'),
        midRange: calculateFallbackHotelPrice(city, 'mid'),
        luxury: calculateFallbackHotelPrice(city, 'luxury')
      },
      recommendedAreas: [`${city} city center`],
      notes: 'Estimated price'
    };
  }
}

/**
 * Get comprehensive trip cost estimate
 */
export async function estimateTripCost(
  origin: string,
  destinations: Array<{ city: string; days: number }>,
  travelers: number = 1
): Promise<{
  flights: FlightEstimate[];
  hotels: Record<string, HotelEstimate>;
  totalEstimate: {
    budget: number;
    midRange: number;
    luxury: number;
  };
}> {
  const flights: FlightEstimate[] = [];
  const hotels: Record<string, HotelEstimate> = {};
  
  // Estimate flights
  if (destinations.length > 0) {
    // Outbound flight
    const outbound = await estimateFlightCost(origin, destinations[0].city);
    flights.push(outbound);
    
    // Inter-city flights for multi-destination trips
    for (let i = 0; i < destinations.length - 1; i++) {
      const interCity = await estimateFlightCost(
        destinations[i].city,
        destinations[i + 1].city
      );
      flights.push(interCity);
    }
    
    // Return flight
    const returnFlight = await estimateFlightCost(
      destinations[destinations.length - 1].city,
      origin
    );
    flights.push(returnFlight);
  }
  
  // Estimate hotels for each destination
  for (const dest of destinations) {
    const hotelEstimate = await estimateHotelCost(dest.city, dest.days);
    hotels[dest.city] = hotelEstimate;
  }
  
  // Calculate total costs
  const totalFlightCost = flights.reduce((sum, f) => sum + (f.price?.economy || 0), 0) * travelers;
  
  const totalHotelCost = {
    budget: destinations.reduce((sum, d) => 
      sum + (hotels[d.city]?.pricePerNight?.budget || 100) * d.days, 0) * travelers,
    midRange: destinations.reduce((sum, d) => 
      sum + (hotels[d.city]?.pricePerNight?.midRange || 200) * d.days, 0) * travelers,
    luxury: destinations.reduce((sum, d) => 
      sum + (hotels[d.city]?.pricePerNight?.luxury || 500) * d.days, 0) * travelers
  };
  
  // Add daily expenses estimate (food, transport, activities)
  const totalDays = destinations.reduce((sum, d) => sum + d.days, 0);
  const dailyExpenses = {
    budget: 50 * totalDays * travelers,
    midRange: 100 * totalDays * travelers,
    luxury: 200 * totalDays * travelers
  };
  
  return {
    flights,
    hotels,
    totalEstimate: {
      budget: totalFlightCost + totalHotelCost.budget + dailyExpenses.budget,
      midRange: totalFlightCost + totalHotelCost.midRange + dailyExpenses.midRange,
      luxury: totalFlightCost + totalHotelCost.luxury + dailyExpenses.luxury
    }
  };
}

// Fallback calculations
function calculateFallbackPrice(origin: string, destination: string): number {
  const o = origin.toLowerCase();
  const d = destination.toLowerCase();
  
  // Japan routes
  if ((o.includes('la') || o.includes('los angeles')) && 
      (d.includes('tokyo') || d.includes('osaka') || d.includes('kyoto'))) {
    return 900 + Math.random() * 400; // $900-1300
  }
  
  // Europe routes
  if ((o.includes('la') || o.includes('new york')) && 
      (d.includes('london') || d.includes('paris') || d.includes('rome'))) {
    return 600 + Math.random() * 400; // $600-1000
  }
  
  // Asia internal
  if ((d.includes('tokyo') || d.includes('osaka')) && 
      (o.includes('tokyo') || o.includes('osaka') || o.includes('kyoto'))) {
    return 100 + Math.random() * 100; // $100-200
  }
  
  // Default international
  return 700 + Math.random() * 500; // $700-1200
}

function calculateFallbackHotelPrice(city: string, tier: string): number {
  const c = city.toLowerCase();
  
  // Japan cities
  if (c.includes('tokyo') || c.includes('kyoto') || c.includes('osaka')) {
    if (tier === 'budget') return 60 + Math.random() * 30; // $60-90
    if (tier === 'mid') return 150 + Math.random() * 100; // $150-250
    return 400 + Math.random() * 200; // $400-600
  }
  
  // Major cities
  if (c.includes('london') || c.includes('paris') || c.includes('new york')) {
    if (tier === 'budget') return 80 + Math.random() * 40; // $80-120
    if (tier === 'mid') return 200 + Math.random() * 100; // $200-300
    return 500 + Math.random() * 300; // $500-800
  }
  
  // Default
  if (tier === 'budget') return 50 + Math.random() * 30; // $50-80
  if (tier === 'mid') return 120 + Math.random() * 80; // $120-200
  return 300 + Math.random() * 200; // $300-500
}

function estimateDuration(origin: string, destination: string): string {
  const o = origin.toLowerCase();
  const d = destination.toLowerCase();
  
  if ((o.includes('la') && d.includes('tokyo')) || 
      (o.includes('tokyo') && d.includes('la'))) {
    return '11-12 hours';
  }
  
  if ((o.includes('la') && d.includes('london')) || 
      (o.includes('london') && d.includes('la'))) {
    return '10-11 hours';
  }
  
  return '8-15 hours';
}