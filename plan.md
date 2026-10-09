# Project STARGRID 實作方案

## 產品目標與交付範圍

在既有 Manus Webdev React／Express／tRPC／Drizzle starter 上，把 STARGRID 建成可登入、雲端持久化的台灣高中生學習城市系統。沿用已啟用的託管 MySQL 與預設 Manus OAuth；帳號身分由 starter 的伺服器端 session 驗證，不在前端模擬登入。首版完成首頁、學習記錄與冪等獎勵帳本、城市建築、成就收藏和四條科技路線；所有個人狀態由登入後的伺服器查詢／寫入，不將 localStorage 當雲端。首頁、城市、圖鑑與科技樹使用可互連的 SPA 路由。

## 核心實作決策

- **架構**：Vite／React／TypeScript + Wouter；Express/tRPC protected procedures；Drizzle MySQL。`users.openId` 做伺服器端個人資料的擁有者根鍵，系統定義表只由應用程式讀取，個人資料查詢一律綁 `ctx.user.id`。延用 OAuth state/nonce、真實 session 與 starter 的 `webdev_app_session` Preview 相容方式。
- **資料**：加上 profiles、tasks、study_sessions、study_records、reward_definitions、reward_events、user_wallets、wallet_transactions、building_definitions、user_buildings、building_logs、collectible_definitions、user_collectibles、achievement_definitions、user_achievements、technology_nodes、user_technology_progress。唯一事件 ID 及資料庫唯一索引將重試轉成安全的既有結果。建材與 XP 錢包、獎勵事件、交易帳本以同一 MySQL transaction 更新；建造扣款、升級也在 transaction 驗證餘額與所有權。
- **有效學習／防重複**：計時器只幫助控時；計時開始或任何按鈕本身不發獎。使用者完成後須送出學習類型、實際分鐘數和具體學習摘要，伺服器記錄有效學習與完成狀態。每個 study record 擇一獎勵類型：時間型活動使用對應時長級距；主動回想、錯題修正、週回顧使用各自活動獎勵，不得再疊加時間獎。部分完成保留紀錄但不發獎，使用者可日後另記新的有效活動。相同 session/record/event 重送由唯一性約束去重。100 XP/日只作參考；越過參考值後新獎勵 XP 以 50% 遞減，不設硬上限，不減建材。規則和原始獎勵集中在伺服器設定/資料表。
- **離線／同步**：學習表單離線時不把獎勵標成成功；保留未送出內容於目前頁面，連線恢復才重送同一 UUID event，並由伺服器 idempotency 避免雙發。重新登入不帶入前一使用者快取。跨裝置以 MySQL 為準，每 20 秒、焦點恢復及寫入後重新查詢同步。無持久性 client-only outbox，避免把尚未接受的學習冒充雲端資料；瀏覽器在線但最近一次伺服器查詢失敗時，畫面明確標記「同步有誤」並保留最後成功讀取的狀態。
- **路由與 API**：畫面路由 `/`（城市首頁）、`/study`、`/city`、`/archive`、`/research`、`/settings`；API 經既有 `/api/trpc`。因本專案 Vite root 為 `client/`，已服務的路由清單置於 `client/public/manus-routes.json`，另由 `client/public/favicon.svg` 提供自製圖示。
- **資料表結構更新**：採增量 Drizzle schema/migration，保留既有 `users`；不執行刪表、不覆蓋已建立個人資料。中央 `catalog.ts` 定義以可重複的 INSERT IGNORE 初始化，部署後既有 MySQL migration 已成功套用。

## 專案結構

- `client/src/pages/`：儀表板、學習、城市、收藏、科技、偏好設定及本人資料匯出。
- `client/src/components/`：桌面側欄/手機導覽、可互動 SVG 城市和已配置裝飾；`client/src/lib/` 提供雲端首頁資料 context 與 tRPC 查詢。
- `server/routers.ts` 與 `server/stargrid/router.ts`：以已驗證 Manus session 為邊界，提供 overview、study、city、collection、profile 與匯出 procedures。
- `server/stargrid/catalog.ts`：獎勵、建築、裝飾、成就及科技定義的單一來源；`server/stargrid/service.ts`：以 userId 篩選個人資料、有效學習校驗、獎勵/建造 transaction、進度與匯出。
- `server/db.ts`：共用 MySQL/Drizzle 連線；`drizzle/schema.ts` 與 `drizzle/`：資料定義與增量 migration。
- `client/public/manus-routes.json` 與 `client/public/favicon.svg`：正式靜態路由 manifest 及網站圖示；`scripts/stargrid-db-smoke.ts`：使用可清除測試帳號驗證核心 DB 交易，透過獨立 package script 明確手動執行。

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

正式個人資料/雲同步依賴此專案已提供的託管 MySQL、登入 session 與伺服器程序；dev 預覽不等同已公開發布。所有 server error 或網路失敗均呈現明確失敗狀態、不顯示成功 toast。完成型別檢查、既有測試和核心 server/客戶端互動檢查後，再依使用者所附規格準備可部署 container。發佈需確認實際 checkpoint、成功部署及對應 URL；未實際成功者不宣稱已上線。
