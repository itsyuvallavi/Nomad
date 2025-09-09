/**
 * NLP Parser Utility
 * Advanced entity extraction using compromise.js
 */

import nlp from 'compromise';
import { logger } from '@/lib/logger';

// Extend compromise with travel-specific terms
nlp.plugin({
  words: {
    // Travel verbs
    'fly': 'Verb',
    'visit': 'Verb',
    'explore': 'Verb',
    'tour': 'Verb',
    'backpack': 'Verb',
    'travel': 'Verb',
    
    // Travel nouns
    'honeymoon': 'Noun',
    'workation': 'Noun',
    'vacation': 'Noun',
    'trip': 'Noun',
    'journey': 'Noun',
    'getaway': 'Noun',
    
    // Travel adjectives
    'solo': 'Adjective',
    'romantic': 'Adjective',
    'budget': 'Adjective',
    'luxury': 'Adjective',
    'business': 'Adjective',
    'family': 'Adjective',
    
    // Common destinations
    'bali': 'Place',
    'tokyo': 'Place',
    'paris': 'Place',
    'london': 'Place',
    'rome': 'Place',
    'barcelona': 'Place',
    'thailand': 'Place',
    'vietnam': 'Place',
    'iceland': 'Place'
  }
});

export interface TravelEntities {
  places: string[];
  dates: string[];
  durations: string[];
  numbers: string[];
  travelers: number;
  activities: string[];
  preferences: string[];
  budget?: {
    amount: number;
    currency: string;
  };
}

export type TripType = 
  | 'solo' 
  | 'couple' 
  | 'family' 
  | 'group' 
  | 'business' 
  | 'honeymoon' 
  | 'workation' 
  | 'backpacking' 
  | 'luxury' 
  | 'budget' 
  | 'adventure'
  | 'relaxation'
  | 'cultural'
  | 'general';

export interface TravelPreferences {
  tripType: TripType;
  interests: string[];
  accommodationType?: 'hotel' | 'hostel' | 'airbnb' | 'resort' | 'any';
  transportPreference?: 'flight' | 'train' | 'car' | 'bus' | 'any';
  pacePreference?: 'relaxed' | 'moderate' | 'packed';
}

export class AdvancedTravelParser {
  /**
   * Extract all travel-related entities from text
   */
  static extractEntities(text: string): TravelEntities {
    const doc = nlp(text);
    
    // Extract places (cities, countries, landmarks)
    const places = this.extractPlaces(doc, text);
    
    // Extract dates and time references
    const dates = this.extractDates(doc, text);
    
    // Extract durations
    const durations = this.extractDurations(text);
    
    // Extract numbers (for days, people, budget)
    const numbers = doc.values().out('array');
    
    // Extract traveler count
    const travelers = this.extractTravelerCount(text, doc);
    
    // Extract activities and interests
    const activities = this.extractActivities(doc, text);
    
    // Extract preferences
    const preferences = this.extractPreferences(doc, text);
    
    // Extract budget
    const budget = this.extractBudget(text, doc);
    
    return {
      places,
      dates,
      durations,
      numbers,
      travelers,
      activities,
      preferences,
      budget
    };
  }
  
  /**
   * Extract place names with improved accuracy
   */
  private static extractPlaces(doc: any, text: string): string[] {
    const places = new Set<string>();
    
    // Get NLP-detected places
    const nlpPlaces = doc.places().out('array');
    nlpPlaces.forEach((place: string) => places.add(place));
    
    // Additional patterns for destinations
    const patterns = [
      /(?:to|in|at|visit|explore)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:trip|vacation|holiday|tour)/g,
      /(?:fly|flying|flight)\s+to\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g
    ];
    
    patterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const place = match[1].trim();
        // Filter out common false positives
        if (!this.isCommonWord(place)) {
          places.add(place);
        }
      });
    });
    
    // Look for country names
    const countries = [
      'Japan', 'Thailand', 'Vietnam', 'Cambodia', 'Laos', 'Indonesia', 'Malaysia',
      'France', 'Italy', 'Spain', 'Germany', 'Greece', 'Portugal', 'Netherlands',
      'United States', 'USA', 'Canada', 'Mexico', 'Brazil', 'Argentina',
      'Iceland', 'Norway', 'Sweden', 'Denmark', 'Finland',
      'India', 'Nepal', 'Sri Lanka', 'Morocco', 'Egypt', 'Kenya', 'South Africa'
    ];
    
    countries.forEach(country => {
      if (text.toLowerCase().includes(country.toLowerCase())) {
        places.add(country);
      }
    });
    
    return Array.from(places);
  }
  
  /**
   * Extract dates with context
   */
  private static extractDates(doc: any, text: string): string[] {
    const dates = new Set<string>();
    
    // NLP dates - compromise doesn't have built-in dates() method
    // Look for date-like patterns in the document
    const dateTerms = doc.match('#Date').out('array');
    const monthTerms = doc.match('#Month').out('array');
    dateTerms.forEach((date: string) => dates.add(date));
    monthTerms.forEach((month: string) => dates.add(month));
    
    // Month patterns
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    months.forEach(month => {
      const monthPattern = new RegExp(`(?:mid-?|end of |early |late )?${month}`, 'gi');
      const matches = text.match(monthPattern);
      if (matches) {
        matches.forEach(match => dates.add(match));
      }
    });
    
    // Seasonal patterns
    const seasons = ['spring', 'summer', 'fall', 'autumn', 'winter'];
    seasons.forEach(season => {
      if (text.toLowerCase().includes(season)) {
        dates.add(season);
      }
    });
    
    // Relative dates
    const relativePatterns = [
      'next week', 'next month', 'tomorrow', 'this weekend',
      'next weekend', 'next year', 'this summer', 'next summer'
    ];
    
    relativePatterns.forEach(pattern => {
      if (text.toLowerCase().includes(pattern)) {
        dates.add(pattern);
      }
    });
    
    return Array.from(dates);
  }
  
  /**
   * Extract duration patterns
   */
  private static extractDurations(text: string): string[] {
    const durations = new Set<string>();
    
    const patterns = [
      /(\d+)\s*(day|days|night|nights)/gi,
      /(\d+)\s*(week|weeks)/gi,
      /(\d+)\s*(month|months)/gi,
      /(weekend|long weekend)/gi,
      /(one|two|three|four|five)\s*(week|weeks)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => durations.add(match[0]));
    });
    
    return Array.from(durations);
  }
  
  /**
   * Extract traveler count with context
   */
  private static extractTravelerCount(text: string, doc: any): number {
    const normalized = text.toLowerCase();
    
    // Explicit patterns
    if (normalized.includes('solo')) return 1;
    if (normalized.includes('couple') || normalized.includes('honeymoon')) return 2;
    
    // Look for "X people/persons/adults/travelers"
    const peoplePattern = /(\d+)\s*(people|person|persons|adult|adults|traveler|travelers|pax)/i;
    const peopleMatch = text.match(peoplePattern);
    if (peopleMatch) {
      return parseInt(peopleMatch[1]);
    }
    
    // Family patterns
    if (normalized.includes('family')) {
      const familyPattern = /family\s+of\s+(\d+)/i;
      const familyMatch = text.match(familyPattern);
      if (familyMatch) {
        return parseInt(familyMatch[1]);
      }
      
      // Check for "X adults and Y kids"
      const familyComboPattern = /(\d+)\s*adult[s]?\s*(?:and|&|\+)?\s*(\d+)\s*(?:kid|child|children)/i;
      const comboMatch = text.match(familyComboPattern);
      if (comboMatch) {
        return parseInt(comboMatch[1]) + parseInt(comboMatch[2]);
      }
      
      return 4; // Default family size
    }
    
    // Group patterns
    if (normalized.includes('group')) {
      const groupPattern = /group\s+of\s+(\d+)/i;
      const groupMatch = text.match(groupPattern);
      if (groupMatch) {
        return parseInt(groupMatch[1]);
      }
      return 4; // Default group size
    }
    
    // Use NLP to find numbers near person-related words
    const numbers = doc.values().out('array');
    if (numbers.length > 0) {
      // Check if any number is near a person word
      for (const num of numbers) {
        const numValue = parseInt(num);
        if (numValue > 0 && numValue < 20) { // Reasonable traveler count
          const numIndex = text.indexOf(num);
          const nearbyText = text.substring(Math.max(0, numIndex - 20), numIndex + 20);
          if (/people|person|adult|traveler/i.test(nearbyText)) {
            return numValue;
          }
        }
      }
    }
    
    return 1; // Default to solo
  }
  
  /**
   * Extract activities and interests
   */
  private static extractActivities(doc: any, text: string): string[] {
    const activities = new Set<string>();
    
    // Common travel activities
    const activityPatterns = [
      'sightseeing', 'shopping', 'hiking', 'beach', 'museum', 'food tour',
      'nightlife', 'cultural', 'historical', 'adventure', 'relaxation',
      'spa', 'diving', 'snorkeling', 'skiing', 'surfing', 'cycling',
      'wine tasting', 'cooking class', 'photography', 'wildlife',
      'temples', 'castles', 'markets', 'festivals', 'concerts'
    ];
    
    activityPatterns.forEach(activity => {
      if (text.toLowerCase().includes(activity)) {
        activities.add(activity);
      }
    });
    
    // Look for activity-related verbs
    const verbs = doc.verbs().out('array');
    const activityVerbs = ['explore', 'visit', 'see', 'experience', 'try', 'enjoy'];
    verbs.forEach((verb: string) => {
      if (activityVerbs.includes(verb.toLowerCase())) {
        // Get the object of the verb
        const verbIndex = text.indexOf(verb);
        const afterVerb = text.substring(verbIndex + verb.length, verbIndex + verb.length + 30);
        const objectMatch = afterVerb.match(/\s+([a-zA-Z\s]+?)(?:\.|,|and|$)/);
        if (objectMatch) {
          activities.add(objectMatch[1].trim());
        }
      }
    });
    
    return Array.from(activities);
  }
  
  /**
   * Extract travel preferences
   */
  private static extractPreferences(doc: any, text: string): string[] {
    const preferences = new Set<string>();
    
    // Accommodation preferences
    const accommodations = ['hotel', 'hostel', 'airbnb', 'resort', 'boutique', 'luxury'];
    accommodations.forEach(acc => {
      if (text.toLowerCase().includes(acc)) {
        preferences.add(`accommodation:${acc}`);
      }
    });
    
    // Travel style
    const styles = ['budget', 'luxury', 'backpacking', 'comfortable', 'authentic', 'local'];
    styles.forEach(style => {
      if (text.toLowerCase().includes(style)) {
        preferences.add(`style:${style}`);
      }
    });
    
    // Specific requirements
    if (text.toLowerCase().includes('wifi') || text.toLowerCase().includes('internet')) {
      preferences.add('requirement:wifi');
    }
    if (text.toLowerCase().includes('coworking')) {
      preferences.add('requirement:coworking');
    }
    if (text.toLowerCase().includes('romantic')) {
      preferences.add('atmosphere:romantic');
    }
    if (text.toLowerCase().includes('quiet') || text.toLowerCase().includes('peaceful')) {
      preferences.add('atmosphere:quiet');
    }
    
    return Array.from(preferences);
  }
  
  /**
   * Extract budget information
   */
  private static extractBudget(text: string, doc: any): TravelEntities['budget'] | undefined {
    // Look for currency symbols and amounts
    const currencyPatterns = [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      /€\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      /£\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|EUR|GBP)/gi
    ];
    
    for (const pattern of currencyPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        let currency = 'USD';
        
        if (pattern.source.includes('€')) currency = 'EUR';
        else if (pattern.source.includes('£')) currency = 'GBP';
        else if (text.includes('EUR')) currency = 'EUR';
        else if (text.includes('GBP')) currency = 'GBP';
        
        return { amount, currency };
      }
    }
    
    // Look for budget mentioned with words
    const budgetPattern = /budget\s+(?:of\s+)?(?:around\s+)?(\d+(?:,\d{3})*)/i;
    const budgetMatch = text.match(budgetPattern);
    if (budgetMatch) {
      return {
        amount: parseFloat(budgetMatch[1].replace(/,/g, '')),
        currency: 'USD'
      };
    }
    
    return undefined;
  }
  
  /**
   * Identify the type of trip
   */
  static identifyTripType(text: string): TripType {
    const normalized = text.toLowerCase();
    
    // Check for explicit trip types
    if (normalized.includes('honeymoon')) return 'honeymoon';
    if (normalized.includes('workation') || 
        (normalized.includes('work') && normalized.includes('remote'))) return 'workation';
    if (normalized.includes('business')) return 'business';
    if (normalized.includes('backpack')) return 'backpacking';
    if (normalized.includes('luxury')) return 'luxury';
    if (normalized.includes('budget')) return 'budget';
    if (normalized.includes('adventure')) return 'adventure';
    if (normalized.includes('relax') || normalized.includes('beach')) return 'relaxation';
    if (normalized.includes('cultural') || normalized.includes('museum')) return 'cultural';
    
    // Check for traveler type
    if (normalized.includes('solo')) return 'solo';
    if (normalized.includes('couple') || normalized.includes('romantic')) return 'couple';
    if (normalized.includes('family') || normalized.includes('kids')) return 'family';
    if (normalized.includes('group') || normalized.includes('friends')) return 'group';
    
    return 'general';
  }
  
  /**
   * Extract travel preferences from text
   */
  static extractTravelPreferences(text: string): TravelPreferences {
    const tripType = this.identifyTripType(text);
    const normalized = text.toLowerCase();
    
    // Extract interests
    const interests: string[] = [];
    const interestKeywords = [
      'food', 'culture', 'history', 'nature', 'adventure', 'nightlife',
      'shopping', 'photography', 'architecture', 'art', 'music', 'sports',
      'wellness', 'beach', 'mountains', 'wildlife'
    ];
    
    interestKeywords.forEach(interest => {
      if (normalized.includes(interest)) {
        interests.push(interest);
      }
    });
    
    // Determine accommodation type
    let accommodationType: TravelPreferences['accommodationType'] = 'any';
    if (normalized.includes('hotel')) accommodationType = 'hotel';
    else if (normalized.includes('hostel')) accommodationType = 'hostel';
    else if (normalized.includes('airbnb')) accommodationType = 'airbnb';
    else if (normalized.includes('resort')) accommodationType = 'resort';
    
    // Determine transport preference
    let transportPreference: TravelPreferences['transportPreference'] = 'any';
    if (normalized.includes('fly') || normalized.includes('flight')) transportPreference = 'flight';
    else if (normalized.includes('train')) transportPreference = 'train';
    else if (normalized.includes('drive') || normalized.includes('car')) transportPreference = 'car';
    else if (normalized.includes('bus')) transportPreference = 'bus';
    
    // Determine pace preference
    let pacePreference: TravelPreferences['pacePreference'] = 'moderate';
    if (normalized.includes('relaxed') || normalized.includes('slow') || normalized.includes('easy')) {
      pacePreference = 'relaxed';
    } else if (normalized.includes('packed') || normalized.includes('busy') || normalized.includes('full')) {
      pacePreference = 'packed';
    }
    
    return {
      tripType,
      interests,
      accommodationType,
      transportPreference,
      pacePreference
    };
  }
  
  /**
   * Detect urgency level
   */
  static detectUrgency(text: string): 'immediate' | 'planning' | 'exploring' {
    const normalized = text.toLowerCase();
    
    // Immediate travel indicators
    if (normalized.includes('tomorrow') || 
        normalized.includes('today') || 
        normalized.includes('urgent') ||
        normalized.includes('asap') ||
        normalized.includes('right now')) {
      return 'immediate';
    }
    
    // Planning indicators
    if (normalized.includes('planning') ||
        normalized.includes('next week') ||
        normalized.includes('next month') ||
        normalized.includes('booking')) {
      return 'planning';
    }
    
    // Exploring indicators
    if (normalized.includes('thinking about') ||
        normalized.includes('considering') ||
        normalized.includes('maybe') ||
        normalized.includes('someday') ||
        normalized.includes('ideas')) {
      return 'exploring';
    }
    
    return 'planning'; // Default
  }
  
  /**
   * Check if a word is a common false positive
   */
  private static isCommonWord(word: string): boolean {
    const commonWords = [
      'Day', 'Week', 'Month', 'Year', 'Trip', 'Travel', 'Vacation',
      'Holiday', 'Tour', 'Visit', 'Explore', 'From', 'To', 'The'
    ];
    return commonWords.includes(word);
  }
}