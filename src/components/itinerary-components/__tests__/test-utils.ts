/**
 * Test utilities and mock data generators for itinerary components
 * Provides consistent test data and helpers for unit and integration testing
 */

import type {
  GeneratePersonalizedItineraryOutput,
  Activity,
  DailyItinerary,
  Accommodation,
  TransportationOption
} from '@/services/ai/types/core.types';

// Type aliases for backward compatibility
type Day = DailyItinerary;
type FlightInfo = TransportationOption;
type AccommodationInfo = Accommodation;
type TransportationInfo = TransportationOption;

/**
 * Create a mock activity with customizable properties
 * @param overrides - Optional properties to override defaults
 * @returns A complete Activity object for testing
 */
export function createMockActivity(overrides?: Partial<Activity>): Activity {
  return {
    title: 'Mock Activity',
    time: '10:00 AM',
    duration: '2 hours',
    location: 'Mock Location',
    description: 'This is a mock activity description',
    tips: 'Mock tips for the activity',
    cost_estimate: '$20-30',
    booking_required: false,
    type: 'Sightseeing',
    ...overrides
  };
}

/**
 * Create a mock day with activities
 * @param overrides - Optional properties to override defaults
 * @param activityCount - Number of activities to generate (default: 3)
 * @returns A complete Day object for testing
 */
export function createMockDay(
  overrides?: Partial<Day>,
  activityCount: number = 3
): Day {
  const activities = Array.from({ length: activityCount }, (_, index) =>
    createMockActivity({
      title: `Activity ${index + 1}`,
      time: `${9 + index * 3}:00 ${index < 4 ? 'AM' : 'PM'}`
    })
  );

  return {
    day_number: 1,
    date: '2024-03-15',
    theme: 'Cultural Exploration',
    activities,
    meals: {
      breakfast: {
        restaurant: 'Café Mock',
        cuisine: 'French',
        price_range: '$$',
        location: 'Downtown'
      },
      lunch: {
        restaurant: 'Bistro Mock',
        cuisine: 'Italian',
        price_range: '$$',
        location: 'City Center'
      },
      dinner: {
        restaurant: 'Restaurant Mock',
        cuisine: 'Local',
        price_range: '$$$',
        location: 'Old Town'
      }
    },
    ...overrides
  };
}

/**
 * Create mock flight information
 * @param overrides - Optional properties to override defaults
 * @returns FlightInfo object for testing
 */
export function createMockFlightInfo(overrides?: Partial<FlightInfo>): FlightInfo {
  return {
    airline: 'Mock Airways',
    flight_number: 'MA123',
    departure_time: '10:00 AM',
    arrival_time: '2:00 PM',
    duration: '4 hours',
    from: 'New York (JFK)',
    to: 'Paris (CDG)',
    class: 'Economy',
    price_estimate: '$500-800',
    ...overrides
  };
}

/**
 * Create mock accommodation information
 * @param overrides - Optional properties to override defaults
 * @returns AccommodationInfo object for testing
 */
export function createMockAccommodation(overrides?: Partial<AccommodationInfo>): AccommodationInfo {
  return {
    name: 'Mock Hotel',
    type: 'Hotel',
    address: '123 Mock Street',
    check_in_date: '2024-03-15',
    check_out_date: '2024-03-18',
    price_per_night: '$150',
    total_cost: '$450',
    amenities: ['WiFi', 'Breakfast', 'Gym', 'Pool'],
    booking_link: 'https://mockhotel.com/book',
    ...overrides
  };
}

/**
 * Create mock transportation information
 * @param overrides - Optional properties to override defaults
 * @returns TransportationInfo object for testing
 */
export function createMockTransportation(overrides?: Partial<TransportationInfo>): TransportationInfo {
  return {
    type: 'Train',
    from: 'Paris',
    to: 'Rome',
    departure: '2024-03-18 09:00',
    arrival: '2024-03-18 20:00',
    duration: '11 hours',
    price: '$120',
    booking_info: 'Book through Rail Europe',
    ...overrides
  };
}

/**
 * Create a mock destination with customizable properties
 * @param overrides - Optional properties to override defaults
 * @param dayCount - Number of days to generate (default: 3)
 * @returns A complete Destination object for testing
 */
export function createMockDestination(
  overrides?: Partial<Destination>,
  dayCount: number = 3
): Destination {
  const days = Array.from({ length: dayCount }, (_, index) =>
    createMockDay({
      day_number: index + 1,
      date: `2024-03-${15 + index}`
    })
  );

  return {
    city: 'Mock City',
    country: 'Mock Country',
    arrival_date: '2024-03-15',
    departure_date: '2024-03-18',
    days_count: dayCount,
    accommodation: createMockAccommodation(),
    transportation_to_next: createMockTransportation(),
    days,
    weather_forecast: {
      temperature_high: '20°C',
      temperature_low: '12°C',
      condition: 'Partly Cloudy',
      precipitation_chance: '20%'
    },
    local_tips: [
      'Try the local cuisine',
      'Visit early to avoid crowds',
      'Public transport is efficient'
    ],
    ...overrides
  };
}

/**
 * Create a complete mock itinerary
 * @param overrides - Optional properties to override defaults
 * @param destinationCount - Number of destinations (default: 2)
 * @returns A complete GeneratePersonalizedItineraryOutput for testing
 */
export function createMockItinerary(
  overrides?: Partial<GeneratePersonalizedItineraryOutput>,
  destinationCount: number = 2
): GeneratePersonalizedItineraryOutput {
  const destinations = Array.from({ length: destinationCount }, (_, index) =>
    createMockDestination({
      city: `City ${index + 1}`,
      country: `Country ${index + 1}`,
      arrival_date: `2024-03-${15 + index * 3}`,
      departure_date: `2024-03-${18 + index * 3}`
    })
  );

  return {
    title: 'Mock European Adventure',
    summary: 'A wonderful journey through Europe',
    total_days: destinations.reduce((sum, dest) => sum + dest.days_count, 0),
    destinations,
    flights: destinations.map((dest, index) =>
      createMockFlightInfo({
        from: index === 0 ? 'New York' : destinations[index - 1].city,
        to: dest.city
      })
    ),
    budget_breakdown: {
      flights: '$2000',
      accommodation: '$1500',
      food: '$800',
      activities: '$600',
      transportation: '$300',
      total: '$5200'
    },
    packing_suggestions: [
      'Comfortable walking shoes',
      'Weather-appropriate clothing',
      'Travel adapter',
      'Passport and documents'
    ],
    travel_tips: [
      'Book accommodations in advance',
      'Learn basic local phrases',
      'Keep copies of important documents'
    ],
    ...overrides
  };
}

/**
 * Custom render function with providers
 * Wraps components with necessary context providers for testing
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    initialState?: any;
    locale?: string;
  }
) {
  // This would wrap with any necessary providers
  // For now, returning a simple implementation
  return {
    ui,
    ...options
  };
}

/**
 * Helper to simulate user interactions in sequence
 * Useful for testing complex user flows
 */
export async function simulateUserFlow(steps: Array<() => Promise<void>>) {
  for (const step of steps) {
    await step();
    // Add small delay to simulate real user interaction
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * Create mock data for different travel scenarios
 */
export const mockScenarios = {
  /**
   * Weekend getaway scenario - 2 days, 1 destination
   */
  weekendTrip: () => createMockItinerary(
    {
      title: 'Weekend in Paris',
      total_days: 2
    },
    1
  ),

  /**
   * Multi-city European tour - 10 days, 3 destinations
   */
  europeanTour: () => createMockItinerary(
    {
      title: 'European Grand Tour',
      total_days: 10
    },
    3
  ),

  /**
   * Business trip with leisure - 5 days, 1 destination
   */
  businessLeisure: () => createMockItinerary(
    {
      title: 'Business Trip to Tokyo',
      total_days: 5,
      travel_tips: ['Business cards are essential', 'Formal attire required']
    },
    1
  ),

  /**
   * Budget backpacking trip - 14 days, 4 destinations
   */
  backpackingTrip: () => createMockItinerary(
    {
      title: 'Southeast Asia Backpacking',
      total_days: 14,
      budget_breakdown: {
        flights: '$800',
        accommodation: '$350',
        food: '$200',
        activities: '$150',
        transportation: '$100',
        total: '$1600'
      }
    },
    4
  )
};

/**
 * Accessibility testing helpers
 */
export const a11y = {
  /**
   * Check if element has proper ARIA attributes
   */
  hasProperAria: (element: HTMLElement): boolean => {
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');

    return !!(role || ariaLabel || ariaLabelledBy);
  },

  /**
   * Check if interactive element is keyboard accessible
   */
  isKeyboardAccessible: (element: HTMLElement): boolean => {
    const tabIndex = element.getAttribute('tabindex');
    const isNativelyFocusable = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
      element.tagName
    );

    return isNativelyFocusable || tabIndex !== '-1';
  },

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector));
  }
};

/**
 * Performance testing helpers
 */
export const performance = {
  /**
   * Measure render time of a component
   */
  measureRenderTime: async (renderFn: () => void): Promise<number> => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  },

  /**
   * Check if component uses React.memo
   */
  isMemoized: (component: React.ComponentType): boolean => {
    return component.$$typeof === Symbol.for('react.memo');
  },

  /**
   * Simulate multiple rapid re-renders
   */
  stressTest: async (
    renderFn: (props: any) => void,
    iterations: number = 100
  ): Promise<number[]> => {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const time = await performance.measureRenderTime(() => renderFn({ key: i }));
      times.push(time);
    }
    return times;
  }
};

/**
 * Custom matchers for testing
 */
export const customMatchers = {
  /**
   * Check if element has specific Tailwind classes
   */
  toHaveTailwindClass: (element: HTMLElement, ...classes: string[]): boolean => {
    const classList = Array.from(element.classList);
    return classes.every(cls => classList.includes(cls));
  },

  /**
   * Check if component renders without errors
   */
  toRenderWithoutError: (renderFn: () => void): boolean => {
    try {
      renderFn();
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  weather: {
    success: {
      temperature: '22°C',
      condition: 'Sunny',
      humidity: '60%'
    },
    error: {
      message: 'Weather service unavailable'
    }
  },

  export: {
    pdf: new Blob(['mock pdf content'], { type: 'application/pdf' }),
    ics: new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' })
  }
};

/**
 * Wait for async updates in tests
 */
export async function waitForAsync(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Debug helper to log component tree
 */
export function debugComponentTree(container: HTMLElement): void {
  console.log('Component Tree:', container.innerHTML);
  console.log('Text Content:', container.textContent);
}