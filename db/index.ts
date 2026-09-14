/** Netlify 建置走 stub；Cloudflare 建置走 D1。 */
export async function getDb() {
  if (process.env.NETLIFY === "true") {
    const { getCloudflareDb } = await import("./netlify-db-stub");
    return getCloudflareDb();
  }
  const { getCloudflareDb } = await import("./cloudflare-db");
  return getCloudflareDb();
}
