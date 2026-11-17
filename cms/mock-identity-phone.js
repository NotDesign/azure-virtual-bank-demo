// Local-only interaction prototype. This never opens a camera or calls an identity service.
import {mockCompletionCode,createMockResult,readMockIdentityLink} from './kyc-demo.js?v=20261117-kyc-methods';
const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy={
 language:['語言','语言','Language'],demo:['模擬認證 · Demo','模拟认证 · Demo','Simulated verification · Demo'],
 iam:['智方便認證','智方便认证','iAM Smart verification'],document:['一般證件認證','一般证件认证','Document verification'],
 intro:['確認認證用途','确认认证用途','Confirm the purpose'],purpose:['你正在為 Azure 示範企業開戶申請進行身分認證。','你正在为 Azure 示范企业开户申请进行身份认证。','You are verifying an identity for an Azure demo business account application.'],
 synthetic:['全程使用虛構資料，沒有連接政府或認證服務，也不會開啟相機、讀取晶片或上傳證件。','全程使用虚构资料，没有连接政府或认证服务，也不会开启相机、读取芯片或上传证件。','This flow uses fictional data. It does not connect to government or verification services, open a camera, read a chip or upload documents.'],
 consentPurpose:['我了解這是企業開戶的模擬身分認證。','我了解这是企业开户的模拟身份认证。','I understand this is a simulated identity check for business account opening.'],
 company:['申請公司','申请公司','Company'],person:['示範認證對象','示范认证对象','Fictional applicant'],role:['董事／授權代表（示範）','董事／授权代表（示范）','Director / authorised representative (Demo)'],
 next:['下一步','下一步','Next'],begin:['開始模擬認證','开始模拟认证','Start simulated verification'],back:['上一步','上一步','Back'],cancel:['取消本次認證','取消本次认证','Cancel this verification'],close:['離開認證頁','离开认证页','Leave verification'],
 settings:['Demo 情境設定','Demo 情境设置','Demo scenario'],outcome:['模擬結果','模拟结果','Simulated outcome'],successOption:['成功','成功','Success'],failedOption:['失敗／需重試','失败／需重试','Failed / retry needed'],reviewOption:['待人工覆核','待人工复核','Manual review'],
 settingsHint:['這是示範控制，不代表任何正式認證結果。','这是示范控制，不代表任何正式认证结果。','This is a demo control and does not represent a production verification result.'],
 authorise:['授權提供示範資料','授权提供示范资料','Authorise fictional data'],authoriseText:['以下畫面示範使用智方便授權個人資料；目前仍在 Azure Demo 內。','以下画面示范使用智方便授权个人资料；目前仍在 Azure Demo 内。','This screen illustrates iAM Smart data authorisation. You are still inside the Azure demo.'],
 name:['中文姓名','中文姓名','Chinese name'],nameEn:['英文姓名','英文姓名','English name'],idNo:['身分證號碼','身份证号码','Identity number'],dob:['出生日期','出生日期','Date of birth'],
 consentData:['同意在此 Demo 使用上述虛構資料。','同意在此 Demo 使用上述虚构资料。','Allow this demo to use the fictional data above.'],grant:['授權並繼續（模擬）','授权并继续（模拟）','Authorise and continue (Demo)'],
 stepup:['進階身分認證示範','进阶身份认证示范','Step-up authentication demo'],stepupText:['示範智方便+的人像及身分證資料核對。正式服務會由智方便 App 完成，並須取得相應接入授權。','示范智方便+的人像及身份证资料核对。正式服务会由智方便 App 完成，并须取得相应接入授权。','This illustrates iAM Smart+ face and identity-data checks. Production checks occur in the iAM Smart app and require approved access.'],
 nfc:['身分證晶片資料核對（模擬）','身份证芯片资料核对（模拟）','ID chip-data check (Demo)'],live:['真人檢測（模擬）','真人检测（模拟）','Liveness check (Demo)'],face:['人臉比對（模擬）','人脸比对（模拟）','Face matching (Demo)'],stepupAction:['模擬完成進階認證','模拟完成进阶认证','Simulate step-up check'],
 docType:['選擇示範證件','选择示范证件','Choose a sample document'],docTypeText:['選擇類型後，逐頁核對示範證件。此處不需要拍攝或上傳真實證件。','选择类型后，逐页核对示范证件。此处不需要拍摄或上传真实证件。','Choose a type and review the sample document pages. No real ID capture or upload is needed.'],
 hkid:['香港身分證','香港身份证','Hong Kong identity card'],passport:['護照','护照','Passport'],cnid:['內地居民身分證','内地居民身份证','Mainland resident identity card'],
 front:['核對證件正面','核对证件正面','Review document front'],passportFront:['核對護照資料頁','核对护照资料页','Review passport data page'],backTitle:['核對證件背面','核对证件背面','Review document back'],sample:['虛構示範文件 · 不可作身分證明','虚构示范文件 · 不可作身份证明','FICTIONAL SAMPLE · NOT VALID ID'],
 sampleNote:['這張示意卡只展示文件核對步驟，不仿製政府證件。','这张示意卡只展示文件核对步骤，不仿制政府证件。','This illustration demonstrates document review and does not reproduce a government identity document.'],
 confirmSample:['確認此示範頁並繼續','确认此示范页并继续','Confirm sample page'],backSample:['示範證件背面','示范证件背面','Sample reverse side'],expiry:['示範到期日','示范到期日','Sample expiry'],
 livenessTitle:['真人檢測示範','真人检测示范','Liveness demonstration'],livenessText:['正式流程會要求本人按指示完成真人檢測。此 Demo 使用示意人像，不會錄影或判斷真人。','正式流程会要求本人按指示完成真人检测。此 Demo 使用示意人像，不会录像或判断真人。','A production flow would ask the applicant to follow liveness instructions. This demo uses an illustration and does not record video or detect a real person.'],
 livenessAction:['模擬完成人像動作','模拟完成人像动作','Simulate liveness action'],matchTitle:['人臉比對示範','人脸比对示范','Face-matching demonstration'],matchText:['示範將證件人像與真人檢測結果進行比對，正式結果須由認證服務回傳。','示范将证件人像与真人检测结果进行比对，正式结果须由认证服务回传。','This illustrates comparing the ID portrait with the liveness result. A production result must come from the verification service.'],matchAction:['取得模擬認證結果','取得模拟认证结果','Get simulated result'],
 processing:['正在處理模擬認證…','正在处理模拟认证…','Processing simulated verification…'],successTitle:['認證完成（Demo）','认证完成（Demo）','Verification complete (Demo)'],failedTitle:['認證未通過（Demo）','认证未通过（Demo）','Verification failed (Demo)'],reviewTitle:['待人工覆核（Demo）','待人工复核（Demo）','Manual review pending (Demo)'],cancelledTitle:['本次認證已取消','本次认证已取消','Verification cancelled'],
 successText:['模擬認證已完成。請回原申請頁查看同步結果，或輸入下方回填碼。公司審查及開戶核准仍是不同階段。','模拟认证已完成。请回原申请页查看同步结果，或输入下方回填码。公司审查及开户核准仍是不同阶段。','The simulated check is complete. Return to the application to check sync or enter the result code below. Business review and account approval remain separate stages.'],
 failedText:['此情境模擬認證失敗。請返回原申請頁重新產生認證連結後再試。','此情境模拟认证失败。请返回原申请页重新生成认证链接后再试。','This scenario simulates a failed check. Return to the application to generate a new verification link and retry.'],
 reviewText:['此情境需要人工核對，尚未通過認證。請返回原申請頁查看待處理狀態。','此情境需要人工核对，尚未通过认证。请返回原申请页查看待处理状态。','This scenario needs manual review and is not verified. Return to the application to view the pending status.'],
 cancelledText:['已停止模擬並清除本頁暫存資料。這次認證不會標示為成功。','已停止模拟并清除此页暂存资料。这次认证不会标示为成功。','The simulation stopped and temporary page data was cleared. This attempt is not marked successful.'],
 resultCode:['跨裝置回填碼（Demo）','跨设备回填码（Demo）','Cross-device result code (Demo)'],codeHint:['同一瀏覽器會嘗試自動同步。若在另一部裝置操作，請回原申請頁輸入此碼；此碼僅供 Demo 使用。','同一浏览器会尝试自动同步。若在另一部设备操作，请回原申请页输入此码；此码仅供 Demo 使用。','Sync is attempted in the same browser. On another device, enter this code on the original application. This code is for the demo only.'],
 restart:['重新體驗','重新体验','Try the demo again'],replay:['此連結已產生一筆結果。再次體驗只供預覽；要更新申請狀態，請回原頁重新產生連結。','此链接已生成一笔结果。再次体验仅供预览；要更新申请状态，请回原页重新生成链接。','This link already generated a result. Replaying is preview-only; generate a new link from the application to update its status.'],
 expiredTitle:['認證連結已過期或無效','认证链接已过期或无效','Link expired or invalid'],expiredText:['請返回原申請頁重新產生連結。本頁的模擬進度不會當作成功認證。','请返回原申请页重新生成链接。本页的模拟进度不会作为成功认证。','Return to the application to generate a new link. Progress on this page does not count as successful verification.'],remaining:['連結剩餘時間','链接剩余时间','Link time remaining'],
 needPurpose:['請先確認認證用途。','请先确认认证用途。','Confirm the verification purpose first.'],needData:['請先同意使用示範資料。','请先同意使用示范资料。','Authorise the fictional data first.'],complete:['已完成','已完成','Complete'],pending:['待處理','待处理','Pending'],notPassed:['未通過','未通过','Not passed'],documentCheck:['證件核實（模擬）','证件核实（模拟）','Document check (Demo)'],footer:['所有結果僅供介面展示','所有结果仅供界面展示','All results are for interface demonstration only']
};
const icon=kind=>`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${kind==='document'?'<rect x="8" y="13" width="48" height="38" rx="6"/><circle cx="22" cy="28" r="6"/><path d="M13 43c1-9 17-9 18 0M37 25h11M37 33h11M37 41h7"/>':kind==='chip'?'<rect x="18" y="18" width="28" height="28" rx="5"/><path d="M25 8v10M39 8v10M25 46v10M39 46v10M8 25h10M8 39h10M46 25h10M46 39h10"/>':'<circle cx="32" cy="25" r="12"/><path d="M12 57c1-23 39-23 40 0M8 17V8h9M47 8h9v9M56 47v9h-9M17 56H8v-9"/>'}</svg>`;
function loadStyles(){if(document.querySelector('[data-mock-identity-styles]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./mock-identity-phone.css?v=20261117-kyc-methods',import.meta.url).href;link.dataset.mockIdentityStyles='';document.head.append(link);}
export function mountMockIdentityPhone({root,locale='zh-Hant',onExit,onLocale}){
 loadStyles();const abort=new AbortController(),timers=new Set();let stage='intro',documentType=readMockIdentityLink().documentType||'hkid',scenario='success',purpose=false,dataConsent=false,busy=false,destroyed=false,generation=0,result=null,sent=false,errorKey='',lastStage='';
 const T=key=>{const row=copy[key];return row?.[locale==='en'?2:locale==='zh-Hans'?1:0]||key;},q=selector=>root.querySelector(selector),session=()=>readMockIdentityLink();
 const button=(key,action,primary=false,disabled=false)=>`<button type="button" class="cms-button ${primary?'cms-button-primary':''}" data-mock-phone="${action}" ${disabled?'disabled':''}>${E(T(key))}</button>`;
 const sequence=()=>session().method==='iam-smart'?['intro','authorize','stepup']:['intro','document','front',...(documentType==='passport'?[]:['back']),'liveness','match'];
 function notify(value){if(sent)return;sent=true;if(typeof BroadcastChannel!=='undefined'){try{const channel=new BroadcastChannel('azure-identity-cms');channel.postMessage(value);channel.close();}catch{}}try{localStorage.setItem('azure-identity-cms-result',JSON.stringify(value));localStorage.removeItem('azure-identity-cms-result');}catch{}}
 function stop(){generation++;busy=false;for(const timer of timers)clearTimeout(timer);timers.clear();}
 function outcome(status){stop();const current=session();if(!current.valid){stage='expired';render();return;}result=createMockResult({token:current.token,method:current.method,status,documentType});notify(result);stage='result';purpose=false;dataConsent=false;render();}
 const checkRows=()=>[['documentCheck','document'],['live','liveness'],['face','face']].map(([label,key])=>`<li><span>${E(T(label))}</span><strong class="${result?.checks[key]?'ok':''}">${E(T(result?.checks[key]?'complete':result?.status==='review'?'pending':'notPassed'))}</strong></li>`).join('');
 function samplePage(reverse=false){return `<div class="mock-sample-document"><div class="mock-sample-stamp">${E(T('sample'))}</div><div class="mock-document-name">${icon('document')}<strong>${E(T(documentType))}</strong></div>${reverse?`<p>${E(T('backSample'))}</p><dl><div><dt>${E(T('expiry'))}</dt><dd>2030-12-31</dd></div><div><dt>Demo ID</dt><dd>DEMO-000001</dd></div></dl>`:`<dl><div><dt>${E(T('name'))}</dt><dd>陳示範</dd></div><div><dt>${E(T('nameEn'))}</dt><dd>DEMO CHAN</dd></div><div><dt>${E(T('idNo'))}</dt><dd>${documentType==='passport'?'P•••••00':documentType==='cnid'?'••••••••••••••0000':'A•••••(0)'}</dd></div><div><dt>${E(T('dob'))}</dt><dd>1990-01-01</dd></div></dl>`}</div><p class="mock-muted">${E(T('sampleNote'))}</p>`;}
 function settings(){return `<details class="mock-scenario-panel"><summary>${E(T('settings'))}</summary><label for="mock-scenario">${E(T('outcome'))}</label><select class="cms-select" id="mock-scenario" data-mock-scenario ${busy?'disabled':''}>${['success','failed','review'].map(value=>`<option value="${value}" ${scenario===value?'selected':''}>${E(T(value+'Option'))}</option>`).join('')}</select><p>${E(T('settingsHint'))}</p></details>`;}
 function render(){
  if(destroyed)return;const current=session(),method=current.method||'document';if(!current.valid)stage='expired';let body='',actions='';
  if(stage==='expired'){body=`<div class="mock-illustration is-muted">${icon('document')}</div><h1>${E(T('expiredTitle'))}</h1><p>${E(T('expiredText'))}</p>`;actions=button('close','exit');}
  else if(stage==='intro'){
   body=`<h1>${E(T('intro'))}</h1><p>${E(T('purpose'))}</p><dl class="mock-request-summary"><div><dt>${E(T('company'))}</dt><dd>AZURE DEMO LIMITED</dd></div><div><dt>${E(T('person'))}</dt><dd>陳示範 · ${E(T('role'))}</dd></div></dl><label class="mock-consent"><input type="checkbox" id="mock-purpose-consent" ${purpose?'checked':''}>${E(T('consentPurpose'))}</label>${settings()}`;actions=button('begin','next',true,!purpose);
  }else if(stage==='authorize'){
   body=`<h1>${E(T('authorise'))}</h1><p>${E(T('authoriseText'))}</p><dl class="mock-authorised-data"><div><dt>${E(T('name'))}</dt><dd>陳示範</dd></div><div><dt>${E(T('nameEn'))}</dt><dd>DEMO CHAN</dd></div><div><dt>${E(T('idNo'))}</dt><dd>A•••••(0)</dd></div><div><dt>${E(T('dob'))}</dt><dd>1990-01-01</dd></div></dl><label class="mock-consent"><input type="checkbox" id="mock-data-consent" ${dataConsent?'checked':''}>${E(T('consentData'))}</label>`;actions=button('back','back')+button('grant','next',true,!dataConsent);
  }else if(stage==='stepup'){
   body=`<h1>${E(T('stepup'))}</h1><p>${E(T('stepupText'))}</p><div class="mock-illustration">${icon('chip')}</div><ol class="mock-check-stages"><li>${E(T('nfc'))}</li><li>${E(T('live'))}</li><li>${E(T('face'))}</li></ol>${settings()}`;actions=button('back','back')+button('stepupAction','next',true,busy);
  }else if(stage==='document'){
   body=`<h1>${E(T('docType'))}</h1><p>${E(T('docTypeText'))}</p><label for="mock-document">${E(T('docType'))}</label><select class="cms-select" id="mock-document" data-mock-document>${['hkid','passport','cnid'].map(value=>`<option value="${value}" ${documentType===value?'selected':''}>${E(T(value))}</option>`).join('')}</select>${settings()}`;actions=button('back','back')+button('next','next',true);
  }else if(stage==='front'||stage==='back'){
   body=`<h1>${E(T(stage==='back'?'backTitle':documentType==='passport'?'passportFront':'front'))}</h1>${samplePage(stage==='back')}`;actions=button('back','back')+button('confirmSample','next',true);
  }else if(stage==='liveness'||stage==='match'){
   body=`<h1>${E(T(stage==='liveness'?'livenessTitle':'matchTitle'))}</h1><p>${E(T(stage==='liveness'?'livenessText':'matchText'))}</p><div class="mock-illustration ${stage==='liveness'?'is-face':''}">${icon('face')}</div>${stage==='match'?settings():''}`;actions=button('back','back')+button(stage==='liveness'?'livenessAction':'matchAction','next',true,busy);
  }else if(stage==='result'){
   const status=result?.status||'cancelled',title=status==='success'?'successTitle':status==='failed'?'failedTitle':status==='review'?'reviewTitle':'cancelledTitle';
   body=`<div class="mock-result-mark ${status}" aria-hidden="true">${status==='success'?'✓':status==='failed'?'!':status==='review'?'…':'×'}</div><h1>${E(T(title))}</h1><p>${E(T(status+'Text'))}</p>${status==='cancelled'?'':`<ul class="mock-result-checks">${checkRows()}</ul>`}<div class="mock-result-code"><h2>${E(T('resultCode'))}</h2><div class="cms-code" id="mock-return-code">${E(mockCompletionCode(current.token,current.method,status))}</div><p>${E(T('codeHint'))}</p></div>`;
   actions=button('restart','restart')+button('close','exit',true);
  }
  const steps=sequence(),position=stage==='result'?steps.length:Math.max(0,steps.indexOf(stage));
  root.className='cms cms-phone mock-identity-phone';root.hidden=false;root.dataset.mockStage=stage;root.dataset.mockMethod=method;
  try{root.dataset.theme=localStorage.getItem('azure-theme')==='dark'?'dark':'light';}catch{root.dataset.theme='light';}
  root.innerHTML=`<main class="cms-phone-shell"><header class="cms-phone-header"><img src="assets/d7a5f.png" width="174" height="58" alt="Azure ²"><select class="cms-select" id="mock-language" aria-label="${E(T('language'))}"><option value="zh-Hant" ${locale==='zh-Hant'?'selected':''}>繁體中文</option><option value="zh-Hans" ${locale==='zh-Hans'?'selected':''}>简体中文</option><option value="en" ${locale==='en'?'selected':''}>English</option></select></header><div class="mock-method-heading"><strong>${E(T(method==='iam-smart'?'iam':'document'))}</strong><span class="mock-demo-badge">Demo</span></div><p class="cms-note mock-local-notice">${E(T('synthetic'))}</p>${sent&&stage!=='result'&&stage!=='expired'?`<p class="cms-note warning">${E(T('replay'))}</p>`:''}${current.valid&&stage!=='expired'?`<div class="mock-progress" aria-label="${E(T('demo'))}"><span>${E(T('demo'))}</span><span>${position+1}/${steps.length+1}</span><progress value="${position}" max="${steps.length}"></progress></div>`:''}<section class="cms-phone-panel" aria-busy="${busy}">${body}${busy?`<div class="mock-processing" role="status"><span aria-hidden="true"></span>${E(T('processing'))}</div>`:''}${errorKey?`<p class="cms-note error" role="alert">${E(T(errorKey))}</p>`:''}<div class="mock-phone-actions">${actions}</div>${current.valid&&!['result','expired'].includes(stage)?button('cancel','cancel'):''}</section>${current.valid&&stage!=='expired'?`<p class="mock-expiry">${E(T('remaining'))} <span data-mock-countdown></span></p>`:''}<footer class="cms-footer">© 2026 Azure ² · ${E(T('footer'))}</footer></main>`;
  updateCountdown();if(stage!==lastStage){lastStage=stage;root.scrollTo({top:0,behavior:'instant'});const heading=q('.cms-phone-panel h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
 }
 function updateCountdown(){const el=q('[data-mock-countdown]');if(!el)return;const seconds=Math.max(0,Math.ceil((session().expiry-Date.now())/1000));el.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
 async function finish(){if(busy)return;const current=session();if(!current.valid){stage='expired';render();return;}busy=true;errorKey='';const request=++generation;render();await new Promise(resolve=>{const timer=setTimeout(()=>{timers.delete(timer);resolve();},700);timers.add(timer);});if(destroyed||request!==generation)return;if(!session().valid){stop();stage='expired';render();return;}outcome(scenario);}
 root.addEventListener('click',event=>{
  const control=event.target.closest('[data-mock-phone]');if(!control)return;const action=control.dataset.mockPhone;
  if(action==='exit'){stop();onExit?.();return;}
  if(!session().valid){stop();stage='expired';render();return;}
  if(action==='cancel'){purpose=false;dataConsent=false;outcome('cancelled');return;}
  if(action==='restart'){stop();stage='intro';purpose=false;dataConsent=false;result=null;errorKey='';render();return;}
  if(busy)return;errorKey='';const steps=sequence(),index=steps.indexOf(stage);
  if(action==='back'){stage=steps[Math.max(0,index-1)];render();return;}
  if(action==='next'){
   if(stage==='intro'&&!purpose){errorKey='needPurpose';render();return;}
   if(stage==='authorize'&&!dataConsent){errorKey='needData';render();return;}
   if(stage==='stepup'||stage==='match'){void finish();return;}
   stage=steps[index+1]||stage;render();
  }
 },{signal:abort.signal});
 root.addEventListener('change',event=>{
  if(event.target.id==='mock-language'){locale=event.target.value;render();onLocale?.(locale);}
  if(event.target.id==='mock-purpose-consent'){purpose=event.target.checked;const next=q('[data-mock-phone=next]');if(next)next.disabled=!purpose;}
  if(event.target.id==='mock-data-consent'){dataConsent=event.target.checked;const next=q('[data-mock-phone=next]');if(next)next.disabled=!dataConsent;}
  if(event.target.matches('[data-mock-scenario]'))scenario=['success','failed','review'].includes(event.target.value)?event.target.value:'success';
  if(event.target.matches('[data-mock-document]')){documentType=['hkid','passport','cnid'].includes(event.target.value)?event.target.value:'hkid';}
 },{signal:abort.signal});
 const interval=setInterval(()=>{if(destroyed)return;if(!session().valid&&stage!=='expired'){stop();purpose=false;dataConsent=false;result=null;stage='expired';render();}else updateCountdown();},1000);
 window.addEventListener('pagehide',()=>{stop();purpose=false;dataConsent=false;result=null;},{signal:abort.signal});render();
 return {setLocale(value){locale=value;render();},destroy(){destroyed=true;stop();clearInterval(interval);abort.abort();purpose=false;dataConsent=false;result=null;root.hidden=true;root.innerHTML='';delete root.dataset.mockStage;delete root.dataset.mockMethod;}};
}
