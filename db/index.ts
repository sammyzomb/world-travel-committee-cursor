/** Netlify 建置走 stub；Cloudflare 建置走 D1。 */
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "./schema";

// Both production D1 and the SQLite test proxy expose this query interface.
export async function getDb(): Promise<BaseSQLiteDatabase<"async", unknown, typeof schema>> {
  if (process.env.INTEGRATION_TEST_DB === "true") {
    const { getIntegrationTestDb } = await import("./integration-test-db");
    return getIntegrationTestDb();
  }
  if (process.env.NETLIFY === "true") {
    const { getCloudflareDb } = await import("./netlify-db-stub");
    return getCloudflareDb();
  }
  const { getCloudflareDb } = await import("./cloudflare-db");
  return getCloudflareDb();
}
