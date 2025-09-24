/**
 * Multi-City Intent Extraction Fix
 * Enhances the AIController to properly handle multi-city trip requests
 */

export interface MultiCityIntent {
  destinations: string[];
  totalDuration: number;
  daysPerCity?: number[];
  startDate?: string;
  endDate?: string;
}

/**
 * Helper function to capitalize city names
 */
function capitalizeCity(city: string): string {
  return city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Extract multiple cities and their durations from a prompt
 */
export function extractMultiCityIntent(message: string): MultiCityIntent {
  const result: MultiCityIntent = {
    destinations: [],
    totalDuration: 0
  };

  const lower = message.toLowerCase();

  // Special case: "X weeks, one week in each city" or "2 weeks, each week in each city"
  const equalSplitPattern = /(\d+|two|three|four)\s*weeks?.*(?:one|each)\s*week\s*(?:in|at)\s*each/i;
  const equalSplitMatch = message.match(equalSplitPattern);

  if (equalSplitMatch) {
    // Extract total weeks
    const totalWeeksStr = equalSplitMatch[1];
    const textToNumber: Record<string, number> = {
      'two': 2, 'three': 3, 'four': 4
    };
    const totalWeeks = textToNumber[totalWeeksStr] || parseInt(totalWeeksStr);

    // Extract cities mentioned
    const cityPattern = /(?:to|in|at|and)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    const cityMatches = Array.from(message.matchAll(cityPattern));

    if (cityMatches.length >= 2) {
      for (const match of cityMatches) {
        const city = match[1].trim();
        if (!result.destinations.includes(city)) {
          result.destinations.push(city);
        }
      }

      // Equal distribution
      const daysPerCity = 7; // one week each
      result.totalDuration = result.destinations.length * daysPerCity;
      result.daysPerCity = Array(result.destinations.length).fill(daysPerCity);

      return result;
    }
  }

  // Common city names to look for
  const knownCities = [
    'london', 'paris', 'tokyo', 'kyoto', 'osaka', 'rome', 'florence', 'venice',
    'barcelona', 'madrid', 'seville', 'dubai', 'abu dhabi', 'singapore', 'bali',
    'amsterdam', 'brussels', 'lisbon', 'porto', 'mexico city', 'cancun',
    'athens', 'santorini', 'tel aviv', 'jerusalem', 'berlin', 'munich',
    'prague', 'vienna', 'budapest', 'copenhagen', 'stockholm', 'oslo',
    'reykjavik', 'dublin', 'edinburgh', 'new york', 'los angeles', 'san francisco',
    'miami', 'boston', 'chicago', 'seattle', 'vancouver', 'toronto', 'montreal'
  ];

  // Pattern for "first week in X, second week in Y"
  const ordinalWeekPattern = /(?:first|second|third|one)\s+week\s+(?:in|at)\s+([a-z\s]+?)(?:,|\s+then|\s+and)\s+(?:first|second|third|another|the\s+second)\s+week\s+(?:in|at)\s+([a-z\s]+)/gi;
  const ordinalMatches = Array.from(lower.matchAll(ordinalWeekPattern));

  if (ordinalMatches.length > 0) {
    result.daysPerCity = []; // Initialize the array
    for (const match of ordinalMatches) {
      const city1 = match[1].trim();
      const city2 = match[2].trim();

      if (!result.destinations.includes(capitalizeCity(city1))) {
        result.destinations.push(capitalizeCity(city1));
        result.daysPerCity.push(7); // one week = 7 days
      }
      if (!result.destinations.includes(capitalizeCity(city2))) {
        result.destinations.push(capitalizeCity(city2));
        result.daysPerCity.push(7); // one week = 7 days
      }
    }
    result.totalDuration = result.daysPerCity.reduce((a, b) => a + b, 0);

    if (result.destinations.length > 0) {
      return result;
    }
  }

  // Pattern 1: "X days/weeks in City1, Y days/weeks in City2" or "X days in City1 then Y days in City2"
  // Also handle "one week" or "two weeks" etc.
  const multiCityPattern = /(\d+|one|two|three|four)\s+(days?|weeks?)\s+(?:in|at)\s+([a-z\s]+?)(?:,|\s+then|\s+and)\s+(\d+|one|two|three|four)\s+(days?|weeks?)\s+(?:in|at)\s+([a-z\s]+)/gi;
  const matches = Array.from(lower.matchAll(multiCityPattern));

  if (matches.length > 0) {
    const daysPerCity: number[] = [];
    for (const match of matches) {
      // Parse duration 1
      let duration1 = match[1];
      const unit1 = match[2];
      const city1 = match[3].trim();

      // Parse duration 2
      let duration2 = match[4];
      const unit2 = match[5];
      const city2 = match[6].trim();

      // Convert text numbers to digits
      const textToNumber: Record<string, number> = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4
      };

      const days1 = textToNumber[duration1] || parseInt(duration1);
      const days2 = textToNumber[duration2] || parseInt(duration2);

      // Convert weeks to days
      const actualDays1 = unit1.includes('week') ? days1 * 7 : days1;
      const actualDays2 = unit2.includes('week') ? days2 * 7 : days2;

      // Capitalize city names
      const formattedCity1 = city1.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const formattedCity2 = city2.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      if (!result.destinations.includes(formattedCity1)) {
        result.destinations.push(formattedCity1);
        daysPerCity.push(actualDays1);
      }
      if (!result.destinations.includes(formattedCity2)) {
        result.destinations.push(formattedCity2);
        daysPerCity.push(actualDays2);
      }

      result.totalDuration = actualDays1 + actualDays2;
    }
    result.daysPerCity = daysPerCity;
    return result;
  }

  // Pattern 2: "City1 and City2" or "City1, City2, and City3"
  const citiesFoundInMessage: string[] = [];
  for (const city of knownCities) {
    if (lower.includes(city)) {
      const formattedCity = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      citiesFoundInMessage.push(formattedCity);
    }
  }

  if (citiesFoundInMessage.length > 1) {
    result.destinations = citiesFoundInMessage;

    // Try to extract total duration
    const durationMatch = message.match(/(\d+)\s*days?|week(?:end)?/i);
    if (durationMatch) {
      if (durationMatch[0].toLowerCase().includes('weekend')) {
        result.totalDuration = 2;
      } else if (durationMatch[0].toLowerCase().includes('week')) {
        result.totalDuration = 7;
      } else {
        result.totalDuration = parseInt(durationMatch[1]);
      }
    }

    // Distribute days evenly if not specified
    if (result.totalDuration > 0 && result.destinations.length > 0) {
      const baseDays = Math.floor(result.totalDuration / result.destinations.length);
      const remainder = result.totalDuration % result.destinations.length;
      result.daysPerCity = Array(result.destinations.length).fill(baseDays);

      // Add remainder days to first cities
      for (let i = 0; i < remainder; i++) {
        result.daysPerCity[i]++;
      }
    }

    return result;
  }

  // Pattern 3: "X days across/in City1, City2, City3"
  const acrossPattern = /(\d+)\s+days?\s+(?:across|in|through)\s+(.+)/i;
  const acrossMatch = message.match(acrossPattern);

  if (acrossMatch) {
    const duration = parseInt(acrossMatch[1]);
    const citiesString = acrossMatch[2];

    // Extract cities from the string
    const cityList = citiesString.split(/,|\s+and\s+/).map(s => s.trim());

    for (const cityStr of cityList) {
      // Check if it's a known city
      const foundCity = knownCities.find(known =>
        cityStr.toLowerCase().includes(known) ||
        known.includes(cityStr.toLowerCase())
      );

      if (foundCity) {
        const formattedCity = foundCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!result.destinations.includes(formattedCity)) {
          result.destinations.push(formattedCity);
        }
      } else if (cityStr.length > 2 && /^[a-zA-Z\s]+$/.test(cityStr)) {
        // If not a known city but looks like a place name, add it
        const formattedCity = cityStr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!result.destinations.includes(formattedCity)) {
          result.destinations.push(formattedCity);
        }
      }
    }

    if (result.destinations.length > 0) {
      result.totalDuration = duration;

      // Distribute days
      const baseDays = Math.floor(duration / result.destinations.length);
      const remainder = duration % result.destinations.length;
      result.daysPerCity = Array(result.destinations.length).fill(baseDays);

      for (let i = 0; i < remainder; i++) {
        result.daysPerCity[i]++;
      }
    }
  }

  return result;
}

/**
 * Convert multi-city intent to single destination string
 */
export function formatMultiCityDestination(intent: MultiCityIntent): string {
  if (intent.destinations.length === 0) return '';
  if (intent.destinations.length === 1) return intent.destinations[0];

  // Join with commas
  return intent.destinations.join(', ');
}

/**
 * Test the multi-city extraction
 */
export function testMultiCityExtraction() {
  const testCases = [
    '3 days in London then 2 days in Paris',
    'Weekend trip to Rome and Florence',
    '7 days across Tokyo, Kyoto, and Osaka',
    '2 days in Berlin, 3 days in Prague, and 2 days in Vienna',
    '10 days through London, Paris, Rome, Barcelona'
  ];

  console.log('Testing Multi-City Extraction:\n');
  for (const test of testCases) {
    console.log(`Input: "${test}"`);
    const result = extractMultiCityIntent(test);
    console.log(`Destinations: ${result.destinations.join(', ')}`);
    console.log(`Total Duration: ${result.totalDuration} days`);
    if (result.daysPerCity) {
      console.log(`Days per city: ${result.daysPerCity.join(', ')}`);
    }
    console.log('---');
  }
}