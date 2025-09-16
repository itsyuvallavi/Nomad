
'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mic, Send, Plus, Paperclip, X } from 'lucide-react';
import { useState, useEffect, useRef, ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const placeholderTexts = [
  'Plan a 7-day work-cation in Bali...',
  'Find the best co-working spaces in Lisbon for a month...',
  'Create a 2-week itinerary for a backpacking trip through Vietnam...',
  'I have 3 days in New York, what are the must-see spots for a solo traveler?',
  'Suggest a budget-friendly 5-day trip to Seoul...',
];

const formSchema = z.object({
  prompt: z.string().min(1, 'Please enter your travel request.'),
  file: z.instanceof(File).optional(),
});

export type FormValues = {
  prompt: string;
  file?: File;
  fileDataUrl?: string;
};

type ItineraryFormProps = {
  onSubmit: (values: FormValues) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setTimeout(() => setIsDeleting(true), 5000); // Pause before deleting
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

  const attachedFile = form.watch('file');
  
  const currentPromptValue = useWatch({
      control: form.control,
      name: 'prompt'
  });

  function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('Form submitted with values:', values);
    let fileDataUrl: string | undefined = undefined;
    if (values.file) {
      fileDataUrl = await fileToDataURL(values.file);
    }
    console.log('Calling onSubmit callback...');
    onSubmit({ ...values, fileDataUrl });
    form.reset();
  };


  return (
    <div className="relative max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit, (errors) => {
          console.error('Form validation errors:', errors);
        })}>
          <div className="bg-muted/50 rounded-xl px-3 sm:px-4 py-3 sm:py-3 flex items-start gap-2 sm:gap-3 border border-border">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-w-[44px] min-h-[44px] sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center sm:mt-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach documents or photos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <div className="flex items-center gap-2">
                      {attachedFile && (
                        <div className="flex items-center gap-2 bg-muted rounded-full pl-3 pr-2 py-1 text-xs text-foreground">
                          <Paperclip size={12} />
                          <span className="truncate max-w-[120px]">
                            {attachedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              form.setValue('file', undefined);
                              if(fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <textarea
                        placeholder={placeholder}
                        className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-base sm:text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[80px] sm:min-h-[24px] max-h-[120px] overflow-y-auto py-2 sm:py-0"
                        autoComplete="off"
                        rows={2}
                        style={{ fontSize: '16px' }}
                        {...field}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                          field.onChange(e);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          // Submit on Enter (without Shift)
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            form.handleSubmit(handleFormSubmit)();
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={(e) => field.onChange(e.target.files?.[0])}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
            <div className="flex items-center mt-1">
              {currentPromptValue && currentPromptValue.length > 0 ? (
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="min-w-[44px] min-h-[44px] sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                  disabled={isSubmitting}
                  onClick={() => console.log('Submit button clicked, isSubmitting:', isSubmitting)}
                >
                  <Send size={16} />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-w-[44px] min-h-[44px] sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                >
                  <Mic size={16} />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
