# STARGRID 3.0 待解決問題清單

本文件是 STARGRID 目前的未完成事項總表，按產品 Phase 排序。它把「尚未實作」、「已有程式基線但尚未正式化」與「受 GitHub 方案或管理員設定限制」分開，避免把文件或 primitive 誤認成已上線能力。

## 優先級定義

- **P0：** 未完成前不可宣稱 production-ready，涉及身份、資料完整性、越權、可靠性或正式發布阻擋。
- **P1：** 正式環境前應完成，否則會造成重要功能不可用、難以維運或缺乏可驗收證據。
- **P2：** Phase 7 後持續維護、產品深化或營運改善；不阻擋目前的骨架開發。

## Phase 1：GitHub、Monorepo、身份與權限

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P0 | 正式 OAuth / GitHub App 登入、session、token rotation 與撤銷 | 實作 | 可登入、登出、撤銷，並有失效 token 的測試與 audit |
| P0 | 正式角色與 workspace authorization 管理流程 | 實作 | 管理員可邀請、撤權、變更角色；所有路由均有 tenant isolation 驗收 |
| P1 | GitHub Organization / Team 同步 | 平台 / 實作 | 成員與 team membership 可同步，離職或移除後能撤銷存取 |
| P1 | production Secrets / Environments 與權限分離 | 管理員設定 | production secret 不出現在 repository、log 或 PR，部署權限可審計 |
| P1 | Branch protection | GitHub 限制 | GitHub 方案允許後啟用 required review、status check、force-push 限制 |
| P2 | CODEOWNERS、release maintainer 與多管理員治理 | 維運 | 有至少兩個可輪替的審查角色與明確交接流程 |

目前已知平台狀況：Repository 是 Private，只有 owner `alfie2458`，尚無 Organization / Team；Branch protection API 回覆需要 GitHub Pro 或公開 Repository。

## Phase 2：Knowledge、Learning、Exam Planner

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P1 | 真實內容擷取與 AI provider adapter | 實作 | 有 timeout、quota、錯誤分類、成本記錄與 provider fallback |
| P1 | URL / 文件來源清理、可信度、版本差異與去重 | 實作 | 相同來源不重複污染知識庫，所有內容保留 source lineage |
| P1 | `needs_review` 人工審核與 Knowledge Publisher 介面 | 實作 | 可提交、審核、駁回、修訂、發布並保留 reviewer audit |
| P1 | Study Plan 持續更新與手動覆寫 | 實作 | 計畫變更可解釋，可由成員調整且不破壞原始考試範圍 |
| P1 | Knowledge / Learning / Exam 正式資料庫與 migration | 基礎設施 | 可交易寫入、可備份、可 migration、可 rollback |
| P2 | 版權、刪除請求、資料保留與匯出政策 | 治理 | 有可執行的 deletion / export 流程與文件 |

## Phase 3：Task、Calendar、Automation、Notification、History

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P0 | 正式資料庫取代 JSON store | 基礎設施 | 交易、索引、併發更新、migration、backup 與 restore 通過驗收 |
| P1 | 背景 worker 與 Automation execution lifecycle | 實作 | HTTP request 與長任務分離，支援 timeout、取消、retry、dead-letter |
| P1 | Calendar provider adapter | 外部整合 | OAuth、時區、同步游標、重複事件與 rate limit 有測試 |
| P1 | Email / push / in-app notification delivery | 外部整合 | 有 delivery status、退信、重送、偏好與 audit |
| P1 | Automation 排程與管理操作 | 實作 | 可建立、暫停、取消、重跑與查閱每次 execution |
| P2 | History 查詢、分頁、保留期限與個資遮罩 | 實作 / 治理 | 大量資料查詢可用，敏感欄位依角色遮罩 |

## Phase 4：Agent Orchestration、模型、額度與審計

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P0 | 真實模型 provider adapter 與安全邊界 | 外部整合 | 有能力宣告、timeout、錯誤分類、fallback、輸入輸出安全檢查 |
| P0 | quota reservation ledger 正式化 | 基礎設施 | reservation 可交易、可恢復、可對帳且不會重複扣額度 |
| P1 | Agent job worker、取消、超時、重試與結果持久化 | 實作 | 任務可查、可追蹤、可恢復，失敗不遺失狀態 |
| P1 | prompt / model / provider 版本與成本追蹤 | 可觀測性 | 每個 AI 結果均可追溯版本、token / cost 與 workspace |
| P1 | 敏感輸入遮罩與 provider payload policy | 安全 | secrets、個資與內部規則不被送到不允許的 provider |
| P2 | workspace 使用量、成本與 quota 管理介面 | 產品 | 成員與管理員可查詢使用量並依權限調整配額 |

## Phase 5：Gamification

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P1 | XP / coin / achievement / leaderboard 正式儲存 | 基礎設施 | ledger 寫入具交易性，可對帳與復原 |
| P1 | 成就與排行榜產品介面 | 產品 | 支援分頁、時間區間、workspace scope 與隱私設定 |
| P1 | anti-abuse 規則版本化與 correction workflow | 安全 / 營運 | 可審查、凍結、解凍、修正並保留完整 audit |
| P1 | 重複事件、退款、撤銷的可逆計算 | 正確性 | 任何 correction 不會破壞 ledger 平衡 |
| P2 | 異常刷分報表與營運工具 | 營運 | 可發現異常並產生管理員處理佇列 |
| P2 | 獎勵通知與跨 workspace 權限整合 | 整合 | 成就事件只會通知有權限的成員 |

## Phase 6：跨引擎整合

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P0 | 正式 broker、durable delivery、consumer group 與 replay | 基礎設施 | 多 instance 下可恢復、可重播，且不遺失事件 |
| P0 | outbox / inbox、idempotency 與跨程序一致性 | 正確性 | 失敗重試不產生重複副作用，資料可對帳 |
| P1 | consumer failure isolation、補償與 poison message 流程 | 可靠性 | 單一 consumer 故障不拖垮全平台，可人工 replay |
| P1 | 事件契約版本相容與 migration | 契約 | History、Audit、Gamification、Notification 可安全升級 |
| P1 | tracing、correlation ID、lag 與事件延遲指標 | 可觀測性 | 可由一個 request 追到事件與 consumer 結果 |
| P1 | 關鍵跨引擎整合測試 | QA | Task → History、Exam → Notification、Agent → Gamification 通過 |

## Phase 6.5：P0/P1 平台硬化

已完成的第一批硬化包括 Bearer auth、fail-closed config、runtime validation、body limit、atomic JSON write、request ID、rate limit、readiness、graceful shutdown、structured logging、metrics 基線、backup / restore、bounded retry、dead-letter primitive、GitHub identity、workspace authorization，以及 workflow Action SHA pinning。

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P0 | 正式 broker 與跨程序鎖 | 基礎設施 | 多 instance / 多 worker 的一致性與故障測試通過 |
| P0 | production metrics / tracing backend 與告警 | 維運 | 有 dashboard、SLO、alert routing、on-call runbook |
| P0 | 備份排程、不可變備份與 restore drill | 資料可靠性 | RPO / RTO 有證據，能完成定期復原演練 |
| P0 | Production Environment reviewer、approval、rollback、migration gate | 發布治理 | production deploy 需要審批且可安全回滾 |
| P1 | Secret Scanning、Push Protection、Dependabot、CodeQL | GitHub 設定 | 管理員於 UI 確認啟用狀態，並有實際執行結果 |
| P1 | Repository Actions allowlist 與強制 SHA pinning | GitHub 設定 | 將 `allowed_actions: all` 收窄並將 `sha_pinning_required` 設為 true（若方案支援） |
| P1 | 依賴漏洞與 security incident runbook | 安全治理 | 有處理期限、token rotation、撤銷與演練紀錄 |

目前 Actions workflow 內已固定 SHA，但 Repository 層級仍是 `allowed_actions: all`、`sha_pinning_required: false`。Security analysis API 沒有回傳可用狀態，因此不能宣稱相關安全功能已啟用。

## Phase 7：QA、安全測試、備份與正式發布

| 優先級 | 待解決問題 | 類型 | 完成條件 |
|---|---|---|---|
| P0 | 完整測試矩陣與 P0/P1 regression gate | QA | unit、contract、integration、API、worker、migration、E2E 在 CI 通過 |
| P0 | authentication、authorization、tenant isolation 與資料外洩測試 | 安全 | 越權、重放、prompt injection、webhook 與 rate limit 測試通過 |
| P0 | 壓力、併發、故障注入與恢復測試 | 可靠性 | queue backlog、provider timeout、DB / broker 故障可恢復 |
| P0 | migration、backup restore 與 rollback rehearsal | 發布 | 有演練紀錄、成功標準與失敗處置 |
| P0 | production deployment 與 release gate | 發布 | health/readiness、Environment approval、tag、changelog 完整 |
| P1 | 前端與管理後台 | 產品 | 成員、審核、權限、任務、學習與維運流程可操作 |
| P1 | 操作手冊、dashboard 與值班制度 | 維運 | 新維護者可依 runbook 完成部署、排障與回滾 |
| P2 | 上線後產品優化與營運分析 | 產品 | 依實際使用數據排定 Phase 7 後維護工作 |

## 目前不可宣稱的事項

在 P0 項目、完整測試與正式備份復原演練完成前，STARGRID 不應宣稱具備以下能力：正式 production deployment、完整多租戶隔離、可承諾的資料持久性、可承諾的事件至少一次投遞、完整 GitHub 安全治理、正式 AI provider SLA，或 production-ready 狀態。
