# Phase 6.5：Platform Hardening

Phase 6.5 集中處理正式上線前的硬化工程，不新增產品功能，專注降低資料遺失、越權、重複副作用與不可觀測風險。

## 硬化清單

- **認證與權限：** Bearer token、fail-closed 設定、後續 GitHub identity middleware、workspace scope。
- **輸入與輸出：** JSON Schema/runtime validation、body size limit、安全錯誤訊息、敏感欄位遮罩。
- **持久化：** 原子寫入、同檔寫入排隊、啟動載入、備份與 restore 演練。
- **併發與冪等：** idempotency key、quota reservation、Automation run 去重、事件去重。
- **可觀測性：** Request ID、audit event、redacted log、readiness check、失敗狀態。
- **供應鏈：** workflow 最小權限、依賴固定版本、secret scanning、fork PR 不取得 secrets。
- **復原與發布：** migration/rollback、production reviewer、backup retention 與 disaster recovery 演練。

完成 Phase 6.5 前，不把服務標記為 production-ready。
