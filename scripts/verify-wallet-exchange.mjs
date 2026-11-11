import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as driverDelay} from 'node:timers/promises';
const base=process.env.DEMO_URL||'http://127.0.0.1:3264/';
const file=process.env.QA_REPORT||'.design-build/review-20261111/wallet-exchange/qa-wallet-exchange.json',out=path.dirname(file);
const report={base,checks:[],errors:[],failures:[]};
const check=(ok,name,detail)=>{report.checks.push({name,ok:!!ok,...(detail===undefined?{}:{detail})});if(!ok)report.failures.push(name);};
await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
// Browser clock mocks requestAnimationFrame; poll from Node so cold iframe readiness is still sampled.
async function waitInFrame(frame,predicate,arg,{timeout=30000}={}){
 const started=Date.now();
 while(Date.now()-started<timeout){
  try{if(await frame.evaluate(predicate,arg))return;}catch(error){if(frame.isDetached()||!/Execution context|destroyed|Cannot find context/i.test(String(error)))throw error;}
  await driverDelay(100);
 }
 throw new Error('Iframe readiness timed out after '+timeout+'ms: '+frame.url());
}
async function session(role='cust'){
 const c=await b.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 await c.route('https://api.coinbase.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:{currency:'USD',rates:{USD:'1',HKD:'8',USDT:'1.25',EUR:'.92',CNY:'7.2'}}})}));
 const p=await c.newPage();await p.clock.install();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base);
 await p.locator('#email').fill(role==='hq'?'stephen@ourbank.example':'finance@starocean.example');await p.locator('#password').fill('AzureDemo!2026');await p.locator('#submit').click();await p.locator('[data-method=email]').click();for(let i=0;i<6;i++)await p.locator('#digit-'+i).fill('381726'[i]);await p.locator('#submit').click();await p.locator('.cms-confirmed-frame').waitFor();const f=await(await p.locator('.cms-confirmed-frame').elementHandle()).contentFrame();await waitInFrame(f,role=>document.readyState==='complete'&&window.AzureFiles&&window.AzureWalletExchange?.ready&&AzureWallets.operations?.exchange&&AzureBridge.account?.role===role,role,{timeout:60000});return{c,p,f};
}
const next=f=>f.locator('[data-wx-next]').click();
const sample=f=>f.locator('[data-wx-sample]').click();
const close=f=>f.locator('.wallet-exchange-modal .modal-head .icon-btn').click();
const snapshot=f=>f.evaluate(()=>JSON.stringify({bank:BALANCES[CID()],wallets:AzureWallets.list(),ledger:AzureWallets.snapshot().ledger,records:AzureWallets.operations.exchange.records()}));
const exchangeRecords=f=>f.evaluate(()=>AzureWallets.operations.exchange.records());
const latest=f=>f.evaluate(()=>AzureWallets.operations.exchange.records()[0]);
try{
 const {c,p,f}=await session();await f.evaluate(()=>go('cust','wallets'));await f.locator('.wallet-exchange-btn').waitFor();
 const ids=await f.evaluate(()=>Object.fromEntries(AzureWallets.list().map(w=>[w.kind==='fiat'?w.asset:w.network,w.id])));
 check(await f.locator('.wallet-exchange-btn').isVisible()&&await f.locator('.wallet-exchange-history-btn').isVisible(),'Wallet actions expose exchange and history as buttons');
 const before=await snapshot(f);await f.locator('.wallet-exchange-btn').click();
 check(await f.locator('.wallet-exchange-modal').getAttribute('aria-labelledby')==='wallet-exchange-title'&&await f.locator('#wallet-exchange-from').evaluate(e=>e===document.activeElement),'Dialog is labelled and initially focuses the source wallet');
 check(await f.locator('[data-wx-sample]').isVisible()&&/Demo/.test(await f.locator('.wx-demo-toolbar').innerText()),'Top sample control and Demo explanation are visible');
 const unknown=await f.locator(`#wallet-exchange-from option[value="${ids.ethereum}"]`).isDisabled();check(unknown,'A USDT source with an unknown balance cannot be sold');
 await f.locator('#wallet-exchange-from').selectOption(ids.HKD);await f.locator('#wallet-exchange-to').selectOption(ids.tron);await f.locator('#wallet-exchange-amount').fill('1.001');await next(f);
 check(await f.locator('#wallet-exchange-error').isVisible()&&await f.locator('#wallet-exchange-amount').count()===1,'Fiat input with more than 2 decimal places remains on the form with an error');
 check(await snapshot(f)===before,'Rejected form input leaves balances and history unchanged');
 await f.locator('#wallet-exchange-amount').fill('78.00');await next(f);
 check(await f.locator('[data-wx-rate]').isVisible()&&await f.locator('[data-wx-fee]').isVisible()&&await f.locator('[data-wx-receive]').isVisible(),'Review shows rate, included fee and exact amount received');
 check((await f.locator('[data-wx-fee]').innerText()).includes('0.16')&&(await f.locator('[data-wx-receive]').innerText()).includes('9.979487'),'HKD quote uses fixed 7.8 Demo rate, fee rounding and 6-decimal target rather than market rates');
 check(await snapshot(f)===before,'Obtaining a quote does not debit either wallet');
 await close(f);check(await snapshot(f)===before,'Cancelling a quote does not debit or create a completed record');
 await p.clock.runFor(32);await waitInFrame(f,()=>document.activeElement?.classList.contains('wallet-exchange-btn'));check(await f.locator('.wallet-exchange-btn').evaluate(e=>e===document.activeElement),'Closing restores focus to the wallet action');
 await f.locator('.wallet-exchange-btn').click();await sample(f);check(Number(await f.locator('#wallet-exchange-amount').inputValue())>0,'Demo sample fills an amount for the selected source');
 await f.locator('#wallet-exchange-from').selectOption(ids.HKD);await f.locator('#wallet-exchange-to').selectOption(ids.tron);await f.locator('#wallet-exchange-amount').fill('78.00');await next(f);
 await p.clock.fastForward(31000);
 check(await f.locator('[data-wx-expired]').isVisible()&&/重新|new quote/i.test(await f.locator('[data-wx-next]').innerText()),'Expired quote visibly requires a new quote');
 await next(f);check(await f.locator('#wallet-exchange-otp').count()===0&&(await f.locator('[data-wx-expired]').isHidden()),'Expired quote is refreshed before OTP, without executing');
 check(await snapshot(f)===before,'Expired and refreshed quotes do not change balances');await next(f);
 check(await f.locator('#wallet-exchange-otp').isVisible()&&(await f.locator('.wx-otp-hint').innerText()).includes('654321'),'Confirmation opens the explicit Demo OTP step');
 await f.locator('#wallet-exchange-otp').fill('000000');await next(f);check(await f.locator('#wallet-exchange-error').isVisible()&&(await f.locator('#wallet-exchange-error').innerText()).includes('654321')&&await snapshot(f)===before,'Wrong OTP cannot create an exchange or change balances');
 await sample(f);check(await f.locator('#wallet-exchange-otp').inputValue()==='654321','OTP sample fills only the visible Demo code');
 await f.evaluate(()=>{AzureWalletExchange.next();AzureWalletExchange.next();AzureWalletExchange.next();});await f.locator('#wallet-exchange-result').waitFor();
 const rec=await latest(f),after=await f.evaluate(()=>({bank:bal().HKD.a,crypto:AzureWallets.list().find(w=>w.network==='tron').available,records:AzureWallets.operations.exchange.records().length,ledger:AzureWallets.snapshot().ledger}));
 check(after.records===1&&rec.status==='completed','Repeated confirmation creates exactly one completed exchange');
 check(after.bank===286450.2-78&&after.crypto===9.979487,'Both wallet balances reflect the exact total debit and net credit',after);
 check(await f.locator('.wx-ledger-pair>div').count()===2&&await f.locator('[data-wallet-motion=success]').count()===1,'Completion presents both financial legs and a decorative success slot');
 await f.locator('.wallet-exchange-modal .modal-foot .btn').first().click();check(await f.locator(`[data-wx-record="${rec.id}"]`).isVisible(),'Completed exchange is available in current-customer history');
 await f.locator(`[data-wx-record="${rec.id}"]`).click();check((await f.locator('.wx-complete').innerText()).includes(rec.id),'History opens the existing record without executing again');await close(f);
 await f.evaluate(({fromWalletId,toWalletId})=>AzureWalletExchange.open({fromWalletId,toWalletId}),{fromWalletId:ids.tron,toWalletId:ids.USD});
 check(await f.locator('#wallet-exchange-from').inputValue()===ids.tron&&await f.locator('#wallet-exchange-to').inputValue()===ids.USD,'Reverse USDT-to-fiat flow opens the requested owned wallets');
 await f.locator('#wallet-exchange-amount').fill('1.0000001');await next(f);check(await f.locator('#wallet-exchange-error').isVisible(),'USDT input with more than 6 decimals is rejected');await f.locator('#wallet-exchange-amount').fill('1.234567');await next(f);
 check((await f.locator('[data-wx-fee]').innerText()).includes('0.00247')&&(await f.locator('[data-wx-receive]').innerText()).includes('1.23'),'Reverse quote displays source USDT fee and 2-decimal fiat receipt');await next(f);await sample(f);await next(f);await f.locator('#wallet-exchange-result').waitFor();check((await exchangeRecords(f)).length===2,'Reverse exchange completes and produces its own history record');await close(f);
 for(const [locale,width]of[['zh-Hant',390],['zh-Hans',390],['en',320]]){
  await p.setViewportSize({width,height:900});await f.evaluate(locale=>{I18N.set(locale);setTheme('dark');setFontSize('large');},locale);await f.locator('.wallet-exchange-btn').click();const g=await f.locator('.wallet-exchange-modal').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth,scroll:document.documentElement.scrollWidth,body:el.querySelector('.modal-body').scrollWidth,bodyWidth:el.querySelector('.modal-body').clientWidth,controls:[...el.querySelectorAll('button,input,select')].filter(x=>x.getClientRects().length).map(x=>{const q=x.getBoundingClientRect();return{left:q.left,right:q.right,height:q.height};})};});check(g.left>=0&&g.right<=g.width&&g.scroll<=g.width&&g.body<=g.bodyWidth+1&&g.controls.every(x=>x.left>=0&&x.right<=g.width&&x.height>=44),`${locale} dark large-text form fits ${width}px with usable controls`,g);
  const expected={en:'From wallet','zh-Hant':'賣出錢包','zh-Hans':'卖出钱包'}[locale];check((await f.locator('label[for=wallet-exchange-from]').innerText())===expected,`${locale} exchange labels use the selected language`);
  await sample(f);await next(f);await p.screenshot({path:out+`/exchange-${locale}-${width}-dark.png`});check(await f.locator('[data-wx-receive]').isVisible(),`${locale} review is operable on mobile`);await f.locator('.wallet-exchange-modal').press('Escape');check(await f.locator('.wallet-exchange-modal').count()===0,`${locale} dialog closes with Escape`);
 }
 await p.setViewportSize({width:1440,height:1050});await f.evaluate(()=>{cust(CID()).status='冻结';render();});check(await f.locator('.wallet-exchange-btn').isDisabled(),'Frozen customer exchange CTA is disabled');await f.evaluate(()=>AzureWalletExchange.open());check(await f.locator('.wallet-exchange-modal').count()===0,'Direct UI open cannot bypass frozen state');await f.locator('.wallet-exchange-history-btn').click();check(await f.locator('[data-wx-record]').count()===2,'Read-only customers can still inspect existing exchange history');await close(f);await c.close();
 const hq=await session('hq');await hq.f.evaluate(()=>adminOpenCustomer('AZ100001','wallets'));await waitInFrame(hq.f,()=>{const w=document.querySelector('.admin-customer-frame')?.contentWindow;return w?.document.readyState==='complete'&&w.AzureWalletExchange&&w.AzureFiles&&w.AzureAdminChild?.customerId==='AZ100001';});const child=await(await hq.f.locator('.admin-customer-frame').elementHandle()).contentFrame();await child.locator('.wallet-exchange-btn').click();await sample(child);await next(child);await next(child);await sample(child);await next(child);await child.locator('#wallet-exchange-result').waitFor();const delegated=await latest(child);check(delegated.customerId==='AZ100001'&&await hq.f.evaluate(()=>AzureBridge.account.role)==='hq','HQ delegation executes only for its selected customer and preserves administrator identity');await child.evaluate(()=>AzureWalletExchange.openRecord('unrelated-record'));check((await child.locator('.wx-complete').innerText()).includes(delegated.id),'An unknown history ID cannot open a foreign or fabricated record');await hq.f.locator('#admin-customer-select').selectOption('AZ100002');await waitInFrame(hq.f,()=>document.querySelector('.admin-customer-frame')?.contentWindow?.AzureAdminChild?.customerId==='AZ100002'&&document.querySelector('.admin-customer-frame').contentWindow.AzureWalletExchange);const other=await(await hq.f.locator('.admin-customer-frame').elementHandle()).contentFrame();check(await other.evaluate(id=>AzureWallets.operations.exchange.get(id)===null,delegated.id),'A different delegated customer cannot access the prior customer exchange');await hq.c.close();
}catch(e){report.errors.push(String(e.stack||e));}finally{await b.close();await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.ok).length,failures:report.failures,errors:report.errors,file}));}if(report.failures.length||report.errors.length)process.exitCode=1;
