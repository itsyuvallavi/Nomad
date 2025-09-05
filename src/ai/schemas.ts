import {z} from 'genkit';

export const ActivitySchema = z.object({
  time: z
    .string()
    .describe('The time of the activity (e.g., "9:00 AM", "Afternoon").'),
  description: z.string().describe('A short, minimal description of the activity.'),
  category: z
    .enum(['Work', 'Leisure', 'Food', 'Travel', 'Accommodation'])
    .describe('The category of the activity.'),
  address: z.string().describe('The specific address of the activity location (e.g., "123 Main St, City, Country").'),
  travelTime: z
    .string()
    .optional()
    .describe('Estimated travel time from the previous location.'),
});

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
