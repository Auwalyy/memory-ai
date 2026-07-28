'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center text-center px-6 font-sans">
        <h1 className="text-3xl font-bold mb-3">Something went wrong</h1>
        <p className="text-gray-500 mb-6 max-w-sm">{error?.message || 'An unexpected error occurred.'}</p>
        <Button onClick={reset}>Try again</Button>
      </body>
    </html>
  );
}
