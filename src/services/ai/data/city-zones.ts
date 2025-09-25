/**
 * City Zones Data Module
 * Contains zone-based planning data for major cities
 * Used for organizing activities by geographic areas
 */

// Zone information for planning
export interface Zone {
  name: string;
  neighborhoods: string[];
  coordinates: { lat: number; lng: number };
  priority?: number;
}

// City zones database for zone-based itinerary planning
export const CITY_ZONES: Record<string, Zone[]> = {
  paris: [
    {
      name: 'Central Paris',
      neighborhoods: ['1st arr.', '2nd arr.', 'Louvre', 'Palais Royal', 'Les Halles'],
      coordinates: { lat: 48.8566, lng: 2.3522 },
      priority: 1
    },
    {
      name: 'Latin Quarter',
      neighborhoods: ['5th arr.', '6th arr.', 'Latin Quarter', 'Saint-Germain'],
      coordinates: { lat: 48.8462, lng: 2.3464 },
      priority: 2
    },
    {
      name: 'Marais',
      neighborhoods: ['3rd arr.', '4th arr.', 'Marais', 'Bastille'],
      coordinates: { lat: 48.8566, lng: 2.3625 },
      priority: 3
    },
    {
      name: 'Champs-Élysées',
      neighborhoods: ['8th arr.', 'Arc de Triomphe', 'Champs-Élysées'],
      coordinates: { lat: 48.8698, lng: 2.3076 },
      priority: 4
    },
    {
      name: 'Montmartre',
      neighborhoods: ['18th arr.', 'Montmartre', 'Sacré-Cœur', 'Pigalle'],
      coordinates: { lat: 48.8867, lng: 2.3431 },
      priority: 5
    },
    {
      name: 'Eiffel Tower Area',
      neighborhoods: ['7th arr.', 'Eiffel Tower', 'Trocadéro', 'Invalides'],
      coordinates: { lat: 48.8584, lng: 2.2945 },
      priority: 6
    }
  ],
  london: [
    {
      name: 'Westminster',
      neighborhoods: ['Westminster', 'Buckingham Palace', 'Big Ben', 'Parliament'],
      coordinates: { lat: 51.4994, lng: -0.1248 },
      priority: 1
    },
    {
      name: 'Covent Garden',
      neighborhoods: ['Covent Garden', 'Soho', 'Leicester Square', 'Chinatown'],
      coordinates: { lat: 51.5117, lng: -0.1246 },
      priority: 2
    },
    {
      name: 'City of London',
      neighborhoods: ['City', 'Tower of London', 'St. Pauls', 'Bank'],
      coordinates: { lat: 51.5155, lng: -0.0922 },
      priority: 3
    },
    {
      name: 'South Bank',
      neighborhoods: ['South Bank', 'Borough Market', 'Tate Modern', 'Shakespeare Globe'],
      coordinates: { lat: 51.5076, lng: -0.0994 },
      priority: 4
    },
    {
      name: 'Kensington',
      neighborhoods: ['Kensington', 'Hyde Park', 'Museums', 'Knightsbridge'],
      coordinates: { lat: 51.5020, lng: -0.1947 },
      priority: 5
    }
  ],
  tokyo: [
    {
      name: 'Shinjuku/Shibuya',
      neighborhoods: ['Shinjuku', 'Shibuya', 'Harajuku', 'Meiji Shrine'],
      coordinates: { lat: 35.6938, lng: 139.7034 },
      priority: 1
    },
    {
      name: 'Central Tokyo',
      neighborhoods: ['Ginza', 'Tokyo Station', 'Imperial Palace', 'Marunouchi'],
      coordinates: { lat: 35.6812, lng: 139.7671 },
      priority: 2
    },
    {
      name: 'Asakusa',
      neighborhoods: ['Asakusa', 'Sensoji Temple', 'Tokyo Skytree', 'Ueno'],
      coordinates: { lat: 35.7118, lng: 139.7966 },
      priority: 3
    },
    {
      name: 'Roppongi/Akasaka',
      neighborhoods: ['Roppongi', 'Tokyo Tower', 'Akasaka', 'Azabu'],
      coordinates: { lat: 35.6628, lng: 139.7314 },
      priority: 4
    }
  ],
  rome: [
    {
      name: 'Ancient Rome',
      neighborhoods: ['Colosseum', 'Roman Forum', 'Palatine Hill', 'Capitoline'],
      coordinates: { lat: 41.8902, lng: 12.4922 },
      priority: 1
    },
    {
      name: 'Centro Storico',
      neighborhoods: ['Pantheon', 'Piazza Navona', 'Trevi Fountain', 'Spanish Steps'],
      coordinates: { lat: 41.8986, lng: 12.4768 },
      priority: 2
    },
    {
      name: 'Vatican Area',
      neighborhoods: ['Vatican City', 'St. Peters', 'Sistine Chapel', 'Castel Sant Angelo'],
      coordinates: { lat: 41.9029, lng: 12.4534 },
      priority: 3
    },
    {
      name: 'Trastevere',
      neighborhoods: ['Trastevere', 'Villa Borghese', 'Piazza del Popolo'],
      coordinates: { lat: 41.8892, lng: 12.4702 },
      priority: 4
    }
  ],
  barcelona: [
    {
      name: 'Gothic Quarter',
      neighborhoods: ['Barri Gòtic', 'Las Ramblas', 'Born', 'Cathedral'],
      coordinates: { lat: 41.3825, lng: 2.1769 },
      priority: 1
    },
    {
      name: 'Eixample',
      neighborhoods: ['Sagrada Familia', 'Passeig de Gràcia', 'Casa Batlló', 'Casa Milà'],
      coordinates: { lat: 41.4036, lng: 2.1744 },
      priority: 2
    },
    {
      name: 'Barceloneta',
      neighborhoods: ['Beach', 'Port', 'Barceloneta', 'Port Olímpic'],
      coordinates: { lat: 41.3807, lng: 2.1894 },
      priority: 3
    },
    {
      name: 'Gràcia',
      neighborhoods: ['Park Güell', 'Gràcia', 'Bunkers', 'Lesseps'],
      coordinates: { lat: 41.4145, lng: 2.1527 },
      priority: 4
    }
  ]
};

/**
 * Get zones for a city
 */
export function getCityZones(city: string): Zone[] {
  const normalizedCity = city.toLowerCase().trim();
  return CITY_ZONES[normalizedCity] || [];
}

/**
 * Find the zone for a specific neighborhood or location
 */
export function findZoneByNeighborhood(city: string, neighborhood: string): Zone | null {
  const zones = getCityZones(city);
  const normalizedNeighborhood = neighborhood.toLowerCase();

  for (const zone of zones) {
    if (zone.neighborhoods.some(n => n.toLowerCase().includes(normalizedNeighborhood))) {
      return zone;
    }
  }

  return null;
}

/**
 * Calculate distance between two coordinates (in km)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get the closest zone to given coordinates
 */
export function getClosestZone(
  city: string,
  lat: number,
  lng: number
): Zone | null {
  const zones = getCityZones(city);
  if (zones.length === 0) return null;

  let closestZone = zones[0];
  let minDistance = calculateDistance(
    lat,
    lng,
    closestZone.coordinates.lat,
    closestZone.coordinates.lng
  );

  for (const zone of zones.slice(1)) {
    const distance = calculateDistance(
      lat,
      lng,
      zone.coordinates.lat,
      zone.coordinates.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestZone = zone;
    }
  }

  return closestZone;
}

/**
 * Sort zones by priority
 */
export function sortZonesByPriority(zones: Zone[]): Zone[] {
  return [...zones].sort((a, b) => (a.priority || 999) - (b.priority || 999));
}