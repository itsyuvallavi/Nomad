// OpenWeatherMap API integration
import { logger } from '@/lib/logger';

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP;
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

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
  if (!OPENWEATHERMAP_API_KEY) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  const response = await fetch(
    `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`
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
  logger.info('WEATHER', `Getting forecast for ${cityName}`, { days });
  
  if (!OPENWEATHERMAP_API_KEY) {
    logger.error('API', 'OpenWeatherMap API key not configured');
    throw new Error('OpenWeatherMap API key not configured');
  }

  // First get city coordinates
  const coords = await getCityCoordinates(cityName);
  logger.info('WEATHER', `City coordinates found`, { coords });
  
  // Then get the forecast
  const url = `${WEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&cnt=${days * 8}`;
  logger.debug('WEATHER', 'Request URL', { url: url.replace(OPENWEATHERMAP_API_KEY, 'API_KEY_HIDDEN')});
  
  const response = await fetch(url);

  if (!response.ok) {
    logger.error('API', `Weather API Error`, { status: response.status, text: response.statusText });
    throw new Error(`Weather API error: ${response.statusText}`);
  }

  const data = await response.json();
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

// Get weather for a specific date
export async function getWeatherForDate(
  cityName: string,
  date: Date
): Promise<WeatherData | null> {
  const forecast = await getWeatherForecast(cityName, 5);
  const targetDate = date.toISOString().split('T')[0];
  
  return forecast.find(w => w.date === targetDate) || null;
}

// Get weather summary for trip dates
export async function getWeatherSummary(
  destination: string,
  startDate: Date,
  endDate: Date
): Promise<string> {
  try {
    const forecast = await getWeatherForecast(destination, 5);
    
    // Check if any forecast days overlap with trip dates
    const tripStart = startDate.toISOString().split('T')[0];
    const tripEnd = endDate.toISOString().split('T')[0];
    
    const relevantForecasts = forecast.filter(f => {
      return f.date >= tripStart && f.date <= tripEnd;
    });
    
    if (relevantForecasts.length === 0) {
      // No forecast available for trip dates, return general forecast
      const temps = forecast.map(f => f.temp.day);
      const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
      const weatherTypes = forecast.map(f => f.weather.main);
      const mainWeather = weatherTypes[0]; // Most common in next 5 days
      
      return `Expect ${mainWeather.toLowerCase()} weather with temperatures around ${avgTemp}°C`;
    }
    
    // Summarize weather for trip dates
    const temps = relevantForecasts.map(f => f.temp.day);
    const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const minTemp = Math.min(...relevantForecasts.map(f => f.temp.min));
    const maxTemp = Math.max(...relevantForecasts.map(f => f.temp.max));
    
    const hasRain = relevantForecasts.some(f => f.pop > 0.3);
    const weatherTypes = [...new Set(relevantForecasts.map(f => f.weather.main))];
    
    let summary = `${minTemp}-${maxTemp}°C`;
    if (weatherTypes.length === 1) {
      summary += `, ${weatherTypes[0].toLowerCase()}`;
    } else {
      summary += `, mixed conditions`;
    }
    
    if (hasRain) {
      summary += ' with possible rain';
    }
    
    return summary;
  } catch (error) {
    logger.error('WEATHER', 'Error getting weather summary', { error });
    return 'Weather information unavailable';
  }
}
