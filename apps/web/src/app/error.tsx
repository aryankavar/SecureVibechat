'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertCircleIcon } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="flex justify-center mb-6 text-red-500">
          <AlertCircleIcon size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-semibold mb-3 text-gray-800">Something went wrong</h2>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          We've been notified about this issue and our team is looking into it. 
          Please try refreshing the page or starting over.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-colors"
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </button>
          <button
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full shadow-sm transition-colors"
            onClick={() => reset()}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
