import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {dirname} from 'node:path';

const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const output='.design-build/review-20261020';
const reportFile=process.env.QA_REPORT||output+'/qa-fx-account-overview.json';
await fs.mkdir(output,{recursive:true});await fs.mkdir(dirname(reportFile),{recursive:true});
const report={base,checks:[],failures:[],errors:[],observations:{}};
const check=(ok,label)=>{report.checks.push({label,passed:!!ok});if(!ok)report.failures.push(label);};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
context.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));
async function ready(frame,role){await frame.waitForFunction(role=>document.readyState==='complete'&&window.AzureFiles&&window.AzureWizard&&window.AzureReviewFX?.ready&&AzureBridge.account?.role===role,role);await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));}
async function login(role){const page=await context.newPage();await page.goto(base);await page.locator('#email').fill(role==='hq'?'stephen@ourbank.example':'finance@starocean.example');await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('.cms-confirmed-frame')?.contentWindow?.document.querySelector('.page-title'));const frame=page.frames().find(f=>f.url().includes('/confirmed/'));await ready(frame,role);return{page,frame};}
async function numericSync(frame){return frame.evaluate(()=>{const number=value=>Number(value.replace(/,/g,''));return [...document.querySelectorAll('[data-balance-currency]')].every(group=>{const b=BALANCES[CID()]?.[group.dataset.balanceCurrency];if(!b)return [...group.querySelectorAll('[data-balance]')].every(e=>e.dataset.unavailable==='true');return [['available',b.a],['frozen',b.f],['total',b.a+b.f]].every(([key,n])=>number(group.querySelector(`[data-balance="${key}"]`).textContent)===Number(n.toFixed(2)));});});}
async function childFor(frame,id){await frame.waitForFunction(id=>document.querySelector('.admin-customer-frame')?.contentWindow?.AzureAdminChild?.customerId===id,id);const handle=await frame.locator('.admin-customer-frame').elementHandle();const child=await handle.contentFrame();await ready(child,'cust');await child.waitForSelector('.rfx-accounts');return child;}
try{
 const {page,frame:f}=await login('cust');await f.evaluate(()=>location.hash='#/cust/fx');await f.locator('.rfx-accounts').waitFor();
 const original=await f.evaluate(()=>({accounts:structuredClone(myAccts()),balances:structuredClone(bal()),count:document.querySelectorAll('[data-balance-currency]').length}));
 check(await f.locator('#rfx-accounts-title').innerText()==='各戶口結存概況','Traditional Chinese overview has the requested exact title');
 check(original.count===Object.keys(original.balances).length,'Every supplied currency appears once in the aggregate balance markup');
 check(await f.evaluate(()=>myAccts().every(a=>[...document.querySelectorAll('[data-rfx-account]')].some(row=>row.dataset.rfxAccount===a.no&&row.textContent.includes(I18N.tr(a.bank))&&row.textContent.includes(I18N.tr(a.status))))),'All supplied account numbers, banks and statuses appear without substitution');
 check(await numericSync(f),'Initial available, frozen and total values match the currency balance source');
 await f.locator('.rfx-accounts').screenshot({path:output+'/fx-account-overview-desktop.png',animations:'disabled'});
 for(const width of [1920,1440]){
  await page.setViewportSize({width,height:1080});await f.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  const rect=await f.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height};};return{form:r(document.querySelector('.fx-box')),chart:r(document.querySelector('.rfx-chart')),canvas:r(document.getElementById('fxc')),width:innerWidth,pageWidth:document.documentElement.scrollWidth};});
  check(Math.abs(rect.form.top-rect.chart.top)<1&&Math.abs(rect.form.bottom-rect.chart.bottom)<1,'FX form and chart share top and bottom edges at '+width+'px');
  check(rect.canvas.height>=240&&rect.chart.bottom-rect.canvas.bottom<=28&&rect.canvas.bottom<=rect.chart.bottom,'Chart fills the aligned card without unused bottom space at '+width+'px');
  check(rect.pageWidth<=rect.width,'Desktop FX page has no horizontal overflow at '+width+'px');
  report.observations['layout'+width]=rect;
 }
 await f.locator('.rfx-layout').screenshot({path:output+'/fx-chart-alignment-desktop.png',animations:'disabled'});
 await f.evaluate(()=>{const usd=myAccts().find(a=>a.ccy==='USD');ACCOUNTS.push({...usd,nick:'Demo second USD account',bank:'Demo second bank',no:'QA-USD-002'});ACCOUNTS.push({cust:CID(),nick:'Demo unsupported balance',bank:'Demo GBP bank',no:'QA-GBP-UNKNOWN',ccy:'GBP',status:'正常'});render();});
 const multi=await f.locator('[data-balance-currency="USD"]').evaluate(group=>({rows:group.querySelectorAll('[data-rfx-account]').length,available:group.querySelectorAll('[data-balance="available"]').length,count:group.dataset.accountCount,scope:group.querySelector('.rfx-currency').textContent}));
 check(multi.rows===2&&multi.available===1&&multi.count==='2'&&/幣種匯總/.test(multi.scope),'Multiple bank accounts in one currency share one explicitly labeled currency aggregate');
 check(await f.locator('[data-balance-currency="GBP"] [data-unavailable]').count()===3&&await f.evaluate(()=>BALANCES[CID()].GBP===undefined),'An account without balance data says Not supplied without inventing zero or using held-return funds');
 check(await numericSync(f),'Additional same-currency accounts do not duplicate or divide source balances');
 await f.evaluate(()=>{ACCOUNTS.splice(0,ACCOUNTS.length,...ACCOUNTS.filter(a=>!['QA-USD-002','QA-GBP-UNKNOWN'].includes(a.no)));render();});
 for(const [locale,title]of [['en','Account balance overview'],['zh-Hans','各户口结存概况'],['zh-Hant','各戶口結存概況']]){await f.locator('.language-picker').selectOption(locale);check(await f.locator('#rfx-accounts-title').innerText()===title,'Overview title is localized for '+locale);check(await numericSync(f),'Locale switching preserves balance values for '+locale);}
 await f.evaluate(()=>setTheme('dark'));check(await f.evaluate(()=>document.documentElement.dataset.theme==='dark'&&getComputedStyle(document.querySelector('.rfx-accounts')).backgroundColor!=='rgb(255, 255, 255)'),'Account overview follows the dark theme');check(await numericSync(f),'Dark theme preserves the source balance values');await f.evaluate(()=>setTheme('light'));
 for(const width of [768,390,320]){await page.setViewportSize({width,height:1000});await f.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'FX overview and form fit '+width+'px');if(width<=390){check(await f.locator('.rfx-account-cards').isVisible(),'Account overview uses readable stacked cards at '+width+'px');check(await f.locator('[data-rfx-mobile-account]').count()===original.accounts.length,'Mobile account list retains every supplied account at '+width+'px');}if(width===390){await f.evaluate(()=>document.getElementById('main').scrollTop=0);await page.screenshot({path:output+'/fx-account-overview-mobile.png',animations:'disabled'});}}
 const before=await f.evaluate(()=>structuredClone(bal()));await f.evaluate(()=>{S.fx={sell:'USD',buy:'HKD',amt:100,range:'7',lock:'S'};render();});await f.locator('.fx-box button[onclick="fxConfirm()"]').click();await f.locator('.modal-foot .primary').click();await f.locator('.modal').waitFor({state:'detached'});
 const executed=await f.evaluate(()=>({balances:structuredClone(bal()),order:structuredClone(FX_ORDERS[0])}));
 check(Math.abs(executed.balances.USD.a-(before.USD.a-100))<1e-8,'FX execution deducts the exact original sold amount');
 check(Math.abs(executed.balances.HKD.a-(before.HKD.a+executed.order.buyAmt))<1e-8,'FX execution credits the original calculated bought amount');
 check(executed.balances.USD.f===before.USD.f&&executed.balances.HKD.f===before.HKD.f,'FX execution leaves frozen balances unchanged');check(await numericSync(f),'All account-overview numeric aggregates update after FX execution');
 check(await f.evaluate(()=>{const b=bal().USD,card=document.querySelector('[data-rfx-card-currency="USD"]');return card.querySelector('[data-rfx-mobile-balance="available"]').textContent===nf(b.a)&&card.querySelector('[data-rfx-mobile-balance="total"]').textContent===nf(b.a+b.f);}), 'Mobile overview numbers also synchronize after FX execution');await page.close();

 const {page:hqPage,frame:hq}=await login('hq');await hq.evaluate(()=>adminOpenCustomer('AZ100001','fx'));await hq.waitForFunction(()=>S.page==='customer-fx');let child=await childFor(hq,'AZ100001');
 check(await child.locator('.rfx-accounts').getAttribute('data-rfx-customer')==='AZ100001'&&await numericSync(child),'HQ delegated FX overview uses the selected customer and actual supplied balances');
 await hq.locator('#admin-customer-select').selectOption('AZ100002');child=await childFor(hq,'AZ100002');
 const delegated=await child.evaluate(()=>({cid:CID(),accounts:myAccts().map(a=>a.no),shown:[...document.querySelectorAll('[data-rfx-account]')].map(e=>e.dataset.rfxAccount),balance:BALANCES[CID()],groups:[...document.querySelectorAll('[data-balance-currency]')].map(g=>({currency:g.dataset.balanceCurrency,missing:g.querySelectorAll('[data-unavailable]').length})),trade:!!document.querySelector('.fx-box')}));
 check(delegated.cid==='AZ100002'&&JSON.stringify(delegated.accounts)===JSON.stringify(delegated.shown),'HQ switch renders only the newly selected customer’s bank accounts');
 check(!delegated.balance&&delegated.groups.length>0&&delegated.groups.every(g=>g.missing===3)&&!delegated.trade,'Missing HQ customer balances remain Not supplied and do not create a tradable zero balance');
 check(await hq.evaluate(()=>AzureBridge.account.role)==='hq','Delegated account overview keeps the parent HQ identity');
 await hq.locator('#admin-customer-select').selectOption('AZ100001');child=await childFor(hq,'AZ100001');check(await numericSync(child),'Switching back restores the correct original customer balance scope');await hqPage.close();
}catch(error){report.errors.push(error.stack||error.message);}
finally{await browser.close();await fs.writeFile(reportFile,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));process.exitCode=report.errors.length||report.failures.length?1:0;
