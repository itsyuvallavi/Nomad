import { z } from 'zod';
import type { LLMProvider } from './providers/types';

export async function safeChat<T>(
  provider: LLMProvider,
  system: string,
  user: string,
  schema: z.ZodSchema<T>,
  opts?: { temperature?: number; maxTokens?: number; seed?: number }
): Promise<T> {
  return provider.chatJSON<T>({
    system,
    user,
    schema,
    temperature: opts?.temperature ?? 0.2,
    maxTokens: opts?.maxTokens ?? 2000,
    seed: opts?.seed
  });
}