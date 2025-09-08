
# File Explanation: `.test-files/test-api.js`

## Summary

This script is an end-to-end API test that simulates a user making a request to the running application. It sends a complex, multi-destination prompt via a `fetch` request to the local server (expected to be running on `http://localhost:9002/`).

Its primary purpose is to verify that the entire application stack—from the Next.js server receiving the request to the AI flow processing it and returning the final JSON—is working correctly.

---

## Detailed Breakdown

### Test Setup

```javascript
const prompt = `I want to go from New Zealand to Japan, China for a week, South Korea for a week, Vietnam for a week, and spend 3 days in Denmark Copenhagen. Then fly back to LA.`;
```
- **`prompt`**: Defines the complex, multi-destination user request that will be sent to the server. This specific prompt is designed to test the chunked generation logic.

### API Call

```javascript
fetch('http://localhost:9002/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt })
})
```
- **`fetch`**: This is the core of the test. It makes a `POST` request to the root of the local application server.
- **`body`**: It sends the `prompt` in the JSON body, exactly like the frontend application would.

### Response Handling and Validation

```javascript
.then(res => res.json())
.then(data => {
  console.log('📊 Title:', data.title);
  // ... more validation ...
});
```
- The script waits for the JSON response from the server and then performs a series of checks on the received itinerary data.

#### Key Validations:

1.  **Log Basic Info**: It prints the generated `title`, `destination` string, and the total number of days in the itinerary (`data.itinerary.length`).
2.  **Check Destination Metadata**:
    ```javascript
    const destinations = new Set();
    data.itinerary.forEach(day => {
      if (day._destination) {
        destinations.add(day._destination);
      }
    });
    ```
    - This is a critical check. It iterates through each day of the returned itinerary and looks for the `_destination` metadata field that the chunked generator (`openai-chunked.ts`) adds.
    - It uses a `Set` to compile a list of all unique destinations that were actually generated.
3.  **Verify Day Distribution**: It groups the days by their `_destination` metadata to show which days were generated for which country, making it easy to see if the durations are correct.
4.  **Check for Missing Destinations**:
    ```javascript
    const expected = ['Japan', 'China', 'South Korea', 'Vietnam', 'Denmark'];
    const missing = expected.filter(/* ... */);
    ```
    - It compares the list of destinations it found in the response against a list of expected destinations.
    - If any destinations are missing, it prints a `⚠️ Missing destinations:` warning. Otherwise, it prints a success message.

### How to Run

1.  Make sure the main application is running (`npm run dev`).
2.  Open a new terminal window.
3.  Run the command: `node .test-files/test-api.js`
