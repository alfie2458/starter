# ADR 0001：GitHub 優先的單一 Monorepo

- 狀態：Accepted
- 日期：2026-11-22

## 決策

STARGRID 3.0 採單一 Monorepo，以 GitHub Repository、Issues、Projects、Actions、Markdown、JSON 與 YAML 作為第一階段控制平面。引擎放在 `engines/`，可重用套件放在 `packages/`，跨模組資料契約放在 `packages/contracts/`。

## 原因

邀請制協作需要清楚的審計、版本與 Pull Request 邊界；初期直接使用 GitHub 原生介面比先建立 Web App 更低風險。外部服務只能透過明確 adapter 接入，不引入未經決策的一般業務資料庫。

## 取捨

GitHub API 限制、多人寫入衝突、私有 Repository 方案限制與大型附件管理需要後續處理。敏感資料不因 GitHub 優先而進入 Git，必要時使用 Secrets、Git LFS 或受控儲存方案。
