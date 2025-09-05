'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowUp, Link, Globe, Pencil, BrainCircuit, FileText, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export const formSchema = z.object({
  prompt: z.string().min(10, 'Please describe your trip in a bit more detail.'),
});

type ItineraryFormProps = {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isSubmitting: boolean;
};

const suggestionChips = [
    { icon: <ImageIcon />, text: "Create image" },
    { icon: <FileText />, text: "Make a plan" },
    { icon: <Pencil />, text: "Summarize text" },
    { icon: <Pencil />, text: "Help me write" },
    { icon: <BrainCircuit />, text: "Brainstorm" },
];

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
  
  const handleChipClick = (text: string) => {
    const currentPrompt = form.getValues('prompt');
    form.setValue('prompt', currentPrompt ? `${currentPrompt} ${text}`: text);
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
       <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Good evening, Iqbal</h1>
            <p className="text-lg text-muted-foreground mt-2">How can I help you?</p>
       </div>
       
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
            <div className="rounded-2xl border bg-secondary/30 border-input focus-within:ring-1 focus-within:ring-ring p-4 space-y-2">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Hey, can you help me with something?"
                          className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-between items-center">
                    <Badge variant="outline" className="rounded-lg border-muted-foreground/50">
                        Synapse 0.11
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4"><path d="M11.3333 6L8 9.33333L4.66667 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                    </Badge>
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

             <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                {suggestionChips.map((chip, index) => (
                    <Button key={index} type="button" variant="outline" size="sm" className="rounded-lg gap-2 bg-secondary/30 border-input hover:bg-secondary/50" onClick={() => handleChipClick(chip.text)}>
                        {chip.icon}
                        {chip.text}
                    </Button>
                ))}
            </div>
          </form>
        </Form>
    </div>
  );
}
