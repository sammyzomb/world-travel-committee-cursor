export async function getDb() {
  const { getCloudflareDb } = await import("./netlify-db-stub");
  return getCloudflareDb();
}
