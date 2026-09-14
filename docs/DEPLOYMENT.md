# 部署策略

## 決策（2026-09-14）

| 平台 | 角色 | 名人榜 | 建置指令 |
|------|------|--------|----------|
| **Netlify** | 公開遊玩入口（主要 URL） | 暫不可用（stub） | `npm run build:netlify` |
| **Cloudflare Workers** | 完整功能（含 D1 名人榜） | 可用（需 D1 設定） | `npm run build` |

- 公開網址：https://world-travel-committee-cursor.netlify.app
- 管理後台：https://app.netlify.com/projects/world-travel-committee-cursor
- GitHub 連動：於 [Netlify 專案設定](https://app.netlify.com/projects/world-travel-committee-cursor/link) 連接 `sammyzomb/world-travel-committee-cursor`，之後 push `main` 自動部署

## Netlify 部署

本機手動部署：

```powershell
npm run build:netlify
npx netlify-cli deploy --prod --dir=dist --functions=.netlify/functions-internal
```

環境變數已在 [`netlify.toml`](../netlify.toml) 設定：
- `NETLIFY=true`、`NITRO_PRESET=netlify`
- `NETLIFY_NEXT_PLUGIN_SKIP=true`（避免與 vinext/Nitro 衝突）

## Cloudflare 部署

1. `npm run build`
2. 設定 D1 binding `DB`（見 [LEADERBOARD-SETUP.md](./LEADERBOARD-SETUP.md)）
3. 執行 `npm run db:migrate:local`（本機）或 `npm run db:migrate:remote`（正式）

## 限制說明

Netlify 上主線、副模式、地標圖片 API 可正常運作；名人榜需 Cloudflare D1 或另接 Turso adapter。
