import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const errors=[],fails=[],report={scopes:[],screens:[]};
const emails={cust:'finance@starocean.example',l1:'ops@ganghuitong.example',l2:'chan@chanstudio.example',hq:'stephen@ourbank.example'};
const check=(value,label)=>{if(!value)fails.push(label);};
async function login(page,email){await page.goto('http://127.0.0.1:3193/');await page.locator('#email').fill(email);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();await page.locator('.cms-confirmed-frame').waitFor();const frame=page.frames().find(f=>f.url().includes('/confirmed/'));await frame.waitForSelector('.page-title');return frame;}
for(const [role,email] of Object.entries(emails)){
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(role+': '+e.message));page.on('requestfailed',r=>errors.push(role+' request: '+r.url()));
 const f=await login(page,email);await page.waitForTimeout(1200);
 const paths=await f.locator('.sidebar .nav a:not(.disabled)').evaluateAll(es=>es.map(a=>a.getAttribute('href')));
 check(await f.locator('.portal-switch').count()===0,role+' role switch absent');
 check(await f.locator('.public-links button').count()===2,role+' two public buttons');
 for(const path of paths){await f.evaluate(p=>location.hash=p,path);await page.waitForTimeout(100);check(await f.locator('.page-title').count()>0,role+' page title '+path);const scroll=await f.evaluate(()=>({body:document.body.scrollWidth,view:innerWidth}));check(scroll.body<=scroll.view,role+' body overflow '+path);}
 const scope=await f.evaluate(()=>({portal:AzureBridge.state.portal,customers:custsInScope().map(c=>c.id),transactions:txsInScope().length,apps:appsInScope().map(a=>a.id)}));
 if(role==='cust')check(scope.customers.join(',')==='AZ100001','cust only owns one customer');
 if(role==='l2')check(scope.customers.length===2,'l2 scope count');
 await f.evaluate(()=>location.hash='#/hq/dashboard');await page.waitForTimeout(150);check(await f.evaluate(()=>AzureBridge.state.portal)===role,role+' cross-scope guard');
 await f.evaluate(r=>location.hash=`#/${r}/${r==='cust'?'home':'dashboard'}`,role);await page.waitForTimeout(1200);
 await page.screenshot({path:`.design-build/${role}-desktop.png`});report.screens.push(role+'-desktop');
 await f.locator('.header-controls button').first().click();check(await f.evaluate(()=>document.documentElement.dataset.theme)==='dark',role+' dark mode');await f.locator('.header-controls button').first().click();
 await f.locator('.language-picker').selectOption('en');check(await f.locator('.page-title').innerText()!=='儀表盤',role+' English');await f.locator('.language-picker').selectOption('zh-Hant');
 for(const width of [768,390,320]){await page.setViewportSize({width,height:900});await page.waitForTimeout(300);const v=await f.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));check(v.doc<=v.view,role+' RWD overflow '+width);await page.screenshot({path:`.design-build/${role}-${width}.png`});}
 report.scopes.push({...scope,role,menus:paths.length});await page.close();
}
const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push('hq detail: '+e.message));const f=await login(page,emails.hq);
for(const [key,hash] of [['cs','#/hq/app/APP-26100902'],['legal','#/hq/app/APP-26101003'],['recruit','#/hq/recruit'],['users','#/hq/settings'],['notify','#/hq/settings'],['links','#/hq/links'],['agents','#/hq/agents']]){
 await f.evaluate(p=>location.hash=p,hash);await page.waitForTimeout(200);if(key==='recruit')await f.evaluate(()=>setUI('rt','links'));if(key==='users')await f.evaluate(()=>setUI('st','users'));if(key==='notify')await f.evaluate(()=>setUI('st','notify'));if(key==='agents')await f.evaluate(()=>setUI('as','A001'));await page.waitForTimeout(200);await page.screenshot({path:`.design-build/${key}-desktop.png`});
 if(key==='legal'){check(await f.locator('.risk-result').count()>0,'Risk is read-only');check(await f.locator('.screening-hint').count()>0,'Screening explanation present');}
 if(key==='links'||key==='recruit'){const urls=await f.locator('.qr').evaluateAll(es=>es.map(e=>({url:e.dataset.url,img:!!e.querySelector('canvas,img')})));check(urls.length>0&&urls.every(x=>x.img&&x.url.startsWith('http://127.0.0.1:3193/')),key+' real demo QR');}
}
await browser.close();report.errors=errors;report.failures=fails;await fs.writeFile('.design-build/qa-scopes.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=errors.length||fails.length?1:0;
