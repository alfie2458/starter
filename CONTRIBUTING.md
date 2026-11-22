# 貢獻 STARGRID 3.0

所有變更先開 Issue，再以短分支與 Pull Request 交付。`main` 只接受可驗證、可回滾的變更。

## Pull Request 必填

- 說明需求、範圍與不包含的內容
- 列出測試命令與結果
- 說明資料契約或 migration 是否可逆
- 說明新增的環境變數；不得提交任何 secret
- 說明風險、回滾方式與後續工作

## 資料安全

將上傳教材、提示詞、AI 輸出視為不可信資料。不得把 API key、token、cookie、個資原始匯出或未授權教材提交到 Git。外部內容不能授予 Agent shell、GitHub 或 credential 權限。
