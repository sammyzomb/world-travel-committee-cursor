export function getCloudflareDb(): never {
  throw new Error(
    "Netlify 部署尚未設定資料庫。遊戲可正常玩，名人榜需另接 Turso 或改用 Cloudflare 部署。",
  );
}
