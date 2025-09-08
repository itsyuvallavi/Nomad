
# File Explanation: `.test-files/test-full-integration.js`

## Summary

This is the most comprehensive test script in the suite. It performs a full integration test of the application's two main external services: **OpenAI** for itinerary generation and the **Pexels API** for image fetching.

Its purpose is to simulate a complete user journey, from generating an itinerary to fetching the images for the destinations in that itinerary, ensuring that both core APIs are configured correctly and can work together.

---

## Detailed Breakdown

### Setup

```javascript
const OpenAI = require('openai');
require('dotenv').config();

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_API_ACCESS_KEY;
```
- It initializes the OpenAI client.
- It retrieves the `UNSPLASH_API_ACCESS_KEY` from the `.env` file. *Note: The variable name is `UNSPLASH_ACCESS_KEY` but the test now uses the Pexels API. This is a small inconsistency in the test script itself.*

### `searchUnsplashImages` Function (Actually Pexels)

```javascript
async function searchUnsplashImages(destination) {
  // ... logic to call the Pexels API ...
}
```
- This async function is responsible for calling the image API for a given destination. Although named for Unsplash, the implementation should point to the Pexels API if the main codebase has been updated. It constructs the API request, sends it with the correct authorization header, and returns a formatted array of image objects.

### `testFullIntegration` Function

This is the main function that orchestrates the test.

#### 1. OpenAI Itinerary Generation

```javascript
const completion = await openai.chat.completions.create({ /* ... */ });
const itinerary = JSON.parse(completion.choices[0].message.content);
```
- It first calls the OpenAI API with the complex multi-destination prompt to generate a travel itinerary.
- It then parses the JSON response to get the `itinerary` object.

#### 2. Extract Destinations

```javascript
const destinationsInItinerary = itinerary.destination.split(',').map(d => d.trim());
```
- This is the "integration" step. It takes the output from the first API call (the list of destinations from the generated itinerary) and uses it as the input for the next step.

#### 3. Pexels Image Fetching

```javascript
for (const destination of destinationsInItinerary) {
  const images = await searchUnsplashImages(destination);
  // ... log the results
}
```
- It then loops through the list of destinations it just extracted.
- Inside the loop, it calls the `searchUnsplashImages` function for each destination to fetch relevant travel photos.
- It logs the results of each image search to the console, showing whether images were found and listing their details.

#### 4. Final Summary

```javascript
console.log('📊 INTEGRATION TEST SUMMARY');
// ...
console.log('✅ OpenAI Integration: Working');
console.log('✅ Unsplash Integration: Working'); // (Should be Pexels)
```
- The script concludes by printing a summary of the test run, confirming whether the OpenAI generation was successful and whether the image API was configured and successfully called.

### How to Run

1.  Ensure your `.env` file has both a valid `OPENAI_API_KEY` and a `PEXELS_API_KEY`.
2.  Run the script from your terminal: `node .test-files/test-full-integration.js`
3.  The script will first show the results of the itinerary generation, then the results of the image search for each destination, and finally a summary of the entire test.
