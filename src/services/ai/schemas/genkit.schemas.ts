/**
 * Genkit Schemas
 * Used for Genkit AI flows and Firebase Genkit functions
 */

import { z } from 'genkit';

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

// Type inference from Genkit schemas
export type GeneratePersonalizedItineraryOutput = z.infer<
  typeof GeneratePersonalizedItineraryOutputSchema
>;