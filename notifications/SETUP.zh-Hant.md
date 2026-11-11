# Telegram／WhatsApp 私人通知設定

這個資料夾是 **Node 20+、操作員本機使用的真實 sender connector**。它能在配置完成、收件人同意、操作員明確執行 `--send` 後呼叫官方 API。現在沒有服務憑證或真收件人，因此尚未實送、尚未證明實收；mocked tests 不能證明訊息已到手機。

它沒有建立官方頻道、產品化綁定頁、正式登入驗證、HTTP 端點、webhook 或前端業務事件連線。現在的 `deposit` 等只會傳送 **Demo 事件提醒**，不代表銀行／鏈上已結算。GitHub Pages 不能安全持有 Bot token／Meta access token，也不會執行此後端。

## 1. 建立私密設定

建議先接 Telegram，實際收到測試後再接 WhatsApp；兩個 connector 都保留。以下指令在 repo 根目錄執行，不需要安裝第三方 npm 套件。

```bash
mkdir -p "$HOME/.azure-va-notifications"
chmod 700 "$HOME/.azure-va-notifications"
cp notifications/bindings.example.json "$HOME/.azure-va-notifications/bindings.private.json"
cp notifications/.env.example "$HOME/.azure-va-notifications/sender.local.env"
chmod 600 "$HOME/.azure-va-notifications/bindings.private.json" "$HOME/.azure-va-notifications/sender.local.env"
```

用文字編輯器開啟這兩個 **repo 之外的私密副本**。本 repo 的 source 會公開，`.gitignore` 只是最後一道防誤放；不要把真值留在 repo、填回 `.example`、貼到聊天、commit、ZIP、`dist`、Figma、瀏覽器 localStorage 或前端設定。私密環境檔與 bindings 檔須維持 `chmod 600`。

在 `sender.local.env` 將 `NOTIFY_BINDINGS_FILE`／`NOTIFY_STATE_DIR` 改為上述私密位置的**完整絕對路徑**。範本不會展開 `$HOME`。設定檔只是讓 Node 載入 server environment；程式本身不載入公開 `.env`，也不將 token 回傳至前端。下方使用 Node 的 `--env-file`，需 Node 20.6+；較早的 Node 20 請先由本機服務管理器載入相同環境變數。

## 2. Telegram：BotFather → 私聊 Start → chat ID

1. 在 Telegram 找官方 [@BotFather](https://t.me/BotFather)，送出 `/newbot`，依提示填顯示名稱及以 `bot` 結尾的 username。[官方建立步驟](https://core.telegram.org/bots/features#creating-a-new-bot)
2. 將取得的 token 存進私密環境檔的 `TELEGRAM_BOT_TOKEN`。token 等於控制這個 Bot 的憑證；不要放在瀏覽器網址列或命令列參數。
3. 由真正收件者打開 `https://t.me/你的BotUsername`，按 **Start**，送出一則自己能辨認的測試文字。追蹤公告頻道不會自動完成帳號通知綁定；這裡要與 Bot 私聊。[官方 Start／deep link 說明](https://core.telegram.org/bots/features#deep-linking)
4. 只對剛建立、尚未設 webhook 的測試 Bot，可用官方 `getUpdates` 讀取剛才的私聊 ID。以下程式只讀更新、不發訊息、不輸出 token；會把 chat ID 和收件者在 Telegram 的 first name 顯示於**本機終端機**，勿分享輸出。不要拿其他人的對話作綁定。[官方 getUpdates](https://core.telegram.org/bots/api#getupdates)

```bash
node --env-file="$HOME/.azure-va-notifications/sender.local.env" --input-type=module <<'JS'
try {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error();
  const r = await fetch('https://api.telegram.org/bot' + token + '/getUpdates', {
    method: 'POST', redirect: 'error', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({limit: 20, timeout: 0}), signal: AbortSignal.timeout(8000)
  });
  const data = await r.json();
  if (!r.ok || data.ok !== true) throw new Error();
  const chats = new Map(data.result.filter(x => x.message?.chat?.type === 'private')
    .map(x => [String(x.message.chat.id), x.message.chat.first_name || '']));
  for (const [chatId, firstName] of chats) console.log({chatId, firstName});
} catch { console.error('讀取未完成；請檢查 token、Start 與 webhook 設定。'); process.exitCode = 1; }
JS
```

5. 在私密 bindings 把範例 email key 改為要路由的帳號，填 `label`、`telegram.chatId`（**字串**）。確認此人同意後，才將 Telegram 的 `enabled`、`consent` 設為 `true`，`consentedAt` 填實際同意時間，例如 ISO 格式 `2026-11-11T08:00:00Z`。沒有這些資料會拒絕發送。WhatsApp 尚未設定時保留 `enabled: false`。
6. `label` 會傳給收件人，請用容易辨識且不含敏感資料的帳號別名；一個人可以在不同 email 帳號列填同一 chat ID，仍分帳號路由。現階段這是操作員確認後設定，**不是平台已驗證的自助綁定**。

## 3. WhatsApp：Cloud API 測試號 → 測試收件人 → 核准模板

由 [WhatsApp 官方 Developer Hub](https://business.whatsapp.com/developers/developer-hub) 的 **Start direct setup** 開始。官方入口提供測試號、範例與 webhook 資源；帳號介面名稱可能變動。[官方 Getting started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started/)

1. 使用自己的 Meta 開發者帳號，建立／選擇支援 WhatsApp Business Platform 的 app，完成介面要求的 business／WhatsApp 設定。不要把私人 WhatsApp Web session 當 API。
2. 先用 Meta 提供的測試號。在 API setup 加入並驗證**自己同意接收的測試收件號**；依官方 UI 完成驗證。
3. 將 access token、**Phone Number ID（不是電話號碼）**、API setup 顯示的受支援 Graph API version 填至私密環境檔：`WHATSAPP_ACCESS_TOKEN`、`WHATSAPP_PHONE_NUMBER_ID`、`WHATSAPP_API_VERSION`。臨時 token 可能到期；正式部署的憑證、權限、商業驗證與更新方式仍需按 Meta 介面處理。本模組不自動建立 service account，也不猜一個 API version。
4. 首次可先測試 Meta 預設 `hello_world`：`WHATSAPP_TEMPLATE_NAME=hello_world`、語言填 Meta 顯示的精確代碼（常見測試為 `en_US`）、`WHATSAPP_TEMPLATE_BODY_PARAMS=0`。此模式**只准 `event test`**，不冒充業務事件。
5. 要接五種 Demo 事件，請在 WhatsApp Manager 建立並取得核准的通知模板，正文採三個**位置參數**，依序為 `{{1}}` 帳號別名、`{{2}}` Demo 事件名稱、`{{3}}` 事件參考編號。例如：`Azure Demo 通知：{{1}}，{{2}}。參考編號：{{3}}。請登入平台核對。此訊息不代表銀行或鏈上已結算。` 分類與審核結果以 Meta 為準。此 connector 不支援 header/button/named-parameter 模板；模板、核准語言與參數數量必須完全匹配。
6. 設定模板名稱、核准語言、`WHATSAPP_TEMPLATE_BODY_PARAMS=3`。在私密 bindings 填 `whatsapp.phone`：國碼加號碼的**純數字字串**，不含 `+`／空白；確認同意後填 `consentedAt` 並啟用 `enabled`／`consent`。

全部 WhatsApp 發送都使用 `POST https://graph.facebook.com/{version}/{phone_number_id}/messages`，`type: template`，不使用任意文字訊息或私人 WhatsApp Web。官方 API 參考：[Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)。2026-11-11 核對時 Meta 技術文件入口回傳 HTTP 429，Developer Hub 可讀；此處沒有拿非官方鏡像冒充已核對的 API 最新規範。真正建立時應以自己開啟的 Meta 官方控制台／文件為準，並做一次實收測試。

## 4. 檢查、預覽，再明確發送

```bash
# 只檢查本機配置，不連線；輸出只有已設定旗標與遮罩收件人
node --env-file="$HOME/.azure-va-notifications/sender.local.env" notifications/cli.mjs --check
node --env-file="$HOME/.azure-va-notifications/sender.local.env" notifications/cli.mjs --config-status

# dry run：不含 --send 就不發送；仍檢查已綁帳號／同意／憑證是否完整
node --env-file="$HOME/.azure-va-notifications/sender.local.env" notifications/cli.mjs \
  --account stephen@ourbank.example --event test --event-id manual-test-0001

# 操作員確認收件人與意圖後才執行；此步會真的呼叫已啟用的官方服務
node --env-file="$HOME/.azure-va-notifications/sender.local.env" notifications/cli.mjs \
  --account stephen@ourbank.example --event test --event-id manual-test-0001 --send
```

第一輪建議使用既有公開 Demo 的全權管理者帳號 `stephen@ourbank.example`，範本別名為「Azure Demo 全權管理者」；email 相同不代表本機 CLI 已驗證登入身份，仍由操作員核對收件本人與同意。若測其他帳號，將 CLI 的帳號換成私密 bindings 的帳號。事件只接受 `test|deposit|withdrawal|supplement|approval`；不接受 `--to`、收件號、Bot token 或任意訊息。兩個管道都啟用時，任何一個配置不齊會在**零 network**下整筆拒絕；先接 Telegram 時，未準備的 WhatsApp 必須維持 disabled。

`accepted` 只證明 API 回應接受，**不等於 delivered／read**。請自己在 Telegram／WhatsApp 手機確認收到，再記錄實收結果。此階段沒有 WhatsApp delivery-status webhook。服務訊息 ID 僅存私密 journal，CLI 不顯示。退出碼 0 表示 dry run／檢查完成、API 接受、或已接受事件的防重擋下；其他失敗或不確定狀態為 2。

## 5. 防重、失敗與取消綁定

- `event-id` 代表同一帳號的同一筆事件，必須由業務事件端產生並固定，不要每次按鈕都換新 ID。同一 ID 同管道只取一次 durable claim；並行呼叫、程序中斷、同 ID 改收件人／模板／事件也不能繞過。
- 只有服務明確回傳 429 未接受、且有最多 2 秒的明確 retry delay 時，才在設定上限內重試（預設一次、最多兩次）。長時間 rate limit 交給人員稍後處理。
- timeout、斷線、5xx、無法判定的成功格式會記成 `uncertain`，不自動重送。**先到官方服務核對是否送出，勿刪 journal 或盲換 event-id 重送**。未知狀態需要操作員人工對帳；本模組沒有提供會重設防重的開關。
- `delivery-state` 保留私密狀態與服務訊息 ID。搬遷 sender 時連同 journal 一起安全搬遷；移除它會失去跨程序防重。沒有 webhook／集中式資料庫／多機一致性或正式使用者權限，不宣稱 production ready。
- 個別解除：將該 email 的個別管道 `enabled: false`、`consent: false`，下一次執行立即停止該管道。若作長駐服務，需另做配置重載與撤銷機制。

## 6. 下一階段：官方私聊的自助連接

產品流程應為 **連接官方通知 → 官方私聊 → 確認綁定 → 私人帳號通知**。公開頻道是公告用途，追蹤者不能直接視為已同意接收個人帳號事件；也不能從瀏覽器任意 email／localStorage 推定身份。

本次未實作以下身份驗證流程；開發整合時必須另外完成：

1. 由真正登入的 server session 發出高熵、單次、10 分鐘有效 nonce；server 儲存 nonce hash、帳號、session、管道，前端不可指定別人的帳號。
2. Telegram deep link `/start nonce` 只能交回「聲稱要連接」的資料。接 webhook 時驗證來源與更新防重，取得官方 user/chat ID；由原登入 session 再確認本人與明確同意後才原子寫入綁定。WA 需官方私聊／驗證流程與 webhook，不能用 Channels follower 清單當手機綁定。
3. nonce 原子消耗、到期拒絕、重放拒絕、登出／session 撤銷拒絕；一人多帳號必須逐帳號確認。
4. 每帳號／每管道可解除、撤銷同意、清除綁定；通知只採 server 綁定與事件授權。需加審計、頻率限制、delivery webhook、正式金流事件可信來源。

整合應從可信後端呼叫 `dispatch(settings, {account, event, eventId}, {send: true})`；不要把 `providers.mjs` 的內部 request 物件、ENV、bindings 或 journal 暴露到 API。HTTP companion 尚未建置。若未來要加 operator-local companion，須固定 `127.0.0.1`、驗證 Host／Origin＋CSRF，僅從明列安全副檔名提供 dist，並排除任何 secret／notifications／設定路徑；這仍不是 production authentication。

## 測試與官方資料

```bash
node --test notifications/tests/*.test.mjs
```

測試使用 Node 內建 test runner、暫存私密目錄與 mocked fetch，不需要 token、不建立服務帳號、不發送訊息。

- [Telegram Bot API](https://core.telegram.org/bots/api)／[Bot features](https://core.telegram.org/bots/features)／[教學](https://core.telegram.org/bots/tutorial)
- [WhatsApp Developer Hub](https://business.whatsapp.com/developers/developer-hub)／[Meta 官方 Getting started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started/)／[Messages API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
