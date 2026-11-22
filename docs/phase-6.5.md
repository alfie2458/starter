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
- GitHub identity resolver 與 workspace-level authorization
- Actor-aware rate limit、request timeout、structured JSON log 與 metrics endpoint
- Event queue retry / dead-letter primitives
- Backup checksum 與 retention policy
- GitHub identity resolver 與 workspace-level authorization
- Actor-aware rate limit、request timeout、structured JSON log 與 metrics endpoint
- Event queue retry / dead-letter primitives
- Backup checksum 與 retention policy
- Graceful shutdown
- JSON store backup / restore 腳本

## 尚待完成

- 正式 broker 與跨程序鎖
- production metrics/tracing backend 與 alert routing
- secret scanning、依賴固定 SHA 與 fork PR policy 的管理員驗證
- 備份 retention 的實際排程、restore drill 與 production Environment reviewer

完成 Phase 6.5 前，不把服務標記為 production-ready。
