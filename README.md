# Azure CMS interactive demo

Traditional Chinese first, with Simplified Chinese and English. The login preserves the existing independent Azure orb, ripple and slider motion. Email, SMS and Authenticator OTP flows lead to the authenticated CMS.

## Demo accounts

| Scope | Email | Organization |
|---|---|---|
| Customer | finance@starocean.example | 星海電子科技有限公司 |
| Level 1 agent | ops@ganghuitong.example | 港匯通顧問有限公司 |
| Level 2 agent | chan@chanstudio.example | 陳氏商務工作室 |
| Full administrator | stephen@ourbank.example | Azure |

Password: `AzureDemo!2026` · Initial OTP: `381726`. Resending changes the shown demo code. The login demo panel can fill accounts and current codes.

CMS scope is fixed by the authenticated account. The remembered-account picker switches only between independently verified accounts and never grants another role. Public customer applications and agent registration are separate links; registration level is derived from the invitation code.

## Run and build

`npm install` then `npm start` (http://127.0.0.1:3192). Use a current Node version. `npm run build` creates the portable static site in `dist/`. Serve the files over HTTP/HTTPS, not file://. All fonts, chart/QR libraries, PDF.js and OCR assets are vendored locally.

## Source and behavior

The client-confirmed 2026-10-14 prototype is in `cms/confirmed/`. Data, dates, financial formulas and snapshots remain in the source data and core modules. `bridge.js`, `brand.css` and `files.js` adapt authentication, Azure styling, spacing, role routing, dark mode, responsive tables, real document upload and human review. The original client folder was not changed.

Uploaded documents are recognized in the browser with PDF text or local Tesseract OCR. Only checked and reviewed candidates are applied; failed and unsupported files have individual statuses. Leading zeros and strings are preserved. OCR coverage and quality depend on the supplied file; no accuracy percentage is claimed.

ID front/back and portrait capture use the AllinPay camera workflow: consent, camera or photo fallback, review, cancellation, expiry and a six-digit completion code. Photos remain in memory and are released. This demo does not perform production face matching, liveness, bank API calls or outgoing email/SMS. Accounts, invitations, approvals and financial state are local simulated fixtures; front-end route guards are demonstration behavior, not server-side authorization.

## Verification

`node scripts/verify-scopes.mjs` checks four real login flows, each enabled menu, scoped records, cross-scope routing, three languages, dark mode and 1920/768/390/320 layouts. `verify-files.mjs` checks actual PDF extraction, per-file errors and selective mapping. `verify-raster.mjs` checks local OCR and absence of external requests. `verify-camera.mjs` checks denied camera permission, file fallback and photo cleanup. These browser checks use the installed Brave executable and local port 3193.

Live demo: https://notdesign.github.io/azure-virtual-bank-demo/

## Updated application flow

1. Upload any available document and recognize its content. One valid file is enough to start.
2. KYC ID and portrait capture through a 10-minute phone QR link. A recognized, reviewed director ID skips front/back capture; portrait capture remains. The phone opens the appropriate camera after consent.
3. Review and complete company, directors, UBO, contact and business data.
4. Choose available accounts.
5. Confirm and submit a session-local demo application.

Each step has an explicit fictional Demo fill button below Clear and restart in the operations rail. It is separate from OCR and production verification. Recognition candidates remain unchecked until reviewed; one Select all / Deselect all button toggles the review selection. Uploaded originals remain in memory for the corresponding CS workbench and clear when the session ends. Notifications open their scoped entity and mark pending fields, documents or actions.

Hong Kong BR recognition uses label-based region recovery, including scans with a corrupt hidden PDF text layer. Documents are classified from content; identity roles require confirmation. No private customer document is included in the repository or distribution. `verify-feedback.mjs` checks notifications, required markers, dropdowns, logout, metrics and the five-step Demo flow.

## 2026-10-20 review update

The customer detail action **Adjust rates** opens a dialog locked to that customer. The same dialog serves the pricing page. Blank, nonnumeric and below-floor rates are rejected. Saving creates or updates unsent requests; active prices remain unchanged until the existing channel-confirmation simulation. Requests already sent cannot be overwritten. Individual and company customer profiles can be created as session-local drafts in the authenticated agent's scope; this does not open accounts or complete KYC.

Agent trees and document-request target pickers support search and filters. HQ can generate a level 2 recruitment link for a chosen level 1 agent; the level 1 remains the reviewer. Level 1's header links to its own level 2 registration; level 2 has no agent-registration shortcut. Application lists support name/ID, source, ownership and inclusive date filters.

Customer payments support inline recipient entry while preserving the payment form. New recipients remain drafts or pending approval, with an explicit separate Demo approval action. Account numbers remain strings. The FX overview uses the source currency totals for available and frozen funds, lists linked bank accounts and updates after a simulated exchange; individual bank-account balances are not supplied by the source data.

`review-company.js`, `review-agents.js` and `review-payments.js` isolate these changes. The previously accepted mobile camera toolbar and five-step application wizard were not changed. Run `verify-review-company.mjs`, `verify-review-agents.mjs`, `verify-review-payments.mjs` and `verify-scopes.mjs` for the review update. Reports and screenshots are local under `.design-build/review-20261020/` and are not part of the public site.

## Administrator access and compact layouts

Full administrators now have a **Customer eBanking** sidebar group with all customer functions, including wallets, payments, FX, statements, counterparties and team settings. Select the customer in the workspace or open it from customer details. The administrator remains signed in to HQ. Customer drafts and financial demo state survive workspace navigation and customer changes within this session; new records identify the HQ actor and the selected customer separately.

Only AZ100001 has the complete banking fixture. Other customers show their own supplied accounts and transactions; missing balances remain unavailable, and the demo never reuses another customer's funds, recipients or withdrawal accounts. No live banking service is connected.

Target search and freeze filters share one row where space permits. Pricing tabs, customer selection and action buttons align. Customer and application tables fill their cards, row actions are horizontal, and filter buttons use their natural size. Search fields have a separate clear-text X. Narrow screens wrap filters and scroll wide tables inside the card.

`verify-admin-customer.mjs` checks the administrator workspace, customer isolation and retained state. The camera capture UI and application wizard remain unchanged.

## Payment and FX follow-up

Single payments, batch payments and withdrawals now share an aligned toolbar with **Add now**. It opens a recipient form or a company-owned withdrawal account form in place. Entered payment details, withdrawal amount and memo, and the batch upload survive adding a record. New withdrawal records use the entered bank data and retain account-number leading zeros; they stay unavailable until an explicit Demo approval. Withdrawal submission rejects unapproved or unknown accounts, invalid amounts and insufficient funds.

The FX workspace includes **各戶口結存概況** with the actual linked bank accounts and source currency totals. Currency aggregates are labelled separately from individual account balances. The exchange form and trend chart share aligned card edges. Both updates apply to the customer login and the full-administrator customer workspace.

Run `node scripts/verify-payment-instant.mjs` and `node scripts/verify-fx-account-overview.mjs` for the focused follow-up checks. Application progress is available to agents under **申請進度** and to HQ under **客戶與開戶 → 開戶申請工作台**; both use the application search, source, owner and date filters.


## 2026-11-10 wallets, navigation and reference rates

Sidebar navigation and the logo no longer have outer outlines. The active page, hover state and keyboard focus remain visible; other action buttons keep their existing treatment. Mobile navigation groups stack vertically.

**Wallets and assets** is available to customers and to HQ under Customer eBanking. Fiat wallets adapt the supplied currency aggregates without duplicating bank balances. USDT wallets are separate per customer and network, with TRON (TRC20) and Ethereum (ERC20) choices. Missing balances remain unavailable until an explicit simulated deposit. Same-network demo transfers use integer millionths and produce a separate wallet ledger. They never change bank balances, bank transactions, commissions, or the original FX basis. Receiving addresses are not assigned, and no custody key, real deposit, blockchain transfer or bridge is created. HQ wallet state survives page and customer switches; frozen customers are read-only.

The market-reference panel polls the public Coinbase exchange-rates endpoint every 30 seconds while an applicable view is visible. One feed is shared by HQ and its customer frames. It shows local retrieval time, not a provider quote timestamp. USDT uses its market rate; missing CNH is never replaced by CNY. Failed requests keep the last successful reference with an explicit stale state, and HTTP 429 uses backoff. Background polling does not reset input fields, modals or demo trade quotes. The existing sample chart is labelled illustrative. See [API integration notes](docs/rates-api.md).

Run `node scripts/verify-wallets.mjs` and `node scripts/verify-market-rates.mjs` for focused checks, along with the existing payment, FX and scope regressions. Customer balances and actions remain local demo state; only public market data is fetched externally.


## Wallet workbench reference update

The wallet workspace now separates wallets and transaction history. Its asset overview groups bank/fiat and digital wallets, supports USD/HKD reference display and amount privacy, and counts missing balances or rates separately. A reference subtotal includes only assets with both supplied balances and a usable market rate. Fiat currency aggregates are counted once, even when several bank accounts share a currency.

Wallet history supports record/party search, type, network, inclusive Hong Kong dates and selected-wallet/all-owned-wallet filters. A detail drawer shows only the supplied demo ledger fields. CSV export follows the applied filters, protects text cells from spreadsheet formula execution, and explicitly exports the underlying amounts even when screen privacy is enabled. Wallet visibility, filters and display preferences remain scoped to the selected customer session.

**Conversion preview** groups source/destination choices by bank/fiat and digital wallets. It uses the market-reference feed, including the actual USDT rate, shows the retrieval time and stale/unavailable states, and preserves entered amounts during refreshes. It is read-only: it does not submit an exchange, debit funds, produce a transaction or estimate fees. A missing CNH rate is not substituted with CNY.

Bank account details open in a responsive side drawer with per-field copy, copy-all and a UTF-8 text download made from the displayed source fields. Clipboard denial offers a selected text fallback. Existing account proof and confirmation actions remain available. Missing customer banking data never borrows another customer's fixture.

Run `node scripts/verify-wallet-workbench.mjs`, `node scripts/verify-wallet-activity.mjs` and `node scripts/verify-bank-account-tools.mjs`, alongside the wallet, payment, FX, market-rate and scope regressions. The external reference recording and extracted frames are private QA material and are not distributed. No card issuance, acquiring API, blockchain execution or external KYC integration is introduced by this update.


## 2026-11-11 USDT funding simulation and usability

USDT deposits and withdrawals now have operational Demo flows for TRON (TRC20) and Ethereum (ERC20). Deposit requests show a deliberately non-payable `DEMO-` address and an `azure-demo://` QR payload. Pending deposits do not affect available funds; an explicit simulated completion credits the wallet. Withdrawals collect a network-specific destination and amount, review the principal, illustrative Demo fee and total, then require the displayed Demo code. No email, SMS, custody service or blockchain transaction is involved.

A pending withdrawal moves the full principal plus fee from available to reserved funds. Completion removes the reservation; cancellation or failure refunds it in full. Repeated submissions with the same request key and repeated terminal actions do not duplicate balance changes. All quantities use integer millionths. The illustrative fees are 1 USDT for TRON and 3 USDT for Ethereum; they are local demonstration rules, not current network quotes. A request selects its operation wallet after creation so it can be recovered from the wallet workspace. Pending requests, final outcomes and customer-specific history survive workspace navigation within the authenticated session. Refreshing the app starts fresh Demo state.

Transaction history distinguishes requested principal, Demo fee, reserved funds and settled value, with type and state filters, scoped record details and matching CSV fields. Failed or cancelled requests are not presented as settled withdrawals. The funding flow includes sample filling, validation, a maximum amount after fees, a review step, a visible Demo code and manual outcome controls. Frozen customers remain read-only.

USDT, TRC20, ERC20 and funding keywords now find the permitted wallet entry in global and sidebar search. Wallet actions precede detailed valuations, and the Transactions tab presents its own content without the unrelated market and asset cards. Mobile wallet and transaction cards keep their action buttons in view. A shared eye control toggles amount privacy from either tab. First-use and filtered-empty history states offer distinct next actions.

Run `scripts/verify-wallet-funding.mjs`, `scripts/verify-wallet-funding-ui.mjs` and `scripts/verify-wallet-usability.mjs`, plus the wallet/activity/workbench, payment, FX, reference-rate and role-scope regressions. No personal reference video, private document or extracted reference frame is included in the release.


## 2026-11-11 workspace, date controls and document recognition

The account panel remembers a device session only after successful password and OTP verification. Remembered accounts switch directly without re-entering credentials, including after reload or reopening the same browser. A saved-account chooser appears before the credential form. Each attached workspace keeps its route and in-memory Demo state when switching. Verified Demo grants are stored separately in IndexedDB and resolve the canonical account ID and role; display metadata alone cannot authorize an account. Passwords, OTPs and uploaded documents are never saved by this feature. Explicit sign-out, sign-out-all, password reset and forgetting revoke the corresponding device grant; sign-out changes also reach other open tabs. A remembered signed-in account has no 15-minute idle expiry; an unchecked/nonremembered login retains the idle limit. Adding a new account still requires its initial password and OTP verification and can be cancelled. This static Demo device grant is not production authentication or a server refresh token.

Dark mode reuses the original logo artwork and preserves its blue orb while making the wordmark and badge readable. Desktop, mobile and public-page variants use the same proportions. Revenue legends place each complete product label and amount on a single row rather than splitting labels into two narrow columns.

Paired date filters now use a single range calendar, including application-created dates, wallet activity, bank ledger, FX history, customer transactions and statement periods. Start and end dates are selected in one calendar; presets, cancellation, clearing, read-only handling and inclusive bounds preserve the existing scoped filter behavior. Single-date fields such as birth dates remain independent.

Dashboard and revenue views support 7, 30 and 90 days, this month, previous month and a custom range of up to 366 days. Financial metrics, daily series, income composition and product rows use the same selected transaction window and the original calculation formulas. The toolbar explicitly shows the supplied Demo cutoff rather than manufacturing current-day or historical transactions. Customer FX retains its existing 1/7/15/30-day illustrative trend controls. Background reference-rate polling skips cached accounts whose frames are hidden or inert.

Uploaded PDF and image documents are classified from their page contents rather than trusting filenames. Recognition is browser-local, auto-queued after upload and isolated per document and page. Candidates retain document/page provenance and still require human review before application; identity ownership roles are never inferred automatically. Handwritten or low-confidence content remains explicitly reviewable. Supporting artwork is not treated as proof of business premises. Private recognition samples, extracted values and reference images are not distributed.

Focused checks include `verify-account-switcher.mjs`, `verify-date-periods.mjs`, `verify-theme-logo-legend.mjs` and the document-recognition regressions, alongside the existing wallet, funding, payment, FX and scope checks.

## 2026-11-11 loading and chart polish

The shared CMS startup view uses a thin 22px/1px spinner and fixed-width animated dots, with a static accessible status. It respects saved dark mode, the requested UI language and reduced motion. Chart/QR libraries load after the visible placeholder; completed views remove it immediately. Cached account views do not acquire an artificial loading delay. All line charts use straight segments (`tension: 0`), and currency badges center their Latin labels at the existing sizes.

The Dogpay reference remains a feature reference, not a complete product clone. The demo currently supports named multi-wallet creation, TRC20/ERC20 separation, simulated USDT deposits/withdrawals, same-network internal wallet transfers and local activity records. The Demo now also supports a scoped crypto address book, executed fiat/USDT conversions and USDT batch payouts. Card-wallet funding and collection API activation remain outside the implemented scope. Items visible only as historical records or tabs in the reference do not establish a verified end-to-end flow.

## Account-specific Telegram and WhatsApp notifications

`notifications/` contains a server-side, operator-local sender connector and a Traditional Chinese setup guide (`notifications/SETUP.zh-Hant.md`). It routes by private per-account bindings, requires recipient consent and explicit send, and supports Telegram messages and approved WhatsApp templates. Tokens stay in private environment files outside this repository; examples have both channels disabled. Persistent per-channel event IDs prevent duplicate sends, and uncertain outcomes require reconciliation.

No provider account, bot, real recipient or credential is configured in this release. No message has been sent or verified received. GitHub Pages runs the static demo only: there is no automatic business-event dispatch, public notification endpoint, self-service account binding or delivery webhook. The guide separates the currently usable local connector from the future authenticated private-chat binding flow and public announcement channels.

## Operable Dogpay-inspired wallet flows

The wallet actions include **Address book**, **Fiat / USDT exchange (Demo)** and **Batch payment (Demo)**. All are current-customer/session-local simulations and work in the HQ customer workspace. Address entries, executed conversions and batch results are preserved with the customer snapshot; other customers and remembered login accounts do not share them.

- Address book: create/edit/delete, enable/disable, network and text filters; choose an enabled same-network entry from single withdrawals or batch rows. Format validation is not verification of address ownership. Changing a withdrawal address clears its prior confirmation.
- Exchange: choose one fiat aggregate and one USDT wallet, enter a source amount (2 fiat decimals or 6 USDT decimals), review a 30-second fixed Demo quote and enter Demo code `654321`. The source amount includes a 20 bps fee rounded up to its smallest unit; the destination amount is rounded down. A successful execution updates both Demo balances atomically and creates a linked record. Expiry, cancellation, wrong codes and failed validation do not debit funds; duplicate confirmations return the existing record. Reference estimates remain a separate read-only tool and do not set the execution price.
- Batch payouts: enter up to 50 rows or import the downloadable CSV template, resolve row errors, review per-row network fees (TRON 1 / Ethereum 3 Demo USDT) and confirm with code `654321`. The entire total is reserved once. Complete/fail/cancel individual pending rows or all pending rows; failed/cancelled principal and fees are refunded exactly once. Pending groups can be reopened, individual wallet-activity rows link to the batch and the original funding controls update the same group state.

All new financial calculations use integer minor units with BigInt conversion intermediates. The fiat balances are settled to cents and USDT to micro-units. These cross-asset records do not change the existing legacy bank FX pricing formulas or populate legacy fee/commission reports with crypto transactions. No RPC, custody, real quote execution or external payment is called. Lottie web 5.13.0 is pinned locally with its MIT license; self-authored SVG shape animations decorate processing/result states. Charts retain straight line segments; motion is reduced or paused for accessibility and hidden views.

Focused checks: `verify-wallet-operations.mjs`, `verify-wallet-address-book.mjs`, `verify-wallet-exchange.mjs`, `verify-wallet-batch.mjs`, `verify-wallet-workflows.mjs` and `verify-wallet-motion.mjs`.
