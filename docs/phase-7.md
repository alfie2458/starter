# Phase 7：QA、安全、備份與發布

## 發布前清單

- 所有資料契約有版本與 migration 策略
- CI、依賴、secret scanning 與 workflow 權限已由管理員確認
- backup/restore 有演練紀錄
- production Environment 有受控 reviewer
- 沒有未授權資料、API key、token 或個資進入 Git
- 可回滾版本、風險與已知限制有記錄

本階段只建立政策與檢查界面；正式部署仍需 Repository 管理員明確批准。
