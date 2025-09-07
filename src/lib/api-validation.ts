/**
 * API Key Validation and Management
 */

export type APIKeyStatus = {
  isValid: boolean;
  error?: string;
};

export type APIKeysConfig = {
  gemini: APIKeyStatus;
  foursquare: APIKeyStatus;
  openweather: APIKeyStatus;
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
    gemini: validateAPIKey(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY', 20),
    foursquare: validateAPIKey(process.env.FOURSQUARE_API_KEY, 'FOURSQUARE_API_KEY', 20),
    openweather: validateAPIKey(process.env.OPENWEATHERMAP, 'OPENWEATHERMAP', 20),
  };
}

/**
 * Logs API key validation status
 */
export function logAPIKeyStatus(config: APIKeysConfig): void {
  // Only log critical errors
  if (!config.gemini.isValid) {
    console.error('❌ CRITICAL: Gemini API key is missing. Add GEMINI_API_KEY to your .env file.');
  }
  
  // Single line warning for optional keys
  const missing = [];
  if (!config.foursquare.isValid) missing.push('Foursquare');
  if (!config.openweather.isValid) missing.push('OpenWeather');
  
  if (missing.length > 0) {
    console.warn(`⚠️ Optional API keys missing: ${missing.join(', ')}. Some features will use fallbacks.`);
  }
}

/**
 * Creates a safe error message for API key issues (doesn't expose sensitive info)
 */
export function getAPIKeyErrorMessage(keyName: string): string {
  const messages: Record<string, string> = {
    'GEMINI_API_KEY': 'AI service is not configured properly. Please contact support.',
    'FOURSQUARE_API_KEY': 'Place recommendations service is temporarily unavailable.',
    'OPENWEATHERMAP': 'Weather service is temporarily unavailable.',
  };

  return messages[keyName] || 'A required service is not configured properly.';
}
