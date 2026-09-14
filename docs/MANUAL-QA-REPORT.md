# 手動 QA 報告

日期：2026-09-14  
環境：本機腳本 + Netlify 正式站 https://world-travel-committee-cursor.netlify.app

## 自動化驗證

| 項目 | 指令 | 結果 |
|------|------|------|
| 第一階段規則 | `npm run verify:phase1` | 通過（18 級 90 題、去重、分數重算、畢業節點 5 點） |
| Cloudflare 建置 | `npm run build` | 通過 |
| Netlify 建置 | `npm run build:netlify` | 通過 |
| 題庫審核 | `npm run audit:questions` | 168 題 expanded 核准，approved 總數 434 |
| D1 本機遷移 | `0001_leaderboard_sessions.sql` | 本機 D1 已套用 |

## 改善計畫第五節對照

| 檢查項 | 結果 | 備註 |
|--------|------|------|
| 完整 18 級、每級 5 題 | 通過 | verify 腳本模擬抽滿 90 題 |
| 小一前三題順序 | 通過 | 不 shuffle warmup |
| 各級選項數 | 通過 | 2/2/3/4 分界 |
| 研二破關 | 通過 | `FINAL_STAGE_INDEX = 17` |
| 同局 id / conceptId 去重 | 通過 | verify 斷言 |
| 跨局避題 | 通過 | restart 仍可抽題 |
| 三次機會 / 未達通過 | 程式邏輯 | 需瀏覽器手動確認 UI |
| 每級休息畫面 | 程式邏輯 | 無倒數，需瀏覽器確認 |
| 五個學制畢業節點 | 通過 | 索引 5,8,11,15,17 |
| 排行榜持久保存 | 部分 | Cloudflare D1 本機 OK；Netlify 正式站 API 回 stub 錯誤（預期） |
| 分數竄改防護 | 通過 | API 重算分數；verify 拒絕 duplicate questionId |
| 重複提交 | 程式 | sessionToken unique（需 D1 連線實測） |
| 手機/平板/電腦操作 | 待人工 | 正式站已上線，建議各 viewport 試玩一級 |
| 圖片載入失敗 | 待人工 | 地標題有 fallback map 模式 |

## 正式站 smoke test

- 首頁可載入，標題「世界旅遊委員會」正常
- 副模式入口：每日一題、洲別特訓、錯題再戰、洲別挑戰 皆顯示
- 名人榜：Netlify 上顯示「載入中／錯誤」（無 D1，符合預期）
- 題庫統計：440 題

## 待人工補測

1. 手機 Safari / Chrome 答一輪小一
2. 故意答錯 3 次確認整局結束
3. Cloudflare 正式環境 + D1 remote 遷移後提交名人榜
