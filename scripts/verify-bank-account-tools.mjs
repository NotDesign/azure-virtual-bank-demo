import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {dirname} from 'node:path';

const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const output='.design-build/review-20261110';
const reportFile=process.env.QA_REPORT||output+'/qa-bank-account-tools.json';
await fs.mkdir(output,{recursive:true});await fs.mkdir(dirname(reportFile),{recursive:true});
const report={base,checks:[],failures:[],errors:[]};
const check=(ok,label)=>{report.checks.push({label,passed:!!ok});if(!ok)report.failures.push(label);};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
context.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));
async function ready(frame,role){await frame.waitForFunction(role=>document.readyState==='complete'&&window.AzureFiles&&window.AzureWizard&&window.AzureBankAccountTools?.ready&&AzureBridge.account?.role===role,role);await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));}
async function login(role){const page=await context.newPage();await page.goto(base);await page.locator('#email').fill(role==='hq'?'stephen@ourbank.example':'finance@starocean.example');await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('.cms-confirmed-frame')?.contentWindow?.document.querySelector('.page-title'));const frame=page.frames().find(f=>f.url().includes('/confirmed/'));await ready(frame,role);return{page,frame};}
async function open(frame){await frame.evaluate(()=>{closeModal();acctDetail(0);});await frame.locator('.bank-account-drawer').waitFor();}
async function pairs(frame){return frame.evaluate(()=>[...document.querySelectorAll('.bank-account-drawer dl.kv dt')].map(dt=>{const dd=dt.nextElementSibling,copy=dd.cloneNode(true);copy.querySelectorAll('button').forEach(b=>b.remove());return{label:dt.textContent.trim(),value:copy.textContent.trim()};}));}
async function mockClipboard(frame,fail=false){await frame.evaluate(fail=>{window.__qaBankCopied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(fail)throw new Error('Clipboard denied for QA');window.__qaBankCopied=value;}}});},fail);}
async function copied(frame){await frame.waitForFunction(()=>window.__qaBankCopied!==null);return frame.evaluate(()=>__qaBankCopied);}
async function download(page,frame){const event=page.waitForEvent('download');await frame.locator('.bank-download').click();const d=await event;return{name:d.suggestedFilename(),text:await fs.readFile(await d.path(),'utf8')};}
async function childFor(frame,id){await frame.waitForFunction(id=>document.querySelector('.admin-customer-frame')?.contentWindow?.AzureAdminChild?.customerId===id,id);const child=await(await frame.locator('.admin-customer-frame').elementHandle()).contentFrame();await ready(child,'cust');return child;}
try{
 const{page,frame:f}=await login('cust');await f.evaluate(()=>go('cust','accounts'));await f.waitForFunction(()=>S.page==='accounts'&&document.querySelector('[onclick="acctDetail(0)"]'));
 const original=await f.evaluate(()=>({no:myAccts()[0].no,bankCode:VA_INFO.bankCode,balances:JSON.stringify(BALANCES)}));
 await f.evaluate(()=>{myAccts()[0].no='000 012 003400';VA_INFO.bankCode='0016';render();});await open(f);const captured=await pairs(f);
 check(await f.locator('.bank-account-drawer').getAttribute('aria-labelledby')==='bank-account-drawer-title'&&!!await f.locator('#bank-account-drawer-title').innerText(),'The drawer has a readable accessible title');
 check(await f.locator('.bank-field-copy').count()===captured.length,'Every original bank information field gets one copy control');
 check(await f.locator('.bank-field-copy').evaluateAll((buttons,fields)=>buttons.every((b,i)=>(b.getAttribute('aria-label')||'').includes(fields[i].label)),captured),'Each field copy button identifies the field it copies');
 check(captured.some(p=>p.value==='000 012 003400')&&captured.some(p=>p.value==='0016'),'Rendered source values preserve account and bank-code leading zeros');
 check(await f.evaluate(()=>!document.querySelector('.bank-account-drawer').textContent.includes('AZ100002')&&ACCOUNTS.filter(a=>a.cust!==CID()).every(a=>!document.querySelector('.bank-account-drawer').textContent.includes(a.no))),'The drawer contains no other customer account number or ID');
 check(await f.locator('.bank-account-drawer .note').count()>0&&await f.locator('.bank-account-drawer [onclick*="acctConfirm(0)"]').count()===1,'Native account notes and confirmation action remain available');
 await page.screenshot({path:output+'/bank-account-tools-desktop.png',animations:'disabled'});
 await mockClipboard(f);for(const [i,pair]of captured.entries()){await f.locator(`[data-bank-field="${i}"]`).click();check(await copied(f)===pair.value,'Field '+i+' copies its original value only');await f.evaluate(()=>{__qaBankCopied=null;});}
 await f.locator('.bank-copy-all').click();const all=await copied(f);check(captured.every(p=>all.includes(p.label+'：'+p.value)),'Copy all contains every rendered field and value');
 check(!/複製全部|Copy all|逐欄複製/.test(all),'Copy data does not include copy-button labels');
 const file=await download(page,f);check(file.name.endsWith('.txt')&&file.text===all,'UTF-8 text download exactly matches Copy All');
 check(file.text.includes('000 012 003400')&&file.text.includes('0016'),'Downloaded account values retain leading zeros');
 await mockClipboard(f,true);await f.locator('.bank-field-copy').first().click();await f.locator('.bank-copy-fallback textarea').waitFor();check(await f.locator('.bank-copy-fallback textarea').inputValue()===captured[0].value,'Clipboard failure offers the exact field value as a manual fallback');
 check(await f.locator('.bank-copy-fallback textarea').evaluate(el=>el.readOnly&&document.activeElement===el&&el.selectionStart===0&&el.selectionEnd===el.value.length),'Manual fallback is readonly, focused and fully selected');
 check(await f.locator('[role="dialog"]').count()===1,'Clipboard fallback stays inside the existing drawer');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});const bounds=await f.locator('.bank-account-drawer').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});check(bounds.left>=-1&&bounds.right<=bounds.viewport+1&&!bounds.overflow,'Bank drawer fits '+width+'px without horizontal page overflow');if(width<=390)check(bounds.width>=bounds.viewport-2,'Bank drawer uses the full mobile width at '+width+'px');}
 await f.evaluate(()=>{document.getElementById('toasts').replaceChildren();document.querySelector('.bank-account-drawer>.modal-body').scrollTop=0;});await page.screenshot({path:output+'/bank-account-tools-mobile.png',animations:'disabled'});await f.evaluate(()=>closeModal());for(const value of [-1,99999,1.5,'0',null]){await f.evaluate(value=>acctDetail(value),value);check(await f.locator('.bank-account-drawer').count()===0,'Invalid account index '+JSON.stringify(value)+' does not open a drawer');}
 await page.setViewportSize({width:1440,height:1000});await open(f);await f.locator('.bank-account-drawer [onclick*="acctConfirm(0)"]').click();check(await f.locator('.letter').count()===1&&await f.locator('.bank-account-drawer').count()===0,'Original account confirmation opens its unchanged document modal');
 await f.evaluate(()=>{closeModal();modal('QA unrelated modal','<p>Unrelated</p>');});check(await f.locator('.bank-account-drawer').count()===0,'Unrelated modals do not gain bank-drawer styling');
 await f.evaluate(original=>{closeModal();myAccts()[0].no=original.no;VA_INFO.bankCode=original.bankCode;render();},original);check(await f.evaluate(before=>JSON.stringify(BALANCES)===before,original.balances),'Bank tools leave account balances unchanged');await page.close();

 const{page:hqPage,frame:hq}=await login('hq');await hq.evaluate(()=>acctDetail(0));check(await hq.locator('.bank-account-drawer').count()===0,'HQ direct account call cannot bypass customer scope');
 await hq.evaluate(()=>adminOpenCustomer('AZ100001','accounts'));let child=await childFor(hq,'AZ100001');await open(child);const hqPairs=await pairs(child);await mockClipboard(child);await child.locator('.bank-copy-all').click();const hqAll=await copied(child);check(hqPairs.every(p=>hqAll.includes(p.label+'：'+p.value)),'HQ delegated Copy All uses only the selected customer rendered values');const hqFile=await download(hqPage,child);check(hqFile.text===hqAll,'HQ delegated download matches the selected customer Copy All');
 await child.evaluate(()=>closeModal());await hq.locator('#admin-customer-select').selectOption('AZ100002');child=await childFor(hq,'AZ100002');check(await child.locator('[onclick="acctDetail(0)"]').count()===0,'HQ customer without supplied banking balances has no native detail entry');await child.evaluate(()=>acctDetail(0));check(await child.locator('.bank-account-drawer').count()===0&&await child.locator('.modal').count()===0,'A missing-data customer cannot open sample bank information via direct calls');check(await hq.evaluate(()=>AzureBridge.account.role==='hq')&&await child.evaluate(()=>CID()==='AZ100002'),'Bank tooling preserves HQ identity and delegated customer scope');await hqPage.close();
}catch(e){report.errors.push(e.stack||e.message);}
finally{await browser.close();await fs.writeFile(reportFile,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));process.exitCode=report.failures.length||report.errors.length?1:0;
