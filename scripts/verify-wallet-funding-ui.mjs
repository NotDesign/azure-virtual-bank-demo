import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.DEMO_URL || 'http://127.0.0.1:3193/';
const output = '.design-build/review-20261111';
const checks = [], errors = [];
const check = (ok, name) => checks.push({ name, ok: !!ok });
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
page.on('pageerror', error => errors.push(error.message));
await page.route('https://api.coinbase.com/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { currency: 'USD', rates: { USD: '1', HKD: '8', EUR: '.92', USDT: '1.25', CNY: '7.2' } } }) }));
try {
  await page.goto(base);
  await page.locator('#email').fill('finance@starocean.example');
  await page.locator('#password').fill('AzureDemo!2026');
  await page.locator('#submit').click(); await page.locator('[data-method=email]').click();
  for (let i = 0; i < 6; i++) await page.locator('#digit-' + i).fill('381726'[i]);
  await page.locator('#submit').click();
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.location.pathname.includes('/confirmed/'));
  const frame = page.frames().find(item => item.url().includes('/confirmed/'));
  await frame.waitForFunction(() => document.readyState === 'complete' && window.AzureWalletFunding?.ready && window.AzureWallets?.funding && window.AzureFiles);
  await frame.evaluate(() => go('cust', 'wallets')); await frame.waitForSelector('.wallet-deposit-btn');
  const ids = await frame.evaluate(() => Object.fromEntries(AzureWallets.list().filter(w => w.kind === 'crypto').map(w => [w.network, w.id])));
  const source = walletId => frame.evaluate(walletId => AzureWallets.snapshot().crypto.find(w => w.id === walletId), walletId);
  const records = () => frame.evaluate(() => AzureWallets.funding.records());
  const latest = () => frame.evaluate(() => AzureWallets.funding.records()[0]);
  const sample = () => frame.locator('.wf-demo-toolbar .btn').click();
  const next = () => frame.locator('[data-wf-next]').click();
  const close = () => frame.locator('.wallet-funding-modal .modal-head .icon-btn').click();
  const simulate = status => frame.locator(`.wallet-funding-modal [onclick="AzureWalletFunding.simulate('${status}')"]`).click();
  const openWithdraw = () => frame.locator('.wallet-withdraw-btn').click();
  const withdrawSubmit = async amount => {
    await openWithdraw(); await sample();
    if (amount) await frame.locator('#wallet-funding-amount').fill(amount);
    await next(); await next(); await sample(); await next();
  };
  const initial = await frame.evaluate(() => ({ selected: AzureWallets.snapshot().selectedId, bank: structuredClone(bal()), rates: { ...FXR } }));
  check(initial.selected.startsWith('fiat-') && await frame.locator('.wallet-funding-toolbar .wallet-deposit-btn').isVisible() && await frame.locator('.wallet-funding-toolbar .wallet-withdraw-btn').isVisible(), 'Fiat-selected initial view exposes USDT deposit and withdrawal actions');
  await frame.locator('.wallet-deposit-btn').click();
  check(await frame.locator('#wallet-funding-wallet').inputValue() === ids.tron && await frame.evaluate(() => AzureWallets.snapshot().selectedId) === initial.selected, 'Opening from fiat defaults to an owned crypto wallet without changing selection');
  await sample(); await frame.locator('#wallet-funding-memo').fill('Retained sample memo'); await close();
  await frame.locator('.wallet-deposit-btn').click();
  check(await frame.locator('#wallet-funding-amount').inputValue() === '2500.00' && await frame.locator('#wallet-funding-memo').inputValue() === 'Retained sample memo', 'Closing an unsubmitted form retains the draft');
  await next();
  let record = await latest();
  check(record.kind === 'deposit' && record.status === 'pending' && (await source(ids.tron)).availableUnits === null, 'Deposit creation stays pending and does not credit the balance');
  check(record.address.startsWith('DEMO-TRC20-') && await frame.locator('#wallet-funding-qr canvas, #wallet-funding-qr img').count() > 0 && (await frame.locator('.wf-warning').innerText()).includes('不可付款'), 'Receive details display non-payable Demo address, QR, and warning');
  await frame.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied for fallback test'); } } }));
  await frame.locator('[onclick="AzureWalletFunding.copy(\'address\')"]').click();
  check(await frame.locator('#wallet-funding-copy').inputValue() === record.address, 'Clipboard denial reveals a selectable manual-copy fallback');
  await frame.evaluate(() => document.querySelector('.wallet-funding-modal .modal-body').scrollTop = 0);
  await page.screenshot({ path: output + '/funding-deposit-pending-1440.png' });
  await close();
  check(await frame.locator('.wallet-funding-recovery .btn').count() === 1, 'Closing pending deposit leaves a recovery action');
  await frame.locator('.wallet-funding-recovery .btn').click(); await simulate('completed');
  check((await source(ids.tron)).availableUnits === 2500000000 && (await latest()).status === 'completed', 'Simulated deposit completion credits the principal exactly once');
  const completedBalance = JSON.stringify(await source(ids.tron));
  check(!(await frame.evaluate(id => AzureWallets.funding.transition(id, 'completed'), record.id)).ok && JSON.stringify(await source(ids.tron)) === completedBalance, 'A repeated final transition cannot credit the deposit twice');
  await close();
  check(await frame.locator('.wallet-info-btn,.wallet-credit-btn').count() === 0 && !(await frame.locator('.wallet-transfer-btn').getAttribute('class')).includes('primary'), 'Funding replaces old visible quick-credit/info actions and distinguishes internal transfers');

  await openWithdraw(); await sample();
  await frame.locator('#wallet-funding-address').fill('DEMO-ERC20-WRONGNETWORK'); await next();
  check(await frame.locator('#wallet-funding-error').isVisible() && await frame.locator('#wallet-funding-address').getAttribute('aria-invalid') === 'true', 'Wrong-network destination is blocked before review');
  await sample(); await frame.locator('#wallet-funding-confirm').uncheck(); await next();
  check((await frame.locator('#wallet-funding-error').innerText()).includes('勾選'), 'Network/address confirmation is required');
  await sample();
  await frame.locator('#wallet-funding-network').selectOption('ethereum');
  check(await frame.locator('#wallet-funding-wallet').inputValue() === ids.ethereum && (await frame.locator('[data-wf-fee]').innerText()).includes('3.00') && await frame.locator('[onclick="AzureWalletFunding.max()"]').isDisabled(), 'Network switch selects a matching owned wallet and shows its fee without inventing a balance');
  await sample(); await next();
  check((await frame.locator('#wallet-funding-error').innerText()).includes('不足'), 'Unknown balance cannot proceed with withdrawal');
  await frame.locator('#wallet-funding-network').selectOption('tron'); await sample(); await next();
  check((await frame.locator('[data-wf-principal]').innerText()).includes('100.00') && (await frame.locator('[data-wf-fee]').innerText()).includes('1.00') && (await frame.locator('[data-wf-total]').innerText()).includes('101.00'), 'Review separates principal, Demo fee, and actual total reservation');
  await frame.locator('[onclick="AzureWalletFunding.back()"]').click();
  check(await frame.locator('#wallet-funding-amount').inputValue() === '100.00' && await frame.locator('#wallet-funding-address').inputValue() === 'DEMO-TRC20-DESTINATION01' && await frame.locator('#wallet-funding-confirm').isChecked(), 'Back from review preserves amount, address, and confirmation');
  await next(); await next(); await frame.locator('#wallet-funding-otp').fill('000000'); await next();
  check((await frame.locator('#wallet-funding-error').innerText()).includes('驗證碼') && (await records()).length === 1 && (await source(ids.tron)).availableUnits === 2500000000, 'Wrong Demo OTP creates no withdrawal or financial mutation');
  await sample(); await next(); record = await latest();
  check(record.status === 'pending' && record.kind === 'withdraw' && record.reservedUnits === 101000000 && (await source(ids.tron)).availableUnits === 2399000000 && (await source(ids.tron)).frozenUnits === 101000000, 'Successful OTP reserves principal plus fee in pending withdrawal');
  await close(); await frame.locator('.wallet-funding-recovery .btn').click();
  check((await frame.locator('#wallet-funding-status-title').innerText()).includes('待處理'), 'Pending withdrawal can be reopened and continued');
  await simulate('failed');
  check((await source(ids.tron)).availableUnits === 2500000000 && (await source(ids.tron)).frozenUnits === 0 && (await frame.locator('.wf-status-head p').innerText()).includes('沒有最終扣款'), 'Failed withdrawal refunds the full reservation and uses accurate final-debit wording');
  await close(); await withdrawSubmit('100.00'); await simulate('completed');
  check((await source(ids.tron)).availableUnits === 2399000000 && (await source(ids.tron)).frozenUnits === 0 && (await latest()).settledUnits === 101000000, 'Completed withdrawal settles the reserved total without a second debit');
  await close(); await withdrawSubmit('25.00'); await simulate('cancelled');
  check((await source(ids.tron)).availableUnits === 2399000000 && (await source(ids.tron)).frozenUnits === 0 && (await latest()).status === 'cancelled', 'Cancelled pending withdrawal refunds principal and fee');
  await close();
  await frame.evaluate(id => AzureWalletFunding.openDeposit(id), ids.ethereum); await sample(); await frame.locator('#wallet-funding-amount').fill('10.123456'); await next(); await simulate('completed'); await close();
  await openWithdraw(); await frame.locator('[onclick="AzureWalletFunding.max()"]').click();
  check(await frame.locator('#wallet-funding-amount').inputValue() === '7.123456', 'Max preserves all six decimals after subtracting the Ethereum Demo fee');
  await sample(); await frame.locator('#wallet-funding-amount').fill('1.00'); await next(); await next();
  for (const locale of ['zh-Hant', 'zh-Hans', 'en']) {
    await close();
    await frame.locator('.language-picker').selectOption(locale);
    await openWithdraw(); await sample(); await frame.locator('#wallet-funding-amount').fill('1.00');
    check((await frame.locator('#wallet-funding-title').innerText()).includes(({ 'zh-Hant': '提領', 'zh-Hans': '提领', en: 'withdrawal' })[locale]), 'Funding flow uses the real ' + locale + ' locale');
    for (const stage of ['form', 'review']) {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 1100 });
        check(await frame.evaluate(() => { const d = document.querySelector('.wallet-funding-modal'); return document.documentElement.scrollWidth <= innerWidth && d.scrollWidth <= d.clientWidth && [...d.querySelectorAll('.input,.select,.wf-fee-box')].every(el => el.getBoundingClientRect().right <= d.getBoundingClientRect().right); }), 'Funding ' + stage + ' fits ' + locale + ' ' + width);
      }
      await next();
    }
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      check(await frame.evaluate(() => { const d = document.querySelector('.wallet-funding-modal'), b = d.getBoundingClientRect(); return document.documentElement.scrollWidth <= innerWidth && b.left >= 0 && b.right <= innerWidth && d.scrollWidth <= d.clientWidth; }), 'Funding modal fits ' + locale + ' ' + width);
      if (width === 390) await page.screenshot({ path: `${output}/funding-withdraw-otp-${locale}-390.png` });
    }
  }
  await frame.evaluate(() => { S.theme = 'dark'; render(); });
  check(await frame.evaluate(() => document.documentElement.dataset.theme === 'dark' && getComputedStyle(document.querySelector('.wallet-funding-modal')).backgroundColor !== 'rgb(255, 255, 255)'), 'Funding modal inherits the actual dark theme');
  await frame.locator('.wf-demo-toolbar .btn').focus(); await page.keyboard.press('Shift+Tab');
  check(await frame.evaluate(() => document.querySelector('.wallet-funding-modal').contains(document.activeElement)), 'Keyboard focus remains within the funding dialog');
  await page.keyboard.press('Escape');
  check(await frame.locator('.wallet-funding-modal').count() === 0, 'Escape closes the funding dialog');
  check(await frame.evaluate(initial => JSON.stringify(initial.bank) === JSON.stringify(bal()) && JSON.stringify(initial.rates) === JSON.stringify(FXR), initial), 'All funding UI flows leave bank balances and bank FX rates unchanged');
} catch (error) { errors.push(error.stack || error.message); }
finally { await browser.close(); }
const report = { base, mockedMarketRates: true, checks, errors };
await fs.writeFile(output + '/qa-wallet-funding-ui.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length || checks.some(check => !check.ok) ? 1 : 0;
