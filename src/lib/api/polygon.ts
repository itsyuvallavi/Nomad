import { logger } from '../logger';

const POLYGON_BASE_URL = 'https://api.polygon.io';

// Lazy load API key to ensure env vars are loaded
function getPolygonApiKey(): string | undefined {
  return process.env.POLYGON_API_KEY;
}

interface CurrencyConversion {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

interface MarketStatus {
  market: string;
  status: 'open' | 'closed';
  afterHours: boolean;
  exchanges: {
    nyse: string;
    nasdaq: string;
  };
}

interface EconomicIndicator {
  country: string;
  gdp?: number;
  inflationRate?: number;
  interestRate?: number;
  unemploymentRate?: number;
  timestamp: number;
}

/**
 * Get real-time currency exchange rate using forex aggregates
 */
export async function getCurrencyExchangeRate(
  from: string = 'USD',
  to: string = 'EUR'
): Promise<CurrencyConversion | null> {
  if (typeof window !== 'undefined') {
    console.log(`💱 Getting exchange rate: ${from} → ${to}`);
  }
  
  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    if (typeof window !== 'undefined') {
      console.warn('💱 Polygon API key not configured, using mock data');
    }
    logger.warn('Polygon', 'API key not configured, returning mock data');
    return getMockExchangeRate(from, to);
  }

  try {
    // Use the forex aggregates endpoint which is available on free tier
    // Format: C:FROMUSD for non-USD pairs, or C:USDTO for USD pairs
    let ticker: string;
    let needsInversion = false;
    
    if (from === 'USD') {
      ticker = `C:${to}USD`;
      needsInversion = true; // We need to invert the rate
    } else if (to === 'USD') {
      ticker = `C:${from}USD`;
    } else {
      // For non-USD pairs, try to go through USD
      const fromToUsd = await getCurrencyExchangeRate(from, 'USD');
      const usdToTarget = await getCurrencyExchangeRate('USD', to);
      if (fromToUsd && usdToTarget) {
        return {
          from,
          to,
          rate: fromToUsd.rate * usdToTarget.rate,
          timestamp: Date.now()
        };
      }
      return getMockExchangeRate(from, to);
    }

    const response = await fetch(
      `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev?apiKey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const rate = needsInversion ? (1 / result.c) : result.c;
      
      logger.info('Polygon', `Exchange rate ${from}/${to}: ${rate.toFixed(4)}`);
      const finalRate = {
        from,
        to,
        rate: Number(rate.toFixed(4)),
        timestamp: result.t || Date.now()
      };
      
      if (typeof window !== 'undefined') {
        console.log(`💱 Exchange rate: 1 ${from} = ${finalRate.rate} ${to}`);
      }
      
      return finalRate;
    }

    return getMockExchangeRate(from, to);
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.error(`💱 Failed to get exchange rate ${from}/${to}:`, error);
    }
    logger.error('Polygon', `Failed to get exchange rate ${from}/${to}`, { error });
    return getMockExchangeRate(from, to);
  }
}

/**
 * Get multiple currency rates for travel planning
 */
export async function getTravelCurrencies(
  baseCurrency: string = 'USD',
  destinations: string[]
): Promise<Map<string, number>> {
  const rates = new Map<string, number>();
  
  // Map common destination names to currencies
  const currencyMap: Record<string, string> = {
    'london': 'GBP',
    'paris': 'EUR',
    'tokyo': 'JPY',
    'sydney': 'AUD',
    'toronto': 'CAD',
    'zurich': 'CHF',
    'dubai': 'AED',
    'singapore': 'SGD',
    'bangkok': 'THB',
    'seoul': 'KRW',
    'mexico city': 'MXN',
    'mumbai': 'INR',
    'beijing': 'CNY',
    'cairo': 'EGP',
    'istanbul': 'TRY'
  };

  for (const destination of destinations) {
    const currency = currencyMap[destination.toLowerCase()] || 'EUR';
    
    if (currency === baseCurrency) {
      rates.set(destination, 1);
      continue;
    }

    const rate = await getCurrencyExchangeRate(baseCurrency, currency);
    if (rate) {
      rates.set(destination, rate.rate);
    }
  }

  return rates;
}

/**
 * Get market status for financial context
 */
export async function getMarketStatus(): Promise<MarketStatus> {
  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    return getMockMarketStatus();
  }

  try {
    const response = await fetch(
      `${POLYGON_BASE_URL}/v1/marketstatus/now?apiKey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      market: data.market || 'stocks',
      status: data.serverTime ? 'open' : 'closed',
      afterHours: data.earlyHours || false,
      exchanges: {
        nyse: data.exchanges?.nyse || 'unknown',
        nasdaq: data.exchanges?.nasdaq || 'unknown'
      }
    };
  } catch (error) {
    logger.error('Polygon', 'Failed to get market status', { error });
    return getMockMarketStatus();
  }
}

/**
 * Get economic indicators for a country
 */
export async function getEconomicIndicators(
  countryCode: string = 'US'
): Promise<EconomicIndicator> {
  const apiKey = getPolygonApiKey();
  if (!apiKey) {
    return getMockEconomicIndicators(countryCode);
  }

  try {
    // Note: This is a simplified example - Polygon.io's economic data
    // endpoints may vary based on subscription level
    const response = await fetch(
      `${POLYGON_BASE_URL}/v1/reference/economic/${countryCode}?apiKey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      country: countryCode,
      gdp: data.gdp,
      inflationRate: data.inflation,
      interestRate: data.interest,
      unemploymentRate: data.unemployment,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error('Polygon', `Failed to get economic indicators for ${countryCode}`, { error });
    return getMockEconomicIndicators(countryCode);
  }
}

/**
 * Mock data functions for testing
 */
function getMockExchangeRate(from: string, to: string): CurrencyConversion {
  const mockRates: Record<string, number> = {
    'USD-EUR': 0.92,
    'USD-GBP': 0.79,
    'USD-JPY': 149.50,
    'USD-AUD': 1.53,
    'USD-CAD': 1.36,
    'EUR-USD': 1.09,
    'GBP-USD': 1.27
  };

  const key = `${from}-${to}`;
  const rate = mockRates[key] || 1 / (mockRates[`${to}-${from}`] || 1);

  return {
    from,
    to,
    rate: Number(rate.toFixed(4)),
    timestamp: Date.now()
  };
}

function getMockMarketStatus(): MarketStatus {
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  
  // Market hours: Mon-Fri, 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 14 && hour < 21;
  
  return {
    market: 'stocks',
    status: isWeekday && isMarketHours ? 'open' : 'closed',
    afterHours: isWeekday && (hour >= 21 || hour < 14),
    exchanges: {
      nyse: isWeekday && isMarketHours ? 'open' : 'closed',
      nasdaq: isWeekday && isMarketHours ? 'open' : 'closed'
    }
  };
}

function getMockEconomicIndicators(countryCode: string): EconomicIndicator {
  const mockData: Record<string, Partial<EconomicIndicator>> = {
    'US': {
      gdp: 25462.7,
      inflationRate: 3.1,
      interestRate: 5.33,
      unemploymentRate: 3.9
    },
    'GB': {
      gdp: 3070.6,
      inflationRate: 4.0,
      interestRate: 5.25,
      unemploymentRate: 4.2
    },
    'JP': {
      gdp: 4233.5,
      inflationRate: 2.8,
      interestRate: -0.1,
      unemploymentRate: 2.5
    },
    'EU': {
      gdp: 15846.1,
      inflationRate: 2.4,
      interestRate: 4.5,
      unemploymentRate: 6.4
    }
  };

  const data = mockData[countryCode] || mockData['US'];
  
  return {
    country: countryCode,
    ...data,
    timestamp: Date.now()
  };
}

/**
 * Calculate budget recommendations based on economic data
 */
export async function getBudgetRecommendation(
  destination: string,
  baseCurrency: string = 'USD',
  travelStyle: 'budget' | 'moderate' | 'luxury' = 'moderate'
): Promise<{
  dailyBudget: number;
  exchangeRate: number;
  localCurrency: string;
  recommendations: string[];
}> {
  const currencyMap: Record<string, string> = {
    'london': 'GBP',
    'paris': 'EUR',
    'tokyo': 'JPY',
    'sydney': 'AUD',
    'new york': 'USD'
  };

  const localCurrency = currencyMap[destination.toLowerCase()] || 'USD';
  const exchangeRate = localCurrency === baseCurrency 
    ? 1 
    : (await getCurrencyExchangeRate(baseCurrency, localCurrency))?.rate || 1;

  const baseBudgets = {
    budget: 50,
    moderate: 150,
    luxury: 300
  };

  const cityMultipliers: Record<string, number> = {
    'london': 1.3,
    'paris': 1.2,
    'tokyo': 1.4,
    'sydney': 1.2,
    'new york': 1.5,
    'bangkok': 0.7,
    'mumbai': 0.6
  };

  const multiplier = cityMultipliers[destination.toLowerCase()] || 1;
  const dailyBudget = baseBudgets[travelStyle] * multiplier;

  const recommendations = [
    `Daily budget: ${baseCurrency} ${dailyBudget.toFixed(0)} (${localCurrency} ${(dailyBudget * exchangeRate).toFixed(0)})`,
    `Current exchange rate: 1 ${baseCurrency} = ${exchangeRate.toFixed(2)} ${localCurrency}`,
    `Consider exchanging currency before travel for better rates`,
    `Use credit cards without foreign transaction fees`
  ];

  return {
    dailyBudget,
    exchangeRate,
    localCurrency,
    recommendations
  };
}