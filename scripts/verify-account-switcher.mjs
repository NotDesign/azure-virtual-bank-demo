import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const out='.design-build/review-20261111';
const file=process.env.QA_REPORT||out+'/qa-account-switcher.json';
const storageKey='azure.remembered-accounts.v1';
const emails={cust:'finance@starocean.example',hq:'stephen@ourbank.example',l1:'ops@ganghuitong.example',l2:'chan@chanstudio.example'};
const report={base,checks:[],failures:[],errors:[],observations:{}};
const check=(label,passed,detail)=>{report.checks.push({label,passed:!!passed,...(detail===undefined?{}:{detail})});if(!passed)report.failures.push(label);};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
await fs.mkdir(out,{recursive:true});await fs.mkdir(path.dirname(file),{recursive:true});
async function fresh(){const c=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});c.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));await c.route('https://api.coinbase.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:{currency:'USD',rates:{USD:'1',HKD:'8',USDT:'1.1'}}})}));return c;}
async function remembered(page){return page.evaluate(key=>{try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return[];}},storageKey);}
async function active(page,role){
 await page.waitForFunction(role=>{const host=document.querySelector('#cms-host>[data-account-session]:not([hidden])'),f=host?.querySelector('.cms-confirmed-frame');try{return f?.contentWindow?.AzureBridge?.account?.role===role&&f.contentWindow.AzureAccountSwitcher?.ready&&f.contentWindow.document.readyState==='complete';}catch{return false;}},role);
 const el=await page.locator('#cms-host>[data-account-session]:not([hidden]) .cms-confirmed-frame').elementHandle();return el.contentFrame();
}
async function credentials(page,role,remember=true){await page.locator('#email').fill(emails[role]);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#remember-account').setChecked(remember);await page.locator('#submit').click();await page.locator('[data-method=email]').click();}
async function otp(page,code='381726'){for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill(code[i]);await page.locator('#submit').click();}
async function login(page,role,remember=true){await credentials(page,role,remember);await otp(page);return active(page,role);}
async function panel(frame){
 const card=frame.locator('.sidebar-account');if(await card.isVisible())await card.click();else{await frame.locator('.mobile-menu').click();await frame.locator('.account-menu-btn').click();}
 await frame.locator('#account-switcher-list').waitFor();
}
async function closePanel(frame){await frame.locator('.modal-head .icon-btn').click();}
const switchButton=(frame,role)=>frame.locator(`[data-account-switch="${emails[role]}"]`);
const row=(frame,role)=>frame.locator(`[data-account-email="${emails[role]}"]`);
try{
 const ctx=await fresh(),page=await ctx.newPage();await page.goto(base);
 check('A fresh browser has no remembered accounts',(await remembered(page)).length===0);
 await page.locator('#email').fill(emails.cust);await page.locator('#password').fill('incorrect');await page.locator('#remember-account').check();await page.locator('#submit').click();await page.locator('#form-error').waitFor();
 check('An unsuccessful password does not remember or authorize an account',(await remembered(page)).length===0&&await page.locator('.cms-confirmed-frame').count()===0);
 await credentials(page,'cust');await otp(page,'000000');await page.locator('#form-error').waitFor();
 check('An unsuccessful OTP does not remember or authorize an account',(await remembered(page)).length===0&&await page.locator('.cms-confirmed-frame').count()===0);
 await otp(page);let custFrame=await active(page,'cust');
 const stored1=await remembered(page);check('Only the successfully verified and remembered account is stored',stored1.length===1&&stored1[0].email===emails.cust,stored1);
 check('Remembered data contains no password, OTP, token, verification or session grants',!/(?:password|AzureDemo!2026|381726|654321|"(?:token|session|verified|expiresAt|accessToken)")/i.test(JSON.stringify(stored1)));
 await panel(custFrame);check('The account panel does not prepopulate all four Demo identities',await custFrame.locator('#account-switcher-list [data-account-email]').count()===1);check('Current account is identified',await row(custFrame,'cust').getAttribute('data-current')==='true'||/目前|当前|current/i.test(await row(custFrame,'cust').innerText()));
 await custFrame.locator('#account-switcher-add').click();await page.locator('#email').waitFor();check('Adding an account presents credentials and a cancel action',await page.locator('#password').isVisible()&&await page.locator('#cancel-account-login').isVisible());
 await page.locator('#cancel-account-login').click();custFrame=await active(page,'cust');check('Cancelling another login restores the previous account and frame',await custFrame.evaluate(()=>AzureBridge.account.email)===emails.cust);
 await panel(custFrame);await custFrame.locator('#account-switcher-add').click();await credentials(page,'hq');await otp(page);await page.locator('#cancel-account-login').click();custFrame=await active(page,'cust');await page.waitForTimeout(1000);check('Cancelling during OTP completion prevents the candidate session from overwriting the previous account',await custFrame.evaluate(()=>AzureBridge.account.email)===emails.cust&&!(await remembered(page)).some(x=>x.email===emails.hq));
 await custFrame.evaluate(()=>go('cust','wallets'));await custFrame.locator('.wallet-toolbar').waitFor();
 const fixture=await custFrame.evaluate(()=>{const w=AzureWallets.list().find(w=>w.kind==='crypto'&&w.network==='tron'),r=AzureWallets.funding.createDeposit({walletId:w.id,network:w.network,amount:'26.123456',requestId:crypto.randomUUID()});AzureWallets.funding.transition(r.record.id,'completed');return{recordId:r.record.id,walletId:w.id,snapshot:AzureWallets.snapshot()};});
 await panel(custFrame);await custFrame.locator('#account-switcher-add').click();let hq=await login(page,'hq');
 check('A second verified login is remembered without deleting the first',new Set((await remembered(page)).map(x=>x.email)).size===2);
 check('Each signed-in account keeps an attached separate CMS frame',await page.locator('#cms-host>[data-account-session] .cms-confirmed-frame').count()===2);
 check('Only one account host is visible',await page.locator('#cms-host>[data-account-session]:not([hidden])').count()===1);
 await custFrame.evaluate(email=>parent.postMessage({type:'azure-account-switch',email},location.origin),emails.cust);await page.waitForTimeout(100);check('A cached inactive account frame cannot switch the active identity',await hq.evaluate(()=>AzureBridge.account.role)==='hq');
 await page.evaluate(email=>{const source=document.querySelector('#cms-host>[data-account-session]:not([hidden]) iframe').contentWindow;dispatchEvent(new MessageEvent('message',{origin:'https://untrusted.example',source,data:{type:'azure-account-switch',email}}));},emails.cust);await page.waitForTimeout(100);check('A mismatched message origin cannot request an account switch',await hq.evaluate(()=>AzureBridge.account.role)==='hq');
 await hq.evaluate(()=>adminOpenCustomer('AZ100002','wallets'));await hq.waitForFunction(()=>document.querySelector('.admin-customer-frame')?.contentWindow?.AzureAdminChild?.customerId==='AZ100002'&&document.querySelector('.admin-customer-frame').contentWindow.AzureWallets);
 let child=await(await hq.locator('.admin-customer-frame').elementHandle()).contentFrame();
 const scope=await child.evaluate(id=>({customer:CID(),foreign:AzureWallets.funding.get(id),rows:AzureWallets.funding.records().length}),fixture.recordId);
 check('The other login does not inherit the original account wallet records',scope.customer==='AZ100002'&&scope.foreign===null&&scope.rows===0,scope);
 // A nested customer frame has the same origin but is not the active main CMS frame.
 await child.evaluate(email=>top.postMessage({type:'azure-account-switch',email},location.origin),emails.cust);await page.waitForTimeout(100);
 check('A delegated customer iframe cannot forge a main-account switch',await hq.evaluate(()=>AzureBridge.account.role)==='hq'&&await page.locator('#cms-host>[data-account-session]:not([hidden])').count()===1);
 await panel(hq);await switchButton(hq,'cust').click();custFrame=await active(page,'cust');
 const restored=await custFrame.evaluate(()=>AzureWallets.snapshot());check('Quick switching preserves the original wallet ledger and exact balance',JSON.stringify(restored)===JSON.stringify(fixture.snapshot));
 check('Quick switching restores the existing customer route',await custFrame.evaluate(()=>S.portal==='cust'&&S.page==='wallets'));
 await panel(custFrame);await switchButton(custFrame,'hq').click();hq=await active(page,'hq');check('The second account also restores its own previous route',await hq.evaluate(()=>S.portal==='hq'&&S.page==='customer-wallets'));
 await panel(hq);const roleBefore=await hq.evaluate(()=>AzureBridge.account.role);await hq.locator(`[data-account-remove="${emails.hq}"]`).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'[]').every(x=>x.email!=='stephen@ourbank.example'),storageKey);
 check('Removing a remembered entry does not sign out the active account',roleBefore==='hq'&&await hq.evaluate(()=>AzureBridge.account.role)==='hq');
 await closePanel(hq);await hq.locator('.language-picker').selectOption('en');await hq.locator('.header-controls button').first().click();
 for(const width of [390,320]){await page.setViewportSize({width,height:900});await panel(hq);const geometry=await hq.locator('.modal').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth,body:document.documentElement.scrollWidth,buttons:[...el.querySelectorAll('#account-switcher-list button,#account-switcher-add')].filter(x=>x.getClientRects().length).map(x=>{const r=x.getBoundingClientRect();return{left:r.left,right:r.right,height:r.height};})};});check('English dark account picker fits '+width+'px',geometry.left>=0&&geometry.right<=geometry.width&&geometry.body<=geometry.width&&geometry.buttons.every(x=>x.left>=0&&x.right<=geometry.width&&x.height>=32),geometry);await hq.locator('[data-account-remember]').waitFor({state:'visible'});const rememberSize=await hq.locator('[data-account-remember]').boundingBox();check('The remember action stays a compact full-width control at '+width,!!rememberSize&&rememberSize.height<=56&&rememberSize.width>200,rememberSize);await page.screenshot({path:out+`/account-switcher-en-dark-${width}.png`});await hq.locator('.modal').press('Escape');check('Account picker closes with Escape at '+width,await hq.locator('#account-switcher-list').count()===0);}
 await page.setViewportSize({width:1440,height:1000});await panel(hq);await hq.locator('[data-account-remember]').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'[]').some(x=>x.email==='stephen@ourbank.example'),storageKey);check('The active account can explicitly be remembered again',(await remembered(page)).some(x=>x.email===emails.hq));await hq.locator('.modal-foot .btn-danger').click();await page.locator('#email').waitFor();
 check('Sign out removes access to the signed-out account',await page.locator('#cms-host>[data-account-session]:not([hidden]) .cms-confirmed-frame').count()===0);
 await page.locator(`#remembered-account-list [data-account-switch="${emails.hq}"]`).click();check('A signed-out remembered account cannot reuse its previous verified session',await page.locator('#email').inputValue()===emails.hq&&await page.locator('#password').inputValue()===''&&await page.locator('#cms-host>[data-account-session]:not([hidden]) .cms-confirmed-frame').count()===0);
 await page.locator(`#remembered-account-list [data-account-switch="${emails.cust}"]`).click();custFrame=await active(page,'cust');check('Signing out one account preserves the other account verified session and financial state',JSON.stringify(await custFrame.evaluate(()=>AzureWallets.snapshot()))===JSON.stringify(fixture.snapshot));
 await panel(custFrame);await custFrame.locator(`[data-account-remove="${emails.hq}"]`).click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'[]').every(x=>x.email!=='stephen@ourbank.example'),storageKey);check('Forgetting a different account does not change the current identity',await custFrame.evaluate(()=>AzureBridge.account.role)==='cust');await custFrame.locator('#account-switcher-logout-all').click();await page.locator('#email').waitFor();check('Sign out all removes every cached authenticated host',await page.locator('#cms-host>[data-account-session]').count()===0);
 await page.reload();await page.locator('#email').waitFor();check('Reload does not recreate authenticated frames from remembered metadata',await page.locator('.cms-confirmed-frame').count()===0&&await page.locator('#password').inputValue()==='');
 const persisted=await remembered(page);check('Reload retains only remembered display entries',persisted.some(x=>x.email===emails.cust)&&!persisted.some(x=>x.email===emails.hq),persisted);
 await page.locator(`#remembered-account-list [data-account-switch="${emails.cust}"]`).click();check('A remembered login card prefills only the email and still requires verification',await page.locator('#email').inputValue()===emails.cust&&await page.locator('#password').inputValue()===''&&await page.locator('.cms-confirmed-frame').count()===0);
 await page.evaluate(({key,email})=>localStorage.setItem(key,JSON.stringify([{email,name:'Forged administrator',role:'hq',organization:'Forged'}])),{key:storageKey,email:emails.cust});await page.reload();await page.locator('#email').waitFor();
 check('Forged remembered metadata grants no authenticated session',await page.locator('.cms-confirmed-frame').count()===0);
 custFrame=await login(page,'cust',false);check('Authentication resolves the real account role instead of the stored role',await custFrame.evaluate(()=>AzureBridge.account.role)==='cust');
 check('An unchecked remember option does not add a new stored entry',!(await remembered(page)).some(x=>x.email===emails.hq));
 // Advance only after functional tests: all cached sessions must expire rather than remain usable.
 await page.clock.install();await page.clock.fastForward(901000);await page.waitForFunction(()=>!!document.querySelector('#email')||!![...document.querySelectorAll('h2')].find(e=>/expired|逾時|過期|过期/i.test(e.textContent)));
 check('Idle expiry hides all authenticated account hosts',await page.locator('#cms-host>[data-account-session]:not([hidden]) .cms-confirmed-frame').count()===0);
 await ctx.close();
 // A candidate account's failed attempts cannot be reset by cancelling back to another valid login.
 const locks=await fresh(),lockedPage=await locks.newPage();await lockedPage.goto(base);let accountA=await login(lockedPage,'cust');await panel(accountA);await accountA.locator('#account-switcher-add').click();
 for(let attempt=0;attempt<5;attempt++){await lockedPage.locator('#email').fill(emails.hq);await lockedPage.locator('#password').fill('incorrect');await lockedPage.locator('#submit').click();if(attempt<4)await lockedPage.waitForFunction(()=>!!document.querySelector('#form-error')&&!document.querySelector('#submit')?.disabled);else await lockedPage.locator('#lock-timer').waitFor();}
 check('Five failed candidate passwords lock that account without remembering it',await lockedPage.locator('#lock-timer').isVisible()&&!(await remembered(lockedPage)).some(x=>x.email===emails.hq));
 await lockedPage.locator('#cancel-account-login').click();accountA=await active(lockedPage,'cust');check('A locked candidate can be cancelled without invalidating the previous account',await accountA.evaluate(()=>AzureBridge.account.email)===emails.cust);
 await panel(accountA);await accountA.locator('#account-switcher-add').click();await lockedPage.locator('#email').fill(emails.hq);await lockedPage.locator('#password').fill('AzureDemo!2026');await lockedPage.locator('#submit').click();await lockedPage.locator('#lock-timer').waitFor();
 check('Reopening add-account cannot bypass the candidate lock with a valid password',await lockedPage.locator('#lock-timer').isVisible()&&await lockedPage.locator('[data-method=email]').count()===0&&!(await remembered(lockedPage)).some(x=>x.email===emails.hq));
 await lockedPage.locator('#cancel-account-login').click();accountA=await active(lockedPage,'cust');check('The original account remains usable after the blocked retry',await accountA.evaluate(()=>AzureBridge.account.role)==='cust');await locks.close();
 // Trusted typing keeps only the active account alive; an inactive cached account still expires.
 const typing=await fresh(),typingPage=await typing.newPage();await typingPage.goto(base);let inactiveHQ=await login(typingPage,'hq');await panel(inactiveHQ);await inactiveHQ.locator('#account-switcher-add').click();let activeCust=await login(typingPage,'cust');await typingPage.clock.install();
 for(let n=0;n<3;n++){await typingPage.clock.fastForward(300000);activeCust=await active(typingPage,'cust');await activeCust.locator('#global-search').fill('typing '+n);await typingPage.waitForTimeout(30);}
 await typingPage.waitForFunction(email=>!document.querySelector('#cms-host>[data-account-session="'+email+'"]'),emails.hq);
 check('Trusted typing keeps the active account usable beyond 15 elapsed minutes',await typingPage.locator(`#cms-host>[data-account-session="${emails.cust}"]:not([hidden])`).isVisible()&&await activeCust.evaluate(()=>AzureBridge.account.role)==='cust');
 check('Typing in one account does not extend an inactive account session',await typingPage.locator(`#cms-host>[data-account-session="${emails.hq}"]`).count()===0);
 await panel(activeCust);await activeCust.locator(`[data-account-switch="${emails.hq}"]`).click();await typingPage.locator('#email').waitFor();
 check('An inactive expired remembered account requires full verification',await typingPage.locator('#email').inputValue()===emails.hq&&await typingPage.locator('#password').inputValue()===''&&await typingPage.locator('#cms-host>[data-account-session]:not([hidden]) iframe').count()===0);
 await typingPage.locator('#cancel-account-login').click();activeCust=await active(typingPage,'cust');check('Returning from expired-account verification preserves the still-active account',await activeCust.evaluate(()=>AzureBridge.account.email)===emails.cust);await typing.close();
 const noRemember=await fresh(),other=await noRemember.newPage();await other.goto(base);await login(other,'l2',false);check('A successful unchecked login is not remembered',(await remembered(other)).length===0);await noRemember.close();
}catch(e){report.errors.push(e.stack||e.message);}finally{await browser.close();await fs.writeFile(file,JSON.stringify(report,null,2));}
console.log(JSON.stringify({total:report.checks.length,failures:report.failures,errors:report.errors},null,2));process.exitCode=report.failures.length||report.errors.length?1:0;
