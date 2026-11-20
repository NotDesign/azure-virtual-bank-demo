# Azure 開發交付指南 — 2026-11-20

此版本是可執行的前端互動 Demo，使用兩個完整虛構客戶案例。後端身分驗證、授權、審單、銀行、鏈上資金與正式 KYC 尚未接入。交付包的「已檢查」指本機原型行為，不能當成生產安全或持牌營運驗收。

## 啟動與修改

在交付包內請先 `cd source` 再執行以下 npm 指令。若只需操作 Demo，回到交付包根目錄雙擊 `START.command`（macOS）或 `START.bat`（Windows）；啟動後會自動開啟瀏覽器。直接開啟 `demo/index.html` 會顯示啟動說明，完整流程必須使用 HTTP 網址。

- Node.js 20 或以上；建議使用 Node.js 24。
- `npm start`：啟動原始碼，網址 `http://127.0.0.1:3192/`。沒有安裝依賴亦可啟動及建置；既有 vendor 已放入原始碼。
- `npm run build`：產生 `dist/`。修改 `source/`，不要直接改交付包的 `demo/`。
- 開發測試需 `npm ci` 及 `npx playwright install chromium`。瀏覽器測試支援 `BROWSER_PATH`；macOS 偵測到 Brave 時會使用它，其他系統使用 Playwright Chromium。
- `PORT=3276 npm start`，另開終端執行 `DEMO_URL=http://127.0.0.1:3276 npm run test:handoff`。
- `DEMO_URL=http://127.0.0.1:3276 npm run test:kyc` 驗證兩條模擬身份流程。`npm run test:fixtures` 不需瀏覽器。
- 使用全新／無痕瀏覽器驗證兩筆種子。自己新增的申請、草稿及審單資料保存在同一來源的瀏覽器儲存區，不是 ZIP 內又多放了客戶。

## 測試登入

以下均為虛構帳號，統一密碼 `AzureDemo!2026`，Demo 驗證碼 `381726`。這些不是正式憑證。

| 身分 | 登入電郵 | 範圍 |
|---|---|---|
| HQ 全權 | stephen@ourbank.example | 兩個案例與平台管理 |
| 一級 A001 | ops@ganghuitong.example | A001 分支 |
| 二級 B007 | chan@chanstudio.example | B007 名下客戶；代客申請預設關閉 |
| 客戶 AZ100001 | finance@starocean.example | 星海本人資料 |
| 一級 A002 | admin@dfkj.example | A002 分支 |
| 二級 B011 | team@gba-out.example | B011 名下客戶 |
| 客戶 AZ100006 | finance@bluewhale.example | 藍鯨本人資料；已有示範止付設定 |

HQ 可調整啟用中二級的佣金比例／代客開關；L1 只可調自己的二級。二級招募申請的業務審批仍由所屬 L1 處理，HQ 能查看；不要將這個指定審批責任與選單隱藏混為一談。

## 兩個案例

見 `docs/handoff/DEMO_CASES.md`。客戶數固定為 2，當前追加戶口申請數為 2；每案仍有多幣種帳戶、USDT 網路、交易對手及歷史交易。角色、產品、國家、幣別是設定／字典，不按兩筆裁切。

## 模組位置

| 功能 | 主要檔案 |
|---|---|
| 登入、快速切換與外層生命週期 | `app.js`、`demo-accounts.js`、`remembered-sessions.js` |
| 狀態、canonical actor、範圍、交易分潤 | `cms/confirmed/core.js` |
| 路由與登入橋接 | `cms/app.js`、`cms/confirmed/bridge.js` |
| 層級操作與直接 ID guard | `cms/confirmed/hierarchy-guards.js` |
| 客戶／代理／平台頁 | `cms/confirmed/pages_admin.js`、`pages_agents.js`、`pages_ctrl.js` |
| 開戶與內部審查 | `pages_onboard.js`、`pages_kyc.js` |
| 公開申請／補件持久化與跨分頁同步 | `cms/confirmed/external-intake.js` |
| 外部渠道單案審單 | `external-review/`、`cms/confirmed/external-review-bridge.js` |
| KYC 操作示範 | `cms/kyc-demo.js`、`cms/mock-identity-phone.js`、`cms/confirmed/kyc-methods.js` |
| 文件與草稿 | `cms/documents.js`、`cms/confirmed/files.js`、`wizard-draft-store.js`、`wizard-templates.js` |
| 原始種子／兩案補齊資料 | `cms/confirmed/data.js`、`data_cust.js`、`demo-data.js` |

## 公開申請、內部審單、外部渠道審單

1. 代理自己的開戶入口會帶入自己的有效邀請。公開申請通過原有必填／KYC／聲明檢查後，使用 UUID 案件 ID 儲存至本機 IndexedDB，另一個已開啟的後台分頁可收到。
2. 同一份申請的原始歸屬固定；補件更新同一 ID，不因後來開啟別人的邀請而換代理。重送／舊版本以 revision 檢查，不能倒退覆蓋較新的審核。
3. HQ 在補件案件可開啟「申請人補件頁（Demo）」。補件恢復欄位與文件，但重新要求 KYC 和提交同意；未完成補件草稿可保存及刷新續填。
4. HQ 於「渠道審核中」建立外部指派。外審頁只載入該次白名單快照，不載入內部風控意見、定價或完整客戶清單。
5. 外部審核可通過、要求補件或駁回。必須明確確認；過期、撤銷、資料修訂、重複回覆均有檢查。
6. 通過只到「渠道審核通過」。HQ 另操作「模擬戶口開通回覆」才到「已開通」並追加虛構帳戶；沒有呼叫銀行或扣款。

本機 IndexedDB：`azure-handoff-applications-v1`（applications、agentApplications、organizationState）。BroadcastChannel／localStorage 只通知其他分頁重新讀取。外審請求有獨立的本機 key 與單案 token。這些都不是跨裝置服務或正式權限邊界。

## 正式開發前必讀

- `docs/handoff/AUDIT_AND_OPEN_ITEMS.md`：已修項目、未接服務及生產阻擋事項。
- `docs/handoff/STATE_AND_AUTH_CONTRACT.md`：歸屬、修訂、審查狀態與建議後端責任。
- 交付根目錄的 `verification/` 和 `release/receipt.json`：這次實際檢查結果。歷史 README 內的舊 9 客戶測試與舊版本 QA 不是本次兩案驗收證據。
