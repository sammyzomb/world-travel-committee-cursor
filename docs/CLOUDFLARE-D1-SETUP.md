# Cloudflare + D1 零成本設定指南

本專案正式環境建議使用 **Cloudflare Workers + D1**，可同時運行遊戲與名人榜。  
Netlify 站點可保留為備援試玩入口（名人榜不可用）。

## 費用

- Cloudflare **Workers 免費方案**：約 10 萬次請求/天
- Cloudflare **D1 免費方案**：約每日 500 萬次讀、10 萬次寫、5GB 儲存
- 一般課堂／活動流量 → **$0**，不需信用卡（純免費方案）

## 事前準備

1. 註冊 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)（免費）
2. 本機已安裝 Node.js ≥ 22（專案已含 `wrangler`）
3. 在專案根目錄開啟終端機（PowerShell）

## 步驟一：登入 Wrangler

**建議在本機 PowerShell 視窗執行**（不要用過期的授權連結；授權時終端機必須保持開啟）：

```powershell
cd "d:\GITHUB_2\國民教育委員會\world-travel-committee-cursor"
npx wrangler login --browser=false --callback-port 8977
```

終端機會印出 `Visit this link to authenticate:` — 複製該連結到瀏覽器，登入後點 **Authorize**。成功時會看到 localhost 成功頁面。

若出現 `EADDRINUSE`（埠被佔用），改用其他埠，例如 `--callback-port 8980`。

### 替代方案：API Token（不需 localhost 回調）

1. 開啟 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 建立 Token，權限選 **Workers 編輯** + **D1 編輯**
3. 在專案根目錄建立 `.env`（已 gitignore）：

```env
CLOUDFLARE_API_TOKEN=你的_token
CLOUDFLARE_ACCOUNT_ID=你的_account_id
```

Account ID 在 Cloudflare Dashboard 右側欄可見。之後可直接執行 `npm run db:create` 等指令，不需 `wrangler login`。

驗證：

```powershell
npx wrangler whoami
```

## 步驟二：建立 D1 資料庫

```powershell
npm run db:create
```

此指令會：

- 在 Cloudflare 建立名為 `world-travel-committee-d1` 的 D1 資料庫
- 自動寫入本機 `cloudflare.json`（**不會 commit 到 Git**）

若已手動建立過，可複製範例後自行填寫：

```powershell
copy cloudflare.json.example cloudflare.json
# 編輯 cloudflare.json，填入 Dashboard 上的 database_id
```

## 步驟三：建置並執行資料庫遷移

```powershell
npm run build
npm run db:migrate:remote
```

成功後，D1 會有 `leaderboard_entries` 表（含 `session_token` 防重複提交）。

本機預覽（可選）：

```powershell
npm run db:migrate:local
npm run start
```

開啟 http://127.0.0.1:8787 ，確認 `GET /api/leaderboard` 不回傳資料庫錯誤。

## 步驟四：部署到 Cloudflare

```powershell
npm run deploy:cloudflare
```

完成後終端機會顯示 Workers URL，例如：

`https://world-travel-committee.<your-subdomain>.workers.dev`

若 onboarding 連結出現 404，可改到 [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) 設定子網域，或執行：

```powershell
npm run workers:subdomain tcawg
```

## 步驟五：驗證名人榜

1. 開啟部署 URL
2. 玩一局主線並通過至少一個年級
3. 在結果畫面提交暱稱
4. 重新載入首頁，確認名人榜有資料

若失敗，常見原因：

| 錯誤訊息 | 處理方式 |
|----------|----------|
| 資料表尚未建立 | 重跑 `npm run db:migrate:remote` |
| D1 binding 不可用 | 確認 `cloudflare.json` 有正確 `d1DatabaseId` 後重新 `npm run build` |
| 此場次成績已提交過 | 正常防護，重新開始新一局即可 |
| 提交過於頻繁 | 60 秒內同暱稱最多 5 次，稍後再試 |

## 與 Netlify 的關係

| 平台 | URL | 遊戲 | 名人榜 |
|------|-----|------|--------|
| **Cloudflare**（建議正式） | `*.workers.dev` 或自訂網域 | ✅ | ✅ |
| **Netlify**（備援試玩） | world-travel-committee-cursor.netlify.app | ✅ | ❌ stub |

若要將自訂網域指向 Cloudflare：

1. Cloudflare Dashboard → Workers → 您的 worker → Settings → Domains
2. 新增自訂網域並依指示設定 DNS

## 常用指令

```powershell
npm run db:create           # 建立 D1 + 寫入 cloudflare.json
npm run build               # Cloudflare 建置
npm run db:migrate:local    # 本機 D1 遷移
npm run db:migrate:remote   # 正式 D1 遷移
npm run start               # 本機預覽（含 D1 local）
npm run deploy:cloudflare   # 建置 + 部署 Workers
npm run verify:phase1       # 第一階段規則驗證
```

## 需要您提供的項目（摘要）

| 項目 | 是否必要 | 說明 |
|------|----------|------|
| Cloudflare 帳號 | ✅ | 免費註冊 |
| `npx wrangler login` | ✅ | 一次性授權 |
| `cloudflare.json` | ✅ | 由 `npm run db:create` 自動產生 |
| 信用卡 | ❌ | 免費方案不需要 |
| 自訂網域 | ❌ | 可選；`*.workers.dev` 免費可用 |

## 疑難排解

**Windows 上 `db:migrate:local` 失敗**  
確認已先 `npm run build`，且 Node 版本 ≥ 22。

**重新建立 D1**  
刪除本機 `cloudflare.json`，在 Cloudflare Dashboard 刪除舊資料庫後，再執行 `npm run db:create`。

**不刪除既有成績**  
遷移腳本只新增表／欄位，不會清空 `leaderboard_entries` 資料。
