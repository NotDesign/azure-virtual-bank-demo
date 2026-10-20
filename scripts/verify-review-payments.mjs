import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.DEMO_URL || 'http://127.0.0.1:3193/';
const output = '.design-build/review-20261020';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const checks = [], errors = [], observations = {};
const check = (ok, name) => checks.push({ name, ok: !!ok });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
await fs.mkdir(output, { recursive: true });

async function navigate(frame, page) {
  await frame.evaluate(page => go('cust', page), page);
  await frame.waitForFunction(page => S.page === page, page);
}
async function fillRecipient(frame, fields) {
  for (const [key, value] of Object.entries(fields)) await frame.locator('#rp-' + key).fill(value);
}
async function attachProof(frame) {
  await frame.locator('#rp-proof').setInputFiles({ name: 'demo-invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
}
async function bodyFits(page, frame, name) {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(100);
    check(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' body fits ' + width);
  }
}

try {
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.locator('#email').fill('finance@starocean.example');
  await page.locator('#password').fill('AzureDemo!2026');
  await page.locator('#submit').click();
  await page.locator('[data-method=email]').click();
  for (let i = 0; i < 6; i++) await page.locator('#digit-' + i).fill('381726'[i]);
  await page.locator('#submit').click();
  await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.location.pathname.includes('/confirmed/'));
  const f = page.frames().find(frame => frame.url().includes('/confirmed/'));
  await f.waitForFunction(() => document.readyState === 'complete' && window.AzureFiles && window.AzureWizard && window.AzureReviewPayments);
  await navigate(f, 'pay');
  await f.locator('input[onchange^="S.pay.amt"]').fill('1234.56');
  await f.locator('.rp-add-recipient').click();
  const before = await f.evaluate(() => ({ ...S.pay }));
  check(before.amt === 1234.56, 'Opening inline recipient captures the latest payment amount');
  await f.locator('.modal-foot .primary').click();
  check(await f.locator('.modal').count() === 1 && await f.locator('#rp-form-error').isVisible(), 'Missing required recipient name prevents submission');
  await fillRecipient(f, { name: 'Demo Acme & Partners Limited', cn: '示範安可信有限公司', regNo: '000012345', city: 'Hong Kong', addr: 'Demo Unit 7, Central', phone: '+852 12345678', acctName: 'DEMO ACME ACCOUNT', acct: '000019876543', bank: 'Demo Bank & Co', swift: 'TESTHKHHXXX', bankAddr: 'Demo Central, Hong Kong' });
  await f.locator('#rp-country').selectOption('中国香港');
  await f.locator('#rp-region').selectOption('中国香港');
  await f.locator('#rp-ccy').selectOption('HKD');
  await attachProof(f);
  await f.locator('.modal-foot .primary').click();
  await f.locator('.modal').waitFor({ state: 'detached' });
  const created = await f.evaluate(() => ({ pay: { ...S.pay }, record: CPS.find(c => c._reviewCustomer), options: [...document.querySelector('select[onchange*="S.pay.cp"]').options].filter(o => o.disabled).map(o => ({ id: o.value, label: o.textContent })), notice: document.querySelector('.rp-new-recipient')?.textContent }));
  observations.payment = { before, after: created.pay, record: created.record, notice: created.notice };
  check(same(before, created.pay), 'Saving recipient preserves payment account, amount, recipient, lock, fees, purpose, and memo');
  check(created.record.regNo === '000012345' && created.record.accts[0].acct === '000019876543', 'Registration and bank account numbers preserve leading zeros');
  check(created.record.status === '新增待审核' && created.record.accts[0].onboard === '进件中', 'New recipient retains pending-review and channel-onboarding status');
  check(created.options.some(o => o.id === created.record.id), 'Pending recipient appears as a disabled payment option');
  check(await f.locator('.rp-new-recipient .btn').count() === 1, 'Saved pending recipient is visible with a detail button');
  const blocked = await f.evaluate(id => {
    const prior = { ...S.pay }, count = TXS.length;
    S.pay.cp = id; payDo(false, 10);
    const blocked = count === TXS.length;
    Object.assign(S.pay, prior); return blocked;
  }, created.record.id);
  check(blocked, 'Pending-review recipient cannot create a payment transaction');
  await f.locator('.rp-new-recipient .btn').first().click();
  check((await f.locator('.modal').innerText()).includes('000019876543'), 'Recipient detail displays the saved bank account');
  await f.locator('.modal-head .icon-btn').click();
  await page.screenshot({ animations: 'disabled', path: output + '/payments-desktop.png' });
  await bodyFits(page, f, 'Payment page');

  // A second recipient exercises incomplete draft storage and later resubmission.
  await f.locator('.rp-add-recipient').click();
  await f.locator('#rp-name').fill('Demo Draft & Co');
  await f.locator('.modal-foot .btn').nth(1).click();
  const draft = await f.evaluate(() => CPS.find(c => c.name === 'Demo Draft & Co'));
  check(draft?.status === '待提交' && draft.accts[0].onboard === '未进件', 'Incomplete recipient can be stored as an unsubmitted draft');
  await f.locator('.rp-new-recipient .btn').first().click();
  await f.locator('.modal-foot .btn').nth(1).click();
  check(await f.locator('#rp-name').inputValue() === 'Demo Draft & Co', 'Editing a draft restores its actual company name');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(100);
    check(await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.modal').scrollWidth <= document.querySelector('.modal').clientWidth), 'Recipient form fits ' + width);
  }
  await page.screenshot({ animations: 'disabled', path: output + '/payments-modal-mobile.png' });
  await fillRecipient(f, { regNo: '00001', city: 'Hong Kong', addr: 'Demo Unit 1', acctName: 'Different Demo Account Name', acct: '00012345', bank: 'Demo Bank', swift: 'TESTHKHH' });
  await attachProof(f);
  await f.locator('.modal-foot .primary').click();
  await f.locator('.modal').waitFor({ state: 'detached' });
  check(await f.evaluate(id => { const c = CPS.find(c => c.id === id); return c.name === 'Demo Draft & Co' && c.accts[0].name === 'Different Demo Account Name' && c.accts[0].acct === '00012345' && c.status === '新增待审核'; }, draft.id), 'Completed draft retains separate company and account-holder names and submits for review');
  await f.locator('.rp-new-recipient .btn').first().click();
  await f.locator('.modal-foot .btn').last().click();
  await f.locator('.rp-new-recipient .primary').click();
  check(await f.evaluate(id => S.pay.cp === id && CPS.find(c => c.id === id).status === '正常', draft.id), 'Explicit Demo approval makes the recipient available for selection');

  await navigate(f, 'fx');
  const beforeFx = await f.evaluate(() => ({ balances: structuredClone(bal()), cards: document.querySelectorAll('[data-balance-currency]').length, note: document.querySelector('.rp-balances .muted').textContent }));
  check(beforeFx.cards === Object.keys(beforeFx.balances).length, 'FX overview includes every currency in the actual balance source');
  check(/按幣種匯總|按币种汇总|aggregated by currency/.test(beforeFx.note), 'FX overview states that balances are currency aggregates rather than bank-account allocations');
  await f.evaluate(() => { S.fx = { sell: 'USD', buy: 'HKD', amt: 100, range: '7', lock: 'S' }; render(); });
  await f.locator('.fx-box button[onclick="fxConfirm()"]').click();
  await f.locator('.modal-foot .primary').click();
  await f.locator('.modal').waitFor({ state: 'detached' });
  const afterFx = await f.evaluate(() => ({ balances: structuredClone(bal()), order: { ...FX_ORDERS[0] }, shown: [...document.querySelectorAll('[data-balance-currency]')].map(el => ({ currency: el.dataset.balanceCurrency, available: el.querySelector('[data-balance="available"]').textContent, frozen: el.querySelector('[data-balance="frozen"]').textContent, total: el.querySelector('[data-balance="total"]').textContent })) }));
  observations.fx = { before: beforeFx, after: afterFx };
  check(Math.abs(afterFx.balances.USD.a - (beforeFx.balances.USD.a - 100)) < 1e-8, 'FX execution deducts the sold amount using the original balance calculation');
  check(Math.abs(afterFx.balances.HKD.a - (beforeFx.balances.HKD.a + afterFx.order.buyAmt)) < 1e-8, 'FX execution credits the exact original calculated bought amount');
  check(afterFx.shown.every(row => { const balance = afterFx.balances[row.currency]; const number = value => Number(value.replace(/,/g, '')); return number(row.available) === Number(balance.a.toFixed(2)) && number(row.frozen) === Number(balance.f.toFixed(2)) && number(row.total) === Number((balance.a + balance.f).toFixed(2)); }), 'Every FX available, frozen, and total balance display synchronizes after exchange');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ animations: 'disabled', path: output + '/payments-fx-desktop.png' });
  await bodyFits(page, f, 'FX overview');
  await page.screenshot({ animations: 'disabled', path: output + '/payments-fx-mobile.png' });
  await page.close();
} catch (e) {
  errors.push(e.stack || e.message);
} finally {
  await browser.close();
}
const report = { base, checks, errors, observations };
await fs.writeFile(output + '/qa-payments.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = errors.length || checks.some(c => !c.ok) ? 1 : 0;
