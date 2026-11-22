# Phase 2：Knowledge Engine、AI Knowledge Publisher、Learning Engine 與 Exam Planner

## 目標

Phase 2 把學習資料與考試通知變成可驗證、可追溯、可人工修正的結構化資料。AI 只產生候選整理結果；發布流程必須保留來源、模型/規則版本、信心與 `needs_review` 狀態。

## 已落地的第一步

- Knowledge source、note 與 exam notification 契約
- AI publisher 的候選輸出狀態：`draft`、`needs_review`、`published`、`rejected`
- Learning plan 契約，保留 planner 版本與人工調整痕跡
- 純 Node.js 契約驗證與測試，不需要外部服務

## 不在本階段

- 不自動公開未授權教材
- 不把外部文件的提示注入當成系統指令
- 不把 API key 或原始個資寫入 Git
- 不將 AI 信心分數當成學習能力的絕對測量
- 不接入真實模型、資料庫或日曆同步

## 發布生命週期

`uploaded -> screened -> extracted -> drafted -> needs_review/published -> superseded`

任何不確定的科目、日期、範圍或權利狀態都必須停在 `needs_review`，不能因為自動化而覆蓋已確認資料。
