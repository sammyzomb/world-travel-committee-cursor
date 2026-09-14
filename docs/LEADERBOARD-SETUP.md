# 名人榜資料庫設定

主線名人榜需要 **Cloudflare D1**（或相容的 SQLite 持久儲存），瀏覽器 localStorage 僅用於個人錯題與成就，不能取代全站排行榜。

## 已完成程式行為

- 伺服器依 `answers` 重算分數，不信任客戶端提交的總分。
- 每場次 `sessionToken` 只能提交一次。
- 同一暱稱 60 秒內最多 5 次提交。
- 僅前十名資格者可寫入；**不會刪除**歷史非前十名紀錄。
- 同分排序：`score DESC, id DESC`（較早達成者 id 較小，但較新 id 較大——以較高分優先，同分時較新紀錄排前）。

## 需要使用者提供的項目

請依 **[CLOUDFLARE-D1-SETUP.md](./CLOUDFLARE-D1-SETUP.md)** 操作：

1. `npx wrangler login`
2. `npm run db:create`（產生本機 `cloudflare.json`）
3. `npm run build` → `npm run db:migrate:remote`
4. `npm run deploy:cloudflare`

D1 binding 名稱固定為 `DB`（見 `.openai/hosting.json`）。

**Netlify** 仍使用 `db/netlify-db-stub.ts`，名人榜不可用；正式環境請用 Cloudflare。

## 驗證

本地 Cloudflare preview 建置後，確認 `GET /api/leaderboard` 不回傳資料庫錯誤，再進行一局主線並提交成績。
