import { z } from 'zod';

export interface LLMProvider {
  name: 'openai';
  chatJSON<T>(args: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
    schema?: z.ZodTypeAny;
    seed?: number;
  }): Promise<T>;
}