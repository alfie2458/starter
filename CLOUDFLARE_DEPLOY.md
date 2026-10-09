# STARGRID 手動部署至 Cloudflare

## 目前狀態

專案已加入 Cloudflare Workers 入口、Express adapter、Workers Assets 設定和 `cf:deploy` 指令；Cloudflare 本機 runtime 與 Wrangler dry-run 已驗證。**Cloudflare 上尚未建立 Worker 或 Hyperdrive，也尚未部署。** 短效憑證 relay 已關閉，沒有 Cloudflare API token 存入本專案。下列步驟由你在自己的 Cloudflare 帳戶執行。

此部署使用 **Cloudflare Workers + Hyperdrive + MySQL**，不轉成 D1。Cloudflare Worker 會連到 Hyperdrive 指定的 MySQL；若指向現有資料庫，帳號與城市資料才能沿用。只改用新的資料庫會得到空資料庫，請勿在未確認資料搬移需求前更換連線目標。

## 1. 下載程式並安裝依賴

在已登入 GitHub 且有權限讀取 private repo 的電腦執行：

```bash
gh repo clone alfie2458/starter
cd starter
git checkout main
git pull --ff-only origin main
pnpm install --frozen-lockfile
```

本專案使用 Node.js 22 與 `pnpm` 10.18.0。不要把任何 `.env`、資料庫連線字串或 Cloudflare token 加入 Git。

## 2. 建立暫時、最低權限的 Cloudflare API token

在 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens/) 建立 **Custom token**：

- Account 權限：`Workers Scripts: Edit`、`Hyperdrive: Write`。
- Resources 限定為自己的 Cloudflare Account；不需授予 Zone/DNS 權限。
- 若可設定 TTL，建議只開啟短期有效期限（例如 1 天）。
- 不要使用 Global API Key，也不必使用完整權限的 `wrangler login` OAuth。

Cloudflare 官方說明：[建立 API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)、[permission groups](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)。

在本機目前這個 shell 用隱藏輸入讀取 token；不要把 token 直接打在 `export ...=token` 命令上：

```bash
read -rsp "Cloudflare API token: " CLOUDFLARE_API_TOKEN
printf '\n'
export CLOUDFLARE_API_TOKEN
pnpm exec wrangler whoami
```

確認 Wrangler 指向正確 Cloudflare 帳戶。部署完成後執行 `unset CLOUDFLARE_API_TOKEN`，並在 Cloudflare Dashboard 撤銷這個短期 token。

## 3. 決定 Worker 要連到哪個 MySQL

Hyperdrive 需要 Cloudflare 可連線的 MySQL 主機、port、database、user 和密碼。Manus 託管的 `DATABASE_URL` 是平台提供的執行期值，**不包含在 Git repo，也不能從這份指南取得**。若你能從原 Manus 專案的安全管理介面取得正確 DSN，可考慮讓 Hyperdrive 指向同一資料庫；先確認該 MySQL 接受 Cloudflare Hyperdrive 連線及 TLS。若不能取得或原資料庫不接受外部連線，請選擇你自己管理、能被 Cloudflare Hyperdrive 安全連線的 MySQL。新資料庫不會自動含有舊帳號/學習資料。

Cloudflare Hyperdrive 不快取 SQL 回應，以免跨裝置看到舊錢包或學習狀態；建立後 `--update-config` 會把非秘密的 Hyperdrive ID 寫入 `wrangler.jsonc`：

```bash
read -rsp "MySQL connection string (mysql://user:password@host:3306/database): " DATABASE_URL
printf '\n'
pnpm exec wrangler hyperdrive create stargrid-mysql \
  --connection-string="$DATABASE_URL" \
  --binding=HYPERDRIVE \
  --update-config \
  --sslmode=REQUIRED \
  --origin-connection-limit=5 \
  --caching-disabled
unset DATABASE_URL
```

不要把 DSN 寫進 `wrangler.jsonc`、聊天、Git 或公開 log。CLI 建立 Hyperdrive 時會短暫把連線資料傳給 Cloudflare API；請只在自己的可信任電腦執行，並關閉終端記錄/螢幕分享。建立後可用以下命令確認資源名稱與 ID（不會顯示 origin 密碼）：

```bash
pnpm exec wrangler hyperdrive list
```

`wrangler.jsonc` 的 `hyperdrive` 區塊應包含 `binding: "HYPERDRIVE"` 和 config ID；config ID 可以提交到 private repo，**密碼/完整 DSN 不可以**。

## 4. 套用資料庫 migration

若 Hyperdrive 指向既有 STARGRID 資料庫，專案的增量 migration 已在原 Manus MySQL 套用；在同一個 DB 上執行 `db:migrate` 可確認 migration 狀態。若你選擇新 MySQL，先確定 `DATABASE_URL` 指向的就是該新 DB，再套用 migration：

```bash
read -rsp "Direct MySQL URL for schema migration: " DATABASE_URL
printf '\n'
export DATABASE_URL
pnpm db:migrate
pnpm test:stargrid-db
unset DATABASE_URL
```

`pnpm db:migrate` 使用已提交的 Drizzle migration；不要用 `pnpm db:push` 取代正式 migration。資料庫 smoke test 會以隨機測試帳號驗證帳號隔離、學習獎勵冪等、任務與建築交易，並在結束時清除測試資料。它需要可由這台電腦直連的 MySQL `DATABASE_URL`；如果只有 Hyperdrive 沒有直接 DSN，略過此本機 smoke，部署後改以專用測試帳號驗證 Worker。

## 5. 第一次部署 Worker，再設定 Manus 登入 secrets

先確保 `wrangler.jsonc` 已加入 `HYPERDRIVE` binding，然後執行第一次部署：

```bash
pnpm run cf:deploy
```

這個 script 會執行 `pnpm build`（Vite 靜態檔輸出至 `dist/public`）再執行 `wrangler deploy`。Wrangler 輸出的公開 Workers URL 先記下。Worker health endpoint 可回 200，但在設定登入 secrets 前不要當作已可登入的正式服務。

登入依賴下列 Cloudflare Worker runtime values。每個指令會開啟互動式輸入；在提示出現時貼上值，不要把值寫進命令、檔案或 Git：

```bash
pnpm exec wrangler secret put MANUS_PROJECT_ID
pnpm exec wrangler secret put MANUS_JWT_SECRET
pnpm exec wrangler secret put MANUS_OAUTH_API_URL
pnpm exec wrangler secret put MANUS_OAUTH_PORTAL_URL
```

- `MANUS_PROJECT_ID`、`MANUS_OAUTH_API_URL`、`MANUS_OAUTH_PORTAL_URL` 必須與你要使用的 Manus OAuth 專案/登入設定相符；它們不在 Git repo。若無法從原專案的安全設定取得，需由你使用適用於新部署的正式 Manus OAuth 設定，不要猜 URL。
- `MANUS_JWT_SECRET` 是此 Worker 簽署及驗證 session cookie 的私密金鑰。可由你在安全的密碼管理器生成高熵值；Worker 新網域的使用者必須重新登入，不會沿用另一網域 cookie。**此值不可公開。**
- `/api/platform/config.js` 只會公開 `MANUS_PROJECT_ID`、`MANUS_OAUTH_PORTAL_URL`、`MANUS_API_URL` 與 `MANUS_API_BROWSER_KEY`。若要使用其他 Manus platform API，可另以 `wrangler secret put MANUS_API_URL`、`wrangler secret put MANUS_API_BROWSER_KEY` 設定；browser key 依平台定義是可在瀏覽器看見的公開值。`MANUS_API_KEY` 只在另行使用 Manus Storage proxy 功能時才可能需要，不要為本版核心登入而無條件加設。

設定 secrets 後再部署一次，確保已發布版本載入目前 config/bindings：

```bash
pnpm run cf:deploy
unset CLOUDFLARE_API_TOKEN
```

## 6. 設定並驗證 OAuth callback

前端登入 callback 使用目前網站 origin，路徑是：

```text
https://<Wrangler 顯示的 Worker 網址>/api/oauth/callback
```

到適用的 Manus OAuth 專案設定中，把這個 **精確 HTTPS callback URI** 加入允許清單（若該專案要求 redirect allowlist）。Worker 使用 `httpOnly; Secure; SameSite=None` session cookie 及一次性 state/nonce 防 CSRF。若平台不允許 `workers.dev` callback，OAuth 登入會失敗；不要用假 session 或關掉 state 驗證。此時需使用 OAuth 設定允許的自有網域，並確保 DNS/TLS 由你自行設定。

## 7. 公開端點與實際登入驗證

把 `<Worker URL>` 替換成 Wrangler 實際輸出的網址：

```bash
curl -i https://<Worker URL>/
curl -i https://<Worker URL>/api/health
curl -i https://<Worker URL>/api/platform/config.js
curl -i https://<Worker URL>/manus-routes.json
curl -i https://<Worker URL>/favicon.svg
```

以上頁面/靜態檔應回 HTTP 200；`/api/health` 是 HTTP readiness，**不會驗證 MySQL 可用**。另用瀏覽器實際完成 Manus OAuth 登入、打開首頁使受保護的 tRPC dashboard query 讀 MySQL，確認 `HYPERDRIVE`、資料列與帳號隔離正常。以專用測試帳號試建一筆任務、登入另一裝置確認雲端同步；勿在正式帳號製作假的長期學習紀錄。

若網站可開、health 200，但登入後 dashboard 回同步錯誤，優先確認 Hyperdrive 的 MySQL host/port/TLS、migration 及 Worker bindings；若登入 callback 拒絕，確認 Manus redirect allowlist 與 `MANUS_PROJECT_ID`/OAuth URLs。

## 8. Git 與費用注意事項

若 Hyperdrive 建立後 `wrangler.jsonc` 更新了 config ID，將它與此部署指南一併提交到 GitHub private repo，確認 diff 不含 `.env`、DSN、token 或 secret。不要提交 `.dev.vars`。本 repo 已忽略 `.wrangler/` 和 `.dev.vars*`。

依 [Cloudflare Hyperdrive 定價](https://developers.cloudflare.com/hyperdrive/platform/pricing/) 和 [限制](https://developers.cloudflare.com/hyperdrive/platform/limits/)（執行前請再確認最新頁面），Workers Free 包含 Hyperdrive；官方列出 Free 方案每日 100,000 個 database statements 的限制，超額時資料庫請求可能要等到每日重置才能恢復。Workers requests/CPU 另受 Cloudflare 帳戶方案限制。