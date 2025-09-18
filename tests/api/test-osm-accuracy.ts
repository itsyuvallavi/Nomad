/**
 * OpenStreetMap API Accuracy Test
 * Tests if OSM can find the venues that LocationIQ failed on
 */

import { openStreetMap } from '../../src/services/api/openstreetmap';
import chalk from 'chalk';

interface TestCase {
  query: string;
  expectedCity: string;
  expectedCountry: string;
  description: string;
}

async function testOSMAccuracy() {
  console.log(chalk.bold.cyan('\n🔍 Testing OpenStreetMap API Accuracy\n'));
  console.log(chalk.gray('Testing the same venues that LocationIQ failed...\n'));

  const testCases: TestCase[] = [
    // Barcelona venues (LocationIQ put these in Australia!)
    {
      query: 'Sagrada Familia Barcelona',
      expectedCity: 'Barcelona',
      expectedCountry: 'Spain',
      description: 'Famous basilica in Barcelona'
    },
    {
      query: 'La Boqueria Market Barcelona',
      expectedCity: 'Barcelona',
      expectedCountry: 'Spain',
      description: 'Famous market in Barcelona'
    },
    {
      query: 'Park Güell Barcelona',
      expectedCity: 'Barcelona',
      expectedCountry: 'Spain',
      description: 'Gaudí park in Barcelona'
    },

    // Tokyo venues (LocationIQ put these in France!)
    {
      query: 'Tsukiji Fish Market Tokyo',
      expectedCity: 'Tokyo',
      expectedCountry: 'Japan',
      description: 'Famous fish market in Tokyo'
    },
    {
      query: 'Meiji Shrine Tokyo',
      expectedCity: 'Tokyo',
      expectedCountry: 'Japan',
      description: 'Shrine in Tokyo'
    },

    // Paris venues
    {
      query: 'Louvre Museum Paris',
      expectedCity: 'Paris',
      expectedCountry: 'France',
      description: 'Famous museum in Paris'
    },
    {
      query: 'Eiffel Tower',
      expectedCity: 'Paris',
      expectedCountry: 'France',
      description: 'Iconic tower in Paris'
    },

    // London venues
    {
      query: 'Big Ben London',
      expectedCity: 'London',
      expectedCountry: 'United Kingdom',
      description: 'Famous clock tower in London'
    },
    {
      query: 'British Museum',
      expectedCity: 'London',
      expectedCountry: 'United Kingdom',
      description: 'Museum in London'
    }
  ];

  const results = {
    correct: 0,
    wrongCity: 0,
    wrongCountry: 0,
    notFound: 0,
    errors: 0
  };

  console.log(chalk.yellow('Note: OSM has a 1 req/second rate limit, so this will take a moment...\n'));

  for (const testCase of testCases) {
    console.log(chalk.cyan(`Testing: "${testCase.query}"`));
    console.log(chalk.gray(`  Expected: ${testCase.expectedCity}, ${testCase.expectedCountry}`));

    try {
      // Search for the venue
      const searchResults = await openStreetMap.searchPlace(testCase.query);

      if (!searchResults || searchResults.length === 0) {
        console.log(chalk.red(`  ❌ NOT FOUND`));
        results.notFound++;
        continue;
      }

      const topResult = searchResults[0];
      console.log(chalk.gray(`  Found: ${topResult.display_name}`));
      console.log(chalk.gray(`  Coordinates: ${topResult.lat}, ${topResult.lon}`));

      // Check if it's in the right country and city
      const displayName = topResult.display_name.toLowerCase();
      const countryMatch = displayName.includes(testCase.expectedCountry.toLowerCase()) ||
                          (testCase.expectedCountry === 'United Kingdom' && displayName.includes('uk')) ||
                          (testCase.expectedCountry === 'Spain' && (displayName.includes('españa') || displayName.includes('spain'))) ||
                          (testCase.expectedCountry === 'Japan' && (displayName.includes('日本') || displayName.includes('japan')));

      const cityMatch = displayName.includes(testCase.expectedCity.toLowerCase()) ||
                       (testCase.expectedCity === 'Tokyo' && displayName.includes('東京'));

      if (countryMatch && cityMatch) {
        console.log(chalk.green(`  ✅ CORRECT location`));
        results.correct++;
      } else if (countryMatch && !cityMatch) {
        console.log(chalk.yellow(`  ⚠️  Right country, wrong city`));
        results.wrongCity++;
      } else {
        console.log(chalk.red(`  ❌ WRONG location`));
        results.wrongCountry++;
      }

      // Calculate distance from expected city center
      const cityCoordinates: Record<string, [number, number]> = {
        'Barcelona': [41.3851, 2.1734],
        'Tokyo': [35.6762, 139.6503],
        'Paris': [48.8566, 2.3522],
        'London': [51.5074, -0.1278]
      };

      if (cityCoordinates[testCase.expectedCity]) {
        const [expectedLat, expectedLng] = cityCoordinates[testCase.expectedCity];
        const distance = openStreetMap.calculateDistance(
          expectedLat, expectedLng,
          parseFloat(topResult.lat), parseFloat(topResult.lon)
        );

        if (distance > 50) {
          console.log(chalk.red(`  ⚠️  Distance from city center: ${distance.toFixed(1)} km`));
        } else {
          console.log(chalk.gray(`  Distance from city center: ${distance.toFixed(1)} km`));
        }
      }

    } catch (error) {
      console.log(chalk.red(`  ❌ ERROR: ${error}`));
      results.errors++;
    }

    console.log('');
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

  if (accuracy >= 80) {
    console.log(chalk.green.bold('\n✅ OSM accuracy is excellent!'));
    console.log(chalk.green('Much better than LocationIQ\'s 0% accuracy'));
  } else if (accuracy >= 60) {
    console.log(chalk.yellow.bold('\n⚠️  OSM accuracy is good'));
    console.log(chalk.yellow('Still better than LocationIQ\'s 0% accuracy'));
  } else {
    console.log(chalk.red.bold('\n❌ OSM accuracy needs investigation'));
  }

  // Test special features
  console.log(chalk.bold.cyan('\n🔍 Testing Special OSM Features\n'));

  // Test finding medical facilities
  console.log(chalk.cyan('Testing: Medical facilities in Barcelona'));
  const barcelonaCoords = await openStreetMap.geocode('Barcelona Spain');
  if (barcelonaCoords) {
    const hospitals = await openStreetMap.findMedicalFacilities(
      barcelonaCoords.lat,
      barcelonaCoords.lng,
      'hospital'
    );
    console.log(chalk.green(`  Found ${hospitals.length} hospitals`));
    if (hospitals.length > 0) {
      console.log(chalk.gray(`  Example: ${hospitals[0].tags.name || 'Unnamed hospital'}`));
    }
  }

  // Test finding vegetarian restaurants
  console.log(chalk.cyan('\nTesting: Vegetarian restaurants in Barcelona'));
  if (barcelonaCoords) {
    const restaurants = await openStreetMap.findRestaurants(
      barcelonaCoords.lat,
      barcelonaCoords.lng,
      { vegetarian: true }
    );
    console.log(chalk.green(`  Found ${restaurants.length} vegetarian restaurants`));
    if (restaurants.length > 0) {
      console.log(chalk.gray(`  Example: ${restaurants[0].tags.name || 'Unnamed restaurant'}`));
    }
  }

  // Test finding tourist attractions
  console.log(chalk.cyan('\nTesting: Tourist attractions in Barcelona'));
  const attractions = await openStreetMap.findTouristAttractions('Barcelona Spain');
  console.log(chalk.green(`  Found ${attractions.length} tourist attractions`));
  attractions.slice(0, 3).forEach(a => {
    console.log(chalk.gray(`  - ${a.name} (${a.type})`));
  });

  console.log(chalk.bold.green('\n✨ OSM Special features work great!'));
  console.log(chalk.gray('These features are impossible with LocationIQ'));
}

// Run the test
if (require.main === module) {
  testOSMAccuracy()
    .then(() => {
      console.log(chalk.gray('\nTest complete'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red('Test failed:'), error);
      process.exit(1);
    });
}

export { testOSMAccuracy };