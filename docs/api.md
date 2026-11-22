# STARGRID API（Phase 2–7 初始入口）

啟動前請設定 `STARGRID_API_TOKEN`。只有 `/health` 不需要 Bearer token；若只是本機開發，可明確設定 `STARGRID_ALLOW_INSECURE_LOCAL=true`，不可用於正式環境。

```bash
STARGRID_API_TOKEN=change-me node server/index.mjs
```

所有受保護回應都會提供 `x-request-id`。請求有大小限制、依來源 rate limit。

## Task API

建立 Task：

```http
POST /tasks
Authorization: Bearer <token>
Content-Type: application/json

{"workspace_id":"demo","title":"Review algebra","priority":"high","labels":["math"]}
```

`workspace_id` 與 `title` 必填；`status` 必須是 `inbox`、`todo`、`in_progress`、`blocked`、`done` 或 `canceled`；`priority` 必須是 `low`、`normal`、`high` 或 `urgent`；`labels` 必須是字串陣列。無效輸入會回傳 HTTP 400 與安全的錯誤代碼，例如 `INVALID_TASK_STATUS`，不會洩漏 stack trace 或環境變數。

設定 `STARGRID_DATA_FILE` 後，Task 建立與狀態轉移會以原子 JSON 寫入指定檔案；未設定時維持 process-local memory store。JSON store 適合開發與小型部署，不適合高併發正式服務或多人同時直接寫入。
