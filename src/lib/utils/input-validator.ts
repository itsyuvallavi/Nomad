/**
 * Input Validator Utility
 * Sanitizes and validates user inputs for travel planning
 */

import validator from 'validator';

export interface BudgetInfo {
  amount: number;
  currency: string;
  perPerson: boolean;
}

export class TravelInputValidator {
  /**
   * Sanitize destination names
   * Removes special characters while preserving valid location names
   */
  static sanitizeDestination(input: string): string {
    // First escape HTML to prevent XSS
    let sanitized = validator.escape(input);
    
    // Remove SQL injection attempts
    sanitized = sanitized.replace(/(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER)\b)/gi, '');
    sanitized = sanitized.replace(/[';`"]/g, '');
    
    // Allow letters, numbers, spaces, hyphens, commas, and common location chars
    sanitized = validator.whitelist(sanitized, 'a-zA-Z0-9 \\-,&');
    
    // Trim and normalize whitespace
    sanitized = validator.trim(sanitized);
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    return sanitized;
  }
  
  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    return validator.isEmail(email);
  }
  
  /**
   * Sanitize general travel input/prompt
   */
  static sanitizeTravelPrompt(input: string): string {
    // Escape HTML first
    let sanitized = validator.escape(input);
    
    // Remove potential script tags and SQL injections
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER)\b)/gi, '');
    
    // Preserve most characters for natural language but remove dangerous ones
    sanitized = sanitized.replace(/[<>]/g, '');
    
    // Normalize whitespace
    sanitized = validator.trim(sanitized);
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    return sanitized;
  }
  
  /**
   * Validate and parse budget input
   */
  static validateBudget(budget: string): BudgetInfo | null {
    if (!budget) return null;
    
    // Remove currency symbols and clean the string
    let cleaned = budget.replace(/[$€£¥₹]/g, '');
    cleaned = cleaned.replace(/,/g, ''); // Remove thousand separators
    
    // Extract currency if mentioned
    let currency = 'USD'; // Default
    if (budget.includes('€') || budget.toLowerCase().includes('eur')) currency = 'EUR';
    else if (budget.includes('£') || budget.toLowerCase().includes('gbp')) currency = 'GBP';
    else if (budget.includes('¥') || budget.toLowerCase().includes('yen')) currency = 'JPY';
    else if (budget.includes('₹') || budget.toLowerCase().includes('inr')) currency = 'INR';
    
    // Check if it's per person
    const perPerson = budget.toLowerCase().includes('per person') || 
                     budget.toLowerCase().includes('pp') ||
                     budget.toLowerCase().includes('each');
    
    // Extract the numeric value
    const numericMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
    if (!numericMatch) return null;
    
    const amount = parseFloat(numericMatch[1]);
    
    // Validate the amount is reasonable (not negative, not too large)
    if (amount < 0 || amount > 1000000) return null;
    
    return {
      amount,
      currency,
      perPerson
    };
  }
  
  /**
   * Validate trip duration
   */
  static validateTripDuration(days: number): boolean {
    // Must be positive and not exceed 30 days (as per your system limit)
    return days > 0 && days <= 30;
  }
  
  /**
   * Extract and validate traveler count
   */
  static extractTravelerCount(text: string): number {
    const normalized = text.toLowerCase();
    
    // Look for explicit patterns
    if (normalized.includes('solo')) return 1;
    if (normalized.includes('couple') || normalized.includes('honeymoon')) return 2;
    
    // Look for "family of X"
    const familyMatch = normalized.match(/family\s+of\s+(\d+)/);
    if (familyMatch) return parseInt(familyMatch[1]);
    
    // Look for "X people"
    const peopleMatch = normalized.match(/(\d+)\s*(people|person|adult|traveler)/);
    if (peopleMatch) return parseInt(peopleMatch[1]);
    
    // Look for "X adults + Y kids"
    const groupMatch = normalized.match(/(\d+)\s*adult[s]?\s*(?:and|&|\+)?\s*(\d+)\s*(?:kid|child|children)/);
    if (groupMatch) {
      return parseInt(groupMatch[1]) + parseInt(groupMatch[2]);
    }
    
    // Default family size
    if (normalized.includes('family')) return 4;
    
    // Group patterns
    if (normalized.includes('group')) {
      const groupSizeMatch = normalized.match(/group\s+(?:of\s+)?(\d+)/);
      if (groupSizeMatch) return parseInt(groupSizeMatch[1]);
      return 4; // Default group size
    }
    
    return 1; // Default to solo traveler
  }
  
  /**
   * Validate and clean location/city names
   */
  static validateLocation(location: string): {
    isValid: boolean;
    cleaned: string;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check for XSS attempts
    if (location.includes('<script') || location.includes('javascript:')) {
      issues.push('Invalid characters detected');
    }
    
    // Check for SQL injection patterns
    if (/(\b(DROP|DELETE|INSERT|UPDATE|SELECT)\b)/i.test(location)) {
      issues.push('Invalid SQL keywords detected');
    }
    
    // Clean the location
    const cleaned = this.sanitizeDestination(location);
    
    // Check if cleaning removed too much
    if (cleaned.length < location.length * 0.5) {
      issues.push('Too many invalid characters');
    }
    
    // Check minimum length
    if (cleaned.length < 2) {
      issues.push('Location name too short');
    }
    
    // Check maximum length
    if (cleaned.length > 100) {
      issues.push('Location name too long');
    }
    
    return {
      isValid: issues.length === 0,
      cleaned,
      issues
    };
  }
  
  /**
   * Comprehensive input validation for travel requests
   */
  static validateTravelRequest(input: string): {
    isValid: boolean;
    sanitized: string;
    warnings: string[];
    extractedInfo: {
      travelerCount?: number;
      budget?: BudgetInfo;
      hasValidDestination: boolean;
    };
  } {
    const warnings: string[] = [];
    
    // Sanitize the input
    const sanitized = this.sanitizeTravelPrompt(input);
    
    // Check if sanitization removed suspicious content
    if (sanitized.length < input.length * 0.8) {
      warnings.push('Some content was removed for safety');
    }
    
    // Extract information
    const travelerCount = this.extractTravelerCount(sanitized);
    const budgetMatch = sanitized.match(/(?:budget|cost|spend).*?(\$?\d+[\d,]*(?:\.\d+)?)/i);
    const budget = budgetMatch ? this.validateBudget(budgetMatch[0]) : undefined;
    
    // Check for destination mentions
    const hasValidDestination = /[A-Z][a-z]+/.test(sanitized) && sanitized.length > 10;
    
    return {
      isValid: warnings.length === 0 && hasValidDestination,
      sanitized,
      warnings,
      extractedInfo: {
        travelerCount,
        budget,
        hasValidDestination
      }
    };
  }
}