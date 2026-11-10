/* Customer-scoped presentation for supplied wallet balances and reference valuation. */
(() => {
  'use strict';
  const API = window.AzureWallets;
  if (!API || !PAGES['cust:wallets']) return;
  const T = (tc, sc, en) => C(tc, sc, en);
  const esc = value => E(value);
  let unsubscribe = null, subscribedMarket = null, returnFocus = '';
  const eye = hidden => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${hidden ? '<path d="m3 3 18 18"/>' : ''}</svg>`;
  function preferences() {
    const p = API.snapshot()?.preferences || {};
    return { hideBalances: p.hideBalances === true, displayCurrency: p.displayCurrency === 'HKD' ? 'HKD' : 'USD', tab: p.tab === 'activity' ? 'activity' : 'wallets' };
  }
  function ownWallets() {
    const items = API.list(), seen = new Set();
    return items.filter(w => {
      if (w.customerId !== CID() || !['fiat', 'crypto'].includes(w.kind)) return false;
      const key = w.kind === 'fiat' ? 'fiat:' + w.asset : 'crypto:' + w.id;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function valuation() {
    const p = preferences(), groups = { total: empty(), fiat: empty(), crypto: empty() };
    for (const w of ownWallets()) {
      const group = groups[w.kind]; group.count++;
      if (!Number.isFinite(w.available) || !Number.isFinite(w.frozen)) { group.missing++; continue; }
      const amount = w.available + w.frozen;
      const rate = w.asset === p.displayCurrency ? 1 : window.AzureMarketRates?.getRate(w.asset, p.displayCurrency);
      if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(amount * rate)) { group.unpriced++; continue; }
      group.valued++; group.amount += amount * rate;
    }
    for (const key of ['fiat', 'crypto']) for (const field of ['count', 'missing', 'unpriced', 'valued', 'amount']) groups.total[field] += groups[key][field];
    return { p, groups, market: window.AzureMarketRates?.status?.() || null };
  }
  function empty() { return { count: 0, missing: 0, unpriced: 0, valued: 0, amount: 0 }; }
  function amountText(group, p) {
    const value = group.valued ? group.amount : null;
    if (typeof API.formatAmount === 'function') return API.formatAmount(value, p.displayCurrency);
    if (p.hideBalances) return '••••';
    return value === null ? T('未提供', '未提供', 'Not supplied') : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function countText(group, key) {
    const unit = key === 'fiat' ? T('個幣種', '个币种', 'currencies') : T('個錢包', '个钱包', 'wallets');
    return T(`${group.count} ${unit} · ${group.valued} 項已估值`, `${group.count} ${unit} · ${group.valued} 项已估值`, `${group.count} ${unit} · ${group.valued} valued`);
  }
  function missingText(group) {
    return T(`結存未提供 ${group.missing} 項 · 匯率未提供 ${group.unpriced} 項`, `结存未提供 ${group.missing} 项 · 汇率未提供 ${group.unpriced} 项`, `${group.missing} missing balances · ${group.unpriced} missing rates`);
  }
  function marketText(state) {
    if (!state) return T('等待市場參考資料；同幣種按 1:1 顯示。', '等待市场参考资料；同币种按 1:1 显示。', 'Waiting for market references; matching currencies use 1:1.');
    if (state.stale || state.error && state.hasData) return T('上次市場參考資料已過期；尚未提供的匯率不計入小計。', '上次市场参考资料已过期；尚未提供的汇率不计入小计。', 'Last market reference is stale. Missing rates are excluded from the subtotal.');
    if (!state.hasData) return state.loading ? T('市場參考查詢中；缺資料的資產尚未計入。', '市场参考查询中；缺资料的资产尚未计入。', 'Loading market references. Assets with missing data are excluded.') : T('市場參考暫不可用；僅顯示可確認的同幣種小計。', '市场参考暂不可用；仅显示可确认的同币种小计。', 'Market references are unavailable. Only confirmed matching-currency values are shown.');
    return state.paused ? T('市場參考更新已暫停；顯示上次取得資料。', '市场参考更新已暂停；显示上次取得资料。', 'Market updates are paused. Showing the last received reference.') : T('市場參考估值；不同於銀行或交易所成交報價。', '市场参考估值；不同于银行或交易所成交报价。', 'Reference valuation; not a bank or exchange execution quote.');
  }
  function overview() {
    const { p, groups, market } = valuation();
    const labels = {
      total: T('已提供資產參考小計', '已提供资产参考小计', 'Supplied asset reference subtotal'),
      fiat: T('銀行／法幣資產', '银行／法币资产', 'Bank / fiat assets'),
      crypto: T('數位資產', '数字资产', 'Digital assets')
    };
    return `<section class="card wallet-classification" aria-labelledby="wallet-classification-title"><div class="wallet-classification-head"><div><h2 id="wallet-classification-title">${T('資產概況', '资产概况', 'Asset overview')}</h2><p>${T('僅加總結存及參考匯率均已提供的資產；未提供項目另外列示。', '仅加总结存及参考汇率均已提供的资产；未提供项目另外列示。', 'Adds assets only when both balances and reference rates are supplied. Missing items are shown separately.')}</p></div><div class="wallet-overview-controls"><button class="btn" type="button" id="wallet-privacy-toggle" aria-pressed="${p.hideBalances}" onclick="AzureWalletWorkbench.togglePrivacy()">${eye(p.hideBalances)}<span>${p.hideBalances ? T('顯示金額', '显示金额', 'Show amounts') : T('隱藏金額', '隐藏金额', 'Hide amounts')}</span></button><div class="field"><label for="wallet-display-currency">${T('顯示幣種', '显示币种', 'Display currency')}</label><select class="select" id="wallet-display-currency" onchange="AzureWalletWorkbench.currency(this.value)"><option value="USD" ${p.displayCurrency === 'USD' ? 'selected' : ''}>USD</option><option value="HKD" ${p.displayCurrency === 'HKD' ? 'selected' : ''}>HKD</option></select></div></div></div><div class="wallet-category-grid">${['total', 'fiat', 'crypto'].map(key => `<article class="wallet-category ${key === 'total' ? 'wallet-category-total' : ''}" data-wallet-category="${key}"><h3>${labels[key]}</h3><div class="wallet-category-value"><span data-wallet-reference-currency>${p.displayCurrency}</span><strong data-wallet-reference="${key}">${esc(amountText(groups[key], p))}</strong></div><p class="small" data-wallet-category-count="${key}">${esc(countText(groups[key], key))}</p><p class="small muted" data-wallet-category-missing="${key}">${esc(missingText(groups[key]))}</p></article>`).join('')}</div><p class="wallet-reference-status ${market?.stale || market?.error ? 'wallet-reference-warning' : ''}" data-wallet-reference-status role="status">${esc(marketText(market))}</p><p class="wallet-classification-note">${T('法幣按幣種匯總一次；同幣種多個銀行戶口不重複計算。數位資產可能含 Demo 模擬結存。', '法币按币种汇总一次；同币种多个银行户口不重复计算。数字资产可能含 Demo 模拟结存。', 'Fiat currencies are counted once across linked bank accounts. Digital assets may include simulated demo balances.')}</p></section>`;
  }
  function tabs(p) {
    return `<div class="wallet-workbench-tabs" role="tablist" aria-label="${T('錢包工作台', '钱包工作台', 'Wallet workbench')}">${[['wallets', T('錢包總覽', '钱包总览', 'Wallets')], ['activity', T('交易紀錄', '交易记录', 'Transactions')]].map(([key, label]) => `<button class="btn ${p.tab === key ? 'primary' : ''}" id="wallet-workbench-tab-${key}" type="button" role="tab" aria-selected="${p.tab === key}" aria-controls="wallet-workbench-panel" tabindex="${p.tab === key ? '0' : '-1'}" data-wallet-workbench-tab="${key}" onclick="AzureWalletWorkbench.tab('${key}')">${label}</button>`).join('')}</div>`;
  }
  const source = PAGES['cust:wallets'];
  PAGES['cust:wallets'] = function (...args) {
    const html = source(...args), p = preferences();
    return html.replace('<div class="wallet-page">', `${tabs(p)}<div class="wallet-page wallet-workbench-page" id="wallet-workbench-panel" role="tabpanel" aria-labelledby="wallet-workbench-tab-${p.tab}" data-wallet-workbench-view="${p.tab}">${overview()}`);
  };
  const UI = window.AzureWalletWorkbench = {
    togglePrivacy() { if (typeof API.preferences === 'function') { returnFocus = 'wallet-privacy-toggle'; API.preferences({ hideBalances: !preferences().hideBalances }); } },
    currency(value) { if (['USD', 'HKD'].includes(value) && typeof API.preferences === 'function') { returnFocus = 'wallet-display-currency'; API.preferences({ displayCurrency: value }); } },
    tab(value) { if (['wallets', 'activity'].includes(value) && typeof API.preferences === 'function') { returnFocus = 'wallet-workbench-tab-' + value; API.preferences({ tab: value }); } }
  };
  function updateReferences() {
    const root = document.querySelector('.wallet-classification');
    if (!root || S.portal !== 'cust' || S.page !== 'wallets') return;
    const { p, groups, market } = valuation();
    for (const key of ['total', 'fiat', 'crypto']) {
      const value = root.querySelector(`[data-wallet-reference="${key}"]`);
      const count = root.querySelector(`[data-wallet-category-count="${key}"]`);
      const missing = root.querySelector(`[data-wallet-category-missing="${key}"]`);
      if (value) value.textContent = amountText(groups[key], p);
      if (count) count.textContent = countText(groups[key], key);
      if (missing) missing.textContent = missingText(groups[key]);
    }
    root.querySelectorAll('[data-wallet-reference-currency]').forEach(el => { el.textContent = p.displayCurrency; });
    const status = root.querySelector('[data-wallet-reference-status]');
    if (status) { status.textContent = marketText(market); status.classList.toggle('wallet-reference-warning', !!(market?.stale || market?.error)); }
  }
  function enhance() {
    if (S.portal !== 'cust') return;
    const market = window.AzureMarketRates;
    if (market?.subscribe && market !== subscribedMarket) { unsubscribe?.(); subscribedMarket = market; unsubscribe = market.subscribe(updateReferences); }
    if (S.page === 'wallets') {
      const page = document.querySelector('.wallet-page');
      if (page && !page.classList.contains('wallet-workbench-page')) {
        const p = preferences();
        page.classList.add('wallet-workbench-page'); page.id = 'wallet-workbench-panel';
        page.dataset.walletWorkbenchView = p.tab; page.setAttribute('role', 'tabpanel');
        page.setAttribute('aria-labelledby', 'wallet-workbench-tab-' + p.tab);
        page.insertAdjacentHTML('beforebegin', tabs(p)); page.insertAdjacentHTML('afterbegin', overview());
      }
      document.querySelectorAll('.wallet-workbench-tabs [role=tab]').forEach(button => {
        button.onkeydown = e => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault();
          const target = e.key === 'Home' ? 'wallets' : e.key === 'End' ? 'activity' : button.dataset.walletWorkbenchTab === 'wallets' ? 'activity' : 'wallets';
          UI.tab(target);
        };
      });
      updateReferences();
      if (returnFocus) { document.getElementById(returnFocus)?.focus({ preventScroll: true }); returnFocus = ''; }
    }
    if (S.page === 'home') {
      const summary = document.querySelector('.wallet-home-summary');
      if (summary && !summary.querySelector('.wallet-workbench-home-categories')) {
        const wallets = ownWallets(), fiat = wallets.filter(w => w.kind === 'fiat').length, crypto = wallets.filter(w => w.kind === 'crypto').length;
        summary.insertAdjacentHTML('beforeend', `<div class="wallet-workbench-home-categories"><span>${T(`銀行／法幣：${fiat} 個幣種`, `银行／法币：${fiat} 个币种`, `Bank / fiat: ${fiat} currencies`)}</span><span>${T(`數位資產：${crypto} 個錢包`, `数字资产：${crypto} 个钱包`, `Digital assets: ${crypto} wallets`)}</span></div>`);
      }
    }
  }
  const sourceAfter = afterRender;
  afterRender = function (...args) { const result = sourceAfter(...args); enhance(); return result; };
  window.addEventListener('pagehide', () => { unsubscribe?.(); unsubscribe = null; subscribedMarket = null; }, { once: true });
  enhance();
})();
