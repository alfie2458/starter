# STARGRID API（Phase 2–7 初始入口）

啟動前請設定 `STARGRID_API_TOKEN`。只有 `/health` 不需要 Bearer token；若只是本機開發，可明確設定 `STARGRID_ALLOW_INSECURE_LOCAL=true`，不可用於正式環境。

```bash
STARGRID_API_TOKEN=change-me node server/index.mjs
```

所有受保護回應都會提供 `x-request-id`。請求有大小限制、依來源 rate limit，資料目前仍以 process-local memory store 保存；`STARGRID_DATA_FILE` 預留給後續接入原子 JSON persistence。
