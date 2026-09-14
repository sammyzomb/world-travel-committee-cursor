# 第一階段交付摘要

日期：2026-09-14

## 已完成

- 題庫欄位：`id`、`conceptId`、`source`、`auditStatus`、`grades`（載入時賦予）。
- 審核狀態：內建精選／送分題與 REST Countries 首都、洲別題為 `approved`；expanded 地標／城市題為 `pending`。
- 主線只抽 `approved` 題目；同局 `id` 與 `conceptId` 去重。
- 每級 5 題、答對 3 題通過；小一前 3 題固定送分是非題順序。
- 選項數：小一～小三 2、小四～小六 3、國中以上 4。
- 固定 18 級至研二，不延伸研三；研二通關為完整破關。
- 畢業節點：小六、國三、高三、大四、研二。
- 休息畫面無倒數；整局 3 次機會。
- 「地圖點選」改名為「洲別挑戰」。
- 名人榜：伺服器重算分數、場次 token、重複提交防護、頻率限制、停止刪除非前十名紀錄。

## 驗證結果

執行 `npm run verify:phase1`：

- 常數與選項數分界
- 小一 warmup 順序與審核過濾
- 同局 concept 去重
- 完整 18 級抽題可完成（90 題）
- 分數重算與提交 payload 驗證

另執行 `npm run build` 與 `npm run lint`（見 commit 時 CI／本地輸出）。

## 未完成

- 逐題人工審核全部 400+ 題（expanded 地標／城市題仍為 `pending`）。
- 一萬題擴充與各年級精細題量平衡。
- Netlify 名人榜持久資料庫 adapter。
- 自動化 E2E（Playwright）與真機瀏覽器測試。

## 需要使用者設定

見 [LEADERBOARD-SETUP.md](./LEADERBOARD-SETUP.md)。
