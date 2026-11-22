# 安全政策

STARGRID 以 GitHub 為控制平面。秘密只可存放於 GitHub Secrets/Environments 或受控執行環境；程式碼、fixture、README、Issue、PR 與 CI log 不得包含秘密。

## 回報

請勿在公開 Issue 張貼敏感資料。Repository owner 應使用 GitHub Private vulnerability reporting（若方案支援），否則以受限管道聯絡維護者。

## Phase 1 基線

- Actions 預設最小 `GITHUB_TOKEN` 權限
- 不在 fork PR 執行受信任部署或讀取 production secrets
- 依賴與 workflow 固定版本並定期更新
- 日誌只保留必要且已脫敏的資訊
- 發現疑似洩漏時先撤銷/輪替，再處理 Git 歷史
