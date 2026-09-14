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

## 部署狀態（2026-09-14）

Cloudflare 正式站已上線，D1 名人榜可用。本機需有 `cloudflare.json`（不 commit）才能在本機重新部署。

## 限制說明

- Netlify：主線、副模式、地標圖片可正常運作；名人榜為 stub。
- Cloudflare：遊戲與名人榜完整功能；新 `workers.dev` 子網域 SSL 可能需等待數十分鐘。
