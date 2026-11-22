# Phase 6.5：Platform Hardening

Phase 6.5 集中處理正式上線前的硬化工程，不新增產品功能，專注降低資料遺失、越權、重複副作用與不可觀測風險。

## 已落地的硬化

- Bearer token 與 fail-closed 設定
- Runtime validation、body size limit、安全錯誤訊息
- 原子 JSON 寫入與同檔寫入排隊
- idempotency key、quota reservation、Automation run 去重
- Request ID、audit event、readiness check
- Event Bus bounded retry 與 History consumer
- Runtime config validation
- Graceful shutdown
- JSON store backup / restore 腳本

## 尚待完成

- GitHub identity middleware 與 workspace-level authorization
- 正式 broker、死信佇列與跨程序鎖
- 完整 redacted structured logging 與 metrics/tracing
- secret scanning、依賴固定 SHA 與 fork PR policy 的管理員驗證
- 備份 retention、restore drill 與 production Environment reviewer

完成 Phase 6.5 前，不把服務標記為 production-ready。
