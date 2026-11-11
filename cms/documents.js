// Shared AllinPay PDF / OCR engine; each document fails independently.
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE={'IDENTITY':'ID','140101':'BR','140201':'CI','141101':'NAR1','140401':'BANK','141301':'BANK','140301':'SEARCH','AUTHORIZATION':'AUTH','APPLICATION':'FORM','140701':'AGREEMENT','141401':'LEASE','141601':'TERMS','141201':'PCI','141701':'FINANCIAL','SUPPORTING_IMAGE':'MEDIA'};
const KEY={identityName:'identityName',identityNo:'identityNo',identityBirthDate:'birthDate',merchantEnglishName:'companyName',merchantName:'companyNameZh',registerCertNo:'brNo',registerCertPeriod:'certExpiry',registerCertName:'certName',crCode:'crNo',legalStatus:'legalStatus',remark:'businessNature','directors[0].name':'directorName','directors[0].idcardNo':'idNo','directors[0].birthDay':'birthDate',cardName:'withdrawalName',cardNo:'withdrawalAccount',cardBankCode:'bankCode',cardBankName:'statementBank',statementDate:'statementDate',addrStreet:'address',addrStreetEn:'addressEn'};
const LABEL={identityName:'證件姓名',identityNo:'身份證號碼',companyName:'企業名稱',companyNameZh:'企業中文名稱',brNo:'商業登記號',certExpiry:'商業登記到期日',certName:'證書登記名称',crNo:'公司註冊編號',legalStatus:'法律地位（參考）',businessNature:'登記業務性質（參考）',directorName:'董事姓名',idNo:'身份證號碼',birthDate:'出生日期',withdrawalName:'銀行帳戶名稱',withdrawalAccount:'銀行帳號',bankCode:'銀行代碼',statementBank:'結單銀行',statementDate:'結單日期',address:'地址',addressEn:'英文地址'};
export class DocumentBatch{
 constructor(onChange){this.files=[];this.selected=null;this.page=1;this.rotation=0;this.onChange=onChange;this.controller=new AbortController();this.engine=null;this.running=false;this.view=null;this.tick=0;this.generation=0;this.destroyed=false;this.scheduled=false;this.runPromise=null;}
 notify(){if(this.tick||this.destroyed)return;this.tick=setTimeout(()=>{this.tick=0;if(!this.destroyed)this.onChange();},200);}
 pick(){const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='.pdf,.png,.jpg,.jpeg';input.onchange=()=>this.add(input.files);input.click();}
 add(files){if(this.destroyed)return;for(const file of files){const duplicate=this.files.some(f=>f.file.name===file.name&&f.file.size===file.size&&f.file.lastModified===file.lastModified);if(duplicate){this.view?.toast('重複文件已略過。');continue;}const valid=/\.(pdf|png|jpe?g)$/i.test(file.name)&&file.size>0&&file.size<=30*1048576;this.files.push({id:crypto.randomUUID(),file,status:valid?'等待辨識':'需要處理',error:valid?'':'請使用 30 MB 以下的 PDF、PNG 或 JPG。',progress:0,type:'待分類',pages:0,candidates:[],doc:null});}if(!this.selected)this.selected=this.files[0]?.id;this.onChange();this.view?.toast('文件已加入並自動排隊辨識；結果仍須人工核對。');this.queue();}
 queue(){if(this.scheduled||this.destroyed)return;this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;if(!this.destroyed&&!this.running&&this.files.some(f=>f.status==='等待辨識'))void this.run();});}
 cancel(){if(this.destroyed)return;this.generation++;this.controller.abort();this.controller=new AbortController();for(const f of this.files)if(['等待辨識','辨識中'].includes(f.status)){f.status='已取消';f.error='';}this.notify();}
 async loadEngine(){if(!this.engine){const [engine,parser]=await Promise.all([import('../br-engine/engine.mjs?v=20261111-documents'),import('../br-engine/multi-document.mjs?v=20261111-documents')]);this.engine={...engine,...parser};}return this.engine;}
 async run(){
  if(this.destroyed)return;if(this.running)return this.runPromise;
  this.running=true;const signal=this.controller.signal,generation=this.generation,active=()=>!this.destroyed&&!signal.aborted&&this.generation===generation,check=()=>{if(!active())throw new DOMException('Aborted','AbortError');};
  const runOne=async()=>{while(active()){
   const item=this.files.find(f=>f.status==='等待辨識');if(!item)break;item.status='辨識中';item.progress=0;item.error='';item.candidates=[];item.identityReviewed=false;item.pageClassifications=[];item.pageErrors=[];item.warnings=[];item.recognizedText='';this.notify();
   try{
    const engine=await this.loadEngine();check();if(item.doc)await item.doc.destroy();check();const doc=await engine.loadDocument(item.file);if(!active()){await doc.destroy();check();}item.doc=doc;item.pages=doc.pages;const candidates=[];
    for(let p=1;p<=item.pages;p++){
     check();let canvas;
     try{
      const rendered=await item.doc.render(p);canvas=rendered.canvas;check();
      let result=await engine.extractDocumentText({canvas,text:rendered.text,signal:signal,onProgress:n=>{if(active()){item.progress=(p-1+n)/item.pages;this.notify();}}});
      check();let classification=engine.classifyDocument(result.text,{isImage:item.doc.kind==='image'}),type=classification.ambiguous?'MIXED':TYPE[classification.id]||'待分類',extracted=[];
      if(!classification.ambiguous&&(type==='BR'||(type==='待分類'&&/BUSINESS\s+REGISTRATION\s+(?:ORDINANCE|REGULATIONS)|Date of Commencement.*Date of Expiry/is.test(result.text)))){
       const br=await engine.recognizeDocument({canvas,text:result.text,page:p,forceOCR:true,signal:signal,onProgress:n=>{if(active()){item.progress=(p-1+n.progress)/item.pages;this.notify();}}});
       check();result={...result,text:br.rawText||result.text,method:br.method,confidence:br.ocrConfidence,rotation:br.rotation};extracted=engine.candidatesFromBR(br);
       if(br.recognized){type='BR';classification=engine.classifyDocument('Business Registration Certificate',{brRecognized:true});}
       item.warnings.push(...(br.warnings||[]).map(message=>`第 ${p} 頁：${message}`));
      }else if(!classification.ambiguous&&type!=='MEDIA'){
       extracted=engine.extractCandidates(result.text,type==='待分類'?'AUTO':type,{rows:result.rows,width:result.width,height:result.height,page:p});
       if(type==='ID'&&!extracted.some(c=>c.key==='identityNo')&&engine.recoverIdentityFields){
        const recovered=await engine.recoverIdentityFields({canvas,rotation:result.rotation||0,signal:signal});extracted.push(...recovered);
       }
      }
      check();item.recognizedText+='\n'+result.text;
      const pageCandidates=[];
      for(const c of extracted){
       const key=KEY[c.key];if(!key||!c.value)continue;
       const value=String(c.value),confidence=c.confidence??result.confidence??null;
       if(!candidates.some(x=>x.key===key&&x.value===value&&x.page===p)){
        const candidate={key,label:LABEL[key],value,file:item.file.name,page:p,docType:type,selected:false,reviewRequired:true,confidence:Number.isFinite(confidence)&&confidence<=1?Math.round(confidence*100):confidence,method:c.method||result.method,source:c.source||value};candidates.push(candidate);pageCandidates.push(candidate);
       }
      }
      item.pageClassifications.push({page:p,type,id:classification.id,ids:classification.ids||[],label:classification.label,ambiguous:classification.ambiguous,confidence:classification.confidence,reason:classification.reason,method:result.method,rotation:result.rotation||0,candidateCount:pageCandidates.length});
     }catch(error){
      if(error.name==='AbortError')throw error;check();
      item.pageErrors.push({page:p,message:error.message||'本頁無法辨識。'});item.pageClassifications.push({page:p,type:'待分類',id:'',label:'本頁需人工處理',reason:'本頁無法辨識，其他頁面繼續處理',error:true});
     }finally{if(canvas)canvas.width=1;}
     item.progress=p/item.pages;this.notify();
    }
    const types=[...new Set(item.pageClassifications.map(x=>x.type))];item.type=types.length===1?types[0]:'MIXED';item.candidates=candidates;item.status=candidates.length?'待核對':'待人工填寫';item.progress=1;
    if(item.pageErrors.length)item.warnings.push('部分頁面未完成辨識；已保留其餘頁面的結果，請逐頁核對。');
   }catch(error){if(error.name==='AbortError'){if(active())item.status='已取消';break;}if(active()){item.status='辨識失敗';item.error=error.message||'文件無法辨識。';}}
   this.notify();
  }};
  this.runPromise=Promise.all([runOne(),runOne()]);try{await this.runPromise;}finally{this.running=false;this.runPromise=null;if(!this.destroyed){this.notify();this.queue();}}
 }

 current(){return this.files.find(f=>f.id===this.selected)||this.files[0];}
 selectType(label){const t=/BR/.test(label)?'BR':/CI/.test(label)?'CI':/NAR1/.test(label)?'NAR1':/銀行/.test(label)?'BANK':'ID';const file=this.files.find(f=>f.type===t);if(file){this.selected=file.id;this.page=1;}else this.view?.toast('這個分類沒有已上傳文件。');}
 attachView(main,view){this.view={...view,main};const {route,tr,command}=view;
  if(route===4){const drop=main.querySelector('[data-name="Drop zone / multiple files"]');if(drop){drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');this.add(e.dataTransfer.files);});if(this.files.length)drop.insertAdjacentHTML('beforeend',`<p>${this.files.length} ${E(tr('份文件已加入'))}</p>`);}}
  if([5,6].includes(route)&&this.files.length){const panel=main.querySelector('[data-name="Main information"] [data-name^="Panel /"]');const table=panel.querySelector('[data-name="Data table"]');if(table)table.innerHTML=this.tableHTML(tr);else panel.insertAdjacentHTML('beforeend',this.tableHTML(tr));}
  if(route===7&&this.files.length){const current=this.current(),preview=main.querySelector('[data-name="Source document preview"]'),panels=[...main.querySelectorAll('[data-name="Document and extracted fields"]>[data-name^="Panel /"]')];
   if(preview&&current){preview.innerHTML=`<p><strong>${E(current.file.name)}</strong> · ${this.page} / ${current.pages||1}</p><p>${E(tr(current.type))} · ${E(tr(current.status))}</p><div data-document-canvas></div>`;if(current.doc)void this.showPreview(preview,current);else preview.insertAdjacentHTML('beforeend',`<p>${E(tr('尚未完成辨識，請先開始辨識。'))}</p>`);}
   const right=panels[1];if(right){const cs=current?.candidates||[];right.innerHTML=`<p class="font-bold text-[20px]">${E(tr('辨識結果核對'))}</p><p class="cms-note">${E(tr('核對原文件後，選擇要填入的欄位。未勾選的候選值不會套用。'))}</p>${cs.length?cs.map((c,i)=>`<label class="cms-check"><input type="checkbox" class="cms-checkbox" data-candidate="${i}"> ${E(tr('採用'))}：${E(tr(c.label))}</label><div class="cms-field"><label for="cms-candidate-${i}">${E(tr(c.label))}</label><input class="cms-input" id="cms-candidate-${i}" data-candidate-value="${i}" value="${E(c.value)}"><p>${E(tr('來源'))}：${E(c.file)} · ${E(tr('第'))} ${c.page} ${E(tr('頁'))} · ${E(tr('待人工核對'))}</p></div>`).join(''):`<p class="cms-note warning">${E(tr('沒有可靠的辨識候選值；請保留空白並手動填寫。'))}</p>`}`;}
   const rail=main.querySelector('[data-name="Right operations"]');if(rail){if(!rail.querySelector('[data-command="辨識所選文件"]'))rail.insertAdjacentHTML('beforeend',command('辨識所選文件','OCR'));rail.insertAdjacentHTML('beforeend',`<button class="cms-button" data-document-action="previous" ${this.page<=1?'disabled':''}>${E(tr('上一頁'))}</button><button class="cms-button" data-document-action="next" ${this.page>=(current?.pages||1)?'disabled':''}>${E(tr('下一頁'))}</button>`);}
  }
  if(route===8&&this.files.length){const p=main.querySelector('[data-name^="Panel /"]');p.insertAdjacentHTML('beforeend',`<p class="cms-note">${E(tr('保留現有值或採用候選值；確認後才更新欄位。'))}</p>`);}
 }
 tableHTML(tr){return `<table class="cms-upload-table"><thead><tr><th>${E(tr('文件名稱'))}</th><th>${E(tr('分類'))}</th><th>${E(tr('狀態'))}</th><th>${E(tr('進度'))}</th></tr></thead><tbody>${this.files.map(f=>`<tr><td><button data-document-action="select" data-document-id="${f.id}">${E(f.file.name)}</button><small>${(f.file.size/1048576).toFixed(2)} MB · ${f.pages||'—'} ${E(tr('頁'))}</small></td><td>${E(tr(f.type))}</td><td>${E(tr(f.status))}${f.error?`<p>${E(tr(f.error))}</p><button data-document-action="retry" data-document-id="${f.id}">${E(tr('重試'))}</button>`:''}</td><td><progress class="cms-progress" max="1" value="${f.progress}">${Math.round(f.progress*100)}%</progress></td></tr>`).join('')}</tbody></table>`;}
 async showPreview(preview,file){const host=preview.querySelector('[data-document-canvas]');const page=this.page;try{const {canvas}=await file.doc.render(page);if(!host.isConnected||this.page!==page){canvas.width=1;return;}canvas.className='cms-document-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',file.file.name+' page '+page);const rotation=((file.pageClassifications?.find(p=>p.page===page)?.rotation||0)+this.rotation)%360;if(rotation){const rotated=document.createElement('canvas');rotated.width=rotation%180?canvas.height:canvas.width;rotated.height=rotation%180?canvas.width:canvas.height;const c=rotated.getContext('2d');c.translate(rotated.width/2,rotated.height/2);c.rotate(rotation*Math.PI/180);c.drawImage(canvas,-canvas.width/2,-canvas.height/2);rotated.className=canvas.className;canvas.width=1;host.replaceChildren(rotated);}else host.replaceChildren(canvas);}catch(e){host.textContent=e.message;}}
 async handle(action,id){if(action==='select'){this.selected=id;this.page=1;this.rotation=0;this.view?.go(7);}if(action==='retry'){const file=this.files.find(f=>f.id===id);if(file){file.error='';file.status='等待辨識';void this.run();}}if(action==='previous'){this.page=Math.max(1,this.page-1);this.onChange();}if(action==='next'){this.page=Math.min(this.current()?.pages||1,this.page+1);this.onChange();}}
 async previewAction(label){if(/旋轉/.test(label))this.rotation=(this.rotation+90)%360;else this.page=this.page>=(this.current()?.pages||1)?1:this.page+1;}
 apply(main,draft){if(!this.files.length){for(const input of main.querySelectorAll('[data-field]')){const check=[...main.querySelectorAll('[data-selection]')].find(c=>c.dataset.selection.includes(input.closest('.cms-field')?.querySelector('label')?.textContent||'missing'));if(check?.checked)draft[input.dataset.field]=input.value;}return {ok:true,identityConfirmed:false};}
  const file=this.current();const checked=[...main.querySelectorAll('[data-candidate]')].filter(c=>c.checked);if(!checked.length)return {ok:false,message:'請至少選擇一個已核對的欄位。'};
  for(const check of checked){const i=Number(check.dataset.candidate),c=file.candidates[i],input=main.querySelector('[data-candidate-value="'+i+'"]');if(!c||!input?.value.trim())return {ok:false,message:'請核對候選值，不可套用空白。'};}
  for(const check of checked){const i=Number(check.dataset.candidate),c=file.candidates[i];draft[c.key]=main.querySelector('[data-candidate-value="'+i+'"]').value.trim();c.applied=true;}file.status='已人工核對';return {ok:true,identityConfirmed:['directorName','idNo'].every(k=>file.candidates.some(c=>c.key===k&&c.applied))};
 }
 destroy(){this.destroyed=true;this.generation++;this.controller.abort();clearTimeout(this.tick);for(const f of this.files)f.doc?.destroy();this.files=[];this.view=null;}
}
