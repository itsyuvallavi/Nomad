import OpenAI from 'openai';
import { logger } from '@/lib/logger';

// Initialize OpenAI client with API key from environment
// This must run server-side only
// Handle missing API key gracefully
function initializeOpenAI() {
  if (typeof window !== 'undefined') {
    return null; // Don't initialize on client side
  }
  
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('AI', 'OPENAI_API_KEY not found in environment');
    return null;
  }
  
  logger.info('AI', 'Initializing OpenAI client', { 
    keyPrefix: process.env.OPENAI_API_KEY.substring(0, 10) 
  });
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export const openai = initializeOpenAI();

// Model configuration
export const MODEL_CONFIG = {
  model: 'gpt-4o-mini', // Using GPT-4o-mini for best cost/performance balance
  temperature: 0.7,
  max_tokens: 16384, // Increased from 8192 to handle multi-destination trips
  response_format: { type: 'json_object' as const },
};

