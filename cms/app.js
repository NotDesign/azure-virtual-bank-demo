export function mountCMS({root,account,publicRoute,locale,onLocale,onLogout,onActivity,getAccounts,onAccountAction,isAuthorized}){
 const abort=new AbortController();const frame=document.createElement('iframe');let active=true;
 frame.className='cms-confirmed-frame';frame.title='Azure CMS';frame.allow='camera';
 const frameURL=new URL('cms/confirmed/index.html',location.href);
 frameURL.searchParams.set('v',new URL(location.href).searchParams.get('v')||'20261112-system-review');
 frameURL.searchParams.set('locale',locale||'zh-Hant');
 frameURL.hash=publicRoute||`#/${account.role}/${account.role==='cust'?'home':'dashboard'}`;
 frame.src=frameURL.href;
 root.className='cms cms-confirmed-host';root.replaceChildren(frame);root.hidden=false;
 const authorized=()=>active&&(!isAuthorized||isAuthorized());
 const sendAccounts=()=>{if(authorized()&&account&&getAccounts)frame.contentWindow?.postMessage({type:'azure-accounts-state',...getAccounts()},location.origin);};
 const send=()=>{if(!authorized())return;let currentAccount=account;
  try{const current=frame.contentWindow?.AzureBridge?.account;if(account&&current?.email===account.email&&current?.id===account.id&&current?.role===account.role&&typeof current.name==='string')currentAccount={...account,name:current.name};}catch{/* A not-yet-ready frame gets the canonical verified identity. */}
  frame.contentWindow?.postMessage({type:'azure-session',account:currentAccount,locale,publicRoute,base:new URL('./',location.href).href},location.origin);sendAccounts();};
 frame.addEventListener('load',send,{signal:abort.signal});
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||!authorized())return;
  if(e.data?.type==='azure-ready')send();
  if(e.data?.type==='azure-locale'){locale=e.data.locale;onLocale?.(locale);}
  if(e.data?.type==='azure-logout')onLogout?.();
  if(e.data?.type==='azure-public'){const u=new URL(location.href);u.hash=e.data.route;window.open(u.href,'_blank','noopener');}
  if(e.data?.type==='azure-activity')onActivity?.();
  if(!account||!getAccounts||!onAccountAction)return;
  if(e.data?.type==='azure-accounts-request')sendAccounts();
  const actions={'azure-account-switch':'switch','azure-account-add':'add','azure-account-remove':'remove','azure-account-remember':'remember','azure-account-logout-all':'logout-all'};
  const action=actions[e.data?.type];if(action){onAccountAction(action,typeof e.data.email==='string'?e.data.email:'');sendAccounts();}
 },{signal:abort.signal});
 return {setLocale(l){if(l!==locale){locale=l;send();}},setActive(value){active=value===true;frame.inert=!active;if(active)send();},sendAccounts,destroy(){active=false;abort.abort();frame.remove();root.hidden=true;}};
}
