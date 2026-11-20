/* Client-side handoff guards. These demonstrate product rules; production must
 * enforce authorization and atomic writes on the server for every request. */
(() => {
 'use strict';
 const actor=()=>scopeActor(), isHQ=()=>actor()?.role==='hq';
 const deny=()=>{toast(C('沒有此操作的權限，或資料已變更。','没有此操作的权限，或资料已变更。','Access denied or the record has changed.'));return false;};
 const enabled=a=>!!a&&a.status==='启用'&&!a.frz?.scopes?.includes('all');
 const canCustomer=id=>!!actor()&&custsInScope().some(c=>c.id===id);
 const canAgent=id=>{const me=actor(),a=agent(id);return !!me&&!!a&&(me.role==='hq'||me.role==='l1'&&(a.id===me.id||a.parent===me.id)||me.role==='l2'&&a.id===me.id);};
 const manageL2=id=>{const me=actor(),a=agent(id);return me?.role==='l1'&&a?.level===2&&a.parent===me.id&&enabled(a);};
 const editL2=id=>isHQ()&&agent(id)?.level===2&&enabled(agent(id))||manageL2(id);
 const existsTarget=(type,id)=>['a','c'].includes(type)&&!!(type==='a'?agent(id):cust(id));
 const visibleTarget=(type,id)=>existsTarget(type,id)&&(type==='c'?canCustomer(id):canAgent(id));
 const request=id=>DOC_REQS.find(r=>r.id===id);
 const canRequest=id=>{const d=request(id);if(!d||!visibleTarget(d.tt,d.target))return false;if(isHQ())return true;return(d.txs||[]).every(id=>{const t=TXS.find(t=>t.id===id);return !t||canCustomer(t.cust);})&&(d.custs||[]).every(canCustomer);};
 const currentForm=()=>document.querySelector('.modal');
 const isCurrentEdit=()=>document.getElementById('trEff')?.value===TODAY&&document.getElementById('trCom')?.value==='原代理保留生效日前佣金';
 let plannedParents=null;const moveRatios=new Map();let changeDepth=0,pendingChange=null;
 const flushChange=()=>{if(changeDepth||!pendingChange)return;const detail=pendingChange;pendingChange=null;window.dispatchEvent(new CustomEvent('azure-hierarchy-change',{detail}));};
 const changed=(kind,targetId='')=>{const me=actor();if(!me)return;pendingChange={kind,targetId,actor:{id:me.id,role:me.role,email:me.email}};flushChange();};
 const mutating=new Set(['saveFloors','fcrAct','saveCompanyRates','doReassign','doReassignHQ','doFreeze','doUnfreeze','doDocReq','drReply','drSim','drSet','drStop']);
 function validateTransfer(ids,toL1,toL2,eff,com,quiet=false){
  const me=actor(),unique=Array.isArray(ids)?[...new Set(ids)]:[];
  let ok=!!me&&['hq','l1'].includes(me.role)&&unique.length>0&&unique.every(canCustomer)&&eff===TODAY&&com==='原代理保留生效日前佣金';
  const parent=toL1?agent(toL1):null,child=toL2?agent(toL2):null;
  if(me?.role==='l1'&&toL1!==me.id)ok=false;
  if(toL1&&(!enabled(parent)||parent.level!==1))ok=false;
  if(toL2&&(!toL1||!enabled(child)||child.level!==2||(plannedParents?.get(toL2)||child.parent)!==toL1))ok=false;
  if(ok)ok=unique.every(id=>PRODUCTS.every(p=>{const value=CUST_PRICE[id]?.[p.code],floor=toL1?FLOORS[toL1]?.[p.code]:p.cost;return Number.isFinite(value)&&Number.isFinite(floor)&&value>=floor;}));
  if(!ok&&!quiet)deny();return ok;
 }
 const selectedIds=ids=>Array.isArray(ids)?ids:[...document.querySelectorAll('.trPick:checked')].map(e=>e.value);
 const wrap=(name,allow)=>{const fn=window[name];if(typeof fn!=='function')return;window[name]=function(...args){if(!allow(...args))return deny();const tracks=mutating.has(name);if(tracks)changeDepth++;try{const out=fn.apply(this,args);if(tracks&&out!==false)changed(name,typeof args[0]==='string'?args[0]:'');return out;}finally{if(tracks){changeDepth--;flushChange();}}};};
 const preservePricing=()=>TXS.forEach(t=>{if(cust(t.cust)&&prod(t.prod))txPricingSnapshot(t);});
 const plan=(parents,fn)=>{const previous=plannedParents;plannedParents=parents;try{return fn();}finally{plannedParents=previous;}};
 function guardedPlan(name,prepare,after){const fn=window[name];if(typeof fn!=='function')return;window[name]=function(...args){const parents=prepare(...args);if(parents===false)return deny();changeDepth++;try{return plan(parents,()=>{const out=fn.apply(this,args);after?.(...args);changed(name,args[0]);return out;});}finally{changeDepth--;flushChange();}};}
 const input=id=>document.getElementById(id)?.value;
 const validAmount=value=>typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value));
 const validRatio=value=>validAmount(value)&&Number(value)>=0&&Number(value)<=100;
 window.setAgentProxy=(id,value)=>{if(!editL2(id)||typeof value!=='boolean'||value&&agent(id).frz?.scopes?.includes('proxy'))return deny();agent(id).proxyApply=value;AUDIT.unshift({t:TODAY,who:actor().email,what:'调整二级代客申请',obj:id+' · '+value,ip:'198.51.100.7'});render();changed('proxy',id);return true;};
 window.setAgentRatio=(id,code,value)=>{if(!editL2(id)||!prod(code)||!validRatio(value))return deny();preservePricing();L2RATIO[id]||={};L2RATIO[id][code]=Number(value);AUDIT.unshift({t:TODAY,who:actor().email,what:'调整二级佣金比例',obj:id+' · '+code+' · '+value,ip:'198.51.100.7'});render();changed('ratio',id);return true;};
 wrap('saveFloors',id=>{if(!isHQ()||agent(id)?.level!==1||S.page!=='pricing'||(S.ui.pt||'products')!=='floors'||(S.ui.pa||'A001')!==id)return false;const rows=[...document.querySelectorAll('input[data-code]')];const good=rows.length===PRODUCTS.length&&new Set(rows.map(r=>r.dataset.code)).size===PRODUCTS.length&&rows.every(r=>validAmount(r.value)&&prod(r.dataset.code)&&Number(r.value)>=prod(r.dataset.code).cost&&CUSTOMERS.filter(c=>c.l1===id).every(c=>Number(r.value)<=CUST_PRICE[c.id]?.[r.dataset.code]));if(good)preservePricing();return good;});
 wrap('fcrAct',(id,act)=>{const f=FEE_REQUESTS.find(r=>r.id===id);if(!isHQ()||!f||!cust(f.cust)||!prod(f.prod)||!['send','eff'].includes(act))return false;if(act==='send')return f.status==='待发送';const ok=f.status==='已发送 Allinpay'&&Number.isFinite(f.to)&&f.to>=floorOf(cust(f.cust),f.prod)&&f.from===CUST_PRICE[f.cust][f.prod];if(ok)preservePricing();return ok;});
 wrap('saveCompanyRates',()=>!!actor()&&['hq','l1'].includes(actor().role));
 wrap('custDetail',canCustomer);
 wrap('custPriceBlock',id=>canCustomer(id)&&['hq','l1'].includes(actor()?.role));
 wrap('newLink',()=>!!actor()&&['hq','l1','l2'].includes(actor().role)&&!agent(actor().id)?.frz?.scopes?.some(k=>['links','all'].includes(k)));
 wrap('newAgentLink',level=>!!actor()&&(actor().role==='hq'&&level===1||actor().role==='l1'&&level===2));
 wrap('inviteAgent',level=>!!actor()&&(actor().role==='hq'&&level===1||actor().role==='l1'&&level===2));
 wrap('reassignCust',(id,onlyAgent)=>isHQ()&&(!id||canCustomer(id))&&(!onlyAgent||!!agent(onlyAgent)));
 wrap('reassignL2',id=>actor()?.role==='l1'&&(!id||canCustomer(id)));
 wrap('doReassign',(ids,isL1)=>{const me=actor();if(!currentForm()||!isCurrentEdit()||!me||isL1&&me.role!=='l1'||!isL1&&me.role!=='hq')return false;return validateTransfer(selectedIds(ids),isL1?me.id:input('trTo')||null,isL1?input('trTo')||null:null,input('trEff'),input('trCom'),true);});
 wrap('doReassignHQ',ids=>isHQ()&&!!currentForm()&&validateTransfer(selectedIds(ids),input('trTo')||null,input('trTo')?input('trTo2')||null:null,input('trEff'),input('trCom'),true));
 wrap('offboardL1',id=>isHQ()&&agent(id)?.level===1&&enabled(agent(id)));
 guardedPlan('doOffboardL1',id=>{
  if(!isHQ()||agent(id)?.level!==1||!enabled(agent(id))||!isCurrentEdit())return false;
  const to=input('trTo')||null,keep=input('trL2')==='keep'&&!!to;if(to===id||to&&(!enabled(agent(to))||agent(to).level!==1))return false;
  const parents=new Map(AGENTS.filter(a=>a.parent===id).map(a=>[a.id,to]));
  const valid=plan(keep?parents:null,()=>custsOf(id).every(c=>validateTransfer([c.id],to,keep?c.l2:null,input('trEff'),input('trCom'),true)));
  return valid?(keep?parents:null):false;
 });
 wrap('offboardL2',manageL2);
 guardedPlan('doOffboardL2',id=>{
  const me=actor(),to=input('trTo')||null;if(!manageL2(id)||!isCurrentEdit()||to===id)return false;
  return custsOf(id).every(c=>validateTransfer([c.id],me.id,to,input('trEff'),input('trCom'),true))?null:false;
 });
 wrap('moveL2',id=>isHQ()&&agent(id)?.level===2&&enabled(agent(id)));
 guardedPlan('doMoveL2',id=>{
  const a=agent(id),to=input('mvTo'),follow=input('mvCust')==='follow';if(!isHQ()||a?.level!==2||!enabled(a)||!isCurrentEdit()||!validRatio(input('mvRatio'))||to===a.parent||!enabled(agent(to))||agent(to).level!==1)return false;
  const parents=new Map([[id,to]]),ok=plan(parents,()=>custsOf(id).every(c=>validateTransfer([c.id],follow?to:a.parent,follow?id:null,input('trEff'),input('trCom'),true)));if(ok)moveRatios.set(id,Number(input('mvRatio')));return ok?parents:false;
 },id=>{if(moveRatios.has(id)){const ratio=moveRatios.get(id);moveRatios.delete(id);L2RATIO[id]=Object.fromEntries(PRODUCTS.map(p=>[p.code,ratio]));render();}});
 for(const name of ['freezeModal','unfreezeModal','docReqModal'])wrap(name,(type,id)=>isHQ()&&existsTarget(type,id));
 wrap('doFreeze',(type,id)=>isHQ()&&existsTarget(type,id)&&!!document.getElementById('fzWhy')&&[...document.querySelectorAll('.fzS:checked')].every(e=>(type==='c'?FRZ_C:FRZ_A).some(r=>r[0]===e.value)));
 wrap('doUnfreeze',(type,id)=>isHQ()&&existsTarget(type,id)&&!!(type==='c'?cust(id):agent(id)).frz&&!!document.getElementById('ufWhy'));
 wrap('doDocReq',(type,id)=>isHQ()&&existsTarget(type,id)&&!!document.getElementById('drSrc'));
 window.uploadDemoRequestDoc=(id,index)=>{const d=request(id);if(!canRequest(id)||isHQ()||!['待回复','退回补充','逾期'].includes(d.status)||!Number.isInteger(index)||index<0||index>=d.docs.length)return deny();const doc=d.docs[index];d.resp[doc]='demo_reply_'+index+'_'+TODAY.replace(/-/g,'')+'.pdf';changed('drUpload',id);drDetail(id);return true;};
 wrap('drDetail',canRequest);
 wrap('drReply',id=>canRequest(id)&&!isHQ()&&['待回复','退回补充','逾期'].includes(request(id).status));
 wrap('drSim',id=>isHQ()&&!!request(id)&&['待回复','退回补充','逾期'].includes(request(id).status));
 wrap('drSet',(id,status)=>{const d=request(id);return isHQ()&&!!d&&(status==='已撤销'&&['待回复','逾期','退回补充'].includes(d.status)||['退回补充','已结案'].includes(status)&&d.status==='已回复');});
 wrap('drStop',id=>{const d=request(id);return isHQ()&&d?.tt==='c'&&!!cust(d.target)&&['待回复','逾期','退回补充'].includes(d.status)&&(d.status==='逾期'||d.due<TODAY);});
 // Public enrollment is bound to its active invitation and may only submit once.
 const joinReady=()=>S.portal==='public'&&S.page==='join'&&!!S.join&&S.join.code===S.arg&&AGENT_LINKS.some(l=>l.code===S.arg&&validScopeInvitation(l,'join'));
 wrap('joinNext',()=>joinReady()&&!S.join.done);
 wrap('joinSubmit',()=>joinReady()&&!S.join.done&&S.join.step===3);
 window.AzureHierarchy={ready:true,actor,canCustomer,canAgent,canProxyApply,validateTransfer,changed,validInvitation:validScopeInvitation,beneficiaries(){const ids=new Set(custsInScope().map(c=>c.id));return BENEFICIARIES.filter(b=>ids.has(b.customerId||b.cust));}};
})();
