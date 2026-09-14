# 第一階段交付摘要

日期：2026-09-14（含 Cloudflare + D1 正式部署）

## 正式網址

| 平台 | URL | 遊戲 | 名人榜 |
|------|-----|------|--------|
| **Cloudflare（正式）** | https://world-travel-committee.tcawg.workers.dev | ✅ | ✅ D1 |
| **Netlify（備援）** | https://world-travel-committee-cursor.netlify.app | ✅ | ❌ stub |

Cloudflare 帳號：`samchang@tcawg.com` · workers.dev 子網域：`tcawg` · D1：`world-travel-committee-d1`

## 已完成

### 題庫品質
- 每題具備 `id`、`conceptId`、`source`、`auditStatus`、`grades`、`questionType`。
- 審核狀態：`pending` / `approved` / `disabled`。
- **精選／旅行／行程題預設 `pending`**，須通過 `npm run audit:questions` 驗證後才在 `question-audit.json` 標為 `approved`。
- REST Countries 首都、洲別、反向首都題依來源資料自動 `approved`；地標／城市題由 audit 腳本逐題覆核。
- 答題前視覺標籤經 `lib/visual-safety.ts` 過濾，避免圖片說明直接洩漏答案。
- 世界之最類題目若缺少限定條件，audit 腳本標為 `disabled`。
- 題庫統計（2026-09-14）：approved 474 · pending 5 · disabled 39 · 可支援完整 18 級 90 題。

### 抽題與年級規則
- 每級 5 題、答對 3 題通過；整局 3 次機會。
- 小一前 3 題固定為 JSON 順序的是非送分題，不混排到第 4 題之後。
- 選項數：小一～小三 2、小四～小六 3、國中以上 4。
- 18 級至研二；研二通關為完整破關；題庫不足不算破關。
- 同局 `id` 與 `conceptId` 去重；優先避開近期玩過的題目。
- 畢業節點：小六、國三、高三、大四、研二。

### 排行榜
- 伺服器依 `selectedOption` 對照題庫重算正確與分數，不信任 client 的 `correct` 欄位。
- `sessionToken` 防重複提交；60 秒 5 次限流。
- Cloudflare D1 已建立、遷移完成，正式站名人榜可用。
- `db/index.ts` 依建置平台分流：Cloudflare → `cloudflare-db`；Netlify → stub。
- 不刪除既有正式成績；不執行破壞性資料遷移。

### 圖片與地圖
- 保留有效地標照片及來源標示。
- 「地圖點選」已改為「洲別挑戰」。

### Cloudflare 部署（2026-09-14 完成）
- `npx wrangler login` 授權完成。
- D1 建立與遠端遷移（`drizzle/0000`、`0001`）。
- workers.dev 子網域 `tcawg` 註冊（`npm run workers:subdomain`）。
- Workers 部署：`world-travel-committee`。
- 修正遠端遷移 `--remote` 不可搭配 `--persist-to`。
- 修正 `db:create` 解析新版 wrangler JSON 輸出。
- 新子網域 SSL 憑證啟用約需 10～30 分鐘（`ERR_SSL_VERSION_OR_CIPHER_MISMATCH` 為暫時現象）。

## 驗證結果

```powershell
npm run audit:questions
npm run verify:phase1
npm run build
```

- 18 級流程、warmup 順序、選項數、同局去重、研二破關
- 分數竄改防護、`selectedOption` 驗證、重複提交拒絕
- 正式站 `GET /api/leaderboard` 回傳 `{"entries":[]}`（D1 連線正常）

## 本機設定（不 commit）

| 檔案 | 用途 |
|------|------|
| `cloudflare.json` | D1 `database_id`、worker 名稱（見 `cloudflare.json.example`） |

## 常用指令

```powershell
npm run deploy:cloudflare    # 建置 + 部署正式站
npm run db:migrate:remote    # D1 遠端遷移
npm run workers:subdomain    # 註冊 workers.dev 子網域
npm run workers:check        # 查詢子網域狀態
npm run verify:phase1        # 第一階段規則驗證
```

詳見 [CLOUDFLARE-D1-SETUP.md](./CLOUDFLARE-D1-SETUP.md)、[DEPLOYMENT.md](./DEPLOYMENT.md)。

## 未完成（留待後續階段）

- 5 題 pending、39 題 disabled 人工覆核
- 一萬題擴充與各年級精細題量平衡
- Netlify 名人榜持久資料庫 adapter
- Playwright E2E 與真機瀏覽器測試
- 自訂網域（可選）

## 相關 commit（2026-09-14）

| Commit | 摘要 |
|--------|------|
| `b97cacf` | 題庫審核流程、視覺防洩題 |
| `862266d` | 伺服器端答案驗證 |
| `5daf92c` | Cloudflare D1 設定腳本與文件 |
| `4d2938e` | D1 建立／遠端遷移修正 |
| `a40ab7c` | workers.dev 子網域腳本 |
| `cc45189` | 修正 Cloudflare 部署使用 D1 |
