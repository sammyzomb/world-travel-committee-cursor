# 部署策略

## 決策（2026-09-14 更新）

| 平台 | 角色 | 名人榜 | 建置指令 |
|------|------|--------|----------|
| **Cloudflare Workers** | **正式環境**（遊戲 + D1 名人榜） | ✅ | `npm run deploy:cloudflare` |
| **Netlify** | 備援試玩入口 | ❌ stub | `npm run deploy:netlify` |

- Netlify 試玩：https://world-travel-committee-cursor.netlify.app
- Cloudflare 正式站：https://world-travel-committee.tcawg.workers.dev（見 [CLOUDFLARE-D1-SETUP.md](./CLOUDFLARE-D1-SETUP.md)）

## Cloudflare + D1（建議）

完整步驟見 **[CLOUDFLARE-D1-SETUP.md](./CLOUDFLARE-D1-SETUP.md)**。

快速流程：

```powershell
npx wrangler login
npm run db:create
npm run build
npm run db:migrate:remote
npm run deploy:cloudflare
```

本機 `cloudflare.json` 存放 D1 `database_id`（已加入 `.gitignore`，不會 push 到 GitHub）。

## Netlify 部署（備援）

```powershell
npm run deploy:netlify
```

環境變數見 [`netlify.toml`](../netlify.toml)。名人榜 API 會誠實回報「尚未設定資料庫」。

## 限制說明

- Netlify：主線、副模式、地標圖片可正常運作；名人榜需 Cloudflare D1。
- Cloudflare：需完成 D1 建立與遠端遷移後，名人榜才可用。
