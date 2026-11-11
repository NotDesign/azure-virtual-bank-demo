/* Remembered account metadata is separate from the parent's in-memory verified sessions. */
(() => {
 'use strict';
 let state={currentEmail:null,accounts:[]},returnFocusEmail=null;
 const T=(tc,sc,en)=>C(tc,sc,en),esc=value=>E(value);
 const available=()=>parent!==window&&!window.AzureAdminChild&&!!window.AzureBridge?.account;
 const send=(type,data={})=>{if(available())parent.postMessage({type,...data},location.origin);};
 function status(row){return row.current?T('目前帳號','当前账号','Current account'):row.sessionActive?T('已驗證，可快速切換','已验证，可快速切换','Verified — quick switch'):T('需要重新驗證','需要重新验证','Verification required');}
 function role(row){return ({hq:T('全權管理者','全权管理者','Full administrator'),cust:T('客戶 eBanking','客户 eBanking','Customer eBanking'),l1:T('一級代理','一级代理','Level 1 agent'),l2:T('二級代理','二级代理','Level 2 agent')})[row.role]||'';}
 function markup(){
  return `<div class="account-switcher-head"><div><h4 id="account-switcher-heading">${T('切換帳號','切换账号','Switch account')}</h4><p>${T('已記住並登入過的帳號；驗證仍有效時可直接切換。','已记住并登录过的账号；验证仍有效时可直接切换。','Remembered accounts you have signed in to. Switch directly while their verification remains valid.')}</p></div><button class="btn sm" type="button" id="account-switcher-add">${ICON.plus||'＋'}${T('新增帳號','新增账号','Add account')}</button></div><div id="account-switcher-list">${state.accounts.map(row=>`<div class="account-switcher-row ${row.current?'is-current':''}" data-account-email="${esc(row.email)}"><button class="btn account-switcher-choice" type="button" data-account-switch="${esc(row.email)}" ${row.current?'disabled':''}><span class="avatar" data-notr>${esc(row.name.slice(0,1))}</span><span class="account-switcher-copy"><strong data-notr>${esc(row.name)}<span class="badge ${row.current?'info':''}">${esc(status(row))}</span></strong><span data-notr>${esc(row.email)}</span><small data-notr>${esc(row.organization)} · ${esc(role(row))}</small></span>${row.current?'':'<span aria-hidden="true">›</span>'}</button>${row.remembered?`<button class="btn sm account-switcher-remove" type="button" data-account-remove="${esc(row.email)}" aria-label="${esc(T('移除記住的帳號：','移除记住的账号：','Forget account: ')+row.email)}" title="${esc(T('移除記住','移除记住','Forget'))}">${ICON.x}</button>`:row.current?`<button class="btn sm" type="button" data-account-remember>${T('記住','记住','Remember')}</button>`:''}</div>`).join('')}</div><p class="account-switcher-note">${T('只記住帳號資訊，不儲存密碼或驗證碼。重新開啟或驗證逾時後，需再次登入。移除記住不會登出目前帳號。','仅记住账号信息，不保存密码或验证码。重新打开或验证过期后需重新登录。移除记住不会退出当前账号。','Only account details are remembered, never passwords or verification codes. Reopening or expiry requires sign-in again. Forgetting an account does not sign out the current account.')}</p><button class="btn btn-danger" type="button" id="account-switcher-logout-all">${T('登出所有已登入帳號','退出所有已登录账号','Sign out all signed-in accounts')}</button>`;
 }
 function paint(){
  const host=document.querySelector('.account-switcher-dialog .account-switcher');if(!host)return;
  host.innerHTML=markup();
  const current=state.accounts.find(row=>row.current),summary=document.querySelector('.account-switcher-dialog .account-summary strong');if(current&&summary){summary.textContent=window.AzureBridge?.account?.email===current.email?AzureBridge.account.name:current.name;summary.setAttribute('data-notr','');}
  host.querySelectorAll('[data-account-switch]').forEach(button=>button.addEventListener('click',()=>{const email=button.dataset.accountSwitch;closeModal();send('azure-account-switch',{email});}));
  host.querySelectorAll('[data-account-remove]').forEach(button=>button.addEventListener('click',()=>{returnFocusEmail=button.dataset.accountRemove;send('azure-account-remove',{email:button.dataset.accountRemove});}));
  host.querySelector('[data-account-remember]')?.addEventListener('click',()=>{returnFocusEmail=state.currentEmail;send('azure-account-remember');});
  host.querySelector('#account-switcher-add').addEventListener('click',()=>{closeModal();send('azure-account-add');});
  host.querySelector('#account-switcher-logout-all').addEventListener('click',()=>{closeModal();send('azure-account-logout-all');});
  if(returnFocusEmail){const row=[...host.querySelectorAll('[data-account-email]')].find(el=>el.dataset.accountEmail===returnFocusEmail);(row?.querySelector('[data-account-remove],[data-account-remember]')||host.querySelector('#account-switcher-add'))?.focus();returnFocusEmail=null;}
 }
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='azure-accounts-state'||!available()||!Array.isArray(event.data.accounts))return;
  const next={currentEmail:typeof event.data.currentEmail==='string'?event.data.currentEmail:null,accounts:event.data.accounts.slice(0,20).filter(row=>row&&typeof row.email==='string'&&typeof row.name==='string'&&typeof row.organization==='string'&&['cust','hq','l1','l2'].includes(row.role)).map(row=>({email:row.email,name:row.name,organization:row.organization,role:row.role,current:row.current===true,remembered:row.remembered===true,sessionActive:row.sessionActive===true}))};if(JSON.stringify(next)!==JSON.stringify(state)){state=next;paint();}
 });
 const original=accountPanel;
 accountPanel=function(...args){
  const result=original(...args);if(!available())return result;
  const dialog=document.querySelector('.modal');if(!dialog)return result;
  dialog.classList.add('account-switcher-dialog');dialog.setAttribute('aria-label',T('帳戶資訊與切換帳號','账户信息与切换账号','Account information and switching'));dialog.tabIndex=-1;
  const host=document.createElement('section');host.className='account-switcher';host.setAttribute('aria-labelledby','account-switcher-heading');dialog.querySelector('.modal-body')?.prepend(host);paint();send('azure-accounts-request');dialog.querySelector('.modal-head button')?.focus();return result;
 };
 document.addEventListener('keydown',event=>{
  const dialog=document.querySelector('.account-switcher-dialog');if(!dialog||event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length),first=controls[0],last=controls[controls.length-1];if(!first)return;
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
 });
 window.AzureAccountSwitcher={ready:true,request:()=>send('azure-accounts-request')};
})();
