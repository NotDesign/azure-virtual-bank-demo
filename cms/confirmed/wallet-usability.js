/* Scoped navigation aliases and task-first wallet layout. */
(() => {
  'use strict';
  const T=(tc,sc,en)=>C(tc,sc,en);
  let privacyFocus=false;
  const terms=['usdt','trc20','erc20','tron','ethereum','wallet','crypto','deposit','withdraw','錢包','钱包','入金','提領','提领','提幣','提币'];
  const alias=query=>{const q=String(query||'').trim().toLowerCase();return q.length>=2&&terms.some(term=>term.includes(q)||q.includes(term));};
  function walletMenu(){return MENUS[S.portal]?.find(([key])=>key===(S.portal==='hq'?'customer-wallets':'wallets'));}
  const previousSearch=azureSearch;
  azureSearch=function(query){
    const result=previousSearch(query),menu=walletMenu(),host=document.getElementById('search-results');
    if(alias(query)&&menu&&host){
      const route=`#/${S.portal}/${menu[0]}`;
      if(![...host.querySelectorAll('a')].some(a=>a.getAttribute('href')===route)){
        if(!host.querySelector('a'))host.replaceChildren();
        host.insertAdjacentHTML('afterbegin',`<a href="${E(route)}" data-wallet-search-result><b>${E(T('USDT 入金、提領與多錢包','USDT 入金、提领与多钱包','USDT deposits, withdrawals and wallets'))}</b><small>USDT · TRON (TRC20) · Ethereum (ERC20)</small></a>`);
      }
      host.hidden=false;document.getElementById('global-search')?.setAttribute('aria-expanded','true');
    }
    return result;
  };
  const previousFilter=filterNav;
  filterNav=function(query){
    const result=previousFilter(query),menu=walletMenu();
    if(alias(query)&&menu){
      const link=document.querySelector(`.nav a[href="#/${S.portal}/${menu[0]}"]`);
      if(link){link.closest('li').style.display='';link.closest('.nav-group').style.display='';}
    }
    return result;
  };
  function enhance(){
    if(S.portal!=='cust'||S.page!=='wallets')return;
    const page=document.querySelector('.wallet-workbench-page');if(!page)return;
    const tabs=document.querySelector('.wallet-workbench-tabs');
    if(tabs&&!tabs.parentElement.classList.contains('wallet-workbench-tools')){
      const tools=document.createElement('div');tools.className='wallet-workbench-tools';tabs.before(tools);tools.append(tabs);
      const button=document.createElement('button');button.type='button';button.id='wallet-shared-privacy-toggle';button.className='btn wallet-shared-privacy';
      const hidden=AzureWallets.snapshot()?.preferences.hideBalances===true,label=hidden?T('顯示金額','显示金额','Show amounts'):T('隱藏金額','隐藏金额','Hide amounts');
      button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(hidden));
      button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${hidden?'<path d="m3 3 18 18"/>':''}</svg><span>${E(label)}</span>`;
      button.addEventListener('click',()=>{privacyFocus=true;AzureWallets.preferences({hideBalances:!hidden});});tools.append(button);
    }
    const overview=page.querySelector(':scope>.wallet-classification'),list=page.querySelector(':scope>.wallet-list-card');
    if(overview&&list&&overview.nextElementSibling!==list)list.before(overview);
    const panel=document.querySelector('.page-in .amr-panel');if(panel&&panel.parentElement!==page)page.append(panel);
    page.querySelectorAll('.wallet-list tbody tr').forEach(row=>{
      const labels=[T('錢包','钱包','Wallet'),T('資產／網路','资产／网络','Asset / network'),T('可用結存','可用结存','Available'),T('資料狀態','数据状态','Data status'),T('操作','操作','Actions')];
      [...row.cells].forEach((cell,i)=>cell.dataset.walletLabel=labels[i]||'');
      const button=row.querySelector('button');if(button)button.setAttribute('aria-label',T('選擇錢包：','选择钱包：','Select wallet: ')+(row.cells[0]?.textContent.trim()||''));
    });
    if(privacyFocus){document.getElementById('wallet-shared-privacy-toggle')?.focus({preventScroll:true});privacyFocus=false;}
  }
  const previousAfter=afterRender;
  afterRender=function(...args){const result=previousAfter(...args);enhance();return result;};
  window.AzureWalletUsability={ready:true};enhance();
})();
