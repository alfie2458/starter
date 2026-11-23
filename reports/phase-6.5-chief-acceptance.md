# STARGRID 3.0 Phase 6.5 Chief Architect 驗收報告

## 驗收範圍

本次以「先修復現有程式碼，再驗證平台基線」為原則，實際委派 Backend、Security、QA、Agent Systems、Architecture 五個子 Agent。所有子 Agent 均讀取實際 Repository，並留下獨立報告；沒有公開 Repository、刪除資料、修改 Organization 管理員或正式部署。

## 子 Agent 委派與成果

| 子 Agent | 實際交付 |
|---|---|
| Backend Agent | 修復 `server/app.mjs` 重複 import、重複變數、重複 `/metrics` 路由與資料路由提前返回；加入 Workspace collection/detail filtering 與 object ownership checks。報告：[phase-6.5-backend.md](phase-6.5-backend.md) |
| Security Agent | 修復 task transition、knowledge publish、study-plan、automation execution 的跨 Workspace IDOR；補上 gamification scoped ledger 與 adversarial tests。報告：[phase-6.5-security.md](phase-6.5-security.md) |
| QA Agent | 新增 Phase 6.5 executable QA tests，涵蓋 syntax、API integration、workspace authorization、cross-workspace isolation、quota、fallback、JSON persistence。報告：[phase-6.5-qa.md](phase-6.5-qa.md) |
| Agent Systems Agent | 強化 registry validation、quota request validation、fallback capability filtering、credential redaction、mock/provider 標示與 invocation audit。報告：[phase-6.5-agent-systems.md](phase-6.5-agent-systems.md) |
| Architecture Agent | 完成實作與 STARGRID 規格差距矩陣，列出 implemented / partial / missing / inconsistent 與 P0/P1 gaps。報告：[phase-6.5-architecture.md](phase-6.5-architecture.md) |

## 修復前後差異

### Backend / API

修復前，`server/app.mjs` 含有重複的 `requireWorkspaceAccess` 與 observability imports、重複的 `metrics/logger` 宣告，以及重複的 `/metrics` route，Node module 會在載入階段失敗。`GET /events`、`GET /tasks`、`GET /tasks/:id` 在共用 Workspace authorization block 前就返回資料，並且多個 collection route 沒有按 Workspace 過濾。

修復後，所有非公開 data routes 先解析 body/query 的 `workspace_id`，再執行 Workspace authorization。`/events`、`/tasks`、`/knowledge`、`/exams`、`/automations`、`/automation-runs`、`/audit`、`/agents`、`/calendar/events`、`/notifications` 會按 Workspace scope；detail 與 mutation routes 會檢查目標 record 所屬 Workspace，不符合時返回既有的 not-found 行為，避免洩漏跨租戶存在性。

另外發現 Agent Systems 的候選範圍仍是全域 registry。現已修復 `/agents/select` 與 `/agents/dispatch`：Workspace-specific Agent 只能在相同 Workspace 使用；`workspace_id` 為 null 的 shared Agent 可被已授權 Workspace 使用。

### Agent 系統

修復前，registry 對 status、limit、capability 的輸入約束不足，explicit fallback 沒有確認 capability 相容，HTTP dispatch 的 synthetic fixture 沒有清楚標示為 mock，也缺少 redacted invocation audit。

修復後，registry、quota、fallback、credential redaction 與 audit 均有回歸測試。HTTP dispatch 回傳明確的 `execution_mode: mock` 與 `provider_kind: mock`；這不是實際 AI provider 執行，不能宣稱是真實模型結果。真正 provider adapter、成本、RPM、timeout、durable reservation 與 output safety 仍未完成。

### Repository 檢查器

原本 repository secret scanner 使用過短的 provider prefix pattern，會把 `task-service` 等普通 source path 與報告文字誤判為 secret。現在改為要求 realistic token length：短普通字串不再誤判，長 token、GitHub token、private key 與 AWS access key pattern 仍會檢查。

## 實際驗收結果

以下命令均由 Chief Architect 主流程實際執行：

```text
npm test
15 tests passed, 0 failed, 0 skipped

npm run format:check
format check passed

npm run check
repository check passed (8 required files)

node --check for every discovered .mjs under server/, engines/, packages/, scripts/, tests/
checked 50 files; passed
```

測試涵蓋：JavaScript syntax、Phase 2 contract/unit tests、workspace authorization、API integration、GET `/tasks`、GET `/tasks/:id`、GET `/events` isolation、cross-workspace transition/study-plan isolation、Agent quota reservation/settlement、fallback release、JSON concurrent persistence、registry validation、credential redaction、mock labeling、invocation audit、incompatible fallback rejection，以及 Agent selection/dispatch isolation。

## 剩餘 P0 問題

1. 正式資料庫、durable broker、outbox/inbox、跨程序鎖與多 instance 一致性尚未完成；目前 JSON、Event Bus、quota 與 audit 仍以 process-local / development primitive 為主。
2. 正式 GitHub OAuth / GitHub App session、token rotation/revocation、邀請制成員 lifecycle、Organization / Team 同步與正式 role-admin API 尚未完成。
3. 真實 AI/provider adapter、provider allowlist、timeout/error taxonomy、成本與 quota governance、輸入遮罩與輸出安全尚未完成。現有 Agent dispatch 明確為 mock。
4. 備份排程、不可變或異地備份、restore drill、RPO/RTO evidence、migration/rollback rehearsal 尚未完成。
5. Production observability backend、tracing、SLO、alert routing、Environment reviewer、release approval 與 on-call runbook 尚未完成。
6. Phase 7 完整測試 gate 尚未完成，包括 worker、migration、E2E、concurrency、failure injection、security regression 與 production recovery evidence。

## 剩餘 P1 問題

- Route-level role enforcement；目前 `requireWorkspaceAccess` 支援 roles，但敏感 route 尚未全面要求 maintainer/admin。
- Service identity 與 `allowInsecureLocal` 的 deployment isolation、credential rotation 與最小權限治理。
- Gamification 的 member-to-workspace ownership、achievement/correction workspace invariants 與 transaction/reconciliation。
- Knowledge Publisher 的真實 source ingestion、reviewer authorization、reject/revise lifecycle、audit/event 與人工審核介面。
- Exam Planner 的來源擷取、confirmed/manual override、持續重規劃、衝突處理、通知與正式儲存。
- Task / Calendar / Automation worker、scheduler、取消、timeout enforcement、外部 Calendar / notification provider 與 durable replay。
- Agent RPM enforcement、operator-managed fallback policy、circuit breaker、durable job/result、成本報表與 role-gated registry changes。
- GitHub Branch protection、Actions allowlist / forced SHA pinning、Secret Scanning、Push Protection、Dependabot、CodeQL、fork policy 與 production Environment reviewer；其中部分受目前 Private Repository 方案限制。
- History query、pagination、retention、masking，以及 Task / Calendar 等文件承諾的完整 coordination event publication。

## 驗收結論

Phase 6.5 的第一批 P0/P1 修復與測試基線已完成，現在的 Repository 可通過語法、格式、repository hygiene 與 15 項回歸測試。但仍應標記為 alpha/core baseline，不得稱為 production-ready；上述 P0 與 Phase 7 release evidence 完成前，不進入新增產品功能開發。
