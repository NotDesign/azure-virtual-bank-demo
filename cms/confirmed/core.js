// ===== core: state, helpers, engine, layout, router =====
const $ = (s, el = document) => el.querySelector(s);
const S = {
  theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  portal: 'hq', page: 'dashboard', arg: null, charts: [], ui: {},
};
const ME = {
  hq: { org: 'HQ', user: '平台管理员', email: 'stephen@ourbank.example', orgName: '总后台 · 平台方/自营' },
  l1: { org: 'A001', user: '黄经理', email: 'ops@ganghuitong.example', orgName: '一级代理 · 港汇通顾问' },
  l2: { org: 'B007', user: '陈先生', email: 'chan@chanstudio.example', orgName: '二级代理 · 陈氏商务工作室' },
  cust: { org: 'AZ100001', user: '李小姐', email: 'finance@starocean.example', orgName: '星海电子科技有限公司' },
};
const PORTAL_NAME = { hq: '总后台', l1: '一级代理', l2: '二级代理', cust: '客户 eBanking' };

// ---------- format ----------
const nf = (n, dp = 2) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }));
const money = (n, ccy = 'HKD', dp = 2) => `<span class="num">${ccy} ${nf(n, dp)}</span>`;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const prod = (code) => PRODUCTS.find((p) => p.code === code);
const cust = (id) => CUSTOMERS.find((c) => c.id === id);
const agent = (id) => AGENTS.find((a) => a.id === id);
const priceStr = (code, v) => { const p = prod(code); if (v == null || v === '') return '—'; return p.unit === 'pct' ? nf(v, 2) + '%' : p.unit === 'bps' ? v + ' bps' : 'HKD ' + nf(v, 0); };
const ownerLabel = (c) => (!c.l1 ? '<span class="badge acc">自营</span>' : `<span class="small">${agent(c.l1).name}</span>${c.l2 ? `<div class="small muted">↳ ${agent(c.l2).name}</div>` : '<div class="small muted">一级直属</div>'}`);
const statusBadge = (s) => {
  const m = { '已开通': 'ok', '成功': 'ok', '正常': 'ok', '启用': 'ok', '已生效': 'ok', '已审核': 'ok', '已结算': 'ok', '可申请': 'ok',
    '待 CS 补录': 'warn', '待补件': 'warn', '待合规审核': 'info', '待董事验证': 'info', '渠道审核中': 'info', '已提交渠道': 'info', 'OCR 中': 'info',
    '处理中': 'info', '审核中': 'info', '已发送 Allinpay': 'info', '可结算': 'acc', '待结算': '', '待发送': 'warn', '待复核': 'warn', '待渠道确认': 'warn',
    '冻结': 'err', '已交割': 'ok', '已取消': '', '新增待审核': 'warn', '修改待审核': 'warn', '审核不通过': 'err', '已冻结': 'err', '已关闭': '', '待提交': '', '待完善': 'warn', '已进件': 'ok', '进件中': 'info', '未进件': '', '进件失败': 'err', '无需进件': '', '失败': 'err', '处理成功': 'ok', '处理失败': 'err', '导入中': 'info', '部分成功': 'warn', '已生成': 'ok', '待审批': 'warn', '已失效': '', '已转移': 'info', '渠道驳回': 'err', '已拒绝': 'err', '停用': 'err', '规划中': '', '暂估': 'warn', '待回复': 'warn', '已回复': 'info', '逾期': 'err', '退回补充': 'warn', '已结案': 'ok', '已撤销': '', '已解冻': 'ok', '调单': 'info', '调单结案': 'ok', '调单撤销': '', '调单退回': 'warn', '止付': 'err' };
  return `<span class="badge ${m[s] ?? ''}">${s}</span>`;
};

// ---------- engine (PRD 4.2 / 4.5) ----------
function floorOf(c, code) { return c.l1 ? FLOORS[c.l1][code] : prod(code).cost; }
// commission follows the owner at the time of the transaction (snapshot), so re-assignment only affects future transactions
const txL1 = (t) => (t.l1 !== undefined ? t.l1 : cust(t.cust).l1);
const txL2 = (t) => (t.l2 !== undefined ? t.l2 : cust(t.cust).l2);
function split(tx) {
  const c0 = cust(tx.cust), c = { ...c0, l1: txL1(tx), l2: txL2(tx) }, p = prod(tx.prod), price = CUST_PRICE[c.id][tx.prod], floor = floorOf(c, tx.prod);
  const baseH = tx.amt * FXR[tx.ccy];
  let fee, cost, margin, l1;
  if (p.unit === 'pct') { fee = baseH * price / 100; cost = baseH * p.cost / 100; l1 = baseH * (price - floor) / 100; }
  else if (p.unit === 'fixed') { fee = price; cost = p.cost; l1 = price - floor; }
  else { fee = baseH * price / 10000; cost = fee * p.share; l1 = baseH * (price - floor) / 10000 * (1 - p.share); }
  margin = fee - cost;
  if (!c.l1) l1 = 0;
  const ratio = c.l2 ? (L2RATIO[c.l2][tx.prod] || 0) : 0;
  const l2 = l1 * ratio / 100;
  const actual = fee * (tx.adj || 1);
  return { expected: fee, actual, diff: actual - fee, cost, margin, l1, l2, l1net: l1 - l2, hq: margin - l1, est: p.unit === 'bps' };
}
function settleInfo(tx) {
  const d = addDays(tx.date, 15);
  const st = d <= '2026-10-01' ? '已结算' : d <= TODAY ? '可结算' : '待结算';
  return { date: d, status: st };
}
function calcExample(code, amountHKD, price, floor, ratio, hasL2 = true) {
  const p = prod(code); let fee, cost, l1;
  if (p.unit === 'pct') { fee = amountHKD * price / 100; cost = amountHKD * p.cost / 100; l1 = amountHKD * (price - floor) / 100; }
  else if (p.unit === 'fixed') { fee = price; cost = p.cost; l1 = price - floor; }
  else { fee = amountHKD * price / 10000; cost = fee * p.share; l1 = amountHKD * (price - floor) / 10000 * (1 - p.share); }
  const l2 = hasL2 ? l1 * ratio / 100 : 0;
  return { fee, cost, margin: fee - cost, l1, l2, l1net: l1 - l2, hq: fee - cost - l1 };
}

// ---------- scope ----------
function custsInScope() {
  const o = ME[S.portal].org;
  if (S.portal === 'hq') return CUSTOMERS;
  if (S.portal === 'l1') return CUSTOMERS.filter((c) => c.l1 === o);
  if (S.portal === 'l2') return CUSTOMERS.filter((c) => c.l2 === o);
  return CUSTOMERS.filter((c) => c.id === o);
}
function txsInScope() { const o = ME[S.portal].org; if (S.portal === 'l1') return TXS.filter((t) => txL1(t) === o); if (S.portal === 'l2') return TXS.filter((t) => txL2(t) === o); const ids = new Set(custsInScope().map((c) => c.id)); return TXS.filter((t) => ids.has(t.cust)); }
function appsInScope() {
  const o = ME[S.portal].org;
  if (S.portal === 'hq') return APPLICATIONS;
  if (S.portal === 'l1') return APPLICATIONS.filter((a) => a.owner === o);
  return APPLICATIONS.filter((a) => a.l2 === o);
}
function myEarn(sp) { return S.portal === 'hq' ? sp.hq : S.portal === 'l1' ? sp.l1net : S.portal === 'l2' ? sp.l2 : 0; }
const volH = (t) => t.amt * FXR[t.ccy];

// ---------- ui helpers ----------
function toast(msg) { const w = $('#toasts'); const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = msg; w.appendChild(d); setTimeout(() => d.remove(), 3200); }
function modal(title, body, foot = '', wide = false) {
  closeModal();
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" onclick="closeModal()" aria-label="关闭">${ICON.x}</button></div><div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }
function kpi(label, value, foot = '') { return `<div class="card kpi"><div class="kpi-label">${kpiIcon(label)}${label}</div><div class="kpi-value">${String(value).replace(/^(<span class="num">)?(HKD|USD|CNH|EUR) /, (m, sp) => (sp || '') + '<span class="kpi-ccy">' + m.replace(sp || '', '').trim() + '</span>')}</div>${foot ? `<div class="kpi-foot">${foot}</div>` : ''}</div>`; }
function head(title, desc = '', actions = '', crumb = '') { return `<div class="page-head"><div>${crumb ? `<div class="crumb">${crumb}</div>` : ''}<h1 class="page-title">${title}</h1>${desc ? `<p class="page-desc">${desc}</p>` : ''}</div><div class="btn-row">${actions}</div></div>`; }
function tabs(key, list, cur) { return `<div class="tabs">${list.map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" onclick="setUI('${key}','${k}')">${l}</button>`).join('')}</div>`; }
function setUI(k, v) { S.ui[k] = v; render(); }
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function chart(id, cfg) { const el = document.getElementById(id); if (!el || !window.Chart) return; S.charts.push(new Chart(el, cfg)); }
function note(html, cls = '') { return `<div class="note ${cls}">${ICON.info}<div>${html}</div></div>`; }

const ICON = {
  search: '<svg class="s-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  more: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
};
const NI = (d) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const NAVICON = {
  dashboard: NI('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
  customers: NI('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
  apps: NI('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>'),
  links: NI('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  apply: NI('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  accounts: NI('<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>'),
  txs: NI('<path d="M7 16V4M7 4 3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/>'),
  pricing: NI('<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  agents: NI('<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v4M12 12l-5 4.5M12 12l5 4.5"/>'),
  commission: NI('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  revenue: NI('<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>'),
  channels: NI('<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>'),
  settings: NI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  home: NI('<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>'),
  fx: NI('<path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12"/>'),
  pay: NI('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
  risk: NI('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  recruit: NI('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>'),
  statements: NI('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h8"/>'),
  xborder: NI('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  cp: NI('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 9h3M15 13h3"/>'),
};
const MENUS = {
  hq: [['dashboard', '仪表盘'], ['customers', '客户管理'], ['apps', '开户申请工作台'], ['links', '开户链接 / QR'], ['apply', '代客录入'], ['accounts', '账户管理'], ['txs', '交易管理'], ['pricing', '产品与费率'], ['risk', '风控与调单'], ['agents', '代理管理'], ['recruit', '代理招募与审批'], ['commission', '佣金管理'], ['revenue', '收益统计'], ['channels', '渠道管理'], ['settings', '设置']],
  l1: [['dashboard', '仪表盘'], ['links', '开户链接 / QR'], ['apply', '代客申请'], ['apps', '申请进度'], ['customers', '我的客户'], ['pricing', '客户费率'], ['agents', '二级代理管理'], ['recruit', '二级招募与审批'], ['txs', '交易查询'], ['commission', '佣金报表'], ['settings', '设置']],
  l2: [['dashboard', '仪表盘'], ['links', '开户链接 / QR'], ['apply', '代客申请'], ['apps', '申请进度'], ['customers', '我的客户'], ['txs', '交易查询'], ['commission', '佣金'], ['settings', '设置']],
  cust: [['home', '首页'], ['accounts', '账户管理'], ['statements', '对账单与证明'], ['pay', '全球付款'], ['fx', '汇兑中心'], ['xborder', '跨境付款'], ['txs', '交易中心'], ['cp', '交易对手'], ['settings', '团队与设置']],
};
const NAV_GROUPS = {
  hq: [['概览', ['dashboard']], ['客户与开户', ['customers', 'apps', 'links', 'apply']], ['资金与交易', ['accounts', 'txs', 'risk']], ['代理', ['agents', 'recruit', 'commission']], ['定价与收益', ['pricing', 'revenue']], ['系统', ['channels', 'settings']]],
  l1: [['概览', ['dashboard']], ['开户', ['links', 'apply', 'apps']], ['客户', ['customers', 'pricing']], ['代理与收益', ['agents', 'recruit', 'txs', 'commission']], ['系统', ['settings']]],
  l2: [['概览', ['dashboard']], ['开户', ['links', 'apply', 'apps']], ['业务', ['customers', 'txs', 'commission']], ['系统', ['settings']]],
  cust: [['账户', ['home', 'accounts', 'statements']], ['收付与汇兑', ['pay', 'fx', 'xborder']], ['管理', ['txs', 'cp', 'settings']]],
};
const TAB_PICK = { hq: ['dashboard', 'customers', 'apps', 'txs'], l1: ['dashboard', 'customers', 'agents', 'commission'], l2: ['dashboard', 'customers', 'txs', 'commission'], cust: ['home', 'accounts', 'fx', 'pay'] };
function tabbar() {
  const items = TAB_PICK[S.portal].map((k) => { const l = MENUS[S.portal].find((m) => m[0] === k)[1]; return `<a href="#/${S.portal}/${k}" class="${S.page === k ? 'on' : ''}">${NAVICON[k] || NAVICON.dashboard}<span>${l.replace(/ \/.*$/, '').replace('开户申请工作台', '申请').replace('二级代理管理', '二级').replace('佣金报表', '佣金')}</span></a>`; }).join('');
  return `<nav class="tabbar" aria-label="主导航">${items}<a href="javascript:void 0" onclick="moreMenu()" class="${TAB_PICK[S.portal].includes(S.page) ? '' : 'on'}">${ICON.more}<span>更多</span></a></nav>`;
}
function moreMenu() {
  modal('全部功能', `<div class="ios-list">${MENUS[S.portal].map(([k, l]) => `<a class="ios-row" href="#/${S.portal}/${k}" onclick="closeModal()"><span class="ios-ic" style="background:var(--accent)">${NAVICON[k] || NAVICON.dashboard}</span><span class="ios-main">${l}</span><span class="chev">›</span></a>`).join('')}</div>`);
}
function filterNav(q) {
  q = q.trim();
  document.querySelectorAll('.nav-group').forEach((g) => { let any = false; g.querySelectorAll('li').forEach((li) => { const hit = !q || li.textContent.includes(q); li.style.display = hit ? '' : 'none'; any ||= hit; }); g.style.display = any ? '' : 'none'; });
}
// Settings-style KPI icons
const KPI_IC = [
  [/申请/, '#ff9f0a', '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'],
  [/佣金|结算/, '#34c759', '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 15h2"/>'],
  [/收益|毛利/, '#af52de', '<path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/>'],
  [/费用|费/, '#ff3b30', '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.5-.6-3.1-1.6M12 6v2M12 16v2"/>'],
  [/交易|额/, '#30b0c7', '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>'],
  [/客户|二级|代理/, '#0071e3', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'],
];
function kpiIcon(label) { const m = KPI_IC.find(([r]) => r.test(label)); if (!m) return ''; return `<span class="kpi-ic" style="background:${m[1]}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m[2]}</svg></span>`; }
const LOGO = `<svg viewBox="0 0 32 32" fill="none" aria-label="平台标志"><rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="currentColor" stroke-width="2"/><path d="M9 21V11l7 6 7-6v10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="24.5" r="1.6" fill="var(--accent)"/></svg>`;

// ---------- layout & router ----------
function go(portal, page = null, arg = null) {
  location.hash = `#/${portal}/${page || MENUS[portal][0][0]}${arg ? '/' + arg : ''}`;
}
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'apply' && parts[1]) { S.portal = 'public'; S.page = 'apply'; S.arg = parts[1]; return; }
  if (parts[0] === 'join' && parts[1]) { S.portal = 'public'; S.page = 'join'; S.arg = parts[1]; return; }
  const p = MENUS[parts[0]] ? parts[0] : 'hq';
  S.portal = p; S.page = parts[1] || MENUS[p][0][0]; S.arg = parts[2] || null;
}
function toggleTheme() { S.theme = S.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = S.theme; render(); }

function shell(content) {
  const me = ME[S.portal];
  const appCount = appsInScope().filter((a) => !['已开通', '渠道驳回', '已拒绝'].includes(a.status)).length;
  const l2off = S.portal === 'l2' && !agent(me.org).proxyApply;
  const navItem = ([k, l]) => {
    const dis = k === 'apply' && l2off;
    return `<li><a href="#/${S.portal}/${k}" class="${S.page === k || (S.page === 'app' && k === 'apps') ? 'active' : ''} ${dis ? 'disabled' : ''}">${NAVICON[k] || NAVICON.dashboard}<span>${l}</span>${k === 'apps' && appCount ? `<span class="cnt">${appCount}</span>` : ''}</a></li>`;
  };
  const groups = NAV_GROUPS[S.portal];
  const nav = groups.map(([g, keys]) => `<li class="nav-group">${g ? `<div class="nav-h">${g}</div>` : ''}<ul>${keys.map((k) => navItem(MENUS[S.portal].find((m) => m[0] === k))).join('')}</ul></li>`).join('');
  return `<div class="app">
    <aside class="sidebar">
      <div class="brand"><img class="brand-mark" src="./assets/azure-mark.png" alt="Azure 标志"><div><img class="brand-word" src="./assets/azure-word.png" alt="Azure"><div class="brand-sub" data-notr>Accounts · Payments ·<br>Global Transfers</div></div></div>
      <div class="side-search">${ICON.search}<input type="search" placeholder="搜索" aria-label="搜索菜单" oninput="filterNav(this.value)"></div>
      <div class="portal-tag">${PORTAL_NAME[S.portal]}</div>
      <ul class="nav">${nav}</ul>
      <div class="sidebar-foot">原型 v0.3 · 示例数据<br/>渠道：Allinpay（渠道代扣）</div>
    </aside>
    <header class="header">
      <div class="portal-switch" role="tablist" aria-label="切换端">
        ${['hq', 'l1', 'l2', 'cust'].map((p) => `<button class="${p === S.portal ? 'on' : ''}" onclick="go('${p}')">${PORTAL_NAME[p]}</button>`).join('')}
        <button onclick="location.hash='#/apply/B007-01'">客户申请页</button>
        <button onclick="location.hash='#/join/HQ-AG-01'">代理注册页</button>
      </div>
      <div class="spacer"></div>
      <button class="icon-btn" aria-label="通知" onclick="toast('3 条新通知：2 份申请待补录，1 张费率配置单待发送')">${ICON.bell}</button>
      ${I18N.switcher()}
      <button class="icon-btn" aria-label="切换明暗" onclick="toggleTheme()">${S.theme === 'dark' ? ICON.sun : ICON.moon}</button>
      <div class="who"><div class="avatar">${me.user.slice(0, 1)}</div><div><div class="who-name">${me.user}</div><div class="who-org">${me.orgName}</div></div></div>
    </header>
    <main class="main" id="main"><div class="page-in">${content}</div></main>
    ${tabbar()}
  </div>`;
}
function render() {
  S.charts.forEach((c) => c.destroy()); S.charts = [];
  document.documentElement.dataset.theme = S.theme;
  document.documentElement.dataset.portal = S.portal === 'public' ? 'cust' : S.portal;
  const root = $('#root');
  if (S.portal === 'public') { root.innerHTML = S.page === 'join' ? publicJoin() : publicApply(); afterRender(); return; }
  const fn = PAGES[S.portal + ':' + S.page] || PAGES['*:' + S.page];
  const html = fn ? fn() : `<div class="empty">页面不存在</div>`;
  const keepScroll = $('#main') ? $('#main').scrollTop : 0;
  root.innerHTML = shell(html);
  if (S._samePage) $('#main').scrollTop = keepScroll;
  afterRender();
}
const AFTER = [];
function afterRender() { while (AFTER.length) { try { AFTER.shift()(); } catch (e) { console.error(e); } } }
const PAGES = {};
window.addEventListener('hashchange', () => { if (typeof closeModal === 'function') closeModal(); const prev = S.portal + S.page; parseHash(); S._samePage = prev === S.portal + S.page; if (!S._samePage) { S.ui = S.nextUI || {}; S.wiz = null; } S.nextUI = null; render(); });
