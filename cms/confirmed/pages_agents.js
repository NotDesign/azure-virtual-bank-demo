// ===================== 代理招募、注册、审批、归属转移 =====================
window.AGENT_LINKS = [
  { code: 'HQ-AG-01', org: 'HQ', level: 1, tpl: '标准一级底价', tag: '合作伙伴大会 2026', uses: 3, exp: '2026-12-31', created: '2026-09-15' },
  { code: 'HQ-AG-02', org: 'HQ', level: 1, tpl: '新代理优惠底价', tag: '会计师事务所', uses: 1, exp: '长期', created: '2026-10-02' },
  { code: 'A001-AG-01', org: 'A001', level: 2, ratio: 40, tag: '老客户推荐', uses: 2, exp: '长期', created: '2026-08-20' },
  { code: 'A002-AG-01', org: 'A002', level: 2, ratio: 35, tag: '东莞商会', uses: 1, exp: '2026-11-30', created: '2026-09-01' },
];
window.AGENT_APPS = [
  { id: 'AGA-261011-01', level: 1, via: 'HQ-AG-01', parent: 'HQ', name: '鼎峰财务顾问有限公司', type: '公司', contact: 'Leo Wong', email: 'leo@dingfeng.example', phone: '+852 9123 4567', br: '71234567', region: '中国香港', channel: '会计师 / 公司秘书客户', est: '每月 10–15 个开户', bank: 'HSBC · 004-****-888 · HKD', status: '待审批', created: '2026-10-11', docs: ['商业登记证 BR', '公司注册证书 CR', '董事身份证件', '地址证明'] },
  { id: 'AGA-261012-02', level: 2, via: 'A001-AG-01', parent: 'A001', name: '深港跨境服务工作室', type: '个人 / 工作室', contact: '刘小姐', email: 'liu@szhk-studio.example', phone: '+852 6234 1188', br: '—', region: '中国香港', channel: '电商卖家社群', est: '每月 3–5 个开户', bank: 'BOCHK · 012-****-332 · HKD', status: '待审批', created: '2026-10-12', docs: ['身份证件', '地址证明'] },
  { id: 'AGA-261008-03', level: 1, via: 'HQ-AG-02', parent: 'HQ', name: '远航企业服务有限公司', type: '公司', contact: 'Kelvin Ho', email: 'kelvin@yuanhang.example', phone: '+852 9876 0001', br: '69876543', region: '中国香港', channel: '外贸企业', est: '每月 5 个开户', bank: '—', status: '待补件', created: '2026-10-08', docs: ['商业登记证 BR'], memo: '缺董事身份证件和佣金收款账户' },
  { id: 'AGA-260905-04', level: 2, via: 'A002-AG-01', parent: 'A002', name: '湾区出海顾问', type: '公司', contact: '张先生', email: 'team@gba-out.example', phone: '+852 5555 2211', br: '70011223', region: '中国香港', channel: '东莞商会', est: '—', bank: 'HSBC · 400-****-201 · HKD', status: '已批准', created: '2026-07-18', docs: ['商业登记证 BR', '董事身份证件'] },
];
window.ASSIGN_LOG = [
  { t: '2026-09-02 10:20', cust: 'AZ100007', from: 'A002 → —', to: 'A001 → —', by: 'stephen@ourbank.example', reason: '客户要求更换服务代理', eff: '2026-09-02', com: '原代理保留生效日前佣金' },
];
// snapshot current owner on every historical transaction (commission follows owner at transaction time)
TXS.forEach((t) => { const c = cust(t.cust); if (c && t.l1 === undefined) { t.l1 = c.l1; t.l2 = c.l2; } });

const ownerTxt = (l1, l2) => (!l1 ? '自营' : agent(l1).name + (l2 ? ' → ' + agent(l2).name : ''));
const shortOwner = (l1, l2) => (!l1 ? '自营' : l1 + (l2 ? ' → ' + l2 : ''));

// ---------- 招募与审批（全权管理者：一级；一级：二级） ----------
PAGES['*:recruit'] = () => {
  const P = S.portal, org = ME[P].org, lvl = P === 'hq' ? 1 : 2;
  const links = AGENT_LINKS.filter((l) => l.org === org);
  const apps = AGENT_APPS.filter((a) => (P === 'hq' ? a.level === 1 : a.parent === org));
  const others = P === 'hq' ? AGENT_APPS.filter((a) => a.level === 2) : [];
  AFTER.push(() => document.querySelectorAll('.qr[data-url]').forEach((el) => { if (window.QRCode) { el.innerHTML = ''; new QRCode(el, { text: el.dataset.url, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M }); } }));
  const t = S.ui.rt || 'apps';
  const pend = apps.filter((a) => a.status === '待审批').length;
  let body = '';
  if (t === 'apps') {
    body = `<div class="tbl-wrap"><table><thead><tr><th>申请号</th><th>名称</th><th>联系人 / 电邮</th><th>来源链接</th><th>预计业务</th><th>提交日期</th><th>状态</th><th class="r"></th></tr></thead><tbody>${apps.map((a) => `<tr><td class="mono">${a.id}</td><td><div class="bold">${a.name}</div><div class="small muted">${a.type}</div></td><td>${a.contact}<div class="small muted">${a.email}</div></td><td class="mono small">${a.via}</td><td class="small">${a.est}</td><td>${a.created}</td><td>${statusBadge(a.status)}</td><td class="r"><button class="link" onclick="agentAppDetail('${a.id}')">${a.status === '待审批' ? '审批' : '查看'}</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">暂无申请</td></tr>'}</tbody></table></div>
      ${P === 'hq' && others.length ? `<div class="card-pad">${note(`二级代理申请由各一级代理自行审批，全权管理者只读：目前有 ${others.filter((a) => a.status === '待审批').length} 份二级申请待一级审批。`)}</div>` : ''}`;
  } else {
    body = `<div class="card-pad grid" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr);align-items:start"><div class="card card-pad" style="background:var(--color-surface-2);display:grid;gap:12px"><div class="bold">生成${lvl === 1 ? '一级' : '二级'}代理招募链接</div>
      ${lvl === 1 ? `<div class="field"><label>底价模板（批准后套用，可再调整）</label><select class="select" id="agTpl"><option>标准一级底价</option><option>新代理优惠底价</option></select></div>` : `<div class="field"><label>默认佣金比例（我的价差 %）</label><input class="input" id="agRatio" value="40"></div><div class="small muted">二级代客申请默认关闭，批准后可以在二级代理管理里开启。</div>`}
      <div class="field"><label>来源标签</label><input class="input" id="agTag" placeholder="例：商会、展会"></div><div class="field"><label>有效期</label><select class="select" id="agExp"><option>长期</option><option>30 天</option><option>2026-12-31</option></select></div>
      <button class="btn primary" style="justify-content:center" onclick="newAgentLink(${lvl})">生成链接和 QR</button></div>
      <div class="grid g2">${links.map((l) => { const url = `https://join.azure-pay.example/a/${l.code}`; return `<div class="card card-pad"><div class="qr-box"><div class="qr" data-url="${url}"></div><div style="min-width:0"><div class="bold mono">${l.code}</div><div class="small muted">${l.level === 1 ? '一级招募 · ' + l.tpl : '二级招募 · 默认比例 ' + l.ratio + '%'}</div><div class="small muted">${l.tag} · 有效期 ${l.exp}</div><div class="small">已注册 ${l.uses} 次</div><div class="btn-row mt"><button class="btn sm" onclick="navigator.clipboard&&navigator.clipboard.writeText('${url}');toast('已复制链接')">复制</button><a class="btn sm" href="#/join/${l.code}">打开注册页</a></div></div></div></div>`; }).join('')}</div></div>`;
  }
  return head(P === 'hq' ? '代理招募与审批' : '二级招募与审批', P === 'hq' ? '全权管理者生成链接招募一级代理，并审批一级代理注册' : '生成链接招募二级代理，由你审批；批准后成为你的下属二级', '') +
    `<div class="grid g3" style="margin-bottom:20px">${kpi('待审批', pend, '注册后进入审批')}${kpi('招募链接', links.length, '每条链接可设模板和有效期')}${kpi(P === 'hq' ? '在册一级代理' : '我的二级代理', AGENTS.filter((a) => (P === 'hq' ? a.level === 1 : a.parent === org) && a.status === '启用').length, '启用中')}</div>
    <div class="card">${tabs('rt', [['apps', `注册申请${pend ? ' · ' + pend : ''}`], ['links', '招募链接 / QR']], t)}${body}</div>`;
};
function newAgentLink(lvl) {
  const org = ME[S.portal].org, n = AGENT_LINKS.filter((l) => l.org === org).length + 1;
  AGENT_LINKS.unshift({ code: `${org}-AG-${String(n).padStart(2, '0')}`, org, level: lvl, tpl: lvl === 1 ? $('#agTpl').value : '', ratio: lvl === 2 ? +$('#agRatio').value || 40 : 0, tag: $('#agTag').value || '未分类', uses: 0, exp: $('#agExp').value, created: TODAY });
  toast('已生成招募链接和 QR'); render();
}
function agentAppDetail(id) {
  const a = AGENT_APPS.find((x) => x.id === id), canAct = a.status === '待审批' || a.status === '待补件';
  modal(`${a.level === 1 ? '一级' : '二级'}代理注册 · ${a.name}`, `<div class="detail-hero"><div><small>${a.id} · 来源 ${a.via}</small><b>${a.name}</b></div><div style="text-align:right">${statusBadge(a.status)}</div></div>
    ${a.memo ? note('补件说明：' + a.memo, 'warn') : ''}
    <dl class="kv"><dt>类型</dt><dd>${a.type}</dd><dt>联系人</dt><dd>${a.contact}</dd><dt>登录电邮</dt><dd>${a.email}</dd><dt>电话</dt><dd>${a.phone}</dd><dt>BR 号码</dt><dd class="mono">${a.br}</dd><dt>客户来源</dt><dd>${a.channel}</dd><dt>预计业务量</dt><dd>${a.est}</dd><dt>佣金收款账户</dt><dd>${a.bank}</dd><dt>上级</dt><dd>${a.parent === 'HQ' ? '全权管理者（直属一级）' : agent(a.parent).name}</dd></dl>
    <div class="bold mt">已上传文件</div><div class="chip-row" style="margin-top:8px">${a.docs.map((d) => `<span class="tag">${d}</span>`).join('')}</div>
    ${canAct ? `<div class="lt-sec">批准设置</div>${a.level === 1 ? `<div class="field"><label>套用底价模板</label><select class="select" id="apTpl"><option>标准一级底价（同 A001）</option><option>新代理优惠底价</option></select></div>` : `<div class="form-grid"><div class="field"><label>佣金比例（我的价差 %）</label><input class="input" id="apRatio" value="${(AGENT_LINKS.find((l) => l.code === a.via) || {}).ratio || 40}"></div><div class="field"><label>代客申请</label><select class="select" id="apProxy"><option value="0">默认关闭</option><option value="1">开启</option></select></div></div>`}${note('批准后系统发送邀请邮件到登录电邮，对方设置密码和两步验证后即可登录' + (a.level === 1 ? '一级' : '二级') + '后台。')}` : ''}`,
    canAct ? `<button class="btn" onclick="agentAppSet('${id}','已驳回')">驳回</button><button class="btn" onclick="agentAppSet('${id}','待补件')">要求补件</button><button class="btn primary" onclick="approveAgent('${id}')">批准</button>` : '', true);
}
function agentAppSet(id, st) { AGENT_APPS.find((x) => x.id === id).status = st; closeModal(); toast(st === '待补件' ? '已发补件通知到申请人电邮' : '已驳回并通知申请人'); render(); }
function approveAgent(id) {
  const a = AGENT_APPS.find((x) => x.id === id);
  const n = AGENTS.filter((x) => x.level === a.level).length + 1;
  const newId = a.level === 1 ? 'A' + String(n).padStart(3, '0') : 'B' + String(20 + n).padStart(3, '0');
  AGENTS.push({ id: newId, level: a.level, name: a.name, parent: a.parent, email: a.email, status: '启用', since: TODAY, proxyApply: a.level === 2 ? ($('#apProxy') || {}).value === '1' : undefined });
  if (a.level === 1) FLOORS[newId] = { ...FLOORS.A001 };
  else { const r = +(($('#apRatio') || {}).value) || 40; L2RATIO[newId] = Object.fromEntries(PRODUCTS.map((p) => [p.code, r])); }
  a.status = '已批准'; a.agentId = newId;
  AUDIT.unshift({ t: TODAY + ' 15:55', who: ME[S.portal].email, what: `批准${a.level === 1 ? '一级' : '二级'}代理`, obj: `${newId} ${a.name}`, ip: '198.51.100.7' });
  closeModal(); toast(`已批准：${a.name}（${newId}），邀请邮件已发送`); render();
}

// ---------- 公开注册页 ----------
function publicJoin() {
  const link = AGENT_LINKS.find((l) => l.code === S.arg) || AGENT_LINKS[0];
  const lvl = link.level, inviter = link.org === 'HQ' ? 'Azure 平台' : agent(link.org).name;
  if (!S.join || S.join.code !== link.code) S.join = { code: link.code, step: 0, type: '公司', docs: [] };
  const st = S.join;
  const steps = ['基本资料', '上传文件', '佣金收款账户', '协议与提交'];
  let body = '';
  if (st.done) body = `<div class="drop" style="padding:48px 24px"><div class="ios-ic lg" style="background:#34c759;margin:0 auto 8px">${ICON.plus.replace('M12 5v14M5 12h14', 'M5 12l5 5L20 7')}</div><div class="bold" style="font-size:20px">注册已提交</div><div class="muted">申请号 <span class="mono">${st.done}</span>。${lvl === 1 ? 'Azure 平台' : inviter}会在 1–2 个工作日内审批，结果发送到你的电邮。</div><div class="btn-row" style="justify-content:center;margin-top:14px"><a class="btn primary" href="#/${link.org === 'HQ' ? 'hq' : 'l1'}/recruit">去${link.org === 'HQ' ? '全权管理者' : '一级后台'}看审批（原型）</a></div></div>`;
  else if (st.step === 0) body = `<div class="seg" style="margin-bottom:16px">${['公司', '个人 / 工作室'].map((k) => `<button class="${st.type === k ? 'on' : ''}" onclick="S.join.type='${k}';render()">${k}</button>`).join('')}</div><div class="form-grid"><div class="field full"><label>${st.type === '公司' ? '公司名称' : '姓名 / 工作室名称'}</label><input class="input" id="jName" value="${esc(st.name || '')}" placeholder="${st.type === '公司' ? '例：鼎峰财务顾问有限公司' : '例：陈氏商务工作室'}"></div><div class="field"><label>联系人</label><input class="input" id="jContact" value="${esc(st.contact || '')}"></div><div class="field"><label>登录电邮（主要联系方式）</label><input class="input" id="jEmail" type="email" value="${esc(st.email || '')}" placeholder="name@company.com"></div><div class="field"><label>电话</label><input class="input" value="+852 "></div>${st.type === '公司' ? '<div class="field"><label>BR 号码</label><input class="input"></div>' : '<div class="field"><label>证件号码</label><input class="input"></div>'}<div class="field"><label>主要客户来源</label><select class="select"><option>会计师 / 公司秘书客户</option><option>电商卖家社群</option><option>外贸企业</option><option>商会 / 协会</option></select></div><div class="field"><label>预计每月开户数</label><select class="select"><option>1–5</option><option>5–15</option><option>15 以上</option></select></div></div>`;
  else if (st.step === 1) { const need = st.type === '公司' ? ['商业登记证 BR', '公司注册证书 CR', '董事身份证件', '地址证明'] : ['身份证件', '地址证明']; body = `<div style="display:grid;gap:10px">${need.map((d) => `<div class="doc-item ${st.docs.includes(d) ? 'on' : ''}"><span class="ios-ic" style="background:${st.docs.includes(d) ? '#34c759' : '#aeaeb2'}">${NAVICON.statements}</span><div style="flex:1"><div class="bold small">${d}</div><div class="small muted">${st.docs.includes(d) ? '已上传 · sample.pdf' : 'PDF / JPG，≤ 10MB'}</div></div><button class="btn sm" onclick="S.join.docs.includes('${d}')||S.join.docs.push('${d}');render()">${st.docs.includes(d) ? '重新上传' : '上传'}</button></div>`).join('')}<button class="btn" onclick="S.join.docs=${JSON.stringify(need).replace(/"/g, '&quot;')};render()">一键上传示例文件</button></div>`; }
  else if (st.step === 2) body = `${note(`佣金按 T+15 结算，${lvl === 1 ? '由 Azure 平台' : '由 ' + inviter + '（一级代理）'}支付到以下账户。账户名称须与注册名称一致。`)}<div class="form-grid mt"><div class="field"><label>银行</label><select class="select"><option>HSBC Hong Kong</option><option>Bank of China (HK)</option><option>Hang Seng Bank</option><option>Standard Chartered HK</option></select></div><div class="field"><label>币种</label><select class="select"><option>HKD</option><option>USD</option></select></div><div class="field"><label>户名</label><input class="input" value="${esc(st.name || '')}"></div><div class="field"><label>账号</label><input class="input"></div></div>`;
  else body = `<div class="card card-pad" style="background:var(--color-surface-2)"><div class="bold">${lvl === 1 ? '一级代理合作协议' : '二级代理合作协议'}（摘要）</div><ul class="small muted" style="margin:10px 0 0 18px;line-height:1.9">${lvl === 1 ? '<li>平台按产品给你一级底价，你可以在底价之上为客户设定费率</li><li>你可以招募并管理二级代理，自行设定二级佣金比例</li><li>佣金 T+15 结算；如代理关系终止，平台可将客户重新分配给其他一级代理</li>' : `<li>你的上级是 ${inviter}，佣金 = 一级价差 × 比例（默认 ${link.ratio}%）</li><li>你可以生成开户链接；代客申请需上级开启</li><li>如代理关系终止，上级可将你的客户重新分配给其他二级代理</li>`}<li>须遵守反洗钱和客户资料保密要求</li></ul></div><label class="tag mt" style="padding:8px 12px;display:inline-flex;gap:8px"><input type="checkbox" checked> 我已阅读并同意协议和隐私政策</label>`;
  const nav = st.done ? '' : `<div class="btn-row" style="justify-content:space-between;margin-top:20px"><button class="btn" ${st.step === 0 ? 'disabled' : ''} onclick="S.join.step--;render()">上一步</button>${st.step < 3 ? `<button class="btn primary" onclick="joinNext()">下一步</button>` : `<button class="btn primary" onclick="joinSubmit()">提交注册</button>`}</div>`;
  return `<div class="public"><div class="public-top"><img src="./assets/azure-mark.png" alt="Azure 标志" style="width:36px;height:36px"><div><div class="bold">Azure ${lvl === 1 ? '一级' : '二级'}代理注册</div><div class="small muted">邀请方：${inviter}${lvl === 2 ? '（一级代理）' : ''}</div></div><div style="flex:1"></div>${I18N.switcher()}<button class="icon-btn" onclick="toggleTheme()" aria-label="切换明暗">${S.theme === 'dark' ? ICON.sun : ICON.moon}</button><a class="btn sm" href="#/hq/recruit">返回原型</a></div>
    <div class="public-body"><h1 class="page-title">成为 Azure ${lvl === 1 ? '一级' : '二级'}代理</h1><p class="page-desc" style="margin-bottom:24px">${lvl === 1 ? '为客户开立香港多币种账户，赚取收款、付款、换汇和开户佣金，并可发展自己的二级代理。' : `加入 ${inviter} 的代理团队，推荐客户开户并赚取佣金。`}</p>
    <div class="card card-pad">${st.done ? '' : `<div class="steps" style="padding:0 0 20px">${steps.map((s, i) => `<div class="step ${i < st.step ? 'done' : i === st.step ? 'on' : ''}"><span class="dot">${i < st.step ? '✓' : i + 1}</span>${s}</div>`).join('<span class="line"></span>')}</div>`}${body}${nav}</div>
    <p class="small muted" style="text-align:center;margin-top:16px">链接 <span class="mono">${link.code}</span> · 资料加密传输 · 数据不存放在中国内地</p></div></div>`;
}
function joinNext() {
  const st = S.join;
  if (st.step === 0) { st.name = ($('#jName') || {}).value || (st.type === '公司' ? '新纪元商务顾问有限公司' : '黎氏跨境工作室'); st.contact = ($('#jContact') || {}).value || 'Mandy Lai'; st.email = ($('#jEmail') || {}).value || 'mandy@example.com'; }
  if (st.step === 1 && st.docs.length < (st.type === '公司' ? 4 : 2)) { toast('请先上传所有必需文件'); return; }
  st.step++; render();
}
function joinSubmit() {
  const st = S.join, link = AGENT_LINKS.find((l) => l.code === S.arg) || AGENT_LINKS[0];
  const id = 'AGA-' + TODAY.slice(2).replace(/-/g, '') + '-' + String(AGENT_APPS.length + 1).padStart(2, '0');
  AGENT_APPS.unshift({ id, level: link.level, via: link.code, parent: link.org, name: st.name, type: st.type, contact: st.contact, email: st.email, phone: '+852 —', br: '—', region: '中国香港', channel: '—', est: '1–5', bank: 'HSBC · ****', status: '待审批', created: TODAY, docs: st.docs.slice() });
  link.uses++; st.done = id; render();
}

// ---------- 归属转移 ----------
function custsOf(agentId) { const a = agent(agentId); return CUSTOMERS.filter((c) => (a.level === 1 ? c.l1 === agentId : c.l2 === agentId)); }
function applyTransfer(ids, toL1, toL2, reason, eff, com) {
  ids.forEach((id) => {
    const c = cust(id), from = shortOwner(c.l1, c.l2);
    TXS.forEach((t) => { if (t.cust === id && t.l1 === undefined) { t.l1 = c.l1; t.l2 = c.l2; } });
    c.l1 = toL1; c.l2 = toL2;
    ASSIGN_LOG.unshift({ t: TODAY + ' 16:00', cust: id, from, to: shortOwner(toL1, toL2), by: ME[S.portal].email, reason, eff, com });
  });
  AUDIT.unshift({ t: TODAY + ' 16:00', who: ME[S.portal].email, what: '客户归属转移', obj: `${ids.join(', ')} → ${shortOwner(toL1, toL2)}`, ip: '198.51.100.7' });
}
const comOpts = `<div class="field"><label>未结算佣金处理</label><select class="select" id="trCom"><option>原代理保留生效日前佣金</option><option>冻结待处理（跑路 / 违规）</option><option>转给新代理</option><option>归全权管理者</option></select></div>`;
const effField = `<div class="field"><label>生效日期</label><input class="input" type="date" id="trEff" value="${'2026-10-13'}"></div>`;
// HQ: reassign customer(s) to another L1 (or self-operated)
function reassignCust(id) {
  const l1s = AGENTS.filter((a) => a.level === 1 && a.status === '启用');
  const list = id ? [cust(id)] : CUSTOMERS;
  modal('重新分配一级代理', `${note('全权管理者只分配到<b>一级代理</b>（或自营）。转移后客户的二级归属会清空，由新一级代理再分配二级。历史交易的佣金按交易当时的归属计算，生效日之后的交易归新代理。')}
    <div class="field"><label>客户</label>${id ? `<input class="input" value="${list[0].id} ${list[0].name} · 当前 ${ownerTxt(list[0].l1, list[0].l2)}" disabled>` : `<div class="pick-list">${list.map((c) => `<label class="pick"><input type="checkbox" value="${c.id}" class="trPick"> <span class="mono small">${c.id}</span> ${c.name} <span class="muted small">· ${ownerTxt(c.l1, c.l2)}</span></label>`).join('')}</div>`}</div>
    <div class="form-grid"><div class="field"><label>转给</label><select class="select" id="trTo"><option value="">自营（全权管理者直属）</option>${l1s.map((a) => `<option value="${a.id}">${a.id} ${a.name}</option>`).join('')}</select></div>${effField}${comOpts}<div class="field"><label>原因</label><select class="select" id="trWhy"><option>代理停止合作 / 失联</option><option>客户要求更换代理</option><option>代理违规</option><option>内部调整</option></select></div></div>
    ${note('客户费率不变；如新代理底价不同，系统会检查客户价是否仍高于新代理底价。客户会收到“服务代理变更”电邮通知。')}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="doReassign(${id ? `['${id}']` : 'null'},false)">确认转移</button>`, true);
}
// L1: reassign own customer(s) to another of its L2s (or direct)
function reassignL2(id) {
  const mineL2 = AGENTS.filter((a) => a.parent === ME.l1.org && a.status === '启用');
  const list = id ? [cust(id)] : CUSTOMERS.filter((c) => c.l1 === ME.l1.org);
  modal('重新分配二级代理', `${note('只能在你自己的二级代理之间转移，或改为你直属。转移只影响生效日之后的交易佣金。')}
    <div class="field"><label>客户</label>${id ? `<input class="input" value="${list[0].id} ${list[0].name} · 当前 ${ownerTxt(list[0].l1, list[0].l2)}" disabled>` : `<div class="pick-list">${list.map((c) => `<label class="pick"><input type="checkbox" value="${c.id}" class="trPick"> <span class="mono small">${c.id}</span> ${c.name} <span class="muted small">· ${c.l2 ? agent(c.l2).name : '直属'}</span></label>`).join('')}</div>`}</div>
    <div class="form-grid"><div class="field"><label>转给</label><select class="select" id="trTo"><option value="">我直属（无二级）</option>${mineL2.map((a) => `<option value="${a.id}">${a.id} ${a.name}</option>`).join('')}</select></div>${effField}${comOpts.replace('<option>归全权管理者</option>', '<option>归一级（我）</option>')}<div class="field"><label>原因</label><select class="select" id="trWhy"><option>二级停止合作 / 失联</option><option>客户要求更换</option><option>内部调整</option></select></div></div>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="doReassign(${id ? `['${id}']` : 'null'},true)">确认转移</button>`, true);
}
function doReassign(ids, isL1) {
  ids = ids || [...document.querySelectorAll('.trPick:checked')].map((x) => x.value);
  if (!ids.length) { toast('请选择至少一个客户'); return; }
  const to = $('#trTo').value || null, eff = $('#trEff').value, com = $('#trCom').value, why = $('#trWhy').value;
  if (isL1) applyTransfer(ids, ME.l1.org, to, why, eff, com); else applyTransfer(ids, to, null, why, eff, com);
  closeModal(); toast(`已转移 ${ids.length} 个客户到 ${isL1 ? (to ? agent(to).name : '直属') : (to ? agent(to).name : '自营')}`); render();
}
// HQ: offboard an L1 — move all its customers (incl. via L2) to another L1, optionally carry L2s
function offboardL1(aid) {
  const a = agent(aid), cs = custsOf(aid), l2s = AGENTS.filter((x) => x.parent === aid && x.status === '启用');
  const l1s = AGENTS.filter((x) => x.level === 1 && x.status === '启用' && x.id !== aid);
  modal(`停用一级代理 · ${a.name}`, `${note(`将停用 <b>${a.name}</b> 的登录和链接，并把它名下 <b>${cs.length}</b> 个客户（含 ${l2s.length} 个二级代理带来的客户）转移出去。`, 'warn')}
    <div class="form-grid"><div class="field"><label>客户转给</label><select class="select" id="trTo"><option value="">自营（全权管理者直属）</option>${l1s.map((x) => `<option value="${x.id}">${x.id} ${x.name}</option>`).join('')}</select></div>${effField}
    <div class="field full"><label>下属二级代理</label><select class="select" id="trL2"><option value="keep">二级一并转到新一级（保留二级与客户关系）</option><option value="drop">二级一并停用，客户直属新一级</option></select></div>${comOpts}<div class="field"><label>原因</label><select class="select" id="trWhy"><option>代理停止合作 / 失联</option><option>代理违规</option><option>合约到期</option></select></div></div>
    <div class="bold mt">受影响客户</div><div class="tbl-wrap"><table><thead><tr><th>客户</th><th>当前归属</th></tr></thead><tbody>${cs.map((c) => `<tr><td>${c.id} ${c.name}</td><td>${ownerTxt(c.l1, c.l2)}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">无客户</td></tr>'}</tbody></table></div>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn danger" onclick="doOffboardL1('${aid}')">停用并转移</button>`, true);
}
function doOffboardL1(aid) {
  const to = $('#trTo').value || null, keep = $('#trL2').value === 'keep', eff = $('#trEff').value, com = $('#trCom').value, why = $('#trWhy').value;
  const cs = custsOf(aid); const a = agent(aid);
  cs.forEach((c) => applyTransfer([c.id], to, keep && to ? c.l2 : null, why, eff, com));
  AGENTS.filter((x) => x.parent === aid).forEach((x) => { if (keep && to) { x.parent = to; L2RATIO[x.id] ||= {}; } else { x.status = '停用'; x.offDate = eff; x.offReason = '上级一级代理停用'; } });
  a.status = '停用'; a.offDate = eff; a.offReason = why;
  AGENT_LINKS.forEach((l) => { if (l.org === aid) l.exp = '已失效'; }); LINKS.forEach((l) => { if (l.org === aid) l.exp = '已失效'; });
  closeModal(); toast(`${a.name} 已停用，${cs.length} 个客户已转移`); render();
}
// L1: offboard one of its L2s
function offboardL2(aid) {
  const a = agent(aid), cs = custsOf(aid), others = AGENTS.filter((x) => x.parent === ME.l1.org && x.status === '启用' && x.id !== aid);
  modal(`停用二级代理 · ${a.name}`, `${note(`将停用 <b>${a.name}</b> 的登录和链接，并把它的 <b>${cs.length}</b> 个客户转移。`, 'warn')}<div class="form-grid"><div class="field"><label>客户转给</label><select class="select" id="trTo"><option value="">我直属（无二级）</option>${others.map((x) => `<option value="${x.id}">${x.id} ${x.name}</option>`).join('')}</select></div>${effField}${comOpts.replace('<option>归全权管理者</option>', '<option>归一级（我）</option>')}<div class="field"><label>原因</label><select class="select" id="trWhy"><option>二级停止合作 / 失联</option><option>二级违规</option></select></div></div>
    <div class="bold mt">受影响客户</div><div class="tbl-wrap"><table><tbody>${cs.map((c) => `<tr><td>${c.id} ${c.name}</td></tr>`).join('') || '<tr><td class="empty">无客户</td></tr>'}</tbody></table></div>`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn danger" onclick="doOffboardL2('${aid}')">停用并转移</button>`, true);
}
function doOffboardL2(aid) {
  const to = $('#trTo').value || null, eff = $('#trEff').value, com = $('#trCom').value, why = $('#trWhy').value, a = agent(aid), cs = custsOf(aid);
  applyTransfer(cs.map((c) => c.id), ME.l1.org, to, why, eff, com);
  a.status = '停用'; a.offDate = eff; a.offReason = why; LINKS.forEach((l) => { if (l.org === aid) l.exp = '已失效'; });
  closeModal(); toast(`${a.name} 已停用，${cs.length} 个客户已转移`); render();
}
function assignLogCard() {
  const P = S.portal, org = ME[P].org;
  const L = ASSIGN_LOG.filter((r) => P === 'hq' || r.from.startsWith(org) || r.to.startsWith(org));
  return `<div class="card mt"><div class="card-head"><h3 class="card-title">归属变更记录</h3><span class="card-sub">${L.length} 条 · 只增不删</span></div><div class="tbl-wrap"><table><thead><tr><th>时间</th><th>客户</th><th>原归属</th><th>新归属</th><th>生效日</th><th>佣金处理</th><th>原因</th><th>操作人</th></tr></thead><tbody>${L.map((r) => `<tr><td class="nowrap">${r.t}</td><td>${r.cust} ${cust(r.cust).name}</td><td class="mono small">${r.from}</td><td class="mono small">${r.to}</td><td>${r.eff}</td><td class="small">${r.com}</td><td class="small">${r.reason}</td><td class="small muted">${r.by}</td></tr>`).join('')}</tbody></table></div></div>`;
}
const _hqAgents = PAGES['hq:agents'], _l1Agents = PAGES['l1:agents'];
PAGES['hq:agents'] = () => _hqAgents() + assignLogCard();
PAGES['l1:agents'] = () => _l1Agents() + assignLogCard();
