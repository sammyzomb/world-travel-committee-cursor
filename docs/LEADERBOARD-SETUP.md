# 名人榜資料庫設定

主線名人榜需要 **Cloudflare D1**（或相容的 SQLite 持久儲存），瀏覽器 localStorage 僅用於個人錯題與成就，不能取代全站排行榜。

## 已完成程式行為

- 伺服器依 `answers` 重算分數，不信任客戶端提交的總分。
- 每場次 `sessionToken` 只能提交一次。
- 同一暱稱 60 秒內最多 5 次提交。
- 僅前十名資格者可寫入；**不會刪除**歷史非前十名紀錄。
- 同分排序：`score DESC, id DESC`（較早達成者 id 較小，但較新 id 較大——以較高分優先，同分時較新紀錄排前）。

## 需要使用者提供的項目

1. **Cloudflare 部署**並設定 D1 binding `DB`（見 `.openai/hosting.json`）。
2. 建置後執行遷移：
   ```bash
   npm run build
   npm run db:migrate:local    # 本機 preview
   npm run db:migrate:remote   # 正式 D1（需 wrangler 登入）
   ```
3. **Netlify 部署**目前使用 `db/netlify-db-stub.ts`，名人榜 API 會回傳「尚未設定資料庫」。若要 Netlify 上線名人榜，需另接 Turso／Neon 等並實作對應 adapter。

## 驗證

本地 Cloudflare preview 建置後，確認 `GET /api/leaderboard` 不回傳資料庫錯誤，再進行一局主線並提交成績。
