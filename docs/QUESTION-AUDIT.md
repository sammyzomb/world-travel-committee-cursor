# 題庫審核工作流

## 機制

1. 載入時每題自帶預設 `auditStatus`（見 [`lib/question-metadata.ts`](../lib/question-metadata.ts)）。
2. [`data/question-audit.json`](../data/question-audit.json) 以題目 `id` 覆寫審核結果（不整批通過 hand-curated）。
3. 主線只抽 `auditStatus === "approved"` 的題目。

## 指令

```bash
# 檢視 expanded 待審題與來源一致性（dry run）
node scripts/audit-questions.mjs

# 寫入審核覆寫（驗證 expandedFacts 一致後核准）
npm run audit:questions
```

## 目前狀態（2026-09-14）

| 狀態 | 數量 | 說明 |
|------|------|------|
| approved | 434 | 含 168 題經 fact-consistency 驗證的 expanded 題 |
| pending | 0 | — |
| disabled | 0 | — |

手動精選題（53+25+20）維持程式內 `approved`；expanded 地標／城市題需跑審核腳本後才進主線。

## 後續

- 新增題目時在 `question-audit.json` 逐題標記，或擴充審核腳本規則。
- 無法確認的題目設為 `disabled`，勿直接標為 `approved`。
