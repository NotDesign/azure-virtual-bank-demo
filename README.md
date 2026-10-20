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

CMS scope is fixed by the authenticated account. There is no role switch. Public customer applications and agent registration are separate links; registration level is derived from the invitation code.

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

Full administrators now have a **Customer eBanking** sidebar group with all nine customer functions, including payments, FX, statements, counterparties and team settings. Select the customer in the workspace or open it from customer details. The administrator remains signed in to HQ. Customer drafts and financial demo state survive workspace navigation and customer changes within this session; new records identify the HQ actor and the selected customer separately.

Only AZ100001 has the complete banking fixture. Other customers show their own supplied accounts and transactions; missing balances remain unavailable, and the demo never reuses another customer's funds, recipients or withdrawal accounts. No live banking service is connected.

Target search and freeze filters share one row where space permits. Pricing tabs, customer selection and action buttons align. Customer tables fill their cards, row actions are horizontal, and filter buttons use their natural size. Search fields have a separate clear-text X. Narrow screens wrap filters and scroll wide tables inside the card.

`verify-admin-customer.mjs` checks the administrator workspace, customer isolation and retained state. The camera capture UI and application wizard remain unchanged.
