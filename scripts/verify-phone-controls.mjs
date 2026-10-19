import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const output='.design-build/camera-20261019';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const checks=[],errors=[];
const check=(name,ok)=>checks.push({name,ok:!!ok});
async function openPage(width,locale='zh-Hant',mode='face',denied=false){
 const page=await browser.newPage({viewport:{width,height:950}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({denied})=>{
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  window.cameraTestStreams=[];window.cameraTestRequests=[];
  navigator.mediaDevices.getUserMedia=async constraints=>{
   window.cameraTestRequests.push(constraints);
   if(denied)throw new DOMException('Denied','NotAllowedError');
   const stream=await original(constraints);window.cameraTestStreams.push(stream);return stream;
  };
 },{denied});
 await page.goto(base+`#/identity/${randomUUID()}/${mode}/${Date.now()+600000}`);
 await page.locator('#phone-language').selectOption(locale);
 await page.locator('#phone-consent').check();await page.locator('[data-phone=start]').click();
 if(denied)await page.locator('#phone-error:not([hidden])').waitFor();else await page.waitForFunction(()=>document.querySelector('[data-phone=capture]')?.disabled===false);
 return page;
}
async function geometry(page,name){
 const g=await page.locator('.cms-camera-toolbar').evaluate(el=>({
  panelWidth:el.closest('.cms-phone-panel').getBoundingClientRect().width,viewport:innerWidth,width:el.clientWidth,overflow:document.documentElement.scrollWidth>innerWidth,
  buttons:[...el.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {action:b.dataset.phone,label:b.getAttribute('aria-label'),x:r.x,y:r.y,w:r.width,h:r.height,icon:b.querySelector('svg')?.getAttribute('aria-hidden')};}),
  labels:[...el.querySelectorAll('.cms-camera-control-label')].map(l=>({h:l.clientHeight,scroll:l.scrollWidth,width:l.clientWidth}))
 }));
 check(name+' no horizontal overflow',!g.overflow);check(name+' uses the available phone width',Math.abs(g.panelWidth-(g.viewport-32))<1);
 check(name+' accessible icon buttons',g.buttons.length===3&&g.buttons.every(b=>b.label&&b.icon==='true'&&b.w>=48&&b.h>=48));
 const [left,shutter,right]=g.buttons;
 check(name+' shutter centered between utilities',left.x+left.w<shutter.x&&shutter.x+shutter.w<right.x&&Math.abs(left.y+left.h/2-shutter.y-shutter.h/2)<1&&Math.abs(right.y-left.y)<1&&shutter.w===72&&shutter.h===72);
 check(name+' labels fit one line',g.labels.every(l=>l.h<=20&&l.scroll<=l.width+1));
}
for(const [width,locale]of [[320,'zh-Hant'],[375,'zh-Hant'],[390,'zh-Hant'],[430,'zh-Hant'],[320,'en'],[390,'zh-Hans']]){
 const page=await openPage(width,locale);await geometry(page,width+' '+locale);
 if(width===390&&locale==='zh-Hant'){
  await page.screenshot({path:output+'/camera-controls-390.png',fullPage:true});
  await page.locator('[data-phone=switch]').click();await page.waitForFunction(()=>document.querySelector('[data-phone=capture]')?.disabled===false);
  check('Switch changes facing and releases previous stream',await page.evaluate(()=>cameraTestRequests.at(-1).video.facingMode.ideal==='environment'&&cameraTestStreams.slice(0,-1).every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  await page.locator('[data-phone=capture]').click();await page.locator('[data-phone=retake]').click();await page.waitForFunction(()=>document.querySelector('[data-phone=capture]')?.disabled===false);
  await page.locator('[data-phone=cancel]').click();
  check('Cancel returns to consent and clears camera/photos',await page.locator('#phone-consent').count()===1&&await page.locator('.cms-photo,video').count()===0&&await page.evaluate(()=>cameraTestStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
 }else if(width===430){
  await page.evaluate(()=>history.replaceState({},'',location.hash.replace(/\d+$/,String(Date.now()-1))));
  await page.waitForFunction(()=>!document.querySelector('[data-phone=capture]'));
  check('Expiry stops the active stream',await page.evaluate(()=>cameraTestStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
 }
 await page.close();
}
const full=await openPage(390,'en','full');
for(const label of ['Capture ID Front','Capture ID Back','Portrait Capture & Verification']){
 check('Full flow stage '+label,await full.locator('.cms-phone-panel h1').innerText()===label);
 await full.waitForFunction(()=>document.querySelector('[data-phone=capture]')?.disabled===false);
 await full.locator('[data-phone=capture]').click();await full.locator('#phone-confirm').check();await full.locator('[data-phone=confirm]').click();
}
await full.locator('#phone-return-code').waitFor();
check('Capture completes all stages and releases media',/^\d{6}$/.test(await full.locator('#phone-return-code').innerText())&&await full.locator('.cms-photo,video').count()===0&&await full.evaluate(()=>cameraTestStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));await full.close();
const fallback=await openPage(320,'en','face',true);await geometry(fallback,'Denied camera');
check('Denied camera disables shutter and keeps photo picker usable',await fallback.locator('[data-phone=capture]').isDisabled()&&await fallback.locator('[data-phone=switch]').isDisabled()&&await fallback.locator('[data-phone=file]').isEnabled());
const pick=fallback.waitForEvent('filechooser');await fallback.locator('[data-phone=file]').click();const chooser=await pick;
check('Photo action opens image picker instead of forcing camera',await chooser.element().getAttribute('capture')===null);
await chooser.setFiles({name:'test-photo.png',mimeType:'image/png',buffer:await fs.readFile('assets/d7a5f.png')});await fallback.locator('#phone-confirm').check();await fallback.locator('[data-phone=confirm]').click();await fallback.locator('#phone-return-code').waitFor();
check('Photo fallback still completes face-only flow',await fallback.locator('.cms-photo').count()===0);await fallback.close();
const pendingCapture=await openPage(390);
await pendingCapture.evaluate(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(...args){setTimeout(()=>original.apply(this,args),300);};});
await pendingCapture.locator('[data-phone=capture]').click();check('Shutter is disabled during capture',await pendingCapture.locator('[data-phone=capture]').isDisabled());await pendingCapture.locator('[data-phone=cancel]').click();await pendingCapture.waitForTimeout(500);
check('Cancel ignores a pending capture result',await pendingCapture.locator('#phone-consent').count()===1&&await pendingCapture.locator('.cms-photo').count()===0);await pendingCapture.close();
const pendingPhoto=await openPage(390,'zh-Hant','face',true);
await pendingPhoto.evaluate(()=>{const original=window.createImageBitmap;window.createImageBitmap=async(...args)=>{await new Promise(r=>setTimeout(r,300));return original(...args);};});
const pendingPick=pendingPhoto.waitForEvent('filechooser');await pendingPhoto.locator('[data-phone=file]').click();await(await pendingPick).setFiles({name:'test-photo.png',mimeType:'image/png',buffer:await fs.readFile('assets/d7a5f.png')});await pendingPhoto.locator('[data-phone=cancel]').click();await pendingPhoto.waitForTimeout(500);
check('Cancel ignores a pending photo decode',await pendingPhoto.locator('#phone-consent').count()===1&&await pendingPhoto.locator('.cms-photo').count()===0);await pendingPhoto.close();
await browser.close();const report={checks,errors};await fs.writeFile(output+'/qa-phone-controls.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=errors.length||checks.some(c=>!c.ok)?1:0;
