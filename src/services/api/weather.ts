// OpenWeatherMap API integration
import { logger } from '@/lib/monitoring/logger';

const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Lazy load API key to ensure env vars are loaded
function getWeatherApiKey(): string | undefined {
  return process.env.OPENWEATHERMAP;
}

export interface WeatherData {
  date: string;
  temp: {
    min: number;
    max: number;
    day: number;
  };
  weather: {
    main: string;
    description: string;
    icon: string;
  };
  humidity: number;
  wind_speed: number;
  pop: number; // Probability of precipitation
}

export interface CityCoordinates {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

// Get city coordinates (needed for weather forecast)
export async function getCityCoordinates(cityName: string): Promise<CityCoordinates> {
  const apiKey = getWeatherApiKey();
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  const response = await fetch(
    `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    throw new Error(`City not found: ${cityName}`);
  }

  return {
    lat: data[0].lat,
    lon: data[0].lon,
    name: data[0].name,
    country: data[0].country
  };
}

// Get 5-day weather forecast
export async function getWeatherForecast(
  cityName: string,
  days: number = 5
): Promise<WeatherData[]> {
  if (typeof window !== 'undefined') {
    console.log(`🌤️ Getting weather forecast for ${cityName} (${days} days)`);
  }
  logger.info('WEATHER', `Getting forecast for ${cityName}`, { days });
  
  const apiKey = getWeatherApiKey();
  if (!apiKey) {
    if (typeof window !== 'undefined') {
      console.warn('🌤️ OpenWeatherMap API key not configured');
    }
    logger.error('API', 'OpenWeatherMap API key not configured');
    throw new Error('OpenWeatherMap API key not configured');
  }

  // First get city coordinates
  const coords = await getCityCoordinates(cityName);
  if (typeof window !== 'undefined') {
    console.log(`🌤️ Found coordinates for ${cityName}:`, coords);
  }
  logger.info('WEATHER', `City coordinates found`, { coords });
  
  // Then get the forecast
  const url = `${WEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&cnt=${days * 8}`;
  logger.debug('WEATHER', 'Request URL', { url: url.replace(apiKey, 'API_KEY_HIDDEN')});
  
  const response = await fetch(url);

  if (!response.ok) {
    logger.error('API', `Weather API Error`, { status: response.status, text: response.statusText });
    throw new Error(`Weather API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (typeof window !== 'undefined') {
    console.log(`🌤️ Received ${data.list?.length || 0} weather data points`);
  }
  logger.info('WEATHER', `Received ${data.list?.length || 0} forecast points`);
  
  // Group forecasts by day and calculate daily summary
  const dailyForecasts = new Map<string, any[]>();
  
  data.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000).toISOString().split('T')[0];
    if (!dailyForecasts.has(date)) {
      dailyForecasts.set(date, []);
    }
    dailyForecasts.get(date)?.push(item);
  });

  // Convert to daily weather data
  const weatherData: WeatherData[] = [];
  
  logger.debug('WEATHER', 'Processing daily forecasts for dates', { dates: Array.from(dailyForecasts.keys()) });
  
  for (const [date, forecasts] of dailyForecasts) {
    if (weatherData.length >= days) break;
    
    // Calculate daily min/max/avg
    const temps = forecasts.map(f => f.main.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    
    // Get most common weather condition
    const weatherCounts = new Map();
    forecasts.forEach(f => {
      const weather = f.weather[0].main;
      weatherCounts.set(weather, (weatherCounts.get(weather) || 0) + 1);
    });
    
    let mainWeather = forecasts[0].weather[0];
    let maxCount = 0;
    for (const [weather, count] of weatherCounts) {
      if (count > maxCount) {
        maxCount = count;
        mainWeather = forecasts.find((f: any) => f.weather[0].main === weather).weather[0];
      }
    }
    
    // Calculate average precipitation probability
    const pops = forecasts.map((f: any) => f.pop || 0);
    const avgPop = pops.reduce((a: number, b: number) => a + b, 0) / pops.length;
    
    weatherData.push({
      date,
      temp: {
        min: Math.round(minTemp),
        max: Math.round(maxTemp),
        day: Math.round(avgTemp)
      },
      weather: {
        main: mainWeather.main,
        description: mainWeather.description,
        icon: mainWeather.icon
      },
      humidity: Math.round(forecasts.reduce((a, b) => a + b.main.humidity, 0) / forecasts.length),
      wind_speed: Math.round(forecasts.reduce((a, b) => a + b.wind.speed, 0) / forecasts.length),
      pop: avgPop
    });
  }

  return weatherData;
}
