/**
 * OpenAI Travel Prompts - Enhanced with Specific Venue Generation
 * Critical: These prompts MUST generate specific, famous venue names that LocationIQ can find
 */

/**
 * System prompt for itinerary generation with specific venue requirements
 */
export const ITINERARY_SYSTEM_PROMPT = `You are an expert travel planner who ONLY recommends FAMOUS, WELL-KNOWN venues that exist in real life.

CRITICAL REQUIREMENTS:
1. ALWAYS use SPECIFIC, FAMOUS venue names (e.g., "Louvre Museum", "Eiffel Tower", "Le Comptoir du Relais")
2. NEVER use generic names (e.g., "Local restaurant", "Nice cafe", "Museum")
3. ALWAYS set address to "Address N/A" - LocationIQ will provide the real address
4. ALWAYS include venue_search field with format: "[Venue Name] [City]"
5. Group activities by neighborhoods/zones to minimize travel time

Return JSON only. No explanatory text.`;

/**
 * Build user prompt for destination chunk generation
 */
export function buildChunkPrompt(destination: string, days: number, dayOffset: number): string {
  return `Generate EXACTLY ${days} days for ${destination}.

Return JSON: {"days": [array of ${days} day objects]}

Each day MUST have:
{
  "day": ${dayOffset + 1} to ${dayOffset + days},
  "destination_city": "${destination}",
  "title": "Day X: Specific Area/Theme",
  "theme": "Cultural/Historical/Culinary/etc",
  "neighborhood_focus": "Group activities by neighborhood",
  "activities": [5 activities in same area/zone]
}

Each activity MUST have:
{
  "time": "HH:MM AM/PM",
  "description": "Visit/Dine at [SPECIFIC FAMOUS VENUE]",
  "venue_name": "SPECIFIC FAMOUS VENUE NAME",
  "venue_search": "[Venue Name] ${destination}",
  "category": "Food|Museum|Park|Attraction|Shopping",
  "duration": "X hours",
  "address": "Address N/A",
  "tips": "Practical tip about this specific venue"
}

EXAMPLES OF GOOD vs BAD:

GOOD Activity (Paris):
{
  "time": "9:00 AM",
  "description": "Breakfast at the famous Café de Flore",
  "venue_name": "Café de Flore",
  "venue_search": "Café de Flore Paris",
  "category": "Food",
  "duration": "1 hour",
  "address": "Address N/A",
  "tips": "Try their famous hot chocolate and croissants"
}

BAD Activity:
{
  "time": "9:00 AM",
  "description": "Breakfast at local cafe",
  "venue_name": "Nice cafe",
  "venue_search": "cafe",
  "category": "Food",
  "duration": "1 hour",
  "address": "123 Main St",
  "tips": "Good coffee"
}

FAMOUS VENUES TO USE FOR ${destination.toUpperCase()}:
${getVenueExamples(destination)}

ZONE GUIDANCE for ${destination.toUpperCase()}:
${getZoneGuidance(destination)}

CRITICAL RULES:
1. Use ONLY famous, specific venues that tourists would recognize
2. NEVER make up addresses - always use "Address N/A"
3. Include venue_search for EVERY activity
4. Group ALL activities in a day by neighborhood/zone - NO ZIGZAGGING
5. Each day should focus on ONE or TWO nearby zones maximum
6. Order activities logically within each zone
7. Return EXACTLY ${days} day objects`;
}

/**
 * Build prompt for combined multi-city itinerary
 */
export function buildCombinedPrompt(
  destinations: Array<{ city: string; days: number }>,
  totalDays: number
): string {
  const destinationList = destinations.map((d, i) => {
    const startDay = destinations.slice(0, i).reduce((sum, dest) => sum + dest.days, 1);
    const endDay = startDay + d.days - 1;
    return `- Days ${startDay}-${endDay}: ${d.city} (${d.days} days)`;
  }).join('\n');

  return `Generate a complete ${totalDays}-day itinerary for this multi-city trip:
${destinationList}

Return a JSON array with EXACTLY ${totalDays} day objects.

Each day MUST include:
- day: sequential number (1 to ${totalDays})
- destination_city: current city name
- title: "Day X: Specific Theme/Area"
- theme: day's theme
- neighborhood: specific district/area name
- activities: array of 5 activities

Each activity MUST have:
- time: "HH:MM AM/PM"
- description: "Activity at [SPECIFIC VENUE]"
- venue_name: "Famous Venue Name"
- venue_search: "[Venue Name] [City]"
- category: Food|Museum|Park|Attraction|Shopping
- duration: "X hours"
- address: "Address N/A"
- tips: specific venue tips

USE ONLY FAMOUS VENUES. Examples:
${destinations.map(d => `${d.city}: ${getVenueExamples(d.city).split('\n').slice(0, 3).join(', ')}`).join('\n')}

NEVER use generic names. ALWAYS use "Address N/A".
Return EXACTLY ${totalDays} days total.`;
}

import { getRandomVenues } from './venue-knowledge-base';
import { getZoneRecommendations } from './zone-based-planner';

/**
 * Get zone guidance for cities
 */
function getZoneGuidance(city: string): string {
  const cityLower = city.toLowerCase();

  const zoneGuides: Record<string, string> = {
    'london': `Day 1: Westminster & South Bank (Big Ben, London Eye, Westminster Abbey)
Day 2: City of London & Tower Area (Tower of London, Tower Bridge, St Paul's)
Day 3: West End & Covent Garden (British Museum, Shopping, Theatre)`,

    'paris': `Day 1: Central Paris & Louvre Area (Louvre, Tuileries, Place Vendôme)
Day 2: Latin Quarter & Saint-Germain (Notre-Dame, Panthéon, cafés)
Day 3: Eiffel Tower & Champs-Élysées (Eiffel Tower, Arc de Triomphe, shopping)`,

    'tokyo': `Day 1: Central Tokyo & Ginza (Imperial Palace, Ginza shopping, Tokyo Station)
Day 2: Shibuya & Shinjuku (Meiji Shrine, Harajuku, Shibuya Crossing)
Day 3: Asakusa & Ueno (Senso-ji Temple, Tokyo Skytree, Ueno Park)`,

    'new york': `Day 1: Midtown Manhattan (Times Square, Empire State, Central Park)
Day 2: Downtown & Financial District (9/11 Memorial, Wall Street, Brooklyn Bridge)
Day 3: Village & SoHo (Greenwich Village, Washington Square, Shopping)`
  };

  return zoneGuides[cityLower] || 'Group activities by neighborhood to minimize travel time';
}

/**
 * Get venue examples for specific cities
 */
function getVenueExamples(city: string): string {
  const cityLower = city.toLowerCase();

  // Try to get venues from knowledge base first
  const restaurants = getRandomVenues('restaurants', 3);
  const cafes = getRandomVenues('cafes', 2);
  const attractions = getRandomVenues('attractions', 3);
  const museums = getRandomVenues('museums', 2);

  if (restaurants.length > 0) {
    const examples = [
      `- Restaurants: ${restaurants.map(v => v.name).join(', ')}`,
      `- Cafes: ${cafes.map(v => v.name).join(', ') || 'Local cafes'}`,
      `- Attractions: ${attractions.map(v => v.name).join(', ')}`,
      `- Museums: ${museums.map(v => v.name).join(', ') || 'Local museums'}`
    ];
    return examples.join('\n');
  }

  const venueDatabase: Record<string, string> = {
    'london': `- Museums: British Museum, National Gallery, Tate Modern, Victoria and Albert Museum
- Restaurants: Dishoom, Sketch, The Ledbury, Hawksmoor Seven Dials
- Cafes: Monmouth Coffee, Gail's Bakery, The Breakfast Club
- Attractions: Tower of London, Westminster Abbey, The Shard, London Eye
- Parks: Hyde Park, Regent's Park, Greenwich Park
- Shopping: Harrods, Liberty London, Camden Market`,

    'paris': `- Museums: Louvre Museum, Musée d'Orsay, Centre Pompidou, Rodin Museum
- Restaurants: L'Ami Jean, Le Comptoir du Relais, Breizh Café, L'As du Fallafel
- Cafes: Café de Flore, Les Deux Magots, Angelina, Pierre Hermé
- Attractions: Eiffel Tower, Arc de Triomphe, Sacré-Cœur, Notre-Dame
- Parks: Luxembourg Gardens, Tuileries Garden, Parc des Buttes-Chaumont
- Shopping: Galeries Lafayette, Le Marais boutiques, Champs-Élysées`,

    'tokyo': `- Museums: Tokyo National Museum, Mori Art Museum, Ghibli Museum
- Restaurants: Sukiyabashi Jiro, Narisawa, Ichiran Ramen, Tsukiji Outer Market
- Cafes: Blue Bottle Coffee, Starbucks Reserve Roastery, Omotesando Koffee
- Attractions: Senso-ji Temple, Tokyo Skytree, Meiji Shrine, Tokyo Tower
- Parks: Shinjuku Gyoen, Ueno Park, Yoyogi Park
- Shopping: Shibuya 109, Takashimaya, Don Quijote, Ginza Six`,

    'new york': `- Museums: MoMA, Metropolitan Museum of Art, American Museum of Natural History
- Restaurants: Eleven Madison Park, Katz's Delicatessen, Joe's Pizza, Shake Shack
- Cafes: Blue Bottle Coffee, La Colombe, Ralph's Coffee, Levain Bakery
- Attractions: Statue of Liberty, Empire State Building, Central Park, Brooklyn Bridge
- Parks: Central Park, High Line, Bryant Park, Brooklyn Bridge Park
- Shopping: Fifth Avenue, SoHo boutiques, Chelsea Market, Bloomingdale's`,

    'rome': `- Museums: Vatican Museums, Galleria Borghese, Capitoline Museums
- Restaurants: Checchino dal 1887, Flavio al Velavevodetto, Pizzarium, Giolitti
- Cafes: Sant'Eustachio Il Caffè, Tazza d'Oro, Antico Caffè Greco
- Attractions: Colosseum, Roman Forum, Trevi Fountain, Pantheon, Spanish Steps
- Parks: Villa Borghese, Villa Doria Pamphili, Orange Garden
- Shopping: Via del Corso, Via Condotti, Campo de' Fiori Market`,

    'barcelona': `- Museums: Sagrada Familia, Park Güell, Picasso Museum, MNAC
- Restaurants: Tickets Bar, Can Solé, Cal Pep, La Boqueria Market
- Cafes: Satan's Coffee Corner, Nomad Coffee, Federal Café
- Attractions: Casa Batlló, La Rambla, Gothic Quarter, Montjuïc
- Parks: Park Güell, Ciutadella Park, Montjuïc Park
- Shopping: Passeig de Gràcia, El Born boutiques, La Boqueria Market`,

    'amsterdam': `- Museums: Rijksmuseum, Van Gogh Museum, Anne Frank House, Rembrandt House
- Restaurants: De Kas, Greetje, Café de Reiger, Restaurant Bougainville
- Cafes: Coffee & Coconuts, Café de Jaren, CT Coffee & Coconuts
- Attractions: Canal Ring, Jordaan District, Red Light District, Vondelpark
- Parks: Vondelpark, Westerpark, Amsterdamse Bos
- Shopping: Nine Streets, Albert Cuyp Market, De Bijenkorf`,

    'dubai': `- Museums: Dubai Museum, Etihad Museum, Coffee Museum
- Restaurants: Zuma, La Petite Maison, Al Fanar, Ravi Restaurant
- Cafes: Arabian Tea House, The Brass, Common Grounds
- Attractions: Burj Khalifa, Dubai Mall, Dubai Fountain, Gold Souk
- Parks: Zabeel Park, Dubai Miracle Garden, Safa Park
- Shopping: Dubai Mall, Mall of the Emirates, Gold Souk, Spice Souk`,

    'singapore': `- Museums: National Gallery Singapore, ArtScience Museum, Asian Civilisations Museum
- Restaurants: Hawker Chan, Jumbo Seafood, Burnt Ends, Maxwell Food Centre
- Cafes: Atlas Coffeehouse, Tiong Bahru Bakery, Chye Seng Huat Hardware
- Attractions: Marina Bay Sands, Gardens by the Bay, Sentosa Island, Merlion Park
- Parks: Gardens by the Bay, Singapore Botanic Gardens, East Coast Park
- Shopping: Orchard Road, Bugis Street, Marina Bay Sands Shoppes`
  };

  // Return specific examples if we have them, otherwise return generic guidance
  if (venueDatabase[cityLower]) {
    return venueDatabase[cityLower];
  }

  // Generic examples for unknown cities
  return `- Use Wikipedia to find famous landmarks and venues
- Search for "top restaurants in ${city}"
- Include the city's main museum, cathedral, or palace
- Find the famous local market or shopping district
- Use specific neighborhood names like historic center or old town`;
}

/**
 * Validation prompt to check if venues are specific enough
 */
export const VENUE_VALIDATION_PROMPT = `Review this activity and ensure it has a SPECIFIC venue name:
If the venue name is generic (like "local restaurant", "nice cafe", "museum"),
suggest a specific, famous venue instead.
Always return: {venue_name: "Specific Name", venue_search: "Name City", address: "Address N/A"}`;