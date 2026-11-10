import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.DEMO_URL || 'http://127.0.0.1:3193/';
const output = '.design-build/review-20261110';
const checks = [], errors = [], observations = {};
const check = (ok, name) => checks.push({ name, ok: !!ok });
const money = value => value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1920, height: 1200 } });
let usdtRate = 1.25, failProvider = false;
page.on('pageerror', error => errors.push(error.message));
await fs.mkdir(output, { recursive: true });
await page.route('https://api.coinbase.com/**', route => route.fulfill({
  status: failProvider ? 503 : 200,
  contentType: 'application/json',
  body: failProvider ? '{}' : JSON.stringify({ data: { currency: 'USD', rates: { USD: '1', HKD: '8', EUR: '0.92', CNY: '7.2', USDT: String(usdtRate) } } })
}));

try {
  await page.goto(base);
  await page.locator('#email').fill('finance@starocean.example');
  await page.locator('#password').fill('AzureDemo!2026');
  await page.locator('#submit').click(); await page.locator('[data-method=email]').click();
  for (let i = 0; i < 6; i++) await page.locator('#digit-' + i).fill('381726'[i]);
  await page.locator('#submit').click();
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.location.pathname.includes('/confirmed/'));
  const frame = page.frames().find(item => item.url().includes('/confirmed/'));
  await frame.waitForFunction(() => document.readyState === 'complete' && window.AzureFiles && window.AzureWalletWorkbench && window.AzureWalletPreview?.ready && window.AzureMarketRates?.status().hasData);
  await frame.evaluate(() => go('cust', 'wallets'));
  await frame.waitForSelector('.wallet-classification');
  const overview = () => frame.evaluate(() => ({
    preferences: AzureWallets.snapshot().preferences,
    values: Object.fromEntries([...document.querySelectorAll('[data-wallet-reference]')].map(el => [el.dataset.walletReference, el.textContent])),
    counts: Object.fromEntries([...document.querySelectorAll('[data-wallet-category-count]')].map(el => [el.dataset.walletCategoryCount, el.textContent])),
    missing: Object.fromEntries([...document.querySelectorAll('[data-wallet-category-missing]')].map(el => [el.dataset.walletCategoryMissing, el.textContent]))
  }));
  const financial = () => frame.evaluate(() => ({ bank: structuredClone(bal()), rates: { ...FXR }, crypto: AzureWallets.snapshot().crypto, ledger: AzureWallets.snapshot().ledger }));
  const initial = await overview(); observations.initial = initial;
  const expectedUSD = 286450.2 / 8 + 131430.55 + 32600 / 7.2;
  check(initial.values.fiat === money(expectedUSD), 'Reference subtotal excludes supplied CNH balance without a market rate');
  check(initial.values.crypto === '未提供', 'Missing digital balances remain unprovided rather than zero');
  check(initial.missing.total.includes('2 項') && initial.missing.total.includes('1 項'), 'Missing balances and missing rates are counted separately');
  await frame.evaluate(() => { ACCOUNTS.push({ ...ACCOUNTS.find(a => a.cust === CID() && a.ccy === 'USD'), no: 'DEMO-DUPLICATE' }); render(); });
  check((await overview()).values.fiat === initial.values.fiat, 'A second USD bank account does not duplicate the currency aggregate');
  await frame.evaluate(() => { ACCOUNTS.pop(); render(); });
  const beforePreferences = await financial();
  await frame.locator('#wallet-privacy-toggle').click();
  check((await overview()).values.total === '••••' && (await overview()).values.fiat === '••••', 'Privacy masks overview monetary values');
  check((await frame.locator('.wallet-selected .wallet-amount').innerText()).includes('••••'), 'Original selected-wallet amount follows the same privacy setting');
  await frame.locator('#wallet-display-currency').selectOption('HKD');
  check((await overview()).preferences.displayCurrency === 'HKD', 'Display currency is stored through the root preferences API');
  check(JSON.stringify(beforePreferences) === JSON.stringify(await financial()), 'Privacy and display currency do not mutate financial data');
  await frame.locator('#wallet-privacy-toggle').click();
  check((await overview()).values.fiat === money(expectedUSD * 8), 'HKD reference subtotal uses only supplied balances and rates');

  await frame.locator('#wallet-workbench-tab-activity').click();
  check(await frame.locator('.wallet-toolbar').isHidden() && await frame.locator('.wallet-selected').isHidden() && await frame.locator('.wallet-list-card').isHidden() && await frame.locator('.wallet-history').isVisible(), 'Transactions tab retains the ledger root and hides wallet-only controls');
  check(await frame.locator('.amr-panel').isVisible(), 'Independent market panel remains visible on Transactions');
  check(await frame.evaluate(() => document.activeElement.id === 'wallet-workbench-tab-activity'), 'Tab switch restores keyboard focus');
  await page.keyboard.press('ArrowLeft');
  check((await overview()).preferences.tab === 'wallets', 'Arrow key returns to Wallets through preferences');
  const ids = await frame.evaluate(() => {
    const list = AzureWallets.list();
    return { usd: list.find(w => w.asset === 'USD').id, cnh: list.find(w => w.asset === 'CNH').id, tron: list.find(w => w.kind === 'crypto' && w.network === 'tron').id, ethereum: list.find(w => w.kind === 'crypto' && w.network === 'ethereum').id };
  });

  // Reference preview supports unknown balances but cannot fill their Max value.
  const quote = await frame.evaluate(ids => ({ valid: AzureWalletPreview.compute(ids.tron, ids.usd, '100'), sameAsset: AzureWalletPreview.compute(ids.tron, ids.ethereum, '100'), missingRate: AzureWalletPreview.compute(ids.cnh, ids.usd, '100'), badAmounts: ['0', '-1', '1e3', '1.1234567'].map(value => AzureWalletPreview.compute(ids.tron, ids.usd, value).ok) }), ids);
  check(quote.valid.ok && quote.valid.result === 80, 'Mock USD/USDT rate makes 100 USDT preview exactly 80 USD');
  check(!quote.sameAsset.ok && quote.sameAsset.reason === 'same-asset', 'Same-asset wallets use transfers rather than conversion preview');
  check(!quote.missingRate.ok && quote.missingRate.reason === 'rate', 'CNH without a supplied market rate has no preview value');
  check(quote.badAmounts.every(ok => !ok), 'Zero, negative, exponential, and overprecision amounts are rejected');
  await frame.locator('#wallet-select').selectOption(ids.ethereum);
  await frame.locator('.wallet-preview-btn').click();
  check(await frame.locator('#wallet-quote-from').inputValue() === ids.ethereum, 'Preview retains the exact selected Ethereum wallet');
  check(await frame.locator('[data-wallet-quote-max]').isDisabled(), 'Max remains disabled for an unknown source balance');
  await frame.locator('.modal-head .icon-btn').click();
  await frame.locator('#wallet-select').selectOption(ids.tron);
  await frame.locator('.wallet-credit-btn').click();
  await frame.locator('#wallet-credit-amount').fill('1000');
  await frame.locator('.wallet-credit-submit').click();
  check((await overview()).values.crypto === '6,400.00', 'A supplied simulated USDT balance appears in the reference subtotal');
  const beforePreview = await financial();
  await frame.locator('#wallet-privacy-toggle').click();
  await frame.locator('.wallet-preview-btn').click();
  check((await frame.locator('[data-wallet-quote-result]').innerText()).includes('••••') && (await frame.locator('[data-wallet-quote-balance]').innerText()).includes('••••'), 'Conversion result and source balance honor privacy');
  await frame.locator('.modal-head .icon-btn').click();
  await frame.locator('#wallet-privacy-toggle').click();
  await frame.locator('.wallet-preview-btn').click();
  await frame.locator('[data-wallet-quote-max]').click();
  check(await frame.locator('#wallet-quote-amount').inputValue() === '1000', 'Max uses the selected source wallet balance');
  await frame.locator('.wallet-quote-modal [onclick="AzureWalletPreview.swap()"]').click();
  check(await frame.locator('#wallet-quote-from').inputValue() === ids.usd && await frame.locator('#wallet-quote-to').inputValue() === ids.tron, 'Swap preserves the exact crypto network wallet as destination');
  await frame.locator('.wallet-quote-modal [onclick="AzureWalletPreview.swap()"]').click();
  await frame.locator('#wallet-quote-amount').fill('100');
  await frame.locator('#wallet-quote-amount').focus();
  await frame.evaluate(() => { window.__qaOverviewNode = document.querySelector('.wallet-classification'); window.__qaQuoteNode = document.querySelector('.wallet-quote-modal'); });
  usdtRate = 2;
  await frame.evaluate(() => AzureMarketRates.refresh());
  check((await frame.locator('[data-wallet-quote-result]').innerText()).includes('50.00 USD'), 'Market update changes the reference result without creating an order');
  check(await frame.evaluate(ids => document.querySelector('.wallet-classification') === window.__qaOverviewNode && document.querySelector('.wallet-quote-modal') === window.__qaQuoteNode && document.querySelector('#wallet-quote-from').value === ids.tron && document.querySelector('#wallet-quote-to').value === ids.usd && document.querySelector('#wallet-quote-amount').value === '100', ids), 'Async update preserves overview, modal, wallet choices, and typed amount');
  check((await overview()).values.crypto === '4,000.00', 'Async market subscription updates the supplied digital reference subtotal');
  failProvider = true;
  await frame.evaluate(() => AzureMarketRates.refresh());
  check((await frame.locator('[data-wallet-quote-state]').innerText()).includes('已過期'), 'Provider failure marks the retained preview as stale');
  check(await frame.locator('.wallet-reference-warning').count() === 1, 'Asset overview also marks stale reference data');
  check(JSON.stringify(beforePreview) === JSON.stringify(await financial()), 'All preview and provider updates leave balances, FXR, and ledger unchanged');
  await frame.locator('.modal-head .icon-btn').click();
  failProvider = false; usdtRate = 1.25;
  await frame.evaluate(() => AzureMarketRates.refresh());
  await frame.locator('#wallet-new-btn').click();
  await frame.locator('#wallet-name').fill('Retained demo draft');
  await frame.evaluate(() => { window.__qaDraftModal = document.querySelector('.modal'); });
  await frame.evaluate(() => AzureMarketRates.refresh());
  check(await frame.evaluate(() => document.querySelector('.modal') === window.__qaDraftModal && document.querySelector('#wallet-name').value === 'Retained demo draft'), 'Reference polling does not reset an unrelated wallet-creation draft');
  await frame.locator('.modal-head .icon-btn').click();

  for (const locale of ['zh-Hant', 'zh-Hans', 'en']) {
    await frame.locator('.language-picker').selectOption(locale);
    check(await frame.locator('#wallet-classification-title').innerText() === ({ 'zh-Hant': '資產概況', 'zh-Hans': '资产概况', en: 'Asset overview' })[locale], 'Asset overview locale ' + locale);
    for (const width of [1920, 1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 }); await page.waitForTimeout(150);
      check(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Workbench fits ' + locale + ' ' + width);
      if (width === 390 || locale === 'zh-Hant' && width === 1920) {
        await frame.evaluate(() => document.querySelector('.main').scrollTop = 0);
        await page.screenshot({ path: `${output}/wallet-workbench-${locale}-${width}.png`, animations: 'disabled' });
      }
    }
  }
  await frame.locator('.header-controls>button').first().click();
  check(await frame.evaluate(() => document.documentElement.dataset.theme === 'dark'), 'Workbench follows the existing dark theme');
  await frame.evaluate(() => go('cust', 'home'));
  await frame.waitForSelector('.wallet-workbench-home-categories');
  check(await frame.locator('.wallet-workbench-home-categories').count() === 1, 'Homepage preview shows actual fiat and digital category counts only');
  observations.final = await frame.evaluate(() => ({ preferences: AzureWallets.snapshot().preferences, categories: document.querySelector('.wallet-workbench-home-categories').textContent }));
} catch (error) {
  errors.push(error.stack || error.message);
} finally {
  await browser.close();
}
const report = { base, mockedMarketRates: true, checks, errors, observations };
await fs.writeFile(output + '/qa-wallet-workbench.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length || checks.some(item => !item.ok) ? 1 : 0;
