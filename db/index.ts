/** Netlify 建置只解析 stub；Cloudflare 建置由 vite alias 替換為 cloudflare-db。 */
export async function getDb() {
  const { getCloudflareDb } = await import("./netlify-db-stub");
  return getCloudflareDb();
}
