// ===================== 总后台管控：重新分配（一级 + 二级）、转移二级、冻结 / 解冻 / 调单 =====================
const FRZ_C = [['all', '全部冻结', '停止付款、提现、换汇和登录；来款照常入账但不可用'], ['pay', '止付', '停止付款、提现和换汇；收款和登录正常'], ['login', '冻结登录', '不能登录 eBanking；资金和交易不受影响'], ['amt', '冻结部分金额', '只冻结指定币种和金额，其余可正常使用']];
const FRZ_A = [['login', '冻结登录', '不能登录代理后台'], ['links', '停用开户和招募链接', '新客户和新二级不能通过它的链接申请'], ['comm', '暂停佣金结算', '佣金照常计算，暂停 T+15 支付'], ['proxy', '禁止代客申请', '不能代客户提交开户申请']];
const FRZ_REASON = ['风控调查', '可疑交易（AML）', 'Allinpay 渠道要求', '收款银行要求', '法院或执法机关要求', '调单逾期未回复', '客户或代理要求', '其他'];
const UNFRZ_REASON = ['调查完成，无异常', '已补交调单文件', '渠道或银行解除', '误操作', '其他'];
const DOCS_C = ['商业合同 / 订单', '商业发票', '物流单 / 提单', '报关单', '付款用途说明', '资金来源证明', '交易对手资料（BR / 网站）', '其他'];
const DOCS_A = ['客户尽调 / KYC 记录', '与客户的推荐或服务协议', '客户业务往来说明', '代理自身资料更新（BR、董事证件）', '佣金收款账户证明', '其他'];
const DR_SRC = ['内部风控', 'Allinpay 渠道调单', '收款 / 汇款银行', '监管或执法机关'];

window.CTRL_LOG = [
  { t: '2026-10-09 14:20', act: '冻结', tt: 'c', target: 'AZ100006', scopes: ['pay'], reason: 'Allinpay 渠道要求', by: 'risk@ourbank.example' },
  { t: '2026-10-08 10:05', act: '调单', tt: 'c', target: 'AZ100006', scopes: [], reason: 'Allinpay 渠道调单 · 2 笔', by: 'risk@ourbank.example' },
  { t: '2026-09-22 16:40', act: '解冻', tt: 'c', target: 'AZ100004', scopes: ['login'], reason: '客户或代理要求', by: 'stephen@ourbank.example' },
];
window.DOC_REQS = [
  { id: 'DR-261012-01', tt: 'c', target: 'AZ100001', src: 'Allinpay 渠道调单', chRef: 'ALP-RFI-88213', txs: [], custs: [], docs: ['商业合同 / 订单', '商业发票', '物流单 / 提单'], due: '2026-10-17', autoStop: true, status: '待回复', created: '2026-10-12', by: 'risk@ourbank.example', memo: '请提供以下交易的合同、发票和物流单，以配合收款银行核查。', resp: {} },
  { id: 'DR-261008-02', tt: 'c', target: 'AZ100006', src: 'Allinpay 渠道调单', chRef: 'ALP-RFI-87940', txs: [], custs: [], docs: ['商业发票', '交易对手资料（BR / 网站）'], due: '2026-10-11', autoStop: true, status: '逾期', created: '2026-10-08', by: 'risk@ourbank.example', memo: '收款银行要求提供付款人资料。', resp: {} },
  { id: 'DR-260930-03', tt: 'a', target: 'A002', src: '内部风控', chRef: '', txs: [], custs: ['AZ100005', 'AZ100006'], docs: ['客户尽调 / KYC 记录', '与客户的推荐或服务协议'], due: '2026-10-07', autoStop: false, status: '已结案', created: '2026-09-30', by: 'compliance@ourbank.example', memo: '年度代理抽查。', resp: { '客户尽调 / KYC 记录': 'kyc_c1005_c1006.pdf', '与客户的推荐或服务协议': 'agreements.pdf' } },
];
(function seed() {
  CUSTOMERS.forEach((c) => { if (c.status === '冻结' && !c.frz) c.frz = { scopes: ['all'], reason: '风控调查', memo: '历史冻结', t: '2026-09-30 11:00', by: 'risk@ourbank.example' }; });
  const c6 = cust('AZ100006'); if (c6) c6.frz = { scopes: ['pay'], reason: 'Allinpay 渠道要求', memo: '渠道调单逾期，按渠道要求止付', t: '2026-10-09 14:20', by: 'risk@ourbank.example' };
  const t1 = TXS.filter((t) => t.cust === 'AZ100001' && t.amt && /收款/.test(t.type)).slice(0, 2).map((t) => t.id);
  DOC_REQS[0].txs = t1.length ? t1 : TXS.filter((t) => t.cust === 'AZ100001').slice(0, 2).map((t) => t.id);
  DOC_REQS[1].txs = TXS.filter((t) => t.cust === 'AZ100006').slice(0, 2).map((t) => t.id);
})();

const tgt = (tt, id) => (tt === 'c' ? cust(id) : agent(id));
const tgtName = (tt, id) => `${tt === 'c' ? '客户' : agent(id).level === 1 ? '一级' : '二级'} · ${tgt(tt, id).name}`;
const scopeName = (tt, k) => ((tt === 'c' ? FRZ_C : FRZ_A).find((x) => x[0] === k) || [, k])[1];
function frzBadge(o, tt) { if (!o.frz) return ''; const s = o.frz.scopes; const lab = tt === 'c' ? (s.includes('all') ? '已冻结' : s.includes('pay') ? '止付' : s.includes('login') ? '冻结登录' : '部分冻结') : (s.includes('login') ? '已冻结' : '部分冻结'); return ` <span class="badge ${lab === '已冻结' || lab === '止付' ? 'err' : 'warn'}">${lab}</span>`; }
function openDR(tt, id) { return DOC_REQS.filter((d) => d.tt === tt && d.target === id && ['待回复', '已回复', '退回补充', '逾期'].includes(d.status)); }
function ctrlBtns(tt, id, sm = true) {
  const o = tgt(tt, id), s = sm ? 'btn sm' : 'btn', dr = openDR(tt, id).length;
  return `${o.frz ? `<button class="${s}" onclick="closeModal();unfreezeModal('${tt}','${id}')">解冻</button>` : ''}<button class="${s} danger" onclick="closeModal();freezeModal('${tt}','${id}')">${o.frz ? '调整冻结' : '冻结'}</button><button class="${s}" onclick="closeModal();docReqModal('${tt}','${id}')">调单${dr ? ` · ${dr}` : ''}</button>`;
}
function logCtrl(act, tt, id, scopes, reason) {
  CTRL_LOG.unshift({ t: TODAY + ' ' + new Date().toTimeString().slice(0, 5), act, tt, target: id, scopes, reason, by: ME.hq.email });
  AUDIT.unshift({ t: TODAY + ' ' + new Date().toTimeString().slice(0, 5), who: ME.hq.email, what: act, obj: `${id} ${tgt(tt, id).name}${scopes.length ? '（' + scopes.map((k) => scopeName(tt, k)).join('、') + '）' : ''}`, ip: '198.51.100.7' });
}

// ---------- 冻结 ----------
function freezeModal(tt, id) {
  const o = tgt(tt, id), L = tt === 'c' ? FRZ_C : FRZ_A, cur = o.frz ? o.frz.scopes : (tt === 'c' ? ['pay'] : ['login', 'links']);
  const isL1 = tt === 'a' && o.level === 1, subs = isL1 ? AGENTS.filter((x) => x.parent === id && x.status === '启用') : [];
  modal(`${o.frz ? '调整冻结' : '冻结'} · ${o.name}`, `${o.frz ? note(`当前：${o.frz.scopes.map((k) => scopeName(tt, k)).join('、')} · ${o.frz.reason} · ${o.frz.t}`, 'warn') : ''}
    <div class="field"><label>冻结范围（可多选）</label><div style="display:grid;gap:6px">${L.map(([k, n, d]) => `<label class="pick" style="border:1px solid var(--color-divider)"><input type="checkbox" class="fzS" value="${k}" ${cur.includes(k) ? 'checked' : ''} ${k === 'amt' ? `onchange="document.getElementById('fzAmt').style.display=this.checked?'grid':'none'"` : ''}> <div><b>${n}</b><div class="small muted">${d}</div></div></label>`).join('')}</div></div>
    ${tt === 'c' ? `<div class="form-grid" id="fzAmt" style="display:${cur.includes('amt') ? 'grid' : 'none'}"><div class="field"><label>币种</label><select class="select" id="fzCcy">${Object.keys(BALANCES[id] || { HKD: 1, USD: 1 }).map((c) => `<option>${c}</option>`).join('')}</select></div><div class="field"><label>冻结金额</label><input class="input" id="fzVal" type="number" placeholder="0.00" value="${(o.frz && o.frz.amt && o.frz.amt.v) || ''}"></div></div>` : ''}
    <div class="form-grid"><div class="field"><label>原因</label><select class="select" id="fzWhy">${FRZ_REASON.map((r) => `<option ${o.frz && o.frz.reason === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div><div class="field"><label>渠道 / 外部参考号（选填）</label><input class="input" id="fzRef" placeholder="例：ALP-RFI-88213"></div>
    <div class="field full"><label>内部备注</label><textarea class="input" id="fzMemo" placeholder="说明冻结原因和后续跟进">${(o.frz && o.frz.memo) || ''}</textarea></div></div>
    ${isL1 && subs.length ? `<label class="pick" style="padding:0"><input type="checkbox" id="fzSubs"> 名下 ${subs.length} 个二级代理一并冻结（${subs.map((x) => x.name).join('、')}）</label>` : ''}
    ${tt === 'a' ? note('冻结代理不会冻结它的客户；客户如需冻结请在客户管理单独操作。') : ''}
    <div style="display:grid;gap:4px"><label class="pick" style="padding:0"><input type="checkbox" id="fzN1" checked> 电邮通知${tt === 'c' ? '客户' : '代理'}</label>${tt === 'c' && o.l1 ? `<label class="pick" style="padding:0"><input type="checkbox" id="fzN2" checked> 通知归属代理（${agent(o.l1).name}${o.l2 ? ' / ' + agent(o.l2).name : ''}）</label>` : ''}<div class="small muted">法院或执法机关要求时，请勿通知对方，以免泄露调查。</div></div>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn danger" onclick="doFreeze('${tt}','${id}')">确认冻结</button>`, true);
  AFTER.push(() => {}); const w = $('#fzWhy'); if (w) w.onchange = () => { if (/法院|执法|AML/.test(w.value)) { $('#fzN1').checked = false; const n2 = $('#fzN2'); if (n2) n2.checked = false; } };
}
function doFreeze(tt, id) {
  const scopes = [...document.querySelectorAll('.fzS:checked')].map((x) => x.value);
  if (!scopes.length) return toast('请至少选择一项冻结范围');
  if (scopes.includes('amt') && !(+($('#fzVal') || {}).value > 0)) return toast('请输入冻结金额');
  const o = tgt(tt, id), why = $('#fzWhy').value;
  o.frz = { scopes, reason: why, memo: $('#fzMemo').value, ref: $('#fzRef').value, t: TODAY + ' ' + new Date().toTimeString().slice(0, 5), by: ME.hq.email, amt: scopes.includes('amt') ? { ccy: $('#fzCcy').value, v: +$('#fzVal').value } : null };
  logCtrl('冻结', tt, id, scopes, why);
  let n = 0; if ($('#fzSubs') && $('#fzSubs').checked) AGENTS.filter((x) => x.parent === id && x.status === '启用').forEach((x) => { x.frz = { ...o.frz, reason: '上级一级代理被冻结' }; logCtrl('冻结', 'a', x.id, o.frz.scopes, '上级一级代理被冻结'); n++; });
  closeModal(); toast(`已冻结 ${o.name}${n ? `，并冻结 ${n} 个二级代理` : ''}${$('#fzN1') && $('#fzN1').checked === false ? '（未通知对方）' : ''}`); kRenderSafe();
}
function unfreezeModal(tt, id) {
  const o = tgt(tt, id); if (!o.frz) return toast('未冻结');
  modal(`解冻 · ${o.name}`, `${note(`冻结于 ${o.frz.t} · ${o.frz.reason}${o.frz.memo ? ' · ' + o.frz.memo : ''}`, 'warn')}
    <div class="field"><label>解除范围</label><div style="display:grid;gap:6px">${o.frz.scopes.map((k) => `<label class="pick" style="border:1px solid var(--color-divider)"><input type="checkbox" class="ufS" value="${k}" checked> ${scopeName(tt, k)}${k === 'amt' && o.frz.amt ? `（${o.frz.amt.ccy} ${nf(o.frz.amt.v)}）` : ''}</label>`).join('')}</div></div>
    ${openDR(tt, id).length ? note(`仍有 ${openDR(tt, id).length} 张调单未结案，请确认是否可以解冻。`, 'warn') : ''}
    <div class="form-grid"><div class="field"><label>解冻原因</label><select class="select" id="ufWhy">${UNFRZ_REASON.map((r) => `<option>${r}</option>`).join('')}</select></div><div class="field"><label>说明</label><input class="input" id="ufMemo" placeholder="选填"></div></div>
    <label class="pick" style="padding:0"><input type="checkbox" checked> 电邮通知${tt === 'c' ? '客户和归属代理' : '代理'}</label>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="doUnfreeze('${tt}','${id}')">确认解冻</button>`, true);
}
function doUnfreeze(tt, id) {
  const o = tgt(tt, id), lift = [...document.querySelectorAll('.ufS:checked')].map((x) => x.value);
  if (!lift.length) return toast('请选择要解除的范围');
  o.frz.scopes = o.frz.scopes.filter((k) => !lift.includes(k)); if (lift.includes('amt')) o.frz.amt = null;
  if (!o.frz.scopes.length) { o.frz = null; if (tt === 'c' && o.status === '冻结') o.status = '已开通'; }
  logCtrl('解冻', tt, id, lift, $('#ufWhy').value);
  closeModal(); toast(o.frz ? `已部分解冻：${lift.map((k) => scopeName(tt, k)).join('、')}` : `${o.name} 已全部解冻`); kRenderSafe();
}
function kRenderSafe() { const m = $('#main'), y = m ? m.scrollTop : 0; S._samePage = true; render(); if ($('#main')) $('#main').scrollTop = y; }

// ---------- 调单 ----------
function docReqModal(tt, id) {
  const o = tgt(tt, id);
  const txs = tt === 'c' ? TXS.filter((t) => t.cust === id && t.amt).slice(0, 12) : [];
  const cs = tt === 'a' ? CUSTOMERS.filter((c) => c.l1 === id || c.l2 === id) : [];
  const open = openDR(tt, id);
  modal(`发起调单 · ${o.name}`, `${open.length ? note(`已有 ${open.length} 张未结案调单：${open.map((d) => d.id).join('、')}`, 'warn') : ''}
    <div class="form-grid"><div class="field"><label>调单来源</label><select class="select" id="drSrc">${DR_SRC.map((s) => `<option>${s}</option>`).join('')}</select></div><div class="field"><label>渠道 / 银行调单编号（选填）</label><input class="input" id="drRef" placeholder="例：ALP-RFI-88213"></div></div>
    ${tt === 'c' ? `<div class="field"><label>涉及交易（可多选）</label><div class="pick-list">${txs.map((t) => `<label class="pick"><input type="checkbox" class="drT" value="${t.id}"> <span class="mono small">${t.id}</span> ${t.date} · ${t.type} · ${t.ccy} ${nf(t.amt)} <span class="muted small">· ${t.cp || ''}</span></label>`).join('') || '<div class="small muted">没有交易</div>'}</div><div class="hint small muted">不选则为针对客户整体的调单（例如资金来源）</div></div>`
      : `<div class="field"><label>涉及客户（可多选）</label><div class="pick-list">${cs.map((c) => `<label class="pick"><input type="checkbox" class="drC" value="${c.id}"> <span class="mono small">${c.id}</span> ${c.name} <span class="muted small">· ${ownerTxt(c.l1, c.l2)}</span></label>`).join('') || '<div class="small muted">名下没有客户</div>'}</div></div>`}
    <div class="field"><label>需要提供的文件</label><div class="chip-row wrap">${(tt === 'c' ? DOCS_C : DOCS_A).map((d, i) => `<label class="tag" style="padding:6px 10px;display:inline-flex;gap:6px;cursor:pointer"><input type="checkbox" class="drD" value="${d}" ${i < 2 ? 'checked' : ''}> ${d}</label>`).join('')}</div></div>
    <div class="form-grid"><div class="field"><label>回复期限</label><select class="select" id="drDue"><option value="3">3 个工作日</option><option value="5" selected>5 个工作日</option><option value="7">7 个工作日</option><option value="10">10 个工作日</option></select></div>
    <div class="field"><label>逾期处理</label><select class="select" id="drAuto">${tt === 'c' ? '<option value="1">逾期自动止付</option><option value="0">只提醒，不自动处理</option>' : '<option value="0">只提醒，不自动处理</option><option value="1">逾期自动暂停佣金结算</option>'}</select></div>
    <div class="field full"><label>给${tt === 'c' ? '客户' : '代理'}的说明</label><textarea class="input" id="drMemo">${tt === 'c' ? '为配合银行核查，请在期限内上传以下交易的证明文件。' : '请提供以下客户的尽调资料，以配合平台合规抽查。'}</textarea></div></div>
    ${tt === 'c' && o.l1 ? `<label class="pick" style="padding:0"><input type="checkbox" id="drCC" checked> 同时抄送归属代理（${agent(o.l1).name}），方便协助客户准备文件</label>` : ''}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="doDocReq('${tt}','${id}')">发出调单</button>`, true);
}
function addWorkdays(d, n) { const x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() % 6) n--; } return x.toISOString().slice(0, 10); }
function doDocReq(tt, id) {
  const docs = [...document.querySelectorAll('.drD:checked')].map((x) => x.value);
  if (!docs.length) return toast('请至少选择一种文件');
  const n = DOC_REQS.length + 1, drId = `DR-${TODAY.slice(2).replace(/-/g, '')}-${String(n).padStart(2, '0')}`;
  const d = { id: drId, tt, target: id, src: $('#drSrc').value, chRef: $('#drRef').value, txs: [...document.querySelectorAll('.drT:checked')].map((x) => x.value), custs: [...document.querySelectorAll('.drC:checked')].map((x) => x.value), docs, due: addWorkdays(TODAY, +$('#drDue').value), autoStop: $('#drAuto').value === '1', status: '待回复', created: TODAY, by: ME.hq.email, memo: $('#drMemo').value, resp: {} };
  DOC_REQS.unshift(d); logCtrl('调单', tt, id, [], `${d.src} · ${d.txs.length || d.custs.length || '整体'}${d.txs.length ? ' 笔' : d.custs.length ? ' 个客户' : ''}`);
  closeModal(); toast(`调单 ${drId} 已发出，期限 ${d.due}`); kRenderSafe();
}
function drDetail(drId) {
  const d = DOC_REQS.find((x) => x.id === drId), o = tgt(d.tt, d.target), isHQ = S.portal === 'hq';
  const items = d.tt === 'c' ? d.txs.map((tid) => { const t = TXS.find((x) => x.id === tid); return t ? `<tr><td class="mono">${t.id}</td><td>${t.date}</td><td>${t.type}</td><td class="r">${t.ccy} ${nf(t.amt)}</td><td class="small">${t.cp || ''}</td></tr>` : ''; }).join('') : d.custs.map((c) => `<tr><td class="mono">${c}</td><td colspan="4">${cust(c).name}</td></tr>`).join('');
  const canReply = !isHQ && ['待回复', '退回补充', '逾期'].includes(d.status);
  modal(`调单 ${d.id}`, `<div class="detail-hero"><div><small>${tgtName(d.tt, d.target)} · ${d.src}${d.chRef ? ' · ' + d.chRef : ''}</small><b>${d.docs.length} 种文件 · 期限 ${d.due}</b></div><div>${statusBadge(d.status)}</div></div>
    ${note(d.memo || '—')}${d.autoStop && ['待回复', '退回补充'].includes(d.status) ? note(d.tt === 'c' ? '逾期未回复将自动止付。' : '逾期未回复将暂停佣金结算。', 'warn') : ''}
    ${items ? `<div class="bold">${d.tt === 'c' ? '涉及交易' : '涉及客户'}</div><div class="tbl-wrap"><table><tbody>${items}</tbody></table></div>` : ''}
    <div class="bold mt">文件</div><div style="display:grid;gap:8px">${d.docs.map((doc) => `<div class="doc-item ${d.resp[doc] ? 'on' : ''}"><div class="fi">${d.resp[doc] ? 'PDF' : '—'}</div><div style="flex:1;min-width:0"><div class="bold small">${doc}</div><div class="small muted">${d.resp[doc] || '未上传'}</div></div>${canReply ? `<button class="btn sm" onclick="DOC_REQS.find(x=>x.id==='${d.id}').resp['${doc}']='${doc.replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 6)}_${TODAY.replace(/-/g, '')}.pdf';drDetail('${d.id}')">${d.resp[doc] ? '重新上传' : ICON.up + ' 上传'}</button>` : ''}</div>`).join('')}</div>
    ${d.note ? note('平台意见：' + d.note, 'warn') : ''}
    ${isHQ && ['已回复'].includes(d.status) ? `<div class="field mt"><label>审核意见</label><textarea class="input" id="drNote" placeholder="退回补充时必须填写"></textarea></div>` : ''}`,
    isHQ ? `${d.status === '待回复' ? `<button class="btn" onclick="drSim('${d.id}')">模拟：对方已回复</button><button class="btn" onclick="toast('已发催办电邮')">催办</button>` : ''}${['待回复', '逾期'].includes(d.status) && d.tt === 'c' && !(o.frz && (o.frz.scopes.includes('pay') || o.frz.scopes.includes('all'))) ? `<button class="btn danger" onclick="drStop('${d.id}')">止付客户</button>` : ''}${d.status === '已回复' ? `<button class="btn" onclick="drSet('${d.id}','退回补充')">退回补充</button><button class="btn primary" onclick="drSet('${d.id}','已结案')">通过并结案</button>` : ''}${['待回复', '逾期', '退回补充'].includes(d.status) ? `<button class="btn" onclick="drSet('${d.id}','已撤销')">撤销</button>` : ''}<button class="btn primary" onclick="closeModal()">关闭</button>`
      : canReply ? `<button class="btn" onclick="closeModal()">稍后</button><button class="btn primary" onclick="drReply('${d.id}')">提交回复</button>` : `<button class="btn primary" onclick="closeModal()">关闭</button>`, true);
}
function drSim(id) { const d = DOC_REQS.find((x) => x.id === id); d.docs.forEach((x) => (d.resp[x] = 'reply_' + (d.docs.indexOf(x) + 1) + '.pdf')); d.status = '已回复'; toast('对方已上传文件'); drDetail(id); kRenderSafe(); drDetail(id); }
function drSet(id, st) {
  const d = DOC_REQS.find((x) => x.id === id), n = ($('#drNote') || {}).value || '';
  if (st === '退回补充' && !n) return toast('请填写退回原因');
  d.status = st; if (n) d.note = n;
  logCtrl(st === '已结案' ? '调单结案' : st === '已撤销' ? '调单撤销' : '调单退回', d.tt, d.target, [], d.id);
  closeModal(); toast({ 已结案: '调单已结案', 退回补充: '已退回，对方会收到补充通知', 已撤销: '调单已撤销' }[st]); kRenderSafe();
}
function drStop(id) {
  const d = DOC_REQS.find((x) => x.id === id), c = cust(d.target);
  c.frz = { scopes: [...new Set([...(c.frz ? c.frz.scopes : []), 'pay'])], reason: '调单逾期未回复', memo: d.id, t: TODAY + ' ' + new Date().toTimeString().slice(0, 5), by: ME.hq.email };
  logCtrl('冻结', 'c', c.id, ['pay'], '调单逾期未回复 · ' + d.id); closeModal(); toast(`${c.name} 已止付`); kRenderSafe();
}
function drReply(id) {
  const d = DOC_REQS.find((x) => x.id === id), miss = d.docs.filter((x) => !d.resp[x]);
  if (miss.length) return toast(`还有 ${miss.length} 种文件未上传`);
  d.status = '已回复'; closeModal(); toast('已提交，平台会尽快审核'); kRenderSafe();
}

// ---------- 总后台重新分配（一级 + 二级） ----------
function trL2Opts(l1, cur) { const L = l1 ? AGENTS.filter((a) => a.parent === l1 && a.status === '启用') : []; return `<option value="">${l1 ? '无二级（直属一级）' : '—'}</option>${L.map((a) => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${a.id} ${a.name}</option>`).join('')}`; }
function reassignCust(id, onlyAgent) {
  const l1s = AGENTS.filter((a) => a.level === 1 && a.status === '启用');
  const list = id ? [cust(id)] : onlyAgent ? custsOf(onlyAgent) : CUSTOMERS;
  const c0 = id ? list[0] : null;
  modal('重新分配客户', `${note('总后台可以把客户直接分配到<b>一级</b>和<b>二级</b>代理，或改为自营。历史交易的佣金按交易当时的归属计算，生效日之后的交易归新代理。')}
    <div class="field"><label>客户</label>${id ? `<input class="input" value="${c0.id} ${c0.name} · 当前 ${ownerTxt(c0.l1, c0.l2)}" disabled>` : `<div class="pick-list">${list.map((c) => `<label class="pick"><input type="checkbox" value="${c.id}" class="trPick" ${onlyAgent ? 'checked' : ''}> <span class="mono small">${c.id}</span> ${c.name} <span class="muted small">· ${ownerTxt(c.l1, c.l2)}</span></label>`).join('')}</div>`}</div>
    <div class="form-grid"><div class="field"><label>一级代理</label><select class="select" id="trTo" onchange="document.getElementById('trTo2').innerHTML=trL2Opts(this.value)"><option value="">自营（总后台直属）</option>${l1s.map((a) => `<option value="${a.id}" ${c0 && c0.l1 === a.id ? 'selected' : ''}>${a.id} ${a.name}</option>`).join('')}</select></div>
    <div class="field"><label>二级代理</label><select class="select" id="trTo2">${trL2Opts(c0 ? c0.l1 : '', c0 ? c0.l2 : '')}</select></div>${effField}${comOpts}<div class="field"><label>原因</label><select class="select" id="trWhy"><option>代理停止合作 / 失联</option><option>客户要求更换代理</option><option>代理违规</option><option>内部调整</option></select></div></div>
    ${note('客户费率不变；系统会检查客户价是否仍高于新代理底价。客户和新旧代理都会收到“服务代理变更”电邮通知。')}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="doReassignHQ(${id ? `['${id}']` : 'null'})">确认转移</button>`, true);
}
function doReassignHQ(ids) {
  ids = ids || [...document.querySelectorAll('.trPick:checked')].map((x) => x.value);
  if (!ids.length) return toast('请选择至少一个客户');
  const l1 = $('#trTo').value || null, l2 = l1 ? $('#trTo2').value || null : null;
  const same = ids.filter((i) => cust(i).l1 === l1 && cust(i).l2 === l2); if (same.length === ids.length) return toast('归属没有变化');
  applyTransfer(ids.filter((i) => !same.includes(i)), l1, l2, $('#trWhy').value, $('#trEff').value, $('#trCom').value);
  closeModal(); toast(`已转移 ${ids.length - same.length} 个客户到 ${ownerTxt(l1, l2)}`); kRenderSafe();
}
// 总后台：把二级代理转到另一个一级
function moveL2(aid) {
  const a = agent(aid), cs = custsOf(aid), l1s = AGENTS.filter((x) => x.level === 1 && x.status === '启用' && x.id !== a.parent);
  modal(`转移二级代理 · ${a.name}`, `${note(`当前上级：<b>${agent(a.parent).name}</b>；名下 <b>${cs.length}</b> 个客户。`)}
    <div class="form-grid"><div class="field"><label>转到一级代理</label><select class="select" id="mvTo">${l1s.map((x) => `<option value="${x.id}">${x.id} ${x.name}</option>`).join('')}</select></div>${effField}
    <div class="field full"><label>名下客户</label><select class="select" id="mvCust"><option value="follow">跟随二级一起转到新一级（客户仍归此二级）</option><option value="stay">留在原一级，改为原一级直属</option></select></div>
    <div class="field"><label>二级佣金比例（新一级价差 %）</label><input class="input" id="mvRatio" value="${L2RATIO[aid] ? Object.values(L2RATIO[aid])[0] : 40}"></div>${comOpts}
    <div class="field"><label>原因</label><select class="select" id="trWhy"><option>原一级停止合作 / 失联</option><option>二级要求更换上级</option><option>内部调整</option></select></div></div>
    ${cs.length ? `<div class="bold">受影响客户</div><div class="tbl-wrap"><table><tbody>${cs.map((c) => `<tr><td>${c.id} ${c.name}</td><td class="small muted">${ownerTxt(c.l1, c.l2)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${note('新一级代理会收到通知，并可以在它的后台管理这个二级（佣金比例、代客申请开关）。')}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="doMoveL2('${aid}')">确认转移</button>`, true);
}
function doMoveL2(aid) {
  const a = agent(aid), from = a.parent, to = $('#mvTo').value; if (!to) return toast('没有可选的一级代理');
  const follow = $('#mvCust').value === 'follow', cs = custsOf(aid).map((c) => c.id), r = +$('#mvRatio').value || 40;
  if (cs.length) applyTransfer(cs, follow ? to : from, follow ? aid : null, $('#trWhy').value, $('#trEff').value, $('#trCom').value);
  a.parent = to; L2RATIO[aid] = Object.fromEntries(PRODUCTS.map((p) => [p.code, r]));
  AUDIT.unshift({ t: TODAY + ' 16:10', who: ME.hq.email, what: '转移二级代理', obj: `${aid} ${a.name}：${from} → ${to}`, ip: '198.51.100.7' });
  closeModal(); toast(`${a.name} 已转到 ${agent(to).name}${cs.length ? `，${follow ? cs.length + ' 个客户一起转移' : '客户留在原一级'}` : ''}`); kRenderSafe();
}
function agentActs(a) {
  const base = a.status !== '启用' ? '' : ctrlBtns('a', a.id);
  if (a.level === 1) return `${frzBadge(a, 'a')}<button class="btn sm" onclick="toast('已发送重置密码邮件到 ${a.email}')">重置登录</button>${base}${a.status === '启用' ? `<button class="btn sm danger" onclick="offboardL1('${a.id}')">停用并转移客户</button>` : ''}`;
  return `${frzBadge(a, 'a')}${base}${a.status === '启用' ? `<button class="btn sm" onclick="moveL2('${a.id}')">转到其他一级</button><button class="btn sm" onclick="reassignCust(null,'${a.id}')">重新分配客户</button>` : ''}`;
}

// ---------- 风控与调单（总后台） ----------
PAGES['hq:risk'] = () => {
  const t = S.ui.rk || 'dr';
  const fc = CUSTOMERS.filter((c) => c.frz), fa = AGENTS.filter((a) => a.frz);
  const pend = DOC_REQS.filter((d) => ['待回复', '退回补充'].includes(d.status)), over = DOC_REQS.filter((d) => d.status === '逾期'), rep = DOC_REQS.filter((d) => d.status === '已回复');
  const st = S.ui.drs || '全部';
  const drs = DOC_REQS.filter((d) => st === '全部' || d.status === st);
  let body = '';
  if (t === 'dr') body = `<div class="toolbar"><div class="chip-row">${['全部', '待回复', '已回复', '逾期', '退回补充', '已结案', '已撤销'].map((x) => `<button class="chip ${x === st ? 'on' : ''}" onclick="setUI('drs','${x}')">${x}</button>`).join('')}</div></div><div class="tbl-wrap"><table><thead><tr><th>调单号</th><th>对象</th><th>来源</th><th>涉及</th><th>文件</th><th>发出</th><th>期限</th><th>状态</th><th class="r"></th></tr></thead><tbody>${drs.map((d) => `<tr><td class="mono">${d.id}</td><td>${tgtName(d.tt, d.target)}</td><td class="small">${d.src}${d.chRef ? `<div class="mono muted">${d.chRef}</div>` : ''}</td><td class="small">${d.txs.length ? d.txs.length + ' 笔交易' : d.custs.length ? d.custs.length + ' 个客户' : '整体'}</td><td class="small">${Object.keys(d.resp).length} / ${d.docs.length}</td><td>${d.created}</td><td class="${d.status === '逾期' ? 'down' : ''}">${d.due}</td><td>${statusBadge(d.status)}</td><td class="r"><button class="link" onclick="drDetail('${d.id}')">${d.status === '已回复' ? '审核' : '查看'}</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">没有调单</td></tr>'}</tbody></table></div>`;
  else if (t === 'frz') body = `<div class="tbl-wrap"><table><thead><tr><th>对象</th><th>范围</th><th>原因</th><th>备注</th><th>冻结时间</th><th>操作人</th><th class="r"></th></tr></thead><tbody>${[...fc.map((c) => ['c', c]), ...fa.map((a) => ['a', a])].map(([tt, o]) => `<tr><td>${tgtName(tt, o.id)}</td><td>${o.frz.scopes.map((k) => `<span class="tag">${scopeName(tt, k)}${k === 'amt' && o.frz.amt ? ' ' + o.frz.amt.ccy + ' ' + nf(o.frz.amt.v) : ''}</span>`).join(' ')}</td><td>${o.frz.reason}</td><td class="small muted">${o.frz.memo || '—'}</td><td class="nowrap">${o.frz.t}</td><td class="small muted">${o.frz.by}</td><td class="r nowrap"><button class="link" onclick="unfreezeModal('${tt}','${o.id}')">解冻</button> · <button class="link" onclick="freezeModal('${tt}','${o.id}')">调整</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">目前没有冻结中的客户或代理</td></tr>'}</tbody></table></div>`;
  else body = `<div class="tbl-wrap"><table><thead><tr><th>时间</th><th>操作</th><th>对象</th><th>范围</th><th>原因 / 说明</th><th>操作人</th></tr></thead><tbody>${CTRL_LOG.map((r) => `<tr><td class="nowrap">${r.t}</td><td>${statusBadge(r.act === '冻结' ? '冻结' : r.act === '解冻' ? '已解冻' : r.act)}</td><td>${tgtName(r.tt, r.target)}</td><td class="small">${r.scopes.map((k) => scopeName(r.tt, k)).join('、') || '—'}</td><td class="small">${r.reason}</td><td class="small muted">${r.by}</td></tr>`).join('')}</tbody></table></div>`;
  return head('风控与调单', '冻结、解冻和调单的集中处理；所有操作写入审计日志', `<button class="btn" onclick="riskPick('freeze')">冻结</button><button class="btn primary" onclick="riskPick('dr')">${ICON.plus} 发起调单</button>`) +
    `<div class="grid g4" style="margin-bottom:20px">${kpi('冻结中客户', fc.length, '含止付和部分冻结')}${kpi('冻结中代理', fa.length, '一级 + 二级')}${kpi('待回复调单', pend.length, rep.length ? rep.length + ' 张已回复待审核' : '—')}${kpi('逾期调单', over.length, over.length ? '可以止付客户' : '—')}</div>
    <div class="card">${tabs('rk', [['dr', `调单${pend.length + rep.length + over.length ? ' · ' + (pend.length + rep.length + over.length) : ''}`], ['frz', `冻结中${fc.length + fa.length ? ' · ' + (fc.length + fa.length) : ''}`], ['log', '操作记录']], t)}${body}</div>`;
};
function riskPick(kind) {
  modal(kind === 'dr' ? '发起调单 · 选择对象' : '冻结 · 选择对象', `<div class="seg" style="margin-bottom:10px"><button class="on" id="rpC" onclick="this.classList.add('on');rpA.classList.remove('on');rpList.innerHTML=rpOpts('c')">客户</button><button id="rpA" onclick="this.classList.add('on');rpC.classList.remove('on');rpList.innerHTML=rpOpts('a')">代理</button></div><select class="select" id="rpList" size="8" style="height:auto">${rpOpts('c')}</select>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="const v=rpList.value;if(!v)return toast('请选择对象');const [tt,id]=v.split(':');closeModal();${kind === 'dr' ? 'docReqModal' : 'freezeModal'}(tt,id)">下一步</button>`);
}
function rpOpts(tt) { return (tt === 'c' ? CUSTOMERS : AGENTS.filter((a) => a.status === '启用')).map((o) => `<option value="${tt}:${o.id}">${o.id} ${o.name}${o.frz ? '（已冻结）' : ''}</option>`).join(''); }

// ---------- 客户 / 代理端提示 ----------
function portalBanner() {
  const P = S.portal; if (!['cust', 'l1', 'l2'].includes(P)) return '';
  const tt = P === 'cust' ? 'c' : 'a', id = ME[P].org, o = tgt(tt, id); if (!o) return '';
  let h = '';
  if (o.frz) h += note(`<b>${tt === 'c' ? '账户' : '代理账户'}已被限制：</b>${o.frz.scopes.map((k) => scopeName(tt, k)).join('、')}。${tt === 'c' && /法院|执法|AML/.test(o.frz.reason) ? '' : '原因：' + o.frz.reason + '。'}如有疑问请联系平台客服 cs@azure-pay.example。`, 'warn');
  const dr = DOC_REQS.filter((d) => d.tt === tt && d.target === id && ['待回复', '退回补充', '逾期'].includes(d.status));
  dr.forEach((d) => { h += `<div class="note warn" style="display:flex;gap:12px;align-items:center;justify-content:space-between"><div><b>调单 ${d.id}</b>：请在 ${d.due} 前上传 ${d.docs.join('、')}。${d.status === '退回补充' ? '（已退回，需要补充）' : ''}${d.autoStop && tt === 'c' ? '逾期未回复将暂停付款。' : ''}</div><button class="btn sm primary" onclick="drDetail('${d.id}')">上传文件</button></div>`; });
  return h ? `<div style="display:grid;gap:10px;margin-bottom:16px">${h}</div>` : '';
}
Object.keys(PAGES).forEach((k) => { if (k.startsWith('hq:') || k === '*:app') return; const f = PAGES[k]; PAGES[k] = (...a) => portalBanner() + f(...a); });
// block money-out when customer is frozen
['payDo', 'wdDo', 'xbPay', 'fxDo', 'fxConfirm'].forEach((fn) => { const f = window[fn]; if (typeof f !== 'function') return; window[fn] = function (...a) { const c = cust(ME.cust.org); if (S.portal === 'cust' && c.frz && (c.frz.scopes.includes('all') || c.frz.scopes.includes('pay'))) { toast('账户已被止付，暂时不能付款、提现或换汇'); return; } return f.apply(this, a); }; });
