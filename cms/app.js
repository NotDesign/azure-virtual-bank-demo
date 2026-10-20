export function mountCMS({root,account,publicRoute,locale,onLocale,onLogout,onActivity}){
 const abort=new AbortController();const frame=document.createElement('iframe');
 frame.className='cms-confirmed-frame';frame.title='Azure CMS';frame.allow='camera';
 const frameURL=new URL('cms/confirmed/index.html',location.href);
 frameURL.searchParams.set('v',new URL(location.href).searchParams.get('v')||'20261020-payments-fx2');
 frameURL.hash=publicRoute||`#/${account.role}/${account.role==='cust'?'home':'dashboard'}`;
 frame.src=frameURL.href;
 root.className='cms cms-confirmed-host';root.replaceChildren(frame);root.hidden=false;
 const send=()=>frame.contentWindow?.postMessage({type:'azure-session',account,locale,publicRoute,base:new URL('./',location.href).href},location.origin);
 frame.addEventListener('load',send,{signal:abort.signal});
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
  if(e.data?.type==='azure-ready')send();
  if(e.data?.type==='azure-locale'){locale=e.data.locale;onLocale?.(locale);}
  if(e.data?.type==='azure-logout')onLogout?.();
  if(e.data?.type==='azure-public'){const u=new URL(location.href);u.hash=e.data.route;window.open(u.href,'_blank','noopener');}
  if(e.data?.type==='azure-activity')onActivity?.();
 },{signal:abort.signal});
 return {setLocale(l){if(l!==locale){locale=l;send();}},destroy(){abort.abort();frame.remove();root.hidden=true;}};
}
