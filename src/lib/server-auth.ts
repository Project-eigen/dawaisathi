import { auth } from "@clerk/nextjs/server";
import { authEnabled } from "./config";

// Returns the signed-in Clerk user id, or null when auth is disabled / signed out.
export async function getUserId(): Promise<string | null> {
  if (!authEnabled) return null;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}
