import {createDraftStore} from './wizard-draft-store.js?v=20261113-saved-drafts';
// Browser-local form templates and reviewed import drafts; never bulk-submits KYC.
export function createWizardTemplates({B,F,progress}) {
 const C=B.copy,E=B.escape,clone=v=>structuredClone(v),limit=200;let excelPromise,busy=false,preview=null,active='',drafts=[];
 const T=(tc,sc,en)=>C(tc,sc,en),get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
 const columns=[
  ['cn','公司中文名稱'],['en','公司英文名稱'],['contact','聯繫人'],['email','聯繫電郵'],['phone','聯繫電話'],
  ['certNo','BR 號碼'],['certExp','BR 到期日'],['crNo','CR 號碼'],['nar1Exp','NAR1 到期日'],['cap','註冊資本'],['years','經營年限'],['staff','員工人數'],
  ['mcc','MCC'],['nature','業務性質'],['funds','資金來源'],['reg.country','註冊國家代碼'],['reg.prov','註冊省區'],['reg.cn','註冊中文地址'],['reg.en','註冊英文地址'],
  ['dirs.0.name','董事姓名'],['dirs.0.first','董事英文名'],['dirs.0.last','董事英文姓'],['dirs.0.idType','董事證件類型'],['dirs.0.idNo','董事證件號碼'],['dirs.0.dob','董事出生日期'],
  ['buyers.0.name','主要客戶名稱'],['buyers.0.country','主要客戶國家代碼'],['buyers.0.ccy','主要客戶幣別'],['sellers.0.name','供應商名稱'],['sellers.0.country','供應商國家代碼'],['sellers.0.ccy','供應商幣別'],
  ['recvC','收款國家代碼'],['payC','付款國家代碼'],['recvCcy','收款幣別'],['payCcy','付款幣別'],['avgTx','平均單筆金額'],['maxTx','最高單筆金額'],['monthly','每月交易額'],['annual','預計年收入'],['accounts','帳戶產品代碼'],['legal','法律地位'],['ctype','客戶類型'],['group','所屬集團'],['parent','上級商戶'],['sigSame','簽名人與董事相同'],['sigDir','選用董事序號'],['bizSame','營業地址與註冊地址相同'],['biz.country','營業國家代碼'],['biz.prov','營業省區'],['biz.cn','營業中文地址'],['biz.en','營業英文地址'],['web','公司網站'],['desc','業務說明'],['title','聯絡人職位'],['incDate','成立日期'],['monthlyCnt','每月交易筆數'],['directors','完整董事資料'],['signatories','完整簽名人資料'],['shareholders','完整股東資料'],['customers','完整主要客戶資料'],['suppliers','完整供應商資料']
 ].map(([key,label])=>({key,label,header:`${label} (${key})`}));
 const people={directors:'dirs',signatories:'sigs',shareholders:'ubos',customers:'buyers',suppliers:'sellers'};
 const split=v=>String(v||'').split(/[|;；]/).map(s=>s.trim()).filter(Boolean);
 const key=()=> 'azure-form-templates:v1:'+encodeURIComponent(B.account?.email||'public:'+location.hash.split('/').slice(0,3).join('/'));
 function sanitize(raw){
  const k=B.blank('');k.desc='';if(!raw||typeof raw!=='object')return k;
  for(const name of Object.keys(k))if(!Array.isArray(k[name])&&name!=='extra'&&name!=='_ocr'&&name!=='reg'&&name!=='biz'&&name!=='emailOK'){
   if(typeof k[name]==='boolean'){if(typeof raw[name]==='boolean')k[name]=raw[name];}
   else if(['string','number'].includes(typeof raw[name]))k[name]=String(raw[name]).slice(0,5000);
  }
  for(const name of ['reg','biz'])for(const part of ['country','prov','cn','en'])if(typeof raw[name]?.[part]==='string')k[name][part]=raw[name][part].slice(0,5000);
  for(const name of ['dirs','sigs','ubos','buyers','sellers'])if(Array.isArray(raw[name]))k[name]=raw[name].slice(0,20).map(row=>Object.fromEntries((['buyers','sellers'].includes(name)?['name','country','ccy','pct']:['name','first','last','idType','idNo','idExp','dob','nat','pct','same']).map(p=>[p,['string','number'].includes(typeof row?.[p])?String(row[p]).slice(0,5000):''])));
  for(const name of ['recvC','payC','recvCcy','payCcy'])if(Array.isArray(raw[name]))k[name]=raw[name].filter(v=>typeof v==='string').slice(0,40);
  return k;
 }
 const productIds=w=>(w.accounts||[]).map(i=>B.products[i]?.id).filter(Boolean);
 const accountIndices=ids=>B.products.map((p,i)=>p.status==='可申请'&&ids.includes(p.id)?i:null).filter(i=>i!==null);
 function stored(){try{const raw=localStorage.getItem(key());if(!raw||raw.length>2000000)return[];const rows=JSON.parse(raw);return Array.isArray(rows)?rows.slice(0,20).filter(r=>typeof r.id==='string'&&typeof r.name==='string').map(r=>({...r,k:sanitize(r.k),products:Array.isArray(r.products)?r.products.filter(x=>typeof x==='string'):[]})):[];}catch{return[];}}
 function builtins(){return ['goods','services'].map((id,i)=>{const k=B.blank('');Object.assign(k,{nature:i?'服务贸易':'货物贸易',mcc:i?'7372':'5065',recvC:['USA'],payC:['CHN'],recvCcy:['USD'],payCcy:['CNH']});return{id:'builtin-'+id,name:i?T('服務貿易基本模板','服务贸易基本模板','Services starter'):T('貨物貿易基本模板','货物贸易基本模板','Goods starter'),k,products:['AP1'],builtin:true};});}
 function all(){return [...builtins(),...stored()];}
 function save(name){
  name=String(name||'').trim().slice(0,60);if(!name)return false;
  const rows=stored();if(rows.length>=20){B.toast(T('最多儲存 20 個模板。','最多储存 20 个模板。','Store up to 20 templates.'));return false;}
  const w=B.wizard;rows.push({id:crypto.randomUUID(),name,k:sanitize(w.k),products:productIds(w),created:new Date().toISOString()});
  try{localStorage.setItem(key(),JSON.stringify(rows));return true;}catch{B.toast(T('無法儲存模板，請檢查瀏覽器儲存空間。','无法储存模板，请检查浏览器存储空间。','Template storage is unavailable.'));return false;}
 }
 function manage(){
  B.modal(T('填寫模板','填写模板','Form templates'),`<p class="small muted">${T('儲存目前已填資料，之後可帶入。模板僅存於此瀏覽器、依登入帳號分開；不儲存上傳檔案、KYC 完成狀態或提交聲明。','保存当前已填资料，之后可带入。模板仅存于此浏览器、按登录账号分开；不保存上传文件、KYC 完成状态或提交声明。','Save current fields for reuse in this browser, separately for each signed-in account. Files, completed KYC and declarations are not saved.')}</p><div class="wizard-template-create"><div class="field"><label for="wizard-template-name">${T('新模板名稱','新模板名称','New template name')}</label><input class="input" id="wizard-template-name" maxlength="60" placeholder="${T('例如：香港貿易公司','例如：香港贸易公司','e.g. Hong Kong trading company')}"></div><button class="btn primary" data-template-save>${T('建立模板','创建模板','Create template')}</button></div><div class="wizard-template-list">${all().map(r=>`<article><div><strong data-notr>${E(r.name)}</strong><small>${r.builtin?T('內建 · 不含公司及個人資料','内置 · 不含公司及个人资料','Built-in · no company or personal data'):T('我的模板','我的模板','My template')}</small></div><button class="btn sm" data-template-apply="${E(r.id)}">${T('帶入','带入','Apply')}</button>${r.builtin?'':`<button class="icon-btn" data-template-delete="${E(r.id)}" aria-label="${E(T('刪除模板：','删除模板：','Delete template: ')+r.name)}">×</button>`}</article>`).join('')}</div>`,`<button class="btn" onclick="closeModal()">${T('關閉','关闭','Close')}</button>`,true);
 }
 function apply(id){
  const row=all().find(r=>r.id===id);if(!row)return false;let w=B.wizard;if(w.done){active='';B.state.wiz={step:3,company:'',email:'',phone:'',docs:{},done:null};F.resetContext();w=B.wizard;}
  w.k=sanitize(row.k);w.accounts=accountIndices(row.products);w.identity=null;w.agreed=false;w.demoSteps=[];
  F.files.forEach(f=>{f.identityReviewed=false;f.candidates?.forEach(c=>c.applied=false);if(f.status==='已人工核對')f.status='待核對';});w.ocr=null;w.company=w.k.cn||w.k.en;w.contact=w.k.contact;w.email=w.k.email;w.phone=w.k.phone;
  B.state.kfErr=null;w.step=3;B.close();B.render();B.toast(T('已帶入模板，請核對缺項並重新完成 KYC。','已带入模板，请核对缺项并重新完成 KYC。','Template applied. Review missing data and complete KYC again.'));return true;
 }
 // Drafts belong to the canonical login identity (or a public invitation), not the viewed customer.
 const draftStore=createDraftStore();let scope='',ready=false,loading=false,loadBlocked=false,edited=false,restoreNote='',saveError=false,savedAt='',saving=0,epoch=0,selection=0,chain=Promise.resolve(),readyPromise=Promise.resolve();
 const dirty=new Set(),removed=new Set(),signatures=new Map();
 function draftScope(){const a=B.account;return a?.email?'account:'+JSON.stringify([a.role,a.id,a.email.toLowerCase()]):B.state.portal==='public'&&B.state.page==='apply'?'invitation:'+B.state.arg:'';}
 // Draft restoration preserves manually entered rows/text; template/import caps do not truncate drafts.
 function draftFields(raw){
  const k=sanitize(raw);if(!raw||typeof raw!=='object')return k;
  for(const key of Object.keys(k))if(key!=='emailOK'&&['string','number'].includes(typeof raw[key])&&!Array.isArray(k[key])&&typeof k[key]!=='object')k[key]=raw[key];
  for(const key of ['reg','biz'])for(const part of ['country','prov','cn','en'])if(typeof raw[key]?.[part]==='string')k[key][part]=raw[key][part];
  for(const key of ['dirs','sigs','ubos','buyers','sellers'])if(Array.isArray(raw[key]))k[key]=raw[key].map(row=>Object.fromEntries((['buyers','sellers'].includes(key)?['name','country','ccy','pct']:['name','first','last','idType','idNo','idExp','dob','nat','pct','same']).map(field=>[field,['string','number','boolean'].includes(typeof row?.[field])?row[field]:''])));
  for(const key of ['recvC','payC','recvCcy','payCcy','custom'])if(Array.isArray(raw[key]))k[key]=raw[key].filter(v=>typeof v==='string');
  k._ocr=raw._ocr&&typeof raw._ocr==='object'?Object.fromEntries(Object.entries(raw._ocr).filter(([key,v])=>!['__proto__','constructor','prototype'].includes(key)&&['number','string'].includes(typeof v))):{};
  return k;
 }
 function restoreState(raw,id){
  const k=draftFields(raw.k);
  return {step:Math.max(1,Math.min(5,Number.isInteger(raw.step)?raw.step:1)),company:k.cn||k.en||'',contact:k.contact||'',email:k.email||'',phone:k.phone||'',k,docs:{},accounts:accountIndices(Array.isArray(raw.products)?raw.products:[]),identity:null,agreed:false,ocr:raw.ocr?.reviewed?{reviewed:true}:null,demoSteps:Array.isArray(raw.demoSteps)?raw.demoSteps.filter(n=>[1,3,4].includes(n)):[],_documentSession:id};
 }
 function packed(row){
  const w=row.state,k=draftFields(w.k);
  const files=F.draftFiles(w._documentSession,w.k);k.extra=Object.fromEntries([...new Set(files.filter(f=>f.kind==='extra').map(f=>f.key))].map(key=>[key,w.k.extra[key]]));
  return {id:row.id,name:row.name,state:{step:w.step,k,products:productIds(w),ocr:w.ocr?.reviewed?{reviewed:true}:null,demoSteps:w.demoSteps||[]},files};
 }
 function saveStatus(){
  return B.state.page==='apply'&&B.wizard.done?T('此筆已提交，未完成草稿已保留。','此笔已提交，未完成草稿已保留。','This draft was submitted. Unfinished drafts remain available.'):loading?T('正在恢復草稿…','正在恢复草稿…','Restoring drafts…'):saveError?T('未能儲存，資料仍在此頁；請重試。','未能储存，资料仍在此页；请重试。','Not saved. Your edits remain on this page; retry saving.'):saving?T('正在儲存…','正在储存…','Saving…'):savedAt?T('已儲存於此瀏覽器 · ','已储存于此浏览器 · ','Saved in this browser · ')+new Date(savedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):T('自動儲存於此瀏覽器，依登入帳號分開。','自动储存于此浏览器，按登录账号分开。','Autosaved in this browser, separately for each account.');
 }
 function paintStatus(){document.querySelectorAll('[data-draft-status]').forEach(n=>{n.textContent=saveStatus();n.classList.toggle('draft-save-error',saveError);});document.querySelectorAll('[data-draft-save]').forEach(n=>n.disabled=loading||!!B.state.wiz?.done);}
 function track(){
  if(B.state.page!=='apply'||!ready)return;
  let row=drafts.find(r=>r.id===active);
  if(!row||row.state!==B.wizard){row={id:crypto.randomUUID(),name:T('填寫草稿','填写草稿','Application draft'),state:B.wizard,hydrated:true};drafts.push(row);active=row.id;}
  if(row.state.done){removed.add(row.id);dirty.delete(row.id);return;}
  row.hydrated=true;dirty.add(row.id);
 }
 function flush(){
  if(!ready||loadBlocked||!scope)return Promise.resolve(false);
  const rows=[];for(const id of dirty){const row=drafts.find(r=>r.id===id);if(row&&!row.state.done&&row.hydrated){const item=packed(row),signature=JSON.stringify(item,(key,v)=>key==='file'?undefined:v);if(signatures.get(id)!==signature){rows.push(item);signatures.set(id,signature);}}}
  dirty.clear();const deletes=[...removed];removed.clear();if(!rows.length&&!deletes.length)return chain;
  const ownScope=scope,ownEpoch=epoch,ownActive=active;saving++;paintStatus();
  // Snapshot synchronously; a draft/account switch cannot change a queued write.
  const snapshots=rows.map(r=>({...r,state:clone(r.state),files:r.files.map(f=>({...f,meta:f.meta?clone(f.meta):undefined}))}));
  const run=async()=>{try{const date=await draftStore.save(ownScope,snapshots,deletes,ownActive);if(ownEpoch===epoch){savedAt=date;saveError=false;}return true;}catch(e){if(ownEpoch===epoch){saveError=true;rows.forEach(r=>{signatures.delete(r.id);dirty.add(r.id);});deletes.forEach(id=>removed.add(id));}return false;}finally{if(ownEpoch===epoch){saving--;paintStatus();}}};
  chain=chain.then(run,run);return chain;
 }
 function changed(){
  if(draftScope()!==scope){ensure();return;}edited=true;
  if(loading&&ready){selection++;loading=false;paintStatus();}
  if(!ready)return;
  track();void flush();
 }
 function ensure(){
  const next=draftScope();if(!next)return;
  if(next===scope&&(ready||loading||loadBlocked))return;
  if(next!==scope){if(scope){F.resetWizard();B.state.wiz=null;}epoch++;scope=next;drafts=[];active='';ready=false;edited=false;restoreNote='';saveError=false;savedAt='';saving=0;dirty.clear();removed.clear();signatures.clear();selection++;}
  const ownEpoch=epoch;loading=true;paintStatus();
  readyPromise=draftStore.list(scope).then(async data=>{
   if(ownEpoch!==epoch||draftScope()!==scope)return;
   const rows=data.rows;if(rows.length>200)throw Error('Too many drafts');
   for(const r of rows)if(!/^[-\w]+$/.test(r.id)||!r.state.k||typeof r.state.k!=='object')throw Error('Invalid draft');
   drafts=rows.map(r=>({id:r.id,name:String(r.name||'').slice(0,100),state:restoreState(r.state,r.id),files:r.files,hydrated:false,updatedAt:r.updatedAt}));
   active=data.active&&drafts.some(r=>r.id===data.active)?data.active:drafts[0]?.id||'';ready=true;loading=false;loadBlocked=false;saveError=false;savedAt=drafts.find(r=>r.id===active)?.updatedAt||'';
   if(B.state.page==='apply'&&!edited&&active)await loadDraft(active,true);
   else if(edited&&B.state.page==='apply'){active='';track();void flush();B.render();}
   else B.render();
  }).catch(()=>{if(ownEpoch!==epoch)return;ready=false;loading=false;loadBlocked=true;saveError=true;paintStatus();});
 }
 async function saveDraft(){
  ensure();if(loadBlocked){loadBlocked=false;ensure();}await readyPromise;
  if(!ready||B.wizard.done)return false;track();const ok=await flush();enhance();if(ok)B.toast(T('草稿已儲存，可在此瀏覽器下次登入後繼續。','草稿已储存，可在此浏览器下次登录后继续。','Draft saved. Continue in this browser after signing in again.'));return ok;
 }
 function resumeNotice(){
  document.querySelector('.saved-drafts-notice')?.remove();
  const pending=drafts.filter(r=>!r.state.done);if(!ready||!pending.length||B.state.page==='apply'||B.state.portal==='public')return;
  const head=document.querySelector('.page-in>.page-head');if(!head)return;
  const node=document.createElement('div');node.className='note saved-drafts-notice';node.innerHTML=`<div>${T(`有 ${pending.length} 筆已儲存草稿，可繼續填寫。`,`有 ${pending.length} 笔已储存草稿，可继续填写。`,`${pending.length} saved drafts are ready to continue.`)}</div><button class="btn sm" data-drafts-resume>${T('繼續填寫','继续填写','Continue drafts')}</button>`;head.after(node);
 }
 function deleteDraft(){
  const row=drafts.find(r=>r.id===active);if(!row||row.state.done)return;
  B.modal(T('刪除草稿','删除草稿','Delete draft'),`<p>${T('刪除此草稿及其已儲存文件？此操作無法復原。','删除此草稿及其已储存文件？此操作无法恢复。','Delete this draft and its saved files? This cannot be undone.')}</p><p data-notr><strong>${E(row.state.k?.cn||row.state.k?.en||row.name)}</strong></p>`,`<button class="btn" onclick="closeModal()">${T('取消','取消','Cancel')}</button><button class="btn danger" data-draft-delete-confirm="${E(row.id)}">${T('刪除草稿','删除草稿','Delete draft')}</button>`);
 }
 function tools(){return `<section class="wizard-template-tools" aria-label="${T('模板與批量匯入','模板与批量导入','Templates and batch import')}"><button class="btn" data-wizard-templates>${T('填寫模板','填写模板','Form templates')}</button><button class="btn" data-wizard-import>${T('批量匯入','批量导入','Import')}</button><button class="btn" data-wizard-export>${T('輸出版型','导出版型','Export layout')}</button><div class="wizard-draft-storage"><div class="btn-row"><button class="btn" data-draft-save ${loading||B.wizard.done?'disabled':''}>${T('儲存草稿','储存草稿','Save draft')}</button>${active&&!drafts.find(r=>r.id===active)?.state.done?`<button class="icon-btn" data-draft-delete aria-label="${T('刪除目前草稿','删除当前草稿','Delete current draft')}">×</button>`:''}</div><p data-draft-status role="status" class="${saveError?'draft-save-error':''}">${E(saveStatus())}</p>${restoreNote?`<p class="draft-restored-note">${E(restoreNote)}</p>`:''}</div>${drafts.length?`<div class="field"><label for="wizard-draft-select">${T(`批次草稿（${drafts.length} 筆）`,`批次草稿（${drafts.length} 笔）`,`Batch drafts (${drafts.length})`)}</label><select class="select" id="wizard-draft-select"><option value="">${T('選擇待填資料','选择待填资料','Choose a draft')}</option>${drafts.map(r=>`<option value="${E(r.id)}" ${r.id===active?'selected':''}>${E(r.state.k?.cn||r.state.k?.en||r.name)}${r.state.done?' · '+T('已提交','已提交','Submitted'):' · '+T('待完成','待完成','Incomplete')}</option>`).join('')}</select></div>`:''}</section>`;}
 function enhance(){
  ensure();if(B.state.page!=='apply'){resumeNotice();return;}
  const current=drafts.find(r=>r.id===active);
  if(current&&current.state!==B.wizard){if(!edited||!B.state.wiz?.k){void loadDraft(active,true);return;}active='';}
  if(current?.state===B.wizard){if(current.state.done){removed.add(current.id);dirty.delete(current.id);}else if(current.hydrated)dirty.add(current.id);void flush();}
  document.querySelectorAll('.wizard-template-tools').forEach(n=>n.remove());const doc=new DOMParser().parseFromString(tools(),'text/html'),node=doc.body.firstElementChild,rail=document.querySelector('.operations'),panel=document.querySelector('.wizard-fill-progress');
  if(innerWidth>=1200&&rail)rail.insertBefore(node,panel?.parentElement===rail?panel:null);else if(panel)panel.after(node);else document.querySelector('.workspace-body>.card,.public-body>.card,.page-in>.card')?.after(node);
 }
 async function excel(){if(window.ExcelJS)return window.ExcelJS;if(!excelPromise)excelPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../../vendor/exceljs-4.4.0.min.js',import.meta.url).href;script.onload=()=>resolve(window.ExcelJS);script.onerror=()=>{excelPromise=null;script.remove();reject(new Error(T('Excel 元件未能載入，請重試。','Excel 组件未能加载，请重试。','Excel support failed to load. Try again.')));};document.head.append(script);});return excelPromise;}
 function csvRows(source){
  const rows=[];let row=[],cell='',quoted=false,closed=false;source=source.replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'&&source[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else cell+=c;}else if(c==='"'){if(cell||closed)throw new Error('CSV 引號格式錯誤');quoted=true;}else if(c===','||c==='\n'||c==='\r'){row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&source[i+1]==='\n')i++;rows.push(row);row=[];if(rows.length>limit+2)throw new Error('每次最多匯入 200 筆');}}else{if(closed&&!/\s/.test(c))throw new Error('CSV 引號格式錯誤');if(!closed)cell+=c;}if(cell.length>5000||row.length>100)throw new Error('欄位內容過長或欄數過多');}
  if(quoted)throw new Error('CSV 引號未結束');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
 }
 function parseGrid(grid){
  grid=grid.filter(row=>row.some(v=>String(v??'').trim()));if(grid.length<2)throw new Error(T('沒有資料列；請先填寫版型。','没有数据行；请先填写版型。','No data rows. Complete the import layout first.'));if(grid.length>limit+1)throw new Error(T('每次最多匯入 200 筆。','每次最多导入 200 笔。','Import up to 200 rows at a time.'));
  const header=grid[0].map(String),keys=header.map(h=>columns.find(c=>[c.key,c.label,c.header].includes(h.trim()))?.key||null),mapped=keys.filter(Boolean);
  if(!mapped.length)throw new Error(T('找不到可對應欄位，請下載版型。','找不到可对应字段，请下载版型。','No matching columns. Download the import layout.'));if(new Set(mapped).size!==mapped.length)throw new Error(T('同一欄位重複出現，請先移除重複欄。','同一字段重复出现，请先移除重复列。','Duplicate mapped columns. Remove duplicates first.'));
  const warnings=header.filter((_,i)=>!keys[i]);
  const rows=grid.slice(1).map((values,index)=>{
   const k=B.blank(''),record={},errors=[];let fatal=values.length>keys.length;if(fatal)errors.push(T('資料欄數多於欄名，請檢查 CSV 格式','数据列数多于字段名，请检查 CSV 格式','More values than headers. Check the CSV format.'));
   values.forEach((value,i)=>{if(!keys[i])return;let v=String(value??'').trim();if(v.length>5000){fatal=true;errors.push(T('欄位超過 5,000 字元','字段超过 5,000 字符','Field exceeds 5,000 characters'));return;}if(v.startsWith("'")&&/^[=+\-@]/.test(v.slice(1)))v=v.slice(1);if(v.startsWith('=')){fatal=true;errors.push(T('請以固定文字取代公式','请以固定文本替代公式','Replace formulas with fixed text'));}record[keys[i]]=v;});
   for(const c of columns){if(c.key==='accounts'||people[c.key]||record[c.key]===undefined||record[c.key]==='')continue;let value=['recvC','payC','recvCcy','payCcy'].includes(c.key)?split(record[c.key]):record[c.key];if(['sigSame','bizSame'].includes(c.key)){if(!['true','false','1','0','是','否'].includes(value)){fatal=true;errors.push(c.label+'：請填 true 或 false');continue;}value=['true','1','是'].includes(value);}B.setPath(k,c.key,value);}
   for(const [key,path]of Object.entries(people))if(record[key]){try{const values=JSON.parse(record[key]);if(!Array.isArray(values)||values.length>20||values.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error();for(const field of columns.filter(c=>c.key.startsWith(path+'.0.'))){const name=field.key.split('.').at(-1);if(record[field.key]&&String(values[0]?.[name]??'')!==record[field.key]){fatal=true;errors.push(field.label+'：單筆欄位與完整資料不一致，請保留其中一種。');}}k[path]=sanitize({...k,[path]:values})[path];}catch{fatal=true;errors.push(columns.find(c=>c.key===key).label+'：格式無效；請由目前內容輸出後修改。');}}
   const products=split(record.accounts),accounts=accountIndices(products);for(const id of products)if(!B.products.some(p=>p.id===id&&p.status==='可申请'))errors.push(T('帳戶產品不可申請：','账户产品不可申请：','Unavailable account product: ')+id);
   const missing=B.issues(k,'cust').length;
   if(k.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k.email))errors.push(T('電郵格式需要修正','电邮格式需要修正','Email format needs correction'));
   return {id:crypto.randomUUID(),line:index+2,name:k.cn||k.en||T(`第 ${index+1} 筆未填公司名稱`,`第 ${index+1} 笔未填公司名称`,`Row ${index+1}: company name missing`),k,accounts,errors,fatal,missing,selected:!fatal};
  });return{rows,warnings};
 }
 async function read(file){
  if(!file||!file.size||file.size>3*1048576)throw new Error(T('請使用 3 MB 以下的 CSV 或 XLSX。','请使用 3 MB 以下的 CSV 或 XLSX。','Use a CSV or XLSX file under 3 MB.'));
  let grid;if(/\.csv$/i.test(file.name)){grid=csvRows(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()));}
  else if(/\.xlsx$/i.test(file.name)){
   const buffer=await file.arrayBuffer();grid=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./wizard-import-worker.js?v=20261112-compact-progress',import.meta.url)),timer=setTimeout(()=>{worker.terminate();reject(new Error(T('Excel 讀取逾時，請減少資料量。','Excel 读取超时，请减少数据量。','Excel reading timed out. Reduce the file size.')));},15000);const finish=()=>{clearTimeout(timer);worker.terminate();};worker.onmessage=e=>{finish();e.data.error?reject(new Error(e.data.error)):resolve(e.data.grid);};worker.onerror=()=>{finish();reject(new Error(T('Excel 內容無法讀取，請另存為新的 XLSX。','Excel 内容无法读取，请另存为新的 XLSX。','Cannot read this workbook. Save a new XLSX copy.')));};worker.postMessage(buffer,[buffer]);});
  }else throw new Error(T('支援 CSV 與 Excel .xlsx；舊版 .xls 請先另存為 .xlsx。','支持 CSV 与 Excel .xlsx；旧版 .xls 请先另存为 .xlsx。','Supports CSV and Excel .xlsx. Save legacy .xls files as .xlsx first.'));
  preview=parseGrid(grid);showPreview();return preview;
 }
 function choose(){const input=document.createElement('input');input.type='file';input.accept='.csv,.xlsx';input.onchange=()=>{if(!input.files[0]||busy)return;busy=true;B.modal(T('正在讀取匯入資料','正在读取导入数据','Reading import'),`<div class="account-switcher-loading" role="status"><span class="azure-loading-ring" aria-hidden="true"></span><p>${T('正在讀取並檢查欄位…','正在读取并检查字段…','Reading and checking columns…')}</p></div>`);read(input.files[0]).catch(e=>{B.close();B.toast(E(e.message));}).finally(()=>busy=false);};input.click();}
 function showPreview(){
  const rows=preview.rows;B.modal(T('批量匯入預覽','批量导入预览','Batch import preview'),`<p>${T(`共 ${rows.length} 筆，選擇後加入待填草稿；不會自動提交。`,`共 ${rows.length} 笔，选择后加入待填草稿；不会自动提交。`,`${rows.length} rows. Add selected rows as drafts; no automatic submission.`)}</p>${preview.warnings.length?`<div class="note warn">${T('以下欄位未對應，將不帶入：','以下字段未对应，将不导入：','Unmapped columns will be skipped: ')}${E(preview.warnings.join('、'))}</div>`:''}<div class="btn-row"><button class="btn sm" data-import-toggle>${T('全選／取消選取','全选／取消选择','Select / deselect all')}</button><button class="btn sm" data-import-errors>${T('輸出檢查結果 CSV','导出检查结果 CSV','Export checks CSV')}</button></div><div class="tbl-wrap wizard-import-preview"><table><thead><tr><th>${T('選取','选取','Select')}</th><th>${T('原始列','原始行','Source row')}</th><th>${T('公司','公司','Company')}</th><th>${T('待補','待补','Missing')}</th><th>${T('檢查結果','检查结果','Checks')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><input type="checkbox" data-import-row="${r.id}" ${r.selected?'checked':''} ${r.fatal?'disabled':''} aria-label="${E(T('選取：','选择：','Select: ')+r.name)}"></td><td>${r.line}</td><td data-notr>${E(r.name)}</td><td>${r.missing}</td><td>${E(r.errors.join('；')||T('可加入草稿；KYC 與文件另行確認','可加入草稿；KYC 与文件另行确认','Can add as draft; complete KYC and documents separately'))}</td></tr>`).join('')}</tbody></table></div>`,`<button class="btn" onclick="closeModal()">${T('取消','取消','Cancel')}</button><button class="btn primary" data-import-confirm>${T('加入批次草稿','加入批次草稿','Add batch drafts')}</button>`,true);
 }
 function confirmImport(){
  const selected=preview?.rows.filter(r=>r.selected&&!r.fatal)||[];if(!selected.length)return B.toast(T('請先選取可匯入的資料。','请先选择可导入的数据。','Select importable rows first.'));if(drafts.length+selected.length>200)return B.toast(T('批次草稿最多 200 筆。','批次草稿最多 200 笔。','Up to 200 batch drafts.'));
  if(!ready)return B.toast(T('草稿儲存尚未就緒，請稍後重試。','草稿储存尚未就绪，请稍后重试。','Draft storage is not ready. Try again shortly.'));
  if(!active&&B.wizard.k){const row={id:crypto.randomUUID(),name:T('原有草稿','原有草稿','Previous draft'),state:B.wizard,hydrated:true};drafts.push(row);dirty.add(row.id);}
  const additions=selected.map(r=>({id:r.id,name:r.name,hydrated:true,state:{step:1,company:r.k.cn||r.k.en,contact:r.k.contact,email:r.k.email,phone:r.k.phone,k:sanitize(r.k),docs:{},accounts:r.accounts,identity:null,agreed:false,demoSteps:[]}}));drafts.push(...additions);additions.forEach(r=>dirty.add(r.id));void flush();preview=null;B.close();loadDraft(additions[0].id);B.toast(T(`已加入 ${additions.length} 筆草稿，請逐筆完成文件與 KYC。`,`已加入 ${additions.length} 笔草稿，请逐笔完成文件与 KYC。`,`${additions.length} drafts added. Complete documents and KYC for each.`));
 }
 async function loadDraft(id,restoring=false){
  const row=drafts.find(r=>r.id===id);if(!row)return;
  const ownScope=scope,ownEpoch=epoch,token=++selection;
  if(active&&B.state.page==='apply'&&drafts.find(r=>r.id===active)?.state===B.wizard){track();void flush();}
  let uploads;if(!row.hydrated){loading=true;paintStatus();try{const blobs=await draftStore.files(ownScope,id);uploads=row.files.map(meta=>({...meta,blob:blobs.find(b=>b.id===meta.id)?.blob}));}catch{loading=false;saveError=true;paintStatus();return;}}
  if(ownEpoch!==epoch||token!==selection||draftScope()!==ownScope)return;
  active=id;B.state.wiz=row.state;B.state.kfErr=null;F.resetContext();
  if(uploads){const missing=F.restoreDraft(uploads);row.hydrated=true;restoreNote=T('已恢復填寫進度及文件；KYC 與提交聲明需重新確認。','已恢复填写进度及文件；KYC 与提交声明需重新确认。','Fields and files restored. Confirm KYC and the declaration again.')+(missing?T(` ${missing} 份文件未能恢復，請重新上傳。`,` ${missing} 份文件未能恢复，请重新上传。`,` ${missing} files could not be restored. Upload them again.`):'');}
  else if(!restoring)restoreNote='';loading=false;edited=false;
  // Persist the active selection even when only the selected draft changed.
  signatures.delete(id);dirty.add(id);void flush();B.render();
 }
 function download(name,data,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 const safeCSV=v=>{const s=String(v??'');return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';};
 const csv=rows=>'\uFEFF'+rows.map(r=>r.map(safeCSV).join(',')).join('\r\n');
 const exportRow=w=>columns.map(c=>c.key==='accounts'?productIds(w).join('|'):people[c.key]?JSON.stringify(w.k?.[people[c.key]]||[]):Array.isArray(get(w.k,c.key))?get(w.k,c.key).join('|'):String(get(w.k,c.key)??''));
 async function exportLayout(format='xlsx',current=false){
  const rows=[columns.map(c=>c.header),...(current?[exportRow(B.wizard)]:[])];
  if(format==='csv'){download(`Azure-${current?'current-fields':'import-layout'}.csv`,csv(rows),'text/csv;charset=utf-8');return;}
  const Excel=await excel(),book=new Excel.Workbook();book.creator='Azure Demo';const sheet=book.addWorksheet('Applications',{views:[{state:'frozen',ySplit:1,xSplit:2}]});sheet.addRows(rows);sheet.columns=columns.map(c=>({width:c.key.includes('name')||c.key.includes('address')?30:24}));sheet.getRow(1).height=32;sheet.getRow(1).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF004BEB'}};cell.alignment={vertical:'middle',wrapText:true};});sheet.getRow(2).height=24;sheet.columns.forEach(c=>c.numFmt='@');
  const guide=book.addWorksheet('欄位說明');guide.columns=[{width:26},{width:24},{width:66}];guide.addRows([['Azure 匯入版型 v1','一列一間公司','最多 200 筆；CSV UTF-8 或 Excel .xlsx'],['填寫方式','保留第一列欄名','國家用 HKG／CHN／USA 等代碼，多選以 | 分隔；帳戶產品為 AP1。'],['注意','不含文件及 KYC 狀態','上傳文件、KYC、聲明須逐筆完成；編號及日期使用文字，日期格式 YYYY-MM-DD。'],['欄位','對應欄位','說明'],...columns.map(c=>[c.label,c.key,people[c.key]?'多人／多筆 JSON 資料；可由目前內容輸出後修改；與單筆欄位同時填寫時內容須一致。':['sigSame','bizSame'].includes(c.key)?'填 true 或 false。':['recvC','payC','recvCcy','payCcy'].includes(c.key)?'多選：以 | 分隔，例如 USD|EUR':c.key==='accounts'?'可申請帳戶產品代碼，例如 AP1':/Exp|dob/.test(c.key)?'文字日期：YYYY-MM-DD':'可留空，匯入後會依必填規則顯示缺項'])]);guide.getRow(1).font={bold:true,size:16};guide.getRow(4).font={bold:true};guide.eachRow(row=>row.alignment={wrapText:true,vertical:'top'});
  download(`Azure-${current?'current-fields':'import-layout'}.xlsx`,await book.xlsx.writeBuffer(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 }
 function exportMenu(){B.modal(T('下載匯入版型','下载导入版型','Download import layout'),`<p>${T('一列代表一間公司。空白版型保留欄名；Excel 另附欄位說明。可選擇輸出目前已填內容。','一行代表一间公司。空白版型保留字段名；Excel 另附字段说明。可选择导出当前已填内容。','One company per row. The blank layout contains headers; Excel includes a field guide. You can also export current fields.')}</p><div class="wizard-export-options">${[['csv',false,'CSV 空白版型','CSV blank layout'],['xlsx',false,'Excel 空白版型','Excel blank layout'],['csv',true,'目前內容 CSV','Current fields CSV'],['xlsx',true,'目前內容 Excel','Current fields Excel']].map(([format,current,tc,en])=>`<button class="btn" data-export-format="${format}" data-export-current="${current}">${T(tc,tc,en)}</button>`).join('')}</div>`,`<button class="btn" onclick="closeModal()">${T('關閉','关闭','Close')}</button>`);}
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-wizard-templates]'))manage();if(e.target.closest('[data-wizard-import]'))choose();if(e.target.closest('[data-wizard-export]'))exportMenu();
  if(e.target.closest('[data-template-save]')&&save(document.getElementById('wizard-template-name').value))manage();
  const use=e.target.closest('[data-template-apply]');if(use)apply(use.dataset.templateApply);
  const del=e.target.closest('[data-template-delete]');if(del){localStorage.setItem(key(),JSON.stringify(stored().filter(r=>r.id!==del.dataset.templateDelete)));manage();}
  if(e.target.closest('[data-draft-save]'))void saveDraft();
  if(e.target.closest('[data-drafts-resume]'))location.hash='#/'+B.state.portal+'/apply';
  if(e.target.closest('[data-draft-delete]'))deleteDraft();
  const remove=e.target.closest('[data-draft-delete-confirm]');if(remove){const id=remove.dataset.draftDeleteConfirm;removed.add(id);dirty.delete(id);drafts=drafts.filter(r=>r.id!==id);active='';B.close();void flush();F.resetWizard(B.wizard._documentSession);B.state.wiz={step:1,docs:{}};restoreNote='';if(drafts.some(r=>!r.state.done))void loadDraft(drafts.find(r=>!r.state.done).id);else B.render();}
  if(e.target.closest('[data-import-confirm]'))confirmImport();
  if(e.target.closest('[data-import-toggle]')){const next=!preview.rows.filter(r=>!r.fatal).every(r=>r.selected);preview.rows.forEach(r=>r.selected=next&&!r.fatal);showPreview();}
  if(e.target.closest('[data-import-errors]'))download('Azure-import-checks.csv',csv([['原始列','公司','待補欄位','檢查結果'],...preview.rows.map(r=>[r.line,r.name,r.missing,r.errors.join('；')])]),'text/csv;charset=utf-8');
  const out=e.target.closest('[data-export-format]');if(out){out.disabled=true;exportLayout(out.dataset.exportFormat,out.dataset.exportCurrent==='true').catch(err=>B.toast(E(err.message))).finally(()=>out.disabled=false);}
 });
 document.addEventListener('change',e=>{if(e.target.id==='wizard-draft-select')loadDraft(e.target.value);if(e.target.dataset.importRow&&preview){const row=preview.rows.find(r=>r.id===e.target.dataset.importRow);if(row)row.selected=e.target.checked;}});
 const afterEdit=()=>queueMicrotask(()=>{if(B.state.page==='apply')changed();});
 document.addEventListener('input',e=>{if(B.state.page==='apply'&&e.target.closest('.wizard-body,.kyc-form,[data-k],.form-grid'))afterEdit();});
 document.addEventListener('change',e=>{if(B.state.page==='apply'&&e.target.id!=='wizard-draft-select'&&!e.target.closest('.modal'))afterEdit();});
 document.addEventListener('click',e=>{if(B.state.page==='apply'&&e.target.closest('[data-demo-fill],[data-wizard-clear],[data-template-apply],[data-progress-go],.wizard-nav,[data-k]'))afterEdit();});
 window.addEventListener('pagehide',()=>{if(ready&&B.state.page==='apply'){track();void flush();}},{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready&&B.state.page==='apply'){track();void flush();}});
 window.addEventListener('resize',enhance);
 return{enhance,save,apply,all,read,parseGrid,exportLayout,changed,saveDraft,flush,get ready(){return ready;},get storageScope(){return scope;},restart(){const state={step:1,company:'',email:'',phone:'',docs:{},ocr:null,running:false,done:null};const row=drafts.find(r=>r.id===active);if(row&&!row.state.done)row.state=state;else active='';B.state.wiz=state;},get drafts(){return drafts;},get columns(){return columns;},get preview(){return preview;},loadDraft};
}
