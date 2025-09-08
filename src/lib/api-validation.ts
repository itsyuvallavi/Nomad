/**
 * API Key Validation and Management
 */

import { logger } from './logger';

export type APIKeyStatus = {
  isValid: boolean;
  error?: string;
};

export type APIKeysConfig = {
  openai: APIKeyStatus;
  foursquare: APIKeyStatus;
  openweather: APIKeyStatus;
  unsplash: APIKeyStatus;
};

/**
 * Validates that an API key exists and has the correct format
 */
function validateAPIKey(key: string | undefined, keyName: string, minLength = 10): APIKeyStatus {
  if (!key) {
    return {
      isValid: false,
      error: `${keyName} is not configured. Please add it to your .env file.`
    };
  }

  if (key.length < minLength) {
    return {
      isValid: false,
      error: `${keyName} appears to be invalid (too short).`
    };
  }

  // Check for common placeholder values
  const placeholders = ['your-api-key', 'YOUR_API_KEY', 'xxx', 'XXXX', '<your-key>', 'placeholder'];
  if (placeholders.some(placeholder => key.toLowerCase().includes(placeholder.toLowerCase()))) {
    return {
      isValid: false,
      error: `${keyName} appears to be a placeholder value. Please replace it with a real API key.`
    };
  }

  return { isValid: true };
}

/**
 * Validates all API keys at startup
 */
export function validateAPIKeys(): APIKeysConfig {
  return {
    openai: validateAPIKey(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY', 40),
    foursquare: validateAPIKey(process.env.FOURSQUARE_API_KEY, 'FOURSQUARE_API_KEY', 20),
    openweather: validateAPIKey(process.env.OPENWEATHERMAP, 'OPENWEATHERMAP', 20),
    unsplash: validateAPIKey(process.env.UNSPLASH_API_ACCESS_KEY, 'UNSPLASH_API_ACCESS_KEY', 20),
  };
}

/**
 * Logs API key validation status with enhanced logging
 */
export function logAPIKeyStatus(config: APIKeysConfig): void {
  logger.info('SYSTEM', '🔑 API Key Validation Starting...');
  
  // OpenAI is REQUIRED
  if (!config.openai.isValid) {
    logger.error('SYSTEM', '❌ CRITICAL: OpenAI API key is REQUIRED!', {
      error: config.openai.error,
      message: 'Please add OPENAI_API_KEY to your .env file'
    });
  } else {
    logger.info('SYSTEM', '✅ OpenAI API: Configured', {
      status: 'active',
      model: 'gpt-4o-mini'
    });
  }
  
  // Log optional API statuses
  if (config.foursquare.isValid) {
    logger.info('API', '✅ Foursquare API: Configured', { feature: 'Real place data' });
  } else {
    logger.warn('API', '⚠️ Foursquare API: Missing', { fallback: 'Generic place names' });
  }
  
  if (config.openweather.isValid) {
    logger.info('API', '✅ OpenWeather API: Configured', { feature: 'Real weather data' });
  } else {
    logger.warn('API', '⚠️ OpenWeather API: Missing', { fallback: 'Historical averages' });
  }
  
  if (config.unsplash.isValid) {
    logger.info('API', '✅ Unsplash API: Configured', { feature: 'High-quality images' });
  } else {
    logger.warn('API', '⚠️ Unsplash API: Missing', { fallback: 'Placeholder images' });
  }
  
  // Summary
  const configuredCount = Object.values(config).filter(c => c.isValid).length;
  logger.info('SYSTEM', `API Configuration Complete: ${configuredCount}/4 services configured`);
}

/**
 * Creates a safe error message for API key issues (doesn't expose sensitive info)
 */
export function getAPIKeyErrorMessage(keyName: string): string {
  const messages: Record<string, string> = {
    'OPENAI_API_KEY': 'OpenAI API key is REQUIRED. Please add OPENAI_API_KEY to your .env file.',
    'FOURSQUARE_API_KEY': 'Place recommendations service is temporarily unavailable.',
    'OPENWEATHERMAP': 'Weather service is temporarily unavailable.',
    'UNSPLASH_API_ACCESS_KEY': 'Image service is temporarily unavailable.',
  };

  return messages[keyName] || 'A required service is not configured properly.';
}
