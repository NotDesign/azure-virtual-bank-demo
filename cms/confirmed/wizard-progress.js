// Required-data completion shares the form's validation rules. It is not approval.
export function createWizardProgress({B,F,labels}) {
 const C=B.copy,E=B.escape,opened=new Map();let queued=false,activeWizard=null;
 const text=(tc,sc,en)=>C(tc,sc,en),translate=value=>window.I18N?.tr(value)||value;
 function snapshot(){
  const w=B.wizard,k=w.k||B.blank(w.company||''),files=F.files.filter(f=>!f.error),validAccounts=(w.accounts||[]).filter(i=>B.products[i]?.status==='可申请');
  const checks=B.checks(k,'cust').map(x=>({...x,key:x.p}));
  const pages=[
   {step:1,items:[{key:'upload',label:text('加入至少一份文件','加入至少一份文件','Add at least one document'),done:files.length>0}],hint:text(`已加入 ${files.length} 份；已人工核對 ${files.filter(f=>f.status==='已人工核對').length} 份。可先繼續填寫，辨識結果需人工核對。`,`已加入 ${files.length} 份；已人工核对 ${files.filter(f=>f.status==='已人工核對').length} 份。可先继续填写，识别结果需人工核对。`,`${files.length} added; ${files.filter(f=>f.status==='已人工核對').length} reviewed. Continue completing the form; recognition results need human review.`)},
   {step:2,items:[{key:'identity',label:F.uploadedIdentity()?text('完成手機人像確認','完成手机人像确认','Complete phone portrait capture'):text('完成證件正反面與人像確認','完成证件正反面与人像确认','Complete ID front, back and portrait capture'),done:!!w.identity?.confirmed}],hint:w.identity?.simulated?text('使用 Demo 模擬完成狀態。','使用 Demo 模拟完成状态。','Completed using Demo simulation.'):''},
   {step:3,items:checks},
   {step:4,items:[{key:'accounts',label:text('選擇至少一個可申請帳戶','选择至少一个可申请账户','Select at least one available account'),done:validAccounts.length>0}]},
   {step:5,items:[{key:'terms',label:text('確認聲明與條款','确认声明与条款','Confirm the declaration and terms'),done:!!w.agreed}]}
  ].map(p=>({...p,name:labels()[p.step-1],completed:p.items.filter(i=>i.done).length,total:p.items.length,missing:p.items.filter(i=>!i.done)}));
  const total=pages.reduce((n,p)=>n+p.total,0),completed=pages.reduce((n,p)=>n+p.completed,0);
  return {pages,total,completed,percent:total?Math.round(completed/total*100):0,remaining:total-completed};
 }
 function markup(d){
  const current=B.wizard.step,full=innerWidth>=1200;
  return `<div class="wizard-progress-heading"><h3>${text('填寫進度','填写进度','Completion')}</h3><strong data-progress-percent>${d.percent}%</strong></div><p class="wizard-progress-count">${text(`已完成 ${d.completed}／${d.total} 項必填資料`,`已完成 ${d.completed}／${d.total} 项必填资料`,`${d.completed} of ${d.total} required items complete`)}</p><progress value="${d.completed}" max="${d.total}" aria-label="${text('必填資料完成比例','必填资料完成比例','Required data completion')}"></progress><details class="wizard-progress-detail" ${opened.get('all')??full?'open':''}><summary>${d.remaining?text(`查看未完成項目（${d.remaining}）`,`查看未完成项目（${d.remaining}）`,`View remaining items (${d.remaining})`):text('必填資料已完成','必填资料已完成','Required data complete')}</summary><div class="wizard-progress-pages">${d.pages.map(p=>`<details data-progress-page="${p.step}" ${opened.get(p.step)??(p.step===current)?'open':''}><summary><span class="wizard-progress-dot ${p.missing.length?'pending':'complete'}" aria-hidden="true">${p.missing.length?p.step:'✓'}</span><strong>${E(p.name)}</strong><span>${p.completed}/${p.total}</span></summary><div class="wizard-progress-page-body">${p.hint?`<p>${E(p.hint)}</p>`:''}${p.missing.length?`<ul>${p.missing.map(i=>`<li><button class="btn sm" type="button" data-progress-go="${p.step}" data-progress-key="${E(i.key)}" data-progress-section="${E(i.sec||'')}">${E(translate(i.label))}<span aria-hidden="true">›</span></button></li>`).join('')}</ul>`:`<p class="wizard-progress-complete">${text('此步必填項目已完成','此步必填项目已完成','Required items in this step are complete')}</p>`}<button class="btn sm wizard-progress-page-link" type="button" data-progress-go="${p.step}">${text('前往此步','前往此步','Open this step')}</button></div></details>`).join('')}</div></details><small>${text('進度依必填資料及檢查規則計算，並非審批結果。','进度依必填资料及检查规则计算，并非审批结果。','Based on required data and validation rules; this is not an approval result.')}</small>`;
 }
 function place(panel){
  const rail=document.querySelector('.operations'),steps=document.querySelector('.steps');
  const inRail=innerWidth>=1200&&rail;panel.classList.toggle('in-rail',!!inRail);
  if(inRail){if(panel.parentElement!==rail)rail.append(panel);}else if(steps&&panel.previousElementSibling!==steps)steps.after(panel);
 }
 function enhance(){
  if(B.state.page!=='apply'||B.wizard.done)return;
  if(activeWizard!==B.wizard){activeWizard=B.wizard;opened.clear();}
  let panel=document.querySelector('.wizard-fill-progress');
  if(!panel){panel=document.createElement('section');panel.className='wizard-fill-progress';panel.setAttribute('aria-label',text('填寫進度與缺漏資料','填写进度与缺漏资料','Completion and missing data'));}
  const top=panel.scrollTop,d=snapshot();panel.innerHTML=markup(d);place(panel);panel.scrollTop=top;
  document.querySelectorAll('.kyc-nav [data-kyc-section]').forEach(link=>{const n=d.pages[2].missing.filter(i=>i.sec===link.dataset.kycSection).length;link.querySelector('b')?.remove();link.classList.toggle('todo',!!n);link.classList.toggle('ok',!n);if(n){const badge=document.createElement('b');badge.textContent=n;link.append(' ',badge);}});
  const invalid=new Set(d.pages[2].missing.map(i=>i.key));
  document.querySelectorAll('[data-k].bad').forEach(el=>{if(!invalid.has(el.dataset.k)&&!invalid.has(el.dataset.k.split('.')[0])){el.classList.remove('bad');el.removeAttribute('aria-invalid');el.closest('.field')?.querySelector('.required-hint')?.remove();B.state.kfErr?.delete(el.dataset.k);}});
 }
 function refresh(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}}
 function go(step,key='',section=''){
  if(!Number.isInteger(step)||step<1||step>5)return;
  const w=B.wizard;w.k||=B.blank(w.company||'');w.step=step;
  if(step===3&&key){B.state.kfErr||=new Set();B.state.kfErr.add(key);}
  B.render();
  requestAnimationFrame(()=>{
   let node=key?document.querySelector(`[data-k="${CSS.escape(key)}"]`):null;
   if(!node&&key)node=document.querySelector(`[data-k^="${CSS.escape(key)}."]`);
   if(!node&&key)node=document.querySelector(`[data-k^="${CSS.escape(key)}:"]`);
   if(!node&&key==='upload')node=document.querySelector('[data-file-pick]');
   if(!node&&key==='identity')node=document.querySelector('[data-wizard-identity]');
   if(!node&&key==='accounts')node=document.querySelector('[data-wizard-account]:not(:disabled)');
   if(!node&&key==='terms')node=document.querySelector('[data-wizard-terms]');
   node||=section?document.getElementById('ks-'+section):null;
   node||=document.querySelector('.wizard-body,.workspace-body>.card>.card-pad,.public-wizard .card-pad');
   const field=node?.closest('.field,.doc-item,.kyc-section')||node;
   if(field){field.dataset.progressFocus='';field.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
   (node?.matches('input,select,textarea,button,[tabindex]')?node:node?.querySelector('input,select,textarea,button'))?.focus({preventScroll:true});
  });
 }
 document.addEventListener('click',e=>{const node=e.target.closest('[data-progress-go]');if(node)go(+node.dataset.progressGo,node.dataset.progressKey,node.dataset.progressSection);});
 document.addEventListener('click',e=>{const summary=e.target.closest('.wizard-fill-progress summary');if(!summary)return;const node=summary.parentElement,key=node.dataset.progressPage?+node.dataset.progressPage:node.classList.contains('wizard-progress-detail')?'all':null;if(key!==null)requestAnimationFrame(()=>opened.set(key,node.open));});
 for(const type of ['input','change'])document.addEventListener(type,e=>{if(B.state.page==='apply'&&!e.target.closest('.wizard-fill-progress')){e.target.closest('[data-progress-focus]')?.removeAttribute('data-progress-focus');refresh();}});
 window.addEventListener('resize',enhance);
 return {snapshot,enhance,refresh,go};
}
