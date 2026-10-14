// ===== onboarding: CS workbench, apply wizard, public page, settings =====
const DOC_TYPES = [
  ['BR', '商业登记证 BR'], ['CR', '公司注册证书 CR'], ['NAR1', '周年申报表 NAR1'], ['ID1', '董事身份证件'], ['ID2', 'UBO 身份证件'], ['SITE', '经营场所照片（3 张）'], ['ADDR', '地址证明'],
];
function ocrFor(company) {
  const en = company.includes('海韵') ? 'Haiyun Trading Limited' : company.includes('嘉禾') ? 'Jiahe International Logistics Limited' : 'Sample Company Limited';
  return {
    BR: [['公司名称', company, .98], ['英文名称', en, .95], ['BR 号码', '7' + String(Math.abs(hash(company)) % 10000000).padStart(7, '0'), .97], ['生效日期', '2026-03-18', .93], ['到期日期', '2027-03-17', .91], ['营业地址', '香港九龙观塘道 388 号 18 楼 1802 室', .82], ['业务性质', 'TRADING', .88]],
    CR: [['中文名称', company, .97], ['英文名称', en.replace('Limited', 'Ltd.'), .86], ['CR 号码', String(3100000 + (Math.abs(hash(company)) % 99999)), .96], ['注册日期', '2019-03-18', .94]],
    NAR1: [['董事 1', '王志明 WONG Chi Ming', .9], ['董事 2', '李美华 LI Mei Wah', .78], ['股东 / 持股', '王志明 60%；李美华 40%', .84], ['公司秘书', 'ABC Secretarial Ltd', .9]],
    ID1: [['姓名', 'WONG Chi Ming 王志明', .96], ['证件号', 'A123***(4)', .99], ['出生日期', '1982-05-14', .95], ['签发日期', '2018-09-02', .7]],
    ID2: [['姓名', 'LI Mei Wah 李美华', .95], ['证件号', 'Y654***(1)', .98], ['出生日期', '1986-11-30', .93]],
    SITE: [['识别结果', '不做 OCR，由 CS 目视确认：门头 1 张 + 内部 2 张', 1]],
    ADDR: [['地址', '香港九龙观塘道 388 号 18 楼 1802 室', .88], ['文件日期', '2026-09-01', .9]],
  };
}
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// ---------- application detail ----------
PAGES['*:app'] = () => {
  const a = APPLICATIONS.find((x) => x.id === S.arg); if (!a) return '<div class="empty">申请不存在</div>';
  const P = S.portal, isHQ = P === 'hq';
  const flow = ['OCR 中', '待 CS 补录', '待合规审核', '待董事验证', '渠道审核中', '已开通'];
  const idx = a.status === '待补件' ? 1 : a.status === '渠道驳回' ? 4 : flow.indexOf(a.status);
  const stepper = `<div class="steps">${flow.map((s, i) => `<div class="step ${i < idx ? 'done' : i === idx ? 'on' : ''}"><span class="dot">${i < idx ? '✓' : i + 1}</span>${s}</div>`).join('')}</div>`;
  const ocr = ocrFor(a.company);
  const doc = S.ui.doc || 'BR';
  const tl = [['申请创建', a.created + ' · ' + a.src, true], ['文件上传 + OCR', a.docs + '/7 份文件', idx >= 1], ['CS 核对与补录', isHQ ? 'CS：Amy' : '平台客服', idx >= 2], ['合规审核', isHQ ? '制裁筛查、UBO、风险评级' : '平台合规', idx >= 3], ['董事实人验证', 'eKYC 链接发至董事电邮', idx >= 4], ['提交 Allinpay', 'regcus → mer/create → va/apply', idx >= 4], ['账户开通', '收取开户费、通知客户和代理', idx >= 5]];
  const timeline = `<div class="card"><div class="card-head"><h3 class="card-title">进度</h3>${statusBadge(a.status)}</div><div class="card-pad"><ul class="timeline">${tl.map(([t, d, done], i) => `<li class="${done ? 'done' : ''} ${i === Math.max(0, idx + 1) && !done ? 'cur' : ''}"><div class="bold">${t}</div><div class="small muted">${d}</div></li>`).join('')}</ul></div></div>`;
  const info = `<div class="card"><div class="card-head"><h3 class="card-title">申请信息</h3></div><div class="card-pad"><dl class="kv"><dt>申请号</dt><dd class="mono">${a.id}</dd><dt>来源</dt><dd>${a.src}</dd><dt>归属</dt><dd>${a.owner ? agent(a.owner).name + (a.l2 ? ' → ' + agent(a.l2).name : '') : '自营'}</dd><dt>费率模板</dt><dd>${a.owner ? agent(a.owner).name.slice(0, 3) + '标准价' : '自营标准价'}</dd><dt>申请账户</dt><dd>渣打（香港）VA · HKD/USD/CNH/EUR</dd></dl></div></div>`;
  const actions = { 'OCR 中': ['完成识别，进入 CS 补录', '待 CS 补录'], '待 CS 补录': ['提交合规审核', '待合规审核'], '待补件': ['补件已收到，继续补录', '待 CS 补录'], '待合规审核': ['合规通过，发送董事验证', '待董事验证'], '待董事验证': ['模拟：董事完成验证 → 提交 Allinpay', '渠道审核中'], '渠道审核中': ['模拟：Allinpay 回调审核通过', '已开通'] }[a.status];

  let work = '';
  if (isHQ && ['OCR 中', '待 CS 补录', '待补件'].includes(a.status)) {
    const fields = ocr[doc];
    const crossWarn = doc === 'CR' || doc === 'BR' ? note('<b>交叉核对：</b>BR 英文名称是 “…Limited”，CR 是 “…Ltd.”。请确认以 CR 为准。', 'warn') : '';
    work = `<div class="card"><div class="card-head"><h3 class="card-title">CS 工作台</h3><span class="card-sub">左边看文件，右边核对 OCR 结果；黄色是低置信度字段</span></div>
      <div class="card-pad grid" style="grid-template-columns:180px minmax(0,1fr) minmax(0,1.1fr);align-items:start">
        <div class="doc-list">${DOC_TYPES.map(([k, l], i) => `<div class="doc-item ${k === doc ? 'on' : ''}" onclick="setUI('doc','${k}')"><div class="fi">${i < a.docs ? 'PDF' : '缺'}</div><div style="min-width:0"><div class="small bold">${l}</div><div class="small ${i < a.docs ? 'muted' : 'down'}">${i < a.docs ? '已上传 · 已识别' : '未上传'}</div></div></div>`).join('')}</div>
        <div class="doc-preview">${docPreview(doc, a, ocr)}</div>
        <div><div class="bold" style="margin-bottom:8px">${DOC_TYPES.find((d) => d[0] === doc)[1]} · OCR 结果</div>${fields.map(([k, v, c]) => `<div class="ocr-row"><label>${k}</label><input class="input ${c < .85 ? 'lowconf' : ''}" value="${v}"/><span class="conf ${c < .85 ? 'lo' : 'hi'}">${Math.round(c * 100)}%</span></div>`).join('')}<div class="mt">${crossWarn}</div></div>
      </div></div>
      <div class="card mt"><div class="card-head"><h3 class="card-title">CS 补录 · 开户资料</h3><span class="card-sub">客户已填的资料 + OCR 结果；字段与 Allinpay 进件对齐，CS 补齐后提交合规</span></div><div class="card-pad">${kycForm(kycOf(a), 'cs')}</div></div>`;
  } else if (isHQ && a.status === '待合规审核') {
    work = `<div class="card"><div class="card-head"><h3 class="card-title">合规审核</h3></div><div class="card-pad grid g2">
      <div><div class="bold">制裁名单筛查</div><table class="mt"><tbody><tr><td>公司</td><td>${statusBadge('成功')} 无命中</td></tr><tr><td>王志明</td><td>${statusBadge('成功')} 无命中</td></tr><tr><td>李美华</td><td>${statusBadge('成功')} 无命中</td></tr><tr><td>负面新闻</td><td><span class="badge warn">1 条待复核</span></td></tr></tbody></table></div>
      <div><div class="bold">UBO 穿透（> 25%）</div><table class="mt"><tbody><tr><td>王志明</td><td class="r">60%</td><td>${statusBadge('已审核')}</td></tr><tr><td>李美华</td><td class="r">40%</td><td>${statusBadge('已审核')}</td></tr></tbody></table>
      <div class="field mt"><label>风险评级</label><select class="select"><option>低</option><option selected>中</option><option>高</option></select></div></div>
      <div class="field full" style="grid-column:1/-1"><label>合规意见（内部，代理看不到）</label><textarea class="input">业务真实性已核实。负面新闻为同名人士，已排除。</textarea></div></div></div>`;
  } else if (a.status === '待董事验证' || a.status === '渠道审核中' || a.status === '已开通') {
    work = `<div class="card"><div class="card-head"><h3 class="card-title">${a.status === '待董事验证' ? '董事实人验证' : '渠道提交记录'}</h3></div><div class="card-pad">
      <table><thead><tr><th>时间</th><th>步骤</th><th>说明</th><th>结果</th></tr></thead><tbody>
      <tr><td>10-11 15:02</td><td>发送 eKYC 链接</td><td>王志明、李美华（电邮 + 短信）</td><td>${statusBadge(idx >= 4 ? '成功' : '处理中')}</td></tr>
      ${idx >= 4 ? `<tr><td>10-12 09:40</td><td class="mono">/file/upload</td><td>7 份文件</td><td>${statusBadge('成功')}</td></tr><tr><td>10-12 09:41</td><td class="mono">/entity/regcus</td><td>企业进件</td><td>${statusBadge('成功')}</td></tr><tr><td>10-12 09:41</td><td class="mono">/mer/create</td><td>子商户</td><td>${statusBadge('成功')}</td></tr><tr><td>10-12 09:42</td><td class="mono">/va/apply</td><td>渣打 VA · 4 币种</td><td>${statusBadge(idx >= 5 ? '成功' : '处理中')}</td></tr>` : ''}
      </tbody></table></div></div>`;
  } else {
    work = `<div class="card card-pad"><div class="bold">文件</div><div class="doc-list mt">${DOC_TYPES.map(([k, l], i) => `<div class="doc-item"><div class="fi">${i < a.docs ? 'PDF' : '缺'}</div><div><div class="small bold">${l}</div><div class="small ${i < a.docs ? 'muted' : 'down'}">${i < a.docs ? '已上传' : '需要补交'}</div></div>${i >= a.docs && a.status === '待补件' ? `<button class="btn sm" style="margin-left:auto" onclick="toast('已上传，平台 CS 会继续处理')">${ICON.up} 上传</button>` : ''}</div>`).join('')}</div>
      ${a.status === '待补件' ? note('平台要求补交：董事身份证件（背面）、地址证明（3 个月内）。', 'warn') : ''}${a.status === '渠道驳回' ? note('Allinpay 驳回原因：经营场所照片与登记地址不一致。请联系平台 CS。', 'warn') : ''}</div>`;
  }
  const btns = isHQ && actions ? `<button class="btn" onclick="supplementReq('${a.id}')">发补件通知</button><button class="btn" onclick="toast('已保存')">保存</button><button class="btn primary" onclick="advanceApp('${a.id}','${actions[1]}')">${actions[0]}</button>` : '';
  return head(a.company, `${a.id} · ${a.src}`, btns, `<a href="#/${P}/apps">${P === 'hq' ? '开户申请工作台' : '申请进度'}</a> / ${a.id}`) +
    `<div class="card">${stepper}</div><div class="grid mt" style="grid-template-columns:minmax(0,3fr) minmax(260px,1fr);align-items:start"><div>${work}</div><div class="grid">${info}${timeline}</div></div>`;
};
function docPreview(doc, a, ocr) {
  const f = ocr[doc];
  if (doc === 'SITE') return `<h4>经营场所照片</h4><div class="sub">门头 1 张 + 内部 2 张</div><div class="grid g3">${['门头', '办公区', '仓库'].map((x) => `<div style="aspect-ratio:4/3;background:linear-gradient(135deg,#d9d4c7,#b9b2a2);border-radius:4px;display:grid;place-items:center;color:#555;font-size:12px">${x}</div>`).join('')}</div>`;
  const titles = { BR: ['商業登記證', 'BUSINESS REGISTRATION CERTIFICATE'], CR: ['公司註冊證明書', 'CERTIFICATE OF INCORPORATION'], NAR1: ['周年申報表', 'ANNUAL RETURN · FORM NAR1'], ID1: ['香港永久性居民身份證', 'HONG KONG PERMANENT IDENTITY CARD'], ID2: ['香港永久性居民身份證', 'HONG KONG PERMANENT IDENTITY CARD'], ADDR: ['地址證明', 'PROOF OF ADDRESS · UTILITY BILL'] }[doc];
  return `<h4>${titles[0]}</h4><div class="sub">${titles[1]}</div>${f.map(([k, v, c]) => `<div class="row"><span>${k}</span><span class="${c < .85 ? 'hl' : ''}">${v}</span></div>`).join('')}<div class="stamp">示例文件<br/>SAMPLE</div>`;
}
function advanceApp(id, to) {
  const a = APPLICATIONS.find((x) => x.id === id);
  if (to === '待合规审核' && window.APP_KYC && APP_KYC[id]) { const I = kycIssues(APP_KYC[id], 'cs'); if (I.length) { S.kfErr = new Set(I.map((x) => x.p)); render(); toast(`开户资料还有 ${I.length} 项未完成，已标红`); const el = document.getElementById('ks-' + I[0].sec); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } S.kfErr = null; } a.status = to; if (to !== '待 CS 补录') a.docs = Math.max(a.docs, 7);
  const msg = { '待合规审核': '已提交合规审核', '待董事验证': '合规通过，已向董事发送实人验证链接', '渠道审核中': '董事已完成验证，已提交 Allinpay（regcus → mer/create → va/apply）', '已开通': '账户已开通，已通知客户和代理；开户费由 Allinpay 扣收', '待 CS 补录': '已进入 CS 补录' }[to];
  toast(msg || '已更新'); render();
}
function supplementReq(id) {
  modal('发补件通知', `<div class="field"><label>需要补交的文件</label>${DOC_TYPES.map(([k, l]) => `<label style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" ${k === 'ID1' || k === 'ADDR' ? 'checked' : ''}/> ${l}</label>`).join('')}</div>
    <div class="field"><label>说明（发给客户和代理）</label><textarea class="input">请补交董事身份证背面，以及 3 个月内的地址证明。</textarea></div>${note('客户和代理会收到电邮，链接直接回到上传页。')}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="closeModal();advanceApp('${id}','待补件')">发送</button>`);
}

// ---------- apply wizard ----------
function wiz() { return (S.wiz ||= { step: 1, company: '', email: '', phone: '', docs: {}, ocr: null, running: false, done: null }); }
function wizSet(k, v) { wiz()[k] = v; }
function wizStep(n) { const w = wiz(); if (n === 2 && !w.company) return toast('请先填写公司名称'); if (n === 3 && Object.keys(w.docs).length < 3) return toast('请至少上传 BR、CR 和董事证件'); w.step = n; render(); }
function wizUpload(k) { wiz().docs[k] = k.toLowerCase() + '_scan.pdf'; render(); }
function wizOCR() { const w = wiz(); w.running = true; render(); setTimeout(() => { w.running = false; w.ocr = ocrFor(w.company || '示例公司有限公司'); render(); }, 1400); }
function wizSubmit(ctx) {
  const w = wiz();
  const src = ctx.public ? (ctx.owner === 'HQ' ? '自营 QR' : agent(ctx.owner).level === 1 ? '一级链接' : '二级链接') : { hq: '全权管理者代客录入', l1: '一级代客申请', l2: '二级代客申请' }[S.portal];
  let owner = null, l2 = null;
  const o = ctx.public ? ctx.owner : ME[S.portal].org;
  if (o !== 'HQ') { const ag = agent(o); if (ag.level === 1) owner = ag.id; else { owner = ag.parent; l2 = ag.id; } }
  const id = 'APP-2610' + String(13 + APPLICATIONS.length).padStart(2, '0') + String(APPLICATIONS.length + 1).padStart(2, '0');
  APPLICATIONS.unshift({ id, company: w.company || '示例公司有限公司', src, owner, l2, status: '待 CS 补录', created: TODAY, docs: Object.keys(w.docs).length, risk: '—' });
  w.done = id; render();
}
function applyWizard(ctx) {
  const w = wiz();
  const ownerName = ctx.owner === 'HQ' ? '平台自营' : agent(ctx.owner).name + (agent(ctx.owner).level === 2 ? '（上级：' + agent(agent(ctx.owner).parent).name + '）' : '');
  if (w.done) return `<div class="card card-pad" style="text-align:center;padding:48px"><div class="badge ok" style="font-size:14px">申请已提交</div><h2 style="margin:16px 0 4px">申请号 <span class="mono">${w.done}</span></h2><p class="muted">已进入平台 CS 补录队列。资料齐全后，董事会收到实人验证链接。</p><div class="btn-row" style="justify-content:center;margin-top:16px">${ctx.public ? '' : `<a class="btn" href="#/${S.portal}/app/${w.done}">查看进度</a>`}<button class="btn primary" onclick="S.wiz=null;render()">再提交一份</button></div></div>`;
  const steps = ['公司与联系人', '上传文件', 'OCR 识别确认', '业务与账户', '确认提交'];
  const st = `<div class="steps">${steps.map((s, i) => `<div class="step ${i + 1 < w.step ? 'done' : i + 1 === w.step ? 'on' : ''}"><span class="dot">${i + 1 < w.step ? '✓' : i + 1}</span>${s}</div>`).join('')}</div>`;
  let body = '';
  if (w.step === 1) body = `<div class="form-grid"><div class="field full"><label>公司名称（中文或英文）</label><input class="input" value="${w.company}" placeholder="例：海韵贸易有限公司" oninput="wizSet('company',this.value)"/></div><div class="field"><label>联系人电邮（用于登录和通知）</label><input class="input" type="email" value="${w.email}" placeholder="finance@company.com" oninput="wizSet('email',this.value)"/></div><div class="field"><label>联系电话</label><input class="input" value="${w.phone}" placeholder="+852" oninput="wizSet('phone',this.value)"/></div><div class="field full"><label>归属（自动带入，不能修改）</label><input class="input" disabled value="${ownerName}"/></div></div>`;
  else if (w.step === 2) body = `${note('支持 PDF / JPG / PNG。上传后系统会自动识别内容。')}<div class="doc-list">${DOC_TYPES.map(([k, l]) => `<div class="doc-item"><div class="fi">${w.docs[k] ? 'PDF' : '—'}</div><div style="min-width:0"><div class="bold small">${l}</div><div class="small muted">${w.docs[k] || '未上传'}</div></div><button class="btn sm" style="margin-left:auto" onclick="wizUpload('${k}')">${w.docs[k] ? '重新上传' : ICON.up + ' 上传'}</button></div>`).join('')}</div><button class="btn ghost" onclick="DOC_TYPES.forEach(([k])=>wiz().docs[k]=k.toLowerCase()+'_scan.pdf');render()">一键上传示例文件</button>`;
  else if (w.step === 3) body = !w.ocr ? `<div class="empty">${w.running ? '<div class="bold">正在识别 ' + Object.keys(w.docs).length + ' 份文件…</div><div class="small muted mt">BR、CR、NAR1、身份证件</div>' : `<button class="btn primary" onclick="wizOCR()">开始 OCR 识别</button><div class="small muted mt">识别结果需要你确认；平台 CS 也会再核对</div>`}</div>`
    : `${note('黄色字段的识别置信度较低，请核对。')}<div class="grid g2">${['BR', 'CR', 'NAR1', 'ID1'].map((k) => `<div class="card card-pad"><div class="bold" style="margin-bottom:6px">${DOC_TYPES.find((d) => d[0] === k)[1]}</div>${w.ocr[k].map(([n, v, c]) => `<div class="ocr-row" style="grid-template-columns:96px 1fr 44px"><label>${n}</label><input class="input ${c < .85 ? 'lowconf' : ''}" value="${v}"/><span class="conf ${c < .85 ? 'lo' : 'hi'}">${Math.round(c * 100)}%</span></div>`).join('')}</div>`).join('')}</div>`;
  else if (w.step === 4) body = `<div class="form-grid"><div class="field"><label>贸易背景</label><select class="select"><option>货物贸易</option><option>服务贸易</option></select></div><div class="field"><label>预估月交易额 (USD)</label><input class="input" placeholder="例：200,000"/></div><div class="field full"><label>申请收款账户</label>${ACCOUNT_PRODUCTS.map((p) => `<label class="doc-item" style="cursor:${p.status === '可申请' ? 'pointer' : 'default'};opacity:${p.status === '可申请' ? 1 : .55}"><input type="checkbox" ${p.status === '可申请' ? 'checked' : 'disabled'}/><div><div class="bold small">${p.bank} · ${p.region}</div><div class="small muted">${p.ccys.join(' / ')} · ${p.bg}</div></div><span style="margin-left:auto">${statusBadge(p.status)}</span></label>`).join('')}</div><div class="field full"><label>资金来源 / 业务说明</label><textarea class="input" placeholder="例：向美国、欧洲买家出口电子零件"></textarea></div></div>`;
  else body = `<dl class="kv"><dt>公司</dt><dd>${w.company || '—'}</dd><dt>联系人电邮</dt><dd>${w.email || '—'}</dd><dt>归属</dt><dd>${ownerName}</dd><dt>文件</dt><dd>${Object.keys(w.docs).length} / 7</dd><dt>OCR</dt><dd>${w.ocr ? '已识别并确认' : '未识别（CS 会处理）'}</dd><dt>申请账户</dt><dd>渣打银行（香港）VA · HKD / USD / CNH / EUR</dd></dl>${note('提交后：平台 CS 核对补录 → 合规审核 → 董事实人验证 → 提交 Allinpay → 账户开通。开户费按归属的费率模板，由 Allinpay 扣收。')}<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" checked/> 我确认所提供资料真实、完整，并同意平台的服务条款和私隐政策</label>`;
  const nav = `<div class="modal-foot" style="justify-content:space-between"><button class="btn" ${w.step === 1 ? 'disabled' : ''} onclick="wiz().step--;render()">上一步</button>${w.step < 5 ? `<button class="btn primary" onclick="wizStep(${w.step + 1})">下一步</button>` : `<button class="btn primary" onclick='wizSubmit(${JSON.stringify(ctx)})'>提交申请</button>`}</div>`;
  return `<div class="card">${st}<div class="card-pad" style="display:grid;gap:16px">${body}</div>${nav}</div>`;
}
PAGES['*:apply'] = () => {
  if (S.portal === 'l2' && !agent(ME.l2.org).proxyApply) return head('代客申请', '') + `<div class="card empty"><div class="bold">代客申请未开启</div><p class="muted">二级代理的代客申请默认关闭，需要一级代理（港汇通）在「二级代理管理」中开启。</p><p class="muted small">你仍然可以用「开户链接 / QR」邀请客户自行申请。</p><a class="btn" href="#/l2/links">去生成开户链接</a></div>`;
  return head(S.portal === 'hq' ? '代客录入' : '代客申请', '和客户自助流程完全一样：导入文件 → OCR → 补充信息 → 提交，之后进入平台 CS 和合规队列', `<button class="btn" onclick="S.wiz=null;render()">清空重填</button>`) + applyWizard({ owner: ME[S.portal].org, public: false });
};
function publicApply() {
  const link = LINKS.find((l) => l.code === S.arg) || LINKS[3];
  const owner = link.org;
  return `<div class="public"><div class="public-top"><img src="./assets/azure-mark.png" alt="Azure 标志" style="width:36px;height:36px"><div><div class="bold">Azure 企业账户申请</div><div class="small muted">${owner === 'HQ' ? '平台直营' : '推荐方：' + agent(owner).name}</div></div><div style="flex:1"></div>${I18N.switcher()}<button class="icon-btn" onclick="toggleTheme()" aria-label="切换明暗">${S.theme === 'dark' ? ICON.sun : ICON.moon}</button><a class="btn sm" href="#/hq/links">返回原型</a></div>
    <div class="public-body"><h1 class="page-title">开立香港多币种收款账户</h1><p class="page-desc" style="margin-bottom:24px">约 10 分钟完成。准备好商业登记证、公司注册证书、周年申报表和董事身份证件。</p>${applyWizard({ owner, public: true })}
    <p class="small muted" style="text-align:center;margin-top:16px">链接 <span class="mono">${link.code}</span> · 资料加密传输 · 数据不存放在中国内地</p></div></div>`;
}

// ---------- settings (all portals) ----------
PAGES['*:settings'] = () => {
  const P = S.portal, org = ME[P].org; const t = S.ui.st || 'me';
  const users = USERS[org] || [];
  const roles = P === 'cust' ? ['管理员', '操作员', '复核员', '只读'] : ['管理员', '操作员', '复核员', '只读', '财务'];
  let body = '';
  if (t === 'me') body = `<div class="card-pad grid g2"><div class="card card-pad"><div class="bold">修改登录密码</div><div style="display:grid;gap:10px;margin-top:12px"><div class="field"><label>当前密码</label><input class="input" type="password" value="********"/></div><div class="field"><label>新密码（至少 10 位，含大小写和数字）</label><input class="input" type="password"/></div><div class="field"><label>确认新密码</label><input class="input" type="password"/></div><button class="btn primary" onclick="toast('密码已修改，其他设备需要重新登录')">保存</button></div></div>
    <div class="card card-pad"><div class="bold">登录安全</div><dl class="kv mt"><dt>登录电邮</dt><dd>${ME[P].email}</dd><dt>两步验证</dt><dd><label class="switch"><input type="checkbox" checked onchange="toast(this.checked?'已开启 2FA':'已关闭 2FA')"/><span></span></label> Authenticator</dd>${P === 'cust' ? '<dt>交易密码</dt><dd><button class="btn sm" onclick="toast(\'验证码已发送至电邮\')">重设交易密码</button></dd>' : ''}</dl>
    <div class="bold mt">最近登录</div><table class="mt"><tbody><tr><td>今天 09:12</td><td>Chrome · 香港</td><td class="mono small">203.0.113.24</td></tr><tr><td>昨天 18:40</td><td>Safari iOS · 香港</td><td class="mono small">203.0.113.88</td></tr></tbody></table></div></div>`;
  else if (t === 'users') body = `<div class="toolbar"><span class="muted small">用电邮作为登录账号和主要联系方式</span><div style="flex:1"></div><button class="btn primary sm" onclick="inviteUser()">${ICON.plus} 邀请用户</button></div><div class="tbl-wrap"><table><thead><tr><th>电邮</th><th>名称</th><th>角色</th><th>最近登录</th><th>状态</th><th></th></tr></thead><tbody>${users.map((u, i) => `<tr><td class="bold">${esc(u.email)}</td><td>${esc(u.name)}</td><td><select class="select" onchange="toast('角色已更新')">${roles.map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td><td class="muted">${u.last}</td><td>${statusBadge(u.status)}</td><td><button class="link" onclick="toast('已发送重置密码邮件')">重置密码</button> · <button class="link" style="color:var(--danger)" onclick="USERS['${org}'][${i}].status=USERS['${org}'][${i}].status==='停用'?'启用':'停用';render()">${u.status === '停用' ? '启用' : '停用'}</button></td></tr>`).join('')}</tbody></table></div>`;
  else if (t === 'roles') {
    const perms = P === 'cust' ? ['查看余额和交易', '发起付款', '复核付款', '换汇', '管理收款人', '管理用户'] : ['查看客户和交易', '开户申请', '设置客户费率', '管理下级代理', '查看佣金和结算', '管理用户'];
    const mat = { 管理员: [1, 1, 1, 1, 1, 1], 操作员: [1, 1, 0, 1, 1, 0], 复核员: [1, 0, 1, 0, 1, 0], 只读: [1, 0, 0, 0, 0, 0], 财务: [1, 0, 0, 0, 1, 0] };
    body = `<div class="tbl-wrap"><table><thead><tr><th>权限</th>${roles.map((r) => `<th style="text-align:center">${r}</th>`).join('')}</tr></thead><tbody>${perms.map((p, i) => `<tr><td>${p}</td>${roles.map((r) => `<td style="text-align:center"><input type="checkbox" ${mat[r][i] ? 'checked' : ''} ${r === '管理员' ? 'disabled' : ''}/></td>`).join('')}</tr>`).join('')}</tbody></table></div>${P === 'cust' ? `<div class="card-pad">${note('<b>付款复核规则：</b>单笔超过 USD 50,000 或新收款人首次付款，需要复核员批准。')}</div>` : ''}`;
  } else if (t === 'notify') {
    const ev = P === 'cust' ? ['入账到账', '付款完成 / 失败', '换汇成交', '账户开通', '资料到期提醒', '月结单'] : ['新开户申请', '申请需要补件', '账户开通', '费率配置单生效', '佣金结算单', '渠道驳回'];
    body = `<div class="tbl-wrap"><table><thead><tr><th>事件</th><th style="text-align:center">电邮</th><th style="text-align:center">站内信</th><th>收件人</th></tr></thead><tbody>${ev.map((e, i) => `<tr><td>${e}</td><td style="text-align:center"><label class="switch"><input type="checkbox" checked/><span></span></label></td><td style="text-align:center"><label class="switch"><input type="checkbox" ${i % 3 ? 'checked' : ''}/><span></span></label></td><td class="small muted">管理员${i % 2 ? '、财务' : ''}</td></tr>`).join('')}</tbody></table></div>`;
  } else body = `<div class="tbl-wrap"><table><thead><tr><th>时间</th><th>操作人</th><th>操作</th><th>对象（前 → 后）</th><th>IP</th></tr></thead><tbody>${AUDIT.filter((x) => P === 'hq' || x.who.includes('ganghuitong')).map((x) => `<tr><td>${x.t}</td><td>${x.who}</td><td class="bold">${x.what}</td><td>${x.obj}</td><td class="mono small">${x.ip}</td></tr>`).join('')}</tbody></table></div>`;
  const tl = [['me', '个人设置'], ['users', '用户管理'], ['roles', '角色权限'], ['notify', '通知设置'], ...(P === 'hq' || P === 'l1' ? [['audit', '审计日志']] : [])];
  return head(P === 'cust' ? '团队与设置' : '设置', '密码、两步验证、用户（以电邮为主要联系方式）、角色和通知') + `<div class="card">${tabs('st', tl, t)}${body}</div>`;
};
function inviteUser() {
  modal('邀请用户', `<div class="field"><label>电邮（登录账号）</label><input class="input" type="email" placeholder="name@company.com"/></div><div class="field"><label>名称</label><input class="input"/></div><div class="field"><label>角色</label><select class="select"><option>操作员</option><option>复核员</option><option>只读</option><option>财务</option><option>管理员</option></select></div>${note('对方会收到邀请邮件，自行设置密码并绑定两步验证。邀请 72 小时内有效。')}`,
    `<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="closeModal();toast('邀请已发送')">发送邀请</button>`);
}
