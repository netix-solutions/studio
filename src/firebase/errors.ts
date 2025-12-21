
'use client';

/**
 * Defines the context for a Firestore security rule violation.
 * This information is used to generate a rich, contextual error message
 * that helps developers debug security rules during development.
 */
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  // `requestResourceData` is the data being sent in a create, update, or set operation.
  requestResourceData?: any;
};

/**
 * A custom error class designed to be thrown when a Firestore operation
 * fails due to security rule permissions. It encapsulates the context
 * of the failed operation to provide detailed debugging information in
 * a development environment.
 *
 * This error is intended to be caught and re-thrown by a global error handler
 * (like Next.js's `error.tsx`) to display a developer-friendly overlay.
 */
export class FirestorePermissionError extends Error {
  // Public property to hold the context of the security rule violation.
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    // Construct the detailed error message for the developer overlay.
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
      {
        context,
      },
      null,
      2
    )}`;

    // Call the parent `Error` constructor.
    super(message);

    // Standard practice for custom errors to maintain the stack trace.
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This line is for V8's stack trace API (used in Node.js and Chrome).
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      // Fallback for other environments.
      this.stack = new Error(message).stack;
    }
  }
}
