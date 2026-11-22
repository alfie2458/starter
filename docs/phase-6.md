# Phase 6：跨引擎整合與事件協調

Phase 6 讓各引擎透過 versioned coordination event 溝通，不直接讀取彼此內部資料。

## 已完成

- Event Bus：訂閱、發布與事件去重
- History consumer：將重要跨引擎事件寫入 audit store
- Integration Hub：統一協調入口與 bounded retry
- correlation id、actor id、workspace scope 與 payload schema version 保留
- Task、Calendar、Notification、Automation 的歷史事件消費邊界

## 後續

正式 broker、跨程序事件投遞、死信佇列與完整可觀測性仍歸入 Phase 6.5 hardening。
