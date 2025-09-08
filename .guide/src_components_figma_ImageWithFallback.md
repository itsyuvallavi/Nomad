
# File Explanation: `src/components/figma/ImageWithFallback.tsx`

## Summary

This component is a robust wrapper around the standard HTML `<img>` tag. Its purpose is to provide a graceful fallback mechanism for when an image fails to load. If the image specified in the `src` prop cannot be found or loaded, this component will automatically display a default placeholder image instead of a broken image icon.

---

## Detailed Breakdown

### Imports

```typescript
import React, { useState } from 'react'
```
- **`React`, `useState`**: Imports the core React library and the `useState` hook, which is used to track whether the image has encountered an error.

### Constants

```typescript
const ERROR_IMG_SRC = 'data:image/svg+xml;base64,...'
```
- **`ERROR_IMG_SRC`**: This constant holds the fallback image. It's a Base64-encoded SVG data URI.
- **Why a Data URI?** Using a data URI is a clever choice here because the image data is embedded directly into the code. This means the fallback image itself doesn't require a separate network request and is guaranteed to be available instantly, even if the user is offline or the network is unreliable. The SVG is a simple, lightweight representation of a broken image (a landscape icon with a line through it).

### `ImageWithFallback` Component

```typescript
export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props

  return didError ? (
    // Fallback JSX
  ) : (
    // Standard Image JSX
  )
}
```
- **Props**: The component is designed to be a drop-in replacement for `<img>`. It accepts all the standard attributes of an HTML `<img>` tag by using `React.ImgHTMLAttributes<HTMLImageElement>`.
- **State**: `const [didError, setDidError] = useState(false)` initializes a state variable `didError` to `false`. This variable will track whether the image has failed to load.
- **`handleError` Function**: This function's sole purpose is to update the state by calling `setDidError(true)`. It is passed to the `onError` prop of the real `<img>` element.
- **Destructuring Props**: `const { src, alt, ... } = props` separates the props for easier use. `...rest` is an object containing all other passed-in props (like `width`, `height`, etc.), which allows the component to be flexible.

### Conditional Rendering Logic

The component uses a ternary operator (`didError ? ... : ...`) to decide what to render:

#### If `didError` is `true`:

```jsx
return didError ? (
  <div className={`inline-block bg-gray-100 ... ${className ?? ''}`} style={style}>
    <div className="flex items-center justify-center w-full h-full">
      <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
    </div>
  </div>
) : ( /* ... */ )
```
- It renders a `<div>` with a light gray background.
- Inside, it renders an `<img>` tag whose `src` is set to the `ERROR_IMG_SRC` constant.
- **`{...rest}`**: The rest of the props (like `width`, `height`) are passed to the fallback `img` tag, so it respects the original sizing.
- **`data-original-url={src}`**: This is a nice debugging feature. It adds a data attribute to the fallback image containing the URL of the image that failed to load, which can be inspected in the browser's developer tools.

#### If `didError` is `false` (the default state):

```jsx
return didError ? ( /* ... */ ) : (
  <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
)
```
- It renders a standard `<img>` element with all the props passed to it.
- **`onError={handleError}`**: This is the most critical part. This is a standard event handler for `<img>` tags that fires if the browser fails to load the image specified in `src`. When it fires, it calls our `handleError` function.
- **The Flow**:
    1. The component initially renders with `didError` as `false`.
    2. It tries to load the image from the `props.src`.
    3. If the image loads successfully, nothing else happens.
    4. If the image fails to load (e.g., 404 error, network issue), the `onError` event fires.
    5. `handleError` is called, which calls `setDidError(true)`.
    6. Setting the state triggers a re-render of the component.
    7. On the re-render, `didError` is now `true`, so the component returns the fallback JSX instead