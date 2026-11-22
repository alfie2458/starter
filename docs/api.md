# STARGRID API（Phase 2–7 初始入口）

啟動：

```bash
node server/index.mjs
```

目前提供最小 HTTP 入口：

| Method | Path | 用途 |
|---|---|---|
| GET | `/health` | 健康檢查 |
| POST | `/tasks` | 建立 Task |
| POST | `/tasks/:id/transition` | 執行合法 Task 狀態轉移 |
| POST | `/knowledge/drafts` | 建立 Knowledge 草稿 |
| POST | `/knowledge/:id/publish` | 發布 Knowledge Note |
| POST | `/exams` | 建立 Exam Notification |
| POST | `/study-plans` | 依考試與時段產生 Study Plan |
| POST | `/automations/validate` | 驗證 trigger/action allowlist |
| POST | `/agents/select` | 依能力選擇 Agent |
| POST | `/gamification/award` | 寫入 XP/coin ledger |
| GET | `/gamification/balance` | 查詢成員餘額 |
| GET | `/events` | 查看本次程序的協調事件 |

目前是 process-local memory store，重啟後資料會消失。正式儲存 adapter、認證 middleware、rate limit、schema validator 與 external provider 仍需後續接入；不得將此初始入口視為 production deployment。
