import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.DEMO_URL||'http://127.0.0.1:3264/',output=process.env.QA_OUTPUT||'.design-build/wallet-address-book';
const reportFile=process.env.QA_REPORT||path.join(output,'qa-wallet-address-book.json');
const report={base,checks:[],errors:[],externalRequests:[],injectedStandaloneUI:false};
const check=(name,ok,detail)=>report.checks.push({name,ok:!!ok,...(detail===undefined?{}:{detail})});
await fs.mkdir(output,{recursive:true});await fs.mkdir(path.dirname(reportFile),{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const ETH='0xAbCdEf0123456789AbCdEf0123456789AbCdEf01',TRON='DEMO-TRC20-ADDRESSBOOK01';
async function login(email){
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.route('https://api.coinbase.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({data:{currency:'USD',rates:{USD:'1',HKD:'8',USDT:'1',EUR:'.92'}}})}));
 page.on('request',request=>{if(!request.url().startsWith(new URL(base).origin+'/')&&!request.url().startsWith('https://api.coinbase.com/')&&!/^(?:blob:|data:)/.test(request.url()))report.externalRequests.push(request.url());});
 await page.goto(base);await page.locator('#email').fill(email);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();
 for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();
 await page.locator('.cms-confirmed-frame').waitFor();const frame=await(await page.locator('.cms-confirmed-frame').elementHandle()).contentFrame();
 await frame.waitForFunction(()=>document.readyState==='complete'&&window.AzureBridge&&window.AzureWallets&&window.AzureFiles);return{page,frame};
}
async function attach(frame){
 await frame.waitForFunction(()=>window.AzureWallets?.operations?.addresses,null,{timeout:30000});
 if(!await frame.evaluate(()=>window.AzureWalletAddressBook?.ready)){
  report.injectedStandaloneUI=true;
  await frame.addStyleTag({path:path.join(root,'cms/confirmed/wallet-address-book.css')});
  await frame.addScriptTag({path:path.join(root,'cms/confirmed/wallet-address-book.js')});
 }
 await frame.evaluate(()=>AzureWalletAddressBook.refresh());
}
const financial=frame=>frame.evaluate(()=>JSON.stringify({bank:BALANCES,transactions:TXS,rates:FXR,crypto:AzureWallets.snapshot().crypto,ledger:AzureWallets.snapshot().ledger}));
const items=frame=>frame.evaluate(()=>AzureWallets.operations.addresses.list());
const open=frame=>frame.evaluate(()=>AzureWalletAddressBook.open());
const close=frame=>frame.locator('.wab-dialog header [data-wab-close]').click();
async function fill(frame,{label,network='ethereum',address=ETH,note='Synthetic address note',enabled=true}){
 await frame.locator('[data-wab-new]').click();await frame.locator('#wab-label').fill(label);await frame.locator('#wab-edit-network').selectOption(network);await frame.locator('#wab-address').fill(address);await frame.locator('#wab-note').fill(note);await frame.locator('#wab-enabled').setChecked(enabled);await frame.locator('#wab-form button[type=submit]').click();
}
async function child(parent){
 await parent.waitForFunction(()=>{const el=document.querySelector('.admin-customer-frame'),w=el?.contentWindow;try{return w?.AzureWallets?.operations?.addresses&&w.document.readyState==='complete'&&w.AzureAdminChild?.customerId===document.getElementById('admin-customer-select')?.value&&w.document.querySelector('.wallet-page');}catch{return false;}},null,{timeout:30000});
 return(await parent.locator('.admin-customer-frame').elementHandle()).contentFrame();
}
try{
 const {page,frame}=await login('finance@starocean.example');await frame.evaluate(()=>go('cust','wallets'));await attach(frame);await frame.evaluate(()=>I18N.set('zh-Hant'));
 const before=await financial(frame);check('Wallet toolbar exposes the address book as an explicit button',await frame.locator('[data-wab-open]').isVisible());await frame.locator('[data-wab-open]').click();
 check('Address book is clearly identified as a Demo format check, not on-chain verification',(await frame.locator('.wab-warning').innerText()).includes('Demo')&&(await frame.locator('.wab-warning').innerText()).includes('格式'));
 await fill(frame,{label:'Synthetic Ethereum receiver'});let saved=(await items(frame)).find(r=>r.label==='Synthetic Ethereum receiver');
 check('An address can be created through the real UI and shared engine',!!saved&&saved.enabled===true&&saved.network==='ethereum'&&typeof saved.address==='string');
 await fill(frame,{label:'Duplicate Ethereum',address:ETH.toLowerCase()});check('Ethereum case variants cannot create duplicate saved addresses',await frame.locator('[data-wab-error]').isVisible()&&(await items(frame)).length===1);await frame.locator('[data-wab-cancel-edit]').click();
 await fill(frame,{label:'Synthetic TRON receiver',network:'tron',address:TRON});const tron=(await items(frame)).find(r=>r.label==='Synthetic TRON receiver');
 check('TRON and Ethereum addresses remain classified under their own networks',!!tron&&(await items(frame)).length===2);
 await frame.locator('#wab-network').selectOption('tron');check('Network classification changes the visible list',await frame.locator('.wab-entry').count()===1&&(await frame.locator('.wab-entry code').innerText())===TRON);await frame.locator('#wab-network').selectOption('');
 await frame.locator('#wab-query').fill('Ethereum');check('Search filters address name and displays a clear X button',await frame.locator('.wab-entry').count()===1&&await frame.locator('[data-wab-clear]').isEnabled());await frame.locator('[data-wab-clear]').click();check('Clear X removes only the search and restores all entries',await frame.locator('#wab-query').inputValue()===''&&await frame.locator('.wab-entry').count()===2);
 await frame.locator(`[data-wab-edit="${saved.id}"]`).click();await frame.locator('#wab-label').fill('Renamed Ethereum receiver');await frame.locator('#wab-note').fill('Edited synthetic note');await frame.locator('#wab-form button[type=submit]').click();saved=(await items(frame)).find(r=>r.id===saved.id);
 check('Editing updates the existing record rather than adding another',saved.label==='Renamed Ethereum receiver'&&saved.note==='Edited synthetic note'&&(await items(frame)).length===2);
 await frame.locator(`[data-wab-toggle="${saved.id}"]`).click();await frame.locator('#wab-status').selectOption('disabled');check('An address can be disabled and filtered by state',await frame.locator('.wab-entry').count()===1&&(await items(frame)).find(r=>r.id===saved.id).enabled===false);await frame.locator('#wab-status').selectOption('all');await close(frame);
 await frame.evaluate(()=>{window.addressPicked=[];AzureWalletAddressBook.pick({network:'ethereum',onSelect:r=>addressPicked.push(r)});});check('Disabled addresses are excluded from the default picker',await frame.locator('.wab-entry').count()===0);await frame.locator('#wab-status').selectOption('all');check('A disabled address remains unselectable even when displayed',await frame.locator('[data-wab-select]').isDisabled());await close(frame);
 await open(frame);await frame.locator(`[data-wab-toggle="${saved.id}"]`).click();await close(frame);
 await frame.locator('.wallet-withdraw-btn').click();await frame.locator('#wallet-funding-amount').fill('123.456789');await frame.locator('#wallet-funding-memo').fill('Preserved withdrawal draft');
 await frame.evaluate(()=>AzureWalletAddressBook.pick({network:'ethereum',onSelect:r=>{window.addressPicked.push(r);document.getElementById('wallet-funding-address').value=r.address;}}));
 check('Picker locks the requested network and lists only matching addresses',await frame.locator('#wab-network').isDisabled()&&await frame.locator('#wab-network').inputValue()==='ethereum'&&await frame.locator('.wab-entry').count()===1);
 await frame.locator('[data-wab-select]').click();
 check('Picker callback receives the current enabled server-model row and leaves the withdrawal draft intact',await frame.evaluate(()=>addressPicked.length===1&&addressPicked[0].label==='Renamed Ethereum receiver')&&await frame.locator('#wallet-funding-amount').inputValue()==='123.456789'&&await frame.locator('#wallet-funding-memo').inputValue()==='Preserved withdrawal draft'&&await frame.locator('#wallet-funding-address').inputValue()===saved.address);
 check('Selecting an address does not submit a withdrawal or change balances',await financial(frame)===before&&await frame.locator('.wallet-funding-modal').count()===1);await frame.locator('.wallet-funding-modal .modal-head .icon-btn').click();
 await open(frame);await frame.locator(`[data-wab-delete="${tron.id}"]`).click();check('Delete asks for confirmation before mutating data',(await items(frame)).some(r=>r.id===tron.id)&&await frame.locator('[data-wab-confirm-delete]').isVisible());await frame.locator('[data-wab-cancel-delete]').click();check('Cancel delete preserves the address',(await items(frame)).some(r=>r.id===tron.id));await frame.locator(`[data-wab-delete="${tron.id}"]`).click();await frame.locator('[data-wab-confirm-delete]').click();check('Confirmed delete removes only the chosen address',(await items(frame)).length===1&&!(await items(frame)).some(r=>r.id===tron.id));
 check('Saved values are excluded from automatic UI translation',await frame.locator('.wab-entry-heading>b:not([data-notr]),.wab-entry-main code:not([data-notr]),.wab-entry-main p:not([data-notr])').count()===0);await close(frame);
 await frame.evaluate(()=>{window.addressCancelCount=0;AzureWalletAddressBook.pick({network:'ethereum',onSelect:r=>addressPicked.push(r),onCancel:()=>addressCancelCount++});});await close(frame);check('Explicit picker cancellation invokes its callback exactly once',await frame.evaluate(()=>addressCancelCount===1));
 await frame.evaluate(()=>{window.addressCallbacksBefore=addressPicked.length;AzureWalletAddressBook.pick({network:'ethereum',onSelect:r=>addressPicked.push(r),onCancel:()=>addressCancelCount++});go('cust','home');});await frame.locator('.wab-overlay').waitFor({state:'detached'});check('Navigating away closes the picker without invoking stale select or cancel callbacks',await frame.evaluate(()=>addressPicked.length===addressCallbacksBefore&&addressCancelCount===1));await frame.evaluate(()=>go('cust','wallets'));
 await frame.evaluate(()=>{window.statusBeforeAddressFreeze=cust(CID()).status;cust(CID()).status='冻结';render();AzureWalletAddressBook.open();});check('Frozen customers see read-only addresses with disabled editing actions',await frame.locator('.wab-readonly').isVisible()&&await frame.locator('[data-wab-new]').isDisabled()&&await frame.locator('[data-wab-edit]').isDisabled()&&await frame.locator('[data-wab-toggle]').isDisabled()&&await frame.locator('[data-wab-delete]').isDisabled());await close(frame);await frame.evaluate(()=>{cust(CID()).status=statusBeforeAddressFreeze;render();});
 for(const locale of ['zh-Hant','zh-Hans','en'])for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1100});await frame.evaluate(locale=>I18N.set(locale),locale);await open(frame);await frame.locator('[data-wab-new]').click();
  const geometry=await frame.locator('.wab-dialog').evaluate(el=>{const r=el.getBoundingClientRect(),body=el.querySelector('.wab-body');return{left:r.left,right:r.right,view:innerWidth,overflow:body.scrollWidth>body.clientWidth+1,unlabelled:[...el.querySelectorAll('input,select')].filter(n=>!n.labels?.length).length};});
  check(`Address editor fits ${locale} ${width} with labelled controls`,geometry.left>=-1&&geometry.right<=geometry.view+1&&!geometry.overflow&&geometry.unlabelled===0,geometry);
  if(locale==='en'&&width===320)await frame.locator('.wab-overlay').screenshot({path:path.join(output,'address-editor-en-320.png')});
  await frame.locator('[data-wab-cancel-edit]').click();if(locale==='zh-Hant'&&width===390)await frame.locator('.wab-overlay').screenshot({path:path.join(output,'address-list-tc-390.png')});await close(frame);
 }
 await page.setViewportSize({width:1440,height:1100});await frame.evaluate(()=>{I18N.set('zh-Hant');if(S.theme!=='dark')toggleTheme();});await open(frame);check('Address book inherits the actual dark mode',await frame.locator('.wab-dialog').evaluate(el=>getComputedStyle(el).backgroundColor!=='rgb(255, 255, 255)'));await frame.locator('.wab-overlay').screenshot({path:path.join(output,'address-list-dark-1440.png')});
 await frame.locator('[data-wab-new]').focus();await page.keyboard.press('Shift+Tab');check('Keyboard focus remains in the address dialog',await frame.evaluate(()=>!!document.activeElement?.closest('.wab-dialog')));await page.keyboard.press('Escape');check('Escape closes only the address overlay',await frame.locator('.wab-overlay').count()===0);check('CRUD and picker operations leave financial state unchanged',await financial(frame)===before);await page.close();

 const hq=await login('stephen@ourbank.example');await hq.frame.evaluate(()=>go('hq','customer-wallets'));let delegated=await child(hq.frame);await attach(delegated);await open(delegated);await fill(delegated,{label:'Company A private synthetic address'});await close(delegated);
 await hq.frame.locator('#admin-customer-select').selectOption('AZ100002');delegated=await child(hq.frame);await attach(delegated);await open(delegated);check('Switching the selected customer hides the previous address book',(await items(delegated)).length===0&&await delegated.locator('.wab-entry').count()===0);await fill(delegated,{label:'Company B private synthetic address'});await close(delegated);
 await hq.frame.locator('#admin-customer-select').selectOption('AZ100001');delegated=await child(hq.frame);await attach(delegated);await open(delegated);const names=(await items(delegated)).map(r=>r.label);check('Switching back restores only the first customer current-session addresses',names.includes('Company A private synthetic address')&&!names.includes('Company B private synthetic address'));await close(delegated);await hq.page.close();
 check('The address book makes no chain or other unexpected external request',report.externalRequests.length===0);
}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();await fs.writeFile(reportFile,JSON.stringify(report,null,2));}
console.log(JSON.stringify({checks:report.checks.length,failures:report.checks.filter(x=>!x.ok),errors:report.errors,externalRequests:report.externalRequests},null,2));process.exitCode=report.errors.length||report.externalRequests.length||report.checks.some(x=>!x.ok)?1:0;
