const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test scenarios
const testScenarios = [
  {
    id: 1,
    name: 'Original Failing Case - Lisbon',
    prompt: 'plan a 3 day trip to Lisbon for tomorrow',
    expectedDestination: 'Lisbon',
    expectedDays: 3
  },
  {
    id: 2,
    name: 'London Starting Monday',
    prompt: 'London starting Monday',
    expectedDestination: 'London',
    expectedDays: null
  },
  {
    id: 3,
    name: 'Paris Beginning Next Week',
    prompt: 'Paris beginning next week',
    expectedDestination: 'Paris',
    expectedDays: null
  },
  {
    id: 4,
    name: 'Tokyo For 5 Days',
    prompt: 'Tokyo for 5 days',
    expectedDestination: 'Tokyo',
    expectedDays: 5
  },
  {
    id: 5,
    name: 'Multi-City Trip',
    prompt: 'I want to visit Paris and London next week',
    expectedDestinations: ['Paris', 'London'],
    expectedDays: 7
  },
  {
    id: 6,
    name: 'Weekend Barcelona',
    prompt: 'weekend trip to Barcelona',
    expectedDestination: 'Barcelona',
    expectedDays: 2
  },
  {
    id: 7,
    name: 'Week in Rome',
    prompt: 'week in Rome',
    expectedDestination: 'Rome',
    expectedDays: 7
  },
  {
    id: 8,
    name: 'Two Weeks Thailand',
    prompt: '2 weeks in Thailand',
    expectedDestination: 'Thailand',
    expectedDays: 14
  }
];

async function runTest(scenario, page) {
  const separator = '='.repeat(60);
  console.log('\n' + separator);
  console.log(`Test #${scenario.id}: ${scenario.name}`);
  console.log(`Prompt: "${scenario.prompt}"`);
  console.log(separator);

  const result = {
    scenario: scenario,
    status: 'PENDING',
    extractedDestination: null,
    consoleLogs: [],
    errors: [],
    screenshot: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Clear console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      // Print important logs
      if (text.includes('AI') || text.includes('GPT') || text.includes('extraction') || text.includes('destination')) {
        console.log(`  [Browser Log]: ${text}`);
      }
    });

    page.on('pageerror', error => {
      result.errors.push(error.message);
      console.log(`  [Page Error]: ${error.message}`);
    });

    // Navigate to the app
    console.log('  Navigating to http://localhost:9000...');
    await page.goto('http://localhost:9000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for the chat interface to load
    await page.waitForSelector('textarea', { timeout: 10000 });
    console.log('  Chat interface loaded');

    // Find and clear the input field
    const inputSelector = 'textarea';
    await page.click(inputSelector);
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) element.value = '';
    }, inputSelector);

    // Type the prompt
    console.log(`  Typing prompt: "${scenario.prompt}"`);
    await page.type(inputSelector, scenario.prompt, { delay: 50 });

    // Submit the form
    console.log('  Submitting...');
    await page.keyboard.press('Enter');

    // Wait for response (with longer timeout for AI processing)
    console.log('  Waiting for AI response...');
    await page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('[class*="message"]');
        return messages.length > 2; // Initial message + response
      },
      { timeout: 60000 }
    );
    
    // Additional wait for full render
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract console logs for AI usage
    const aiLogs = logs.filter(log => 
      log.text.includes('AI') || 
      log.text.includes('GPT') || 
      log.text.includes('extraction') ||
      log.text.includes('destination')
    );
    
    result.consoleLogs = aiLogs;

    // Check if AI was used (not pattern-based)
    const usedAI = logs.some(log => log.text.includes('Using GPT-4o-mini for intent extraction'));
    const usedPatterns = logs.some(log => log.text.includes('Complete extraction via patterns'));
    
    if (usedAI && !usedPatterns) {
      console.log('  AI extraction confirmed');
      result.aiUsed = true;
    } else if (usedPatterns) {
      console.log('  WARNING: Pattern extraction used (should be AI)');
      result.status = 'FAIL';
      result.error = 'Used pattern extraction instead of AI';
      result.aiUsed = false;
    }

    // Take screenshot
    const screenshotPath = path.join(__dirname, `test-screenshots/test-${scenario.id}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    result.screenshot = screenshotPath;
    console.log(`  Screenshot saved: ${screenshotPath}`);

    // Extract the destination from the page
    const extractedData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        pageTitle: document.title,
        bodyText: bodyText
      };
    });

    // Check if destination is correct
    if (scenario.expectedDestination) {
      if (extractedData.bodyText.includes(scenario.expectedDestination)) {
        console.log(`  Destination "${scenario.expectedDestination}" found`);
        
        // Check for the bug - temporal words included
        if (scenario.id === 1 && extractedData.bodyText.includes('Lisbon For')) {
          console.log('  FAIL: Found "Lisbon For" (temporal word included)');
          result.status = 'FAIL';
          result.error = 'Temporal word "for" included in destination';
        } else {
          result.status = 'PASS';
        }
      } else {
        console.log(`  Destination "${scenario.expectedDestination}" not found`);
        result.status = 'FAIL';
      }
    }

    result.extractedDestination = extractedData.bodyText.substring(0, 500);

  } catch (error) {
    console.log(`  Test failed with error: ${error.message}`);
    result.status = 'ERROR';
    result.error = error.message;
  }

  return result;
}

async function runAllTests() {
  // Create screenshots directory
  const screenshotDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  console.log('Starting Nomad Navigator AI Parser Tests');
  console.log('=========================================\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const results = [];

  try {
    // Run first critical test
    const page = await browser.newPage();
    const firstResult = await runTest(testScenarios[0], page);
    results.push(firstResult);
    await page.close();
    
    // If first test passes, run others
    if (firstResult.status === 'PASS' && firstResult.aiUsed) {
      console.log('\nFirst test passed! Running remaining tests...\n');
      
      for (let i = 1; i < testScenarios.length; i++) {
        const newPage = await browser.newPage();
        const result = await runTest(testScenarios[i], newPage);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await newPage.close();
      }
    } else {
      console.log('\nFirst test failed. Skipping remaining tests.');
    }
  } finally {
    await browser.close();
  }

  // Generate summary report
  const separator = '='.repeat(60);
  console.log('\n' + separator);
  console.log('TEST SUMMARY');
  console.log(separator);
  
  let passed = 0;
  let failed = 0;
  let errors = 0;

  results.forEach(result => {
    const statusIcon = result.status === 'PASS' ? 'PASS' : result.status === 'FAIL' ? 'FAIL' : 'ERROR';
    console.log(`${statusIcon} Test #${result.scenario.id}: ${result.scenario.name} - ${result.status}`);
    
    if (result.status === 'PASS') passed++;
    else if (result.status === 'FAIL') failed++;
    else errors++;
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${errors} errors`);

  // Save detailed report
  const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Run the tests
runAllTests().catch(console.error);
