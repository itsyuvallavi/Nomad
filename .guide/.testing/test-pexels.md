
# File Explanation: `.test-files/test-pexels.js`

## Summary

This script is a dedicated test for the **Pexels API integration**. Its purpose is to verify that the Pexels API key is configured correctly and that the application can successfully search for and retrieve images for a list of destinations.

It is a focused test that does not involve the OpenAI API at all. This is useful for debugging image-loading issues in isolation.

---

## Detailed Breakdown

### Setup

```javascript
const fetch = require('node-fetch');
require('dotenv').config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '...';
```
- **`node-fetch`**: Imports a `fetch` implementation for the Node.js environment.
- **`dotenv`**: Loads environment variables from the `.env` file.
- **`PEXELS_API_KEY`**: It retrieves the API key from `process.env`. It also includes a default, hardcoded key. **Note: Including fallback or default API keys in source code is generally not a good practice, but is sometimes done in test scripts for convenience.**

### `testPexels` Function

This is the main async function that runs the test.

#### 1. Define Destinations

```javascript
const destinations = ['Zimbabwe', 'Nicaragua', 'Madagascar', 'Ethiopia', 'Denmark'];
```
- It defines a hardcoded array of destinations to search for. These match the destinations from the complex multi-destination test case.

#### 2. Loop and Fetch

```javascript
for (const destination of destinations) {
  try {
    const query = `${destination} travel destination landscape`;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}...`;

    const response = await fetch(url, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });
    // ...
  }
}
```
- The script loops through each `destination` in the array.
- **Construct Query**: For each destination, it constructs a search `query` (e.g., "Zimbabwe travel destination landscape") to get relevant, high-quality images.
- **Construct URL**: It builds the full request URL for the Pexels API search endpoint.
- **`fetch` Call**: It uses `fetch` to make the GET request to the Pexels API. The most important part of this call is the `headers` object, which includes the `Authorization` header containing the Pexels API key. This is how the API authenticates the request.

#### 3. Process and Log Response

```javascript
if (!response.ok) {
  console.error(`❌ Error: ${response.status} ${response.statusText}`);
  // ...
  continue;
}

const data = await response.json();
console.log(`✅ Found ${data.photos?.length || 0} images`);

if (data.photos && data.photos.length > 0) {
  data.photos.forEach((photo, idx) => {
    console.log(`  ${idx + 1}. Photo by ${photo.photographer}`);
    console.log(`     URL: ${photo.src.large}`);
  });
}
```
- **Error Handling**: It checks if `response.ok` is true. If not, it logs a detailed error message and `continue`s to the next destination in the loop.
- **Success Logging**: If the request is successful, it parses the JSON `data` and logs:
    - The number of photos found for that destination.
    - A list of the found photos, including the photographer's name and the direct URL to the large image source.

### How to Run

1.  Make sure your `.env` file contains a valid `PEXELS_API_KEY`.
2.  Run the script from your terminal: `node .test-files/test-pexels.js`
3.  The script will print the results of the image search for each of the five test destinations.
