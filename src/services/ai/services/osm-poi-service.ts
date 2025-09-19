/**
 * OpenStreetMap POI Service
 * Fetches real venue data from OSM/Overpass API
 * Used to enrich AI-generated itineraries with actual places
 */

import { logger } from '@/lib/monitoring/logger';

// POI (Point of Interest) interface
export interface POI {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  tags: Record<string, string>;
  website?: string;
  phone?: string;
  openingHours?: string;
  cuisine?: string;
}

// Zone/area for queries
export interface QueryZone {
  name: string;
  center: { lat: number; lng: number };
  radiusKm?: number;
  bbox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// Activity to POI category mapping
const ACTIVITY_TO_OSM_TAGS: Record<string, string[]> = {
  // Food & Drink
  breakfast: ['amenity=cafe', 'amenity=restaurant', 'shop=bakery'],
  coffee: ['amenity=cafe', 'shop=coffee'],
  lunch: ['amenity=restaurant', 'amenity=fast_food', 'amenity=food_court'],
  dinner: ['amenity=restaurant', 'amenity=pub', 'amenity=bar'],
  bar: ['amenity=bar', 'amenity=pub', 'amenity=nightclub'],

  // Accommodation
  hotel: ['tourism=hotel', 'tourism=motel'],
  hostel: ['tourism=hostel', 'tourism=guest_house'],
  accommodation: ['tourism=hotel', 'tourism=hostel', 'tourism=apartment'],

  // Tourism & Culture
  museum: ['tourism=museum', 'tourism=gallery', 'tourism=artwork'],
  park: ['leisure=park', 'leisure=garden'],
  attraction: ['tourism=attraction', 'tourism=theme_park', 'tourism=zoo'],
  landmark: ['tourism=attraction', 'historic=monument', 'historic=memorial'],
  viewpoint: ['tourism=viewpoint'],
  beach: ['natural=beach'],

  // Shopping
  shopping: ['shop=mall', 'shop=department_store', 'shop=supermarket'],
  market: ['amenity=marketplace'],

  // Entertainment
  theater: ['amenity=theatre', 'amenity=cinema'],
  concert: ['amenity=music_venue'],
  sports: ['leisure=stadium', 'leisure=sports_centre', 'leisure=swimming_pool'],

  // Transport
  station: ['railway=station', 'amenity=bus_station'],

  // Other
  temple: ['amenity=place_of_worship', 'historic=church', 'building=cathedral'],
  spa: ['leisure=spa', 'shop=massage'],
  casino: ['amenity=casino']
};

// Popular fallback venues by city (when OSM fails)
const FALLBACK_VENUES: Record<string, Partial<POI>[]> = {
  london: [
    { name: 'British Museum', category: 'museum', coordinates: { lat: 51.5194, lng: -0.1270 } },
    { name: 'Tower of London', category: 'attraction', coordinates: { lat: 51.5081, lng: -0.0760 } },
    { name: 'Hyde Park', category: 'park', coordinates: { lat: 51.5073, lng: -0.1657 } },
    { name: 'Borough Market', category: 'market', coordinates: { lat: 51.5055, lng: -0.0910 } },
    { name: 'The Ivy', category: 'dinner', coordinates: { lat: 51.5122, lng: -0.1281 } }
  ],
  paris: [
    { name: 'Louvre Museum', category: 'museum', coordinates: { lat: 48.8606, lng: 2.3376 } },
    { name: 'Eiffel Tower', category: 'landmark', coordinates: { lat: 48.8584, lng: 2.2945 } },
    { name: 'Luxembourg Gardens', category: 'park', coordinates: { lat: 48.8462, lng: 2.3372 } },
    { name: 'Café de Flore', category: 'coffee', coordinates: { lat: 48.8540, lng: 2.3330 } },
    { name: 'Le Comptoir du Relais', category: 'dinner', coordinates: { lat: 48.8530, lng: 2.3360 } }
  ],
  tokyo: [
    { name: 'Senso-ji Temple', category: 'temple', coordinates: { lat: 35.7148, lng: 139.7967 } },
    { name: 'Tokyo Skytree', category: 'viewpoint', coordinates: { lat: 35.7101, lng: 139.8107 } },
    { name: 'Ueno Park', category: 'park', coordinates: { lat: 35.7146, lng: 139.7742 } },
    { name: 'Tsukiji Outer Market', category: 'market', coordinates: { lat: 35.6654, lng: 139.7707 } },
    { name: 'Sukiyabashi Jiro', category: 'dinner', coordinates: { lat: 35.6715, lng: 139.7620 } }
  ]
};

export class OSMPOIService {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';
  private nominatimUrl = 'https://nominatim.openstreetmap.org';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 3600000; // 1 hour

  /**
   * Find POIs by activity type and zone
   */
  async findPOIsByActivity(
    activityType: string,
    zone: QueryZone,
    limit: number = 5
  ): Promise<POI[]> {
    const cacheKey = `${activityType}-${zone.name}-${limit}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      logger.info('API', 'Using cached OSM POIs', { activityType, zone: zone.name });
      return cached.data;
    }

    try {
      // Get OSM tags for this activity type
      const osmTags = this.getOSMTagsForActivity(activityType);
      if (osmTags.length === 0) {
        logger.warn('API', 'No OSM tags for activity type', { activityType });
        return this.getFallbackVenues(zone.name, activityType, limit);
      }

      // Build Overpass query
      const query = this.buildOverpassQuery(osmTags, zone, limit);

      // Execute query
      const pois = await this.executeOverpassQuery(query);

      // Cache results
      this.cache.set(cacheKey, { data: pois, timestamp: Date.now() });

      logger.info('API', `Found ${pois.length} OSM POIs`, { activityType, zone: zone.name });
      return pois;

    } catch (error) {
      logger.error('API', 'Failed to fetch OSM POIs', error);
      return this.getFallbackVenues(zone.name, activityType, limit);
    }
  }

  /**
   * Find POIs near specific coordinates
   */
  async findNearbyPOIs(
    coordinates: { lat: number; lng: number },
    category: string,
    radiusMeters: number = 1000
  ): Promise<POI[]> {
    const zone: QueryZone = {
      name: `${coordinates.lat},${coordinates.lng}`,
      center: coordinates,
      radiusKm: radiusMeters / 1000
    };

    return this.findPOIsByActivity(category, zone);
  }

  /**
   * Get OSM tags for an activity type
   */
  private getOSMTagsForActivity(activityType: string): string[] {
    // Direct match
    if (ACTIVITY_TO_OSM_TAGS[activityType]) {
      return ACTIVITY_TO_OSM_TAGS[activityType];
    }

    // Check if activity contains keywords
    const keywords = activityType.toLowerCase().split(/\s+/);
    for (const keyword of keywords) {
      if (ACTIVITY_TO_OSM_TAGS[keyword]) {
        return ACTIVITY_TO_OSM_TAGS[keyword];
      }
    }

    // Check partial matches
    for (const [key, tags] of Object.entries(ACTIVITY_TO_OSM_TAGS)) {
      if (activityType.includes(key) || key.includes(activityType)) {
        return tags;
      }
    }

    return [];
  }

  /**
   * Build Overpass API query
   */
  private buildOverpassQuery(tags: string[], zone: QueryZone, limit: number): string {
    // Calculate bounding box if not provided
    const bbox = zone.bbox || this.calculateBBox(zone.center, zone.radiusKm || 2);

    // Build multiple queries for different tag combinations
    const queries = tags.map(tag => {
      const [key, value] = tag.split('=');
      let filter = '';

      if (value) {
        // Handle special regex patterns
        if (value.includes('[') && value.includes(']')) {
          // Extract the condition (e.g., cuisine~"breakfast")
          const match = value.match(/\[(.+)\]/);
          if (match) {
            const baseValue = value.replace(/\[.+\]/, '');
            filter = `["${key}"="${baseValue}"][${match[1]}]`;
          } else {
            filter = `["${key}"="${value}"]`;
          }
        } else {
          filter = `["${key}"="${value}"]`;
        }
      } else {
        filter = `["${key}"]`;
      }

      return `
        node${filter}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way${filter}(${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      `;
    }).join('\n');

    // Overpass QL query
    const query = `
      [out:json][timeout:25];
      (
        ${queries}
      );
      out center ${limit};
    `;

    return query;
  }

  /**
   * Execute Overpass query
   */
  private async executeOverpassQuery(query: string): Promise<POI[]> {
    const response = await fetch(this.overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseOverpassResponse(data);
  }

  /**
   * Parse Overpass API response
   */
  private parseOverpassResponse(data: any): POI[] {
    if (!data.elements || !Array.isArray(data.elements)) {
      return [];
    }

    const pois: POI[] = [];
    const processedIds = new Set<string>();

    for (const element of data.elements) {
      // Skip if already processed
      if (processedIds.has(element.id.toString())) {
        continue;
      }

      // Accept venues even without names for landmarks
      const name = element.tags?.name ||
                  element.tags?.['name:en'] ||
                  element.tags?.description ||
                  this.generateNameFromTags(element.tags);

      if (!name) continue;

      processedIds.add(element.id.toString());

      const poi: POI = {
        id: `osm-${element.type}-${element.id}`,
        name: name,
        category: this.detectCategory(element.tags),
        coordinates: {
          lat: element.lat || element.center?.lat,
          lng: element.lon || element.center?.lon
        },
        tags: element.tags,
        address: this.formatAddress(element.tags),
        website: element.tags.website ||
                element.tags['contact:website'] ||
                element.tags.url,
        phone: element.tags.phone ||
               element.tags['contact:phone'] ||
               element.tags['phone:mobile'],
        openingHours: element.tags.opening_hours ||
                     element.tags['opening_hours:covid19'],
        cuisine: element.tags.cuisine
      };

      // Only add if we have coordinates
      if (poi.coordinates.lat && poi.coordinates.lng) {
        pois.push(poi);
      }
    }

    // Sort by relevance (places with more details first)
    pois.sort((a, b) => {
      const scoreA = (a.address ? 1 : 0) + (a.website ? 1 : 0) + (a.openingHours ? 1 : 0);
      const scoreB = (b.address ? 1 : 0) + (b.website ? 1 : 0) + (b.openingHours ? 1 : 0);
      return scoreB - scoreA;
    });

    return pois;
  }

  /**
   * Generate a name from tags when name is missing
   */
  private generateNameFromTags(tags: Record<string, string>): string | null {
    // Try common tag combinations
    if (tags.amenity && tags.brand) return tags.brand;
    if (tags.shop && tags.operator) return tags.operator;
    if (tags.tourism === 'viewpoint' && tags.ele) return `Viewpoint (${tags.ele}m)`;
    if (tags.leisure === 'park' && tags.designation) return tags.designation;

    return null;
  }

  /**
   * Detect category from OSM tags
   */
  private detectCategory(tags: Record<string, string>): string {
    // Check primary keys
    if (tags.amenity) return tags.amenity;
    if (tags.tourism) return tags.tourism;
    if (tags.leisure) return tags.leisure;
    if (tags.shop) return 'shop';
    if (tags.historic) return 'historic';

    return 'place';
  }

  /**
   * Format address from OSM tags
   */
  private formatAddress(tags: Record<string, string>): string | undefined {
    const parts = [];

    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /**
   * Calculate bounding box from center and radius
   */
  private calculateBBox(
    center: { lat: number; lng: number },
    radiusKm: number
  ): { north: number; south: number; east: number; west: number } {
    const latDegreeKm = 111.32; // km per degree of latitude
    const lngDegreeKm = 111.32 * Math.cos(center.lat * Math.PI / 180);

    const latDelta = radiusKm / latDegreeKm;
    const lngDelta = radiusKm / lngDegreeKm;

    return {
      north: center.lat + latDelta,
      south: center.lat - latDelta,
      east: center.lng + lngDelta,
      west: center.lng - lngDelta
    };
  }

  /**
   * Get fallback venues when OSM fails
   */
  private getFallbackVenues(cityName: string, category: string, limit: number): POI[] {
    const city = cityName.toLowerCase();
    const fallbacks = FALLBACK_VENUES[city] || [];

    // Filter by category if specified
    const filtered = category
      ? fallbacks.filter(v => v.category === category)
      : fallbacks;

    // Convert to full POI objects
    return filtered.slice(0, limit).map((v, index) => ({
      id: `fallback-${city}-${index}`,
      name: v.name || 'Unknown Venue',
      category: v.category || category,
      coordinates: v.coordinates || { lat: 0, lng: 0 },
      tags: {},
      address: undefined
    }));
  }

  /**
   * Match POI to activity description
   */
  async matchPOIToActivity(
    activityDescription: string,
    zone: QueryZone
  ): Promise<POI | null> {
    // Extract activity type from description
    const activityType = this.extractActivityType(activityDescription);
    if (!activityType) return null;

    // Find POIs
    const pois = await this.findPOIsByActivity(activityType, zone, 3);
    if (pois.length === 0) return null;

    // Return best match (first one for now)
    return pois[0];
  }

  /**
   * Extract activity type from description
   */
  private extractActivityType(description: string): string | null {
    const lower = description.toLowerCase();

    // Check for exact keywords
    for (const keyword of Object.keys(ACTIVITY_TO_OSM_TAGS)) {
      if (lower.includes(keyword)) {
        return keyword;
      }
    }

    // Check common patterns
    if (lower.includes('eat') || lower.includes('meal')) {
      if (lower.includes('morning')) return 'breakfast';
      if (lower.includes('afternoon')) return 'lunch';
      if (lower.includes('evening')) return 'dinner';
    }

    if (lower.includes('visit') || lower.includes('explore')) {
      if (lower.includes('museum')) return 'museum';
      if (lower.includes('park')) return 'park';
      if (lower.includes('market')) return 'market';
    }

    return null;
  }

  /**
   * Geocode an address using Nominatim (OSM geocoding)
   */
  async geocodeAddress(address: string, city?: string): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = `geocode-${address}-${city || ''}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const query = city ? `${address}, ${city}` : address;
      const url = `${this.nominatimUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NomadNavigator/1.0' // Required by Nominatim
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const data = await response.json();
      if (data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };

        // Cache result
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      return null;
    } catch (error) {
      logger.error('API', 'OSM geocoding failed', error);
      return null;
    }
  }

  /**
   * Search for a specific venue by name and city
   */
  async searchVenue(venueName: string, city: string): Promise<POI | null> {
    const cacheKey = `venue-${venueName}-${city}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // First try Nominatim to find the venue
      const url = `${this.nominatimUrl}/search?q=${encodeURIComponent(venueName)},${encodeURIComponent(city)}&format=json&addressdetails=1&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NomadNavigator/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const data = await response.json();
      if (data.length > 0) {
        const place = data[0];
        const poi: POI = {
          id: `nominatim-${place.osm_id}`,
          name: place.name || venueName,
          category: place.type || 'place',
          coordinates: {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon)
          },
          address: place.display_name,
          tags: {}
        };

        // Cache result
        this.cache.set(cacheKey, { data: poi, timestamp: Date.now() });
        return poi;
      }

      return null;
    } catch (error) {
      logger.error('API', 'OSM venue search failed', error);
      return null;
    }
  }
}

// Export singleton instance
export const osmPOIService = new OSMPOIService();