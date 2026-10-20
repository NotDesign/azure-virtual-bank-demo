import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base = process.env.DEMO_URL || 'http://127.0.0.1:3193/';
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const checks = [], errors = [];
const check = (ok, name) => checks.push({name,ok:!!ok});
async function login(role, email) {
  const page = await browser.newPage({reducedMotion:"reduce",viewport:{width:1600,height:1000}});
  page.on('pageerror', e => errors.push(role + ': ' + e.message));
  await page.goto(base);await page.locator('#email').fill(email);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();
  for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);
  await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.location.pathname.includes('/confirmed/'));
  const frame = page.frames().find(f=>f.url().includes('/confirmed/'));await frame.waitForFunction(()=>document.readyState==='complete' && window.AzureFiles && window.AzureWizard && window.openCompanyRateModal);return {page,frame};
}
async function navigate(f, role, page) {await f.evaluate(({role,page})=>go(role,page),{role,page});await f.waitForFunction(p=>S.page===p,page);}
try {
  const {page,frame:f} = await login('hq','stephen@ourbank.example');
  await navigate(f,'hq','customers');await f.locator('[data-review-customer="AZ100001"] .btn').first().click();
  await f.locator('#review-adjust-rates').click();
  check(await f.locator('.review-rate').getAttribute('data-company-id')==='AZ100001','Company detail opens its own rate modal');
  check(await f.evaluate(()=>S.page==='customers'),'Rate modal preserves customer page');
  check(await f.locator('.review-rate select').count()===0,'Customer cannot be switched inside the rate dialog');
  const active = await f.evaluate(()=>CUST_PRICE.AZ100001.COLLECT_G);
  const input = f.locator('#review-rate-COLLECT_G');
  await input.fill('');await f.locator('#review-save-rates').click();check(await input.getAttribute('aria-invalid')==='true','Blank rate rejected');
  await input.fill('0.01');await f.locator('#review-save-rates').click();check(await input.getAttribute('aria-invalid')==='true','Below-floor rate rejected');
  await input.fill('0.26');await f.locator('#review-rate-reason').fill('Agreed demo adjustment');await f.locator('#review-save-rates').click();
  check(await f.locator('.review-rate-result').count()===1,'Saving shows company-specific confirmation');
  check(await f.evaluate(v=>CUST_PRICE.AZ100001.COLLECT_G===v,active),'Active rate remains unchanged');
  check(await f.evaluate(()=>FEE_REQUESTS.filter(r=>r.cust==='AZ100001'&&r.prod==='COLLECT_G'&&r.status==='待发送').length===1),'One pending request created for the correct company');
  await f.evaluate(()=>openCompanyRateModal('AZ100001'));await f.locator('#review-rate-COLLECT_G').fill('0.27');await f.locator('#review-save-rates').click();
  check(await f.evaluate(()=>FEE_REQUESTS.filter(r=>r.cust==='AZ100001'&&r.prod==='COLLECT_G'&&r.status==='待发送').length===1&&FEE_REQUESTS.find(r=>r.cust==='AZ100001'&&r.prod==='COLLECT_G').to===0.27),'Editing updates the unsent request without duplicates');
  check(await f.evaluate(()=>FEE_REQUESTS.find(r=>r.cust==='AZ100001'&&r.prod==='COLLECT_G').reason==='Agreed demo adjustment'),'Existing request reason is preserved when left blank');
  await f.evaluate(()=>openCompanyRateModal('AZ100003'));check(await f.locator('#review-rate-FX').isDisabled(),'Sent request cannot be overwritten');
  await f.evaluate(()=>closeModal());await navigate(f,'hq','apps');
  const scoped = await f.evaluate(()=>appsInScope().length);
  check(await f.locator('[data-review-application]').count()===scoped,'Application list retains all scoped records');
  await f.locator('#review-app-query').fill('海韻');await f.locator('#review-app-filters button[type=submit]').click();check(await f.locator('[data-review-application="APP-26100801"]').count()===1,'Application search accepts displayed Traditional Chinese');await f.locator('#review-app-filters button[type=button]').click();
  await f.locator('#review-app-query').fill('APP-26101003');await f.locator('#review-app-filters button[type=submit]').click();check(await f.locator('[data-review-application]').count()===1,'Application ID filter works');
  await f.locator('#review-app-filters button[type=button]').click();await f.locator('#review-app-from').fill('2026-10-09');await f.locator('#review-app-to').fill('2026-10-10');await f.locator('#review-app-filters button[type=submit]').click();
  check(await f.locator('[data-review-application]').count()===2,'Application date range filters inclusively');
  await f.locator('#review-app-from').fill('2026-10-12');await f.locator('#review-app-filters button[type=submit]').click();check((await f.locator('#review-app-error').innerText()).length>0,'Reversed dates rejected');
  await f.locator('#review-app-filters button[type=button]').click();await f.locator('#review-app-query').fill('no-matching-application');await f.locator('#review-app-filters button[type=submit]').click();check(await f.locator('td.empty').count()===1,'No-results state shown');
  await f.locator('#review-app-filters button[type=button]').click();
  await f.locator('#review-app-source').selectOption('二级链接');await f.locator('#review-app-owner').selectOption('B007');await f.locator('#review-app-filters button[type=submit]').click();
  check(await f.locator('[data-review-application]').count()===1&&await f.locator('[data-review-application]').getAttribute('data-review-application')==='APP-26101208','Source and ownership filters combine');
  await f.locator('td a.btn').click();await f.waitForFunction(()=>S.page==='app');check(await f.evaluate(()=>S.arg==='APP-26101208'),'Filtered application opens matching detail');
  await navigate(f,'hq','customers');await f.locator('[data-entity="individual"]').click();check(await f.locator('td.empty').count()===1,'Individual tab does not relabel existing companies');
  await f.evaluate(()=>reviewCustomerProfile());await f.locator('#review-profile-name').fill('<img src=x>');await f.locator('#review-profile-contact').fill('Demo Contact');await f.locator('#review-profile-email').fill('person@example.com');await f.evaluate(()=>reviewSaveCustomerProfile());check(await f.locator('#review-profile-error').isVisible(),'Customer profile rejects HTML markup');await f.locator('#review-profile-name').fill('Demo Person');await f.evaluate(()=>reviewSaveCustomerProfile());
  check(await f.evaluate(()=>CUSTOMERS.some(c=>c.name==='Demo Person'&&c.entityType==='individual'&&c.status==='待完善'&&c.profileDraft)),'Individual profile saved as a draft');
  check(await f.locator('#review-adjust-rates').count()===0,'Draft has no live pricing or account actions');
  check(await f.evaluate(()=>{const c=CUSTOMERS.find(c=>c.name==='Demo Person');return !ACCOUNTS.some(a=>a.cust===c.id)&&!TXS.some(t=>t.cust===c.id); }),'Draft creates no accounts or money');
  await f.evaluate(()=>closeModal());
  await navigate(f,'hq','pricing');await f.evaluate(()=>setUI('pt','self'));await f.locator('#review-pricing-customer').selectOption('AZ100001');check(await f.locator('#review-pricing-customer').inputValue()==='AZ100001','Pricing page preserves selection of an agent-owned company');check(await f.locator('#review-pricing-customer option').evaluateAll(es=>es.every(e=>!e.textContent.includes('Demo Person'))),'Draft is excluded from all pricing entry points');
  for(const route of ['customers','apps']){
    await navigate(f,'hq',route);
    for(const width of [1440,1024,768,390,320]){
      await page.setViewportSize({width,height:900});await page.waitForTimeout(80);
      check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' body fits '+width);
    }
  }
  await page.setViewportSize({width:1600,height:1000});await navigate(f,'hq','customers');await f.evaluate(()=>openCompanyRateModal('AZ100001'));await page.waitForTimeout(400);await page.screenshot({animations:'disabled',path:'.design-build/review-20261020/rates-desktop.png'});
  await page.setViewportSize({width:390,height:844});check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.review-rate .tbl-wrap').scrollWidth>document.querySelector('.review-rate .tbl-wrap').clientWidth),'Mobile rate table scrolls inside the dialog');await page.screenshot({animations:'disabled',path:'.design-build/review-20261020/rates-mobile.png'});await page.close();
  for(const [role,email] of [['l1','ops@ganghuitong.example'],['l2','chan@chanstudio.example']]){
    const {page,frame:f}=await login(role,email);await navigate(f,role,'customers');
    await f.evaluate(()=>custDetail('AZ100005'));check(await f.locator('.review-customer-detail').count()===0,role+' cannot inspect another team customer');
    await f.evaluate(()=>openCompanyRateModal('AZ100005'));check(await f.locator('.review-rate').count()===0,role+' cannot adjust another team rate');
    await f.evaluate(()=>custDetail('AZ100001'));check((await f.locator('#review-adjust-rates').count()>0)===(role==='l1'),role+' pricing capability follows role');
    await f.evaluate(()=>closeModal());await f.evaluate(()=>reviewCustomerProfile());await f.locator('#review-profile-type').selectOption('individual');await f.locator('#review-profile-name').fill(role+' Demo');await f.locator('#review-profile-contact').fill('Contact');await f.locator('#review-profile-email').fill(role+'@example.com');await f.evaluate(()=>reviewSaveCustomerProfile());
    check(await f.evaluate(r=>{const c=CUSTOMERS.find(c=>c.name===r+' Demo');return c.l1===ME.l1.org&&(r!=='l2'||c.l2===ME.l2.org)&&custsInScope().some(x=>x.id===c.id);},role),role+' profile stays in assigned scope');
    await f.evaluate(()=>closeModal());await navigate(f,role,'apps');await f.locator('#review-app-query').fill('APP-26101104');await f.locator('#review-app-filters button[type=submit]').click();check(await f.locator('[data-review-application]').count()===0,role+' filters cannot expose another team application');
    check(await f.evaluate(()=>agent('B007').proxyApply===false),role+' profile does not change proxy-apply permission');
    await page.close();
  }
} catch(e) {errors.push(e.stack || e.message);} finally {await browser.close();}
const report={checks,errors};await fs.mkdir('.design-build/review-20261020',{recursive:true});await fs.writeFile('.design-build/review-20261020/qa-company.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=errors.length||checks.some(c=>!c.ok)?1:0;
