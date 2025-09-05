'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowUp, Link, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import RecentChats from './recent-chats';


export const formSchema = z.object({
  prompt: z.string().min(10, 'Please describe your trip in a bit more detail.'),
});

type ItineraryFormProps = {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isSubmitting: boolean;
};

const fullPlaceholder = "e.g., Plan a 5-day work-cation in Tokyo, focusing on tech hubs and good food.";

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

  const [placeholder, setPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;

    if (isTyping && placeholder.length < fullPlaceholder.length) {
      typingTimeout = setTimeout(() => {
        setPlaceholder(fullPlaceholder.slice(0, placeholder.length + 1));
      }, 50);
    } else {
      setIsTyping(false);
    }

    return () => clearTimeout(typingTimeout);
  }, [placeholder, isTyping]);
  
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
       <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Nomad Navigator</h1>
            <p className="text-lg text-muted-foreground mt-2">Your AI-powered travel planner for digital nomads.</p>
       </div>
       
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
            <div className="rounded-2xl border bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring p-4 space-y-2">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={placeholder}
                          className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base min-h-[60px] placeholder:text-gray-400"
                          {...field}
                           onFocus={() => {
                            setIsTyping(false);
                            setPlaceholder(fullPlaceholder);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-between items-center">
                    <div></div>
                    <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon">
                            <Link className="h-5 w-5 text-muted-foreground" />
                        </Button>
                         <Button type="button" variant="ghost" size="icon">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        <Button type="submit" size="icon" className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50" disabled={isSubmitting || !form.formState.isValid}>
                          {isSubmitting ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                              <ArrowUp className="h-5 w-5" />
                          )}
                        </Button>
                    </div>
                </div>
            </div>
          </form>
        </Form>
        <RecentChats />
    </div>
  );
}
