import {createMockResult,mockCompletionCode,validMockResult,MOCK_METHODS,MOCK_DOCUMENTS,MOCK_OUTCOMES} from '../kyc-demo.js?v=20261117-kyc-methods';

// Replace the provider boundary after production onboarding; the Demo never calls a provider.
export function createKycMethods({B,F}){
 const T=B.copy,E=B.escape;let active=null;
 const icon=kind=>`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${kind==='iam-smart'?'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="m9 11 2 2 4-4M10 18h4"/>':'<rect x="2" y="4" width="20" height="16" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5 16c0-3 6-3 6 0M14 9h5M14 13h5"/>'}</svg>`;
 const methodName=method=>method==='iam-smart'?T('智方便','智方便','iAM Smart'):T('一般證件認證','一般证件认证','Document verification');
 const scope=()=>B.account?JSON.stringify([B.account.role,B.account.id,B.account.email]):'public:'+B.state.arg;
 const fingerprint=w=>JSON.stringify([w.k?.dirs?.[0]?.name||'',w.k?.dirs?.[0]?.idNo||'',w.k?.dirs?.[0]?.idType||'']);
 const labels={
  idle:()=>T('尚未開始','尚未开始','Not started'),pending:()=>T('等待手機完成','等待手机完成','Waiting for phone'),
  success:()=>T('模擬認證完成','模拟认证完成','Demo verification complete'),failed:()=>T('認證未通過，請重試','认证未通过，请重试','Verification failed — retry'),
  review:()=>T('待人工覆核','待人工复核','Manual review required'),cancelled:()=>T('本次認證已取消','本次认证已取消','Verification cancelled'),
  expired:()=>T('連結已到期','链接已到期','Link expired')};
 function ownerValid(a=active){return !!a&&B.state.page==='apply'&&B.state.wiz===a.owner&&a.owner.identity===a.request&&scope()===a.scope&&a.owner._documentSession===a.session&&(a.owner.kycMethod||'document')===a.request.method&&fingerprint(a.owner)===a.request.fingerprint;}
 function closeOwned(){if(document.querySelector('[data-kyc-session]')?.dataset.kycSession===active?.request.token)B.close();}
 function sync(){
  let changed=false;
  if(active&&!ownerValid()){closeOwned();if(active.request.status==='pending'){active.request.status='cancelled';active.request.confirmed=false;}active=null;changed=true;}
  if(active?.request.status==='pending'&&active.request.expires<=Date.now()){closeOwned();active.request.status='expired';active.request.confirmed=false;active=null;return true;}
  const w=B.state.wiz;
  if(w?.identity?.confirmed&&((w.identity.fingerprint&&fingerprint(w)!==w.identity.fingerprint)||(w.identity.scope&&w.identity.scope!==scope()))){w.identity=null;w.agreed=false;return true;}
  return changed;
 }
 function valid(){sync();const w=B.state.wiz;return !!w?.identity?.confirmed&&(!w.identity.fingerprint||fingerprint(w)===w.identity.fingerprint);}
 function state(){sync();return B.state.wiz?.identity||null;}
 function select(method){
  if(!MOCK_METHODS.includes(method)||B.state.page!=='apply')return;
  const w=B.wizard;if((w.kycMethod||'document')===method)return;
  closeOwned();active=null;w.identity=null;w.agreed=false;w.kycMethod=method;if(method==='iam-smart')w.kycDocumentType='hkid';
  B.render();window.AzureWizard?.templates.changed();
 }
 function cancel(){
  if(!ownerValid())return;
  closeOwned();active.request.status='cancelled';active.request.confirmed=false;active=null;B.render();window.AzureWizard?.templates.changed();
 }
 function documentType(w){return MOCK_DOCUMENTS.includes(w.kycDocumentType)?w.kycDocumentType:'hkid';}
 function body(){
  sync();const w=B.wizard,method=w.kycMethod||'document',s=w.identity?.status||(w.identity?.confirmed?'success':'idle'),r=w.identity;
  const name=w.k?.dirs?.[0]?.name||T('申請人資料將在認證後核對','申请人资料将在认证后核对','Applicant details will be reviewed after verification');
  const options=[['iam-smart',T('使用智方便授權及核實身分。','使用智方便授权及核实身份。','Authorise and verify with iAM Smart.')],['document',T('使用身分證或護照完成認證。','使用身份证或护照完成认证。','Verify with an ID card or passport.')]];
  const checks=[['consent',T('本人同意','本人同意','Consent')],['document',method==='iam-smart'?T('身分資料核實','身份资料核实','Identity data'):T('證件核實','证件核实','Document check')],['liveness',method==='iam-smart'?T('進階認證','进阶认证','Step-up check'):T('真人檢測','真人检测','Liveness')],['face',T('人臉比對','人脸比对','Face match')]];
  const help=s==='pending'?T('請依手機指示完成；同一瀏覽器的結果會自動更新。','请依手机指示完成；同一浏览器的结果会自动更新。','Follow the instructions on your phone. Results update automatically in this browser.'):s==='success'?T('個人認證已完成，可以繼續申請。公司開戶仍須審查。','个人认证已完成，可以继续申请。公司开户仍须审查。','Identity verification is complete. Continue the application; company approval is a separate review.'):s==='review'?T('資料需要人工覆核，完成前暫時無法進入下一步。','资料需要人工复核，完成前暂时无法进入下一步。','The result needs a review before you can continue.'):s==='failed'?T('請重新認證，或選擇另一種認證方式。','请重新认证，或选择另一种认证方式。','Try again or choose another verification method.'):T('重新開始即可取得新的認證連結。','重新开始即可取得新的认证链接。','Start again to get a new verification link.');
  return `<section class="kyc-methods" aria-label="${T('KYC 身分認證','KYC 身份认证','KYC identity verification')}">
   <div class="kyc-method-heading"><div><h3>${T('完成身分認證','完成身份认证','Verify your identity')}</h3><p>${T('選擇一種方式，跟隨手機指示完成認證。','选择一种方式，跟随手机指示完成认证。','Choose a method and follow the instructions on your phone.')}</p></div><span class="badge info">Demo</span></div>
   <div class="kyc-method-choices">${options.map(([key,desc])=>`<button class="kyc-method-choice ${method===key?'selected':''}" data-kyc-method="${key}" aria-pressed="${method===key}">${icon(key)}<span><strong>${methodName(key)}</strong><small>${desc}</small></span><span class="kyc-method-check" aria-hidden="true">${method===key?'✓':''}</span></button>`).join('')}</div>
   ${method==='document'?`<div class="field kyc-document-type"><label for="kyc-document-type">${T('使用證件','使用证件','Document type')}</label><select id="kyc-document-type" class="select" data-kyc-document>${[['hkid',T('香港身分證','香港身份证','Hong Kong ID')],['passport',T('護照','护照','Passport')],['cnid',T('內地居民身分證','内地居民身份证','Mainland China ID')]].map(([key,label])=>`<option value="${key}" ${documentType(w)===key?'selected':''}>${label}</option>`).join('')}</select></div>`:''}
   <div class="kyc-subject"><span>${T('認證對象','认证对象','Verification subject')}</span><strong data-notr>${E(name)}</strong></div>
   <p class="kyc-demo-caption">${T('此為模擬流程，未連接智方便或其他認證服務。','此为模拟流程，未连接智方便或其他认证服务。','Demo only. No connection to iAM Smart or a verification provider.')}${F.uploadedIdentity()?` ${T('已上傳證件可協助預填資料。','已上传证件可协助预填资料。','Uploaded IDs can help prefill your details.')}`:''}</p>
   ${s==='idle'?'':`<div class="kyc-result" data-kyc-status data-status="${s}" role="status" aria-live="polite"><div class="kyc-result-title"><span class="kyc-result-mark ${s==='pending'?'is-waiting':''}" aria-hidden="true">${s==='success'?'✓':s==='pending'?'':s==='review'?'!':'○'}</span><div><strong>${(labels[s]||labels.idle)()}</strong><small>${help}</small></div></div>
    <details class="kyc-flow-details"><summary>${T('查看認證明細','查看认证明细','View verification details')}</summary><ul class="kyc-check-list">${checks.map(([key,label])=>`<li><span>${label}</span><span class="${r?.checks?.[key]?'passed':''}">${r?.checks?.[key]?T('已完成（模擬）','已完成（模拟）','Complete (Demo)'):s==='pending'?T('待手機完成','待手机完成','Waiting'):T('未完成','未完成','Incomplete')}</span></li>`).join('')}</ul>${r?.profile?`<p class="kyc-sample-profile">${T('虛構身分樣本','虚构身份样本','Fictional profile')}：<span data-notr>${E(r.profile.name)} · ${E(r.profile.idNoMasked)}</span></p>`:''}</details>
   </div>`}
   <div class="btn-row kyc-method-actions"><button class="btn ${s==='success'?'':'primary'}" data-kyc-start data-wizard-identity>${s==='pending'?T('繼續認證','继续认证','Continue verification'):s==='success'?T('重新認證','重新认证','Verify again'):['failed','cancelled','expired'].includes(s)?T('重新開始認證','重新开始认证','Retry verification'):T('開始認證','开始认证','Start verification')}</button>${s==='pending'?`<button class="btn" data-kyc-cancel>${T('取消本次認證','取消本次认证','Cancel verification')}</button>`:''}${s==='review'?`<button class="btn" data-kyc-review>${T('模擬人工覆核','模拟人工复核','Demo manual review')}</button>`:''}</div>
  </section>`;
 }
 function showLink(){
  if(!ownerValid()||active.request.status!=='pending')return;
  const r=active.request,url=new URL(B.base);url.hash=`/identity/${r.token}/${r.method}/${r.expires}${r.method==='document'?'?doc='+r.documentType:''}`;
  B.modal(T('手機身分認證（Demo）','手机身份认证（Demo）','Phone verification (Demo)'),`<div class="kyc-link-content" data-kyc-session="${r.token}">
   <div class="kyc-link-summary"><span class="badge info">${methodName(r.method)}</span><p>${T('掃描 QR Code，或在此裝置繼續。','扫描 QR Code，或在此设备继续。','Scan the QR code or continue on this device.')}</p></div>
   <section class="kyc-link-device" aria-label="${T('開啟手機認證','开启手机认证','Open phone verification')}"><div class="identity-qr" id="identity-qr"></div><a class="btn primary" data-kyc-open href="${E(url.href)}" target="_blank" rel="noopener">${T('在此裝置繼續','在此设备继续','Continue on this device')}<span aria-hidden="true">↗</span></a></section>
   <div class="kyc-link-waiting" role="status"><span class="kyc-waiting-ring" aria-hidden="true"></span><div><strong>${T('等待認證結果','等待认证结果','Waiting for verification')}</strong><p>${T('同一瀏覽器會自動更新；其他裝置可使用下方回填。','同一浏览器会自动更新；其他设备可使用下方回填。','This browser updates automatically. Use manual return below for another device.')}</p></div></div>
   <details class="kyc-manual-return" data-kyc-manual><summary>${T('在其他裝置完成？手動回填','在其他设备完成？手动回填','Finished on another device? Enter the result')}</summary><div class="kyc-manual-content">
    <p class="kyc-link-help">${T('展開手機結果頁的回填碼，輸入結果與 6 位數字。','展开手机结果页的回填码，输入结果与 6 位数字。','Open the return code on the phone result page, then enter the result and 6 digits here.')}</p>
    <div class="kyc-return-fields">${r.method==='document'?`<div class="field kyc-return-document"><label for="identity-document">${T('手機使用證件','手机使用证件','Document used on phone')}</label><select id="identity-document" class="select">${[['hkid',T('香港身分證','香港身份证','Hong Kong ID')],['passport',T('護照','护照','Passport')],['cnid',T('內地居民身分證','内地居民身份证','Mainland China ID')]].map(([key,label])=>`<option value="${key}" ${r.documentType===key?'selected':''}>${label}</option>`).join('')}</select></div>`:''}<div class="field"><label for="identity-outcome">${T('手機顯示結果','手机显示结果','Result shown on phone')}</label><select class="select" id="identity-outcome">${MOCK_OUTCOMES.map(status=>`<option value="${status}">${labels[status]()}</option>`).join('')}</select></div><div class="field"><label for="identity-return">${T('Demo 完成碼','Demo 完成码','Demo completion code')}</label><input class="input" id="identity-return" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="${T('6 位數字','6 位数字','6 digits')}" aria-describedby="identity-code-help identity-code-error"></div></div>
    <p class="kyc-link-help" id="identity-code-help">${T('失敗或待覆核的結果仍需重試或人工處理。','失败或待复核的结果仍需重试或人工处理。','Failed or review results still require a retry or human review.')}</p><p class="required-hint" id="identity-code-error" role="alert" hidden></p><button class="btn primary" data-identity-confirm>${T('確認模擬結果','确认模拟结果','Confirm Demo result')}</button>
   </div></details>
   <p class="kyc-link-expiry">${T('連結 10 分鐘內有效；到期後可重新開始。','链接 10 分钟内有效；到期后可重新开始。','The link is valid for 10 minutes. Start again after it expires.')}</p>
  </div>`,`<button class="btn" data-kyc-cancel>${T('取消本次認證','取消本次认证','Cancel verification')}</button><button class="btn" onclick="closeModal()">${T('返回申請表','返回申请表','Back to application')}</button>`);
  document.querySelector('[data-kyc-session]')?.closest('.modal')?.classList.add('kyc-link-dialog');
  B.qr(document.getElementById('identity-qr'),url.href);
 }
 function start(){
  if(B.state.page!=='apply')return;sync();
  if(ownerValid()&&active.request.status==='pending'){showLink();return;}
  const w=B.wizard;w.kycMethod=MOCK_METHODS.includes(w.kycMethod)?w.kycMethod:'document';w._documentSession||=crypto.randomUUID();
  const request={token:crypto.randomUUID(),method:w.kycMethod,documentType:w.kycMethod==='iam-smart'?'hkid':documentType(w),status:'pending',expires:Date.now()+600000,confirmed:false,simulated:true,version:1,scope:scope(),fingerprint:fingerprint(w),checks:{document:false,liveness:false,face:false,consent:false}};
  w.identity=request;w.agreed=false;active={request,owner:w,scope:scope(),session:w._documentSession};B.render();showLink();window.AzureWizard?.templates.changed();
 }
 function adoptSample(w,r){
  // Only explicit Demo success supplies fictional profile values, and only to empty fields.
  w.k||=B.blank('');w.k.dirs||=[];w.k.dirs[0]||={};const d=w.k.dirs[0],p=r.profile;
  for(const [key,value]of Object.entries({name:p.name,first:p.first,last:p.last,idNo:p.idNo,idType:r.documentType==='passport'?'护照':r.documentType==='cnid'?'内地居民身份证':'香港身份证',dob:p.birthDate,nat:r.documentType==='cnid'?'CHN':'HKG'}))if(!d[key])d[key]=value;
  r.fingerprint=fingerprint(w);
 }
 function receive(result){
  sync();if(!ownerValid()||!validMockResult(result,active.request))return false;
  const {owner:w,request:r}=active;
  // Only retain known, fictional fields, never arbitrary provider payloads or photos.
  const safe=createMockResult({token:r.token,method:r.method,status:result.status,documentType:result.documentType});
  closeOwned();Object.assign(r,safe,{confirmed:safe.status==='success',completedAt:new Date().toISOString()});
  if(safe.status==='success')adoptSample(w,r);w.kycDocumentType=safe.documentType;active=null;B.render();window.AzureWizard?.templates.changed();return true;
 }
 function confirmCode(){
  sync();const input=document.getElementById('identity-return'),outcome=document.getElementById('identity-outcome')?.value;
  if(!ownerValid()||active.request.status!=='pending')return;
  const r=active.request;
  if(!input||!MOCK_OUTCOMES.includes(outcome)||input.value.trim()!==mockCompletionCode(r.token,r.method,outcome)){const error=document.getElementById('identity-code-error');if(error){error.hidden=false;error.textContent=T('結果或完成碼不符，請核對手機畫面。','结果或完成码不符，请核对手机画面。','Result or code does not match. Check the phone screen.');}return;}
  receive(createMockResult({token:r.token,method:r.method,status:outcome,documentType:document.getElementById('identity-document')?.value||r.documentType}));
 }
 function review(){
  const w=B.wizard,r=w.identity;if(r?.status!=='review')return;const token=r.token,owner=w,reviewScope=scope(),reviewSession=w._documentSession;
  B.modal(T('人工覆核（Demo）','人工复核（Demo）','Manual review (Demo)'),`<p>${T('這是人工覆核操作示範。你可以模擬覆核通過，或要求申請人重新認證。','这是人工复核操作示范。你可以模拟复核通过，或要求申请人重新认证。','This simulates a human decision. Approve the Demo result or request verification again.')}</p><label class="pick"><input type="checkbox" id="kyc-review-confirm">${T('我已核對本次模擬資料','我已核对本次模拟资料','I have reviewed the fictional data')}</label>`,`<button class="btn" onclick="closeModal()">${T('取消','取消','Cancel')}</button><button class="btn" data-kyc-review-reject>${T('要求重試','要求重试','Request retry')}</button><button class="btn primary" data-kyc-review-approve>${T('模擬覆核通過','模拟复核通过','Approve Demo review')}</button>`);
  const approve=document.querySelector('[data-kyc-review-approve]'),reject=document.querySelector('[data-kyc-review-reject]');
  const current=()=>B.state.page==='apply'&&B.state.wiz===owner&&owner.identity===r&&r.token===token&&r.status==='review'&&r.fingerprint===fingerprint(owner)&&scope()===reviewScope&&owner._documentSession===reviewSession;
  approve.onclick=()=>{if(!current())return B.close();if(!document.getElementById('kyc-review-confirm')?.checked)return B.toast(T('請先確認已核對模擬資料。','请先确认已核对模拟资料。','Confirm that you reviewed the fictional data.'));Object.assign(r,{status:'success',confirmed:true,reviewed:true,checks:{consent:true,document:true,liveness:true,face:true}});adoptSample(owner,r);B.close();B.render();window.AzureWizard?.templates.changed();};
  reject.onclick=()=>{if(!current())return B.close();Object.assign(r,{status:'failed',confirmed:false});B.close();B.render();window.AzureWizard?.templates.changed();};
 }
 function demoFill(){
  const w=B.wizard;closeOwned();active=null;w.kycMethod||='document';const r=createMockResult({token:crypto.randomUUID(),method:w.kycMethod,status:'success',documentType:documentType(w)});
  w.identity={...r,mode:'demo',confirmed:true,scope:scope(),fingerprint:fingerprint(w),completedAt:new Date().toISOString()};adoptSample(w,w.identity);
 }
 function handleClick(e){
  const method=e.target.closest('[data-kyc-method]');if(method)select(method.dataset.kycMethod);
  if(e.target.closest('[data-kyc-subject-edit]'))window.AzureWizard?.progress.go(3,'dirs.0.name','dirs');
  if(e.target.closest('[data-kyc-start]'))start();if(e.target.closest('[data-kyc-cancel]'))cancel();
  if(e.target.closest('[data-identity-confirm]')&&document.querySelector('[data-kyc-session]'))confirmCode();
  if(e.target.closest('[data-kyc-review]'))review();
 }
 document.addEventListener('click',handleClick);
 document.addEventListener('change',e=>{if(e.target.matches('[data-kyc-document]')&&MOCK_DOCUMENTS.includes(e.target.value)){const w=B.wizard;closeOwned();active=null;w.identity=null;w.agreed=false;w.kycDocumentType=e.target.value;B.render();window.AzureWizard?.templates.changed();}});
 const changedIdentity=e=>{if(B.state.page==='apply'&&/^dirs\.0\.(name|idNo|idType)$/.test(e.target.dataset.k||'')&&sync()){F.files.filter(f=>f.identityReviewed).forEach(f=>f.identityReviewed=false);window.AzureWizard?.progress.refresh();window.AzureWizard?.templates.changed();}};
 document.addEventListener('input',changedIdentity);document.addEventListener('change',changedIdentity);
 const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('azure-identity-cms'):null;if(channel)channel.onmessage=e=>receive(e.data);
 window.addEventListener('storage',e=>{if(e.key==='azure-identity-cms-result'&&e.newValue){try{receive(JSON.parse(e.newValue));}catch{}}});
 const timer=setInterval(()=>{if(sync()&&B.state.page==='apply'){B.render();window.AzureWizard?.templates.changed();}},1000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);channel?.close();active=null;});
 return {body,start,select,cancel,receive,state,sync,valid,demoFill,methodName};
}
