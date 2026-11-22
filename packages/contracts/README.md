# STARGRID Contracts

這裡放跨引擎共享的 JSON Schema。資料物件必須包含 `id`、`workspace_id`、`created_at`、`updated_at` 或明確的建立版本欄位；時間使用 UTC，使用者輸入另存 IANA timezone。

Phase 1 提供 Task、CalendarEvent、Automation 與 AutomationRun 的最小契約。Phase 2 新增 KnowledgeSource、KnowledgeNote、ExamNotification 與 StudyPlan。契約是資料驗證邊界，不等於允許任意執行 shell 或 JavaScript。
