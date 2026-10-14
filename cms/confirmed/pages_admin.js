// ===== admin pages: HQ / L1 / L2 =====
const MONTH = '2026-10';

// ---------- dashboard ----------
PAGES['*:dashboard'] = () => {
  const cs = custsInScope(), txs = txsInScope();
  const m = txs.filter((t) => t.date.startsWith(MONTH));
  const vol = m.filter((t) => t.amt).reduce((a, t) => a + volH(t), 0);
  const sp = m.map(split);
  const fees = sp.reduce((a, s) => a + s.actual, 0);
  const earn = sp.reduce((a, s) => a + myEarn(s), 0);
  const apps = appsInScope().filter((a) => !['已开通', '渠道驳回', '已拒绝'].includes(a.status)).length;
  const earnLabel = { hq: '本月全权管理者净收益', l1: '本月一级净佣金', l2: '本月二级佣金' }[S.portal];
  const desc = { hq: '全平台：自营、一级、二级的客户和交易汇总', l1: '自己的直属客户 + 下属二级代理的客户', l2: '我推荐的客户与佣金' }[S.portal];
  // daily series last 30 days
  const days = []; for (let i = 29; i >= 0; i--) days.push(addDays(TODAY, -i));
  const series = days.map((d) => txs.filter((t) => t.date === d && t.amt).reduce((a, t) => a + volH(t), 0) / 1000);
  const byProd = PRODUCTS.map((p) => sp.filter((_, i) => m[i].prod === p.code).reduce((a, s) => a + myEarn(s), 0));
  AFTER.push(() => {
    const acc = cssVar('--accent'), grid = cssVar('--color-divider'), txt = cssVar('--color-text-muted');
    chart('dVol', { type: 'bar', data: { labels: days.map((d) => d.slice(5)), datasets: [{ data: series, backgroundColor: acc, borderRadius: 3 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => 'HKD ' + nf(c.raw * 1000, 0) } } }, scales: { x: { grid: { display: false }, ticks: { color: txt, maxTicksLimit: 8 } }, y: { grid: { color: grid }, ticks: { color: txt, callback: (v) => v + 'k' } } } } });
    chart('dProd', { type: 'doughnut', data: { labels: PRODUCTS.map((p) => p.name), datasets: [{ data: byProd.map((v) => Math.max(0, +v.toFixed(2))), backgroundColor: ['#0071e3', '#30b0c7', '#ff9f0a', '#ff3b30', '#af52de', '#34c759', '#aeaeb2'], borderWidth: 0 }] },
      options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: txt, boxWidth: 10, font: { size: 12 } } } } } });
  });
  let ownerTbl = '';
  if (S.portal === 'hq') {
    const groups = [['自营', (c) => !c.l1], ...AGENTS.filter((a) => a.level === 1).map((a) => [a.name, (c) => c.l1 === a.id])];
    ownerTbl = `<div class="card mt"><div class="card-head"><h3 class="card-title">按归属汇总（本月）</h3><span class="card-sub">客户费用由 Allinpay 扣，金额来自渠道回传</span></div><div class="tbl-wrap"><table><thead><tr><th>归属</th><th class="r">客户数</th><th class="r">交易额 (HKD)</th><th class="r">客户费用</th><th class="r">渠道成本</th><th class="r">代理佣金</th><th class="r">全权管理者收益</th></tr></thead><tbody>${groups.map(([n, f]) => {
      const ids = new Set(CUSTOMERS.filter(f).map((c) => c.id)); const mt = m.filter((t) => ids.has(t.cust)); const s = mt.map(split);
      const sum = (k) => s.reduce((a, x) => a + x[k], 0);
      return `<tr><td class="bold">${n}</td><td class="r">${ids.size}</td><td class="r">${nf(mt.filter((t) => t.amt).reduce((a, t) => a + volH(t), 0), 0)}</td><td class="r">${nf(sum('actual'))}</td><td class="r">${nf(sum('cost'))}</td><td class="r">${nf(sum('l1'))}</td><td class="r bold">${nf(sum('hq'))}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  }
  const recent = txs.slice(0, 6);
  return head('仪表盘', desc, `<button class="btn" onclick="go('${S.portal}','links')">${ICON.plus} 生成开户链接</button>`) +
    `<div class="grid g5">${kpi('客户数', cs.length, `${cs.filter((c) => c.status === '已开通').length} 个已开通`)}${kpi('本月交易额', 'HKD ' + nf(vol / 1e6, 2) + 'M', '入账 + 付款 + 换汇，折港币')}${kpi('本月客户费用', 'HKD ' + nf(fees, 0), 'Allinpay 代扣')}${kpi(earnLabel, 'HKD ' + nf(earn, 0), S.portal === 'hq' ? '平台毛利 − 一级佣金' : 'T+15 结算')}${kpi('进行中申请', apps, '<a class="link" href="#/' + S.portal + '/apps">查看</a>')}</div>
    <div class="grid g3 mt"><div class="card span2"><div class="card-head"><h3 class="card-title">近 30 天交易额</h3><span class="card-sub">千港币</span></div><div class="chart-box"><canvas id="dVol"></canvas></div></div>
    <div class="card"><div class="card-head"><h3 class="card-title">本月收益构成</h3><span class="card-sub">按产品</span></div><div class="chart-box" style="height:300px"><canvas id="dProd"></canvas></div></div></div>
    ${ownerTbl}
    <div class="card mt"><div class="card-head"><h3 class="card-title">最新交易</h3><a class="link" href="#/${S.portal}/txs">全部交易</a></div><div class="tbl-wrap">${txTable(recent, true)}</div></div>`;
};

// ---------- transactions ----------
function txTable(list, compact = false) {
  const P = S.portal;
  const extra = P === 'hq' ? '<th class="r">一级佣金</th><th class="r">二级佣金</th><th class="r">全权管理者收益</th>' : P === 'l1' ? '<th class="r">一级净佣金</th><th class="r">二级佣金</th>' : '<th class="r">我的佣金</th>';
  if (!list.length) return '<div class="empty">没有符合条件的交易</div>';
  return `<table><thead><tr><th>日期</th><th>交易号</th><th>客户</th><th>类型</th><th>对手方 / 说明</th><th class="r">金额</th><th class="r">客户费用（实际）</th>${compact ? '' : '<th>核对</th>'}${extra}<th>状态</th></tr></thead><tbody>${list.map((t) => {
    const s = split(t), c = cust(t.cust);
    const chk = Math.abs(s.diff) > 0.5 ? `<span class="badge err" title="应收 ${nf(s.expected)}">差异 ${nf(s.diff)}</span>` : s.est ? '<span class="badge warn">换汇暂估</span>' : '<span class="badge ok">一致</span>';
    const ex = P === 'hq' ? `<td class="r">${nf(s.l1)}</td><td class="r">${nf(s.l2)}</td><td class="r bold">${nf(s.hq)}</td>` : P === 'l1' ? `<td class="r bold">${nf(s.l1net)}</td><td class="r">${nf(s.l2)}</td>` : `<td class="r bold">${nf(s.l2)}</td>`;
    return `<tr><td>${t.date}</td><td class="mono">${t.id}</td><td>${c.name}</td><td>${t.type}</td><td class="muted">${t.cp}</td><td class="r">${t.amt ? money(t.amt, t.ccy) : '—'}</td><td class="r">${money(s.actual)}</td>${compact ? '' : `<td>${chk}</td>`}${ex}<td>${statusBadge(t.status)}</td></tr>`;
  }).join('')}</tbody></table>`;
}
PAGES['*:txs'] = () => {
  const f = S.ui.txType || '全部', q = (S.ui.q || '').toLowerCase();
  let list = txsInScope();
  if (f !== '全部') list = list.filter((t) => t.type === f);
  if (q) list = list.filter((t) => cust(t.cust).name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  const types = ['全部', '入账', '付款', '换汇', '开户费', '月费'];
  const mism = txsInScope().filter((t) => Math.abs(split(t).diff) > 0.5).length;
  return head(S.portal === 'hq' ? '交易管理' : '交易查询', S.portal === 'hq' ? '全部客户的交易。客户费用由 Allinpay 扣，系统按已生效费率核对' : '名下所有客户的交易（含交易金额）',
    `<button class="btn" onclick="toast('已导出 CSV（示例）')">${ICON.dl} 导出 CSV</button>`) +
    (mism && S.portal === 'hq' ? note(`<b>${mism} 笔交易的实际费用和应收不一致。</b>可能是 Allinpay 还没有按新费率执行。请到「产品与费率 → 渠道费率配置单」跟进。`, 'warn') + '<div class="mt"></div>' : '') +
    `<div class="card"><div class="toolbar"><div class="chip-row">${types.map((t) => `<button class="chip ${t === f ? 'on' : ''}" onclick="setUI('txType','${t}')">${t}</button>`).join('')}</div><div class="spacer" style="flex:1"></div><input class="input" placeholder="搜索客户或交易号" value="${S.ui.q || ''}" onchange="setUI('q',this.value)"/></div><div class="tbl-wrap">${txTable(list)}</div></div>`;
};

// ---------- customers ----------
PAGES['*:customers'] = () => {
  const q = (S.ui.q || '').toLowerCase(), own = S.ui.own || '全部';
  let list = custsInScope();
  if (q) list = list.filter((c) => (c.name + c.en + c.id).toLowerCase().includes(q));
  if (own !== '全部') list = list.filter((c) => (own === '自营' ? !c.l1 : c.l1 === own || c.l2 === own));
  const ownOpts = S.portal === 'hq' ? ['全部', '自营', ...AGENTS.map((a) => a.id)] : S.portal === 'l1' ? ['全部', ...AGENTS.filter((a) => a.parent === ME.l1.org).map((a) => a.id)] : null;
  return head(S.portal === 'hq' ? '客户管理' : '我的客户', S.portal === 'hq' ? '所有客户：自营、一级、二级' : S.portal === 'l1' ? '直属客户与二级代理的客户（只读）' : '通过我的链接开户的客户（只读）',
    S.portal === 'l2' && !agent(ME.l2.org).proxyApply ? '' : `<button class="btn primary" onclick="go('${S.portal}','apply')">${ICON.plus} ${S.portal === 'hq' ? '代客录入' : '代客申请'}</button>`) +
    `<div class="card"><div class="toolbar"><input class="input" placeholder="搜索名称或客户号" value="${S.ui.q || ''}" onchange="setUI('q',this.value)"/>${ownOpts ? `<select class="select" onchange="setUI('own',this.value)">${ownOpts.map((o) => `<option value="${o}" ${o === own ? 'selected' : ''}>${o === '全部' ? '全部归属' : o === '自营' ? '自营' : o + ' ' + agent(o).name}</option>`).join('')}</select>` : ''}<span class="muted small">共 ${list.length} 个</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>客户 / 客户号</th><th>归属</th><th>贸易背景</th><th class="r">本月交易额</th><th class="r">本月费用</th><th>开通日期</th><th>状态</th><th></th></tr></thead><tbody>${list.map((c) => {
      const mt = TXS.filter((t) => t.cust === c.id && t.date.startsWith(MONTH));
      return `<tr><td style="max-width:280px;white-space:normal"><div class="bold">${c.name}</div><div class="small muted" style="max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.en}"><span class="mono">${c.id}</span>${I18N.lang === 'en' ? '' : ' · ' + c.en}</div></td><td style="max-width:230px;white-space:normal">${ownerLabel(c)}</td><td>${c.bg}</td><td class="r">${nf(mt.filter((t) => t.amt).reduce((a, t) => a + volH(t), 0), 0)}</td><td class="r">${nf(mt.reduce((a, t) => a + split(t).actual, 0))}</td><td>${c.opened}</td><td><div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px">${statusBadge(c.frz && c.status === '冻结' ? '已开通' : c.status)}${frzBadge(c, 'c')}</div></td><td class="r"><div class="row-acts"><button class="link" onclick="custDetail('${c.id}')">详情</button>${S.portal === 'hq' ? `${c.frz ? `<button class="link" onclick="unfreezeModal('c','${c.id}')">解冻</button>` : `<button class="link" onclick="freezeModal('c','${c.id}')">冻结</button>`}<button class="link" onclick="docReqModal('c','${c.id}')">调单${openDR('c', c.id).length ? ' ' + openDR('c', c.id).length : ''}</button>` : ''}</div></td></tr>`;
    }).join('')}</tbody></table></div></div>`;
};
function custDetail(id) {
  const c = cust(id), accs = ACCOUNTS.filter((a) => a.cust === id);
  const canPrice = S.portal === 'hq' || (S.portal === 'l1' && c.l1 === ME.l1.org);
  modal(c.name, `<dl class="kv"><dt>客户号（平台）</dt><dd class="mono">${c.id}</dd><dt>英文名</dt><dd>${c.en}</dd><dt>渠道商户号</dt><dd class="mono">Allinpay ${c.chId}</dd><dt>归属</dt><dd>${!c.l1 ? '自营' : agent(c.l1).name + (c.l2 ? ' → ' + agent(c.l2).name : '')}</dd><dt>状态</dt><dd>${statusBadge(c.status)}${frzBadge(c, 'c')}${c.frz ? `<div class="small muted">${c.frz.scopes.map((k) => scopeName('c', k)).join('、')} · ${c.frz.reason} · ${c.frz.t}</div>` : ''}</dd>${openDR('c', id).length ? `<dt>调单</dt><dd>${openDR('c', id).map((d) => `<button class="link" onclick="drDetail('${d.id}')">${d.id}</button> ${statusBadge(d.status)}`).join(' ')}</dd>` : ''}</dl>
    <div><div class="bold" style="margin-bottom:8px">收款账户</div><table><thead><tr><th>银行</th><th>币种</th><th>账户号（银行分配）</th><th>状态</th></tr></thead><tbody>${accs.map((a) => `<tr><td>${a.bank}</td><td>${a.ccy}</td><td class="mono">${a.no}</td><td>${statusBadge(a.status)}</td></tr>`).join('')}</tbody></table></div>
    <div><div class="bold" style="margin-bottom:8px">当前费率（已生效）</div><table><tbody>${PRODUCTS.map((p) => `<tr><td>${p.name}</td><td class="r">${priceStr(p.code, CUST_PRICE[id][p.code])}</td></tr>`).join('')}</tbody></table></div>`,
    `${canPrice ? `<button class="btn" onclick="closeModal();S.ui.pc='${id}';go('${S.portal}','pricing')">调整费率</button>` : ''}${S.portal === 'hq' ? `<button class="btn" onclick="closeModal();reassignCust('${id}')">重新分配代理</button>${ctrlBtns('c', id, false)}` : ''}${S.portal === 'l1' && c.l1 === ME.l1.org ? `<button class="btn" onclick="closeModal();reassignL2('${id}')">重新分配二级代理</button>` : ''}<button class="btn primary" onclick="closeModal()">关闭</button>`, true);
}

// ---------- accounts (HQ) ----------
PAGES['hq:accounts'] = () => {
  const ch = S.ui.ch || '全部', q = (S.ui.aq || '').toLowerCase().replace(/\s/g, '');
  let list = ACCOUNTS; if (ch !== '全部') list = list.filter((a) => a.ccy === ch);
  if (q) list = list.filter((a) => (a.cust + a.no + cust(a.cust).name + cust(a.cust).en).toLowerCase().replace(/\s/g, '').includes(q));
  return head('账户管理', '所有客户的收款账户，按渠道、地区、币种查看') +
    `<div class="card"><div class="card-pad" style="padding-bottom:0">${note('<b>客户号</b>由平台分配，用来识别客户，一个客户只有一个（例如 AZ100001）。<b>账户号</b>由开户银行（虚拟账户）分配，一个客户可以有多个：每个银行、每个币种各一个。')}</div>
    <div class="toolbar"><input class="input" style="max-width:260px" placeholder="搜索客户号、账户号或名称" value="${esc(S.ui.aq || '')}" onchange="setUI('aq',this.value.trim())"/><div class="chip-row">${['全部', 'HKD', 'USD', 'CNH', 'EUR', 'CNY'].map((t) => `<button class="chip ${t === ch ? 'on' : ''}" onclick="setUI('ch','${t}')">${t}</button>`).join('')}</div><span class="muted small">共 ${list.length} 个账户</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>客户号</th><th>客户</th><th>账户号（银行分配）</th><th>开户银行</th><th>币种</th><th>地区</th><th>贸易背景</th><th>渠道</th><th>状态</th></tr></thead><tbody>${list.map((a) => `<tr><td class="mono">${a.cust}</td><td>${cust(a.cust).name}</td><td class="mono bold">${a.no}</td><td>${a.bank}</td><td class="bold">${a.ccy}</td><td>${a.region}</td><td>${a.bg}</td><td><span class="tag">ALLINPAY_HK</span></td><td>${statusBadge(a.status)}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">没有符合的账户</td></tr>'}</tbody></table></div></div>`;
};

// ---------- pricing ----------
function priceEditor(rows, opts) {
  // rows: [{code, floor, cur, pend}]
  return `<table><thead><tr><th>产品</th><th>计费</th><th class="r">${opts.floorLabel}</th><th class="r">当前（已生效）</th><th class="r">新价格</th><th>${opts.extraHead || ''}</th></tr></thead><tbody>${rows.map((r) => {
    const p = prod(r.code);
    return `<tr><td class="bold">${p.name}<div class="small muted mono">${p.code}</div></td><td class="muted">${UNIT_LABEL[p.unit]}</td><td class="r">${priceStr(p.code, r.floor)}</td><td class="r">${priceStr(p.code, r.cur)}</td>
      <td class="r"><input class="input sm" data-code="${p.code}" data-floor="${r.floor}" value="${r.cur}" oninput="this.classList.toggle('bad', +this.value < +this.dataset.floor)"/></td><td>${r.pend ? statusBadge(r.pend) : ''}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function collectPrices() { return [...document.querySelectorAll('input[data-code]')].map((i) => ({ code: i.dataset.code, v: +i.value, floor: +i.dataset.floor })); }

PAGES['hq:pricing'] = () => {
  const t = S.ui.pt || 'products';
  let body = '';
  if (t === 'products') {
    body = `<div class="card-pad">${note('<b>Allinpay 通道的收费模式是「渠道代扣」。</b>客户费用由 Allinpay 扣，API 没有设置费率的接口，只回传每笔的 fee。我方系统负责定价、核对和计算佣金。')}</div><div class="tbl-wrap"><table><thead><tr><th>产品代码</th><th>名称</th><th>类目</th><th>计费单位</th><th class="r">渠道成本价</th><th>Allinpay 指导价</th><th>收费模式</th><th></th></tr></thead><tbody>${PRODUCTS.map((p) => `<tr><td class="mono">${p.code}</td><td class="bold">${p.name}</td><td>${p.cat}</td><td>${UNIT_LABEL[p.unit]}</td><td class="r">${p.unit === 'bps' ? '分润 50%' : priceStr(p.code, p.cost)}</td><td class="muted">${p.guide}</td><td><span class="badge info">渠道代扣</span></td><td><button class="link" onclick="toast('产品配置（示例）')">编辑</button></td></tr>`).join('')}</tbody></table></div>`;
  } else if (t === 'floors') {
    const a = S.ui.pa || 'A001';
    body = `<div class="toolbar"><label class="small muted">一级代理</label><select class="select" onchange="setUI('pa',this.value)">${AGENTS.filter((x) => x.level === 1).map((x) => `<option value="${x.id}" ${x.id === a ? 'selected' : ''}>${x.id} ${x.name}</option>`).join('')}</select><span class="small muted">底价不得低于渠道成本；修改从下一笔交易生效，不追溯</span></div>
      <div class="tbl-wrap">${priceEditor(PRODUCTS.map((p) => ({ code: p.code, floor: p.cost, cur: FLOORS[a][p.code] })), { floorLabel: '渠道成本' })}</div>
      <div class="card-pad btn-row" style="justify-content:flex-end"><button class="btn primary" onclick="saveFloors('${a}')">保存一级底价</button></div>`;
  } else if (t === 'self') {
    const selfs = CUSTOMERS.filter((c) => !c.l1); const id = S.ui.pc && cust(S.ui.pc) && !cust(S.ui.pc).l1 ? S.ui.pc : selfs[0].id;
    body = custPriceBlock(id, selfs, '渠道成本');
  } else {
    body = fcrTable(FEE_REQUESTS, true);
  }
  return head('产品与费率', '产品类目、渠道成本、一级底价、自营客户价、渠道费率配置单') +
    `<div class="card">${tabs('pt', [['products', '产品与渠道成本'], ['floors', '一级底价'], ['self', '客户价（可覆盖任何客户）'], ['fcr', '渠道费率配置单']], t)}${body}</div>`;
};
function custPriceBlock(id, list, floorLabel) {
  const c = cust(id);
  const pend = (code) => { const r = FEE_REQUESTS.find((f) => f.cust === id && f.prod === code && f.status !== '已生效'); return r ? r.status : ''; };
  const all = S.portal === 'hq' ? CUSTOMERS : list;
  return `<div class="toolbar"><label class="small muted">客户</label><select class="select" onchange="setUI('pc',this.value)">${all.map((x) => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${x.id} ${x.name}${!x.l1 ? '（自营）' : ''}</option>`).join('')}</select><span class="small muted">${!c.l1 ? '自营客户：全权管理者直接定价，没有代理佣金' : '归属 ' + agent(c.l1).name + (c.l2 ? ' → ' + agent(c.l2).name : '')}</span></div>
    <div class="card-pad" style="padding-bottom:0">${note('改价后会生成「渠道费率配置单」发给 Allinpay。<b>Allinpay 确认生效前，仍按旧价扣费</b>，佣金也按旧价计算。', 'warn')}</div>
    <div class="tbl-wrap">${priceEditor(PRODUCTS.map((p) => ({ code: p.code, floor: floorOf(c, p.code), cur: CUST_PRICE[id][p.code], pend: pend(p.code) })), { floorLabel, extraHead: '渠道状态' })}</div>
    <div class="card-pad btn-row" style="justify-content:flex-end"><button class="btn primary" onclick="saveCustPrice('${id}')">保存并生成渠道费率配置单</button></div>`;
}
function fcrTable(list, hq) {
  return `<div class="card-pad" style="padding-bottom:0">${note('流程：改价 → 生成配置单 → 运营发给 Allinpay 客户经理 → Allinpay 确认 → 标记「已生效」。之后系统用实际 fee 和应收比对，差异会报警。')}</div><div class="tbl-wrap"><table><thead><tr><th>单号</th><th>客户</th><th>产品</th><th class="r">原价</th><th class="r">新价</th><th>发起</th><th>发送日期</th><th>生效日期</th><th>状态</th><th></th></tr></thead><tbody>${list.length ? list.map((f) => `<tr><td class="mono">${f.id}</td><td>${cust(f.cust).name}</td><td>${prod(f.prod).name}</td><td class="r">${priceStr(f.prod, f.from)}</td><td class="r bold">${priceStr(f.prod, f.to)}</td><td class="small">${f.by}</td><td>${f.sent || '—'}</td><td>${f.eff || '—'}</td><td>${statusBadge(f.status)}</td><td>${hq ? (f.status === '待发送' ? `<button class="btn sm" onclick="fcrAct('${f.id}','send')">发送 Allinpay</button>` : f.status === '已发送 Allinpay' ? `<button class="btn sm primary" onclick="fcrAct('${f.id}','eff')">标记已生效</button>` : '') : ''}</td></tr>`).join('') : '<tr><td colspan="10" class="empty">暂无配置单</td></tr>'}</tbody></table></div>`;
}
function saveFloors(a) {
  const rows = collectPrices(); const bad = rows.filter((r) => r.v < r.floor);
  if (bad.length) return toast(`有 ${bad.length} 项低于渠道成本，需要特批`);
  let n = 0; rows.forEach((r) => { if (FLOORS[a][r.code] !== r.v) { AUDIT.unshift({ t: '2026-10-13 ' + new Date().toTimeString().slice(0, 5), who: ME.hq.email, what: '调整一级底价', obj: `${a} · ${r.code} ${FLOORS[a][r.code]} → ${r.v}`, ip: '198.51.100.7' }); FLOORS[a][r.code] = r.v; n++; } });
  toast(n ? `已保存 ${n} 项一级底价，从下一笔交易生效` : '没有改动'); render();
}
function saveCustPrice(id) {
  const rows = collectPrices(); const bad = rows.filter((r) => r.v < r.floor);
  if (bad.length) return toast(`有 ${bad.length} 项低于${S.portal === 'hq' ? '成本/底价' : '一级底价'}，无法保存`);
  let n = 0;
  rows.forEach((r) => {
    const cur = CUST_PRICE[id][r.code];
    if (cur !== r.v) {
      n++;
      FEE_REQUESTS.unshift({ id: 'FCR-00' + (34 + FEE_REQUESTS.length), cust: id, prod: r.code, from: cur, to: r.v, by: S.portal === 'hq' ? '全权管理者' : ME.l1.org + ' 港汇通', sent: '', eff: '', status: '待发送' });
    }
  });
  toast(n ? `已生成 ${n} 张渠道费率配置单，等待发送 Allinpay` : '没有改动'); render();
}
function fcrAct(fid, act) {
  const f = FEE_REQUESTS.find((x) => x.id === fid);
  if (act === 'send') { f.status = '已发送 Allinpay'; f.sent = TODAY; toast('已发送给 Allinpay 客户经理（邮件 + 附件）'); }
  else { f.status = '已生效'; f.eff = TODAY; CUST_PRICE[f.cust][f.prod] = f.to; toast('已生效：从下一笔交易起按新价核对和计算佣金'); }
  render();
}
PAGES['l1:pricing'] = () => {
  const mine = CUSTOMERS.filter((c) => c.l1 === ME.l1.org);
  const id = S.ui.pc && mine.find((c) => c.id === S.ui.pc) ? S.ui.pc : mine[0].id;
  const t = S.ui.pt || 'edit';
  return head('客户费率', '为直属客户和二级代理的客户设置费率，不得低于全权管理者给的底价') +
    `<div class="card">${tabs('pt', [['edit', '设置客户费率'], ['fcr', '我的费率配置单'], ['floor', '我的底价（全权管理者设定）']], t)}${t === 'edit' ? custPriceBlock(id, mine, '一级底价') : t === 'fcr' ? fcrTable(FEE_REQUESTS.filter((f) => cust(f.cust).l1 === ME.l1.org), false) :
      `<div class="tbl-wrap"><table><thead><tr><th>产品</th><th class="r">我的底价</th><th class="r">Allinpay 指导价</th></tr></thead><tbody>${PRODUCTS.map((p) => `<tr><td class="bold">${p.name}</td><td class="r">${priceStr(p.code, FLOORS[ME.l1.org][p.code])}</td><td class="r muted">${p.guide}</td></tr>`).join('')}</tbody></table></div>`}</div>`;
};

// ---------- agents ----------
PAGES['hq:agents'] = () => {
  const sel = S.ui.ag || 'A001'; const a = agent(sel);
  const l1s = AGENTS.filter((x) => x.level === 1);
  const cnt = (id) => CUSTOMERS.filter((c) => c.l1 === id || c.l2 === id).length;
  const tree = `<ul class="tree"><li><div class="tree-node bold">全权管理者 · 自营 <span class="muted small">${CUSTOMERS.filter((c) => !c.l1).length} 客户</span></div><ul>${l1s.map((x) => `<li><div class="tree-node ${sel === x.id ? 'on' : ''}" onclick="setUI('ag','${x.id}')"><span class="badge info">一级</span>${x.name}${x.frz ? ' <span class="badge err">冻结</span>' : ''}<span class="muted small">${cnt(x.id)}</span></div><ul>${AGENTS.filter((y) => y.parent === x.id).map((y) => `<li><div class="tree-node ${sel === y.id ? 'on' : ''}" onclick="setUI('ag','${y.id}')"><span class="badge">二级</span>${y.name}${y.frz ? ' <span class="badge err">冻结</span>' : ''}<span class="muted small">${cnt(y.id)}</span></div></li>`).join('')}</ul></li>`).join('')}</ul></li></ul>`;
  const m = TXS.filter((t) => t.date.startsWith(MONTH) && (txL1(t) === sel || txL2(t) === sel)).map(split);
  const com = m.reduce((s, x) => s + (a.level === 1 ? x.l1net : x.l2), 0);
  const detail = `<div class="card-head"><div><h3 class="card-title">${a.name}</h3><div class="card-sub">${a.id} · ${a.level === 1 ? '一级代理' : '二级代理（上级 ' + agent(a.parent).name + '）'} · 加入 ${a.since}</div></div><div class="btn-row" style="flex-wrap:wrap;justify-content:flex-end">${statusBadge(a.status)}${agentActs(a)}</div></div>${a.frz ? `<div class="card-pad" style="padding-bottom:0">${note(`已冻结：${a.frz.scopes.map((k) => scopeName('a', k)).join('、')} · ${a.frz.reason} · ${a.frz.t}`, 'warn')}</div>` : ''}${a.status !== '启用' ? `<div class="card-pad" style="padding-bottom:0">${note(`该代理已于 ${a.offDate || TODAY} 停用：${a.offReason || '—'}。客户已转移，历史佣金按原归属保留。`, 'warn')}</div>` : ''}
    <div class="card-pad"><div class="grid g3">${kpi('客户数', cnt(sel))}${kpi('本月佣金', 'HKD ' + nf(com, 0))}${kpi('主要联系电邮', `<span style="font-size:var(--text-sm)">${a.email}</span>`)}</div>
    ${a.level === 1 ? `<div class="mt"><div class="btn-row" style="justify-content:space-between;margin-bottom:8px"><span class="bold">一级底价（即全权管理者给的佣金空间）</span><button class="btn sm" onclick="S.ui.pt='floors';S.ui.pa='${sel}';go('hq','pricing')">修改底价</button></div><table><thead><tr><th>产品</th><th class="r">渠道成本</th><th class="r">一级底价</th><th class="r">客户默认价</th></tr></thead><tbody>${PRODUCTS.map((p) => `<tr><td>${p.name}</td><td class="r">${p.unit === 'bps' ? '分润 50%' : priceStr(p.code, p.cost)}</td><td class="r bold">${priceStr(p.code, FLOORS[sel][p.code])}</td><td class="r">${priceStr(p.code, DEFAULT_CUST_PRICE[p.code])}</td></tr>`).join('')}</tbody></table></div>` :
      `<div class="mt">${note(`二级佣金 = 一级价差 × 比例，由一级代理设定。代客申请：<b>${a.proxyApply ? '已开启' : '未开启'}</b>（由一级开启）`)}<table class="mt"><thead><tr><th>产品</th><th class="r">一级给的比例</th></tr></thead><tbody>${PRODUCTS.map((p) => `<tr><td>${p.name}</td><td class="r">${L2RATIO[sel][p.code]}%</td></tr>`).join('')}</tbody></table></div>`}</div>`;
  return head('代理管理', '一级、二级代理的树状结构；全权管理者可以冻结、调单、转移二级和重新分配客户', `<button class="btn" onclick="reassignCust()">重新分配客户</button><button class="btn primary" onclick="go('hq','recruit')">${ICON.plus} 招募一级代理</button>`) +
    `<div class="grid" style="grid-template-columns:minmax(260px,1fr) 2.2fr"><div class="card card-pad">${tree}</div><div class="card">${detail}</div></div>`;
};
function inviteAgent(level) {
  modal(level === 1 ? '新增一级代理' : '新增二级代理', `<div class="form-grid"><div class="field full"><label>公司 / 个人名称</label><input class="input" placeholder="例：XX 顾问有限公司"/></div><div class="field"><label>管理员电邮（登录账号）</label><input class="input" type="email" placeholder="admin@example.com"/></div><div class="field"><label>联系电话</label><input class="input" placeholder="+852"/></div>
    ${level === 1 ? '<div class="field full"><label>底价模板</label><select class="select"><option>标准一级底价（同 A001）</option><option>新代理优惠底价</option></select></div>' : '<div class="field full"><label>默认佣金比例（一级价差的 %）</label><input class="input" value="40"/></div><div class="field full" style="flex-direction:row;align-items:center;gap:12px"><label class="switch"><input type="checkbox"/><span></span></label><span>允许代客申请（默认关闭）</span></div>'}</div>
    ${note('系统会发邀请邮件，对方点链接自行设置密码和 2FA。')}`, `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="closeModal();toast('邀请邮件已发送')">发送邀请</button>`);
}
PAGES['l1:agents'] = () => {
  const mine = AGENTS.filter((a) => a.parent === ME.l1.org);
  const sel = S.ui.ag && mine.find((a) => a.id === S.ui.ag) ? S.ui.ag : mine[0].id;
  const ex = S.ui.ex || 'COLLECT_S';
  const amt = +(S.ui.exAmt || 100000);
  const p = prod(ex);
  const price = DEFAULT_CUST_PRICE[ex], floor = FLOORS[ME.l1.org][ex], ratio = L2RATIO[sel][ex];
  const amtH = p.unit === 'fixed' ? 0 : amt * FXR.USD;
  const r = calcExample(ex, amtH, price, floor, ratio);
  const tot = Math.max(r.fee, 0.0001);
  const seg = (v, c, l) => v > 0 ? `<div style="flex:${v / tot};background:${c}" title="${l} ${nf(v)}">${v / tot > 0.12 ? l : ''}</div>` : '';
  return head('二级代理管理', '设置二级佣金比例、开启代客申请、停用并转移客户', `<button class="btn" onclick="reassignL2()">重新分配客户</button><button class="btn primary" onclick="go('l1','recruit')">${ICON.plus} 招募二级代理</button>`) +
    `<div class="card"><div class="tbl-wrap"><table><thead><tr><th>二级代理</th><th>主要联系电邮</th><th class="r">客户数</th><th class="r">本月佣金</th><th>代客申请</th><th></th></tr></thead><tbody>${mine.map((a) => {
      const m = TXS.filter((t) => t.date.startsWith(MONTH) && txL2(t) === a.id).map(split).reduce((s, x) => s + x.l2, 0);
      return `<tr class="${a.id === sel ? 'on' : ''}"><td class="bold">${a.name}<div class="small muted mono">${a.id}</div></td><td>${a.email}</td><td class="r">${CUSTOMERS.filter((c) => c.l2 === a.id).length}</td><td class="r">${money(m)}</td><td><label class="switch"><input type="checkbox" ${a.proxyApply ? 'checked' : ''} onchange="agent('${a.id}').proxyApply=this.checked;toast(this.checked?'已开启代客申请':'已关闭代客申请')"/><span></span></label></td><td class="nowrap"><button class="btn sm ${a.id === sel ? 'primary' : ''}" onclick="setUI('ag','${a.id}')">设置佣金</button> ${a.status === '启用' ? `<button class="btn sm danger" onclick="offboardL2('${a.id}')">停用并转移</button>` : statusBadge(a.status)}</td></tr>`;
    }).join('')}</tbody></table></div></div>
    <div class="grid g2 mt"><div class="card"><div class="card-head"><h3 class="card-title">${agent(sel).name} · 佣金比例</h3><span class="card-sub">二级佣金 = 一级价差 × 比例</span></div>
      <div class="tbl-wrap"><table><thead><tr><th>产品</th><th class="r">我的底价</th><th class="r">客户默认价</th><th class="r">给二级的比例</th></tr></thead><tbody>${PRODUCTS.map((q) => `<tr><td>${q.name}</td><td class="r">${priceStr(q.code, FLOORS[ME.l1.org][q.code])}</td><td class="r">${priceStr(q.code, DEFAULT_CUST_PRICE[q.code])}</td><td class="r"><input class="input sm" style="width:72px" value="${L2RATIO[sel][q.code]}" onchange="L2RATIO['${sel}']['${q.code}']=Math.min(100,Math.max(0,+this.value));render()"/> %</td></tr>`).join('')}</tbody></table></div>
      <div class="card-pad btn-row" style="justify-content:flex-end"><button class="btn primary" onclick="toast('已保存，从下一笔交易生效')">保存</button></div></div>
    <div class="card"><div class="card-head"><h3 class="card-title">分润试算</h3><span class="card-sub">按客户默认价</span></div><div class="card-pad">
      <div class="form-grid"><div class="field"><label>产品</label><select class="select" onchange="setUI('ex',this.value)">${PRODUCTS.map((q) => `<option value="${q.code}" ${q.code === ex ? 'selected' : ''}>${q.name}</option>`).join('')}</select></div><div class="field"><label>交易金额 (USD)</label><input class="input" value="${amt}" ${p.unit === 'fixed' ? 'disabled' : ''} onchange="setUI('exAmt',this.value)"/></div></div>
      <div class="split-bar mt">${seg(r.cost, '#aeaeb2', '渠道')}${seg(r.hq, '#0071e3', '全权管理者')}${seg(r.l1net, '#30b0c7', '一级')}${seg(r.l2, '#af52de', '二级')}</div>
      <div class="legend"><span><i style="background:#aeaeb2"></i>渠道成本</span><span><i style="background:#0071e3"></i>全权管理者</span><span><i style="background:#30b0c7"></i>一级（我）</span><span><i style="background:#af52de"></i>二级</span></div>
      <div class="calc-out mt"><span>客户费用（Allinpay 扣）</span><b class="num">${nf(r.fee)}</b><span>渠道成本${p.unit === 'bps' ? '（Allinpay 分 50%）' : ''}</span><span class="num">−${nf(r.cost)}</span><span>全权管理者收益</span><span class="num">${nf(r.hq)}</span><span>一级价差（毛）</span><span class="num">${nf(r.l1)}</span><span>二级佣金 = ${nf(r.l1)} × ${ratio}%</span><span class="num">${nf(r.l2)}</span><span class="tot">一级净佣金</span><span class="tot num">HKD ${nf(r.l1net)}</span></div>
    </div></div></div>`;
};

// ---------- commission ----------
PAGES['*:commission'] = () => {
  const P = S.portal;
  const lines = txsInScope().map((t) => ({ t, s: split(t), st: settleInfo(t) })).filter((x) => P === 'hq' ? x.s.l1 > 0 : myEarn(x.s) > 0);
  const val = (x) => (P === 'hq' ? x.s.l1 : myEarn(x.s));
  const sum = (st) => lines.filter((x) => x.st.status === st).reduce((a, x) => a + val(x), 0);
  const est = lines.filter((x) => x.s.est && x.st.status !== '已结算').reduce((a, x) => a + val(x), 0);
  const tab = S.ui.ct || (P === 'hq' ? 'agents' : 'lines');
  let body = '';
  if (tab === 'agents' && P === 'hq') {
    body = `<div class="tbl-wrap"><table><thead><tr><th>一级代理</th><th class="r">一级净佣金</th><th class="r">下属二级佣金</th><th class="r">合计</th><th class="r">待结算</th><th class="r">可结算</th><th class="r">已结算</th><th></th></tr></thead><tbody>${AGENTS.filter((a) => a.level === 1).map((a) => {
      const L = lines.filter((x) => txL1(x.t) === a.id); const s = (k, st) => L.filter((x) => !st || x.st.status === st).reduce((q, x) => q + x.s[k], 0);
      return `<tr><td class="bold">${a.name}</td><td class="r">${nf(s('l1net'))}</td><td class="r">${nf(s('l2'))}</td><td class="r bold">${nf(s('l1'))}</td><td class="r">${nf(s('l1', '待结算'))}</td><td class="r">${nf(s('l1', '可结算'))}</td><td class="r">${nf(s('l1', '已结算'))}</td><td><button class="btn sm" onclick="toast('已生成 ${a.id} 结算单并通知财务')">生成结算单</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
  } else if (tab === 'stmts') {
    const g = {}; lines.forEach((x) => { (g[x.st.date] ||= []).push(x); });
    const ds = Object.keys(g).sort().reverse();
    body = `<div class="tbl-wrap"><table><thead><tr><th>结算单号</th><th>结算日（T+15）</th><th class="r">笔数</th><th class="r">金额 (HKD)</th><th>说明</th><th>状态</th><th></th></tr></thead><tbody>${ds.map((d) => {
      const L = g[d], amt = L.reduce((a, x) => a + val(x), 0), st = L[0].st.status, hasEst = L.some((x) => x.s.est);
      const low = amt < 500 && st !== '已结算';
      return `<tr><td class="mono">CS-${d.replace(/-/g, '')}</td><td>${d}</td><td class="r">${L.length}</td><td class="r bold">${nf(amt)}</td><td class="small muted">${low ? '低于最低结算额 HKD 500，滚入下期' : hasEst ? '含换汇暂估' : ''}</td><td>${statusBadge(st)}</td><td><button class="link" onclick="toast('下载结算单 PDF（示例）')">下载</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
  } else {
    body = `<div class="tbl-wrap"><table><thead><tr><th>交易日</th><th>结算日</th><th>客户</th><th>产品</th><th class="r">客户费用</th><th class="r">${P === 'hq' ? '一级佣金（毛）' : '我的佣金'}</th><th>类型</th><th>状态</th></tr></thead><tbody>${lines.slice(0, 40).map((x) => `<tr><td>${x.t.date}</td><td>${x.st.date}</td><td>${cust(x.t.cust).name}</td><td>${prod(x.t.prod).name}</td><td class="r">${nf(x.s.actual)}</td><td class="r bold">${nf(val(x))}</td><td>${x.s.est ? statusBadge('暂估') : '<span class="small muted">实际 fee</span>'}</td><td>${statusBadge(x.st.status)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const cash = P === 'hq' ? note(`<b>现金流：</b>代理佣金按 T+15 结算，但 Allinpay 分润按月（M1）到账，例如 9 月分润约 10 月 18 日到 DBS。目前全权管理者已垫付约 <b>HKD ${nf(sum('已结算') + sum('可结算'), 0)}</b>。建议设置每个代理的垫付上限。`, 'warn') : note('佣金按 <b>T+15</b> 结算：交易完成后第 15 天变成「可结算」。换汇佣金先按暂估结算，Allinpay 月度分润明细出来后在下一期调整。最低结算额 HKD 500（待定）。');
  return head(P === 'hq' ? '佣金管理' : P === 'l1' ? '佣金报表' : '佣金', P === 'hq' ? '统计一级代理（含下属二级）的佣金和结算' : '每笔佣金明细与 T+15 结算单',
    `<button class="btn" onclick="toast('已导出（示例）')">${ICON.dl} 导出</button>`) + cash +
    `<div class="grid g4 mt">${kpi('待结算', 'HKD ' + nf(sum('待结算'), 0), '未满 15 天')}${kpi('可结算', 'HKD ' + nf(sum('可结算'), 0), '已满 15 天，待出款')}${kpi('已结算', 'HKD ' + nf(sum('已结算'), 0))}${kpi('其中换汇暂估', 'HKD ' + nf(est, 0), '月度定稿后调整')}</div>
    <div class="card mt">${tabs('ct', [...(P === 'hq' ? [['agents', '按一级代理']] : []), ['lines', '佣金明细'], ['stmts', 'T+15 结算单']], tab)}${body}</div>`;
};

// ---------- revenue (HQ) ----------
PAGES['hq:revenue'] = () => {
  const mo = S.ui.mo || MONTH;
  const m = TXS.filter((t) => t.date.startsWith(mo)); const sp = m.map(split);
  const sum = (k, f = () => true) => sp.reduce((a, s, i) => a + (f(m[i]) ? s[k] : 0), 0);
  AFTER.push(() => {
    const txt = cssVar('--color-text-muted'), grid = cssVar('--color-divider');
    chart('rev', { type: 'bar', data: { labels: PRODUCTS.map((p) => p.name), datasets: [
      { label: '渠道成本', data: PRODUCTS.map((p) => sum('cost', (t) => t.prod === p.code)), backgroundColor: '#d1d1d6' },
      { label: '全权管理者收益', data: PRODUCTS.map((p) => sum('hq', (t) => t.prod === p.code)), backgroundColor: '#0071e3' },
      { label: '一级净佣金', data: PRODUCTS.map((p) => sum('l1net', (t) => t.prod === p.code)), backgroundColor: '#30b0c7' },
      { label: '二级佣金', data: PRODUCTS.map((p) => sum('l2', (t) => t.prod === p.code)), backgroundColor: '#af52de' }] },
      options: { maintainAspectRatio: false, plugins: { legend: { labels: { color: txt, boxWidth: 10 } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: txt } }, y: { stacked: true, grid: { color: grid }, ticks: { color: txt } } } } });
  });
  return head('收益统计', '客户费用 → 渠道成本 → 代理佣金 → 全权管理者净收益', `<select class="select" onchange="setUI('mo',this.value)"><option value="2026-10" ${mo === '2026-10' ? 'selected' : ''}>2026 年 10 月（至今）</option><option value="2026-09" ${mo === '2026-09' ? 'selected' : ''}>2026 年 9 月</option></select>`) +
    `<div class="grid g5">${kpi('客户费用（Allinpay 扣）', 'HKD ' + nf(sum('actual'), 0))}${kpi('渠道成本', 'HKD ' + nf(sum('cost'), 0))}${kpi('平台毛利', 'HKD ' + nf(sum('margin'), 0), '= Allinpay 应付分润')}${kpi('代理佣金', 'HKD ' + nf(sum('l1'), 0), '一级 + 二级')}${kpi('全权管理者净收益', 'HKD ' + nf(sum('hq'), 0))}</div>
    <div class="card mt"><div class="card-head"><h3 class="card-title">按产品拆分</h3><span class="card-sub">HKD</span></div><div class="chart-box" style="height:300px"><canvas id="rev"></canvas></div></div>
    <div class="card mt"><div class="tbl-wrap"><table><thead><tr><th>产品</th><th class="r">笔数</th><th class="r">客户费用</th><th class="r">渠道成本</th><th class="r">平台毛利</th><th class="r">一级佣金</th><th class="r">二级佣金</th><th class="r">全权管理者净收益</th></tr></thead><tbody>${PRODUCTS.map((p) => { const f = (t) => t.prod === p.code; return `<tr><td class="bold">${p.name}</td><td class="r">${m.filter(f).length}</td><td class="r">${nf(sum('actual', f))}</td><td class="r">${nf(sum('cost', f))}</td><td class="r">${nf(sum('margin', f))}</td><td class="r">${nf(sum('l1net', f))}</td><td class="r">${nf(sum('l2', f))}</td><td class="r bold">${nf(sum('hq', f))}</td></tr>`; }).join('')}</tbody></table></div></div>`;
};

// ---------- channels (HQ) ----------
PAGES['hq:channels'] = () => {
  const t = S.ui.cht || 'ch';
  let body = '';
  if (t === 'ch') {
    body = `<div class="card-pad grid g2">${CHANNELS.map((c) => `<div class="card card-pad"><div class="btn-row" style="justify-content:space-between"><div><div class="bold">${c.name}</div><div class="small muted mono">${c.code}</div></div>${statusBadge(c.status)}</div>
      <dl class="kv mt"><dt>持牌主体</dt><dd>${c.entity}</dd><dt>收费模式</dt><dd><select class="select" onchange="toast('收费模式已改为 '+this.value+'（示例）')">${['CHANNEL_DEDUCT 渠道代扣', 'PLATFORM_DEDUCT 我方扣', 'HYBRID 混合'].map((o) => `<option ${o.startsWith(c.mode) ? 'selected' : ''}>${o}</option>`).join('')}</select></dd><dt>接口</dt><dd class="mono small">${c.api}</dd><dt>机构号</dt><dd class="mono">${c.inst}</dd><dt>结算</dt><dd>${c.settle}</dd></dl>
      <div class="mt btn-row">${c.caps.map((x) => `<span class="tag">${x}</span>`).join('')}</div></div>`).join('')}</div>`;
  } else if (t === 'ap') {
    body = `<div class="tbl-wrap"><table><thead><tr><th>账户产品</th><th>渠道</th><th>开户银行</th><th>账户所在地区</th><th>贸易收款背景</th><th>收款币种</th><th>账户类型</th><th>对应费用</th><th>状态</th></tr></thead><tbody>${ACCOUNT_PRODUCTS.map((a) => `<tr><td class="mono">${a.id}</td><td class="mono small">${a.channel}</td><td class="bold">${a.bank}</td><td>${a.region}</td><td>${a.bg}</td><td>${a.ccys.join(' / ')}</td><td>${a.type}</td><td class="small">${a.fee}</td><td>${statusBadge(a.status)}</td></tr>`).join('')}</tbody></table></div><div class="card-pad">${note('客户端「申请收款账户」显示的就是这里的账户产品。新接一家银行，只要加渠道和账户产品，前台和代理体系都不用改。')}</div>`;
  } else if (t === 'route') {
    body = `<div class="tbl-wrap"><table><thead><tr><th>优先级</th><th>产品</th><th>地区</th><th>币种</th><th>条件</th><th>渠道</th></tr></thead><tbody>
      <tr><td>1</td><td>收款 / 付款 / 汇兑</td><td>中国香港</td><td>HKD USD CNH EUR</td><td>客户账户开在 Allinpay</td><td class="mono">ALLINPAY_HK</td></tr>
      <tr><td>2</td><td>付款</td><td>新加坡</td><td>SGD</td><td>示例：成本最低</td><td class="mono">BANKX_SG（规划中）</td></tr></tbody></table></div>`;
  } else {
    const done = S.ui.recon;
    const mis = TXS.filter((x) => Math.abs(split(x).diff) > 0.5);
    const fx = TXS.filter((x) => x.prod === 'FX' && x.date.startsWith('2026-09'));
    body = `<div class="card-pad">${note('Allinpay 分润明细目前只能从代理门户导出，没有 API。每月导入后系统逐笔核对：费用差异、换汇暂估 vs 定稿。')}
      <div class="btn-row mt"><button class="btn primary" onclick="setUI('recon',1)">${ICON.up} 导入 2026 年 9 月分润明细</button><span class="small muted">支持 Excel / CSV</span></div>
      ${done ? `<div class="grid g4 mt">${kpi('明细笔数', TXS.filter((x) => x.date.startsWith('2026-09')).length)}${kpi('一致', TXS.filter((x) => x.date.startsWith('2026-09')).length - mis.length, '', '')}${kpi('费用差异', mis.length, '需要跟进')}${kpi('换汇定稿调整', 'HKD ' + nf(fx.length * 12.4, 2), fx.length + ' 笔，计入下期佣金')}</div>
      <table class="mt"><thead><tr><th>交易号</th><th>客户</th><th>产品</th><th class="r">我方应收</th><th class="r">Allinpay 实扣</th><th class="r">差异</th><th>可能原因</th></tr></thead><tbody>${mis.map((x) => { const s = split(x); return `<tr><td class="mono">${x.id}</td><td>${cust(x.cust).name}</td><td>${prod(x.prod).name}</td><td class="r">${nf(s.expected)}</td><td class="r">${nf(s.actual)}</td><td class="r bold ${s.diff > 0 ? 'up' : 'down'}">${nf(s.diff)}</td><td class="small">新费率尚未在 Allinpay 生效</td></tr>`; }).join('')}</tbody></table>` : ''}</div>`;
  }
  return head('渠道管理', '渠道配置、账户产品、路由规则、分润对账', `<button class="btn" onclick="toast('新增渠道向导（示例）')">${ICON.plus} 新增渠道</button>`) +
    `<div class="card">${tabs('cht', [['ch', '渠道'], ['ap', '账户产品'], ['route', '路由规则'], ['recon', '分润对账']], t)}${body}</div>`;
};

// ---------- links / QR ----------
PAGES['*:links'] = () => {
  const o = ME[S.portal].org;
  const list = S.portal === 'hq' ? LINKS : LINKS.filter((l) => l.org === o);
  AFTER.push(() => {
    document.querySelectorAll('.qr[data-url]').forEach((el) => { if (window.QRCode) { el.innerHTML = ''; new QRCode(el, { text: el.dataset.url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M }); } });
  });
  const tpls = S.portal === 'hq' ? ['自营标准价', '自营大客户价'] : S.portal === 'l1' ? ['港汇通标准价', '港汇通大客户价'] : ['（由一级设定）'];
  return head('开户链接 / QR', '客户经链接开户后，自动归属到生成链接的一方和对应的费率模板') +
    `<div class="grid" style="grid-template-columns:1fr 2fr"><div class="card"><div class="card-head"><h3 class="card-title">生成新链接</h3></div><div class="card-pad" style="display:grid;gap:12px">
      <div class="field"><label>费率模板</label><select class="select" id="lkTpl">${tpls.map((t) => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>来源标签</label><input class="input" id="lkTag" placeholder="例：展会、微信群"/></div>
      <div class="field"><label>有效期</label><select class="select" id="lkExp"><option>长期</option><option>30 天</option><option>2026-12-31</option></select></div>
      ${S.portal === 'l2' ? note('费率由一级代理设定，二级不能修改。') : ''}
      <button class="btn primary" onclick="newLink()">生成链接和 QR</button></div></div>
    <div class="grid g2">${list.map((l) => { const url = `https://apply.meepay.example/r/${l.code}`; return `<div class="card card-pad"><div class="qr-box"><div class="qr" data-url="${url}"></div><div style="min-width:0"><div class="bold mono">${l.code}</div><div class="small muted">${l.org === 'HQ' ? '全权管理者自营' : agent(l.org).name}</div><div class="small mt">模板：${l.tpl}</div><div class="small">标签：${l.tag} · 有效期：${l.exp}</div><div class="small">已开户：<b>${l.uses}</b></div><div class="btn-row mt"><button class="btn sm" onclick="navigator.clipboard&&navigator.clipboard.writeText('${url}');toast('已复制链接')">复制链接</button><button class="btn sm" onclick="location.hash='#/apply/${l.code}'">打开申请页</button></div></div></div></div>`; }).join('')}</div></div>`;
};
function newLink() {
  const o = ME[S.portal].org; const n = LINKS.filter((l) => l.org === o).length + 1;
  LINKS.unshift({ code: `${o === 'HQ' ? 'HQ-SELF' : o}-${String(n).padStart(2, '0')}N`, org: o, tpl: $('#lkTpl').value, tag: $('#lkTag').value || '未分类', uses: 0, exp: $('#lkExp').value, created: TODAY });
  toast('已生成新链接和 QR'); render();
}

// ---------- applications list ----------
PAGES['*:apps'] = () => {
  const P = S.portal; const f = S.ui.as || '全部';
  let list = appsInScope(); if (f !== '全部') list = list.filter((a) => a.status === f);
  const sts = ['全部', 'OCR 中', '待 CS 补录', '待补件', '待合规审核', '待董事验证', '渠道审核中', '已开通', '渠道驳回'];
  return head(P === 'hq' ? '开户申请工作台' : '申请进度', P === 'hq' ? '所有来源的申请：链接、QR、代客录入、代理代申请' : '查看名下申请的进度（看不到合规内部备注）',
    P === 'l2' && !agent(ME.l2.org).proxyApply ? '' : `<button class="btn primary" onclick="go('${P}','apply')">${ICON.plus} ${P === 'hq' ? '代客录入' : '代客申请'}</button>`) +
    `<div class="card"><div class="toolbar"><div class="chip-row" style="flex-wrap:wrap">${sts.map((t) => `<button class="chip ${t === f ? 'on' : ''}" onclick="setUI('as','${t}')">${t}</button>`).join('')}</div></div>
    <div class="tbl-wrap"><table><thead><tr><th>申请号</th><th>公司</th><th>来源</th><th>归属</th><th class="r">文件</th><th>风险</th><th>创建</th><th>状态</th><th></th></tr></thead><tbody>${list.map((a) => `<tr><td class="mono">${a.id}</td><td class="bold">${a.company}</td><td>${a.src}</td><td class="small">${a.owner ? agent(a.owner).name + (a.l2 ? '<div class="muted">↳ ' + agent(a.l2).name + '</div>' : '') : '自营'}</td><td class="r">${a.docs}/7</td><td>${a.risk}</td><td>${a.created}</td><td>${statusBadge(a.status)}</td><td><a class="link" href="#/${P}/app/${a.id}">${P === 'hq' && ['待 CS 补录', '待合规审核', 'OCR 中', '待补件'].includes(a.status) ? '处理' : '查看'}</a></td></tr>`).join('')}</tbody></table></div></div>`;
};
