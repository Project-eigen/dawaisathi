// Centralized feature flags driven by which credentials are present.
// Lets the app build + run (scanner works) even before Clerk / Neon are configured.

// Client-safe: NEXT_PUBLIC_* is inlined at build time.
export const authEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Server-only.
export const dbConfigured = !!process.env.DATABASE_URL;
