/* Full administrators can open each customer function without leaving their HQ session. */
(() => {
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const pages = [['home','客戶首頁','客户首页','Customer home'],['accounts','客戶帳戶管理','客户账户管理','Customer accounts'],['statements','對帳單與證明','对账单与证明','Statements and letters'],['pay','全球付款','全球付款','Global payments'],['fx','匯兌中心','汇兑中心','Currency exchange'],['xborder','跨境付款','跨境付款','Cross-border payments'],['txs','客戶交易中心','客户交易中心','Customer transactions'],['cp','交易對手','交易对手','Counterparties'],['settings','客戶團隊與設定','客户团队与设置','Customer team and settings']];
  const cache = new Map();
  let customerId = 'AZ100001', frame = null, frameCustomer = '', channel = '', childMode = false, childCustomer = '', childToken = '', childActor=null;
  const seen={};
  const copy = (tc,sc,en) => C(tc,sc,en);
  const fullAdmin = () => window.AzureBridge?.account?.role === 'hq';
  const getCustomers = () => CUSTOMERS.filter(c => !c.profileDraft);
  const blocked = () => { const c=cust(CID());return c?.status==='冻结'||c?.frz?.scopes?.some(k=>['all','pay'].includes(k)); };
  const noData = page => {
    const c=cust(CID());
    const accounts = page==='accounts' ? `<div class="card"><div class="tbl-wrap"><table><thead><tr><th>银行</th><th>币种</th><th>账户号</th><th>状态</th><th>可用结存</th></tr></thead><tbody>${myAccts().map(a=>`<tr><td>${E(a.bank)}</td><td>${E(a.ccy)}</td><td class="mono">${E(a.no)}</td><td>${statusBadge(a.status)}</td><td>${copy('未提供','未提供','Not supplied')}</td></tr>`).join('')}</tbody></table></div></div>` : '';
    const txs = page==='txs' ? `<div class="card"><div class="tbl-wrap"><table><thead><tr><th>日期</th><th>交易号</th><th>类型</th><th>金额</th><th>状态</th></tr></thead><tbody>${TXS.filter(t=>t.cust===CID()).map(t=>`<tr><td>${E(t.date)}</td><td>${E(t.id)}</td><td>${E(t.type)}</td><td>${t.amt?money(t.amt,t.ccy):'—'}</td><td>${statusBadge(t.status)}</td></tr>`).join('')||`<tr><td colspan="5" class="empty">${copy('沒有已提供的交易紀錄','没有已提供的交易记录','No transaction records supplied')}</td></tr>`}</tbody></table></div></div>` : '';
    return head(I18N.tr(pages.find(p=>p[0]===page)?.[2]||'客户功能'),E(c?.name||'')) + note(copy('此 Demo 尚未提供該客戶的渠道結存及完整銀行資料；不會顯示其他客戶的資產，也不會假設結存為 0。可選星海電子科技有限公司體驗完整付款及匯兌功能。','此 Demo 尚未提供该客户的渠道结存及完整银行资料；不会显示其他客户的资产，也不会假设结存为 0。可选星海电子科技有限公司体验完整付款及汇兑功能。','This demo has no channel balance or complete banking data for this customer. Other customers’ assets are not reused, and missing balances are not treated as zero. Select Star Ocean Electronics for the complete payment and FX demo.')) + accounts + txs;
  };

  // Install before bridge.js so delegated data is scoped before the first render.
  window.azurePrepareSession = data => {
    if (!data.adminContext) return true;
    const context=data.adminContext;
    if (parent===window || parent.AzureBridge?.account?.role!=='hq' || data.account?.role!=='cust' || context.customer?.id!==data.account.id || window.frameElement?.dataset.adminChannel!==context.token) return false;
    if (childMode && childToken===context.token) return true;
    childMode=true;childCustomer=context.customer.id;childToken=context.token;
    childActor={role:'hq',email:parent.AzureBridge.account.email,name:parent.AzureBridge.account.name,customerId:childCustomer};
    document.documentElement.dataset.adminCustomer='true';
    window.CUSTOMERS=[clone(context.customer)];window.ACCOUNTS=clone(context.accounts||[]);window.TXS=clone(context.txs||[]);
    window.CUST_PRICE={[childCustomer]:clone(context.price)};window.FLOORS=clone(context.floors);
    window.BALANCES=context.balance?{[childCustomer]:clone(context.balance)}:{};
    for (const key of ['CPS','WITHDRAW_ACCTS','FROZEN','HELD_RETURNS','BATCHES','FX_ORDERS']) window[key]=clone(context.extra?.[key]||[]);
    window.VA_INFO=clone(context.extra?.VA_INFO||{});window.USERS={[childCustomer]:clone(context.extra?.users||[])};
    for(const key of ['TXS','CPS','BATCHES','FX_ORDERS'])seen[key]=new Set(window[key].map(r=>r.id));
    Object.assign(S,clone(context.drafts||{}));
    if(context.lastPage===context.page) S.ui=clone(context.ui||{});
    window.AzureAdminChild={get customerId(){return childCustomer;},snapshot(){
      const extra=Object.fromEntries(['CPS','WITHDRAW_ACCTS','FROZEN','HELD_RETURNS','BATCHES','FX_ORDERS'].map(k=>[k,clone(window[k])]));extra.VA_INFO=clone(VA_INFO);extra.users=clone(USERS[CID()]||[]);
      const drafts=Object.fromEntries(['pay','fx','wd','xb'].filter(k=>S[k]).map(k=>[k,clone(S[k])]));
      return {customerId:childCustomer,accounts:clone(myAccts()),txs:clone(TXS.filter(t=>t.cust===CID())),balance:clone(BALANCES[CID()]),extra,drafts,ui:clone(S.ui),lastPage:S.page};
    }};
    return true;
  };
  for (const [key] of pages) {
    const source=PAGES['cust:'+key];
    if (!source) continue;
    PAGES['cust:'+key]=()=>{
      if (childMode && key!=='cp' && key!=='settings' && !BALANCES[CID()]) return noData(key);
      if (childMode && ['pay','fx','xborder'].includes(key) && blocked()) return head(I18N.tr(pages.find(p=>p[0]===key)[2]))+note(copy('此客戶的付款功能已凍結，請先在全權後台覆核凍結狀態。','此客户的付款功能已冻结，请先在全权后台复核冻结状态。','Payments are frozen for this customer. Review the freeze status in HQ first.'),'warn');
      return source();
    };
  }

  function capture() {
    if (!frame?.isConnected || !fullAdmin()) return;
    try {
      const state=frame.contentWindow.AzureAdminChild?.snapshot();
      if(!state || state.customerId!==frameCustomer) return;
      cache.set(frameCustomer,clone(state));
      if(state.balance) BALANCES[frameCustomer]=clone(state.balance);
      const accountIndex=ACCOUNTS.findIndex(a=>a.cust===frameCustomer), accounts=ACCOUNTS.filter(a=>a.cust!==frameCustomer);
      accounts.splice(accountIndex<0?accounts.length:accountIndex,0,...clone(state.accounts));ACCOUNTS.splice(0,ACCOUNTS.length,...accounts);
      const existingIds=new Set(TXS.map(t=>t.id)), changed=new Map(state.txs.map(t=>[t.id,clone(t)]));
      const added=state.txs.filter(t=>!existingIds.has(t.id)).map(clone);
      const updated=TXS.flatMap(t=>t.cust===frameCustomer?(changed.has(t.id)?[changed.get(t.id)]:[]):[t]);
      TXS.splice(0,TXS.length,...added,...updated);
    } catch { /* A replaced or not-yet-ready child has no session to preserve. */ }
  }
  function payload(id,page) {
    const c=cust(id), saved=cache.get(id), sample=id==='AZ100001';
    const extra=saved?.extra || (sample?Object.fromEntries(['CPS','WITHDRAW_ACCTS','FROZEN','HELD_RETURNS','BATCHES','FX_ORDERS','VA_INFO'].map(k=>[k,clone(window[k])])):{});
    extra.users=saved?.extra?.users || clone(USERS[id]||[]);
    return {customer:clone(c),accounts:clone(ACCOUNTS.filter(a=>a.cust===id)),txs:clone(TXS.filter(t=>t.cust===id)),price:clone(CUST_PRICE[id]),floors:clone(FLOORS),balance:clone(BALANCES[id]),extra:clone(extra),drafts:clone(saved?.drafts||{}),ui:clone(saved?.ui||{}),lastPage:saved?.lastPage,page,token:channel};
  }
  function sendSession() {
    if (!frame?.isConnected || !fullAdmin() || !cust(frameCustomer)) return;
    const c=cust(frameCustomer), page=S.page.replace(/^customer-/,'');
    frame.contentWindow.postMessage({type:'azure-session',account:{role:'cust',id:c.id,name:AzureBridge.account.name,organization:c.name,email:c.email||(c.id==='AZ100001'?ME.cust.email:'')},locale:I18N.lang,base:azureBase,adminContext:payload(c.id,page)},location.origin);
  }
  function mount(page) {
    if(!fullAdmin())return;
    const host=document.getElementById('admin-customer-host');if(!host)return;
    channel=crypto.randomUUID();frameCustomer=customerId;
    frame=document.createElement('iframe');frame.className='admin-customer-frame';frame.title=copy('全權管理 · 客戶 eBanking','全权管理 · 客户 eBanking','Administrator · Customer eBanking');frame.allow='camera';frame.dataset.adminChannel=channel;
    frame.src='index.html?v=20261020-admin#/cust/'+page;frame.addEventListener('load',sendSession);host.replaceChildren(frame);
  }
  window.adminSelectCustomer = id => {
    if(!fullAdmin() || !getCustomers().some(c=>c.id===id))return;
    capture();customerId=id;S.ui={};render();
  };
  window.adminOpenCustomer = (id,page='home') => {
    if(!fullAdmin() || !getCustomers().some(c=>c.id===id) || !pages.some(p=>p[0]===page))return;
    capture();customerId=id;go('hq','customer-'+page);
  };
  const menuRows=[];
  for (const [key,tc,sc,en] of pages) {
    const route='customer-'+key;
    const menu=[route,sc];menuRows.push([menu,tc,sc,en]);MENUS.hq.push(menu);NAVICON[route]=NAVICON[key]||NAVICON.dashboard;
    PAGES['hq:'+route]=()=>{
      if(!fullAdmin())return '';
      const customers=getCustomers();if(!customers.some(c=>c.id===customerId))customerId=customers[0]?.id;
      const c=cust(customerId);if(!c)return head(copy('客戶 eBanking','客户 eBanking','Customer eBanking'));
      AFTER.push(()=>mount(key));
      return head(copy('客戶 eBanking','客户 eBanking','Customer eBanking'),copy('以全權管理者身分操作所選客戶的功能；目前為本機 Demo。','以全权管理者身份操作所选客户的功能；目前为本机 Demo。','Use customer functions as the full administrator. All activity remains in this local demo.'))+
        `<section class="card admin-customer-context"><div class="field"><label for="admin-customer-select">${copy('目前客戶','当前客户','Current customer')}</label><select class="select" id="admin-customer-select" onchange="adminSelectCustomer(this.value)">${customers.map(c=>`<option value="${E(c.id)}" ${c.id===customerId?'selected':''}>${E(c.id)} · ${E(I18N.tr(c.name))}</option>`).join('')}</select></div><div><span class="badge info">${copy('全權操作','全权操作','Administrator access')}</span><strong>${copy(tc,sc,en)}</strong></div></section><div id="admin-customer-host" class="admin-customer-host"></div>`;
    };
  }
  const group=['客戶 eBanking',pages.map(([key])=>'customer-'+key)];NAV_GROUPS.hq.splice(2,0,group);

  const sourceRender=render;
  render=function(...args){
    if(!childMode)capture();
    else for(const key of ['TXS','CPS','BATCHES','FX_ORDERS'])for(const row of window[key])if(!seen[key].has(row.id)){
      row.adminActor=clone(childActor);row.customerId=childCustomer;if(key==='TXS')row.maker=childActor.email;seen[key].add(row.id);
    }
    menuRows.forEach(([row,tc,sc,en])=>row[1]=copy(tc,sc,en));group[0]=copy('客戶 eBanking','客户 eBanking','Customer eBanking');return sourceRender(...args);
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const sourceDetail=custDetail;
    custDetail=function(id){
      sourceDetail(id);
      if(fullAdmin()&&getCustomers().some(c=>c.id===id))document.querySelector('.modal-foot')?.insertAdjacentHTML('afterbegin',`<button class="btn" onclick="closeModal();adminOpenCustomer('${id}')">${copy('開啟客戶 eBanking','打开客户 eBanking','Open customer eBanking')}</button>`);
    };
  });
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin || !fullAdmin() || e.source!==frame?.contentWindow || !frame?.isConnected)return;
    if(e.data?.type==='azure-ready')sendSession();
    if(e.data?.type==='azure-activity')sendParent('azure-activity');
    if(e.data?.type==='azure-public' && typeof e.data.route==='string' && /^#\/(apply|join)\//.test(e.data.route))sendParent('azure-public',{route:e.data.route});
    if(e.data?.type==='azure-locale' && e.data.locale!==I18N.lang)I18N.set(e.data.locale);
    if(e.data?.type==='azure-logout'){capture();go('hq','customers');}
    if(e.data?.type==='admin-customer-route' && pages.some(p=>p[0]===e.data.page) && S.page!=='customer-'+e.data.page){capture();go('hq','customer-'+e.data.page);}
  });
  window.addEventListener('hashchange',()=>{if(childMode&&pages.some(p=>p[0]===S.page))sendParent('admin-customer-route',{page:S.page});});
})();
