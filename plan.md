# Project STARGRID 實作方案

## 產品目標與交付範圍

在既有 Manus Webdev React／Express／tRPC／Drizzle starter 上，把 STARGRID 建成可登入、雲端持久化的台灣高中生學習城市系統。沿用既有託管 MySQL 與 Manus OAuth；帳號身分由 starter 的伺服器端 session 驗證，不在前端模擬登入。首版完成首頁、學習記錄與冪等獎勵帳本、城市建築、成就收藏和四條科技路線；所有個人狀態由登入後的伺服器查詢／寫入，不將 localStorage 當雲端。首頁、城市、圖鑑與科技樹使用可互連的 SPA 路由。

## 核心實作決策

- **架構**：Vite／React／TypeScript + Wouter；Express/tRPC protected procedures；Drizzle MySQL。`users.openId` 做伺服器端個人資料的擁有者根鍵，系統定義表只由應用程式讀取，個人資料查詢一律綁 `ctx.user.id`。延用 OAuth state/nonce、真實 session 與 starter 的 `webdev_app_session` Preview 相容方式。
- **資料**：加上 profiles、tasks、study_sessions、study_records、reward_definitions、reward_events、user_wallets、wallet_transactions、building_definitions、user_buildings、building_logs、collectible_definitions、user_collectibles、achievement_definitions、user_achievements、technology_nodes、user_technology_progress。唯一事件 ID 及資料庫唯一索引將重試轉成安全的既有結果。建材與 XP 錢包、獎勵事件、交易帳本以同一 MySQL transaction 更新；建造扣款、升級也在 transaction 驗證餘額與所有權。
- **有效學習／防重複**：計時器只幫助控時；計時開始或任何按鈕本身不發獎。使用者完成後須送出學習類型、實際分鐘數和具體學習摘要，伺服器記錄有效學習與完成狀態。每個 study record 擇一獎勵類型：時間型活動使用對應時長級距；主動回想、錯題修正、週回顧使用各自活動獎勵，不得再疊加時間獎。部分完成保留紀錄但不發獎，使用者可日後另記新的有效活動。相同 session/record/event 重送由唯一性約束去重。100 XP/日只作參考；越過參考值後新獎勵 XP 以 50% 遞減，不設硬上限，不減建材。規則和原始獎勵集中在伺服器設定/資料表。
- **離線／同步**：學習表單離線時不把獎勵標成成功；保留未送出內容於目前頁面，連線恢復才重送同一 UUID event，並由伺服器 idempotency 避免雙發。重新登入不帶入前一使用者快取。跨裝置以 MySQL 為準，每 20 秒、焦點恢復及寫入後重新查詢同步。無持久性 client-only outbox，避免把尚未接受的學習冒充雲端資料；瀏覽器在線但最近一次伺服器查詢失敗時，畫面明確標記「同步有誤」並保留最後成功讀取的狀態。
- **路由與 API**：畫面路由 `/`（城市首頁）、`/study`、`/city`、`/archive`、`/research`、`/settings`；API 經既有 `/api/trpc`。因本專案 Vite root 為 `client/`，已服務的路由清單置於 `client/public/manus-routes.json`，另由 `client/public/favicon.svg` 提供自製圖示。
- **資料表結構更新**：採增量 Drizzle schema/migration，保留既有 `users`；不執行刪表、不覆蓋已建立個人資料。中央 `catalog.ts` 定義以可重複的 INSERT IGNORE 初始化，部署後既有 MySQL migration 已成功套用。

## Cloudflare 建置與發布方式

- **部署目標**：建立一個獨立 Cloudflare Worker `stargrid`，以 Cloudflare `workers.dev` 預設 HTTPS 網址交付；不修改使用者現有四個 Worker、Cloudflare DNS 或自有網域。程式碼另保存在使用者指定的私有 GitHub repo `alfie2458/starter`；Manus Webdev `origin` 仍是 canonical remote。
- **HTTP runtime**：Worker 開啟 Cloudflare Node.js compatibility，使用官方 Express-on-Workers `cloudflare:node` `httpServerHandler` 包裝既有 Express/tRPC routes；`/api/*`、OAuth callback、`/api/health` 與平台公開設定仍走伺服器。React/Vite 靜態檔由 Worker Assets binding 從 `dist/public` 提供，SPA 路由使用 `single-page-application` fallback。官方參考：[Express on Workers](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/)。
- **MySQL 與資料歸屬**：不改 MySQL schema、不採 D1 重建、不匯出/複製現有 user rows；以 Cloudflare Hyperdrive 經 HTTPS/TCP 連回目前 MySQL，Drizzle `mysql2` 連線啟用 Cloudflare 所需的 `disableEval: true`。交易仍由原資料庫執行。現有 MySQL 連線字串會成為 Hyperdrive 設定中的敏感連線資訊，因此在送到 Cloudflare 前先取得使用者明確授權；不得把連線字串寫入 Wrangler config、Git、瀏覽器或工具輸出。官方參考：[MySQL on Workers with Hyperdrive](https://developers.cloudflare.com/workers/tutorials/mysql/)。
- **登入與秘密**：維持 Manus OAuth、`MANUS_PROJECT_ID`、`MANUS_OAUTH_PORTAL_URL`、`MANUS_OAUTH_API_URL`、`MANUS_JWT_SECRET`、`webdev_app_session`、CSRF nonce，及 `SameSite=None; Secure` cookie；不改用新 IdP。使用 Cloudflare Worker vars/secrets 注入，不提交任何值。部署後驗證 Manus OAuth callback 是否接受 Cloudflare workers.dev origin；若平台 redirect policy 阻擋，明確報告所需 allowlist，不以假登入繞過。
- **建置流程／本次交接界線**：新增 Worker entry/config 與固定的 Wrangler dev dependency；本機沿用 `pnpm dev` 和原 MySQL，提供 `pnpm run cf:deploy` 可重複建置/發布。本機 Wrangler/Workers runtime 已驗證 `/`、API 與資產回應。依使用者最新決定，Cloudflare 帳戶中的 Hyperdrive/Worker 建立、憑證輸入、正式發布及公開登入測試由使用者自行完成；[CLOUDFLARE_DEPLOY.md](CLOUDFLARE_DEPLOY.md) 記錄精確命令、安全 secret 操作、MySQL 資料保留前提及部署後檢查。助手不呼叫 Cloudflare API、不取得 token、不宣稱正式 Cloudflare 上線。

## 專案結構

- `client/src/pages/`：儀表板、學習、城市、收藏、科技、偏好設定及本人資料匯出。
- `client/src/components/`：桌面側欄/手機導覽、可互動 SVG 城市和已配置裝飾；`client/src/lib/` 提供雲端首頁資料 context 與 tRPC 查詢。
- `client/public/manus-routes.json` 與 `client/public/favicon.svg`：正式靜態路由 manifest 及網站圖示。
- `server/_core/app.ts`：建立 Express 中介層、OAuth/tRPC/health/public-config routes，供 Node 預覽及 Worker adapter 共用；`server/_core/index.ts` 保留 Node 開發/容器入口；`server/cloudflare-worker.ts` 專供 Cloudflare Express adapter 與 API/Assets 分流。
- `server/routers.ts` 與 `server/stargrid/router.ts`：以已驗證 Manus session 為邊界，提供 overview、study、city、collection、profile 與匯出 procedures。
- `server/stargrid/catalog.ts`：獎勵、建築、裝飾、成就及科技定義的單一來源；`server/stargrid/service.ts`：以 userId 篩選個人資料、有效學習校驗、獎勵/建造 transaction、進度與匯出。
- `server/db.ts`：本機使用現有 MySQL `DATABASE_URL`；Cloudflare Worker 使用 `HYPERDRIVE` binding 和受支援的 mysql2/Drizzle client。
- `drizzle/schema.ts` 與 `drizzle/`：保留 MySQL 資料定義與增量 migration；`scripts/stargrid-db-smoke.ts`：以可清除測試帳號驗證核心 DB 交易。
- `wrangler.jsonc`：Workers compatibility date、Assets binding、Hyperdrive binding name 與 Worker runtime 入口；不含秘密值。

## 視覺與互動設計

- **Design Movement**：成熟的 neo-cyberpunk 城市控制台，融合建築資訊圖表和克制的 holo-interface；不是兒童遊戲，也不是直接挪用任何遊戲素材。
- **Core Principles**：學習行動先於城市獎勵；資料清楚、安靜而可信；進度持久且休息無懲罰；鍵盤、觸控、低動態與不同尺寸皆可用。
- **Color Philosophy**：深海軍藍（`#071426`）是沉靜專注的城市底色；冰青（`#4DE1D2`）是品牌主色與有效行動/同步狀態；柔紫用於長期探索與科技；暖金只用於稀少里程碑。淺色模式改用霧白與墨藍，同一語意色保持對比。
- **Layout Paradigm**：桌面左側固定窄導覽、內容採不對稱雙區域：一側為學習優先任務與 XP，另一側為俯視等角城市與下一條件；寬螢幕不把所有內容塞成均勻卡片矩陣。平板重排兩欄；手機單欄、底部導航與底部固定開始鍵。
- **Signature Elements**：一條細緻的青色星軌作進度/連線標記；自行繪製的 SVG 等角建築/地塊圖層；帶切角與微亮描邊的半透明全息面板。
- **Interaction Philosophy**：學習表單明確展示類型、回顧文字、回報分鐘及預期獎勵，成功訊息由伺服器結果決定；解鎖先顯示條件及建材價再讓使用者決定是否建造。不使用每日懲罰、連續登入、戰利品箱或付費誘導。
- **Animation**：介面變化 120–200ms 柔和淡入/位置移動；城市解鎖可選低幅度建築亮起約 350ms，不循環閃爍。使用 `prefers-reduced-motion` 和使用者設定停用非必要動畫；關閉動畫時保留完整資訊及確認。
- **Typography System**：拉丁數字使用 Inter 或系統 sans；繁中優先 `Noto Sans TC`，再以常見系統字型 fallback。重要數字用 tabular lining，標題/內文層次分明；正文行高至少 1.55。
- **Brand Essence**：「讓每次真實複習都留下城市成長痕跡的學習控制台」；個性為冷靜、明亮、可靠。
- **Brand Voice**：短句、具體、不施壓。例：「今天先完成一段，城市就會有一格新能量。」、「休息不會扣除任何進度。」
- **Wordmark & Logo**：STARGRID 使用自製字距字標，左側以三個偏移光點和折線格網構成原創星軌方塊圖記；不使用任何現成遊戲標誌。
- **Signature Brand Color**：冰青 `#4DE1D2`。

## 專案限制與發布

正式個人資料/雲同步依賴既有 MySQL、登入 session 與伺服器程序。Cloudflare 部署是額外的 Worker serving target，不等同已上線；`wrangler.jsonc`、Worker bundle、Hyperdrive 和公開網站網址須逐一確認。雲端平台或 OAuth redirect policy 若不允許，不改用假登入或前端模擬資料。外部 MySQL 連線與 Worker 公開化均於對應安全確認後執行。所有 server error 或網路失敗均呈現明確失敗狀態、不顯示成功 toast；未實際成功者不宣稱已上線。
