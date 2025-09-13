'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console with full details
    console.error('🔴 Application Error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name,
      cause: error.cause,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Something went wrong!
        </h2>
        <div className="mb-4 p-3 bg-red-50 rounded">
          <p className="text-sm text-gray-700 font-mono">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && error.stack && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Stack trace
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
              {error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}