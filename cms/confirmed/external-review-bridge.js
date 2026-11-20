import {createRequest,currentRequest,getRequest,requestIndex,revokeRequest,consumeDecision,snapshotDigest,PREFIX,INDEX} from '../../external-review/model.js';
const B=window.AzureBridge,E=B.escape,C=B.copy;
const nowText=value=>new Date(value).toLocaleString('zh-HK');
const rev=a=>Number.isInteger(a?.revision)&&a.revision>0?a.revision:1;
const actor=()=>B.account?.role==='hq'&&B.state.portal==='hq'?B.account:null;
const app=id=>B.applications.find(a=>a.id===id);
const channelLabel='Allinpay 渠道審單（Demo）';
let processing=null,again=false;
const masked=value=>String(value||'').replace(/\d(?=(?:\D*\d){2})/g,'*');
function snapshot(a){
 const k=B.appKyc[a.id]||window.kycOf?.(a)||{},ids=a.productIds||a.products||['AP1'];
 const docs=a.documentManifest||a.reviewDocuments||a.submittedSnapshot?.documents;
 const documentRows=Array.isArray(docs)?docs.map(d=>({kind:d.kind||d.type||d.assigned||'補充文件',name:d.name||d.fileName||'已提交文件',source:'submitted-metadata',note:'此 Demo 僅傳送提交時的文件清單；正式原件需授權文件服務。'})):(window.DOC_TYPES||[['BR','商業登記證'],['CR','公司註冊證'],['NAR1','周年申報表'],['ID1','董事身分證'],['ID2','實益擁有人證件'],['SITE','營業場所照片'],['ADDR','地址證明']]).slice(0,Math.max(0,Number(a.docs)||0)).map(([kind,name])=>({kind,name:`${name}（示例）`,source:'synthetic-fixture',note:'虛構示例文件，不含客戶真實原件。'}));
 return {applicationId:a.id,company:a.company,companyEnglish:k.en||'',purpose:a.purpose==='additional-account'?'既有客戶追加戶口申請':'企業戶口申請',legalType:k.legal||'',registrationNumber:k.certNo||'',incorporationNumber:k.crNo||'',registeredAddress:k.reg?.cn||k.reg?.en||'',businessNature:k.nature||'',website:k.web||'',contact:{name:k.contact||'',email:k.email||'',phone:k.phone||''},directors:(k.dirs||[]).map(p=>({name:p.name||[p.first,p.last].filter(Boolean).join(' '),document:masked(p.idNo)})),beneficialOwners:(k.ubos||[]).map(p=>({name:p.name||[p.first,p.last].filter(Boolean).join(' '),document:masked(p.idNo),share:p.pct})),products:B.products.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,bank:p.bank,region:p.region,currencies:p.ccys})),documents:documentRows};
}
function emit(a,source){window.dispatchEvent(new CustomEvent('azure:application-changed',{detail:{applicationId:a.id,revision:rev(a),status:a.status,source}}));}
function current(id){return actor()&&app(id)?currentRequest(id):null;}
function publicPanel(id){const a=window.appsInScope?.().find(x=>x.id===id);if(!a?.channelReview)return '';const r=a.channelReview;return `<div class="card card-pad mt"><h3 style="margin:0 0 12px">${C('渠道審核回覆','渠道审核回复','Channel review response')}</h3><dl class="kv"><dt>${C('結果','结果','Result')}</dt><dd>${E(r.label||r.action)}</dd><dt>${C('說明','说明','Reason')}</dt><dd>${E(r.reason||'—')}</dd>${r.documents?.length?`<dt>${C('補件文件','补件文件','Required documents')}</dt><dd>${r.documents.map(E).join('、')}</dd>`:''}</dl></div>`;}
function panel(id){
 const a=app(id);if(!a)return '';if(!actor())return publicPanel(id);
 const r=currentRequest(id),valid=r&&r.applicationRevision===rev(a)&&r.status!=='revoked'&&Date.now()<r.expiresAt;
 if(a.status!=='渠道审核中'&&!r)return publicPanel(id);
 const status=!r?C('尚未指派','尚未指派','Not assigned'):!valid&&r.status!=='applied'?C('舊版本或連結已失效','旧版本或链接已失效','Previous assignment unavailable'):r.decision?C('已收到審核回覆','已收到审核回复','Review received'):C('等待外部審單','等待外部审单','Awaiting external review');
 return `<div class="card card-pad mt external-review-panel"><div class="card-head" style="padding:0 0 16px"><h3 class="card-title">${C('外部審單','外部审单','External review')}</h3><span class="badge info">Demo</span></div><p class="small muted">${C('僅分享本次提交快照；內部風控意見及費率不會帶入外部審單頁。','仅分享本次提交快照；内部风控意见及费率不会带入外部审单页。','Only the submitted snapshot is shared. Internal risk notes and pricing are excluded.')}</p><dl class="kv"><dt>${C('狀態','状态','Status')}</dt><dd>${status}</dd><dt>${C('渠道','渠道','Channel')}</dt><dd>${channelLabel}</dd>${r?`<dt>${C('提交版本','提交版本','Submitted version')}</dt><dd>${r.applicationRevision}</dd>`:''}</dl>${a.status==='渠道审核中'?`<div class="btn-row mt"><button class="btn primary" onclick="AzureExternalReview.open('${E(id)}')">${valid&&!r.decision?C('開啟外部審單連結','开启外部审单链接','Open review link'):C('建立外部審單','建立外部审单','Create review assignment')}</button>${valid&&!r.decision?`<button class="btn" onclick="AzureExternalReview.revoke('${E(id)}')">${C('撤銷指派','撤销指派','Revoke assignment')}</button>`:''}</div>`:''}${r?.decision?`<p class="small mt">${E({approve:'審核通過',request_changes:'要求補件',reject:'駁回申請'}[r.decision.action])}${r.decision.reason?' · '+E(r.decision.reason):''}</p>`:''}</div>`;
}
async function open(id){
 const a=app(id),who=actor();if(!who||!a||a.status!=='渠道审核中')return B.toast(C('沒有此案件的審單指派權限。','没有此案件的审单指派权限。','You cannot assign this review.'));
 try{
  await applyPending();if(!actor()||actor().email!==who.email||app(id)!==a||a.status!=='渠道审核中')return;
  const capturedRevision=rev(a),capturedActor=who.email;let r=currentRequest(id);const s=snapshot(a),digest=await snapshotDigest(s);
  if(!actor()||actor().email!==capturedActor||app(id)!==a||a.status!=='渠道审核中'||rev(a)!==capturedRevision)return;
  if(!r||r.status!=='active'||r.applicationRevision!==capturedRevision||r.snapshotDigest!==digest||Date.now()>=r.expiresAt)r=await createRequest({applicationId:id,applicationRevision:capturedRevision,channel:a.channel||'ALLINPAY_HK',reviewer:'渠道審單員（Demo）',snapshot:s});
  if(!actor()||actor().email!==capturedActor||app(id)!==a||rev(a)!==capturedRevision){await revokeRequest(r.token,'context_changed');return;}
  const url=new URL('../../external-review/',location.href);url.hash='/case/'+r.token;
  B.modal(C('外部審單連結（Demo）','外部审单链接（Demo）','External review link (Demo)'),`<p>${C('此連結只開啟本次獲指派的申請快照。','此链接只开启本次获指派的申请快照。','This link opens only the assigned application snapshot.')}</p><div class="field"><label>${C('申請／版本','申请／版本','Application / version')}</label><input class="input" readonly value="${E(id)} · v${r.applicationRevision}"></div><div class="field"><label>${C('審單連結','审单链接','Review link')}</label><input class="input" readonly id="external-review-url" value="${E(url.href)}"></div><p class="small muted">${C('有效至','有效至','Valid until')} ${E(nowText(r.expiresAt))}。${C('此 Demo 只支援同一瀏覽器的頁面同步，沒有寄送電郵。','此 Demo 只支持同一浏览器的页面同步，没有发送邮件。','This Demo syncs tabs in the same browser and sends no email.')}</p>`,`<button class="btn" onclick="closeModal()">${C('關閉','关闭','Close')}</button><a class="btn primary" data-open-external-review href="${E(url.href)}" target="_blank" rel="noopener noreferrer">${C('開啟審單頁','开启审单页','Open review')}</a>`);
 }catch{B.toast(C('無法儲存審單指派，請確認瀏覽器儲存空間。','无法保存审单指派，请确认浏览器存储空间。','Unable to save the review assignment. Check browser storage.'));}
}
async function revoke(id){if(!actor())return;const r=currentRequest(id);if(r){await revokeRequest(r.token,'revoked_by_platform');B.render();}}
async function runApply(){
 if(!actor()||!window.AzureIntake?.ready)return;
 await window.AzureIntake.ready;if(!actor())return;for(const a of B.applications)window.restoreSimulatedOpenedAccounts?.(a);
 for(const token of Object.values(requestIndex())){
  const r=getRequest(token);if(!r?.decision||!['decided','applied'].includes(r.status))continue;
  await consumeDecision(token,async request=>{
   const a=app(request.applicationId);if(!actor()||!a)return {ok:false,reason:'not_authorised'};
   if(a.channelReview?.requestId===request.requestId)return {ok:true,duplicate:true};
   if(a.status!=='渠道审核中'||rev(a)!==request.applicationRevision)return {ok:false,stale:true,reason:'stale_application'};
   const digest=await snapshotDigest(snapshot(a));
   if(!actor()||app(a.id)!==a||a.status!=='渠道审核中'||rev(a)!==request.applicationRevision||digest!==request.snapshotDigest)return {ok:false,stale:true,reason:'stale_snapshot'};
   const d=request.decision,status={approve:'渠道审核通过',request_changes:'待补件',reject:'渠道驳回'}[d.action];if(!status)return {ok:false,reason:'unknown_action'};
   const opened=document.querySelector('[data-open-external-review]');if(opened&&new URL(opened.href).hash==='#/case/'+request.token)B.close();
   a.status=status;a.revision=rev(a)+1;a.channelReview={requestId:request.requestId,decisionId:d.id,action:d.action,label:{approve:'審核通過',request_changes:'要求補件',reject:'駁回申請'}[d.action],reason:d.reason,documents:d.documents,at:d.at,applicationRevision:request.applicationRevision};
   if(d.action==='request_changes')a.supplementRequest={documents:d.documents,reason:d.reason,at:d.at,source:'channel'};
   emit(a,'external-review');return {ok:true};
  });
 }
 if(actor())B.render();
}
function applyPending(){if(processing){again=true;return processing;}processing=runApply().finally(()=>{processing=null;if(again){again=false;void applyPending();}});return processing;}
async function invalidate(id){const a=app(id),r=currentRequest(id);if(!r||!a||!['active','decided'].includes(r.status))return;if(r.applicationRevision!==rev(a)||a.status!=='渠道审核中'){await revokeRequest(r.token,'application_updated');if(actor()&&B.state.arg===id)B.render();}}
window.AzureExternalReview={open,panel,current,applyPending,revoke,snapshot};
window.addEventListener('storage',e=>{if(e.key===INDEX||e.key?.startsWith(PREFIX))void applyPending();});
window.addEventListener('azure:intake-ready',()=>void applyPending());
window.addEventListener('azure:application-changed',e=>{if(e.detail?.source!=='external-review')void invalidate(e.detail?.applicationId);});
if(window.AzureIntake?.ready)void applyPending();B.render();
