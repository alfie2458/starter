# Phase 1：基礎架構、身份與權限

## 完成定義

- Monorepo 目錄與資料契約可被檢查
- CI 對每個 Pull Request 執行 repository check、測試與 secret-safe 規則
- 所有 secret 只以環境變數名稱描述，不含真值
- 身份、權限、資料分類與 AI 不可信輸入邊界有文件紀錄
- README 能引導新成員從零開始理解專案

## 尚未自動化的管理員設定

Branch protection、Organization team、Actions allowed actions、Secret Scanning、Dependabot 與 Environment reviewers 可能受 GitHub 方案或管理員權限限制；本提交不自行修改這些設定，改由管理員依 `docs/phase-1.md` 逐項確認。
