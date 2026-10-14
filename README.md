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
