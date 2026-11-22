# STARGRID 3.0 全階段路線

這份文件回答兩個問題：**目前已經搭到哪裡？下一步要把什麼變成正式能力？**

STARGRID 採 GitHub 優先的單一 Monorepo。每個 Phase 先建立資料契約、權限邊界與可回溯的協作流程，再逐步加入可運行的 domain logic、adapter 與正式部署能力。

## 狀態總覽

| Phase | 範圍 | 目前狀態 | 下一個重點 |
|---|---|---|---|
| 1 | GitHub、Monorepo、身份與權限 | 核心骨架已建立 | Organization / Team / Branch protection 管理員設定 |
| 2 | Knowledge、AI Publisher、Learning、Exam Planner | 契約與核心流程已建立 | 真實 provider、來源篩選與人工發布介面 |
| 3 | Task、Calendar、Automation、Notification、History | Task API 與 domain logic 已建立 | 正式儲存、外部 Calendar、通知與執行 worker |
| 4 | Agent Orchestration、模型、額度與審計 | registry、選擇與 quota 核心已建立 | provider adapter、reservation ledger、fallback worker |
| 5 | Gamification | ledger 與規則邊界已建立 | 成就、排行榜、反灌水與更正流程 |
| 6 | 跨引擎整合 | coordination event 基礎已建立 | 事件消費者、權限串接、重試與可觀測性 |
| 7 | QA、安全、備份與發布 | 文件與 CI 基線已建立 | 完整測試、restore 演練與正式 Environment 審核 |

> **狀態說明：**「核心已建立」代表目前有可讀、可組合的 domain logic 或 API 骨架；不代表已完成正式身份、資料庫、外部服務同步或 production deployment。

## 依照你的目標開始

### 想先理解產品

先讀根目錄 [README](../README.md)，再看 [ADR 0001](adr/0001-github-first-monorepo.md)。

### 想呼叫目前的 API

看 [API 操作文件](api.md)，從 `/health`、Task API 與 `STARGRID_DATA_FILE` 開始。

### 想新增一個引擎功能

1. 先定義跨模組資料是否需要 JSON Schema。
2. 在對應 `engines/<name>/src/` 寫 domain logic。
3. 透過 coordination event 與其他引擎溝通，不直接讀取彼此內部資料。
4. 在 Issue 與 PR 中寫清楚測試、風險、migration 與回滾方式。

### 想接外部服務或 AI

先實作 adapter，再將 provider 連線資訊放進受保護的 Secrets / Environment。外部輸入永遠視為不可信資料，不得因此取得 Shell、GitHub 寫入權或其他成員的秘密。

## Phase 交付原則

每個階段至少要留下：

- 可版本化的資料契約
- 明確的權限與安全邊界
- 可回溯的事件或審計紀錄
- 可驗收的 Issue / PR
- 已知限制、風險與回滾方式
- 不把未完成能力描述成正式上線
