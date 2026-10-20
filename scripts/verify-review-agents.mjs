import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {dirname} from 'node:path';

const base=process.env.DEMO_URL||'http://127.0.0.1:3193/';
const outDir='.design-build/review-20261020';
const reportFile=process.env.QA_REPORT||outDir+'/qa-agents.json';
await fs.mkdir(dirname(reportFile),{recursive:true});
const report={url:base,checks:[],failures:[],errors:[],results:{}};
const check=(ok,label)=>{report.checks.push({label,passed:!!ok});if(!ok)report.failures.push(label);};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
const context=await browser.newContext({viewport:{width:1920,height:1080}});
context.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));
const emails={hq:'stephen@ourbank.example',l1:'ops@ganghuitong.example',l2:'chan@chanstudio.example'};
async function login(role){
 const page=await context.newPage();await page.goto(base);
 await page.locator('#email').fill(emails[role]);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();
 await page.locator('[data-method=email]').click();for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();
 await page.waitForFunction(()=>document.querySelector('.cms-confirmed-frame')?.contentWindow?.document.querySelector('.page-title'));
 const frame=page.frames().find(f=>f.url().includes('/confirmed/'));
 await frame.waitForFunction(role=>document.readyState==='complete'&&window.AzureFiles&&window.AzureWizard&&window.AzureReviewAgents?.ready&&AzureBridge.account?.role===role,role);
 await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
 return{page,frame};
}
async function publicLink(url){
 const page=await context.newPage();await page.goto(url);
 await page.waitForFunction(()=>document.querySelector('.cms-confirmed-frame')?.contentWindow?.document.querySelector('.page-title,.locked'));
 const frame=page.frames().find(f=>f.url().includes('/confirmed/'));
 await frame.waitForFunction(()=>document.readyState==='complete'&&window.AzureFiles&&window.AzureWizard&&window.AzureReviewAgents?.ready);
 await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
 return{page,frame};
}
try{
 const {page,frame:f}=await login('hq');
 await f.evaluate(()=>location.hash='#/hq/agents');await f.locator('#review-agent-query').waitFor();
 await f.locator('#review-agent-query').fill('B011');
 await f.waitForFunction(()=>document.getElementById('review-agent-query')?.value==='B011'&&document.querySelectorAll('[data-review-agent]:not([hidden])').length===2&&/\b1\b/.test(document.getElementById('review-agent-result')?.textContent||''));
 check(await f.locator('[data-review-agent]:visible').count()===2,'HQ search keeps B011 and its A002 ancestor');
 check((await f.locator('#review-agent-result').innerText()).includes('1'),'HQ search counts matches without ancestor context');
 await f.locator('#review-agent-query').fill('港匯通');
 check(await f.locator('[data-review-agent]:visible').count()===1,'HQ search matches the displayed Traditional Chinese name');
 await f.evaluate(()=>reviewAgentReset());
 await f.locator('select[aria-label="代理級別"]').selectOption('2');
 const expectedL2=await f.evaluate(()=>AGENTS.filter(a=>a.level===2).length);
 check((await f.locator('#review-agent-result').innerText()).includes(String(expectedL2)),'HQ agent level filter');
 await f.locator('select[aria-label="代理狀態"]').selectOption('enabled');
 const expectedEnabled=await f.evaluate(()=>AGENTS.filter(a=>a.level===2&&a.status==='启用'&&!a.frz).length);
 check((await f.locator('#review-agent-result').innerText()).includes(String(expectedEnabled)),'HQ agent status filter combines with level filter');
 await f.evaluate(()=>reviewRecruitL2('A002'));await f.locator('#review-l2-ratio').fill('35');
 const hqLinksBefore=await f.evaluate(()=>AGENT_LINKS.length);await f.locator('#review-l2-tag').fill('<img src=x>');await f.evaluate(()=>reviewCreateL2Link());
 check(await f.evaluate(()=>AGENT_LINKS.length)===hqLinksBefore,'HQ recruitment rejects HTML in a source tag');
 await f.locator('#review-l2-tag').fill('Demo QA');await f.locator('#review-l2-exp').selectOption('90');await f.locator('#review-l2-ratio').evaluate(el=>el.dispatchEvent(new Event('input',{bubbles:true})));await f.evaluate(()=>reviewCreateL2Link());
 const hqUrl=await f.locator('#review-l2-url').inputValue();
 check(hqUrl.includes('#/join/A002-AG-D')&&hqUrl.includes('/demo/'),'HQ invitation URL contains the selected level 1 owner');
 check(await f.locator('#review-l2-qr canvas').count()>0,'HQ invitation creates an actual QR canvas');
 const {page:joinPage,frame:joinFrame}=await publicLink(hqUrl);
 const restored=await joinFrame.evaluate(()=>{const l=AGENT_LINKS.find(l=>l.code===S.arg);return{level:l?.level,parent:l?.org,ratio:l?.ratio};});
 check(restored.level===2&&restored.parent==='A002'&&restored.ratio===35,'HQ level 2 invitation restores correct owner and ratio in a fresh page');
 check((await joinFrame.locator('.page-title').innerText()).includes('二級'),'HQ invitation opens level 2 registration');
 report.results.hqInvitation=restored;await joinPage.close();
 const {page:invalidPage,frame:invalidFrame}=await publicLink(hqUrl.replace('/demo/','/demo/invalid'));
 check(await invalidFrame.evaluate(()=>S.page)==='invalid','Malformed Demo invitation is rejected in a fresh page');await invalidPage.close();await f.evaluate(()=>closeModal());
 const [invitePrefix,inviteToken]=hqUrl.split('/demo/');const unsafeInvite=JSON.parse(Buffer.from(inviteToken,'base64url').toString());unsafeInvite.tag='tag\u0001with-control';
 const {page:unsafePage,frame:unsafeFrame}=await publicLink(invitePrefix+'/demo/'+Buffer.from(JSON.stringify(unsafeInvite)).toString('base64url'));
 check(await unsafeFrame.evaluate(()=>S.page)==='invalid','Restored invitations reject source tags with control characters');await unsafePage.close();
 const hqScope=await f.evaluate(()=>{const a=AGENT_APPS.find(a=>a.level===2&&a.status==='待审批'),before=AGENTS.length,status=a.status;approveAgent(a.id);return{same:AGENTS.length===before&&a.status===status};});
 check(hqScope.same,'HQ cannot approve a level 2 application');

 await f.evaluate(()=>riskPick('dr'));await f.locator('#review-risk-query').fill('AZ100006');
 check(await f.locator('.review-risk-option').count()===1,'Document request customer search narrows the list');
 await f.locator('.review-risk-option input').check();await f.locator('#review-risk-next').click();
 check((await f.locator('.modal-head h3').innerText()).includes('藍鯨'),'Document request continues with the selected customer');await f.evaluate(()=>closeModal());
 await f.evaluate(()=>riskPick('dr'));await f.evaluate(()=>reviewRiskType('a'));await f.locator('#review-risk-level').selectOption('2');await f.locator('#review-risk-query').fill('B007');
 check(await f.locator('.review-risk-option').count()===1,'Document request agent search combines with level filter');
 await f.locator('.review-risk-option input').check();await f.locator('#review-risk-next').click();
 check((await f.locator('.modal-head h3').innerText()).includes('陳氏'),'Document request continues with the selected agent');await f.evaluate(()=>closeModal());
 await f.evaluate(()=>{CUSTOMERS.push({id:'QA-DRAFT-ONLY',name:'Demo QA draft',profileDraft:true});riskPick('dr');});
 await f.locator('#review-risk-query').fill('QA-DRAFT-ONLY');
 check(await f.locator('.review-risk-option').count()===0,'Unopened profile drafts are excluded from the document request picker');await f.evaluate(()=>{closeModal();CUSTOMERS.splice(CUSTOMERS.findIndex(c=>c.id==='QA-DRAFT-ONLY'),1);});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900});await f.evaluate(()=>location.hash='#/hq/agents');await f.locator('#review-agent-query').waitFor();
  check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Agent directory has no page overflow at '+width+'px');
  await f.evaluate(()=>riskPick('dr'));
  check(await f.locator('.modal').evaluate(el=>el.getBoundingClientRect().right<=innerWidth&&el.getBoundingClientRect().left>=0),'Target picker stays inside '+width+'px viewport');await f.evaluate(()=>closeModal());
 }
 await page.close();

 const {page:l1Page,frame:l1}=await login('l1');
 const l1Buttons=l1.locator('.header .public-links button');check(await l1Buttons.count()===2,'Level 1 keeps both public entries');
 check((await l1Buttons.last().innerText()).includes('二級'),'Level 1 header identifies level 2 registration');
 const popupPromise=l1Page.waitForEvent('popup');await l1Buttons.last().click();const popup=await popupPromise;await popup.waitForLoadState();
 const invitation=await l1.evaluate(url=>{const code=new URL(url).hash.split('/')[2];const l=AGENT_LINKS.find(l=>l.code===code);return{level:l?.level,parent:l?.org,own:ME.l1.org};},popup.url());
 check(invitation.level===2&&invitation.parent===invitation.own,'Level 1 header opens a level 2 invitation owned by its own organization');await popup.close();
 await l1.evaluate(()=>location.hash='#/l1/recruit');await l1.waitForFunction(()=>S.page==='recruit');await l1.evaluate(()=>setUI('rt','links'));
 await l1.locator('#agRatio').fill('0');const l1LinksBefore=await l1.evaluate(()=>AGENT_LINKS.length);
 await l1.locator('#agTag').fill('<b>unsafe</b>');await l1.evaluate(()=>newAgentLink(2));
 check(await l1.evaluate(()=>AGENT_LINKS.length)===l1LinksBefore,'Level 1 recruitment rejects HTML in a source tag');
 await l1.locator('#agTag').fill('Demo QA');await l1.evaluate(()=>newAgentLink(2));
 const generated=await l1.evaluate(()=>{const l=AGENT_LINKS[0];return{code:l.code,url:publicUrl('join',l.code),level:l.level,parent:l.org,ratio:l.ratio,proxy:agent('B007').proxyApply};});
 const {page:l1JoinPage,frame:l1Join}=await publicLink(generated.url);
 const restoredL1=await l1Join.evaluate(()=>{const l=AGENT_LINKS.find(l=>l.code===S.arg);return{level:l?.level,parent:l?.org,ratio:l?.ratio};});
 check(restoredL1.level===2&&restoredL1.parent===generated.parent&&restoredL1.ratio===0,'Level 1 generated invitation opens in a fresh page and preserves a valid zero ratio');
 check(generated.proxy===false,'Recruitment does not enable level 2 proxy applications');await l1JoinPage.close();
 await l1.evaluate(code=>{AGENT_APPS.unshift({id:'QA-AGENT-ZERO',level:2,via:code,parent:ME.l1.org,name:'Demo QA Agent',type:'个人 / 工作室',contact:'Demo contact',email:'qa-agent@example.com',phone:'+852 0000 0000',br:'—',region:'中国香港',channel:'Demo',est:'1–5',bank:'—',status:'待审批',created:TODAY,docs:[]});agentAppDetail('QA-AGENT-ZERO');},generated.code);
 check(await l1.locator('#apRatio').inputValue()==='0','Approval form preserves a recruited zero commission ratio');
 const approvalCount=await l1.evaluate(()=>AGENTS.length);
 for(const [label,value]of [['over 100','101'],['empty','']]){await l1.locator('#apRatio').fill(value);await l1.evaluate(()=>approveAgent('QA-AGENT-ZERO'));check(await l1.evaluate(before=>AGENTS.length===before&&AGENT_APPS.find(a=>a.id==='QA-AGENT-ZERO').status==='待审批',approvalCount),'Approval rejects '+label+' ratio');}
 await l1.locator('#apRatio').evaluate(el=>{el.value='not-a-number';});await l1.evaluate(()=>approveAgent('QA-AGENT-ZERO'));
 check(await l1.evaluate(before=>AGENTS.length===before&&AGENT_APPS.find(a=>a.id==='QA-AGENT-ZERO').status==='待审批',approvalCount),'Approval rejects a non-finite or nonnumeric ratio');
 await l1.locator('#apRatio').fill('0');await l1.evaluate(()=>approveAgent('QA-AGENT-ZERO'));
 const zeroApproved=await l1.evaluate(()=>{const a=AGENT_APPS.find(a=>a.id==='QA-AGENT-ZERO');return{status:a.status,parent:agent(a.agentId).parent,ratios:Object.values(L2RATIO[a.agentId]||{}),proxy:agent(a.agentId).proxyApply};});
 check(zeroApproved.status==='已批准'&&zeroApproved.parent===generated.parent&&zeroApproved.ratios.length>0&&zeroApproved.ratios.every(r=>r===0)&&zeroApproved.proxy===false,'Approved level 2 agent retains zero for every product and proxy stays off');
 const wrongScope=await l1.evaluate(()=>{AGENT_APPS.push({id:'QA-OTHER-OWNER',level:2,parent:'A002',status:'待审批'});const before=AGENTS.length;approveAgent('QA-OTHER-OWNER');return AGENTS.length===before&&AGENT_APPS.find(a=>a.id==='QA-OTHER-OWNER').status==='待审批';});
 check(wrongScope,'Level 1 cannot approve another level 1 agent’s application');
 await l1.evaluate(()=>openMenu());check(await l1.locator('.mobile-menu-body .public-links button').count()===2,'Level 1 mobile menu retains the scoped recruitment entry');await l1Page.close();
 report.results.l1Invitation={...restoredL1};

 const {page:l2Page,frame:l2}=await login('l2');
 await l2.waitForFunction(()=>document.querySelectorAll('.header .public-links button').length===1);
 check(await l2.locator('.header .public-links button').count()===1,'Level 2 header hides agent recruitment');
 check(await l2.evaluate(()=>agent(ME.l2.org).proxyApply)===false,'Level 2 original proxy permission remains off');
 await l2.evaluate(()=>openMenu());check(await l2.locator('.mobile-menu-body .public-links button').count()===1,'Level 2 mobile menu hides agent recruitment');await l2Page.close();
}catch(error){report.errors.push(error.stack||error.message);}
finally{await browser.close();await fs.writeFile(reportFile,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));process.exitCode=report.failures.length||report.errors.length?1:0;
