'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f9fafb',
        }}>
          <div style={{
            maxWidth: '400px',
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>
              Application Error
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              A critical error occurred. Please refresh the page or try again later.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
