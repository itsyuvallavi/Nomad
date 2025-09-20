/**
 * Test date extraction patterns directly
 */

// Test the date extraction logic
const testCases = [
  "plan a 5 day trip to paris starting october 15",
  "trip to Rome from December 20 to December 27",
  "I want to visit Barcelona for a week in March",
  "weekend trip to tokyo",
  "planning a trip to Dubai for 4 days with my wife and 2 kids",
  "quick trip to Amsterdam next month",
  "I want to visit London and Paris for 7 days total",
  "5d Paris trip on 15/3",
  "viaje a México for cinco días"
];

class DateExtractorTest {
  private today: Date;
  private currentYear: number;
  private nextYear: number;

  constructor() {
    this.today = new Date();
    this.currentYear = this.today.getFullYear();
    this.nextYear = this.currentYear + 1;
  }

  extractDateRange(text: string): { startDate?: string; endDate?: string; duration?: number } {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Pattern: Month Day to Month Day
    const rangePattern = new RegExp(
      `(${months.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:to|until|-|through)\\s+(${months.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?`,
      'i'
    );

    console.log('Testing range pattern:', rangePattern);
    const match = text.match(rangePattern);
    console.log('Range match:', match);

    if (match) {
      const startMonth = months.indexOf(match[1].toLowerCase()) + 1;
      const startDay = parseInt(match[2]);
      const endMonth = months.indexOf(match[3].toLowerCase()) + 1;
      const endDay = parseInt(match[4]);

      const year = this.currentYear;

      const startDate = `${year}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
      const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      // Calculate duration
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return { startDate, endDate, duration };
    }

    return {};
  }

  extractStartDate(text: string): string | null {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Pattern: "starting October 15" or "on October 15"
    const startPattern = new RegExp(
      `(?:starting|from|on|beginning)\\s+(${months.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?`,
      'i'
    );

    console.log('Testing start pattern:', startPattern);
    const match = text.match(startPattern);
    console.log('Start match:', match);

    if (match) {
      const month = months.indexOf(match[1].toLowerCase()) + 1;
      const day = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : this.currentYear;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return null;
  }

  extractMonthDate(text: string): string | null {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Pattern: "in March" or "during April"
    const monthPattern = new RegExp(
      `(?:in|during|for)\\s+(${months.join('|')})(?:\\s+(\\d{4}))?`,
      'i'
    );

    console.log('Testing month pattern:', monthPattern);
    const match = text.match(monthPattern);
    console.log('Month match:', match);

    if (match) {
      const month = months.indexOf(match[1].toLowerCase()) + 1;
      const year = match[2] ? parseInt(match[2]) : this.currentYear;
      return `${year}-${String(month).padStart(2, '0')}-01`;
    }

    return null;
  }

  test(text: string) {
    console.log(`\n========================================`);
    console.log(`Testing: "${text}"`);
    console.log(`========================================`);

    // Test date range
    const rangeResult = this.extractDateRange(text);
    if (rangeResult.startDate) {
      console.log('✅ Date range found:', rangeResult);
    }

    // Test start date
    const startDate = this.extractStartDate(text);
    if (startDate) {
      console.log('✅ Start date found:', startDate);
    }

    // Test month date
    const monthDate = this.extractMonthDate(text);
    if (monthDate) {
      console.log('✅ Month date found:', monthDate);
    }

    if (!rangeResult.startDate && !startDate && !monthDate) {
      console.log('❌ No dates found');
    }
  }
}

// Run tests
const tester = new DateExtractorTest();
testCases.forEach(testCase => tester.test(testCase));