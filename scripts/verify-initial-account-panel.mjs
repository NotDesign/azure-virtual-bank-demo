import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const base=process.env.DEMO_URL||'http://127.0.0.1:3264/',file=process.env.QA_REPORT||'.design-build/system-review/qa-initial-account-panel.json';
const report={base,checks:[],errors:[]},check=(label,passed)=>report.checks.push({label,passed:!!passed});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const emails={hq:'stephen@ourbank.example',cust:'finance@starocean.example',l1:'ops@ganghuitong.example',l2:'chan@chanstudio.example'};
try{
 for(const [role,width,cancel]of [['hq',1440,false],['cust',1440,false],['l1',1440,true],['l2',1440,false],['cust',390,false]]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await context.route('https://api.coinbase.com/**',r=>r.fulfill({json:{data:{currency:'USD',rates:{USD:'1',HKD:'7.8',USDT:'1'}}}}));
  let release;const gate=new Promise(r=>release=r);
  await page.route('**/account-switcher.js?*',async r=>{await gate;await r.continue();});
  try{
   await page.goto(base);await page.locator('#email').fill(emails[role]);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();
   await page.locator('.cms-confirmed-frame').waitFor();const f=await(await page.locator('.cms-confirmed-frame').elementHandle()).contentFrame();
   if(width<900){await f.locator('.mobile-menu').click();await f.locator('.account-menu-btn').click();}else await f.locator('.sidebar-account').click();
   await f.locator('[data-account-switcher-pending]').waitFor();
   check(role+' '+width+' first click waits for the account picker instead of showing profile editing',await f.locator('#profile-name').count()===0&&(await f.locator('.modal-head').innerText()).includes('切換帳號'));
   if(cancel)await f.locator('.modal-head .icon-btn').click();
   release();await f.waitForFunction(()=>window.AzureAccountSwitcher?.ready&&document.readyState==='complete');
   if(cancel){check('Closing while loading does not reopen an unwanted dialog',await f.locator('.modal').count()===0);await f.locator('.sidebar-account').click();}
   await f.locator('#account-switcher-list [data-account-email]').waitFor();
   check(role+' '+width+' opens the actual account picker without cancelling and clicking again',await f.locator(`[data-account-email="${emails[role]}"]`).count()===1&&await page.locator('#password:visible').count()===0);
   if(role==='hq'){await fs.mkdir(path.dirname(file),{recursive:true});await page.screenshot({path:path.join(path.dirname(file),'first-click-picker.png')});}
   await f.locator('.modal-head .icon-btn').click();
   if(width<900){await f.locator('.mobile-menu').click();await f.locator('.account-menu-btn').click();}else await f.locator('.sidebar-account').click();
   check(role+' '+width+' subsequent clicks open the same account picker',await f.locator('#account-switcher-list').count()===1);
  }finally{release();await context.close();}
 }
}catch(e){report.errors.push(e.stack||String(e));}finally{await browser.close();await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(report,null,2));}
console.log(JSON.stringify({total:report.checks.length,failures:report.checks.filter(c=>!c.passed),errors:report.errors}));if(report.errors.length||report.checks.some(c=>!c.passed))process.exitCode=1;
