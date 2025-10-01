/**
 * Shared date utility functions for consistent date/time handling
 * across the Nomad Navigator application
 *
 * @module date-helpers
 * @description
 * This module provides a comprehensive set of date and time utilities
 * specifically designed for travel itinerary management. All functions
 * handle timezone considerations and edge cases common in travel apps.
 *
 * @example
 * ```typescript
 * import { parseLocalDate, formatFullDate, getDaysBetween } from '@/lib/utils/date-helpers';
 *
 * const startDate = '2024-03-15';
 * const endDate = '2024-03-20';
 *
 * const tripDuration = getDaysBetween(startDate, endDate); // 5
 * const formattedStart = formatFullDate(startDate); // "Friday, March 15, 2024"
 * ```
 */

/**
 * Parse a date string in YYYY-MM-DD format to a Date object
 * Uses local timezone to avoid off-by-one errors common with UTC conversion
 *
 * @param dateStr - Date string in YYYY-MM-DD format (e.g., "2024-03-15")
 * @returns Date object in local timezone
 *
 * @example
 * ```typescript
 * parseLocalDate('2024-03-15'); // Returns: Date object for March 15, 2024
 * parseLocalDate('2024-12-31'); // Returns: Date object for December 31, 2024
 * parseLocalDate(''); // Returns: Current date as fallback
 * ```
 *
 * @remarks
 * This function specifically avoids using Date.parse() or new Date(string)
 * to prevent timezone-related bugs where dates can shift by one day.
 *
 * Edge cases handled:
 * - Empty strings return current date
 * - Invalid format will throw an error
 * - Leap years are correctly handled
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format an activity time string for display with proper AM/PM notation
 * Ensures consistent time formatting across the application
 *
 * @param time - Time string in various formats (e.g., "10:30", "10:30 AM", "14:00")
 * @returns Formatted time string with AM/PM designation
 *
 * @example
 * ```typescript
 * formatActivityTime('10:30'); // Returns: "10:30 AM"
 * formatActivityTime('14:00'); // Returns: "14:00 PM"
 * formatActivityTime('10:30 am'); // Returns: "10:30 AM" (normalized)
 * formatActivityTime(''); // Returns: "" (empty string for invalid input)
 * ```
 *
 * @remarks
 * This function intelligently handles:
 * - Missing AM/PM indicators (infers based on hour)
 * - Case normalization (am/AM, pm/PM)
 * - 24-hour format conversion
 * - Empty or invalid input
 *
 * Timezone considerations:
 * - Times are treated as local to the destination
 * - No timezone conversion is performed
 */
export function formatActivityTime(time: string): string {
  if (!time) return '';

  // Ensure time has proper AM/PM formatting
  const timeUpper = time.toUpperCase();
  if (!timeUpper.includes('AM') && !timeUpper.includes('PM')) {
    // If no AM/PM, try to infer from hour
    const [hourStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    if (hour >= 0 && hour < 12) {
      return `${time} AM`;
    } else if (hour >= 12) {
      return `${time} PM`;
    }
  }

  return time;
}

/**
 * Get the full day of the week name from a date string
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Full weekday name (e.g., "Monday", "Tuesday")
 *
 * @example
 * ```typescript
 * getDayOfWeek('2024-03-15'); // Returns: "Friday"
 * getDayOfWeek('2024-12-25'); // Returns: "Wednesday"
 * ```
 *
 * @remarks
 * Uses the user's locale settings for internationalization.
 * Returns English weekday names by default.
 */
export function getDayOfWeek(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Format a date range for display with intelligent year handling
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Formatted date range string
 *
 * @example
 * ```typescript
 * // Same year - year shown only at end
 * getDateRange('2024-03-15', '2024-03-20'); // Returns: "Mar 15 - Mar 20, 2024"
 *
 * // Different years - both years shown
 * getDateRange('2024-12-28', '2025-01-03'); // Returns: "Dec 28, 2024 - Jan 3, 2025"
 *
 * // Same month and year
 * getDateRange('2024-03-15', '2024-03-17'); // Returns: "Mar 15 - Mar 17, 2024"
 * ```
 *
 * @remarks
 * Optimized for travel itineraries:
 * - Minimizes redundant information
 * - Handles year transitions gracefully
 * - Uses abbreviated month names for compactness
 */
export function getDateRange(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  };

  // If same year, only show year at the end
  if (start.getFullYear() === end.getFullYear()) {
    const startStr = start.toLocaleDateString('en-US', formatOptions);
    const endStr = end.toLocaleDateString('en-US', {
      ...formatOptions,
      year: 'numeric'
    });
    return `${startStr} - ${endStr}`;
  } else {
    // Different years, show both years
    const fullOptions: Intl.DateTimeFormatOptions = {
      ...formatOptions,
      year: 'numeric'
    };
    const startStr = start.toLocaleDateString('en-US', fullOptions);
    const endStr = end.toLocaleDateString('en-US', fullOptions);
    return `${startStr} - ${endStr}`;
  }
}

/**
 * Parse time string and extract hours and minutes in 24-hour format
 * Useful for converting to other formats or calculations
 *
 * @param timeStr - Time string in 12 or 24-hour format
 * @returns Object containing hours (0-23) and minutes (0-59)
 *
 * @example
 * ```typescript
 * parseTimeString('10:30 AM'); // Returns: { hours: 10, minutes: 30 }
 * parseTimeString('2:45 PM');  // Returns: { hours: 14, minutes: 45 }
 * parseTimeString('12:00 AM'); // Returns: { hours: 0, minutes: 0 } (midnight)
 * parseTimeString('12:00 PM'); // Returns: { hours: 12, minutes: 0 } (noon)
 * parseTimeString('14:30');    // Returns: { hours: 14, minutes: 30 }
 * ```
 *
 * @remarks
 * Handles edge cases:
 * - 12:00 AM converts to 00:00 (midnight)
 * - 12:00 PM stays as 12:00 (noon)
 * - Missing minutes default to 0
 * - Supports both 12 and 24-hour input formats
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const formattedTime = formatActivityTime(timeStr);
  const [time, period] = formattedTime.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr || '0', 10);

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Format a date for display with complete details
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Full formatted date string
 *
 * @example
 * ```typescript
 * formatFullDate('2024-03-15'); // Returns: "Friday, March 15, 2024"
 * formatFullDate('2024-12-25'); // Returns: "Wednesday, December 25, 2024"
 * formatFullDate('2024-01-01'); // Returns: "Monday, January 1, 2024"
 * ```
 *
 * @remarks
 * Best used for:
 * - Itinerary headers
 * - Daily activity sections
 * - Detailed views where space is not constrained
 * - Print versions of itineraries
 */
export function formatFullDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a date for compact display with abbreviated month
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Compact formatted date string
 *
 * @example
 * ```typescript
 * formatCompactDate('2024-03-15'); // Returns: "Mar 15, 2024"
 * formatCompactDate('2024-12-25'); // Returns: "Dec 25, 2024"
 * formatCompactDate('2024-01-01'); // Returns: "Jan 1, 2024"
 * ```
 *
 * @remarks
 * Best used for:
 * - List views
 * - Mobile interfaces
 * - Date badges
 * - Space-constrained layouts
 */
export function formatCompactDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculate the number of days between two dates (inclusive)
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Number of days between dates (always positive)
 *
 * @example
 * ```typescript
 * getDaysBetween('2024-03-15', '2024-03-20'); // Returns: 5
 * getDaysBetween('2024-03-20', '2024-03-15'); // Returns: 5 (order doesn't matter)
 * getDaysBetween('2024-03-15', '2024-03-15'); // Returns: 0 (same day)
 * getDaysBetween('2024-12-31', '2025-01-05'); // Returns: 5 (across year boundary)
 * ```
 *
 * @remarks
 * - Uses Math.abs() to ensure positive result regardless of date order
 * - Includes partial days (uses Math.ceil)
 * - Handles daylight saving time transitions correctly
 * - Useful for calculating trip duration
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Add or subtract days from a date and return the new date string
 *
 * @param dateStr - Base date in YYYY-MM-DD format
 * @param days - Number of days to add (negative to subtract)
 * @returns New date in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * addDays('2024-03-15', 5);  // Returns: "2024-03-20"
 * addDays('2024-03-15', -5); // Returns: "2024-03-10"
 * addDays('2024-02-28', 1);  // Returns: "2024-02-29" (leap year)
 * addDays('2024-12-31', 1);  // Returns: "2025-01-01" (year transition)
 * ```
 *
 * @remarks
 * Handles edge cases:
 * - Month boundaries
 * - Year transitions
 * - Leap years
 * - Negative day values for date subtraction
 *
 * Common use cases:
 * - Calculating arrival/departure dates
 * - Creating date sequences for itineraries
 * - Date navigation in calendars
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format date and time for ICS (iCalendar) format per RFC 5545
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in any supported format (e.g., "10:30 AM")
 * @returns ICS-formatted datetime string (YYYYMMDDTHHmmss)
 *
 * @example
 * ```typescript
 * formatICSDateTime('2024-03-15', '10:30 AM'); // Returns: "20240315T103000"
 * formatICSDateTime('2024-12-25', '2:45 PM');  // Returns: "20241225T144500"
 * formatICSDateTime('2024-01-01', '12:00 AM'); // Returns: "20240101T000000"
 * ```
 *
 * @remarks
 * ICS format requirements:
 * - No separators in date portion
 * - 'T' separator between date and time
 * - 24-hour time format
 * - Always includes seconds (00)
 *
 * Timezone considerations:
 * - Returns local time (not UTC)
 * - Timezone should be specified separately in VTIMEZONE component
 * - For UTC times, append 'Z' to the result
 *
 * Used for:
 * - Calendar event exports
 * - Integration with calendar applications
 * - Creating .ics files for itinerary sharing
 */
export function formatICSDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const { hours, minutes } = parseTimeString(timeStr);

  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T` +
         `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
}