/**
 * Comprehensive Itinerary Generation Diagnostics
 * Tests both UI and ML components to identify issues
 */

import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import { searchFlights, searchHotels, getCityCode } from '@/lib/api/amadeus';
import { searchPlaceMinimal } from '@/lib/api/google-places-optimized';
import { logger } from '@/lib/logger';

interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  error?: any;
  duration?: number;
  details?: any;
}

class ItineraryDiagnostics {
  private results: TestResult[] = [];
  
  /**
   * Run all diagnostic tests
   */
  async runFullDiagnostics() {
    console.log('🔍 Starting Comprehensive Itinerary Diagnostics...\n');
    
    // Test API connectivity
    await this.testAmadeusAPI();
    await this.testGooglePlacesAPI();
    
    // Test ML generation
    await this.testSimpleItinerary();
    await this.testComplexItinerary();
    
    // Test error handling
    await this.testErrorRecovery();
    
    // Print results
    this.printResults();
    
    return this.results;
  }
  
  /**
   * Test Amadeus API connectivity and functionality
   */
  async testAmadeusAPI() {
    const startTime = Date.now();
    
    try {
      // Test city code lookup
      const cityCode = await getCityCode('London');
      if (cityCode) {
        this.addResult({
          testName: 'Amadeus City Code Lookup',
          status: 'pass',
          message: `Successfully retrieved city code: ${cityCode}`,
          duration: Date.now() - startTime,
        });
      } else {
        this.addResult({
          testName: 'Amadeus City Code Lookup',
          status: 'warning',
          message: 'City code lookup returned null',
          duration: Date.now() - startTime,
        });
      }
      
      // Test flight search
      const flights = await searchFlights({
        origin: 'LHR',
        destination: 'CDG',
        departureDate: '2024-12-15',
        maxResults: 2,
      });
      
      if (flights && flights.length > 0) {
        this.addResult({
          testName: 'Amadeus Flight Search',
          status: 'pass',
          message: `Found ${flights.length} flights`,
          details: flights[0],
          duration: Date.now() - startTime,
        });
      } else {
        this.addResult({
          testName: 'Amadeus Flight Search',
          status: 'warning',
          message: 'No flights found',
          duration: Date.now() - startTime,
        });
      }
      
      // Test hotel search
      const hotels = await searchHotels({
        cityCode: 'PAR',
        checkInDate: '2024-12-15',
        checkOutDate: '2024-12-18',
        maxResults: 3,
      });
      
      if (hotels && hotels.length > 0) {
        this.addResult({
          testName: 'Amadeus Hotel Search',
          status: 'pass',
          message: `Found ${hotels.length} hotels`,
          details: hotels[0],
          duration: Date.now() - startTime,
        });
      } else {
        this.addResult({
          testName: 'Amadeus Hotel Search',
          status: 'warning',
          message: 'No hotels found',
          duration: Date.now() - startTime,
        });
      }
      
    } catch (error) {
      this.addResult({
        testName: 'Amadeus API',
        status: 'fail',
        message: 'Amadeus API test failed',
        error: error,
        duration: Date.now() - startTime,
      });
    }
  }
  
  /**
   * Test Google Places API with minimal calls
   */
  async testGooglePlacesAPI() {
    const startTime = Date.now();
    
    try {
      // Test minimal place search
      const place = await searchPlaceMinimal({
        query: 'Eiffel Tower Paris',
      });
      
      if (place) {
        this.addResult({
          testName: 'Google Places Search (Minimal)',
          status: 'pass',
          message: `Found place: ${place.name}`,
          details: {
            name: place.name,
            address: place.formatted_address,
            rating: place.rating,
          },
          duration: Date.now() - startTime,
        });
      } else {
        this.addResult({
          testName: 'Google Places Search (Minimal)',
          status: 'warning',
          message: 'Place search returned null',
          duration: Date.now() - startTime,
        });
      }
    } catch (error) {
      this.addResult({
        testName: 'Google Places API',
        status: 'fail',
        message: 'Google Places API test failed',
        error: error,
        duration: Date.now() - startTime,
      });
    }
  }
  
  /**
   * Test simple itinerary generation
   */
  async testSimpleItinerary() {
    const startTime = Date.now();
    
    try {
      const result = await generatePersonalizedItinerary({
        prompt: '3 days in Paris from London',
        attachedFile: undefined,
        conversationHistory: '',
      });
      
      if (result && result.itinerary && result.itinerary.length > 0) {
        this.addResult({
          testName: 'Simple Itinerary Generation',
          status: 'pass',
          message: `Generated ${result.itinerary.length} day itinerary`,
          details: {
            title: result.title,
            days: result.itinerary.length,
            firstDay: result.itinerary[0].title,
            activities: result.itinerary[0].activities.length,
          },
          duration: Date.now() - startTime,
        });
      } else {
        this.addResult({
          testName: 'Simple Itinerary Generation',
          status: 'fail',
          message: 'Failed to generate itinerary',
          error: result,
          duration: Date.now() - startTime,
        });
      }
    } catch (error) {
      this.addResult({
        testName: 'Simple Itinerary Generation',
        status: 'fail',
        message: 'Itinerary generation threw error',
        error: error,
        duration: Date.now() - startTime,
      });
    }
  }
  
  /**
   * Test complex itinerary generation
   */
  async testComplexItinerary() {
    const startTime = Date.now();
    
    try {
      const result = await generatePersonalizedItinerary({
        prompt: 'I want to travel from New York to Tokyo, Kyoto, and Osaka for 10 days in December. I like cultural experiences and good food. Budget is moderate.',
        attachedFile: undefined,
        conversationHistory: '',
      });
      
      if (result && result.itinerary && result.itinerary.length > 0) {
        this.addResult({
          testName: 'Complex Itinerary Generation',
          status: 'pass',
          message: `Generated ${result.itinerary.length} day complex itinerary`,
          details: {
            title: result.title,
            days: result.itinerary.length,
            totalActivities: result.itinerary.reduce((sum, day) => sum + day.activities.length, 0),
          },
          duration: Date.now() - startTime,
        });
      } else {
        this.addResult({
          testName: 'Complex Itinerary Generation',
          status: 'fail',
          message: 'Failed to generate complex itinerary',
          error: result,
          duration: Date.now() - startTime,
        });
      }
    } catch (error) {
      this.addResult({
        testName: 'Complex Itinerary Generation',
        status: 'fail',
        message: 'Complex itinerary generation threw error',
        error: error,
        duration: Date.now() - startTime,
      });
    }
  }
  
  /**
   * Test error recovery mechanisms
   */
  async testErrorRecovery() {
    const startTime = Date.now();
    
    try {
      // Test with incomplete prompt
      const result = await generatePersonalizedItinerary({
        prompt: 'I want to travel',
        attachedFile: undefined,
        conversationHistory: '',
      });
      
      // This should return a clarifying question
      if (result && (result as any).needsMoreInfo) {
        this.addResult({
          testName: 'Error Recovery - Incomplete Input',
          status: 'pass',
          message: 'Correctly identified incomplete input',
          details: (result as any).question,
          duration: Date.now() - startTime,
        });
      } else {
        this.addResult({
          testName: 'Error Recovery - Incomplete Input',
          status: 'warning',
          message: 'Did not handle incomplete input as expected',
          details: result,
          duration: Date.now() - startTime,
        });
      }
    } catch (error) {
      this.addResult({
        testName: 'Error Recovery',
        status: 'fail',
        message: 'Error recovery test failed',
        error: error,
        duration: Date.now() - startTime,
      });
    }
  }
  
  /**
   * Add a test result
   */
  private addResult(result: TestResult) {
    this.results.push(result);
    
    // Log immediately
    const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${emoji} ${result.testName}: ${result.message}`);
    
    if (result.error) {
      console.error('   Error:', result.error);
    }
    
    if (result.details) {
      console.log('   Details:', result.details);
    }
    
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`);
    }
    
    console.log('');
  }
  
  /**
   * Print summary of results
   */
  private printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📝 Total Tests: ${this.results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.message}`);
          if (r.error) {
            console.log(`    Error: ${r.error.message || r.error}`);
          }
        });
    }
    
    if (warnings > 0) {
      console.log('\n⚠️  Warning Tests:');
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.message}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Save results to file
    this.saveResults();
  }
  
  /**
   * Save results to a JSON file for analysis
   */
  private saveResults() {
    const timestamp = new Date().toISOString();
    const resultData = {
      timestamp,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'pass').length,
        failed: this.results.filter(r => r.status === 'fail').length,
        warnings: this.results.filter(r => r.status === 'warning').length,
      },
      results: this.results,
    };
    
    // Log to logger for persistence
    logger.info('DIAGNOSTICS', 'Test results', resultData);
    
    return resultData;
  }
}

// Export for use in other files
export const diagnostics = new ItineraryDiagnostics();

// Run diagnostics if this file is executed directly
if (require.main === module) {
  diagnostics.runFullDiagnostics().then(() => {
    console.log('Diagnostics complete!');
  }).catch(error => {
    console.error('Diagnostics failed:', error);
  });
}