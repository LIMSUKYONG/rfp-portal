import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase admin client using service role key for integration tests.
 * Bypasses RLS for direct table access.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for integration tests");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Generate a unique test ID for cleanup.
 */
/** Short unique ID fitting VARCHAR(20) */
export function testId() {
  return `T${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

/**
 * Cleanup helper — delete test data by ID.
 */
export async function cleanup(table: string, ids: string[]) {
  if (ids.length === 0) return;
  const supabase = createAdminClient();
  await supabase.from(table).delete().in("id", ids);
}
