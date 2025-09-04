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
import { Textarea } from '@/components/ui/textarea';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Wand2 } from 'lucide-react';

export const formSchema = z.object({
  prompt: z.string().min(10, 'Please describe your trip in a bit more detail.'),
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
      prompt:
        'I\'m planning a 2-week trip to Tokyo, Japan next month. I need to work most weekdays and prefer co-working spaces. I\'m on a mid-range budget and love specialty coffee, modern art, and vegetarian food.',
    },
  });

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl">
          Where to next?
        </CardTitle>
        <CardDescription className="text-base">
         Describe your ideal trip, and let AI handle the planning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., A 10-day trip to Bali for a surfer who loves yoga and spicy food..."
                      className="resize-none bg-background/70 text-base"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="w-full !mt-6" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Itinerary
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
