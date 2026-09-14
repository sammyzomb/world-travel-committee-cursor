# 第一階段交付摘要

日期：2026-09-14（第二輪品質修正）

## 已完成

### 題庫品質
- 每題具備 `id`、`conceptId`、`source`、`auditStatus`、`grades`、`questionType`。
- 審核狀態：`pending` / `approved` / `disabled`。
- **精選／旅行／行程題預設 `pending`**，須通過 `npm run audit:questions` 驗證後才在 `question-audit.json` 標為 `approved`；不再整批預設通過。
- REST Countries 首都、洲別、反向首都題依來源資料自動 `approved`；地標／城市題由 audit 腳本逐題覆核。
- 答題前視覺標籤經 `lib/visual-safety.ts` 過濾，避免圖片說明直接洩漏答案。
- 世界之最類題目若缺少限定條件，audit 腳本標為 `disabled`。

### 抽題與年級規則
- 每級 5 題、答對 3 題通過；整局 3 次機會。
- 小一前 3 題固定為 JSON 順序的是非送分題（`kind === "tf"`），不混排到第 4 題之後。
- 選項數：小一～小三 2、小四～小六 3、國中以上 4。
- 18 級至研二；研二通關為完整破關；題庫不足不算破關。
- 同局 `id` 與 `conceptId` 去重；優先避開近期玩過的題目。
- 畢業節點：小六、國三、高三、大四、研二。

### 排行榜
- 伺服器依 `answers` 重算分數；`sessionToken` 防重複提交；60 秒 5 次限流。
- Cloudflare D1 為正式持久化方案；Netlify 建置使用 stub（誠實回報未連線）。
- 不刪除既有正式成績；不執行破壞性資料遷移。

### 圖片與地圖
- 保留有效地標照片及來源標示。
- 「地圖點選」已改為「洲別挑戰」。

## 驗證結果

執行 `npm run audit:questions` 後執行 `npm run verify:phase1`：

- 常數、18 級、選項數分界
- 小一前 3 題固定是非題順序
- 同局 concept / id 去重
- 完整 18 級抽題（90 題）
- 已審核題 visual 不洩漏答案
- 分數重算、重複提交、空答案驗證

另執行 `npm run build` 與 `npm run lint`（見 commit 輸出）。

## 仍需使用者設定

見 [LEADERBOARD-SETUP.md](./LEADERBOARD-SETUP.md)：

- Cloudflare D1 綁定與 `npm run db:migrate:remote`
- Netlify 若需名人榜，須另行設定可持久化 adapter（目前未實作）

## 未完成（留待後續階段）

- 精選題逐題人工覆核（腳本已通過者為自動 approved，複雜題可能仍 pending/disabled）
- 一萬題擴充與各年級精細題量平衡
- Netlify 名人榜持久資料庫 adapter
- Playwright E2E 與真機瀏覽器測試

## 本次不部署

依指示，本次僅 commit + push GitHub，**不執行 Netlify 正式部署**。
