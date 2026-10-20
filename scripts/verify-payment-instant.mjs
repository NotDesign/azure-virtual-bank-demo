import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const output='.design-build/payment-instant';
const checks=[],errors=[];
const check=(name,ok,detail)=>checks.push({name,ok:!!ok,...(detail===undefined?{}:{detail})});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const proof=await fs.readFile('assets/d7a5f.png');
const proofSHA=createHash('sha256').update(proof).digest('hex');

async function currentChild(parentFrame){
 const deadline=Date.now()+30000;let lastError;
 while(Date.now()<deadline){let element;
  try{
   await parentFrame.waitForFunction(()=>{
    const el=document.querySelector('.admin-customer-frame'),w=el?.contentWindow;
    try{return el?.isConnected&&w?.document.readyState==='complete'&&w.AzureFiles&&w.AzureWizard&&w.AzureAdminChild&&w.AzureBridge?.account?.role==='cust'&&w.AzureAdminChild.customerId===document.querySelector('#admin-customer-select')?.value&&w.AzureBridge.state.page===AzureBridge.state.page.replace(/^customer-/,'')&&w.document.querySelector('.page-title');}catch{return false;}
   },null,{timeout:Math.max(1,Math.min(1500,deadline-Date.now()))});
   element=await parentFrame.locator('.admin-customer-frame').elementHandle();const frame=element&&await element.contentFrame();
   if(frame&&!frame.isDetached()&&await element.evaluate(el=>el.isConnected&&el===document.querySelector('.admin-customer-frame')))return frame;
  }catch(error){lastError=error;}finally{await element?.dispose();}
 }
 throw new Error('Current delegated customer iframe did not initialize',{cause:lastError});
}
async function login(role){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(role+': '+e.message));
 await page.goto(base);await page.locator('#email').fill(role==='hq'?'stephen@ourbank.example':'finance@starocean.example');await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();
 for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();
 await page.locator('.cms-confirmed-frame').waitFor();const parentFrame=await(await page.locator('.cms-confirmed-frame').elementHandle()).contentFrame();
 await parentFrame.waitForFunction(()=>document.readyState==='complete'&&window.AzureBridge?.account&&window.AzureFiles&&window.AzureWizard&&document.querySelector('.page-title'));
 await parentFrame.evaluate(role=>location.hash=role==='hq'?'#/hq/customer-pay':'#/cust/pay',role);
 await parentFrame.waitForFunction(role=>S.page===(role==='hq'?'customer-pay':'pay'),role);
 const getFrame=async()=>role==='hq'?currentChild(parentFrame):parentFrame;
 const frame=await getFrame();await frame.waitForFunction(()=>!!window.AzureReviewPayments?.openWithdraw&&!!document.querySelector('.rp-payment-toolbar'));
 return {page,parentFrame,getFrame};
}
async function tab(frame,key){
 await frame.locator(`.rp-payment-toolbar .tabs button[onclick="setUI('pt','${key}')"]`).click();
 await frame.waitForFunction(key=>(S.ui.pt||'pay')===key,key);
}
async function closeModal(frame){await frame.locator('.modal-foot button[onclick="closeModal()"]:visible').first().click();}
async function paymentFile(frame){
 return frame.locator('.rp-payment-card input[type=file]').evaluate(async el=>{
  const file=el.files[0];if(!file)return {count:el.files.length};
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return {count:el.files.length,name:file.name,type:file.type,size:file.size,sha:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')};
 });
}
async function checkToolbar(frame,name,width){
 const add=frame.locator('.rp-payment-toolbar .rp-payment-add');await add.scrollIntoViewIfNeeded();
 check(name+' has a visible instant-add button',await add.isVisible()&&/即時新增|即时新增|Add/i.test(await add.innerText()));
 const g=await frame.locator('.rp-payment-toolbar').evaluate(el=>{
  const bar=el.getBoundingClientRect(),tabs=el.querySelector('.tabs').getBoundingClientRect(),add=el.querySelector('.rp-payment-add').getBoundingClientRect();
  const body=el.closest('.rp-payment-card')?.querySelector('.card-pad'),bodyRect=body?.getBoundingClientRect(),bodyStyle=body&&getComputedStyle(body);
  return {view:innerWidth,scroll:document.documentElement.scrollWidth,bar:{left:bar.left,right:bar.right,top:bar.top,bottom:bar.bottom},tabs:{left:tabs.left,right:tabs.right,cy:tabs.y+tabs.height/2},add:{left:add.left,right:add.right,top:add.top,bottom:add.bottom,cy:add.y+add.height/2,width:add.width,height:add.height},bodyInnerLeft:bodyRect&&bodyRect.left+parseFloat(bodyStyle.paddingLeft)};
 });
 check(name+' keeps tabs and add control within the toolbar',g.tabs.left>=g.bar.left-1&&g.tabs.right<=g.bar.right+1&&g.add.left>=g.bar.left-1&&g.add.right<=g.bar.right+1&&g.add.height>=40&&g.add.width>=44,g);
 check(name+' aligns tabs with form content padding',g.bodyInnerLeft===undefined||Math.abs(g.tabs.left-g.bodyInnerLeft)<=2,g);
 if(width===1440)check(name+' aligns desktop tabs and add button on one row',Math.abs(g.tabs.cy-g.add.cy)<=3,g);
 check(name+' has no customer-frame body overflow',g.scroll<=g.view,g);
 await add.click();
 const expected=await frame.evaluate(()=>(S.ui.pt||'pay')==='wd'?'#rp-withdraw-form':'#rp-counterparty-form');
 check(name+' instant add opens its corresponding form',await frame.locator(expected).isVisible());
 const modal=await frame.locator('.modal').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,view:innerWidth};});
 check(name+' modal fits the customer viewport',modal.left>=-1&&modal.right<=modal.view+1,modal);await closeModal(frame);
}

try{
 for(const role of ['cust','hq']){
  const {page,parentFrame,getFrame}=await login(role);let frame=await getFrame();await tab(frame,'wd');
  const amount=frame.locator('input[onchange*="S.wd.amt"]');await amount.fill('4321');await amount.blur();
  const memo=frame.locator('input[data-rp-withdraw-memo],#rp-wd-memo,input[onchange*="S.wd.memo"],input[oninput*="S.wd.memo"]').first();await memo.fill('QA withdrawal reserve');await memo.blur();
  const initial=await frame.evaluate(()=>({amount:S.wd.amt,memo:S.wd.memo,account:S.wd.wa,count:WITHDRAW_ACCTS.length,owner:cust(CID()).en}));
  await frame.locator('.rp-payment-toolbar .rp-add-withdraw').click();
  check(role+' withdrawal owner is readonly and belongs to the selected customer',await frame.locator('#rp-wa-name').isEditable()===false&&await frame.locator('#rp-wa-name').inputValue()===initial.owner);
  await frame.locator('#rp-wa-bank').fill('QA cancelled bank');await closeModal(frame);
  check(role+' cancelling account entry preserves amount, memo and existing account',await frame.evaluate(before=>S.wd.amt===before.amount&&S.wd.memo===before.memo&&S.wd.wa===before.account&&WITHDRAW_ACCTS.length===before.count,initial));
  check(role+' withdrawal amount and memo remain visible after cancel',await frame.locator('input[onchange*="S.wd.amt"]').inputValue()==='4321'&&await frame.locator('input[data-rp-withdraw-memo],#rp-wd-memo,input[onchange*="S.wd.memo"],input[oninput*="S.wd.memo"]').first().inputValue()==='QA withdrawal reserve');

  await frame.locator('.rp-payment-toolbar .rp-add-withdraw').click();
  const entered={bank:'QA Demo Bank '+role,swift:'QADMHKKH',acct:'0000123400056789',city:'Hong Kong',region:'中国香港',ccy:'HKD'};
  for(const key of ['bank','swift','acct','city'])await frame.locator('#rp-wa-'+key).fill(entered[key]);
  await frame.locator('#rp-wa-region').selectOption(entered.region);await frame.locator('#rp-wa-ccy').selectOption(entered.ccy);
  await frame.locator('#rp-wa-proof').setInputFiles({name:'qa-owner-account.png',mimeType:'image/png',buffer:proof});
  await frame.locator('.modal-foot .primary[onclick*="saveWithdraw"]').click();
  const created=await frame.evaluate(acct=>WITHDRAW_ACCTS.find(a=>a.acct===acct),entered.acct);
  check(role+' account entry preserves actual values and leading zeros',created&&Object.entries(entered).every(([key,value])=>created[key]===value)&&created.name===initial.owner,created);
  check(role+' new withdrawal account requires channel review',created?.status==='审核中'&&typeof created.acct==='string',created);
  if(!created)throw new Error(role+' withdrawal account was not created');
  const selectable=await frame.locator('select[onchange*="S.wd.wa"]').evaluate((el,id)=>{const option=[...el.options].find(o=>o.value===id);return !!option&&!option.disabled;},created.id);
  check(role+' pending account cannot be selected for withdrawal',!selectable);
  const baseline=await frame.evaluate(()=>({transactions:TXS.length,balance:JSON.stringify(bal())}));
  await frame.evaluate(id=>{S.wd.wa=id;wdDo();},created.id);
  check(role+' withdrawal handler rejects a forced pending account',await frame.evaluate(before=>TXS.length===before.transactions&&JSON.stringify(bal())===before.balance,baseline));
  await frame.evaluate(id=>{S.wd.wa=id;render();},initial.account);
  await frame.locator('.rp-new-withdraw button[onclick*="withdrawDetail"]').click();
  const approval=frame.locator('.modal-foot button[onclick*="approveWithdraw"]');
  check(role+' approval is an explicit Demo action',await approval.isVisible()&&/Demo/.test(await approval.innerText()));await approval.click();
  await frame.locator('.rp-new-withdraw button[onclick*="useWithdraw"]').click();
  check(role+' approved account is selected explicitly',await frame.evaluate(id=>S.wd.wa===id&&WITHDRAW_ACCTS.find(a=>a.id===id).status==='正常',created.id)&&await frame.locator('select[onchange*="S.wd.wa"]').inputValue()===created.id);
  const summary=await frame.locator('.rp-payment-card .calc-out').innerText();
  check(role+' selected account and withdrawal summary agree',summary.includes(entered.bank)&&summary.includes('HKD')&&summary.includes('4,321.00'),summary);
  for(const invalid of [0,-1,NaN,Infinity]){
   await frame.evaluate(value=>{S.wd.amt=value;wdDo();},invalid);
   check(role+' rejects invalid withdrawal amount '+String(invalid),await frame.evaluate(before=>TXS.length===before.transactions&&JSON.stringify(bal())===before.balance,baseline));
  }
  await frame.evaluate(()=>{S.wd.amt=bal().HKD.a+1;wdDo();});
  check(role+' rejects withdrawal above available balance',await frame.evaluate(before=>TXS.length===before.transactions&&JSON.stringify(bal())===before.balance,baseline));
  await frame.evaluate(()=>{const previous=S.wd.wa;S.wd.wa='MISSING-QA-ACCOUNT';S.wd.amt=100;wdDo();S.wd.wa=previous;});
  check(role+' rejects a withdrawal account ID that does not exist',await frame.evaluate(before=>TXS.length===before.transactions&&JSON.stringify(bal())===before.balance,baseline));
  await frame.evaluate(()=>{S.wd.amt=4321;render();});

  await tab(frame,'pay');
  const invoiceName='qa-background-invoice-'+role+'.png';
  await frame.locator('.rp-payment-card input[type=file]').setInputFiles({name:invoiceName,mimeType:'image/png',buffer:proof});
  await frame.locator('input[onchange^="S.pay.amt"]').fill('432.10');await frame.locator('input[onchange^="S.pay.amt"]').blur();
  const invoiceAfterAmount=await paymentFile(frame);
  check(role+' single-payment invoice survives amount-change rendering',invoiceAfterAmount.count===1&&invoiceAfterAmount.name===invoiceName&&invoiceAfterAmount.sha===proofSHA&&invoiceAfterAmount.size===proof.length,invoiceAfterAmount);
  await frame.locator('.rp-payment-toolbar .rp-add-recipient').click();
  const singleRecipient='QA Single Payment Recipient '+role;await frame.locator('#rp-name').fill(singleRecipient);
  await frame.locator('.modal-foot button[onclick="AzureReviewPayments.save(false)"]').click();
  const invoiceAfterSave=await paymentFile(frame);
  check(role+' single-payment invoice retains filename and bytes after recipient draft save',invoiceAfterSave.count===1&&invoiceAfterSave.name===invoiceName&&invoiceAfterSave.sha===proofSHA&&invoiceAfterSave.size===proof.length&&await frame.evaluate(()=>S.pay.amt===432.1),invoiceAfterSave);
  check(role+' single-payment instant-add saves only a recipient draft',await frame.evaluate(name=>CPS.some(c=>c.name===name&&c._reviewCustomer===CID()&&c.status==='待提交'),singleRecipient));
  await frame.locator('.rp-payment-card input[type=file]').setInputFiles([]);
  await frame.locator('input[onchange^="S.pay.amt"]').fill('543.21');await frame.locator('input[onchange^="S.pay.amt"]').blur();
  const clearedInvoice=await paymentFile(frame);
  check(role+' explicitly cleared invoice remains cleared after rendering',clearedInvoice.count===0,clearedInvoice);

  await tab(frame,'batch');
  await frame.locator('.rp-payment-card button[onclick="setUI(\'bstep\',1)"]').click();
  await frame.locator('.rp-payment-card button[onclick="setUI(\'bstep\',2)"]').click();
  const validationBefore=await frame.locator('.rp-payment-card table tbody tr').allTextContents();
  await frame.locator('.rp-payment-card button[onclick="setUI(\'bstep\',1)"]').click();
  const batchName='qa-payments-'+role+'.csv',batchCSV='Recipient,Account,Currency,Amount\nQA Supplier,00000012345,USD,125.00\n';
  await frame.locator('.rp-payment-card input[type=file]').setInputFiles({name:batchName,mimeType:'text/csv',buffer:Buffer.from(batchCSV)});
  await frame.locator('.rp-payment-toolbar .rp-add-recipient').click();
  const batchRecipient='QA Batch Recipient '+role;await frame.locator('#rp-name').fill(batchRecipient);
  await frame.locator('.modal-foot button[onclick="AzureReviewPayments.save(false)"]').click();
  const retainedFile=await frame.locator('.rp-payment-card input[type=file]').evaluate(async el=>({name:el.files[0]?.name,text:el.files[0]?await el.files[0].text():null}));
  check(role+' batch instant-add retains the upload step and actual CSV file',await frame.evaluate(()=>(S.ui.pt==='batch'&&S.ui.bstep===1))&&retainedFile.name===batchName&&retainedFile.text===batchCSV,retainedFile);
  check(role+' batch instant-add saves a pending recipient draft without approval',await frame.evaluate(name=>CPS.some(c=>c.name===name&&c._reviewCustomer===CID()&&c.status==='待提交'),batchRecipient));
  await frame.locator('.rp-payment-card button[onclick="setUI(\'bstep\',2)"]').click();
  const validationAfter=await frame.locator('.rp-payment-card table tbody tr').allTextContents();
  check(role+' batch recipient entry preserves the original Demo validation rows',JSON.stringify(validationBefore)===JSON.stringify(validationAfter),{before:validationBefore,after:validationAfter});

  for(const [width,locale,theme]of [[1440,'zh-Hant','light'],[390,'zh-Hant','light'],[320,'zh-Hant','light'],[1440,'en','dark'],[390,'en','dark'],[320,'en','dark']]){
   await page.setViewportSize({width,height:1000});
   await parentFrame.locator('.language-picker').selectOption(locale);
   if(await parentFrame.evaluate(()=>S.theme)!==theme)await parentFrame.locator('.header-controls button').first().click();
   frame=await getFrame();await frame.waitForFunction(({locale,theme})=>I18N.lang===locale&&S.theme===theme,{locale,theme});
   for(const key of ['pay','batch','wd']){await tab(frame,key);await checkToolbar(frame,role+' '+width+' '+locale+' '+theme+' '+key,width);}
   const parentOverflow=await parentFrame.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth}));
   check(role+' '+width+' '+locale+' parent has no body overflow',parentOverflow.scroll<=parentOverflow.view,parentOverflow);
  }
  check(role+' final approval and withdrawal draft survive responsive/theme changes',await frame.evaluate(id=>S.wd.wa===id&&S.wd.amt===4321&&S.wd.memo==='QA withdrawal reserve',created.id));
  await page.close();
 }
}catch(error){errors.push(error.stack||error.message);}finally{await browser.close();}
await fs.mkdir(output,{recursive:true});const report={checks,errors};await fs.writeFile(output+'/qa-payment-instant.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:checks.length,failures:checks.filter(c=>!c.ok),errors},null,2));process.exitCode=errors.length||checks.some(c=>!c.ok)?1:0;
