/* Source-backed bank-account overview and aligned FX cards. No balance allocation. */
(() => {
  'use strict';
  const T=(tc,sc,en)=>C(tc,sc,en),esc=value=>E(value);
  let lastCustomer='';
  function model() {
    const id=CID(),accounts=ACCOUNTS.filter(a=>a.cust===id),balances=BALANCES[id];
    const currencies=[...new Set([...accounts.map(a=>a.ccy),...Object.keys(balances||{})])];
    return {id,accounts,groups:currencies.map(currency=>{
      const value=balances?.[currency],known=!!value&&Number.isFinite(value.a)&&Number.isFinite(value.f);
      return {currency,accounts:accounts.filter(a=>a.ccy===currency),known,available:known?value.a:null,frozen:known?value.f:null,total:known?value.a+value.f:null};
    })};
  }
  const notSupplied=()=>T('未提供','未提供','Not supplied');
  const scopeText=count=>T(`${count} 個戶口 · 幣種匯總`,`${count} 个户口 · 币种汇总`,`${count} ${count===1?'account':'accounts'} · currency aggregate`);
  function accountText(account) {
    return `<div class="rfx-account-name"><b>${esc(I18N.tr(account.nick||account.bank||''))}</b>${account.nick&&account.bank?`<span>${esc(I18N.tr(account.bank))}</span>`:''}</div><span class="rfx-account-number mono">${esc(account.no||'—')}</span>`;
  }
  function value(group,key,mobile=false) {
    const keyName=mobile?'data-rfx-mobile-balance':'data-balance';
    return `<span ${keyName}="${key}" ${group.known?'':'data-unavailable="true"'}>${group.known?nf(group[key]):esc(notSupplied())}</span>`;
  }
  function overview(data) {
    const labels=[['available',T('可用','可用','Available')],['frozen',T('凍結','冻结','Frozen')],['total',T('總額','总额','Total')]];
    const body=data.groups.map(group=>{
      const rows=group.accounts.length?group.accounts:[null],count=rows.length;
      return `<tbody data-balance-currency="${esc(group.currency)}" data-account-count="${group.accounts.length}" data-customer-id="${esc(data.id)}">${rows.map((account,i)=>`<tr ${account?`data-rfx-account="${esc(account.no||'')}"`:''}>${i===0?`<th scope="rowgroup" rowspan="${count}" class="rfx-currency"><strong>${esc(group.currency)}</strong><small>${esc(scopeText(group.accounts.length))}</small></th>`:''}<td class="rfx-bank">${account?accountText(account):`<span class="muted">${T('尚未提供銀行戶口資料','尚未提供银行户口资料','No bank account supplied')}</span>`}</td><td>${account?statusBadge(account.status||'—'):'—'}</td>${i===0?labels.map(([key])=>`<td rowspan="${count}" class="r rfx-amount">${value(group,key)}</td>`).join(''):''}</tr>`).join('')}</tbody>`;
    }).join('');
    return `<section class="card rp-balances rfx-accounts" data-rfx-customer="${esc(data.id)}" aria-labelledby="rfx-accounts-title"><div class="card-head"><div><h3 class="card-title" id="rfx-accounts-title">${T('各戶口結存概況','各户口结存概况','Account balance overview')}</h3><p class="small muted">${T('結存按幣種匯總，並非個別銀行戶口結存；同幣種多個戶口只顯示一組合計。未提供的結存不視為 0。','结存按币种汇总，并非个别银行户口结存；同币种多个户口只显示一组合计。未提供的结存不视为 0。','Balances are aggregated by currency, not supplied per bank account. Each currency total appears once; missing balances are not treated as zero.')}</p></div><span class="rfx-scope small">${esc(data.id)} · ${data.accounts.length} ${T('個戶口','个户口','accounts')}</span></div>${data.groups.length?`<div class="tbl-wrap rfx-account-table"><table><thead><tr><th>${T('幣種／結存範圍','币种／结存范围','Currency / balance scope')}</th><th>${T('銀行戶口／帳號','银行户口／账号','Bank account / number')}</th><th>${T('狀態','状态','Status')}</th>${labels.map(([,label])=>`<th class="r">${label}<small>${T('幣種匯總','币种汇总','Currency aggregate')}</small></th>`).join('')}</tr></thead>${body}</table></div><div class="rfx-account-cards">${data.groups.map(group=>`<article class="rfx-account-card" data-rfx-card-currency="${esc(group.currency)}"><div class="rfx-card-heading"><strong>${esc(group.currency)}</strong><small>${esc(scopeText(group.accounts.length))}</small></div><div class="rfx-mobile-accounts">${group.accounts.length?group.accounts.map(account=>`<div class="rfx-mobile-account" data-rfx-mobile-account="${esc(account.no||'')}"><div>${accountText(account)}</div>${statusBadge(account.status||'—')}</div>`).join(''):`<p class="small muted">${T('尚未提供銀行戶口資料','尚未提供银行户口资料','No bank account supplied')}</p>`}</div><dl class="rfx-mobile-values">${labels.map(([key,label])=>`<div><dt>${label}</dt><dd>${value(group,key,true)}</dd></div>`).join('')}</dl></article>`).join('')}</div>`:`<p class="empty">${T('尚未提供戶口或結存資料','尚未提供户口或结存资料','No account or balance data supplied')}</p>`}</section>`;
  }
  function enhance() {
    if(S.portal!=='cust'||S.page!=='fx') {lastCustomer='';return;}
    const page=document.querySelector('.page-in');if(!page)return;
    const data=model();
    let current=page.querySelector('.rp-balances');
    if(current) current.outerHTML=overview(data);
    else page.querySelector(':scope>.page-head')?.insertAdjacentHTML('afterend',overview(data));
    const form=page.querySelector('.fx-box'),layout=form?.parentElement,chart=form?.nextElementSibling;
    if(layout?.classList.contains('grid')&&chart?.classList.contains('card')) {
      layout.classList.add('rfx-layout');chart.classList.add('rfx-chart');
      requestAnimationFrame(()=>{
        const instance=S.charts.find(c=>c.canvas?.id==='fxc');
        if(instance?.canvas?.isConnected) {instance.resize();instance.update('none');}
      });
    }
    if(lastCustomer!==data.id) {const main=document.getElementById('main');if(main)main.scrollTop=0;lastCustomer=data.id;}
  }
  const previousAfter=afterRender;
  afterRender=function(...args){const out=previousAfter(...args);enhance();return out;};
  enhance();
  window.AzureReviewFX={ready:true};
})();
