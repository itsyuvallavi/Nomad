
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowUp, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  feedback: z.string().min(1, 'Please enter some feedback.'),
});

type FormValues = z.infer<typeof formSchema>;

type ItineraryRefinementFormProps = {
  onSubmit: (feedback: string) => void;
  isSubmitting: boolean;
};

export default function ItineraryRefinementForm({
  onSubmit,
  isSubmitting,
}: ItineraryRefinementFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      feedback: '',
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    onSubmit(values.feedback);
    form.reset();
  };

  return (
    <div className="relative">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="bg-slate-700/80 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="e.g., 'Find a cheaper hotel' or 'Add more vegetarian restaurants'"
                      className="bg-transparent border-0 text-white placeholder-slate-400 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-600"
              disabled={isSubmitting || !form.watch('feedback')}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp size={16} />
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
