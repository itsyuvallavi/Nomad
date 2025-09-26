/**
 * Shared types for export formatters
 */

import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';

export interface FormatterOptions {
  itinerary: GeneratePersonalizedItineraryOutput;
}

export interface FormatterResult {
  content: string | Blob;
  mimeType?: string;
  filename?: string;
}

export type FormatType = 'text' | 'markdown' | 'ics' | 'pdf';

export interface Formatter {
  format(options: FormatterOptions): FormatterResult | Promise<FormatterResult>;
}