/**
 * LocationIQ API Accuracy Test
 * Tests if LocationIQ can find correct locations for common tourist venues
 */

import { locationIQ } from '../../src/services/api/locationiq';
import chalk from 'chalk';

interface TestCase {
  query: string;
  expectedCity: string;
  expectedCountry: string;
  description: string;
}

async function testLocationIQ() {
  console.log(chalk.bold.cyan('\n🔍 Testing LocationIQ API Accuracy\n'));

  // Check if API is configured
  if (!process.env.LOCATIONIQ_API_KEY && !process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY) {
    console.log(chalk.red('❌ LocationIQ API key not configured'));
    console.log(chalk.yellow('Set LOCATIONIQ_API_KEY or NEXT_PUBLIC_LOCATIONIQ_API_KEY in .env'));
    return;
  }

  const testCases: TestCase[] = [
    // Barcelona venues (from failed test)
    {
      query: 'Sagrada Familia Barcelona',
      expectedCity: 'Barcelona',
      expectedCountry: 'Spain',
      description: 'Famous basilica in Barcelona'
    },
    {
      query: 'Sagrada Familia Barcelona Spain',
      expectedCity: 'Barcelona',
      expectedCountry: 'Spain',
      description: 'Same with country added'
    },
    {
      query: 'La Boqueria Market Barcelona',
      expectedCity: 'Barcelona',
      expectedCountry: 'Spain',
      description: 'Famous market in Barcelona'
    },
    {
      query: 'Barceloneta Beach Barcelona Spain',
      expectedCity: 'Barcelona',
      expectedCountry: 'Spain',
      description: 'Beach in Barcelona with country'
    },

    // Tokyo venues (from failed test)
    {
      query: 'Tsukiji Fish Market Tokyo',
      expectedCity: 'Tokyo',
      expectedCountry: 'Japan',
      description: 'Famous fish market in Tokyo'
    },
    {
      query: 'Meiji Shrine Tokyo Japan',
      expectedCity: 'Tokyo',
      expectedCountry: 'Japan',
      description: 'Shrine in Tokyo with country'
    },

    // Paris venues
    {
      query: 'Louvre Museum Paris',
      expectedCity: 'Paris',
      expectedCountry: 'France',
      description: 'Famous museum in Paris'
    },
    {
      query: 'Eiffel Tower Paris France',
      expectedCity: 'Paris',
      expectedCountry: 'France',
      description: 'Eiffel Tower with country'
    },

    // London venues
    {
      query: 'Big Ben London',
      expectedCity: 'London',
      expectedCountry: 'United Kingdom',
      description: 'Famous clock tower in London'
    },
    {
      query: 'British Museum London UK',
      expectedCity: 'London',
      expectedCountry: 'United Kingdom',
      description: 'Museum with country'
    }
  ];

  const results = {
    correct: 0,
    wrongCity: 0,
    wrongCountry: 0,
    notFound: 0,
    errors: 0
  };

  console.log(chalk.gray('Testing venues from different cities...\n'));

  for (const testCase of testCases) {
    console.log(chalk.cyan(`Testing: "${testCase.query}"`));
    console.log(chalk.gray(`  Expected: ${testCase.expectedCity}, ${testCase.expectedCountry}`));

    try {
      // Try to search for the venue
      const searchResults = await locationIQ.searchPlaces(testCase.query);

      if (!searchResults || searchResults.length === 0) {
        console.log(chalk.red(`  ❌ NOT FOUND`));
        results.notFound++;
        continue;
      }

      const topResult = searchResults[0];
      const resultParts = topResult.display_name.split(', ');

      // Try to extract city and country from display_name
      const resultCountry = resultParts[resultParts.length - 1];
      let resultCity = '';

      // LocationIQ often includes city name in the display_name
      for (const part of resultParts) {
        if (part.toLowerCase().includes(testCase.expectedCity.toLowerCase())) {
          resultCity = part;
          break;
        }
      }

      console.log(chalk.gray(`  Found: ${topResult.display_name}`));
      console.log(chalk.gray(`  Coordinates: ${topResult.lat}, ${topResult.lon}`));

      // Check if it's in the right country
      const countryMatch = resultCountry.toLowerCase().includes(testCase.expectedCountry.toLowerCase()) ||
                          testCase.expectedCountry.toLowerCase().includes(resultCountry.toLowerCase());

      // Check if it's in the right city
      const cityMatch = topResult.display_name.toLowerCase().includes(testCase.expectedCity.toLowerCase());

      if (countryMatch && cityMatch) {
        console.log(chalk.green(`  ✅ CORRECT location`));
        results.correct++;
      } else if (countryMatch && !cityMatch) {
        console.log(chalk.yellow(`  ⚠️  Right country, wrong city`));
        results.wrongCity++;
      } else {
        console.log(chalk.red(`  ❌ WRONG location (${resultCountry})`));
        results.wrongCountry++;
      }

      // Calculate distance from expected city center (rough estimate)
      const cityCoordinates: Record<string, [number, number]> = {
        'Barcelona': [41.3851, 2.1734],
        'Tokyo': [35.6762, 139.6503],
        'Paris': [48.8566, 2.3522],
        'London': [51.5074, -0.1278]
      };

      if (cityCoordinates[testCase.expectedCity]) {
        const [expectedLat, expectedLng] = cityCoordinates[testCase.expectedCity];
        const distance = calculateDistance(
          expectedLat, expectedLng,
          parseFloat(topResult.lat), parseFloat(topResult.lon)
        );

        if (distance > 50) {
          console.log(chalk.red(`  ⚠️  Distance from city center: ${distance.toFixed(1)} km`));
        }
      }

    } catch (error) {
      console.log(chalk.red(`  ❌ ERROR: ${error}`));
      results.errors++;
    }

    console.log('');

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log(chalk.bold.cyan('\n📊 Summary\n'));
  console.log(chalk.white(`Total tests: ${testCases.length}`));
  console.log(chalk.green(`✅ Correct: ${results.correct}`));
  console.log(chalk.yellow(`⚠️  Wrong city: ${results.wrongCity}`));
  console.log(chalk.red(`❌ Wrong country: ${results.wrongCountry}`));
  console.log(chalk.red(`❌ Not found: ${results.notFound}`));
  console.log(chalk.red(`❌ Errors: ${results.errors}`));

  const accuracy = (results.correct / testCases.length) * 100;
  console.log(chalk.bold(`\nAccuracy: ${accuracy.toFixed(1)}%`));

  if (accuracy < 50) {
    console.log(chalk.red.bold('\n⚠️  LocationIQ accuracy is below 50%!'));
    console.log(chalk.yellow('Consider using OpenAI for venue generation instead of LocationIQ'));
  } else if (accuracy < 80) {
    console.log(chalk.yellow.bold('\n⚠️  LocationIQ accuracy is moderate'));
    console.log(chalk.yellow('Consider adding fallback logic or using OpenAI for some venues'));
  } else {
    console.log(chalk.green.bold('\n✅ LocationIQ accuracy is acceptable'));
  }

  // Test specific problematic queries from the actual test results
  console.log(chalk.bold.cyan('\n🔍 Testing Actual Failed Queries\n'));

  const problematicQueries = [
    { query: 'Sagrada Familia', expected: 'Barcelona, Spain' },
    { query: 'Saint Mary Of The Angels Basilica', expected: 'Various locations' },
    { query: 'La Boqueria Market', expected: 'Barcelona, Spain' },
    { query: 'Food', expected: 'Too generic' },
    { query: 'Barceloneta Beach', expected: 'Barcelona, Spain' }
  ];

  for (const pq of problematicQueries) {
    console.log(chalk.cyan(`Query: "${pq.query}"`));
    try {
      const results = await locationIQ.searchPlaces(pq.query, { limit: 3 });
      if (results && results.length > 0) {
        results.slice(0, 3).forEach((r, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${r.display_name}`));
        });
      } else {
        console.log(chalk.red('  No results found'));
      }
    } catch (error) {
      console.log(chalk.red(`  Error: ${error}`));
    }
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Run the test
if (require.main === module) {
  testLocationIQ()
    .then(() => {
      console.log(chalk.gray('\nTest complete'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red('Test failed:'), error);
      process.exit(1);
    });
}

export { testLocationIQ };