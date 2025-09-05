'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mic, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';


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
                        placeholder="Plan a 5-day work-cation in Tokyo..."
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
