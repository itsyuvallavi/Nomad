'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const formSchema = z.object({
  destination: z.string().min(2, 'Destination is required.'),
  travelDates: z.string().min(5, 'Travel dates are required.'),
  workRequirements: z
    .string()
    .min(10, 'Please describe your work needs.')
    .optional()
    .or(z.literal('')),
  visaStatus: z.string().optional(),
  budget: z.string().min(2, 'Budget is required.'),
  lifestylePreferences: z
    .string()
    .min(10, 'Tell us a bit about your preferences.'),
});

type ItineraryFormProps = {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isSubmitting: boolean;
};

export default function ItineraryForm({
  onSubmit,
  isSubmitting,
}: ItineraryFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: 'Tokyo, Japan',
      travelDates: 'Next month, for 2 weeks',
      workRequirements:
        'Need reliable WiFi for 6-8 hours/day, prefer coworking spaces with ergonomic chairs.',
      visaStatus: '90-day tourist visa',
      budget: 'Mid-range, around $150/day excluding accommodation.',
      lifestylePreferences:
        'Interested in tech meetups, specialty coffee, modern art museums, local markets, and vegetarian food. Enjoy a mix of busy city life and quiet nature spots.',
    },
  });

  return (
    <>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Plan Your Next Adventure
        </CardTitle>
        <CardDescription>
          Fill in your preferences and let our AI create a personalized
          itinerary for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Lisbon, Portugal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="travelDates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Travel Dates & Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., June 10th - 24th" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., $100 per day" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lifestylePreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lifestyle & Interests</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Love hiking, museums, and trying local street food..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The more details, the better the plan!
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full !mt-6" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Itinerary'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
