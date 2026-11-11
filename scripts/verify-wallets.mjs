import {chromium} from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const output='.design-build/wallets';
const checks=[],errors=[];
const check=(name,ok,detail)=>checks.push({name,ok:!!ok,...(detail===undefined?{}:{detail})});
const emails={cust:'finance@starocean.example',hq:'stephen@ourbank.example',l1:'ops@ganghuitong.example',l2:'chan@chanstudio.example'};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const pack=frame=>frame.evaluate(()=>AzureWallets.snapshot());
const financial=frame=>frame.evaluate(()=>JSON.stringify({balances:BALANCES,transactions:TXS,rates:FXR}));
const normalize=value=>JSON.stringify(value);

async function currentChild(parentFrame){
 const deadline=Date.now()+30000;let lastError;
 while(Date.now()<deadline){let element;
  try{
   await parentFrame.waitForFunction(()=>{
    const el=document.querySelector('.admin-customer-frame'),w=el?.contentWindow;
    try{return el?.isConnected&&w?.document.readyState==='complete'&&w.AzureFiles&&w.AzureWizard&&w.AzureWallets&&w.AzureAdminChild&&w.AzureBridge?.account?.role==='cust'&&w.AzureAdminChild.customerId===document.querySelector('#admin-customer-select')?.value&&w.AzureBridge.state.page===AzureBridge.state.page.replace(/^customer-/,'')&&w.document.querySelector('.wallet-page');}catch{return false;}
   },null,{timeout:Math.max(1,Math.min(1500,deadline-Date.now()))});
   element=await parentFrame.locator('.admin-customer-frame').elementHandle();const frame=element&&await element.contentFrame();
   if(frame&&!frame.isDetached()&&await element.evaluate(el=>el.isConnected&&el===document.querySelector('.admin-customer-frame')))return frame;
  }catch(error){lastError=error;}finally{await element?.dispose();}
 }
 throw new Error('Current delegated wallet iframe did not initialize',{cause:lastError});
}
async function login(role){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(role+': '+e.message));
 await page.goto(base);await page.locator('#email').fill(emails[role]);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();
 for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();
 await page.locator('.cms-confirmed-frame').waitFor();const parentFrame=await(await page.locator('.cms-confirmed-frame').elementHandle()).contentFrame();
 await parentFrame.waitForFunction(()=>document.readyState==='complete'&&window.AzureBridge?.account&&window.AzureFiles&&window.AzureWizard&&window.AzureWallets&&document.querySelector('.page-title'));
 const getFrame=async()=>role==='hq'?currentChild(parentFrame):parentFrame;
 return {page,parentFrame,getFrame};
}
async function enterWallets(context,role){
 const route=role==='hq'?'#/hq/customer-wallets':'#/cust/wallets';
 check(role+' menu exposes wallets',await context.parentFrame.locator(`.nav a[href="${route}"]`).count()===1);
 await context.parentFrame.evaluate(route=>location.hash=route,route);
 await context.parentFrame.waitForFunction(role=>S.page===(role==='hq'?'customer-wallets':'wallets'),role);
 const frame=await context.getFrame();await frame.locator('.wallet-page').waitFor();return frame;
}
async function closeModal(frame){if(await frame.locator('.modal').count())await frame.locator('.modal-head button[aria-label]').click();}
async function selectWallet(frame,id){await frame.locator('#wallet-select').selectOption(id);await frame.waitForFunction(id=>AzureWallets.snapshot().selectedId===id,id);}
async function createWallet(frame,name,network){
 await frame.locator('#wallet-new-btn').click();await frame.locator('#wallet-name').fill(name);await frame.locator('#wallet-create-network').selectOption(network);await frame.locator('.wallet-save').click();
 await frame.waitForFunction(({name,network})=>AzureWallets.snapshot().crypto.some(w=>w.name===name&&w.network===network),{name,network});
 return (await pack(frame)).crypto.find(w=>w.name===name&&w.network===network);
}
async function credit(frame,id,amount){await selectWallet(frame,id);await frame.evaluate(()=>AzureWallets.openCredit());await frame.locator('#wallet-credit-amount').fill(amount);await frame.locator('.wallet-credit-submit').click();}
async function invalidCredit(frame,id,value,name){
 await selectWallet(frame,id);const before=await pack(frame);await frame.evaluate(()=>AzureWallets.openCredit());
 await frame.locator('#wallet-credit-amount').evaluate((input,value)=>{input.type='text';input.value=value;if(input.form)input.form.noValidate=true;},value);
 await frame.locator('.wallet-credit-submit').click();check(name+' does not change wallet balances or ledger',normalize(await pack(frame))===normalize(before));await closeModal(frame);
}
async function invalidTransfer(frame,source,target,value,name){
 await selectWallet(frame,source);const before=await pack(frame);await frame.locator('.wallet-transfer-btn').click();
 await frame.locator('#wallet-transfer-target').evaluate((select,target)=>{if(![...select.options].some(o=>o.value===target))select.add(new Option('QA tampered destination',target));select.value=target;},target);
 await frame.locator('#wallet-transfer-amount').evaluate((input,value)=>{input.type='text';input.value=value;if(input.form)input.form.noValidate=true;},value);
 await frame.locator('.wallet-transfer-submit').click();check(name+' does not change either wallet or ledger',normalize(await pack(frame))===normalize(before));await closeModal(frame);
}
async function checkModal(frame,name){
 const dialog=frame.locator('.modal[role=dialog]');check(name+' is a modal dialog',await dialog.isVisible()&&await dialog.getAttribute('aria-modal')==='true');
 const detail=await dialog.evaluate(el=>{
  const r=el.getBoundingClientRect(),label=el.getAttribute('aria-labelledby');
  return {left:r.left,right:r.right,view:innerWidth,heading:el.querySelector('h1,h2,h3,h4')?.textContent?.trim(),named:!!el.getAttribute('aria-label')||!!label&&label.split(/\s+/).some(id=>document.getElementById(id)?.textContent.trim()),unlabelled:[...el.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(input=>!input.labels?.length&&!input.getAttribute('aria-label')&&!input.getAttribute('aria-labelledby')).map(input=>input.id)};
 });
 check(name+' heading and form labels are present',!!detail.heading&&detail.unlabelled.length===0,detail);
 check(name+' fits the wallet viewport',detail.left>=-1&&detail.right<=detail.view+1,detail);
 check(name+' has an accessible dialog name',detail.named,detail);
 await frame.locator('.modal').press('Escape');check(name+' closes with Escape',await frame.locator('.modal').count()===0);
}

try{
 for(const role of ['cust','hq']){
  const context=await login(role),{page,parentFrame,getFrame}=context;let frame=await enterWallets(context,role);
  const parentFinancial=await financial(parentFrame),originalFinancial=await financial(frame);
  const restoreGuard=await frame.evaluate(()=>{
   const before=AzureWallets.snapshot(),forged=JSON.parse(JSON.stringify(before));
   forged.crypto[0].availableUnits=1000000;forged.crypto[0].frozenUnits=0;forged.crypto[0].basis='demo';
   const ownRestore=AzureWallets.restore(CID(),forged),afterOwn=AzureWallets.snapshot();
   const otherId='AZ100002',foreign=JSON.parse(JSON.stringify(before));foreign.customerId=otherId;
   foreign.crypto.forEach(w=>{w.id=w.id.replace(CID(),otherId);w.customerId=otherId;});
   const foreignSnapshot=AzureWallets.snapshot(otherId),foreignRestore=AzureWallets.restore(otherId,foreign,'QA-invalid-token');
   AzureWallets.select('usdt-'+otherId+'-tron');
   return {ownRestore,ownUnchanged:JSON.stringify(before)===JSON.stringify(afterOwn),foreignSnapshotIsNull:foreignSnapshot===null,foreignRestore,finalUnchanged:JSON.stringify(before)===JSON.stringify(AzureWallets.snapshot())};
  });
  check(role+' customer context cannot restore a forged own-wallet snapshot without authorization',restoreGuard.ownRestore===false&&restoreGuard.ownUnchanged,restoreGuard);
  check(role+' customer context cannot peek, restore or select another customer wallet',restoreGuard.foreignSnapshotIsNull&&restoreGuard.foreignRestore===false&&restoreGuard.finalUnchanged,restoreGuard);
  check(role+' wallet valuation does not introduce a pegged USDT rate into fiat fixtures',await frame.evaluate(()=>!Object.prototype.hasOwnProperty.call(FXR,'USDT')));
  const a=await createWallet(frame,'QA Primary '+role,'tron'),b=await createWallet(frame,'QA Secondary '+role,'tron'),c=await createWallet(frame,'QA Ethereum '+role,'ethereum');
  check(role+' crypto wallets retain fixed owner and selected networks',[a,b,c].every(w=>w.customerId==='AZ100001'&&w.asset==='USDT')&&a.network==='tron'&&b.network==='tron'&&c.network==='ethereum',{a,b,c});
  await selectWallet(frame,a.id);const unknown=(await pack(frame)).crypto.find(w=>w.id===a.id);
  check(role+' new USDT wallet balance remains unknown',unknown.availableUnits===null&&unknown.basis===null,unknown);
  check(role+' unknown balance is shown as unavailable rather than zero',/未提供|Not supplied|not provided|unavailable/i.test(await frame.locator('.wallet-amount').innerText()));

  await frame.locator('#wallet-network').selectOption('ethereum');
  const networkAfter=await pack(frame),activeAfter=networkAfter.crypto.find(w=>w.id===networkAfter.selectedId);
  check(role+' network switch selects Ethereum without rewriting Tron wallets',activeAfter?.network==='ethereum'&&networkAfter.crypto.find(w=>w.id===a.id).network==='tron'&&networkAfter.crypto.find(w=>w.id===a.id).availableUnits===null,networkAfter);
  await credit(frame,a.id,'000123.000001');let credited=await pack(frame),wa=credited.crypto.find(w=>w.id===a.id);
  check(role+' explicit Demo credit preserves six-decimal integer precision',wa.availableUnits===123000001&&wa.frozenUnits===0&&wa.basis==='demo'&&Number.isSafeInteger(wa.availableUnits),wa);
  check(role+' explicit Demo credit records a local ledger entry',credited.ledger.length>0);
  await credit(frame,a.id,'0.000001');credited=await pack(frame);wa=credited.crypto.find(w=>w.id===a.id);
  check(role+' adding one micro-unit is exact',wa.availableUnits===123000002,wa);
  for(const value of ['-1','0','NaN','Infinity','0.0000001','1000000000.000001'])await invalidCredit(frame,a.id,value,role+' invalid credit '+value);

  await selectWallet(frame,a.id);await frame.locator('.wallet-transfer-btn').click();
  const destinations=await frame.locator('#wallet-transfer-target').evaluate(el=>[...el.options].map(o=>({id:o.value,disabled:o.disabled})));
  check(role+' transfer choices permit same-chain destination and exclude other chain',destinations.some(o=>o.id===b.id&&!o.disabled)&&!destinations.some(o=>o.id===c.id&&!o.disabled),destinations);
  await frame.locator('#wallet-transfer-target').selectOption(b.id);await frame.locator('#wallet-transfer-amount').fill('000002.000001');const ledgerCount=(await pack(frame)).ledger.length;await frame.locator('.wallet-transfer-submit').click();
  const transferred=await pack(frame),source=transferred.crypto.find(w=>w.id===a.id),target=transferred.crypto.find(w=>w.id===b.id);
  check(role+' same-chain transfer conserves exact micro-units',source.availableUnits===121000001&&target.availableUnits===2000001&&source.availableUnits+target.availableUnits===123000002,{source,target});
  check(role+' same-chain transfer records local ledger entries',transferred.ledger.length>ledgerCount);
  for(const value of ['-1','0','NaN','Infinity','999999.000001','0.0000001'])await invalidTransfer(frame,a.id,b.id,value,role+' invalid transfer '+value);
  await invalidTransfer(frame,a.id,c.id,'1',role+' forced cross-network transfer');
  await invalidTransfer(frame,a.id,'MISSING-QA-WALLET','1',role+' missing-wallet transfer');

  await selectWallet(frame,a.id);await frame.evaluate(()=>AzureWallets.info());
  const info=await frame.locator('.modal').innerText();
  check(role+' deposit information names the network and explicitly has no assigned custody address',/Demo/i.test(info)&&/TRON|TRC.?20/i.test(info)&&/尚未分配|未分配|No on-chain receiving address assigned/i.test(info)&&!/\bT[1-9A-HJ-NP-Za-km-z]{33}\b|\b0x[a-fA-F0-9]{40}\b/.test(info),info);
  check(role+' receive information does not invent a funding QR code',await frame.locator('.modal canvas,.modal .qr img,.modal [data-wallet-qr] img,.modal .wallet-qr img').count()===0);await closeModal(frame);
  check(role+' wallet actions do not mutate bank balances, bank transactions or fiat rates',await financial(frame)===originalFinancial);

  const beforeFreeze=await pack(frame),oldFreeze=await frame.evaluate(()=>cust(CID()).frz||null);
  await frame.evaluate(()=>{cust(CID()).frz={scopes:['all'],reason:'QA local freeze'};render();});
  for(const selector of ['#wallet-new-btn','.wallet-credit-btn','.wallet-transfer-btn']){
   const button=frame.locator(selector);if(!await button.count())continue;
   await button.evaluate(el=>{el.disabled=false;});await button.click();
   if(await frame.locator('#wallet-name').count()){await frame.locator('#wallet-name').fill('QA blocked frozen wallet');await frame.locator('.wallet-save').evaluate(el=>{el.disabled=false;});await frame.locator('.wallet-save').click();}
   if(await frame.locator('#wallet-credit-amount').count()){await frame.locator('#wallet-credit-amount').fill('1');await frame.locator('.wallet-credit-submit').evaluate(el=>{el.disabled=false;});await frame.locator('.wallet-credit-submit').click();}
   if(await frame.locator('#wallet-transfer-amount').count()){await frame.locator('#wallet-transfer-target').selectOption(b.id);await frame.locator('#wallet-transfer-amount').fill('1');await frame.locator('.wallet-transfer-submit').evaluate(el=>{el.disabled=false;});await frame.locator('.wallet-transfer-submit').click();}
   await closeModal(frame);
  }
  check(role+' frozen clients cannot create, credit or transfer wallets',normalize(await pack(frame))===normalize(beforeFreeze));
  await frame.evaluate(fr=>{cust(CID()).frz=fr;render();},oldFreeze);

  if(role==='hq'){
   const ownerAPack=await pack(frame),ownerAIds=ownerAPack.crypto.map(w=>w.id);
   await parentFrame.locator('#admin-customer-select').selectOption('AZ100002');frame=await getFrame();const ownerBInitial=await pack(frame);
   check('HQ customer B never receives customer A wallets or ledger',ownerBInitial.customerId==='AZ100002'&&ownerBInitial.crypto.every(w=>w.customerId==='AZ100002'&&!ownerAIds.includes(w.id))&&ownerBInitial.ledger.length===0,ownerBInitial);
   const wb=await createWallet(frame,'QA Customer B Private','tron');await credit(frame,wb.id,'7.000001');const ownerBPack=await pack(frame);
   await parentFrame.locator('#admin-customer-select').selectOption('AZ100001');frame=await getFrame();
   check('HQ A to B to A preserves customer A wallets and ledger',normalize(await pack(frame))===normalize(ownerAPack));
   await parentFrame.locator('#admin-customer-select').selectOption('AZ100002');frame=await getFrame();
   check('HQ customer B retains only its own wallet and ledger',normalize(await pack(frame))===normalize(ownerBPack));
   check('HQ crypto Demo credit does not invent bank balances for customer B',await parentFrame.evaluate(()=>!Object.prototype.hasOwnProperty.call(BALANCES,'AZ100002')));
   await parentFrame.locator('#admin-customer-select').selectOption('AZ100001');frame=await getFrame();
  }

  for(const [width,locale,theme]of [[1440,'zh-Hant','light'],[390,'zh-Hant','light'],[320,'zh-Hant','light'],[1440,'en','dark'],[390,'en','dark'],[320,'en','dark']]){
   await page.setViewportSize({width,height:1000});await parentFrame.locator('.language-picker').selectOption(locale);
   if(await parentFrame.evaluate(()=>S.theme)!==theme)await parentFrame.locator('.header-controls button').first().click();
   frame=await getFrame();await frame.waitForFunction(({locale,theme})=>I18N.lang===locale&&S.theme===theme,{locale,theme});await selectWallet(frame,a.id);
   const geometry=await Promise.all([parentFrame.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth})),frame.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth}))]);
   const name=role+' '+width+' '+locale+' '+theme;
   check(name+' parent and wallet frames have no body overflow',geometry.every(g=>g.scroll<=g.view),geometry);
   for(const [action,label]of [['openNew','new wallet'],['openCredit','legacy Demo credit API'],['openTransfer','same-chain transfer'],['info','legacy deposit info API']]){await frame.evaluate(action=>AzureWallets[action](),action);await checkModal(frame,name+' '+label);}
  }
  check(role+' original financial fixtures stay unchanged through all wallet operations',await financial(parentFrame)===parentFinancial);
  await page.close();
 }
 for(const role of ['l1','l2']){
  const {page,parentFrame}=await login(role);
  check(role+' has no customer-wallet menu',await parentFrame.locator('.nav a[href*="wallet"]').count()===0);
  for(const route of [`#/${role}/wallets`,'#/hq/customer-wallets','#/cust/wallets']){await parentFrame.evaluate(route=>location.hash=route,route);await parentFrame.waitForFunction(role=>S.portal===role&&!/wallet/.test(S.page),role);check(role+' cannot force '+route,await parentFrame.locator('.wallet-page,.admin-customer-frame').count()===0);}
  await page.close();
 }
}catch(error){errors.push(error.stack||error.message);}finally{await browser.close();}
await fs.mkdir(output,{recursive:true});const report={checks,errors};await fs.writeFile(output+'/qa-wallets.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:checks.length,failures:checks.filter(c=>!c.ok),errors},null,2));process.exitCode=errors.length||checks.some(c=>!c.ok)?1:0;
