import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Only engage Clerk when it is configured, so the app still runs
// (scanner, local reminders) before any Clerk keys are added.
const enabled = !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default enabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Run on app routes (skip static files and _next), and on API routes.
    "/((?!_next|.*\\.(?:png|jpg|jpeg|svg|ico|webp|json|js|css|txt|woff2?)$).*)",
    "/(api|trpc)(.*)",
  ],
};
