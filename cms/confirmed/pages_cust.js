// ===================== 客户 eBanking =====================
const FLAGC = { HKD: '#ff3b30', USD: '#0071e3', CNH: '#ff9f0a', EUR: '#5e5ce6', SGD: '#ff2d55', CNY: '#ff9f0a', GBP: '#30b0c7' };
const flag = (c) => `<span class="flag" style="background:${FLAGC[c] || '#8e8e93'}">${c.slice(0, 2)}</span>`;
const CID = () => ME.cust.org;
const bal = () => BALANCES[CID()];
const totalIn = (ccy) => Object.entries(bal()).reduce((a, [c, b]) => a + (b.a + b.f) * FXR[c], 0) / FXR[ccy];
const myAccts = () => ACCOUNTS.filter((a) => a.cust === CID());
const fxCcys = () => Object.keys(bal()).filter((c) => c !== 'CNY');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const hasCJK = (s) => /[\u3400-\u9fff\uff00-\uffef]/.test(s);

// ---------- shared utilities ----------
function dlCSV(name, header, rows) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\ufeff' + [header, ...rows].map((r) => r.map(q).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click();
  toast(`已导出 ${rows.length} 条记录（${name}）`);
}
function secCode(seed) { let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } let s = '26' + TODAY.slice(2).replace(/-/g, ''); while (s.length < 24) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; s += String(h % 10); } return s; }
function printDoc() {
  const el = document.querySelector('.modal .letter'); if (!el) return;
  let pr = document.getElementById('print-root'); if (!pr) { pr = document.createElement('div'); pr.id = 'print-root'; document.body.appendChild(pr); }
  pr.innerHTML = el.outerHTML;
  try { window.print(); } catch (e) { toast('当前预览环境不支持打印，请在浏览器新窗口打开'); }
}
function letter({ title, ref, body, date = TODAY }) {
  return `<div class="letter"><div class="lt-head"><div class="lt-brand"><img src="./assets/azure-mark.png" alt="Azure"><div><b>Azure</b><small>Accounts · Payments · Global Transfers</small></div></div><dl class="lt-meta"><dt>Date</dt><dd>${date}</dd><dt>Security Code</dt><dd class="mono">${secCode(ref)}</dd><dt>Reference</dt><dd class="mono">${ref}</dd></dl></div>
    <h2 class="lt-title">${title}</h2>${body}
    <div class="lt-foot"><div><p>Sincerely,</p><p><b>Azure Client Services</b><br>service@azure-pay.example</p><p class="lt-small">This document is generated electronically from account data provided by the account service channel (Allinpay International). Verify authenticity at azure-pay.example/verify with the Security Code above.</p></div><div class="lt-seal"><span>AZURE</span><small>VERIFIED</small><em>${TODAY.replace(/-/g, '.')}</em></div></div></div>`;
}
const lrows = (pairs) => `<table class="lt-kv">${pairs.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
function letterModal(title, html, extra = '') {
  modal(title, `<div class="letter-wrap">${html}</div>`, `${extra}<button class="btn" onclick="toast('已发送到 ${ME.cust.email}')">发送到邮箱</button><button class="btn primary" onclick="printDoc()">${ICON.dl} 打印 / 存为 PDF</button>`, true);
}
const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to + ' 99');
function dateRange(kf, kt) { return `<div class="date-range"><input class="input" type="date" value="${S.ui[kf] || ''}" onchange="setUI('${kf}',this.value)" aria-label="开始日期"><span>→</span><input class="input" type="date" value="${S.ui[kt] || ''}" onchange="setUI('${kt}',this.value)" aria-label="结束日期"></div>`; }
function searchBox(k, ph) { return `<input class="input" style="max-width:220px" placeholder="${ph}" value="${esc(S.ui[k] || '')}" onchange="setUI('${k}',this.value.trim())" aria-label="${ph}">`; }
function selectBox(k, label, opts) { return `<select class="select" style="max-width:170px" onchange="setUI('${k}',this.value)" aria-label="${label}"><option value="">${label}：全部</option>${opts.map((o) => `<option ${S.ui[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`; }
function timeline(steps, cur) { return `<ol class="tl">${steps.map((s, i) => `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"><b>${s[0]}</b><small>${s[1] || ''}</small></li>`).join('')}</ol>`; }

// ---------- 首页 ----------
PAGES['cust:home'] = () => {
  const vc = S.ui.vc || 'USD';
  const recent = TXS.filter((t) => t.cust === CID()).slice(0, 6);
  const pend = TXS.filter((t) => t.cust === CID() && t.status === '待复核').length;
  const cpPend = CPS.filter((c) => /待/.test(c.status)).length;
  return head(`你好，${ME.cust.user}`, `${ME.cust.orgName} · 客户号 ${CID()}`) +
    `<div class="grid g3"><div class="card kpi hero-bal span2" style="padding:28px;display:flex;flex-direction:column;position:relative;overflow:hidden"><div class="btn-row" style="justify-content:space-between"><div class="kpi-label">总资产（按实时汇率折算）</div><div class="chip-row">${['USD', 'HKD', 'CNH'].map((c) => `<button class="chip ${c === vc ? 'on' : ''}" style="${c === vc ? 'background:#fff;color:#1d1d1f' : ''}" onclick="setUI('vc','${c}')">${c}</button>`).join('')}</div></div>
      <div class="kpi-value" style="font-size:2.75rem;margin-top:14px;letter-spacing:-.03em"><span style="font-size:1.25rem;opacity:.6;margin-right:8px;font-weight:500">${vc}</span>${nf(totalIn(vc))}</div><div class="btn-row" style="margin-top:auto;padding-top:24px"><a class="btn primary" href="#/cust/pay">付款</a><a class="btn" href="#/cust/fx">换汇</a><a class="btn" href="#/cust/statements">账户证明</a></div><img src="./assets/azure-mark.png" alt="" style="position:absolute;right:28px;bottom:24px;width:44px;height:44px;opacity:.9"></div>
      <div class="card"><div class="card-head"><h3 class="card-title">待办</h3><span class="card-sub">${pend + cpPend + 1} 项</span></div><div class="ios-list inset">
        <a class="ios-row" href="#/cust/txs"><span class="ios-ic" style="background:#ff9f0a">${NAVICON.txs}</span><span class="ios-main"><b>待复核付款 ${pend} 笔</b><small>超过 USD 50,000 需 CFO 批准</small></span><span class="chev">›</span></a>
        <a class="ios-row" href="#/cust/cp"><span class="ios-ic" style="background:#0071e3">${NAVICON.cp}</span><span class="ios-main"><b>交易对手审核中 ${cpPend} 个</b><small>新增或修改后需通道审核</small></span><span class="chev">›</span></a>
        <a class="ios-row" href="#/cust/accounts"><span class="ios-ic" style="background:#34c759">${NAVICON.accounts}</span><span class="ios-main"><b>欧元账户审核中</b><small>预计 1–2 个工作日开通</small></span><span class="chev">›</span></a></div></div></div>
    <div class="prod-tiles mt">
      <div class="prod-tile" onclick="go('cust','accounts')"><span class="ios-ic lg" style="background:#0071e3">${NAVICON.accounts}</span><div class="small muted">账户管理</div><div class="t">${myAccts().length} 个账户</div><div class="v">${Object.keys(bal()).length} 个币种</div></div>
      <div class="prod-tile" onclick="go('cust','pay')"><span class="ios-ic lg" style="background:#34c759">${NAVICON.pay}</span><div class="small muted">全球收付款</div><div class="t">${CPS.filter((c) => c.dir === '收款方' && c.status === '正常').length} 个可用收款方</div><div class="v">单笔 · 批量</div></div>
      <div class="prod-tile" onclick="go('cust','fx')"><span class="ios-ic lg" style="background:#ff9f0a">${NAVICON.fx}</span><div class="small muted">汇兑中心</div><div class="t">USD → HKD</div><div class="v">${nf(FXR.USD / FXR.HKD * (1 - CUST_PRICE[CID()].FX / 10000), 4)}</div></div>
      <div class="prod-tile" onclick="go('cust','xborder')"><span class="ios-ic lg" style="background:#ff3b30">${NAVICON.xborder}</span><div class="small muted">跨境付款（到中国）</div><div class="t">结汇 · 代付</div><div class="v">CNY ${nf(bal().CNY.a, 0)}</div></div>
    </div>
    <div class="card mt"><div class="card-head"><h3 class="card-title">最近交易</h3><a class="link" href="#/cust/txs">全部 ›</a></div>${custTxList(recent)}</div>`;
};
const TX_IC = { '入账': ['#34c759', '<path d="M12 19V5M5 12l7 7 7-7"/>'], '付款': ['#ff3b30', '<path d="M12 5v14M5 12l7-7 7 7"/>'], '提现': ['#ff9f0a', '<path d="M12 5v14M5 12l7-7 7 7"/>'], '换汇': ['#0071e3', '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>'], '跨境申报': ['#af52de', '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>'], '跨境代付': ['#ff3b30', '<path d="M12 5v14M5 12l7-7 7 7"/>'] };
const txSign = (t) => (t.type === '入账' ? '+' : t.amt ? '−' : '');
const txFee = (t) => (t.prod === 'FX' ? '费用含于汇率' : t.amt || t.prod.startsWith('VA') ? 'HKD ' + nf(split(t).actual) : '—');
function custTxList(list) {
  if (!list.length) return '<div class="empty">暂无交易</div>';
  return `<div class="ios-list inset">${list.map((t) => { const [c, d] = TX_IC[t.type] || ['#8e8e93', '<circle cx="12" cy="12" r="3"/>'];
    return `<a class="ios-row" href="javascript:void 0" onclick="txDetail('${t.id}')"><span class="ios-ic round" style="background:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span><span class="ios-main"><b>${t.cp}</b><small>${t.type} · ${t.date} · <span class="mono">${t.id}</span></small></span><span class="ios-end"><b class="num ${t.type === '入账' ? 'up' : ''}">${t.amt ? txSign(t) + t.ccy + ' ' + nf(t.amt) : '—'}</b><small>${t.status === '成功' ? (t.prod === 'FX' ? '费用含于汇率' : '手续费 ' + txFee(t)) : t.status}</small></span></a>`; }).join('')}</div>`;
}

// ---------- 账户管理 ----------
PAGES['cust:accounts'] = () => {
  const t = S.ui.at || 'mine';
  let body = '';
  if (t === 'mine') {
    body = `<div class="card-pad"><div class="acct-cards">${Object.entries(bal()).map(([c, b]) => `<div class="ccy-card wallet w-${c}"><div class="ccy"><span class="wc">${c}${c === 'CNY' ? ' · 跨境' : ''}</span><img src="./assets/azure-mark.png" alt="" class="wm"></div><div class="amt">${nf(b.a)}</div><div class="sub">可用 · 冻结 ${nf(b.f)}</div></div>`).join('')}</div></div>
      <div class="tbl-wrap"><table><thead><tr><th>账户昵称</th><th>币种</th><th>开户银行</th><th>账户号（银行分配）</th><th>贸易背景</th><th class="r">可用余额</th><th>状态</th><th class="r">操作</th></tr></thead><tbody>${myAccts().map((a, i) => `<tr><td class="bold">${a.nick}</td><td>${flag(a.ccy)}${a.ccy}</td><td>${a.bank}</td><td class="mono">${a.no}</td><td>${a.bg}</td><td class="r num">${nf((bal()[a.ccy] || { a: 0 }).a)}</td><td>${statusBadge(a.status)}</td><td class="r nowrap"><button class="link" onclick="acctDetail(${i})">详情</button>${a.status === '正常' && !a.xb ? ` · <button class="link" onclick="acctConfirm(${i})">账户证明</button>` : ''}${a.status === '正常' && !a.xb ? ` · <a class="link" href="#/cust/pay" onclick="S.nextUI={pt:'wd'}">提现</a>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (t === 'ledger') {
    let L = buildLedger();
    if (S.ui.lc) L = L.filter((r) => r.ccy === S.ui.lc);
    if (S.ui.lt) L = L.filter((r) => r.type === S.ui.lt);
    if (S.ui.lq) L = L.filter((r) => r.ref.includes(S.ui.lq) || r.note.includes(S.ui.lq));
    L = L.filter((r) => inRange(r.time, S.ui.lf, S.ui.lto));
    const types = [...new Set(buildLedger().map((r) => r.type))];
    const cr = L.reduce((a, r) => a + r.cr * FXR[r.ccy], 0), dr = L.reduce((a, r) => a + r.dr * FXR[r.ccy], 0);
    body = `<div class="toolbar wrap">${searchBox('lq', '搜索流水号 / 摘要')}${selectBox('lc', '币种', Object.keys(bal()))}${selectBox('lt', '类型', types)}${dateRange('lf', 'lto')}<div style="flex:1"></div><button class="btn sm" onclick="exportLedger()">${ICON.dl} 导出</button></div>
      <div class="sum-strip"><span>共 <b>${L.length}</b> 条</span><span>入账合计 <b class="up">≈ HKD ${nf(cr)}</b></span><span>出账合计 <b>≈ HKD ${nf(dr)}</b></span></div>
      <div class="tbl-wrap"><table><thead><tr><th>记账时间</th><th>流水号</th><th>账户号</th><th>币种</th><th>交易类型</th><th class="r">入账金额</th><th class="r">出账金额</th><th class="r">账户余额</th><th>摘要</th></tr></thead><tbody>${L.slice(0, 80).map((r) => `<tr><td class="nowrap">${r.time}</td><td class="mono">${r.ref}</td><td class="mono small">${r.acct}</td><td>${r.ccy}</td><td>${r.type}</td><td class="r num up">${r.cr ? nf(r.cr) : ''}</td><td class="r num">${r.dr ? nf(r.dr) : ''}</td><td class="r num bold">${nf(r.bal)}</td><td class="muted small">${r.note}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">没有符合条件的记录</td></tr>'}</tbody></table></div>`;
  } else if (t === 'frozen') {
    const rows = [...FROZEN, ...HELD_RETURNS];
    body = `<div class="card-pad">${note('冻结余额：付款、结汇处理中暂时冻结的金额，交易完成或失败后自动释放。退票暂存：退回的款项币种未开户时暂存在这里。')}</div><div class="tbl-wrap"><table><thead><tr><th>时间</th><th>关联单号</th><th>类型</th><th>币种</th><th class="r">金额</th><th>说明</th><th>释放条件</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.t}</td><td class="mono">${r.ref}</td><td>${statusBadge(r.reason === '退票暂存' ? '暂估' : '处理中').replace(/>[^<]+</, '>' + r.reason + '<')}</td><td>${r.ccy}</td><td class="r num">${nf(r.amt)}</td><td class="muted">${r.detail}</td><td class="small">${r.release}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    body = `<div class="toolbar"><span class="small muted">提现只能转到公司本人名下的银行账户，新增后需通道审核。</span><div style="flex:1"></div><button class="btn primary sm" onclick="newWithdrawAcct()">${ICON.plus} 新增提现账户</button></div><div class="tbl-wrap"><table><thead><tr><th>银行</th><th>户名</th><th>账号</th><th>币种</th><th>SWIFT</th><th>所在地</th><th>添加日期</th><th>状态</th></tr></thead><tbody>${WITHDRAW_ACCTS.map((w) => `<tr><td class="bold">${w.bank}</td><td>${w.name}</td><td class="mono">${w.acct}</td><td>${w.ccy}</td><td class="mono">${w.swift}</td><td>${w.region}</td><td>${w.added}</td><td>${statusBadge(w.status)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  return head('账户管理', '我的账户、账务明细、冻结余额与提现账户', `<button class="btn" onclick="go('cust','statements')">${ICON.dl} 对账单与证明</button><button class="btn primary" onclick="applyAccount()">${ICON.plus} 申请收款账户</button>`) +
    `<div class="card">${tabs('at', [['mine', '我的账户'], ['ledger', '账务明细'], ['frozen', '冻结余额'], ['wd', '提现账户']], t)}${body}</div>`;
};
function exportLedger() { const L = buildLedger(); dlCSV(`账务明细_${CID()}_${TODAY}.csv`, ['记账时间', '流水号', '账户号', '币种', '交易类型', '入账金额', '出账金额', '账户余额', '摘要'], L.map((r) => [r.time, r.ref, r.acct, r.ccy, r.type, r.cr ? r.cr.toFixed(2) : '', r.dr ? r.dr.toFixed(2) : '', r.bal.toFixed(2), r.note])); }
function acctDetail(i) {
  const a = myAccts()[i], V = VA_INFO;
  modal(a.nick, `${note(a.xb ? '跨境人民币账户用于跨境结汇入账和跨境代付到中国大陆，不能直接接收境外汇款。' : '把以下信息发给付款方，用于汇款到这个账户。')}<dl class="kv"><dt>客户号（平台）</dt><dd class="mono">${CID()}</dd><dt>账户名称</dt><dd>${cust(CID()).en.toUpperCase()}</dd><dt>开户银行</dt><dd>${a.xb ? a.bank : V.opening}</dd>${a.xb ? '' : `<dt>银行代码</dt><dd class="mono">${V.bankCode}</dd><dt>SWIFT</dt><dd class="mono">${V.swift}</dd>`}<dt>账户号（${a.xb ? '银行' : '渣打'}分配）</dt><dd class="mono">${a.no}</dd><dt>币种</dt><dd>${a.ccy}</dd>${a.xb ? '' : `<dt>银行地址</dt><dd>${V.address}</dd>`}<dt>子商户号</dt><dd class="mono">${V.subId}</dd><dt>开户日期</dt><dd>${V.opened[a.ccy] || '—'}</dd><dt>状态</dt><dd>${statusBadge(a.status)}</dd></dl>`,
    `<button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${a.no}');toast('已复制账户信息')">复制</button>${a.status === '正常' && !a.xb ? `<button class="btn primary" onclick="closeModal();acctConfirm(${i})">${ICON.dl} 生成账户证明</button>` : ''}`);
}
function acctConfirm(i, all = false) {
  const V = VA_INFO, c = cust(CID()), list = all ? myAccts().filter((a) => a.status === '正常' && !a.xb) : [myAccts()[i]];
  const ref = 'AC-' + CID() + '-' + (all ? 'ALL' : list[0].ccy) + '-' + TODAY.replace(/-/g, '');
  const body = `<p class="lt-dear">Dear <b>${c.en}</b>,</p><p>Your application for an overseas account has been successfully registered. You can now log in to Azure eBanking to receive funds, make payments and convert currencies on the account${list.length > 1 ? 's' : ''} below.</p>
    <div class="lt-sec">Overseas Account Details</div>${list.map((a) => lrows([['Customer Number', `<span class="mono">${c.id}</span>`], ['Bank Name', V.bankName], ['Opening Bank', V.opening], ['Account Name', c.en.toUpperCase()], ['Account Number', `<b class="mono">${a.no.replace(/\s/g, '')}</b>`], ['Bank Code', V.bankCode], ['Account Currency', `<b>${a.ccy}</b>`], ['SWIFT Code', V.swift], ['Bank Address', V.address], ['Sub-merchant ID', V.subId], ['Sub-merchant Name', c.en]])).join('<div class="lt-gap"></div>')}`;
  letterModal('账户证明 · Account Confirmation', letter({ title: 'Overseas Account Confirmation', ref, body }), `<button class="btn" onclick="toast('已向 Allinpay 申请带章版开户凭证，约 1 个工作日')">申请通道盖章版</button>`);
}
function newWithdrawAcct() {
  modal('新增提现账户', `<div class="form-grid"><div class="field"><label>账户所在地</label><select class="select"><option>中国香港</option><option>新加坡</option><option>中国内地</option></select></div><div class="field"><label>币种</label><select class="select"><option>HKD</option><option>USD</option><option>CNH</option></select></div><div class="field full"><label>户名（必须与公司名称一致）</label><input class="input" value="${cust(CID()).en}" disabled></div><div class="field"><label>银行名称</label><input class="input" placeholder="例：Hang Seng Bank"></div><div class="field"><label>SWIFT / 银行编码</label><input class="input"></div><div class="field"><label>账号</label><input class="input"></div><div class="field"><label>城市（英文）</label><input class="input"></div><div class="field full"><label>开户凭证（≤ 5MB）</label><input class="input" type="file"></div></div>${note('提交后由通道审核，通常 1 个工作日。')}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="WITHDRAW_ACCTS.push({id:'WA'+(WITHDRAW_ACCTS.length+1),bank:'Hang Seng Bank',name:'${cust(CID()).en}',acct:'024 **** 900',ccy:'HKD',swift:'HASEHKHH',region:'中国香港',status:'审核中',added:TODAY});closeModal();toast('已提交审核');render()">提交审核</button>`);
}
function applyAccount() {
  modal('申请收款账户', `<div class="field"><label>选择账户</label>${ACCOUNT_PRODUCTS.map((p) => `<label class="doc-item" style="opacity:${p.status === '可申请' ? 1 : .55}"><input type="radio" name="ap" ${p.status === '可申请' ? 'checked' : 'disabled'}/><div><div class="bold small">${p.bank} · ${p.region}</div><div class="small muted">${p.type} · ${p.bg}</div></div><span style="margin-left:auto">${statusBadge(p.status)}</span></label>`).join('')}</div>
    <div class="field"><label>收款币种</label><div class="btn-row">${['HKD', 'USD', 'CNH', 'EUR', 'GBP'].map((c) => { const has = myAccts().some((a) => a.ccy === c); return `<label class="tag" style="padding:6px 10px"><input type="checkbox" ${has ? 'disabled checked' : c === 'GBP' ? 'checked' : ''}/> ${c}${has ? '（已有）' : ''}</label>`; }).join('')}</div></div>
    <div class="field"><label>贸易收款背景</label><select class="select"><option>货物贸易</option><option>服务贸易</option></select></div>
    <div class="field"><label>账户昵称</label><input class="input" value="渣打英镑收款"/></div>
    ${note(`开户费按你的费率：<b>${priceStr('VA_OPEN', CUST_PRICE[CID()].VA_OPEN)}</b>，账户开通后由 Allinpay 从余额扣收。`)}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="closeModal();ACCOUNTS.push({cust:CID(),nick:'渣打英镑收款',region:'中国香港',bg:'货物贸易',ccy:'GBP',bank:'渣打银行（香港）',no:'申请中',status:'审核中',ap:'AP1'});toast('申请已提交，预计 1–2 个工作日');render()">提交申请</button>`);
}

// ---------- 对账单与证明 ----------
PAGES['cust:statements'] = () => {
  const t = S.ui.st || 'stmt';
  let body = '';
  if (t === 'stmt') {
    const kind = S.ui.sk || '月结单';
    body = `<div class="card-pad grid g2" style="align-items:start"><div style="display:grid;gap:14px">
      <div class="field"><label>对账单类型</label><div class="seg">${['日结单', '月结单', '自定义期间'].map((k) => `<button class="${k === kind ? 'on' : ''}" onclick="setUI('sk','${k}')">${k}</button>`).join('')}</div></div>
      ${kind === '日结单' ? `<div class="field"><label>交易日</label><input class="input" type="date" id="sd" value="2026-10-12"></div>` : kind === '月结单' ? `<div class="field"><label>月份</label><select class="select" id="sm"><option>2026-09</option><option>2026-08</option><option>2026-07</option></select></div>` : `<div class="field"><label>期间</label>${dateRange('sf', 'sto')}</div>`}
      <div class="field"><label>币种</label><select class="select" id="sc"><option value="">全部币种</option>${Object.keys(bal()).map((c) => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label>格式</label><div class="btn-row"><label class="tag" style="padding:6px 10px"><input type="radio" name="fmt" checked> PDF</label><label class="tag" style="padding:6px 10px"><input type="radio" name="fmt"> Excel</label></div></div>
      <button class="btn primary" style="justify-content:center" onclick="genStatement('${kind}')">生成对账单</button></div>
      <div class="card card-pad" style="background:var(--color-surface-2)"><div class="bold">对账单包含</div><ul class="small muted" style="margin:10px 0 0 18px;line-height:1.9"><li>余额汇总：日终余额、可用余额、冻结金额、待入账金额</li><li>账户活动：完成时间、交易单号、交易类型、币种、入账、出账、当前余额</li><li>手续费、成交汇率、交易对手</li><li>Security Code，可在线验证真伪</li></ul>${note('日结单每天 01:00 自动生成；月结单每月 1 日自动生成并发到管理员邮箱。', 'mt')}</div></div>
      <div class="card-head" style="padding-top:0"><h3 class="card-title">历史对账单</h3></div><div class="tbl-wrap"><table><thead><tr><th>期间</th><th>类型</th><th>币种</th><th>生成时间</th><th>格式</th><th class="r"></th></tr></thead><tbody>${[['2026-09', '月结单', '2026-10-01 01:00'], ['2026-10-12', '日结单', '2026-10-13 01:00'], ['2026-10-11', '日结单', '2026-10-12 01:00'], ['2026-08', '月结单', '2026-09-01 01:00']].map(([p, k, g]) => `<tr><td class="bold">${p}</td><td>${k}</td><td>全部</td><td>${g}</td><td>PDF · Excel</td><td class="r"><button class="btn sm" onclick="genStatement('${k}','${p}')">查看</button></td></tr>`).join('')}</tbody></table></div>`;
  } else if (t === 'conf') {
    body = `<div class="toolbar"><span class="small muted">账户开通后自动生成，包含银行、账号、SWIFT 等，可发给付款方或平台（如 Amazon、Shopify）做收款账户验证。</span><div style="flex:1"></div><button class="btn primary sm" onclick="acctConfirm(0,true)">${ICON.dl} 生成全部币种证明</button></div><div class="tbl-wrap"><table><thead><tr><th>账户</th><th>币种</th><th>账号</th><th>开户日期</th><th>平台版</th><th>通道盖章版</th><th class="r"></th></tr></thead><tbody>${myAccts().filter((a) => !a.xb).map((a, i) => `<tr><td class="bold">${a.nick}</td><td>${flag(a.ccy)}${a.ccy}</td><td class="mono">${a.no}</td><td>${VA_INFO.opened[a.ccy] || '—'}</td><td>${a.status === '正常' ? statusBadge('已生成') : '<span class="muted small">开通后生成</span>'}</td><td>${a.status === '正常' ? (a.ccy === 'HKD' || a.ccy === 'USD' ? statusBadge('已生成') : '<button class="link" onclick="toast(\'已向 Allinpay 申请\')">申请</button>') : '—'}</td><td class="r">${a.status === '正常' ? `<button class="btn sm" onclick="acctConfirm(${i})">查看 / 下载</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    body = `<div class="card-pad grid g2" style="align-items:start"><div style="display:grid;gap:14px"><div class="field"><label>截至日期</label><input class="input" type="date" id="bcd" value="2026-10-12"></div><div class="field"><label>用途</label><select class="select" id="bcp"><option>审计</option><option>银行开户</option><option>签证 / 投标</option><option>其他</option></select></div><button class="btn primary" style="justify-content:center" onclick="balanceCert()">生成余额证明</button></div>${note('余额证明列出截至日期各币种的日终余额，并附 Security Code。审计用途如需通道或银行盖章，请联系客户经理。')}</div>`;
  }
  return head('对账单与证明', '对账单、账户证明（Account Confirmation）、余额证明') + `<div class="card">${tabs('st', [['stmt', '对账单'], ['conf', '账户证明'], ['bal', '余额证明']], t)}${body}</div>`;
};
function genStatement(kind, preset) {
  const c = cust(CID());
  let from, to, label;
  if (preset) { if (preset.length === 7) { from = preset + '-01'; to = preset + '-31'; } else from = to = preset; }
  else if (kind === '日结单') from = to = ($('#sd') || {}).value || '2026-10-12';
  else if (kind === '月结单') { const m = ($('#sm') || {}).value || '2026-09'; from = m + '-01'; to = m + '-31'; }
  else { from = S.ui.sf || '2026-10-01'; to = S.ui.sto || TODAY; }
  label = from === to ? from : `${from} – ${to.replace(/-31$/, '-30')}`;
  const ccy = preset ? '' : ($('#sc') || {}).value || '';
  let L = buildLedger().filter((r) => inRange(r.time, from, to) && (!ccy || r.ccy === ccy)).reverse();
  const ccys = ccy ? [ccy] : Object.keys(bal());
  const sum = ccys.map((k) => { const all = buildLedger().filter((r) => r.ccy === k); const after = all.find((r) => r.time <= to + ' 99'); const close = after ? after.bal : 0; const fz = (bal()[k] || { f: 0 }).f; return [k, nf(close), nf(Math.max(0, close - fz)), nf(fz), nf(0)]; });
  const body = `${lrows([['Merchant Name', c.en], ['Merchant ID', VA_INFO.subId], ['Customer No.', CID()], ['Statement Period', label]])}
    <div class="lt-sec">Balance Summary</div><table class="lt-grid"><thead><tr><th>Currency 币种</th><th>Closing Balance 日终余额</th><th>Available 可用</th><th>Frozen 冻结</th><th>Pending 待入账</th></tr></thead><tbody>${sum.map((r) => `<tr>${r.map((v, i) => `<td class="${i ? 'r' : ''}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="lt-sec">Statement Activity</div><table class="lt-grid"><thead><tr><th>Completion Time</th><th>Transaction ID</th><th>Type</th><th>Ccy</th><th class="r">Credit</th><th class="r">Debit</th><th class="r">Balance</th></tr></thead><tbody>${L.map((r) => `<tr><td>${r.time}</td><td class="mono">${r.ref}</td><td>${r.type}</td><td>${r.ccy}</td><td class="r">${r.cr ? nf(r.cr) : ''}</td><td class="r">${r.dr ? nf(r.dr) : ''}</td><td class="r">${nf(r.bal)}</td></tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:#888">No activity in this period</td></tr>'}</tbody></table>`;
  letterModal(`${kind} · ${label}`, letter({ title: kind === '日结单' ? 'Account Daily Statement' : 'Account Statement', ref: `ST-${CID()}-${from.replace(/-/g, '')}`, body }), `<button class="btn" onclick="exportLedger()">${ICON.dl} Excel</button>`);
}
function balanceCert() {
  const c = cust(CID()), d = ($('#bcd') || {}).value || '2026-10-12', p = ($('#bcp') || {}).value || '审计';
  const rows = Object.keys(bal()).map((k) => { const r = buildLedger().find((x) => x.ccy === k && x.time <= d + ' 99'); return [k, r ? r.bal : 0]; });
  const body = `<p class="lt-dear">To whom it may concern,</p><p>This is to certify that <b>${c.en}</b> (Customer No. ${CID()}) maintains the following account balances with Azure eBanking as at the close of business on <b>${d}</b>. Purpose: ${p}.</p><table class="lt-grid"><thead><tr><th>Currency</th><th>Account Number</th><th class="r">Closing Balance</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td class="mono">${(myAccts().find((a) => a.ccy === k) || {}).no || '—'}</td><td class="r">${nf(v)}</td></tr>`).join('')}</tbody></table>`;
  letterModal('余额证明', letter({ title: 'Balance Confirmation', ref: `BC-${CID()}-${d.replace(/-/g, '')}`, body }));
}

// ---------- 汇兑中心 ----------
PAGES['cust:fx'] = () => {
  const f = (S.fx ||= { sell: 'USD', buy: 'HKD', amt: 10000, range: '7', lock: 'S' });
  const mk = CUST_PRICE[CID()].FX, mid = FXR[f.sell] / FXR[f.buy], rate = mid * (1 - mk / 10000);
  const sellAmt = f.lock === 'S' ? f.amt : f.amt / rate, out = f.lock === 'S' ? f.amt * rate : f.amt;
  const days = +f.range; let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pts = Array.from({ length: days * 4 + 1 }, (_, i) => mid * (1 + (rnd() - 0.5) * 0.004 + Math.sin(i / 5) * 0.0015)); pts[pts.length - 1] = mid;
  AFTER.push(() => {
    const acc = cssVar('--accent'), txt = cssVar('--color-text-muted'), grid = cssVar('--color-divider');
    chart('fxc', { type: 'line', data: { labels: pts.map((_, i) => i), datasets: [{ data: pts, borderColor: acc, backgroundColor: acc + '22', fill: true, pointRadius: 0, tension: .3, borderWidth: 2 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: () => '', label: (c) => '汇率 ' + c.raw.toFixed(6) } } }, scales: { x: { display: false }, y: { grid: { color: grid }, ticks: { color: txt, callback: (v) => v.toFixed(4) } } } } });
  });
  const ccys = fxCcys(), avail = bal()[f.sell] ? bal()[f.sell].a : 0;
  // orders list
  let O = FX_ORDERS.slice();
  if (S.ui.fq) O = O.filter((o) => o.id.includes(S.ui.fq));
  if (S.ui.fs) O = O.filter((o) => o.status === S.ui.fs);
  O = O.filter((o) => inRange(o.time, S.ui.ff, S.ui.fto));
  const acctName = (c) => (myAccts().find((a) => a.ccy === c) || {}).nick || c + ' 账户';
  return head('汇兑中心', '实时报价，确认后即时成交。成交汇率已包含服务费，不另收手续费') +
    `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);align-items:start"><div class="card card-pad fx-box">
      <div class="seg sm">${[['S', '锁定卖出金额'], ['B', '锁定买入金额']].map(([k, l]) => `<button class="${f.lock === k ? 'on' : ''}" onclick="S.fx.lock='${k}';render()">${l}</button>`).join('')}</div>
      <div class="small muted">卖出（${acctName(f.sell)} · 可用 ${nf(avail)}）</div>
      <div class="fx-line"><select onchange="S.fx.sell=this.value;if(S.fx.sell===S.fx.buy)S.fx.buy=this.value==='HKD'?'USD':'HKD';render()">${ccys.map((c) => `<option ${c === f.sell ? 'selected' : ''}>${c}</option>`).join('')}</select>${f.lock === 'S' ? `<input value="${f.amt}" onchange="S.fx.amt=+this.value.replace(/,/g,'')||0;render()" aria-label="卖出金额"/><button class="btn sm" onclick="S.fx.amt=${Math.floor(avail)};render()">最大</button>` : `<input value="${nf(sellAmt)}" disabled aria-label="卖出金额"/><span></span>`}</div>
      <div style="text-align:center"><button class="icon-btn" style="margin:auto" aria-label="对调" onclick="const t=S.fx.sell;S.fx.sell=S.fx.buy;S.fx.buy=t;render()">⇅</button></div>
      <div class="small muted">买入（${acctName(f.buy)}）</div>
      <div class="fx-line"><select onchange="S.fx.buy=this.value;render()">${ccys.filter((c) => c !== f.sell).map((c) => `<option ${c === f.buy ? 'selected' : ''}>${c}</option>`).join('')}</select>${f.lock === 'B' ? `<input value="${f.amt}" onchange="S.fx.amt=+this.value.replace(/,/g,'')||0;render()" aria-label="买入金额"/><span></span>` : `<input value="${nf(out)}" disabled aria-label="买入金额"/><span></span>`}</div>
      <div class="calc-out"><span class="muted">成交汇率</span><b class="num">1 ${f.sell} = ${nf(rate, 4)} ${f.buy}</b><span class="muted">报价有效</span><span id="fxTimer">30 秒</span></div>
      <div class="field"><label>备注（选填）</label><input class="input" id="fxRemark" placeholder="例：9 月货款结汇"></div>
      <button class="btn primary" style="justify-content:center" ${sellAmt <= 0 || sellAmt > avail ? 'disabled' : ''} onclick="fxConfirm()">确认兑换</button>${sellAmt > avail ? '<div class="small down">余额不足</div>' : ''}
    </div>
    <div class="card"><div class="card-head"><h3 class="card-title">${f.sell}/${f.buy} 走势</h3><div class="chip-row">${[['1', '1天'], ['7', '7天'], ['15', '15天'], ['30', '30天']].map(([k, l]) => `<button class="chip ${k === f.range ? 'on' : ''}" onclick="S.fx.range='${k}';render()">${l}</button>`).join('')}</div></div><div class="small muted" style="padding:0 24px">实时汇率 1.00 ${f.sell} = ${nf(mid, 6)} ${f.buy} · 更新于 ${TODAY} 15:20</div><div class="chart-box" style="height:300px"><canvas id="fxc"></canvas></div></div></div>
    <div class="card mt" id="fxOrders"><div class="card-head"><h3 class="card-title">换汇交易明细</h3><span class="card-sub">${O.length} 笔</span></div>
      <div class="toolbar wrap">${searchBox('fq', '搜索换汇单号')}${selectBox('fs', '状态', ['已交割', '处理中', '已取消'])}${dateRange('ff', 'fto')}<div style="flex:1"></div><button class="btn sm" onclick="exportFx()">${ICON.dl} 导出</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>创建时间</th><th>换汇单号</th><th>卖出账户</th><th>卖出币种</th><th class="r">卖出金额</th><th>买入账户</th><th>买入币种</th><th class="r">买入金额</th><th class="r">成交汇率</th><th>备注</th><th>状态</th><th class="r">操作</th></tr></thead><tbody>${O.map((o) => `<tr><td class="nowrap">${o.time}</td><td class="mono nowrap">${o.id} <button class="icon-mini" title="复制" onclick="navigator.clipboard&&navigator.clipboard.writeText('${o.id}');toast('已复制单号')">⧉</button></td><td>${acctName(o.sell)}</td><td>${flag(o.sell)}${o.sell}</td><td class="r num">${nf(o.sellAmt)}</td><td>${acctName(o.buy)}</td><td>${flag(o.buy)}${o.buy}</td><td class="r num">${nf(o.buyAmt)}</td><td class="r num">${o.rate.toFixed(6)}</td><td class="small">${o.remark ? esc(o.remark) : '<span class="muted">—</span>'} <button class="icon-mini" title="编辑备注" onclick="fxRemark('${o.id}')">✎</button></td><td>${statusBadge(o.status)}</td><td class="r"><button class="link" onclick="fxDetail('${o.id}')">查看</button></td></tr>`).join('') || '<tr><td colspan="12" class="empty">没有符合条件的换汇记录</td></tr>'}</tbody></table></div></div>`;
};
function exportFx() { dlCSV(`换汇明细_${CID()}_${TODAY}.csv`, ['创建时间', '换汇单号', '卖出币种', '卖出金额', '买入币种', '买入金额', '成交汇率', '备注', '状态'], FX_ORDERS.map((o) => [o.time, o.id, o.sell, o.sellAmt.toFixed(2), o.buy, o.buyAmt.toFixed(2), o.rate.toFixed(6), o.remark, o.status])); }
function fxRemark(id) {
  const o = FX_ORDERS.find((x) => x.id === id);
  modal('编辑备注', `<div class="field"><label>换汇单号 ${id}</label><input class="input" id="rmk" value="${esc(o.remark)}" placeholder="仅自己可见，便于对账"></div>`, `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="FX_ORDERS.find(x=>x.id==='${id}').remark=$('#rmk').value;closeModal();render()">保存</button>`);
}
function fxDetail(id) {
  const o = FX_ORDERS.find((x) => x.id === id), c = cust(CID());
  const step = o.status === '已交割' ? 3 : o.status === '处理中' ? 1 : 1;
  modal('换汇详情', `<div class="detail-hero"><div><small>卖出</small><b>${o.sell} ${nf(o.sellAmt)}</b></div><span>→</span><div><small>买入</small><b>${o.buy} ${nf(o.buyAmt)}</b></div></div>
    <dl class="kv"><dt>换汇单号</dt><dd class="mono">${o.id}</dd><dt>关联交易号</dt><dd class="mono">${o.tx}</dd><dt>成交汇率</dt><dd class="num">1 ${o.sell} = ${o.rate.toFixed(6)} ${o.buy}</dd><dt>手续费</dt><dd>已包含在汇率中</dd><dt>备注</dt><dd>${esc(o.remark) || '—'}</dd><dt>状态</dt><dd>${statusBadge(o.status)}</dd></dl>
    ${o.status === '已取消' ? note('报价超时未确认，已自动取消，未扣款。', 'warn') : timeline([['提交', o.time], ['锁定汇率', o.time], ['卖出扣款', o.time], ['买入入账', o.status === '已交割' ? o.time : '处理中']], step)}`,
    o.status === '已交割' ? `<button class="btn primary" onclick="closeModal();fxAdvice('${id}')">${ICON.dl} 成交确认书</button>` : '');
}
function fxAdvice(id) {
  const o = FX_ORDERS.find((x) => x.id === id), c = cust(CID());
  letterModal('换汇成交确认书', letter({ title: 'FX Deal Confirmation', ref: o.id, date: o.time.slice(0, 10), body: `<p class="lt-dear">Dear <b>${c.en}</b>,</p><p>We confirm the following foreign exchange transaction executed on your account:</p>${lrows([['Deal Reference', o.id], ['Trade Time', o.time], ['Sold', `<b>${o.sell} ${nf(o.sellAmt)}</b>`], ['Bought', `<b>${o.buy} ${nf(o.buyAmt)}</b>`], ['Deal Rate', `1 ${o.sell} = ${o.rate.toFixed(6)} ${o.buy}`], ['Debit Account', (myAccts().find((a) => a.ccy === o.sell) || {}).no || '—'], ['Credit Account', (myAccts().find((a) => a.ccy === o.buy) || {}).no || '—'], ['Value Date', o.time.slice(0, 10)], ['Charges', 'Included in deal rate'], ['Status', 'Settled']])}` }));
}
function fxConfirm() {
  const f = S.fx, mk = CUST_PRICE[CID()].FX, rate = FXR[f.sell] / FXR[f.buy] * (1 - mk / 10000);
  const sellAmt = f.lock === 'S' ? f.amt : f.amt / rate, out = f.lock === 'S' ? f.amt * rate : f.amt;
  S.fxRemark = ($('#fxRemark') || {}).value || '';
  modal('确认兑换', `<dl class="kv"><dt>卖出</dt><dd>${money(sellAmt, f.sell)}</dd><dt>买入</dt><dd>${money(out, f.buy)}</dd><dt>成交汇率</dt><dd class="num">${nf(rate, 4)}</dd></dl>${note('确认后即时成交，不能撤销。')}<div class="field"><label>交易密码</label><input class="input" type="password" value="******"/></div>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="fxDo(${sellAmt},${out},${rate})">确认</button>`);
}
function fxDo(sellAmt, out, rate) {
  const f = S.fx; bal()[f.sell].a -= sellAmt; (bal()[f.buy] ||= { a: 0, f: 0 }).a += out;
  const id = 'T26101' + Math.floor(Math.random() * 9000 + 1000), now = new Date(), time = `${TODAY} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  TXS.unshift({ id, date: TODAY, time, cust: CID(), type: '换汇', prod: 'FX', ccy: f.sell, amt: sellAmt, cp: `${f.sell} → ${f.buy}`, status: '成功', ch: 'ALLINPAY_HK' });
  FX_ORDERS.unshift({ id: 'FXOC' + TODAY.replace(/-/g, '') + Math.floor(1000000 + Math.random() * 8999999), tx: id, time, sell: f.sell, sellAmt, buy: f.buy, buyAmt: out, rate, remark: S.fxRemark, status: '已交割' });
  closeModal(); toast(`兑换成功：获得 ${f.buy} ${nf(out)}`); render();
  setTimeout(() => { const el = $('#fxOrders'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 60);
}

// ---------- 全球付款 ----------
const payees = (biz) => CPS.filter((c) => c.dir === '收款方' && c.status === '正常' && c.biz.includes(biz));
PAGES['cust:pay'] = () => {
  const t = S.ui.pt || 'pay';
  let body = '';
  if (t === 'pay') {
    const list = payees('全球付款');
    const p = (S.pay ||= { cp: list[0].id, ai: 0, from: 'USD', amt: 25000, lock: 'S', fee: 'S', purpose: '货物贸易', memo: 'INVOICE INV-2026-1088' });
    if (!list.find((c) => c.id === p.cp)) p.cp = list[0].id;
    const cp = list.find((c) => c.id === p.cp), acc = cp.accts[p.ai] || cp.accts[0], toCcy = acc.ccy === 'CNY' ? 'CNH' : acc.ccy;
    const isHK = cp.country === '中国香港', fee = CUST_PRICE[CID()][isHK ? 'PAYOUT_HK' : 'PAYOUT_INTL'];
    const rate = p.from === toCcy ? 1 : FXR[p.from] / FXR[toCcy] * (1 - CUST_PRICE[CID()].FX / 10000);
    const sellAmt = p.lock === 'S' ? p.amt : p.amt / rate, recv = (p.lock === 'S' ? p.amt * rate : p.amt) - (p.fee === 'B' ? fee / FXR[toCcy] : 0);
    const needReview = sellAmt * FXR[p.from] / FXR.USD > 50000, memoBad = hasCJK(p.memo);
    body = `<div class="card-pad grid g2" style="align-items:start"><div style="display:grid;gap:14px">
      <div class="form-grid"><div class="field"><label>付款账户</label><select class="select" onchange="S.pay.from=this.value;render()">${fxCcys().map((c) => `<option value="${c}" ${c === p.from ? 'selected' : ''}>${c} · 可用 ${nf(bal()[c].a)}</option>`).join('')}</select></div>
      <div class="field"><label>收款方</label><select class="select" onchange="S.pay.cp=this.value;S.pay.ai=0;render()">${list.map((c) => `<option value="${c.id}" ${c.id === p.cp ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
      <div class="field full"><label>收款账户</label><select class="select" onchange="S.pay.ai=+this.value;render()">${cp.accts.map((a, i) => `<option value="${i}" ${i === p.ai ? 'selected' : ''}>${a.bank} · ${a.acct} · ${a.ccy}</option>`).join('')}</select></div></div>
      <div class="field"><label>锁定方</label><div class="seg">${[['S', `锁定付款金额（${p.from}）`], ['B', `锁定到账金额（${toCcy}）`]].map(([k, l]) => `<button class="${p.lock === k ? 'on' : ''}" onclick="S.pay.lock='${k}';render()">${l}</button>`).join('')}</div></div>
      <div class="field"><label>金额（${p.lock === 'S' ? p.from : toCcy}）</label><input class="input" value="${p.amt}" onchange="S.pay.amt=+this.value.replace(/,/g,'')||0;render()"/></div>
      <div class="form-grid"><div class="field"><label>汇款用途</label><select class="select" onchange="S.pay.purpose=this.value">${PURPOSES.map((x) => `<option ${x === p.purpose ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>手续费扣取</label><select class="select" onchange="S.pay.fee=this.value;render()"><option value="S" ${p.fee === 'S' ? 'selected' : ''}>外扣：另外从余额扣</option><option value="B" ${p.fee === 'B' ? 'selected' : ''}>内扣：从到账金额扣</option></select></div></div>
      <div class="field"><label>汇款附言（英文，不能输入中文）</label><input class="input ${memoBad ? 'bad' : ''}" value="${esc(p.memo)}" maxlength="140" onchange="S.pay.memo=this.value;render()"/>${memoBad ? '<div class="small down">附言包含中文，通道会拒绝，请改用英文</div>' : ''}</div>
      <div class="field"><label>交易背景材料（发票 / 合同，选填）</label><input class="input" type="file"></div>
    </div><div class="card card-pad sticky" style="background:var(--color-surface-2)"><div class="bold">付款摘要</div><div class="calc-out mt"><span class="muted">收款方</span><span>${cp.name}</span><span class="muted">收款银行</span><span>${acc.bank}</span><span class="muted">国家 / 地区</span><span>${cp.country}</span><span class="muted">付款金额</span><span class="num">${p.from} ${nf(sellAmt)}</span>${p.from !== toCcy ? `<span class="muted">汇率</span><span class="num">1 ${p.from} = ${nf(rate, 4)} ${toCcy}</span>` : ''}<span class="muted">手续费（${isHK ? '香港' : '非香港'}，${p.fee === 'B' ? '内扣' : '外扣'}）</span><span class="num">HKD ${nf(fee)}</span><span class="tot">收款方到账</span><span class="tot num">${toCcy} ${nf(recv)}</span></div>
      ${needReview ? note('单笔超过 USD 50,000，提交后需要复核员（CFO）批准。', 'warn') : ''}<div class="small muted mt">预计到账：${isHK ? '当天' : '1–3 个工作日'} · 用途：${p.purpose}</div>
      <button class="btn primary mt" style="width:100%;justify-content:center" ${memoBad || sellAmt > bal()[p.from].a ? 'disabled' : ''} onclick="payDo(${needReview},${sellAmt})">提交付款</button>${sellAmt > bal()[p.from].a ? '<div class="small down mt">余额不足</div>' : ''}</div></div>`;
  } else if (t === 'batch') {
    const b = S.ui.bstep || 0;
    body = `<div class="card-pad">${batchFlow('批量付款', b, [
      ['Pacific Logistics Pte Ltd', 'DBS · 0720****331', 'USD', 12800, '货物贸易', 'OK'], ['Tanaka Trading Co., Ltd.', 'MUFG · 4410****902', 'USD', 9600, '货物贸易', '收款方修改待审核'], ['Shenzhen Huaxing Components', 'CMB · 7559****2203', 'USD', 22400, '货物贸易', 'OK'], ['Kowloon Packaging Ltd', 'BOCHK · 012****776', 'HKD', 18000, '货物贸易', '收款方未审核通过'], ['Pacific Logistics Pte Ltd', 'DBS · 0720****331', 'USD', 4300, '运费', 'OK']])}</div>`;
  } else {
    const p = (S.wd ||= { wa: 'WA1', amt: 50000 });
    const list = WITHDRAW_ACCTS.filter((w) => w.status === '正常'), w = list.find((x) => x.id === p.wa) || list[0], fee = CUST_PRICE[CID()].PAYOUT_HK;
    body = `<div class="card-pad grid g2" style="align-items:start"><div style="display:grid;gap:14px"><div class="field"><label>付款方账户</label><input class="input" value="${w.ccy} 账户 · 可用 ${nf(bal()[w.ccy].a)}" disabled></div><div class="field"><label>提现到（本人账户）</label><select class="select" onchange="S.wd.wa=this.value;render()">${list.map((x) => `<option value="${x.id}">${x.bank} · ${x.acct} · ${x.ccy}</option>`).join('')}</select></div><div class="field"><label>金额（${w.ccy}）</label><input class="input" value="${p.amt}" onchange="S.wd.amt=+this.value||0;render()"></div><div class="field"><label>备注</label><input class="input" placeholder="例：调拨营运资金"></div></div>
      <div class="card card-pad" style="background:var(--color-surface-2)"><div class="bold">提现摘要</div><div class="calc-out mt"><span class="muted">到账银行</span><span>${w.bank}</span><span class="muted">提现金额</span><span class="num">${w.ccy} ${nf(p.amt)}</span><span class="muted">手续费</span><span class="num">HKD ${nf(fee)}</span><span class="tot">预计到账</span><span class="tot">当天</span></div><button class="btn primary mt" style="width:100%;justify-content:center" onclick="wdDo()">提交提现</button><div class="small muted mt">新增提现账户请到“账户管理 → 提现账户”。</div></div></div>`;
  }
  return head('全球付款', '付款给全球供应商、批量付款、提现到本人账户', `<a class="btn" href="#/cust/cp">${NAVICON.cp} 交易对手管理</a>`) + `<div class="card">${tabs('pt', [['pay', '单笔付款'], ['batch', '批量付款'], ['wd', '提现']], t)}${body}</div>`;
};
function batchFlow(kind, step, rows) {
  const steps = ['下载模板', '上传报盘文件', '校验结果', '提交复核'];
  const bar = `<div class="steps" style="padding:0 0 20px">${steps.map((s, i) => `<div class="step ${i < step ? 'done' : i === step ? 'on' : ''}"><span class="dot">${i < step ? '✓' : i + 1}</span>${s}</div>`).join('<span class="line"></span>')}</div>`;
  if (step === 0) return bar + `<div class="drop"><div class="bold">第 1 步：下载 ${kind} 模板</div><div class="small muted">模板列：收款方名称、收款账号、币种、金额、汇款用途、附言（英文）。单个文件 ≤ 20MB，最多 500 笔。</div><div class="btn-row" style="justify-content:center;margin-top:14px"><button class="btn" onclick="dlCSV('${kind}模板.csv',['收款方名称','收款账号','币种','金额','汇款用途','附言'],[['Pacific Logistics Pte Ltd','0720xxxx331','USD','12800.00','货物贸易','INV-1088']])">${ICON.dl} 下载模板</button><button class="btn primary" onclick="setUI('bstep',1)">下一步</button></div></div>`;
  if (step === 1) return bar + `<div class="drop"><div class="bold">第 2 步：上传填好的报盘文件</div><div class="small muted">支持 .xlsx / .csv</div><div class="btn-row" style="justify-content:center;margin-top:14px"><input type="file" class="input" style="max-width:260px"><button class="btn primary" onclick="setUI('bstep',2)">使用示例文件</button></div></div>`;
  if (step === 2) { const ok = rows.filter((r) => r[5] === 'OK'); return bar + `${note(`共 ${rows.length} 笔，<b>${ok.length} 笔通过</b>，${rows.length - ok.length} 笔有问题。可以只提交通过的笔数，有问题的修正后再上传。`, rows.length - ok.length ? 'warn' : '')}<div class="tbl-wrap"><table><thead><tr><th>#</th><th>收款方</th><th>收款账户</th><th>币种</th><th class="r">金额</th><th>用途</th><th>校验</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="bold">${r[0]}</td><td class="mono small">${r[1]}</td><td>${r[2]}</td><td class="r num">${nf(r[3])}</td><td>${r[4]}</td><td>${r[5] === 'OK' ? statusBadge('正常').replace('正常', '通过') : `<span class="badge err">${r[5]}</span>`}</td></tr>`).join('')}</tbody></table></div><div class="btn-row mt" style="justify-content:flex-end"><button class="btn" onclick="setUI('bstep',1)">重新上传</button><button class="btn primary" onclick="BATCHES.unshift({id:'BT${TODAY.replace(/-/g, '')}0${BATCHES.length + 1}',type:'${kind}',created:TODAY+' 15:30',file:'示例报盘.xlsx',total:${ok.length},ok:0,fail:0,ing:${ok.length},amt:'USD ${nf(ok.reduce((a, r) => a + r[3], 0))}',status:'待复核'});setUI('bstep',3)">提交 ${ok.length} 笔</button></div>`; }
  return bar + `<div class="drop"><div class="bold">已提交，等待复核员批准</div><div class="small muted">批次进度可在“交易中心 → 批量交易”查看。</div><div class="btn-row" style="justify-content:center;margin-top:14px"><a class="btn primary" href="#/cust/txs" onclick="S.nextUI={tt:'batch'}">查看批次</a><button class="btn" onclick="setUI('bstep',0)">再上传一批</button></div></div>`;
}
function payDo(review, sellAmt) {
  const p = S.pay, cp = CPS.find((c) => c.id === p.cp), isHK = cp.country === '中国香港';
  const id = 'T26101' + Math.floor(Math.random() * 9000 + 1000);
  TXS.unshift({ id, date: TODAY, time: TODAY + ' 15:32:10', cust: CID(), type: '付款', prod: isHK ? 'PAYOUT_HK' : 'PAYOUT_INTL', ccy: p.from, amt: Math.round(sellAmt * 100) / 100, cp: cp.name, status: review ? '待复核' : '处理中', ch: 'ALLINPAY_HK', purpose: p.purpose, memo: p.memo, maker: ME.cust.email });
  if (!review) { bal()[p.from].a -= sellAmt; bal()[p.from].f += sellAmt; }
  toast(review ? '已提交，等待复核员批准' : '付款已提交通道，处理中'); S.nextUI = { tt: 'orders' }; go('cust', 'txs');
}
function wdDo() {
  const w = WITHDRAW_ACCTS.find((x) => x.id === S.wd.wa) || WITHDRAW_ACCTS[0];
  TXS.unshift({ id: 'T26101' + Math.floor(Math.random() * 9000 + 1000), date: TODAY, time: TODAY + ' 15:35:00', cust: CID(), type: '提现', prod: 'PAYOUT_HK', ccy: w.ccy, amt: S.wd.amt, cp: w.bank + '（本人账户）', status: '处理中', ch: 'ALLINPAY_HK' });
  bal()[w.ccy].a -= S.wd.amt; bal()[w.ccy].f += S.wd.amt; toast('提现已提交'); S.nextUI = { tt: 'orders' }; go('cust', 'txs');
}

// ---------- 跨境付款（到中国） ----------
PAGES['cust:xborder'] = () => {
  const t = S.ui.xt || 'decl';
  const x = (S.xb ||= { from: 'USD', amt: 20000, fee: 'S', code: '121010', cp: 'CP1', camt: 30000 });
  const feeX = CUST_PRICE[CID()].PAYOUT_INTL;
  let body = '';
  if (t === 'decl') {
    const rate = FXR[x.from] / FXR.CNY * (1 - CUST_PRICE[CID()].FX / 10000), cny = x.amt * rate;
    body = `<div class="card-pad grid g2" style="align-items:start"><div style="display:grid;gap:14px">
      ${note('跨境申报（结汇到中国）：从外币账户卖出，买入人民币到你的<b>跨境人民币账户</b>，之后可以代付给内地收款方。', 'mt0')}
      <div class="form-grid"><div class="field"><label>卖出账户</label><select class="select" onchange="S.xb.from=this.value;render()">${['USD', 'HKD', 'EUR', 'CNH'].filter((c) => bal()[c]).map((c) => `<option ${c === x.from ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label>买入账户</label><input class="input" value="跨境人民币账户 · 8200 0000 1422 01" disabled></div></div>
      <div class="field"><label>卖出金额（${x.from}）</label><input class="input" value="${x.amt}" onchange="S.xb.amt=+this.value||0;render()"></div>
      <div class="form-grid"><div class="field"><label>申报编码及用途</label><select class="select" onchange="S.xb.code=this.value">${DECL_CODES.map(([k, l]) => `<option value="${k}" ${k === x.code ? 'selected' : ''}>${k} ${l}</option>`).join('')}</select></div><div class="field"><label>手续费扣取</label><select class="select" onchange="S.xb.fee=this.value;render()"><option value="S" ${x.fee === 'S' ? 'selected' : ''}>外扣</option><option value="B" ${x.fee === 'B' ? 'selected' : ''}>内扣</option></select></div></div>
      <div class="field"><label>交易背景材料（合同 / 发票 / 报关单）</label><input class="input" type="file"></div></div>
      <div class="card card-pad sticky" style="background:var(--color-surface-2)"><div class="bold">结汇摘要</div><div class="calc-out mt"><span class="muted">卖出</span><span class="num">${x.from} ${nf(x.amt)}</span><span class="muted">汇率</span><span class="num">1 ${x.from} = ${nf(rate, 4)} CNY</span><span class="muted">申报编码</span><span>${x.code}</span><span class="muted">手续费</span><span>含于汇率 · 待渠道确认</span><span class="tot">买入人民币</span><span class="tot num">CNY ${nf(cny)}</span></div>${note('申报编码由通道客户经理按你的业务配置。这个功能的接口还在向 Allinpay 确认，上线前可能走人工处理。', 'warn')}<button class="btn primary mt" style="width:100%;justify-content:center" onclick="xbDecl(${cny})">提交申报</button></div></div>`;
  } else if (t === 'payout') {
    const list = payees('跨境付汇').concat(CPS.filter((c) => c.dir === '收款方' && c.biz.includes('跨境付汇') && c.status !== '正常'));
    const cp = list.find((c) => c.id === x.cp) || list[0], ok = cp.status === '正常', acc = cp.accts.find((a) => a.ccy === 'CNY') || cp.accts[0];
    const recv = x.fee === 'B' ? x.camt - feeX / FXR.CNY : x.camt;
    body = `<div class="card-pad grid g2" style="align-items:start"><div style="display:grid;gap:14px">
      ${note('跨境代付（中国大陆）：从跨境人民币账户付款给内地收款方。收款方必须开通“跨境付汇”业务并审核通过。', 'mt0')}
      <div class="field"><label>付款账户</label><input class="input" value="跨境人民币账户 · 可用 CNY ${nf(bal().CNY.a)}" disabled></div>
      <div class="field"><label>收款方</label><select class="select" onchange="S.xb.cp=this.value;render()">${list.map((c) => `<option value="${c.id}" ${c.id === cp.id ? 'selected' : ''}>${c.cn || c.name} · ${c.status}</option>`).join('')}</select>${!ok ? `<div class="small down">该收款方状态为“${cp.status}”，不能付款。请先到交易对手管理完善资料。</div>` : ''}</div>
      <div class="field"><label>收款账户</label><input class="input" value="${acc.bank} · ${acc.acct} · ${acc.nature}" disabled></div>
      <div class="form-grid"><div class="field"><label>付款金额（CNY）</label><input class="input" value="${x.camt}" onchange="S.xb.camt=+this.value||0;render()"></div><div class="field"><label>手续费扣取</label><select class="select" onchange="S.xb.fee=this.value;render()"><option value="S" ${x.fee === 'S' ? 'selected' : ''}>外扣</option><option value="B" ${x.fee === 'B' ? 'selected' : ''}>内扣</option></select></div></div>
      <div class="field"><label>申报编码</label><select class="select">${DECL_CODES.map(([k, l]) => `<option>${k} ${l}</option>`).join('')}</select></div></div>
      <div class="card card-pad sticky" style="background:var(--color-surface-2)"><div class="bold">代付摘要</div><div class="calc-out mt"><span class="muted">收款方</span><span>${cp.cn || cp.name}</span><span class="muted">付款金额</span><span class="num">CNY ${nf(x.camt)}</span><span class="muted">手续费</span><span class="num">HKD ${nf(feeX)}</span><span class="tot">到账金额</span><span class="tot num">CNY ${nf(recv)}</span></div><button class="btn primary mt" style="width:100%;justify-content:center" ${!ok || x.camt > bal().CNY.a ? 'disabled' : ''} onclick="xbPay('${cp.id}')">提交代付</button>${x.camt > bal().CNY.a ? '<div class="small down mt">跨境人民币账户余额不足，请先做跨境申报</div>' : ''}</div></div>`;
  } else {
    body = `<div class="card-pad">${batchFlow('批量代付（中国大陆）', S.ui.bstep || 0, [['深圳华兴元件有限公司', 'CMB · 7559****0018', 'CNY', 88000, '121010', 'OK'], ['王小明', 'ICBC · 6222****8812', 'CNY', 12000, '228010', '收款方待完善'], ['深圳华兴元件有限公司', 'CMB · 7559****0018', 'CNY', 46500, '121010', 'OK']])}</div>`;
  }
  return head('跨境付款（到中国）', '跨境申报结汇、跨境代付到中国大陆、批量代付') + `<div class="card">${tabs('xt', [['decl', '跨境申报（结汇）'], ['payout', '跨境代付（中国大陆）'], ['batch', '批量代付']], t)}${body}</div>`;
};
function xbDecl(cny) {
  const x = S.xb; bal()[x.from].a -= x.amt;
  TXS.unshift({ id: 'T26101' + Math.floor(Math.random() * 9000 + 1000), date: TODAY, time: TODAY + ' 15:40:00', cust: CID(), type: '跨境申报', prod: 'FX', ccy: x.from, amt: x.amt, buyAmt: cny, cp: `${x.from} → CNY · 申报 ${x.code}`, status: '处理中', ch: 'ALLINPAY_HK' });
  toast('跨境申报已提交，处理中'); S.nextUI = { tt: 'orders' }; go('cust', 'txs');
}
function xbPay(id) {
  const x = S.xb, cp = CPS.find((c) => c.id === id); bal().CNY.a -= x.camt; bal().CNY.f += x.camt;
  TXS.unshift({ id: 'T26101' + Math.floor(Math.random() * 9000 + 1000), date: TODAY, time: TODAY + ' 15:42:00', cust: CID(), type: '跨境代付', prod: 'PAYOUT_INTL', ccy: 'CNY', amt: x.camt, cp: cp.cn || cp.name, status: '处理中', ch: 'ALLINPAY_HK' });
  toast('跨境代付已提交'); S.nextUI = { tt: 'orders' }; go('cust', 'txs');
}

// ---------- 交易中心 ----------
PAGES['cust:txs'] = () => {
  const t = S.ui.tt || 'list';
  let body = '';
  const all = TXS.filter((x) => x.cust === CID());
  if (t === 'list') {
    let L = all.slice();
    if (S.ui.ty) L = L.filter((x) => x.type === S.ui.ty);
    if (S.ui.ts) L = L.filter((x) => x.status === S.ui.ts);
    if (S.ui.tq) L = L.filter((x) => x.id.includes(S.ui.tq) || x.cp.toLowerCase().includes(S.ui.tq.toLowerCase()));
    L = L.filter((x) => inRange(x.date, S.ui.tf, S.ui.tto));
    body = `<div class="toolbar wrap">${searchBox('tq', '搜索交易号 / 对手方')}${selectBox('ty', '类型', ['入账', '付款', '提现', '换汇', '跨境申报', '跨境代付', '开户费', '月费'])}${selectBox('ts', '状态', ['成功', '处理中', '待复核', '已拒绝'])}${dateRange('tf', 'tto')}<div style="flex:1"></div><button class="btn sm" onclick="exportTx()">${ICON.dl} 导出</button></div>
      <div class="tbl-wrap"><table><thead><tr><th>完成时间</th><th>交易号</th><th>类型</th><th>对手方 / 说明</th><th>本方账户</th><th class="r">金额</th><th class="r">手续费</th><th>状态</th><th class="r"></th></tr></thead><tbody>${L.map((x) => `<tr><td class="nowrap">${txTime(x)}</td><td class="mono">${x.id}</td><td>${x.type}</td><td class="muted">${x.cp}</td><td class="mono small">${(myAccts().find((a) => a.ccy === x.ccy) || {}).no || '—'}</td><td class="r ${x.type === '入账' ? 'up' : ''}">${x.amt ? txSign(x) + money(x.amt, x.ccy) : '—'}</td><td class="r small">${txFee(x)}</td><td>${statusBadge(x.status)}</td><td class="r"><button class="link" onclick="txDetail('${x.id}')">查看</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">没有符合条件的交易</td></tr>'}</tbody></table></div>`;
  } else if (t === 'orders') {
    const O = all.filter((x) => ['付款', '提现', '换汇', '跨境申报', '跨境代付'].includes(x.type)).slice(0, 30);
    body = `<div class="card-pad">${note('申请单是你提交给通道的付款、提现、换汇和跨境指令。待复核的单据需要复核员（如 CFO）批准后才会发送。当前登录角色：管理员（可复核）。')}</div><div class="tbl-wrap"><table><thead><tr><th>申请时间</th><th>申请编号</th><th>交易类型</th><th>对手方</th><th class="r">金额</th><th>提交人</th><th>状态</th><th class="r">操作</th></tr></thead><tbody>${O.map((x) => `<tr><td class="nowrap">${txTime(x)}</td><td class="mono">AP${x.id.slice(1)}</td><td>${x.type}</td><td>${x.cp}</td><td class="r">${money(x.amt, x.ccy)}</td><td class="small muted">${x.maker || 'ap@starocean.example'}</td><td>${statusBadge(x.status)}</td><td class="r">${x.status === '待复核' ? `<div class="btn-row" style="justify-content:flex-end"><button class="btn sm" onclick="review('${x.id}',false)">驳回</button><button class="btn primary sm" onclick="review('${x.id}',true)">批准</button></div>` : `<button class="link" onclick="txDetail('${x.id}')">查看</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    body = `<div class="tbl-wrap"><table><thead><tr><th>批次号</th><th>类型</th><th>提交时间</th><th>文件</th><th class="r">总笔数</th><th class="r">成功</th><th class="r">失败</th><th class="r">处理中</th><th class="r">金额</th><th>状态</th><th class="r"></th></tr></thead><tbody>${BATCHES.map((b) => `<tr><td class="mono">${b.id}</td><td>${b.type}</td><td>${b.created}</td><td class="small muted">${b.file}</td><td class="r">${b.total}</td><td class="r up">${b.ok}</td><td class="r ${b.fail ? 'down' : ''}">${b.fail}</td><td class="r">${b.ing}</td><td class="r num">${b.amt}</td><td>${statusBadge(b.status)}</td><td class="r">${b.fail ? `<button class="link" onclick="dlCSV('${b.id}_回盘.csv',['行号','结果','原因'],[['4','失败','收款方未审核通过'],['9','失败','账号与户名不符']])">回盘文件</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  }
  return head('交易中心', '交易明细、申请单与复核、批量交易', `<a class="btn" href="#/cust/statements">${ICON.dl} 对账单</a>`) + `<div class="card">${tabs('tt', [['list', '交易明细'], ['orders', '申请单 / 复核'], ['batch', '批量交易']], t)}${body}</div>`;
};
function exportTx() { dlCSV(`交易明细_${CID()}_${TODAY}.csv`, ['完成时间', '交易号', '类型', '对手方', '币种', '金额', '手续费', '状态'], TXS.filter((x) => x.cust === CID()).map((x) => [txTime(x), x.id, x.type, x.cp, x.ccy, x.amt, txFee(x), x.status])); }
function review(id, ok) {
  const x = TXS.find((t) => t.id === id);
  modal(ok ? '批准付款' : '驳回付款', `<dl class="kv"><dt>申请编号</dt><dd class="mono">AP${id.slice(1)}</dd><dt>收款方</dt><dd>${x.cp}</dd><dt>金额</dt><dd>${money(x.amt, x.ccy)}</dd><dt>提交人</dt><dd>${x.maker || 'ap@starocean.example'}</dd></dl>${ok ? '<div class="field"><label>交易密码</label><input class="input" type="password" value="******"></div>' : '<div class="field"><label>驳回原因</label><input class="input" placeholder="例：金额与发票不符"></div>'}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="(function(){const x=TXS.find(t=>t.id==='${id}');x.status='${ok ? '处理中' : '已拒绝'}';${ok ? 'bal()[x.ccy].a-=x.amt;bal()[x.ccy].f+=x.amt;' : ''}})();closeModal();toast('${ok ? '已批准，指令已发送通道' : '已驳回'}');render()">${ok ? '批准' : '驳回'}</button>`);
}
function txDetail(id) {
  const x = TXS.find((t) => t.id === id); if (!x) return;
  const out = x.type !== '入账', steps = out ? [['提交', txTime(x)], ['复核', x.status === '待复核' ? '等待复核员' : '已通过'], ['通道处理', ''], ['完成', x.status === '成功' ? txTime(x) : '']] : [['通道收到汇款', txTime(x)], ['合规检查', '通过'], ['入账', txTime(x)]];
  const cur = x.status === '成功' ? steps.length : x.status === '待复核' ? 1 : x.status === '已拒绝' ? 1 : 2;
  const fo = x.type === '换汇' ? FX_ORDERS.find((o) => o.tx === x.id) : null;
  modal(`${x.type}详情`, `<div class="detail-hero"><div><small>${x.type}</small><b class="${x.type === '入账' ? 'up' : ''}">${x.amt ? txSign(x) + x.ccy + ' ' + nf(x.amt) : '—'}</b></div><div style="text-align:right">${statusBadge(x.status)}</div></div>
    <dl class="kv"><dt>交易号</dt><dd class="mono">${x.id}</dd><dt>时间</dt><dd>${txTime(x)}</dd><dt>${x.type === '入账' ? '付款方' : '收款方 / 说明'}</dt><dd>${x.cp}</dd><dt>本方账户</dt><dd class="mono">${(myAccts().find((a) => a.ccy === x.ccy) || {}).no || '—'}</dd>${fo ? `<dt>换汇单号</dt><dd class="mono">${fo.id}</dd><dt>成交汇率</dt><dd>${fo.rate.toFixed(6)}</dd>` : ''}${x.purpose ? `<dt>汇款用途</dt><dd>${x.purpose}</dd>` : ''}${x.memo ? `<dt>附言</dt><dd>${esc(x.memo)}</dd>` : ''}<dt>手续费</dt><dd>${txFee(x)}${x.prod !== 'FX' ? '（通道代扣）' : ''}</dd><dt>通道</dt><dd>Allinpay 环球汇</dd></dl>
    ${x.status === '已拒绝' ? note('复核员已驳回，未扣款。', 'warn') : timeline(steps, cur)}`,
    x.status === '成功' ? `<button class="btn primary" onclick="closeModal();txAdvice('${x.id}')">${ICON.dl} ${x.type === '入账' ? '入账通知书' : x.type === '换汇' ? '成交确认书' : '付款凭证'}</button>` : '');
}
function txAdvice(id) {
  const x = TXS.find((t) => t.id === id), c = cust(CID());
  if (x.type === '换汇') { const o = FX_ORDERS.find((f) => f.tx === id); if (o) return fxAdvice(o.id); }
  const credit = x.type === '入账';
  letterModal(credit ? '入账通知书' : '付款凭证', letter({ title: credit ? 'Credit Advice' : 'Payment Advice', ref: x.id, date: x.date, body: `<p class="lt-dear">Dear <b>${c.en}</b>,</p><p>${credit ? 'We have credited the following incoming remittance to your account:' : 'We confirm that the following payment has been executed from your account:'}</p>${lrows([['Transaction ID', x.id], ['Value Date', x.date], [credit ? 'Remitter' : 'Beneficiary', x.cp], ['Amount', `<b>${x.ccy} ${nf(x.amt)}</b>`], [credit ? 'Credit Account' : 'Debit Account', (myAccts().find((a) => a.ccy === x.ccy) || {}).no || '—'], ['Charges', txFee(x) + ' (deducted by channel)'], ['Status', 'Completed']])}` }));
}

// ---------- 交易对手管理 ----------
PAGES['cust:cp'] = () => {
  const t = S.ui.ct || '收款方';
  let L = CPS.filter((c) => c.dir === t);
  if (S.ui.cs) L = L.filter((c) => c.status === S.ui.cs);
  if (S.ui.cn) L = L.filter((c) => c.country === S.ui.cn);
  if (S.ui.cb) L = L.filter((c) => c.biz.includes(S.ui.cb));
  if (S.ui.cq) L = L.filter((c) => (c.name + (c.cn || '')).toLowerCase().includes(S.ui.cq.toLowerCase()));
  const sts = ['正常', '新增待审核', '修改待审核', '审核不通过', '待完善', '待提交', '已冻结', '已关闭'];
  const counts = sts.map((s) => [s, CPS.filter((c) => c.dir === t && c.status === s).length]).filter((x) => x[1]);
  const body = `<div class="card-pad" style="padding-bottom:0"><div class="chip-row">${[['', '全部', CPS.filter((c) => c.dir === t).length], ...counts.map(([s, n]) => [s, s, n])].map(([k, l, n]) => `<button class="chip ${(S.ui.cs || '') === k ? 'on' : ''}" onclick="setUI('cs','${k}')">${l} ${n}</button>`).join('')}</div></div>
    <div class="toolbar wrap">${searchBox('cq', '搜索名称')}${selectBox('cn', '国家 / 地区', [...new Set(CPS.filter((c) => c.dir === t).map((c) => c.country))])}${t === '收款方' ? selectBox('cb', '业务', ['全球付款', '跨境付汇']) : ''}<div style="flex:1"></div><button class="btn sm" onclick="cpBatch()">${ICON.up} 批量新增</button><button class="btn primary sm" onclick="cpNew('${t}')">${ICON.plus} 新增${t}</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>名称</th><th>类型</th><th>国家 / 地区</th><th>开通业务</th><th class="r">账户数</th><th>渠道进件</th><th>更新时间</th><th>状态</th><th class="r"></th></tr></thead><tbody>${L.map((c) => `<tr><td><div class="bold">${c.name}</div>${c.cn ? `<div class="small muted">${c.cn}</div>` : ''}</td><td>${c.type}</td><td>${c.country}</td><td>${c.biz.map((b) => `<span class="tag">${b}</span>`).join(' ')}</td><td class="r">${c.accts.length}</td><td>${statusBadge(c.accts[0].onboard)}</td><td>${c.updated}</td><td>${statusBadge(c.status)}</td><td class="r"><button class="link" onclick="cpDetail('${c.id}')">查看</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">没有符合条件的交易对手</td></tr>'}</tbody></table></div>`;
  return head('交易对手管理', '收款方（付款对象）和来款方（汇款给你的客户）都需要登记并通过审核', '') +
    `<div class="card">${tabs('ct', [['收款方', '收款方'], ['来款方', '来款方']], t)}${body}</div>`;
};
function cpDetail(id) {
  const c = CPS.find((x) => x.id === id);
  const stepIdx = { '待提交': 0, '待完善': 0, '新增待审核': 1, '修改待审核': 1, '审核不通过': 1, '正常': 3, '已冻结': 3, '已关闭': 3 }[c.status];
  modal(c.name, `<div class="detail-hero"><div><small>${c.dir} · ${c.type}</small><b>${c.cn || c.name}</b></div><div style="text-align:right">${statusBadge(c.status)}</div></div>
    ${c.reject ? note('审核不通过：' + c.reject, 'warn') : ''}${c.status === '待完善' ? note('缺少付款协议证明和收款人手机号码，补齐后才能提交审核。', 'warn') : ''}
    <dl class="kv"><dt>国家 / 地区</dt><dd>${c.country}</dd><dt>城市（英文）</dt><dd>${c.city}</dd><dt>地址</dt><dd>${c.addr}</dd><dt>${c.type === '企业' ? '注册号' : '证件'}</dt><dd class="mono">${c.regNo}</dd><dt>开通业务</dt><dd>${c.biz.join('、')}</dd><dt>付款协议证明</dt><dd>${c.proof || '<span class="down">未上传</span>'}</dd></dl>
    <div class="bold mt">账户</div><div class="tbl-wrap"><table><thead><tr><th>银行</th><th>账号</th><th>币种</th><th>SWIFT / 联行号</th><th>性质</th><th>渠道进件</th></tr></thead><tbody>${c.accts.map((a) => `<tr><td>${a.bank}</td><td class="mono">${a.acct}</td><td>${a.ccy}</td><td class="mono small">${a.swift}</td><td>${a.nature}</td><td>${statusBadge(a.onboard)}</td></tr>`).join('')}</tbody></table></div>
    ${timeline([['提交资料', ''], ['通道审核', '通常 1 个工作日'], ['渠道进件', '付款前完成'], ['可用', '']], stepIdx)}`,
    `${['新增待审核', '修改待审核'].includes(c.status) ? `<button class="btn" onclick="cpSet('${id}','正常','已进件')">模拟：通道审核通过</button>` : ''}${['审核不通过', '待完善'].includes(c.status) ? `<button class="btn primary" onclick="cpSet('${id}','新增待审核','进件中')">补充资料并重新提交</button>` : ''}${c.status === '正常' ? `<button class="btn" onclick="cpSet('${id}','已冻结')">冻结</button><button class="btn" onclick="toast('修改后需重新审核')">修改</button>${c.dir === '收款方' ? `<a class="btn primary" href="#/cust/pay" onclick="closeModal();S.pay&&(S.pay.cp='${id}')">付款给 TA</a>` : ''}` : ''}${c.status === '已冻结' ? `<button class="btn primary" onclick="cpSet('${id}','正常')">解冻</button>` : ''}`, true);
}
function cpSet(id, st, ob) { const c = CPS.find((x) => x.id === id); c.status = st; c.updated = TODAY; if (ob) c.accts.forEach((a) => (a.onboard = ob)); closeModal(); toast(`状态已更新为“${st}”`); render(); }
function cpNew(dir) {
  const ty = S.ui.cpty || '企业';
  modal(`新增${dir}`, `<div class="seg" style="margin-bottom:14px">${['企业', '个人'].map((k) => `<button class="${k === ty ? 'on' : ''}" onclick="S.ui.cpty='${k}';closeModal();cpNew('${dir}')">${k}</button>`).join('')}</div>
    <div class="lt-sec" style="margin-top:0">1 · ${dir}信息</div><div class="form-grid">${ty === '企业' ? `<div class="field"><label>注册国家 / 地区</label><select class="select"><option>中国</option><option>中国香港</option><option>新加坡</option><option>美国</option><option>日本</option><option>德国</option></select></div><div class="field"><label>企业名称（英文）</label><input class="input" placeholder="例：Shenzhen ABC Co., Ltd"></div><div class="field"><label>中文名称（内地企业必填）</label><input class="input"></div><div class="field"><label>注册号 / 统一社会信用代码</label><input class="input"></div>` : `<div class="field"><label>国籍</label><select class="select"><option>中国</option><option>中国香港</option></select></div><div class="field"><label>姓名（拼音）</label><input class="input"></div><div class="field"><label>性别</label><select class="select"><option>男</option><option>女</option></select></div><div class="field"><label>出生日期</label><input class="input" type="date"></div><div class="field"><label>证件类型</label><select class="select"><option>居民身份证</option><option>护照</option></select></div><div class="field"><label>证件号码</label><input class="input"></div>`}<div class="field"><label>城市（英文）</label><input class="input"></div><div class="field"><label>地址</label><input class="input"></div>
    ${dir === '收款方' ? `<div class="field full"><label>开通业务</label><div class="btn-row"><label class="tag" style="padding:6px 10px"><input type="checkbox" checked> 全球付款</label><label class="tag" style="padding:6px 10px"><input type="checkbox"> 跨境付汇（中国大陆）</label><label class="tag" style="padding:6px 10px"><input type="checkbox"> 跨境结汇</label></div></div>` : ''}<div class="field full"><label>付款协议证明（合同 / 发票，≤ 30MB）</label><input class="input" type="file"></div></div>
    <div class="lt-sec">2 · 账户信息</div><div class="form-grid"><div class="field"><label>账户所在地</label><select class="select"><option>中国内地</option><option>中国香港</option><option>海外</option></select></div><div class="field"><label>币种</label><select class="select"><option>USD</option><option>CNY</option><option>HKD</option><option>EUR</option></select></div><div class="field"><label>户名</label><input class="input"></div><div class="field"><label>账号</label><input class="input"></div><div class="field"><label>SWIFT / CIPS BIC / 联行号</label><input class="input"></div><div class="field"><label>银行名称</label><input class="input"></div><div class="field"><label>对公 / 对私</label><select class="select"><option>对公</option><option>对私</option></select></div><div class="field"><label>开户行地址</label><input class="input"></div></div>`,
    `<button class="btn" onclick="CPS.push({id:'CP'+(CPS.length+1),dir:'${dir}',type:'${ty}',name:'New ${dir === '收款方' ? 'Supplier' : 'Payer'} Ltd',country:'中国香港',city:'Hong Kong',addr:'—',regNo:'—',biz:['${dir === '收款方' ? '全球付款' : '全球收款'}'],status:'待提交',updated:TODAY,proof:'',accts:[{bank:'—',acct:'—',ccy:'USD',swift:'—',nature:'对公',onboard:'未进件'}]});closeModal();toast('已保存草稿');render()">保存草稿</button><button class="btn primary" onclick="CPS.push({id:'CP'+(CPS.length+1),dir:'${dir}',type:'${ty}',name:'New ${dir === '收款方' ? 'Supplier' : 'Payer'} Ltd',country:'中国香港',city:'Hong Kong',addr:'Central, Hong Kong',regNo:'BR 7788****',biz:['${dir === '收款方' ? '全球付款' : '全球收款'}'],status:'新增待审核',updated:TODAY,proof:'contract.pdf',accts:[{bank:'HSBC Hong Kong',acct:'400 **** 001',ccy:'USD',swift:'HSBCHKHHHKH',nature:'对公',onboard:'进件中'}]});closeModal();toast('已提交通道审核');render()">提交审核</button>`, true);
}
function cpBatch() {
  modal('批量新增交易对手', `${note('按模板填写报盘文件（xlsx），附件打包成 zip，文件名按“证件号_资料类型”命名。处理结果会生成回盘文件。')}<div class="form-grid"><div class="field full"><label>报盘文件（.xlsx）</label><input class="input" type="file"></div><div class="field full"><label>附件包（.zip，可选）</label><input class="input" type="file"></div></div>`,
    `<button class="btn" onclick="dlCSV('交易对手批量模板.csv',['客户号','收款方名称','收款方类型','证件类型','证件号码','国家','城市','地址','开通结汇(Y/N)','开通付汇(Y/N)','账户所在地','户名','账号','对公/对私','币种','SWIFT/CIPS BIC','银行名称','联行号','开户行地址'],[])">${ICON.dl} 下载模板</button><button class="btn primary" onclick="closeModal();BATCHES.unshift({id:'BT${TODAY.replace(/-/g, '')}09',type:'批量新增收款方',created:TODAY+' 15:50',file:'payees.xlsx',total:5,ok:0,fail:0,ing:5,amt:'—',status:'处理中'});toast('已上传，处理结果见交易中心 → 批量交易')">上传</button>`);
}
