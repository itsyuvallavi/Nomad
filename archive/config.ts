// AI Configuration
// Using OpenAI as the primary ML provider

export const AI_CONFIG = {
  // Model settings - OpenAI
  model: {
    name: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 16384,
  },
  
  // API settings
  api: {
    timeout: 30000,
    retries: 3,
  },
  
  // Feature flags
  features: {
    useTools: true,
    streaming: false,
    caching: true,
  }
};

// Export OpenAI configuration
export * from './openai-config';