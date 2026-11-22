# STARGRID 3.0 全階段路線

這份文件回答三個問題：**目前已經完成什麼？每個階段還缺什麼？下一個可驗收的目標是什麼？**

STARGRID 採 GitHub 優先的單一 Monorepo。每個 Phase 先建立資料契約、權限邊界與可回溯的協作流程，再逐步加入可運行的 domain logic、adapter 與正式部署能力。

> **重要狀態定義：**「已建立」代表程式碼、契約或文件基線已存在；不代表已通過完整測試、不代表已接上外部 provider，也不代表已 production-ready。

## 狀態總覽

| 階段 | 範圍 | 現況 | 未完成的主要工作 |
|---|---|---|---|
| Phase 1 | GitHub、Monorepo、身份與權限 | 核心骨架已建立 | 正式登入、Organization / Team 與平台級分支治理 |
| Phase 2 | Knowledge、AI Publisher、Learning、Exam Planner | 契約與核心流程已建立 | 真實 provider、來源擷取、人工審核與前端 |
| Phase 3 | Task、Calendar、Automation、Notification、History | 核心 domain、API 與事件基線已建立 | 正式儲存、worker、外部同步與通知投遞 |
| Phase 4 | Agent Orchestration、模型、額度與審計 | registry、quota、fallback 基線已建立 | 真實模型 adapter、持久化 reservation 與執行 worker |
| Phase 5 | Gamification | ledger、成就、排行榜與反濫用邊界已建立 | 正式查詢模型、管理介面、規則版本化與營運工具 |
| Phase 6 | 跨引擎整合 | Event Bus、History consumer、retry 基線已建立 | 正式 broker、跨程序一致性、失敗補償與 tracing |
| Phase 6.5 | P0/P1 平台硬化 | 核心硬化第一批已完成 | Production backend、演練、告警與 GitHub 管理員設定 |
| Phase 7 | QA、安全、備份與正式發布 | 尚未完成，僅有 CI / 文件基線 | 完整驗收、滲透與壓測、release gate、正式部署 |

## 待解決問題索引

完整的逐項清單、優先級與驗收條件放在[待解決問題清單](open-issues.md)。以下依階段列出目前仍未完成的事項。

### Phase 1：GitHub 基礎架構、身份與權限

- 接上正式 OAuth / GitHub App 登入流程，並處理 callback、session、token rotation 與撤銷。
- 建立 GitHub Organization / Team 的正式成員同步；目前 Repository 只有 owner `alfie2458`，尚無 Organization 或 Teams。
- 將 workspace membership 與 GitHub team membership 做可驗證的同步與離職撤權流程。
- 定義管理員、維護者、成員、唯讀者等正式角色的最小權限矩陣，並補齊 UI / API 管理流程。
- Branch protection 目前受 Private Repository 方案限制，GitHub 回覆需升級 Pro 或改為公開 Repository；需在方案允許後啟用 required review、status checks 與 force-push 限制。
- 建立 production secrets、Environment 與權限分離，不把開發 token 當正式身份系統。

### Phase 2：Knowledge、Learning、Exam Planner

- 接上真實的內容擷取與 AI provider adapter，包含 timeout、quota、provider failure 與成本記錄。
- 補齊 URL / 文件來源的內容清理、來源可信度、版本差異與重複內容處理。
- 完成 AI Knowledge Publisher 的人工審核、`needs_review` 工作佇列、發布、駁回與修訂介面。
- 將 Study Plan 從基礎產生器提升為可持續更新、可解釋、可手動覆寫的規劃流程。
- 補齊 Knowledge、Learning、Exam 的正式儲存與 migration；目前仍依賴記憶體或 JSON 基線。
- 建立內容刪除、版權來源與使用者資料保留政策。

### Phase 3：Task、Calendar、Automation、Notification、History

- 以正式資料庫取代 JSON store，支援索引、交易、併發更新與 migration。
- 建立背景 worker，將 Automation execution、notification delivery 與 retry 從 HTTP request lifecycle 分離。
- 接上 Calendar provider adapter，處理 OAuth、同步游標、重複事件、時區與 provider rate limit。
- 接上 Email / push / in-app notification adapter，建立 delivery status、退信、重送與偏好設定。
- 完成 Automation 的排程觸發、執行記錄、取消、超時、dead-letter replay 與管理操作。
- 補齊 History 的查詢、分頁、保留期限與個資遮罩策略。

### Phase 4：Agent Orchestration、模型、額度與審計

- 接上真實模型 provider，建立統一 adapter、模型能力宣告、錯誤分類與 fallback policy。
- 將 quota reservation 從記憶體 primitive 提升為可交易、可恢復、可對帳的 reservation ledger。
- 建立 agent job worker、排程、取消、超時、重試與結果持久化。
- 加入 prompt / model / provider 版本記錄，讓每次 AI 結果可重現與可追蹤成本。
- 完成敏感輸入遮罩、provider payload policy、輸出安全檢查與人工升級路徑。
- 為 workspace 與成員提供可查詢的使用量、成本與配額管理介面。

### Phase 5：Gamification

- 將 XP、coin、achievement 與 leaderboard ledger 接到正式資料庫與交易邊界。
- 完成成就條件、排行榜分頁、時間區間、workspace scope 與隱私設定的產品介面。
- 將 anti-abuse 規則版本化，並建立管理員審查、凍結、解凍與 correction workflow。
- 定義重複事件、退款、撤銷與資料修正對 XP / coin 的可逆計算規則。
- 建立營運報表，能偵測異常刷分、異常任務完成率與 ledger 不平衡。
- 補齊獎勵通知、成就解鎖事件與跨 workspace 權限檢查。

### Phase 6：跨引擎整合

- 以正式 broker 取代 process-local Event Bus，支援 durable delivery、consumer group、ordering 與 replay。
- 將 idempotency、retry、dead-letter 與 outbox / inbox 邊界落到跨程序一致性設計。
- 為每個 consumer 建立 failure isolation、補償動作、人工 replay 與 poison message 流程。
- 將 History、Audit、Gamification、Notification 等 consumer 的事件契約做版本相容與 migration。
- 補上跨引擎 tracing、correlation ID、事件延遲與 consumer lag 指標。
- 完成整合測試：Task → Event → History、Exam → Notification、Agent → Gamification 等關鍵鏈路。

### Phase 6.5：P0/P1 平台硬化

已落地第一批：Bearer auth、fail-closed config、runtime validation、body limit、atomic JSON write、request ID、rate limit、readiness、graceful shutdown、structured log、metrics 基線、backup / restore、bounded retry、dead-letter primitive、GitHub identity 與 workspace authorization，以及 workflow Action SHA pinning。

仍待完成：

- 正式 broker 與跨程序鎖，避免單程序 primitive 在多 instance 下失效。
- Production metrics / tracing backend、dashboard、SLO、alert routing 與 on-call runbook。
- 實際 backup schedule、異地或不可變備份、restore drill、RPO / RTO 驗收與資料完整性報告。
- Production Environment reviewer、部署 approval、rollback 與 migration gate。
- GitHub Secret Scanning、Push Protection、Dependabot、CodeQL 的管理員設定與執行結果確認；目前 API 沒有提供可用的 security analysis 狀態。
- Repository-level Actions policy 目前仍是 `allowed_actions: all`、`sha_pinning_required: false`；需在方案與權限允許時收窄 allowlist 並強制 pinning。
- 建立依賴漏洞處理期限、security incident runbook、token rotation 與撤銷演練。

### Phase 7：QA、安全測試、備份與正式發布

- 建立 unit、contract、integration、API、worker、migration、property-based 與 end-to-end 測試矩陣。
- 補上 P0/P1 regression gate；目前尚未完成本地與 CI 的完整驗收執行。
- 進行 authentication、authorization、tenant isolation、prompt injection、webhook、重放、rate limit 與資料外洩測試。
- 進行壓力、併發、故障注入、queue backlog、provider timeout 與恢復測試。
- 完成 backup restore drill、資料 migration rehearsal、rollback rehearsal 與 release checklist。
- 建立 production deployment、health/readiness gate、Environment approval、版本標籤與 changelog 流程。
- 完成前端、管理後台、可觀測性 dashboard、操作手冊、維運值班與正式上線決策紀錄。
- 通過所有 P0/P1 驗收後，才可將服務標記為 production-ready。

## GitHub 目前已知平台限制

截至最近一次唯讀檢查：

- Repository `alfie2458/starter` 是 Private，default branch 為 `main`。
- Collaborator 目前只有 owner `alfie2458`。
- Branch protection API 回覆需要 GitHub Pro 或公開 Repository，因此尚未啟用。
- Actions 已啟用；Repository policy 為允許所有 Actions，且未強制 SHA pinning。
- Repository workflow 本身已將 `actions/checkout` 與 `actions/setup-node` 固定到 immutable commit SHA。
- 尚未建立 Organization / Team。
- Security analysis API 沒有回傳可用設定資料；不能據此宣稱 Secret Scanning、Push Protection、Dependabot 或 CodeQL 已啟用。

## 交付原則

每個階段至少要留下：

- 可版本化的資料契約
- 明確的權限與安全邊界
- 可回溯的事件或審計紀錄
- 可驗收的 Issue / PR
- 已知限制、風險與回滾方式
- 不把未完成能力描述成正式上線
