import {z} from 'genkit';

export const ActivitySchema = z.object({
  time: z
    .string()
    .describe('The time of the activity (e.g., "9:00 AM", "Afternoon").'),
  description: z.string().describe('A short, minimal description of the activity.'),
  category: z
    .enum(['Work', 'Leisure', 'Food', 'Travel', 'Accommodation', 'Attraction'])
    .describe('The category of the activity.'),
  address: z.string().describe('The specific address of the activity location (e.g., "123 Main St, City, Country").'),
  venue_name: z.string().optional().describe('The specific name of the venue (e.g., "Louvre Museum", "Café de Flore").'),
  venue_search: z.string().optional().describe('Search query for LocationIQ (e.g., "Louvre Museum Paris").'),
});

// Weather schema for daily forecast
export const WeatherSchema = z.object({
  temp: z.object({
    min: z.number().describe('Minimum temperature in Celsius'),
    max: z.number().describe('Maximum temperature in Celsius'),
    day: z.number().describe('Average day temperature in Celsius')
  }),
  weather: z.object({
    main: z.string().describe('Main weather condition (e.g., "Clear", "Rain")'),
    description: z.string().describe('Detailed weather description'),
    icon: z.string().describe('Weather icon code')
  }),
  humidity: z.number().describe('Humidity percentage'),
  wind_speed: z.number().describe('Wind speed in m/s'),
  pop: z.number().describe('Probability of precipitation (0-1)')
}).optional();

export const DailyItinerarySchema = z.object({
  day: z.number().describe('The day number of the itinerary (e.g., 1).'),
  date: z
    .string()
    .describe('The date of the itinerary day in YYYY-MM-DD format.'),
  title: z
    .string()
    .describe('A title for the day (e.g., "Arrival and Settling In").'),
  activities: z
    .array(ActivitySchema)
    .describe('A list of activities for the day.'),
  weather: WeatherSchema.describe('Weather forecast for this day')
});

export const GeneratePersonalizedItineraryOutputSchema = z.object({
  destination: z.string().describe('The main destination of the trip (e.g., "Lisbon, Portugal").'),
  title: z.string().describe('A catchy title for the trip (e.g., "Lisbon Work-cation Adventure").'),
  itinerary: z
    .array(DailyItinerarySchema)
    .describe('The generated day-by-day itinerary.'),
  quickTips: z.array(z.string()).describe('A list of 3-4 very short, helpful tips for the destination.'),
});

export type GeneratePersonalizedItineraryOutput = z.infer<
  typeof GeneratePersonalizedItineraryOutputSchema
>;

// Add the complete types from zodZ schemas
export type Activity = zodZ.infer<typeof Activity>;
export type Day = zodZ.infer<typeof Day>;
export type Itinerary = zodZ.infer<typeof ItinerarySchema>;

// Pure Zod schemas for OpenAI provider (M2)
import { z as zodZ } from 'zod';

export const Activity = zodZ.object({
  time: zodZ.string().optional(),
  description: zodZ.string().min(2),
  category: zodZ.enum(['Work','Leisure','Food','Travel','Accommodation','Attraction']).optional(),
  address: zodZ.string().optional(),
  venue_name: zodZ.string().optional(),
  venue_search: zodZ.string().optional(),
  rating: zodZ.number().min(0).max(5).optional(),
  _tips: zodZ.string().optional()
});

// Weather type for Zod schema
export const Weather = zodZ.object({
  temp: zodZ.object({
    min: zodZ.number(),
    max: zodZ.number(),
    day: zodZ.number()
  }),
  weather: zodZ.object({
    main: zodZ.string(),
    description: zodZ.string(),
    icon: zodZ.string()
  }),
  humidity: zodZ.number(),
  wind_speed: zodZ.number(),
  pop: zodZ.number()
}).optional();

export const Day = zodZ.object({
  day: zodZ.number().int().min(1),
  date: zodZ.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: zodZ.string().min(2),
  _destination: zodZ.string().min(2),
  activities: zodZ.array(Activity).default([]),
  weather: Weather
});

export const ItinerarySchema = zodZ.object({
  destination: zodZ.string().min(2),
  title: zodZ.string().min(2),
  itinerary: zodZ.array(Day).min(1),
  quickTips: zodZ.array(zodZ.string()).default([]),
  _costEstimate: zodZ.object({
    total: zodZ.number(),
    flights: zodZ.number(),
    accommodation: zodZ.number(),
    dailyExpenses: zodZ.number(),
    currency: zodZ.string(),
    breakdown: zodZ.array(zodZ.object({
      type: zodZ.string(),
      description: zodZ.string(),
      amount: zodZ.number()
    }))
  }).optional(),
  _hotelOptions: zodZ.any().optional(),
  _flightOptions: zodZ.any().optional()
});
