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
- Graceful shutdown
- JSON store backup / restore 腳本

## 尚待完成

- 正式 broker 與跨程序鎖
- production metrics/tracing backend 與 alert routing
- secret scanning、Push Protection、Dependabot、CodeQL 與 fork PR policy 的管理員驗證
- Repository Actions allowlist 與強制 SHA pinning；目前 workflow 內已固定 SHA，但 Repository policy 仍允許所有 Actions，且未強制 pinning
- 備份 retention 的實際排程、不可變備份、restore drill 與 production Environment reviewer
- RPO / RTO 驗收、rollback / migration gate、security incident runbook 與 token rotation 演練

## GitHub 唯讀檢查結果

- Repository `alfie2458/starter` 為 Private，default branch 為 `main`。
- Collaborator 目前只有 owner `alfie2458`，尚未建立 Organization / Team。
- Branch protection API 回覆需要 GitHub Pro 或公開 Repository，因此目前無法啟用。
- Actions 已啟用；Repository policy 為 `allowed_actions: all`、`sha_pinning_required: false`。
- Security analysis API 沒有回傳可用狀態；不能據此宣稱 Secret Scanning、Push Protection、Dependabot 或 CodeQL 已啟用。

完成 Phase 6.5 前，不把服務標記為 production-ready。
