import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const base=new URL(process.env.DEMO_URL||'http://127.0.0.1:3264/');
const out='.design-build/review-20261111b';
const file=process.env.QA_REPORT||out+'/qa-theme-logo-legend.json';
const report={base:base.href,checks:[],failures:[],errors:[],observations:{logo:[],legend:[],horizontalLegendScroll:[]}};
const check=(label,passed,detail)=>{report.checks.push({label,passed:!!passed,...(detail===undefined?{}:{detail})});if(!passed)report.failures.push(label);};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
await fs.mkdir(out,{recursive:true});await fs.mkdir(path.dirname(file),{recursive:true});
const originalAssetHash='940d4bc503ff2c89b907b846b6af5de30dae59ff4f956ad12d9d21d024a335c8';
async function context(){const c=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});c.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));await c.route('https://api.coinbase.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:{currency:'USD',rates:{USD:'1',HKD:'8',USDT:'1.1'}}})}));return c;}
async function login(c,role){const p=await c.newPage();await p.goto(base.href);await p.locator('#email').fill({hq:'stephen@ourbank.example',cust:'finance@starocean.example',l1:'ops@ganghuitong.example',l2:'chan@chanstudio.example'}[role]);await p.locator('#password').fill('AzureDemo!2026');await p.locator('#submit').click();await p.locator('[data-method=email]').click();for(let i=0;i<6;i++)await p.locator('#digit-'+i).fill('381726'[i]);await p.locator('#submit').click();await p.waitForFunction(role=>{const f=document.querySelector('#cms-host>[data-account-session]:not([hidden]) iframe')||document.querySelector('.cms-confirmed-frame');return f?.contentWindow?.document.readyState==='complete'&&f.contentWindow.AzureBridge?.account?.role===role&&f.contentWindow.AzureFiles;},role);const locator=p.locator('#cms-host>[data-account-session]:not([hidden]) .cms-confirmed-frame');const handle=await(await locator.count()?locator:p.locator('.cms-confirmed-frame')).elementHandle();const f=await handle.contentFrame();await f.waitForSelector('.azure-theme-logo');return{p,f};}
async function imagePixels(frame,light,dark){return frame.evaluate(async({light,dark})=>{
 const decode=async data=>{const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return{width:im.width,height:im.height,data:ctx.getImageData(0,0,c.width,c.height).data};};
 const a=await decode(light),b=await decode(dark);if(a.width!==b.width||a.height!==b.height)return{sameSize:false};
 let blue=0,sameBlue=0,word=0,brightWord=0,badge=0,brightBadge=0,darkTwo=0,samePixel=0;
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){const i=(y*a.width+x)*4,l=[a.data[i],a.data[i+1],a.data[i+2]],d=[b.data[i],b.data[i+1],b.data[i+2]],xp=x/a.width,yp=y/a.height;
  if(l.every((v,k)=>Math.abs(v-d[k])<=2))samePixel++;
  const orbX=a.width*.1675,orbY=a.height*.5,innerRadius=Math.min(a.width*.134,a.height*.403)*.7;
  if((x-orbX)**2+(y-orbY)**2<innerRadius**2&&l[2]>170&&l[2]-l[0]>90&&l[2]-l[1]>45){blue++;if(l.every((v,k)=>Math.abs(v-d[k])<=2))sameBlue++;}
  if(xp>.31&&xp<.81&&yp>.18&&yp<.78&&l.every(v=>v<55)){word++;if(d.every(v=>v>180))brightWord++;}
  if(xp>.82&&xp<.96&&yp>.24&&yp<.76){if(l.every(v=>v<55)){badge++;if(d.every(v=>v>180))brightBadge++;}if(d.every(v=>v<70))darkTwo++;}
 }
 return{sameSize:true,width:a.width,height:a.height,samePixelRatio:samePixel/(a.width*a.height),blue,sameBlue,blueRatio:blue?sameBlue/blue:0,word,brightWord,wordRatio:word?brightWord/word:0,badge,brightBadge,badgeRatio:badge?brightBadge/badge:0,darkTwo};
},{light:light.toString('base64'),dark:dark.toString('base64')});}
async function captureLogo(locator,options={}){for(let i=0;i<3;i++){await locator.waitFor({state:'visible'});try{return await locator.screenshot({animations:'disabled',...options});}catch(e){if(!/not attached/.test(e.message)||i===2)throw e;}}}
async function logoRoundTrip(page,frame,selector,label,toggle){
 const logo=frame.locator(selector);await logo.waitFor({state:'visible'});await frame.waitForFunction(selector=>{const el=document.querySelector(selector),r=el?.getBoundingClientRect(),im=el?.querySelector('img');return !!r&&r.width>0&&r.height>0&&im?.complete&&im.naturalWidth>0;},selector);const before=await frame.evaluate(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),im=el.querySelector('img');return{width:r.width,height:r.height,natural:im.naturalWidth/im.naturalHeight,fit:getComputedStyle(im).objectFit};},selector);
 const light=await captureLogo(logo);await toggle();await frame.waitForFunction(()=>document.documentElement.dataset.theme==='dark');const dark=await captureLogo(logo),pixels=await imagePixels(frame,light,dark);
 report.observations.logo.push({label,before,pixels});check(label+' preserves the artwork proportions and exact rendered size',pixels.sameSize&&Math.abs(before.natural-3)<.001&&before.fit==='contain'&&Math.abs(before.width/before.height-3)<.12,{before,pixels});
 check(label+' retains the saturated blue orb',pixels.blue>5&&pixels.blueRatio>.97,pixels);check(label+' turns the right wordmark into readable light lettering',pixels.word>5&&pixels.wordRatio>.90,pixels);check(label+' preserves a distinct numeral in the light badge',pixels.badge>2&&pixels.badgeRatio>.90&&pixels.darkTwo>1,pixels);
 const backgrounds=await logo.evaluate(el=>({background:getComputedStyle(el).backgroundColor,overlay:getComputedStyle(el.querySelector('.azure-logo-dark-overlay')).display}));check(label+' displays the dark overlay without an opaque mobile/public tile',backgrounds.overlay==='block'&&(!elNeedsTransparent(selector)||backgrounds.background==='rgba(0, 0, 0, 0)'),backgrounds);
 await captureLogo(logo,{path:out+'/'+label.replace(/[^a-zA-Z0-9-]/g,'-')+'-dark.png'});
 await toggle();await frame.waitForFunction(()=>document.documentElement.dataset.theme==='light');const again=await captureLogo(logo);const roundTrip=await imagePixels(frame,light,again);check(label+' restores the original light appearance',roundTrip.samePixelRatio>.995,roundTrip);
}
function elNeedsTransparent(selector){return /mobile-logo|public-logo/.test(selector);}
async function legendSnapshot(frame){return frame.evaluate(()=>{
 const host=document.querySelector('.revenue-chart .chart-legend'),card=host.closest('.revenue-chart'),h=host.getBoundingClientRect();host.scrollLeft=0;
 const range=el=>{const r=document.createRange();r.selectNodeContents(el);const rects=[...r.getClientRects()].filter(x=>x.width>0&&x.height>0);return rects.map(x=>({left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height}));};
 const rows=[...host.querySelectorAll('li')].map(li=>{const label=li.querySelector('span'),value=li.querySelector('strong'),l=label.getBoundingClientRect(),v=value.getBoundingClientRect(),r=li.getBoundingClientRect();return{label:label.textContent.trim(),value:value.textContent.trim(),labelRects:range(label),valueRects:range(value),labelBox:{left:l.left,right:l.right},valueBox:{left:v.left,right:v.right},rowBox:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},whiteSpace:getComputedStyle(label).whiteSpace,textOverflow:getComputedStyle(label).textOverflow,valueOverflow:getComputedStyle(value).textOverflow};});
 const chart=Chart.getChart(document.getElementById('dProd')),values=[...chart.data.datasets[0].data];
 const start=host.scrollLeft;host.scrollLeft=host.scrollWidth;const end=host.scrollLeft;host.scrollLeft=0;
 const c=card.getBoundingClientRect();return{rows,values,view:innerWidth,doc:document.documentElement.scrollWidth,legend:{left:h.left,right:h.right,client:host.clientWidth,scroll:host.scrollWidth,overflow:getComputedStyle(host).overflowX,start,end},card:{left:c.left,right:c.right}};
});}
try{
 const c=await context(),asset=await c.request.get(new URL('assets/d7a5f.png',base).href);check('The original logo asset is unchanged',asset.ok()&&createHash('sha256').update(await asset.body()).digest('hex')===originalAssetHash);
 const loginPage=await c.newPage();await loginPage.goto(base.href);check('The outer login keeps the original light logo',await loginPage.locator('.brand-logo').getAttribute('src')==='assets/d7a5f.png'&&await loginPage.locator('.azure-theme-logo').count()===0);await loginPage.close();await c.close();
 for(const role of ['hq','cust','l1','l2']){
  const ctx=await context(),{p,f}=await login(ctx,role),toggle=()=>f.locator('.header-controls button').first().click();
  await logoRoundTrip(p,f,'.sidebar .azure-theme-logo',role+'-sidebar',toggle);
  if(role==='hq'){
   const finances=await f.evaluate(()=>JSON.stringify({TXS,FXR}));const baseline=await legendSnapshot(f);const expected=baseline.values;report.observations.baselineValues=expected;
   for(const locale of ['zh-Hant','zh-Hans','en'])for(const width of [1440,768,390,320])for(const large of [false,true]){
    await p.setViewportSize({width,height:1100});await f.locator('.language-picker').selectOption(locale);await f.evaluate(large=>setFontSize(large?'large':'normal'),large);await f.locator('.chart-legend').waitFor();const snapshot=await legendSnapshot(f),name=`legend ${locale} ${width}${large?' large':''}`;
    report.observations.legend.push({name,...snapshot});const rows=snapshot.rows;
    check(name+' keeps each full label and amount on the same row',rows.length===expected.length&&rows.every(r=>r.labelRects.length===1&&r.valueRects.length===1&&Math.abs((r.labelRects[0].top+r.labelRects[0].bottom-r.valueRects[0].top-r.valueRects[0].bottom)/2)<2&&r.labelRects[0].right<=r.valueRects[0].left-2),snapshot);
    check(name+' shows original untruncated amounts',rows.every((r,i)=>Number(r.value.replace(/,/g,''))===expected[i]&&r.valueRects[0]?.left>=r.valueBox.left-1&&r.valueRects[0]?.right<=r.valueBox.right+1&&r.valueOverflow!=='ellipsis')&&JSON.stringify(snapshot.values)===JSON.stringify(expected),snapshot);
    check(name+' leaves complete labels available inside the legend',rows.every(r=>r.labelRects[0]?.left>=r.labelBox.left-1&&r.labelRects[0]?.right<=r.labelBox.right+1&&r.textOverflow!=='ellipsis'&&r.whiteSpace==='nowrap'),snapshot);
    const overflow=snapshot.legend.scroll>snapshot.legend.client+1;if(overflow)report.observations.horizontalLegendScroll.push({name,client:snapshot.legend.client,content:snapshot.legend.scroll,labels:rows.map(r=>r.label)});
    check(name+' contains any horizontal scrolling within the legend',snapshot.doc<=snapshot.view&&snapshot.legend.left>=snapshot.card.left&&snapshot.legend.right<=snapshot.card.right+1&&(!overflow||(['auto','scroll'].includes(snapshot.legend.overflow)&&snapshot.legend.end>0)),snapshot);
    if(locale==='en'&&width===320&&!large){await p.waitForTimeout(1100);await f.locator('.revenue-chart').screenshot({path:out+'/legend-en-320.png',animations:'disabled'});}if(locale==='zh-Hant'&&width===390&&!large){await p.waitForTimeout(1100);await f.locator('.revenue-chart').screenshot({path:out+'/legend-tc-390.png',animations:'disabled'});}
   }
   check('Legend layout and theme work leave source financial data unchanged',await f.evaluate(()=>JSON.stringify({TXS,FXR}))===finances);
   await f.evaluate(()=>setFontSize('normal'));await f.locator('.language-picker').selectOption('zh-Hant');
   for(const width of [390,320]){await p.setViewportSize({width,height:1100});await logoRoundTrip(p,f,'.header .azure-theme-logo.mobile-logo','hq-mobile-'+width,toggle);}
  }
  await ctx.close();
 }
 for(const kind of ['apply','join']){
  const ctx=await context(),p=await ctx.newPage(),u=new URL(base.href);u.hash='#/'+kind+'/'+(kind==='apply'?'HQ-SELF-01':'HQ-AG-01');await p.goto(u.href);await p.locator('.cms-confirmed-frame').waitFor();const f=await(await p.locator('.cms-confirmed-frame').elementHandle()).contentFrame();await f.locator('.public-top .public-logo').waitFor();const toggle=()=>f.locator('.public-top button[aria-label="Toggle theme"]').click();
  await logoRoundTrip(p,f,'.public-top .azure-theme-logo.public-logo','public-'+kind,toggle);await p.setViewportSize({width:320,height:1000});await logoRoundTrip(p,f,'.public-top .azure-theme-logo.public-logo','public-'+kind+'-320',toggle);await ctx.close();
 }
 const lockedContext=await context(),locked=await lockedContext.newPage();await locked.goto(new URL('cms/confirmed/index.html#/hq/dashboard',base).href);await locked.locator('.locked .azure-theme-logo').waitFor();await logoRoundTrip(locked,locked,'.locked .azure-theme-logo','locked-fallback-css',()=>locked.evaluate(()=>{S.theme=S.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=S.theme;render();}));await lockedContext.close();
}catch(error){report.errors.push(error.stack||error.message);}finally{await browser.close();await fs.writeFile(file,JSON.stringify(report,null,2));}
console.log(JSON.stringify({total:report.checks.length,failures:report.failures,errors:report.errors,horizontalLegendScroll:report.observations.horizontalLegendScroll},null,2));process.exitCode=report.failures.length||report.errors.length?1:0;
