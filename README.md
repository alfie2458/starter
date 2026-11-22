# STARGRID 3.0

> 一個邀請制、多人協作、AI Agent 驅動的學習平台。以 GitHub 作為協作控制平面，先讓資料、權限與工作流程可追蹤，再逐步加入引擎與介面。

## 先用 3 分鐘了解專案

STARGRID 不把「AI」當成沒有邊界的自動化黑盒。成員提交教材、考試通知或任務後，系統會依資料契約整理、留下來源與版本，並把需要人工確認的內容標記出來。所有重要改動都應能透過 GitHub 的檔案、Issue、Pull Request 與 Actions 回溯。

目前 Repository 剛完成清空後的 Phase 1 重建，先建立可安全演進的骨架；完整學習引擎、考試規劃與 Agent 調度會依階段加入，不會把尚未存在的功能假裝成已完成。

## 從哪裡開始

### 我是第一次加入

1. 先讀 [貢獻指南](CONTRIBUTING.md)，了解分支、Pull Request 與驗收要求。
2. 再讀 [Phase 1 交付定義](docs/phase-1.md)，知道目前正在完成什麼。
3. 若要修改跨模組資料，先看 [資料契約說明](packages/contracts/README.md) 與 JSON Schema。
4. 開始工作前建立或認領一個 `phase-1` Issue，讓其他成員知道依賴與範圍。

### 我想先看系統全貌

- [架構決策 ADR 0001](docs/adr/0001-github-first-monorepo.md)：為什麼先採 GitHub 優先的單一 Monorepo。
- `engines/`：平台能力的引擎邊界，例如 identity、knowledge、learning、task 與 agent-orchestration。
- `packages/`：跨引擎共享套件與資料契約。
- `database/`：版本化的結構化資料與 migration；不得放秘密或原始個資匯出。
- `.github/`：CI、Pull Request 模板與 Phase 1 工作模板。

## 目前已完成

- Monorepo 初始目錄與 workspace 設定
- Task 與 Automation 的第一版 JSON Schema
- Repository 安全檢查與基本 secret pattern 防線
- GitHub Actions 的最小 `GITHUB_TOKEN` 權限基線
- Pull Request、Issue、貢獻與安全政策
- Phase 1 架構決策與完成定義

## 本地檢查

需要 Node.js 20 或以上。這個第一階段骨架不要求先連接外部資料庫或 AI provider：

```bash
npm run check
npm run format:check
npm test
```

如果未來引入 pnpm workspace，請使用版本化的 pnpm 與對應 lockfile；不要為了通過檢查而提交真實 `.env`、token 或 provider key。

## 資料與安全邊界

STARGRID 的外部教材、提示詞、AI 輸出、Webhook payload 與 GitHub 內容都必須視為不可信輸入。它們不能自行授予 Agent shell、GitHub 寫入權或 credential 存取權。API key、OAuth secret、JWT key、資料庫密碼與 webhook secret 只能放在受保護的 Secrets/Environment 中，絕不提交到 Git、Issue、PR 或 CI log。

詳細規則請看 [SECURITY.md](SECURITY.md)。

## 路線圖

1. **Phase 1：** 基礎架構、身份、權限、資料契約與 CI 安全基線。
2. **Phase 2：** Knowledge Engine 與 AI Knowledge Publisher。
3. **Phase 3：** Learning Engine 與 Exam Planner。
4. **Phase 4：** Task、Calendar 與 Automation。
5. **Phase 5：** Agent Orchestration Engine。
6. **Phase 6：** Gamification Engine。
7. **Phase 7：** 整合測試、安全測試、備份與正式發布。

每一階段都要留下可驗收的提交、測試結果、風險與回滾方式。若 GitHub 方案或權限無法支援某項設定，請在文件中記錄限制與替代方案，不要偷偷引入未決定的外部資料庫或服務。
