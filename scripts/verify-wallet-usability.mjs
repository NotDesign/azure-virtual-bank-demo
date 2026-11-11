import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const output='.design-build/review-20261111';
const reportFile=process.env.QA_REPORT||output+'/qa-wallet-usability.json';
const report={base,checks:[],errors:[],observations:{}};
const check=(ok,name,detail)=>report.checks.push({name,ok:!!ok,...(detail===undefined?{}:{detail})});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
await fs.mkdir(output,{recursive:true});await fs.mkdir(path.dirname(reportFile),{recursive:true});
async function login(role){
 const p=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});p.on('pageerror',e=>report.errors.push(e.message));
 await p.route('https://api.coinbase.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:{currency:'USD',rates:{USD:'1',HKD:'8',EUR:'0.9',SGD:'1.3',USDT:'1.1'}}})}));
 await p.goto(base);await p.locator('#email').fill({cust:'finance@starocean.example',hq:'stephen@ourbank.example',l1:'ops@ganghuitong.example',l2:'chan@chanstudio.example'}[role]);await p.locator('#password').fill('AzureDemo!2026');await p.locator('#submit').click();await p.locator('[data-method=email]').click();for(let i=0;i<6;i++)await p.locator('#digit-'+i).fill('381726'[i]);await p.locator('#submit').click();
 await p.locator('.cms-confirmed-frame').waitFor();const f=await(await p.locator('.cms-confirmed-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>document.readyState==='complete'&&window.AzureWalletUsability?.ready&&window.AzureWalletFunding);return{p,f};
}
try{
 for(const role of ['cust','hq','l1','l2']){
  const {p,f}=await login(role),allowed=['cust','hq'].includes(role),route=`#/${role}/${role==='hq'?'customer-wallets':'wallets'}`;
  await f.locator('#global-search').fill('USDT');
  check(await f.locator(`#search-results a[href="${route}"]`).count()===(allowed?1:0),role+' global USDT search respects enabled wallet scope');
  const side=f.locator('.side-search input');await side.fill('usdt');
  if(allowed)check(await f.locator(`.nav a[href="${route}"]`).isVisible(),role+' sidebar USDT alias finds wallet entry');
  else check(await f.locator('.nav a[href*="wallets"]').count()===0,role+' alias does not add a wallet permission');
  await f.locator('.side-search .review-search-clear').click();check(await side.inputValue()==='',role+' sidebar X clears query');
  if(role==='cust'){
   await f.evaluate(()=>go('cust','wallets'));await f.locator('.wallet-toolbar').waitFor();
   check(await f.locator('.wallet-deposit-btn').first().isVisible()&&await f.locator('.wallet-withdraw-btn').first().isVisible(),'USDT funding is discoverable while the selected wallet is fiat');
   for(const width of [1440,390,320]){
    await p.setViewportSize({width,height:1000});
    const action=await f.locator('.wallet-deposit-btn').first().boundingBox(),overview=await f.locator('.wallet-classification').boundingBox();
    check(!!action&&!!overview&&action.y<overview.y,'Funding action precedes detailed asset summary at '+width);
    check(!!action&&action.y<900,'Funding entry is reachable in the initial viewport at '+width,action);
    check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Wallet viewport has no horizontal overflow at '+width);
    if(width<600){
     const bounds=await f.locator('.wallet-list tbody tr button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,view:innerWidth,width:r.width};}));
     check(bounds.length>0&&bounds.every(r=>r.left>=0&&r.right<=r.view&&r.width>=44),'Every wallet selection stays inside its mobile card at '+width,bounds);
    }
    await f.locator('#wallet-workbench-tab-activity').click();
    check(await f.locator('.wallet-classification').isHidden()&&await f.locator('.amr-panel').isHidden(),'Activity tab removes unrelated summary at '+width);
    const filters=await f.locator('.wa-filter-form').boundingBox();check(!!filters&&filters.y<500,'Activity filters appear in the first half of the viewport at '+width,filters);
    const hidden=await f.evaluate(()=>AzureWallets.snapshot().preferences.hideBalances);await f.locator('#wallet-shared-privacy-toggle').click();
    check(await f.evaluate(hidden=>AzureWallets.snapshot().preferences.hideBalances!==hidden,hidden),'Activity has a direct shared amount-privacy control at '+width);
    check(await f.evaluate(()=>document.activeElement.id==='wallet-shared-privacy-toggle'),'Shared privacy retains keyboard focus at '+width);await f.locator('#wallet-shared-privacy-toggle').click();
    check(await f.locator('.wa-empty .btn').count()===1,'First activity empty state offers a next action at '+width);
    await f.locator('#wallet-workbench-tab-wallets').click();
   }
   const target=await f.evaluate(()=>AzureWallets.list().find(w=>w.kind==='crypto'&&w.network==='ethereum').id);
   await f.locator(`[data-wallet-row="${target}"] button`).click();check(await f.evaluate(id=>AzureWallets.snapshot().selectedId===id,target),'Mobile wallet card selection changes the actual selected wallet');
   await f.locator('#wallet-workbench-tab-activity').click();await f.locator('.wa-empty .btn').click();check(await f.locator('.wallet-funding-modal').isVisible(),'Empty activity action opens the operational deposit flow');await f.locator('.modal-head .icon-btn').click();
   await f.locator('#wallet-workbench-tab-wallets').click();
   for(const locale of ['en','zh-Hans','zh-Hant']){
    await f.locator('.language-picker').selectOption(locale);await p.setViewportSize({width:320,height:1000});
    check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Optimized wallet layout fits 320px in '+locale);
   }
   await f.locator('.header-controls button').first().click();await f.evaluate(()=>document.documentElement.dataset.font='large');
   check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Optimized mobile wallet fits dark mode and enlarged text');
   await f.evaluate(()=>{document.documentElement.dataset.font='normal';});await f.locator('.header-controls button').first().click();
   for(const width of [1440,390]){await p.setViewportSize({width,height:1000});await f.locator('.main').evaluate(el=>el.scrollTop=0);await p.screenshot({path:output+`/wallet-usability-${width}.png`,fullPage:false});}
  }
  await p.close();
 }
}catch(error){report.errors.push(error.stack||String(error));}finally{await browser.close();await fs.writeFile(reportFile,JSON.stringify(report,null,2));}
console.log(JSON.stringify({total:report.checks.length,failures:report.checks.filter(c=>!c.ok),errors:report.errors},null,2));process.exitCode=report.errors.length||report.checks.some(c=>!c.ok)?1:0;
