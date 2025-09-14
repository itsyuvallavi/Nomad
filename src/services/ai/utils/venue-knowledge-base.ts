/**
 * Venue Knowledge Base - Famous, specific venues by city
 * These are well-known venues that LocationIQ can reliably find
 */

export interface VenueInfo {
  name: string;
  category: 'restaurant' | 'cafe' | 'museum' | 'attraction' | 'park' | 'shopping' | 'hotel';
  neighborhood?: string;
  searchQuery: string; // Optimized for LocationIQ
  description?: string;
}

export interface CityVenues {
  restaurants: VenueInfo[];
  cafes: VenueInfo[];
  attractions: VenueInfo[];
  museums: VenueInfo[];
  parks: VenueInfo[];
  shopping: VenueInfo[];
  hotels: VenueInfo[];
}

const venueDatabase: Record<string, CityVenues> = {
  'london': {
    restaurants: [
      { name: 'Dishoom', category: 'restaurant', neighborhood: 'Covent Garden', searchQuery: 'Dishoom Covent Garden London' },
      { name: 'Sketch', category: 'restaurant', neighborhood: 'Mayfair', searchQuery: 'Sketch Mayfair London' },
      { name: 'The Ledbury', category: 'restaurant', neighborhood: 'Notting Hill', searchQuery: 'The Ledbury Notting Hill' },
      { name: 'Hawksmoor Seven Dials', category: 'restaurant', neighborhood: 'Covent Garden', searchQuery: 'Hawksmoor Seven Dials' },
      { name: 'Borough Market', category: 'restaurant', neighborhood: 'Southwark', searchQuery: 'Borough Market London' },
      { name: 'Flat Iron', category: 'restaurant', neighborhood: 'Soho', searchQuery: 'Flat Iron Soho London' },
      { name: 'Barrafina', category: 'restaurant', neighborhood: 'Soho', searchQuery: 'Barrafina Soho London' }
    ],
    cafes: [
      { name: 'Monmouth Coffee', category: 'cafe', neighborhood: 'Borough', searchQuery: 'Monmouth Coffee Borough Market' },
      { name: "Gail's Bakery", category: 'cafe', neighborhood: 'Various', searchQuery: "Gail's Bakery London" },
      { name: 'The Breakfast Club', category: 'cafe', neighborhood: 'Soho', searchQuery: 'The Breakfast Club Soho' },
      { name: 'Granger & Co', category: 'cafe', neighborhood: 'Notting Hill', searchQuery: 'Granger & Co Notting Hill' },
      { name: 'Attendant Coffee', category: 'cafe', neighborhood: 'Fitzrovia', searchQuery: 'Attendant Coffee Fitzrovia' }
    ],
    attractions: [
      { name: 'Tower of London', category: 'attraction', neighborhood: 'Tower Hill', searchQuery: 'Tower of London' },
      { name: 'Westminster Abbey', category: 'attraction', neighborhood: 'Westminster', searchQuery: 'Westminster Abbey London' },
      { name: 'The Shard', category: 'attraction', neighborhood: 'London Bridge', searchQuery: 'The Shard London' },
      { name: 'London Eye', category: 'attraction', neighborhood: 'South Bank', searchQuery: 'London Eye' },
      { name: 'Tower Bridge', category: 'attraction', neighborhood: 'Tower Hill', searchQuery: 'Tower Bridge London' },
      { name: 'Buckingham Palace', category: 'attraction', neighborhood: 'Westminster', searchQuery: 'Buckingham Palace' },
      { name: "St Paul's Cathedral", category: 'attraction', neighborhood: 'City of London', searchQuery: "St Paul's Cathedral London" }
    ],
    museums: [
      { name: 'British Museum', category: 'museum', neighborhood: 'Bloomsbury', searchQuery: 'British Museum London' },
      { name: 'National Gallery', category: 'museum', neighborhood: 'Trafalgar Square', searchQuery: 'National Gallery London' },
      { name: 'Tate Modern', category: 'museum', neighborhood: 'South Bank', searchQuery: 'Tate Modern London' },
      { name: 'Victoria and Albert Museum', category: 'museum', neighborhood: 'South Kensington', searchQuery: 'V&A Museum London' },
      { name: 'Natural History Museum', category: 'museum', neighborhood: 'South Kensington', searchQuery: 'Natural History Museum London' }
    ],
    parks: [
      { name: 'Hyde Park', category: 'park', neighborhood: 'Hyde Park', searchQuery: 'Hyde Park London' },
      { name: "Regent's Park", category: 'park', neighborhood: "Regent's Park", searchQuery: "Regent's Park London" },
      { name: 'Greenwich Park', category: 'park', neighborhood: 'Greenwich', searchQuery: 'Greenwich Park London' },
      { name: "St James's Park", category: 'park', neighborhood: 'Westminster', searchQuery: "St James's Park London" }
    ],
    shopping: [
      { name: 'Harrods', category: 'shopping', neighborhood: 'Knightsbridge', searchQuery: 'Harrods London' },
      { name: 'Liberty London', category: 'shopping', neighborhood: 'Soho', searchQuery: 'Liberty London' },
      { name: 'Camden Market', category: 'shopping', neighborhood: 'Camden', searchQuery: 'Camden Market London' },
      { name: 'Portobello Road Market', category: 'shopping', neighborhood: 'Notting Hill', searchQuery: 'Portobello Road Market' }
    ],
    hotels: [
      { name: 'The Savoy', category: 'hotel', neighborhood: 'Strand', searchQuery: 'The Savoy Hotel London' },
      { name: 'Claridges', category: 'hotel', neighborhood: 'Mayfair', searchQuery: 'Claridges Hotel London' },
      { name: 'The Zetter Townhouse', category: 'hotel', neighborhood: 'Marylebone', searchQuery: 'Zetter Townhouse Marylebone' }
    ]
  },

  'paris': {
    restaurants: [
      { name: "L'Ami Jean", category: 'restaurant', neighborhood: '7th arr.', searchQuery: "L'Ami Jean Paris" },
      { name: 'Le Comptoir du Relais', category: 'restaurant', neighborhood: 'Saint-Germain', searchQuery: 'Le Comptoir du Relais Paris' },
      { name: 'Breizh Café', category: 'restaurant', neighborhood: 'Marais', searchQuery: 'Breizh Café Marais Paris' },
      { name: "L'As du Fallafel", category: 'restaurant', neighborhood: 'Marais', searchQuery: "L'As du Fallafel Paris" },
      { name: 'Chez Janou', category: 'restaurant', neighborhood: 'Marais', searchQuery: 'Chez Janou Paris' },
      { name: 'Bistrot Paul Bert', category: 'restaurant', neighborhood: '11th arr.', searchQuery: 'Bistrot Paul Bert Paris' }
    ],
    cafes: [
      { name: 'Café de Flore', category: 'cafe', neighborhood: 'Saint-Germain', searchQuery: 'Café de Flore Paris' },
      { name: 'Les Deux Magots', category: 'cafe', neighborhood: 'Saint-Germain', searchQuery: 'Les Deux Magots Paris' },
      { name: 'Angelina', category: 'cafe', neighborhood: 'Rue de Rivoli', searchQuery: 'Angelina Paris Rivoli' },
      { name: 'Pierre Hermé', category: 'cafe', neighborhood: 'Saint-Germain', searchQuery: 'Pierre Hermé Saint-Germain Paris' },
      { name: 'Du Pain et des Idées', category: 'cafe', neighborhood: '10th arr.', searchQuery: 'Du Pain et des Idées Paris' }
    ],
    attractions: [
      { name: 'Eiffel Tower', category: 'attraction', neighborhood: '7th arr.', searchQuery: 'Tour Eiffel Paris' },
      { name: 'Arc de Triomphe', category: 'attraction', neighborhood: 'Champs-Élysées', searchQuery: 'Arc de Triomphe Paris' },
      { name: 'Sacré-Cœur', category: 'attraction', neighborhood: 'Montmartre', searchQuery: 'Sacré-Cœur Montmartre Paris' },
      { name: 'Notre-Dame', category: 'attraction', neighborhood: 'Île de la Cité', searchQuery: 'Notre-Dame Paris' },
      { name: 'Panthéon', category: 'attraction', neighborhood: 'Latin Quarter', searchQuery: 'Panthéon Paris' }
    ],
    museums: [
      { name: 'Louvre Museum', category: 'museum', neighborhood: '1st arr.', searchQuery: 'Musée du Louvre Paris' },
      { name: "Musée d'Orsay", category: 'museum', neighborhood: '7th arr.', searchQuery: "Musée d'Orsay Paris" },
      { name: 'Centre Pompidou', category: 'museum', neighborhood: 'Beaubourg', searchQuery: 'Centre Pompidou Paris' },
      { name: 'Rodin Museum', category: 'museum', neighborhood: '7th arr.', searchQuery: 'Musée Rodin Paris' }
    ],
    parks: [
      { name: 'Luxembourg Gardens', category: 'park', neighborhood: '6th arr.', searchQuery: 'Jardin du Luxembourg Paris' },
      { name: 'Tuileries Garden', category: 'park', neighborhood: '1st arr.', searchQuery: 'Jardin des Tuileries Paris' },
      { name: 'Parc des Buttes-Chaumont', category: 'park', neighborhood: '19th arr.', searchQuery: 'Parc des Buttes-Chaumont Paris' }
    ],
    shopping: [
      { name: 'Galeries Lafayette', category: 'shopping', neighborhood: 'Opéra', searchQuery: 'Galeries Lafayette Paris' },
      { name: 'Le Marais', category: 'shopping', neighborhood: 'Marais', searchQuery: 'Le Marais shopping Paris' },
      { name: 'Champs-Élysées', category: 'shopping', neighborhood: '8th arr.', searchQuery: 'Champs-Élysées Paris' }
    ],
    hotels: [
      { name: 'Hôtel des Grands Boulevards', category: 'hotel', neighborhood: '2nd arr.', searchQuery: 'Hôtel des Grands Boulevards Paris' },
      { name: 'Le Meurice', category: 'hotel', neighborhood: '1st arr.', searchQuery: 'Le Meurice Paris' }
    ]
  },

  'tokyo': {
    restaurants: [
      { name: 'Sukiyabashi Jiro', category: 'restaurant', neighborhood: 'Ginza', searchQuery: 'Sukiyabashi Jiro Ginza Tokyo' },
      { name: 'Narisawa', category: 'restaurant', neighborhood: 'Minato', searchQuery: 'Narisawa Restaurant Tokyo' },
      { name: 'Ichiran Ramen', category: 'restaurant', neighborhood: 'Shibuya', searchQuery: 'Ichiran Ramen Shibuya' },
      { name: 'Tsukiji Outer Market', category: 'restaurant', neighborhood: 'Tsukiji', searchQuery: 'Tsukiji Outer Market Tokyo' },
      { name: 'Gonpachi', category: 'restaurant', neighborhood: 'Roppongi', searchQuery: 'Gonpachi Roppongi Tokyo' }
    ],
    cafes: [
      { name: 'Blue Bottle Coffee', category: 'cafe', neighborhood: 'Roppongi', searchQuery: 'Blue Bottle Coffee Roppongi' },
      { name: 'Starbucks Reserve Roastery', category: 'cafe', neighborhood: 'Meguro', searchQuery: 'Starbucks Reserve Roastery Tokyo' },
      { name: 'Omotesando Koffee', category: 'cafe', neighborhood: 'Omotesando', searchQuery: 'Omotesando Koffee Tokyo' }
    ],
    attractions: [
      { name: 'Senso-ji Temple', category: 'attraction', neighborhood: 'Asakusa', searchQuery: 'Senso-ji Temple Asakusa' },
      { name: 'Tokyo Skytree', category: 'attraction', neighborhood: 'Sumida', searchQuery: 'Tokyo Skytree' },
      { name: 'Meiji Shrine', category: 'attraction', neighborhood: 'Shibuya', searchQuery: 'Meiji Shrine Tokyo' },
      { name: 'Tokyo Tower', category: 'attraction', neighborhood: 'Minato', searchQuery: 'Tokyo Tower' }
    ],
    museums: [
      { name: 'Tokyo National Museum', category: 'museum', neighborhood: 'Ueno', searchQuery: 'Tokyo National Museum' },
      { name: 'Mori Art Museum', category: 'museum', neighborhood: 'Roppongi', searchQuery: 'Mori Art Museum Roppongi' },
      { name: 'Ghibli Museum', category: 'museum', neighborhood: 'Mitaka', searchQuery: 'Ghibli Museum Mitaka' }
    ],
    parks: [
      { name: 'Shinjuku Gyoen', category: 'park', neighborhood: 'Shinjuku', searchQuery: 'Shinjuku Gyoen Tokyo' },
      { name: 'Ueno Park', category: 'park', neighborhood: 'Ueno', searchQuery: 'Ueno Park Tokyo' },
      { name: 'Yoyogi Park', category: 'park', neighborhood: 'Shibuya', searchQuery: 'Yoyogi Park Tokyo' }
    ],
    shopping: [
      { name: 'Shibuya 109', category: 'shopping', neighborhood: 'Shibuya', searchQuery: 'Shibuya 109 Tokyo' },
      { name: 'Takashimaya', category: 'shopping', neighborhood: 'Shinjuku', searchQuery: 'Takashimaya Shinjuku' },
      { name: 'Don Quijote', category: 'shopping', neighborhood: 'Shibuya', searchQuery: 'Don Quijote Shibuya' },
      { name: 'Ginza Six', category: 'shopping', neighborhood: 'Ginza', searchQuery: 'Ginza Six Tokyo' }
    ],
    hotels: [
      { name: 'Park Hyatt Tokyo', category: 'hotel', neighborhood: 'Shinjuku', searchQuery: 'Park Hyatt Tokyo' },
      { name: 'Mandarin Oriental', category: 'hotel', neighborhood: 'Nihonbashi', searchQuery: 'Mandarin Oriental Tokyo' }
    ]
  },

  'new york': {
    restaurants: [
      { name: 'Eleven Madison Park', category: 'restaurant', neighborhood: 'Flatiron', searchQuery: 'Eleven Madison Park NYC' },
      { name: "Katz's Delicatessen", category: 'restaurant', neighborhood: 'Lower East Side', searchQuery: "Katz's Delicatessen NYC" },
      { name: "Joe's Pizza", category: 'restaurant', neighborhood: 'Greenwich Village', searchQuery: "Joe's Pizza Greenwich Village" },
      { name: 'Shake Shack', category: 'restaurant', neighborhood: 'Madison Square Park', searchQuery: 'Shake Shack Madison Square' },
      { name: 'Balthazar', category: 'restaurant', neighborhood: 'SoHo', searchQuery: 'Balthazar Restaurant SoHo NYC' }
    ],
    cafes: [
      { name: 'Blue Bottle Coffee', category: 'cafe', neighborhood: 'Chelsea', searchQuery: 'Blue Bottle Coffee Chelsea NYC' },
      { name: 'La Colombe', category: 'cafe', neighborhood: 'SoHo', searchQuery: 'La Colombe SoHo NYC' },
      { name: "Ralph's Coffee", category: 'cafe', neighborhood: 'Fifth Avenue', searchQuery: "Ralph's Coffee Fifth Avenue" },
      { name: 'Levain Bakery', category: 'cafe', neighborhood: 'Upper West Side', searchQuery: 'Levain Bakery Upper West Side' }
    ],
    attractions: [
      { name: 'Statue of Liberty', category: 'attraction', neighborhood: 'Liberty Island', searchQuery: 'Statue of Liberty NYC' },
      { name: 'Empire State Building', category: 'attraction', neighborhood: 'Midtown', searchQuery: 'Empire State Building NYC' },
      { name: 'Central Park', category: 'attraction', neighborhood: 'Manhattan', searchQuery: 'Central Park NYC' },
      { name: 'Brooklyn Bridge', category: 'attraction', neighborhood: 'Manhattan/Brooklyn', searchQuery: 'Brooklyn Bridge NYC' },
      { name: 'Times Square', category: 'attraction', neighborhood: 'Midtown', searchQuery: 'Times Square NYC' }
    ],
    museums: [
      { name: 'MoMA', category: 'museum', neighborhood: 'Midtown', searchQuery: 'Museum of Modern Art NYC' },
      { name: 'Metropolitan Museum of Art', category: 'museum', neighborhood: 'Upper East Side', searchQuery: 'Metropolitan Museum NYC' },
      { name: 'American Museum of Natural History', category: 'museum', neighborhood: 'Upper West Side', searchQuery: 'Natural History Museum NYC' }
    ],
    parks: [
      { name: 'Central Park', category: 'park', neighborhood: 'Manhattan', searchQuery: 'Central Park NYC' },
      { name: 'High Line', category: 'park', neighborhood: 'Chelsea', searchQuery: 'High Line Park NYC' },
      { name: 'Bryant Park', category: 'park', neighborhood: 'Midtown', searchQuery: 'Bryant Park NYC' },
      { name: 'Brooklyn Bridge Park', category: 'park', neighborhood: 'Brooklyn', searchQuery: 'Brooklyn Bridge Park' }
    ],
    shopping: [
      { name: 'Fifth Avenue', category: 'shopping', neighborhood: 'Midtown', searchQuery: 'Fifth Avenue Shopping NYC' },
      { name: 'SoHo', category: 'shopping', neighborhood: 'SoHo', searchQuery: 'SoHo Shopping NYC' },
      { name: 'Chelsea Market', category: 'shopping', neighborhood: 'Chelsea', searchQuery: 'Chelsea Market NYC' },
      { name: "Bloomingdale's", category: 'shopping', neighborhood: 'Upper East Side', searchQuery: "Bloomingdale's NYC" }
    ],
    hotels: [
      { name: 'The Plaza', category: 'hotel', neighborhood: 'Fifth Avenue', searchQuery: 'The Plaza Hotel NYC' },
      { name: 'The St. Regis', category: 'hotel', neighborhood: 'Midtown', searchQuery: 'St. Regis Hotel NYC' }
    ]
  }
};

/**
 * Get venue recommendations for a city and category
 */
export function getVenueRecommendations(
  city: string,
  category: keyof CityVenues,
  limit: number = 5
): VenueInfo[] {
  const cityLower = city.toLowerCase();
  const cityVenues = venueDatabase[cityLower];

  if (!cityVenues) {
    return [];
  }

  const venues = cityVenues[category] || [];
  return venues.slice(0, limit);
}

/**
 * Get a random selection of venues for variety
 */
export function getRandomVenues(
  city: string,
  category: keyof CityVenues,
  count: number = 3
): VenueInfo[] {
  const venues = getVenueRecommendations(city, category, 100);

  // Shuffle and return requested count
  const shuffled = [...venues].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Search for a specific venue in the knowledge base
 */
export function findVenueInKnowledgeBase(
  city: string,
  venueName: string
): VenueInfo | null {
  const cityLower = city.toLowerCase();
  const cityVenues = venueDatabase[cityLower];

  if (!cityVenues) {
    return null;
  }

  const searchName = venueName.toLowerCase();

  // Search all categories
  for (const category of Object.keys(cityVenues) as Array<keyof CityVenues>) {
    const found = cityVenues[category].find(
      venue => venue.name.toLowerCase().includes(searchName) ||
               searchName.includes(venue.name.toLowerCase())
    );

    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Get neighborhood-based recommendations
 */
export function getVenuesByNeighborhood(
  city: string,
  neighborhood: string
): VenueInfo[] {
  const cityLower = city.toLowerCase();
  const cityVenues = venueDatabase[cityLower];

  if (!cityVenues) {
    return [];
  }

  const result: VenueInfo[] = [];
  const neighborhoodLower = neighborhood.toLowerCase();

  // Search all categories for venues in this neighborhood
  for (const category of Object.keys(cityVenues) as Array<keyof CityVenues>) {
    const venuesInArea = cityVenues[category].filter(
      venue => venue.neighborhood?.toLowerCase().includes(neighborhoodLower)
    );
    result.push(...venuesInArea);
  }

  return result;
}

export default venueDatabase;