# Phase 3：Task、Calendar、Automation、Notification、History

## 邊界

Task 與 Calendar 是共享協作資料；Automation 只能使用 allowlist 的 trigger/action，不允許任意 shell 或 JavaScript。重要截止日期與已確認行程不可被自動流程覆蓋。

## 核心原則

- 時間以 UTC 儲存，輸入保留 IANA timezone。
- Automation 使用 idempotency key、bounded retry 與明確失敗狀態。
- Notification 只排程訊息，不直接取得其他成員秘密。
- History 使用 append-only 事件保存變更來源與操作者。
