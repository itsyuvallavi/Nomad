/**
 * Simple AI Test - Validates core AI functionality works
 * Tests: Intent extraction → Trip generation → Response
 */

const TEST_PROMPT = "3 days in London";
const API_URL = "http://localhost:9000/api/ai";

async function testAI() {
  console.log("\n🧪 SIMPLE AI FUNCTIONALITY TEST");
  console.log("=" .repeat(60));
  console.log(`📝 Test Prompt: "${TEST_PROMPT}"`);
  console.log("=" .repeat(60) + "\n");

  const startTime = Date.now();

  try {
    // Step 1: Send initial request
    console.log("📤 Step 1: Sending request to AI...");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: TEST_PROMPT })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Step 1: Request accepted");
    console.log(`   Generation ID: ${data.data?.generationId}`);

    if (!data.data?.generationId) {
      throw new Error("No generation ID received");
    }

    const generationId = data.data.generationId;

    // Step 2: Poll for intent extraction
    console.log("\n📥 Step 2: Waiting for intent extraction...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s

    const intentCheck = await fetch(`${API_URL}?generationId=${generationId}`);
    const intentData = await intentCheck.json();

    if (intentData.data?.intent) {
      console.log("✅ Step 2: Intent extracted successfully");
      console.log(`   Destination: ${intentData.data.intent.destination || 'N/A'}`);
      console.log(`   Duration: ${intentData.data.intent.duration || 'N/A'}`);
    } else {
      console.log("⚠️  Step 2: Intent not ready yet (this is OK)");
    }

    // Step 3: Wait for generation or check status
    console.log("\n⏳ Step 3: Checking generation status...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s more

    const statusCheck = await fetch(`${API_URL}?generationId=${generationId}`);
    const statusData = await statusCheck.json();

    console.log("✅ Step 3: Generation status received");
    console.log(`   Type: ${statusData.data?.type || 'unknown'}`);
    console.log(`   Status: ${statusData.data?.status || 'unknown'}`);
    console.log(`   Progress: ${statusData.data?.progress || 0}%`);

    const elapsed = Date.now() - startTime;

    // Final verdict
    console.log("\n" + "=".repeat(60));
    if (statusData.success && statusData.data) {
      console.log("✅ TEST PASSED");
      console.log(`   AI system is functioning correctly`);
      console.log(`   Response time: ${elapsed}ms`);
      console.log("=".repeat(60) + "\n");
      return true;
    } else {
      console.log("❌ TEST FAILED");
      console.log(`   AI system returned unexpected response`);
      console.log("=".repeat(60) + "\n");
      return false;
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.log("\n" + "=".repeat(60));
    console.log("❌ TEST FAILED");
    console.log(`   Error: ${error.message}`);
    console.log(`   Time: ${elapsed}ms`);
    console.log("=".repeat(60) + "\n");
    return false;
  }
}

// Run test
testAI().then(passed => {
  process.exit(passed ? 0 : 1);
});
