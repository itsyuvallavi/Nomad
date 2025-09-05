'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mic, MoreHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const placeholderTexts = [
  'Plan a 7-day work-cation in Bali...',
  'Find the best co-working spaces in Lisbon for a month...',
  'Create a 2-week itinerary for a backpacking trip through Vietnam...',
  'I have 3 days in New York, what are the must-see spots for a solo traveler?',
  'Suggest a budget-friendly 5-day trip to Seoul...',
];

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
  const [placeholder, setPlaceholder] = useState(placeholderTexts[0]);
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const type = () => {
      const currentText = placeholderTexts[textIndex];
      if (isDeleting) {
        setPlaceholder(currentText.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        if (charIndex - 1 === 0) {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % placeholderTexts.length);
        }
      } else {
        setPlaceholder(currentText.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        if (charIndex + 1 === currentText.length) {
          setTimeout(() => setIsDeleting(true), 2000); // Pause before deleting
        }
      }
    };

    const typingSpeed = isDeleting ? 50 : 100;
    const timeout = setTimeout(type, typingSpeed);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
    },
  });

  return (
    <div className="relative max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-slate-700/80 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs text-white">
              Q
            </div>
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                       <Input
                        placeholder={placeholder}
                        className="bg-transparent border-0 text-white placeholder-slate-400 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white transition-colors">
                <Mic size={16} />
              </Button>
              <Button type="submit" variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white transition-colors" disabled={isSubmitting}>
                <MoreHorizontal size={16} />
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
