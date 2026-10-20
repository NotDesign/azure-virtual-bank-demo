import {chromium} from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const checks=[],errors=[];
const check=(name,ok,detail)=>checks.push({name,ok:!!ok,...(detail===undefined?{}:{detail})});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
async function login(role){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(role+': '+e.message));
 await page.goto(base);await page.locator('#email').fill(role==='hq'?'stephen@ourbank.example':'ops@ganghuitong.example');await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();
 for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();
 const host=page.locator('.cms-confirmed-frame');await host.waitFor();const frame=await(await host.elementHandle()).contentFrame();
 await frame.waitForFunction(()=>window.AzureBridge?.account&&document.querySelector('.page-title')&&window.AzureFiles);
 return {page,frame};
}
async function child(frame){
 await frame.locator('.admin-customer-frame').waitFor();
 const inner=await(await frame.locator('.admin-customer-frame').elementHandle()).contentFrame();
 await inner.waitForFunction(()=>window.AzureAdminChild&&window.AzureBridge?.account?.role==='cust'&&document.querySelector('.page-title'));
 return inner;
}
async function route(frame,key){await frame.evaluate(key=>location.hash='#/hq/customer-'+key,key);await frame.waitForFunction(key=>S.page==='customer-'+key,key);return child(frame);}
try{
 const {page,frame}=await login('hq');
 const keys=['home','accounts','statements','pay','fx','xborder','txs','cp','settings'];
 const links=await frame.locator('.sidebar a[href^="#/hq/customer-"]').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
 check('HQ exposes all nine customer functions',keys.every(k=>links.includes('#/hq/customer-'+k)),links);
 for(const key of keys){
  const inner=await route(frame,key);
  check('HQ '+key+' retains administrator context',await frame.evaluate(()=>AzureBridge.account.role==='hq'&&S.portal==='hq'));
  check('Customer '+key+' binds selected customer',await inner.evaluate(()=>AzureBridge.account.id==='AZ100001'&&CID()==='AZ100001'));
  check('Customer '+key+' renders',!!(await inner.locator('.page-title').innerText()));
 }
 let inner=await route(frame,'fx');
 const input=inner.locator('input[onchange*="S.fx.amt"]');
 await input.fill('1234');await input.blur();
 check('FX draft uses entered amount',await inner.evaluate(()=>S.fx.amt===1234));
 await frame.locator('.sidebar a[href="#/hq/customer-cp"]').click();await frame.waitForFunction(()=>S.page==='customer-cp');inner=await child(frame);
 await frame.locator('.sidebar a[href="#/hq/customer-fx"]').click();await frame.waitForFunction(()=>S.page==='customer-fx');inner=await child(frame);
 check('Parent menu navigation preserves FX draft',await inner.evaluate(()=>S.page==='fx'&&S.fx.amt===1234));
 const before=await inner.evaluate(()=>({usd:bal().USD.a,hkd:bal().HKD.a,rate:FXR.USD/FXR.HKD*(1-CUST_PRICE[CID()].FX/10000),ids:TXS.map(t=>t.id),customerEmail:ME.cust.email}));
 await inner.locator('select[onchange^="S.fx.sell="]').selectOption('USD');await inner.locator('select[onchange^="S.fx.buy="]').selectOption('HKD');
 await inner.locator('input[onchange*="S.fx.amt"]').fill('100');await inner.locator('input[onchange*="S.fx.amt"]').blur();
 await inner.locator('button[onclick="fxConfirm()"]').click();
 check('Delegated FX opens the confirmation modal',await inner.locator('.modal[role=dialog]').isVisible());
 await inner.locator('.modal-foot button[onclick^="fxDo("]').click();
 const executed=await inner.evaluate(ids=>({transaction:TXS.find(t=>!ids.includes(t.id)),usd:bal().USD.a,hkd:bal().HKD.a,customerEmail:ME.cust.email,order:FX_ORDERS[0]}),before.ids);
 const transactionId=executed.transaction?.id;
 check('USD 100 FX changes only the selected customer balances',Math.abs(executed.usd-(before.usd-100))<1e-7&&Math.abs(executed.hkd-(before.hkd+100*before.rate))<1e-7,executed);
 check('Delegated FX records the HQ actor and retains customer notification email',executed.transaction?.maker==='stephen@ourbank.example'&&executed.transaction?.customerId==='AZ100001'&&executed.transaction?.adminActor?.role==='hq'&&executed.transaction?.adminActor?.email==='stephen@ourbank.example'&&executed.transaction?.adminActor?.customerId==='AZ100001'&&executed.customerEmail===before.customerEmail&&executed.order?.adminActor?.email==='stephen@ourbank.example');
 await frame.evaluate(()=>location.hash='#/hq/dashboard');await frame.waitForFunction(()=>S.page==='dashboard');
 const parentState=await frame.evaluate(id=>({transaction:TXS.find(t=>t.id===id),usd:BALANCES.AZ100001.USD.a,hkd:BALANCES.AZ100001.HKD.a}),transactionId);
 check('Leaving customer workspace synchronizes the FX transaction and balances to HQ',parentState.transaction?.maker==='stephen@ourbank.example'&&parentState.transaction?.adminActor?.customerId==='AZ100001'&&parentState.usd===executed.usd&&parentState.hkd===executed.hkd,parentState);
 inner=await route(frame,'fx');
 check('Reopening customer FX preserves executed balances, transaction and actor',await inner.evaluate(({id,usd,hkd})=>bal().USD.a===usd&&bal().HKD.a===hkd&&TXS.some(t=>t.id===id&&t.maker==='stephen@ourbank.example'&&t.adminActor?.customerId==='AZ100001')&&FX_ORDERS.some(o=>o.tx===id&&o.adminActor?.email==='stephen@ourbank.example'),{id:transactionId,usd:executed.usd,hkd:executed.hkd}));
 await inner.locator('input[onchange*="S.fx.amt"]').fill('1234');await inner.locator('input[onchange*="S.fx.amt"]').blur();
 await frame.locator('#admin-customer-select').selectOption('AZ100002');inner=await child(frame);
 check('Other customer has no invented or borrowed balance',await inner.evaluate(()=>CID()==='AZ100002'&&!BALANCES[CID()]&&CPS.length===0&&FX_ORDERS.length===0&&WITHDRAW_ACCTS.length===0));
 check('Missing FX balances show explicit unavailable state',/未提供|尚未提供|no channel balance/.test(await inner.locator('body').innerText()));
 for(const key of keys){
  inner=await route(frame,key);
  const state=await inner.evaluate(()=>({id:CID(),balance:BALANCES[CID()],counterparties:CPS.length,fxOrders:FX_ORDERS.length,withdraw:WITHDRAW_ACCTS.length}));
  check('Other customer '+key+' remains isolated',state.id==='AZ100002'&&!state.balance&&state.counterparties===0&&state.fxOrders===0&&state.withdraw===0,state);
  check('Other customer '+key+' renders an empty/data-specific page',await inner.locator('.page-title').count()===1);
 }
 inner=await route(frame,'accounts');check('Other customer accounts use its own supplied records',await inner.locator('table tbody tr').count()===3);
 inner=await route(frame,'txs');const ownTx=await inner.evaluate(()=>TXS.every(t=>t.cust===CID()));check('Other customer transactions are scoped',ownTx);
 await frame.locator('#admin-customer-select').selectOption('AZ100001');inner=await child(frame);inner=await route(frame,'fx');
 check('Switching customers preserves original FX draft',await inner.evaluate(()=>S.fx.amt===1234));
 inner=await route(frame,'accounts');
 await inner.locator('button[onclick="go(\'cust\',\'statements\')"]:visible').click();
 await frame.waitForFunction(()=>S.page==='customer-statements');inner=await child(frame);
 check('Visible child action updates the HQ workspace route',await frame.evaluate(()=>location.hash==='#/hq/customer-statements'&&AzureBridge.account.role==='hq'));
 for(const width of [390,320]){
  await page.setViewportSize({width,height:950});inner=await route(frame,'fx');
  const geometry=await Promise.all([frame.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})),inner.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}))]);
  check(width+'px HQ and customer frames have no body overflow',geometry.every(g=>g.scroll<=g.width),geometry);
  await inner.locator('button[onclick="fxConfirm()"]').click();
  const modal=await inner.locator('.modal[role=dialog]').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,view:innerWidth};});
  check(width+'px customer confirmation modal is usable within viewport',await inner.locator('.modal-foot button[onclick^="fxDo("]').isVisible()&&modal.x>=0&&modal.right<=modal.view+1,modal);
  await inner.locator('.modal-foot button[onclick="closeModal()"]').click();
 }
 await frame.locator('.language-picker').selectOption('en');inner=await child(frame);
 await inner.waitForFunction(()=>I18N.lang==='en');
 const english=await inner.evaluate(()=>({locale:I18N.lang,title:document.querySelector('.page-title').textContent,expected:I18N.tr('汇兑中心')}));
 check('English parent and child workspace render correctly',await frame.evaluate(()=>I18N.lang==='en'&&AzureBridge.account.role==='hq')&&english.title===english.expected&&!/[\u3400-\u9fff]/.test(english.title),english);
 await frame.locator('.header-controls button').first().click();inner=await child(frame);
 check('Dark theme reaches parent and delegated customer workspace',await frame.evaluate(()=>document.documentElement.dataset.theme==='dark')&&await inner.evaluate(()=>document.documentElement.dataset.theme==='dark'&&!!document.querySelector('.page-title')));
 await inner.locator('button[onclick="fxConfirm()"]').click();check('English dark-mode customer modal remains usable',await inner.locator('.modal[role=dialog]').isVisible());await inner.locator('.modal-foot button[onclick="closeModal()"]').click();
 await inner.evaluate(()=>sendParent('azure-logout'));await frame.waitForFunction(()=>S.page==='customers');
 check('Ending child session does not log out HQ',await frame.evaluate(()=>AzureBridge.account.role==='hq'&&S.portal==='hq'));
 await page.close();
 const l1=await login('l1');
 check('L1 has no administrator customer functions',await l1.frame.locator('.sidebar a[href*="customer-"]').count()===0);
 await l1.frame.evaluate(()=>location.hash='#/l1/customer-fx');await l1.frame.waitForFunction(()=>S.page!=='customer-fx');
 check('L1 cannot force the HQ workspace route',await l1.frame.locator('.admin-customer-frame').count()===0&&await l1.frame.evaluate(()=>AzureBridge.account.role==='l1'));
 await l1.page.close();
}catch(e){errors.push(e.stack||e.message);}finally{await browser.close();}
const report={checks,errors};await fs.mkdir('.design-build/review-20261020',{recursive:true});await fs.writeFile('.design-build/review-20261020/qa-admin-customer.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=errors.length||checks.some(c=>!c.ok)?1:0;
