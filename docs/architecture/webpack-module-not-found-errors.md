# Troubleshooting: "Module not found" & Webpack Errors

You may frequently encounter build errors like:
*   `Module not found: Can't resolve 'module-name'`
*   `require.extensions is not supported by webpack`

This guide explains why this happens and how to fix it.

## The Problem: Server-Side Code in Client-Side Bundles

Next.js uses a tool called **webpack** to bundle your code into optimized JavaScript files that can be sent to the user's browser. This browser-side code is called the "client bundle."

The error occurs when a package designed to run only on a **server** (like Node.js) is accidentally included in the client bundle. Server-side packages often use Node.js-specific features that browsers don't understand, causing webpack to fail.

In this project, this often happens because:
1.  Our AI flows (in `src/ai/flows/`) are marked with `'use server';`.
2.  These server flows import libraries like **Genkit**.
3.  Genkit, in turn, uses other server-side libraries like `handlebars` for its internal operations.
4.  Next.js follows this import chain and incorrectly tries to include `handlebars` in the code it sends to the browser.

This results in the build error because `handlebars` was never meant to run in a browser.

## The Solution: Excluding Server Modules from the Client Build

The correct way to fix this is to tell webpack: **"When you build the code for the browser, please ignore this specific package."**

You can do this by modifying the `next.config.ts` file in the root of the project.

### Step-by-Step Fix

1.  **Identify the Problematic Module:** Look at the error message. It will usually point to the module that couldn't be resolved. In our recent case, it was `handlebars`.

    ```
    Import trace for requested module:
    ./node_modules/handlebars/lib/index.js
    ...
    ```

2.  **Open `next.config.ts`:** This is your Next.js configuration file.

3.  **Add a `webpack` Configuration Block:** You need to add a special function to the `nextConfig` object that customizes the webpack build process.

4.  **Add a Fallback Rule:** Inside the `webpack` function, you will add a rule to the `resolve.fallback` object. This tells webpack what to do when it encounters an import for a specific module on the client-side. By setting the module's value to `false`, you instruct webpack to replace it with an empty module, effectively removing it from the client bundle.

### Code Example

Here is how you would modify `next.config.ts` to fix the `handlebars` issue.

```typescript
// in next.config.ts

import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // ... other next.js config options ...

  // Add this webpack configuration block
  webpack: (config, { isServer }) => {
    // This rule applies only to the client-side build
    if (!isServer) {
      // Exclude the 'handlebars' module from the client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback, // Keep existing fallbacks
        'handlebars': false
      };
    }

    // Return the modified config
    return config;
  },

  // ... other config options like images, etc. ...
};

export default nextConfig;
```

If you encounter this error with a different package (e.g., `fs`, `path`), you would simply add it to the fallback object:

```javascript
config.resolve.fallback = {
  ...config.resolve.fallback,
  'handlebars': false, // Our original fix
  'fs': false,         // Example for another server-side module
};
```

By following this pattern, you can resolve most "Module not found" errors related to server-side dependencies in a Next.js project.
