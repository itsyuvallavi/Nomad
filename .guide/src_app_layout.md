# File Explanation: `src/app/layout.tsx`

## Summary

This file is the root layout for the entire Next.js application. It's a special file in the Next.js App Router paradigm. The component exported from this file wraps every single page in the application, making it the perfect place to define global HTML structure, import global stylesheets, and apply fonts.

---

## Detailed Breakdown

### Imports

```typescript
import type {Metadata} from 'next';
import './globals.css';
```
- **`Metadata`**: This imports the `Metadata` type from Next.js. This type is used for defining the application's metadata for SEO (Search Engine Optimization) and browser information.
- **`./globals.css`**: This is a critical import. It loads the global stylesheet for the entire application. Without this line, none of the Tailwind CSS styles or custom theme colors would be applied.

### `metadata` Object

```typescript
export const metadata: Metadata = {
  title: 'Nomad Navigator',
  description: 'Your AI-powered travel planner for digital nomads.',
};
```
- **`export const metadata`**: In the Next.js App Router, exporting an object with this name allows you to set the default metadata for all pages.
- **`title`**: Sets the default title that appears in the browser tab.
- **`description`**: Sets the default meta description tag, which is important for search engine results.

### `RootLayout` Component

```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        {/* ... font links ... */}
      </head>
      <body className="font-body antialiased bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
        {children}
      </body>
    </html>
  );
}
```
- **`export default function RootLayout(...)`**: This is the main component of the file.
- **`{ children }`**: This is a special prop in React. In a layout component, `children` will be the actual page component being rendered. For example, when you visit the homepage, `children` will be the component from `src/app/page.tsx`. This is how the layout wraps the page content.
- **`<html lang="en" className="dark h-full">`**: This is the root HTML element.
    - `lang="en"`: Declares the primary language of the document as English for accessibility and SEO.
    - `className="dark h-full"`:
        - `dark`: This class is what enables `shadcn/ui` and Tailwind's dark mode theme. The styles for this are defined in `globals.css`.
        - `h-full`: A Tailwind class that makes the `<html>` element take up the full height of the viewport.
- **`<head>`**: This section contains metadata for the document. The `<link>` tags are used to import custom fonts (`Inter` and `Satoshi`) from Google Fonts. This is the standard way to apply custom web fonts to an application.
- **`<body className="...">`**: This is the main body of the HTML document.
    - `font-body`: Applies the custom "Inter" font family, defined in `tailwind.config.ts`.
    - `antialiased`: A Tailwind utility that applies font smoothing for cleaner text rendering.
    - `bg-gradient-to-b from-slate-700 ...`: These are Tailwind classes that apply a vertical background gradient, giving the app its dark, slate-colored background.
- **`{children}`**: This is where the content of the individual pages will be rendered, inside the `<body>` tag.