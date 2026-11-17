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
  const name=w.k?.dirs?.[0]?.name||T('尚未填寫的申請人','尚未填写的申请人','Applicant details not entered yet');
  const options=[['iam-smart',T('香港身分證持有人；展示授權、資料帶入及進階認證。','香港身份证持有人；展示授权、资料带入及进阶认证。','For HKID holders: consent, shared details and step-up authentication.')],['document',T('展示香港身分證、護照或內地身分證的核實流程。','展示香港身份证、护照或内地身份证的核实流程。','Explore verification using HKID, a passport or a mainland ID.')]];
  const checks=[['consent',T('本人同意','本人同意','Consent')],['document',method==='iam-smart'?T('身分資料核實','身份资料核实','Identity data'):T('證件核實','证件核实','Document check')],['liveness',method==='iam-smart'?T('進階認證','进阶认证','Step-up check'):T('真人檢測','真人检测','Liveness')],['face',T('人臉比對','人脸比对','Face match')]];
  return `<section class="kyc-methods" aria-label="${T('KYC 身分認證','KYC 身份认证','KYC identity verification')}">
   <div class="kyc-method-heading"><div><h3>${T('選擇身分認證方式','选择身份认证方式','Choose a verification method')}</h3><p>${T('為本次公司開戶申請完成個人認證。','为本次公司开户申请完成个人认证。','Verify an individual for this business account application.')}</p></div><span class="badge info">Demo</span></div>
   <div class="kyc-method-choices">${options.map(([key,desc])=>`<button class="kyc-method-choice ${method===key?'selected':''}" data-kyc-method="${key}" aria-pressed="${method===key}">${icon(key)}<span><strong>${methodName(key)}</strong><small>${desc}</small></span><span class="kyc-method-check" aria-hidden="true">${method===key?'✓':''}</span></button>`).join('')}</div>
   <div class="kyc-subject"><span>${T('認證對象','认证对象','Verification subject')}</span><strong data-notr>${E(name)}</strong>${!w.k?.dirs?.[0]?.name?`<button class="btn sm" data-kyc-subject-edit>${T('先填寫認證對象','先填写认证对象','Enter applicant details')}</button>`:''}<small>${T('董事／申請代表；請在資料核對步驟確認姓名及證件。','董事／申请代表；请在资料核对步骤确认姓名及证件。','Director / applicant representative; check the name and ID in the review step.')}</small></div>
   ${method==='document'?`<div class="field kyc-document-type"><label for="kyc-document-type">${T('預計使用證件','预计使用证件','Document type')}</label><select id="kyc-document-type" class="select" data-kyc-document>${[['hkid',T('香港身分證','香港身份证','Hong Kong ID')],['passport',T('護照','护照','Passport')],['cnid',T('內地居民身分證','内地居民身份证','Mainland China ID')]].map(([key,label])=>`<option value="${key}" ${documentType(w)===key?'selected':''}>${label}</option>`).join('')}</select></div>`:''}
   <div class="note kyc-demo-notice"><div>${T('全程使用虛構資料模擬，不連接智方便或認證服務商，也不執行真實生物辨識。','全程使用虚构资料模拟，不连接智方便或认证服务商，也不执行真实生物识别。','Fictional data only. No connection to iAM Smart or a verification provider, and no biometric processing.')}${F.uploadedIdentity()?`<p>${T('已上傳的證件可協助預填資料；人工核對與 OCR 不等同正式身分核實。','已上传的证件可协助预填资料；人工核对与 OCR 不等同正式身份核实。','Uploaded IDs can help prefill fields. OCR and manual document review are not production identity verification.')}</p>`:''}</div></div>
   <div class="kyc-result" data-kyc-status data-status="${s}" role="status" aria-live="polite"><div class="kyc-result-title"><span class="kyc-result-mark" aria-hidden="true">${s==='success'?'✓':s==='pending'?'…':s==='review'?'!':'○'}</span><div><strong>${(labels[s]||labels.idle)()}</strong><small>${T('僅代表此人的模擬認證結果，公司開戶仍須審查。','仅代表此人的模拟认证结果，公司开户仍须审查。','This is an individual Demo result. The company application still needs review.')}</small></div></div>
    <ul class="kyc-check-list">${checks.map(([key,label])=>`<li><span>${label}</span><span class="${r?.checks?.[key]?'passed':''}">${r?.checks?.[key]?T('已完成（模擬）','已完成（模拟）','Complete (Demo)'):s==='pending'?T('待手機完成','待手机完成','Waiting'):T('未完成','未完成','Incomplete')}</span></li>`).join('')}</ul>
    ${r?.profile?`<p class="kyc-sample-profile">${T('虛構身分樣本','虚构身份样本','Fictional profile')}：<span data-notr>${E(r.profile.name)} · ${E(r.profile.idNoMasked)}</span></p>`:''}
    ${s==='failed'?`<p class="kyc-state-help">${T('模擬檢查未通過。可重新產生連結，或切換另一種認證方式。','模拟检查未通过。可重新生成链接，或切换另一种认证方式。','The Demo check failed. Start a new link or choose another method.')}</p>`:s==='review'?`<p class="kyc-state-help">${T('模擬人臉比對需人工判定；覆核通過前不能完成此步。','模拟人脸比对需人工判断；复核通过前不能完成此步。','The Demo face match needs a human decision. This step remains incomplete until review is approved.')}</p>`:''}
   </div>
   <div class="btn-row kyc-method-actions"><button class="btn primary" data-kyc-start data-wizard-identity>${s==='pending'?T('查看手機認證連結','查看手机认证链接','View phone link'):s==='success'?T('重新體驗此認證','重新体验此认证','Try verification again'):['failed','cancelled','expired'].includes(s)?T('重新開始認證','重新开始认证','Retry verification'):T('開始模擬認證','开始模拟认证','Start Demo verification')}</button>${s==='pending'?`<button class="btn" data-kyc-cancel>${T('取消本次認證','取消本次认证','Cancel verification')}</button>`:''}${s==='review'?`<button class="btn" data-kyc-review>${T('模擬人工覆核','模拟人工复核','Demo manual review')}</button>`:''}</div>
  </section>`;
 }
 function showLink(){
  if(!ownerValid()||active.request.status!=='pending')return;
  const r=active.request,url=new URL(B.base);url.hash=`/identity/${r.token}/${r.method}/${r.expires}`;
  B.modal(T('手機身分認證（Demo）','手机身份认证（Demo）','Phone identity verification (Demo)'),`<div data-kyc-session="${r.token}"><div class="note"><div>${T('你正在為 Azure 公司開戶申請進行模擬認證。','你正在为 Azure 公司开户申请进行模拟认证。','You are completing a Demo verification for an Azure business account application.')}<p>${T('認證方式','认证方式','Method')}：${methodName(r.method)}</p></div></div><div class="identity-qr" id="identity-qr"></div><a class="btn" data-kyc-open href="${E(url.href)}" target="_blank" rel="noopener">${T('在此裝置開啟模擬手機頁','在此设备开启模拟手机页','Open the Demo phone page')}</a><p class="small muted">${T('同一瀏覽器完成後會自動更新。另一台手機完成後，可回填下方結果及 6 碼。','同一浏览器完成后会自动更新。另一台手机完成后，可回填下方结果及 6 码。','Completion syncs in this browser. From another phone, enter the displayed result and 6-digit code below.')}</p>${r.method==='document'?`<div class="field"><label for="identity-document">${T('手機使用證件','手机使用证件','Document used on phone')}</label><select id="identity-document" class="select">${[['hkid',T('香港身分證','香港身份证','Hong Kong ID')],['passport',T('護照','护照','Passport')],['cnid',T('內地居民身分證','内地居民身份证','Mainland China ID')]].map(([key,label])=>`<option value="${key}" ${r.documentType===key?'selected':''}>${label}</option>`).join('')}</select></div>`:''}<div class="form-grid"><div class="field"><label for="identity-outcome">${T('手機顯示結果','手机显示结果','Result shown on phone')}</label><select class="select" id="identity-outcome">${MOCK_OUTCOMES.map(status=>`<option value="${status}">${labels[status]()}</option>`).join('')}</select></div><div class="field"><label for="identity-return">${T('Demo 完成碼','Demo 完成码','Demo result code')}</label><input class="input" id="identity-return" inputmode="numeric" maxlength="6" autocomplete="off"></div></div><p class="small muted">${T('連結 10 分鐘內有效；失敗或待覆核的完成碼不會解鎖下一步。','链接 10 分钟内有效；失败或待复核的完成码不会解锁下一步。','The link expires after 10 minutes. Failed and review result codes do not complete this step.')}</p><p class="required-hint" id="identity-code-error" role="alert" hidden></p></div>`,`<button class="btn" onclick="closeModal()">${T('關閉視窗','关闭视窗','Close window')}</button><button class="btn" data-kyc-cancel>${T('取消認證','取消认证','Cancel verification')}</button><button class="btn primary" data-identity-confirm>${T('確認模擬結果','确认模拟结果','Confirm Demo result')}</button>`);
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
