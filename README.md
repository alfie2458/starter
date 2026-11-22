# STARGRID 3.0

> **把學習資料、任務、考試與 AI 協作，組織成一個可追蹤、可共同建設的學習星系。**

STARGRID 是一個**邀請制、多人協作、AI Agent 驅動的學習平台**。它以 GitHub 作為協作控制平面：教材、知識筆記、考試資料、任務與系統規則都保留來源、版本與變更脈絡，讓 AI 協助整理，但不讓自動化取代成員的判斷與治理。

[快速開始](#快速開始) · [目前能做什麼](#目前能做什麼) · [系統地圖](#系統地圖) · [API 入口](docs/api.md) · [貢獻方式](CONTRIBUTING.md)

---

## 為什麼是 STARGRID？

學習社群常見的問題不是「沒有資料」，而是資料散落、重複整理、考試範圍容易遺失、任務彼此不連動，也很難知道一份 AI 整理結果從哪裡來。

STARGRID 的做法是把協作流程本身產品化：

- **共享，但不混亂：** 每份資料都有 workspace、來源、版本與狀態。
- **AI 協助，但不盲信：** 不確定的整理結果會進入 `needs_review`，而不是被靜默發布。
- **自動化，但有邊界：** Automation 只能使用 allowlist 的 trigger/action，不允許任意程式碼執行。
- **開放協作，但保留治理：** 成員可以共同編輯與提交 PR，管理員負責身份、權限、秘密與正式發布。
- **先從 GitHub 做好：** 初期不急著包一層 Web App，先把資料契約、事件、審計與協作規則打穩。

## 目前能做什麼？

目前專案已從空 Repository 重建出完整平台骨架，並有一個可呼叫的最小 API：

### 已可使用的核心能力

- 建立與轉移 Task 狀態
- Knowledge Note 草稿與發布狀態管理
- 考試通知與 Study Plan 基礎產生
- Automation trigger/action allowlist 驗證
- Agent capability 選擇與 quota reservation
- XP / 金幣 ledger 與每日上限
- Coordination Event 與去重
- Task API runtime validation
- 可選 JSON 檔案持久化
- Bearer Token、Request ID、body size limit 與 rate limit

### 仍在建置中的部分

目前仍不是正式生產部署。以下能力需要後續實作或管理員設定：

- 正式身份登入與 GitHub Organization / Team 整合
- 正式資料庫或高併發儲存 adapter
- 真實 AI provider 與模型額度調度
- Calendar / Notification 的外部服務同步
- 完整前端介面
- Branch protection、Secret Scanning、Dependabot 與 Production Environment reviewer
- 備份與復原演練

這些限制會被明確記錄，不會把「已建立骨架」描述成「已正式上線」。

## 快速開始

### 1. 需求

- Node.js 20 或以上
- Git
- 若要呼叫受保護 API，需要設定 `STARGRID_API_TOKEN`

### 2. 啟動 API

正式一點的本機方式：

```bash
STARGRID_API_TOKEN=change-me node server/index.mjs
```

只在隔離的本機開發環境暫時免 Token：

```bash
STARGRID_ALLOW_INSECURE_LOCAL=true node server/index.mjs
```

啟動後可以查看：

```bash
curl http://localhost:3000/health
```

更多 endpoint、請求格式與持久化設定，請看 [API 操作文件](docs/api.md)。

### 3. 儲存資料（可選）

設定 `STARGRID_DATA_FILE` 後，Task 建立與狀態轉移會寫入 JSON 檔案：

```bash
STARGRID_API_TOKEN=change-me \\
STARGRID_DATA_FILE=/var/lib/stargrid/data.json \\
node server/index.mjs
```

這個 adapter 適合開發與小型部署，不適合高併發正式服務。API 所有設定都集中在 `.env.example` 與 [API 文件](docs/api.md)。

## 30 秒看懂一次 Task 請求

```bash
curl -X POST http://localhost:3000/tasks \\
  -H 'Authorization: Bearer change-me' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "workspace_id": "study-room",
    "title": "整理物理力學筆記",
    "priority": "high",
    "labels": ["physics", "review"]
  }'
```

Task 會先經過 runtime validation，再進入 domain service；合法的狀態轉移會留下 coordination event。這個流程正是 STARGRID 的核心精神：**資料先有契約，行動再有自動化，重要變更保留可追溯性。**

## 系統地圖

```text
成員 / GitHub 協作
        │
        ├── Identity ─────── 邀請、角色、權限
        ├── Knowledge ────── 來源、筆記、AI 候選、人工發布
        ├── Learning ─────── 學習計畫、考試範圍、複習安排
        ├── Task / Calendar ─ 任務、行程、協調事件
        ├── Automation ───── 受控觸發、有限重試、通知
        ├── Agent Pool ────── 能力、額度、備援、審計
        └── Gamification ──── XP、金幣、成就、團隊建設
                │
        Contracts + Events + Audit + GitHub Actions
```

### 目錄導覽

| 目錄 | 用途 | 先看哪裡 |
|---|---|---|
| `engines/` | 各平台能力與 domain logic | 各引擎 README、`src/` |
| `packages/contracts/` | 跨引擎 JSON Schema 與驗證 | [Contracts README](packages/contracts/README.md) |
| `packages/shared/` | 錯誤、事件、store 等共用核心 | `packages/shared/src/` |
| `server/` | HTTP API、認證、rate limit、runtime config | [API 文件](docs/api.md) |
| `database/` | 結構化資料範本與資料邊界 | [Database boundary](database/README.md) |
| `docs/` | ADR、Phase 文件、路線與操作說明 | [全階段路線](docs/roadmap.md) |
| `.github/` | CI、Issue template、PR template | `workflows/` |

## 想參與哪一種工作？

- **我想新增功能：** 先建立或認領 `phase-1` Issue，再開短分支與 PR。
- **我想修改資料格式：** 先更新 `packages/contracts/`，說明相容性與 migration。
- **我想接 AI provider：** 先閱讀 Knowledge Provider 與 Agent Orchestration 邊界；不要把 key 寫入程式碼。
- **我想接外部服務：** 實作 adapter，不要讓 domain logic 直接依賴 provider SDK。
- **我想改善安全性：** 先看 [SECURITY.md](SECURITY.md)，敏感問題不要放公開 Issue。
- **我想了解為什麼這樣設計：** 從 [ADR 0001](docs/adr/0001-github-first-monorepo.md) 開始。

## 專案路線圖

完整狀態請見[全階段路線文件](docs/roadmap.md)。目前規劃為：

1. **Phase 1：** GitHub 基礎架構、Monorepo、身份與權限
2. **Phase 2：** Knowledge Engine、AI Knowledge Publisher、Learning、Exam Planner
3. **Phase 3：** Task、Calendar、Automation、Notification、History
4. **Phase 4：** Agent Orchestration、模型目錄、額度與審計
5. **Phase 5：** Gamification、XP、金幣、成就與排行榜
6. **Phase 6：** 跨引擎整合、事件協調與權限串接
7. **Phase 7：** QA、安全測試、備份與正式發布

## 安全底線

教材、提示詞、AI 輸出、Webhook payload 與 GitHub 文件都視為不可信輸入；它們不能自行取得 Shell、GitHub 寫入權或 credentials。API key、OAuth secret、JWT key、資料庫密碼與 webhook secret 只能放在受保護的 Secrets / Environment，絕不提交至 Git、Issue、PR 或 CI log。

詳見 [SECURITY.md](SECURITY.md)。

## 進一步閱讀

- [API 操作文件](docs/api.md)
- [全階段路線](docs/roadmap.md)
- [Phase 1：基礎架構](docs/phase-1.md)
- [Phase 2：Knowledge 與 Learning](docs/phase-2.md)
- [ADR 0001：GitHub 優先 Monorepo](docs/adr/0001-github-first-monorepo.md)
- [貢獻指南](CONTRIBUTING.md)
- [安全政策](SECURITY.md)
