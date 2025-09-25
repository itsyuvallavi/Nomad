/**
 * Date Utilities
 * Shared date manipulation and calculation functions
 */

/**
 * Calculate date by adding days to a start date
 */
export function calculateDate(startDate: string, daysToAdd: number): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate end date from start date and duration
 */
export function calculateEndDate(startDate: string, duration: number): string {
  return calculateDate(startDate, duration - 1);
}

/**
 * Get next date by adding days
 */
export function getNextDate(currentDate: string, daysToAdd: number): string {
  return calculateDate(currentDate, daysToAdd);
}

/**
 * Parse a relative date expression (e.g., "next Monday", "tomorrow")
 */
export function parseRelativeDate(expression: string): string | null {
  const today = new Date();
  const expr = expression.toLowerCase();

  // Tomorrow
  if (expr.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Next week
  if (expr.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Next Monday, Tuesday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (expr.includes(dayNames[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysUntilTarget = targetDay - currentDay;

      // If the day already passed this week, get next week's
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
      }

      // If "next" is specified, add another week
      if (expr.includes('next')) {
        daysUntilTarget += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysUntilTarget);
      return targetDate.toISOString().split('T')[0];
    }
  }

  // In X days
  const inDaysMatch = expr.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Validate a date string format (YYYY-MM-DD)
 */
export function isValidDateFormat(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Format date for display
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}