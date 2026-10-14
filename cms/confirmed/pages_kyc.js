// ===================== 开户资料（KYC）：先扫描，再补充 =====================
// 字段与 Allinpay 进件页面对齐，并按我方要求增加：登记地址、预计年收入、上下游、主要收付款国家等
const KYC_COUNTRIES = [['HKG', '中国香港'], ['CHN', '中国内地'], ['MAC', '中国澳门'], ['TWN', '中国台湾'], ['SGP', '新加坡'], ['MYS', '马来西亚'], ['THA', '泰国'], ['VNM', '越南'], ['IDN', '印度尼西亚'], ['PHL', '菲律宾'], ['IND', '印度'], ['JPN', '日本'], ['KOR', '韩国'], ['AUS', '澳大利亚'], ['USA', '美国'], ['CAN', '加拿大'], ['MEX', '墨西哥'], ['BRA', '巴西'], ['GBR', '英国'], ['DEU', '德国'], ['FRA', '法国'], ['NLD', '荷兰'], ['ITA', '意大利'], ['ESP', '西班牙'], ['ARE', '阿联酋'], ['SAU', '沙特阿拉伯'], ['TUR', '土耳其'], ['ZAF', '南非']];
const KYC_CCYS = ['HKD', 'USD', 'CNH', 'CNY', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD'];
const KYC_PROV = { HKG: ['香港岛', '九龙', '新界'], CHN: ['广东省', '上海市', '北京市', '浙江省', '江苏省', '福建省', '其他'], MAC: ['澳门半岛', '氹仔', '路环'], SGP: ['Central', 'East', 'North', 'West'], USA: ['California', 'New York', 'Texas', '其他'], GBR: ['England', 'Scotland', 'Wales'] };
const KYC_MCC = { '5065': '电子零件及设备批发', '5045': '电脑及周边设备批发', '5099': '耐用品批发（其他）', '5137': '服装及配饰批发', '5139': '鞋类批发', '5122': '药品及保健品批发', '4214': '货运及物流', '4722': '旅行社', '7372': '软件及资讯科技服务', '7311': '广告服务', '8999': '专业服务（其他）', '5999': '零售（其他）', '5814': '快餐店' };
const KYC_IDTYPES = ['香港身份证', '护照', '港澳居民来往内地通行证', '台湾居民来往大陆通行证', '内地居民身份证', '居住证', '其他'];
const KYC_EXTRA = [
  ['CONTRACT', '与主要客户 / 供应商的合同或发票', '已填写上下游时建议上传，每个对手至少 1 份'],
  ['BANKSTMT', '近 3 个月银行月结单', '用于核对年收入和资金往来'],
  ['AUDIT', '最近一年审计报告或管理账', '选填；有助加快审核'],
  ['GROUP', '集团 / 股权架构图', '客户类型为集团时必须上传'],
  ['BIZADDR', '营业地址证明', '营业地址与登记地址不同时必须上传'],
  ['SIGID', '授权签名人证件及董事会授权书', '授权签名人不是董事时必须上传'],
];

const kGet = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
function kSetPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((x, k) => x[k], o); t[last] = v; }
function kset(p, v) { kSetPath(S.kf, p, v); if (S.kf._ocr && S.kf._ocr[p]) S.kf._ocr[p] = 'edited'; }
function kScroller() { return document.querySelector('.public') || document.querySelector('#main') || document.scrollingElement; }
function kRender(fk) {
  const ae = document.activeElement, key = fk || (ae && ae.dataset && ae.dataset.k);
  const q = (k) => k && document.querySelector(`[data-k="${CSS.escape(k)}"]`);
  const el0 = q(key), top0 = el0 ? el0.getBoundingClientRect().top : null;
  const sc0 = kScroller(), pos = sc0 ? sc0.scrollTop : 0;
  S._samePage = true; render();
  const sc = kScroller(); if (sc) sc.scrollTop = pos;
  const el = q(key);
  if (el) {
    if (top0 !== null && sc) sc.scrollTop += el.getBoundingClientRect().top - top0;
    else el.scrollIntoView({ block: 'center' });
    try { el.focus({ preventScroll: true }); } catch (e) {}
  }
}
function kre(p, v) { kset(p, v); kRender(); }
function kadd(p, tpl) { const a = kGet(S.kf, p); a.push(JSON.parse(tpl.replace(/&quot;/g, '"'))); kRender(`${p}.${a.length - 1}.name`); }
function kdel(p, i) { kGet(S.kf, p).splice(i, 1); kRender('add:' + p); }
function ktog(p, v) { const a = kGet(S.kf, p); const i = a.indexOf(v); i >= 0 ? a.splice(i, 1) : a.push(v); kRender(p + ':' + v); }

const blankPerson = () => ({ name: '', first: '', last: '', idType: '', idNo: '', idExp: '', dob: '', nat: 'HKG' });
function kycBlank(company) {
  return {
    legal: '法人团体', ctype: '普通', group: '', parent: '', inspect: '',
    cn: /[\u4e00-\u9fa5]/.test(company || '') ? company : '', cnShort: '', en: /[\u4e00-\u9fa5]/.test(company || '') ? '' : company || '', enShort: '',
    certType: '商业登记证 BR', certNo: '', certName: '', certExp: '', crNo: '', nar1Exp: '', incDate: '',
    cap: '', years: '', staff: '',
    dirs: [blankPerson()], sigSame: true, sigDir: 0, sigs: [blankPerson()], ubos: [],
    reg: { country: 'HKG', prov: '', cn: '', en: '' }, bizSame: true, biz: { country: 'HKG', prov: '', cn: '', en: '' },
    mcc: '', web: '', risk: '中风险', nature: '货物贸易', funds: '',
    avgTx: '', maxTx: '', monthly: '', monthlyCnt: '', annual: '',
    buyers: [{ name: '', country: '', ccy: '', pct: '' }], sellers: [{ name: '', country: '', ccy: '', pct: '' }],
    recvC: [], payC: [], recvCcy: [], payCcy: [],
    contact: '', phone: '+852 ', email: '', emailOK: false, title: '',
    extra: {}, custom: [], _ocr: {},
  };
}
function kycPrefill(company, contact = {}) {
  const k = kycBlank(company), o = ocrFor(company || '示例公司有限公司');
  const g = (d, n) => { const r = o[d].find((x) => x[0] === n); return r ? r : ['', '', 1]; };
  const set = (p, r) => { kSetPath(k, p, r[1]); k._ocr[p] = r[2]; };
  set('cn', g('CR', '中文名称')); set('en', g('BR', '英文名称')); set('certNo', ['', g('BR', 'BR 号码')[1] + '-000-03-26-7', .97]);
  set('certExp', g('BR', '到期日期')); set('crNo', g('CR', 'CR 号码')); set('incDate', g('CR', '注册日期')); set('nar1Exp', ['', '2027-03-18', .84]);
  set('reg.cn', ['', '九龙观塘道 388 号 18 楼 1802 室', .82]); set('reg.en', ['', 'Flat 1802, 18/F, 388 Kwun Tong Road, Kowloon', .8]); set('reg.prov', ['', '九龙', .9]);
  k.cnShort = (k.cn || '').replace(/有限公司|股份/g, '').slice(0, 6); k.enShort = (k.en || '').replace(/ Limited| Ltd\.?/i, '');
  k.dirs = [
    { name: '王志明', first: 'Chi Ming', last: 'WONG', idType: '香港身份证', idNo: 'A123***(4)', idExp: '', dob: '1982-05-14', nat: 'HKG' },
    { name: '李美华', first: 'Mei Wah', last: 'LI', idType: '香港身份证', idNo: 'Y654***(1)', idExp: '', dob: '1986-11-30', nat: 'HKG' },
  ];
  ['name', 'first', 'last', 'idType', 'idNo', 'dob'].forEach((f) => { k._ocr['dirs.0.' + f] = .96; k._ocr['dirs.1.' + f] = f === 'name' ? .78 : .93; });
  k.ubos = [{ ...k.dirs[0], pct: '60', same: '0' }, { ...k.dirs[1], pct: '40', same: '1' }]; k._ocr['ubos.0.pct'] = .84; k._ocr['ubos.1.pct'] = .84;
  k.sigs = [{ ...k.dirs[0] }];
  k.years = '5 年以上'; k._ocr.years = .9;
  Object.assign(k, contact);
  return k;
}
window.APP_KYC = {};
function kycOf(a) {
  if (!APP_KYC[a.id]) {
    const k = kycPrefill(a.company, { contact: 'Ivy Chan', phone: '+852 9123 4567', email: 'finance@' + (a.id.toLowerCase()) + '.example', emailOK: true });
    if (a.id === APPLICATIONS[0].id || a.status !== '待补件') Object.assign(k, { mcc: '5065', cap: '10–20 万', staff: '10–20 人', avgTx: '12000.00', maxTx: '80000.00', monthly: '350000.00', monthlyCnt: '30', annual: 'HKD 1,000–5,000 万', funds: '海外买家货款', recvC: ['USA', 'DEU', 'SGP'], payC: ['CHN'], recvCcy: ['USD', 'EUR'], payCcy: ['CNH', 'HKD'], extra: { BANKSTMT: 'bankstmt_2026q3.pdf', AUDIT: 'audit_2025.pdf' }, buyers: [{ name: 'Northwind Components Inc.', country: 'USA', ccy: 'USD', pct: '45' }, { name: 'Bauer Elektronik GmbH', country: 'DEU', ccy: 'EUR', pct: '25' }], sellers: [{ name: '深圳市华强电子有限公司', country: 'CHN', ccy: 'CNH', pct: '70' }, { name: '', country: '', ccy: '', pct: '' }] });
    APP_KYC[a.id] = k;
  }
  return APP_KYC[a.id];
}

// ---------- validation ----------
const ANNUAL = ['HKD 100 万以下', 'HKD 100–500 万', 'HKD 500–1,000 万', 'HKD 1,000–5,000 万', 'HKD 5,000 万以上'];
function daysTo(d) { return d ? Math.round((new Date(d) - new Date(TODAY)) / 864e5) : null; }
function kycNeedExtra(k) {
  const need = [];
  if ([...k.buyers, ...k.sellers].some((r) => r.name)) need.push(['CONTRACT', false]);
  need.push(['BANKSTMT', false]);
  need.push(['AUDIT', false]);
  if (k.ctype === '集团') need.push(['GROUP', true]);
  if (!k.bizSame) need.push(['BIZADDR', true]);
  if (!k.sigSame) need.push(['SIGID', true]);
  return need;
}
function kycIssues(k, mode) {
  const L = []; const req = (p, label, sec) => { const v = kGet(k, p); if (v === '' || v == null || (Array.isArray(v) && !v.length)) L.push({ p, label, sec }); };
  req('legal', '法律地位', 'legal'); req('ctype', '客户类型', 'legal'); if (k.ctype === '集团') req('group', '所属集团', 'legal');
  if (!k.cn && !k.en) { L.push({ p: 'cn', label: '中文名称或英文名称（二选一）', sec: 'name' }); }
  req('certType', '注册证书类型', 'cert'); req('certNo', '注册证书号码', 'cert'); req('certExp', '注册证书有效期', 'cert');
  if (k.legal === '法人团体') { req('crNo', 'CR 注册登记号', 'cert'); req('nar1Exp', 'NAR1 有效期', 'cert'); }
  const dt = daysTo(k.certExp); if (dt !== null && dt < 30) L.push({ p: 'certExp', label: 'BR 有效期不足 30 天（不能提交，可存草稿）', sec: 'cert', hard: true });
  req('cap', '注册资本', 'scale'); req('years', '经营年限', 'scale'); req('staff', '员工人数', 'scale');
  if (!k.dirs.length) L.push({ p: 'dirs', label: '至少 1 位董事', sec: 'dirs' });
  k.dirs.forEach((d, i) => ['name', 'first', 'last', 'idType', 'idNo'].forEach((f) => req(`dirs.${i}.${f}`, `董事 ${i + 1} ${{ name: '姓名', first: '英文名', last: '英文姓', idType: '证件类型', idNo: '证件号码' }[f]}`, 'dirs')));
  if (!k.sigSame) k.sigs.forEach((d, i) => ['name', 'first', 'last', 'idType', 'idNo', 'dob'].forEach((f) => req(`sigs.${i}.${f}`, `签名人 ${i + 1} ${{ name: '姓名', first: '英文名', last: '英文姓', idType: '证件类型', idNo: '证件号码', dob: '出生日期' }[f]}`, 'sigs')));
  k.ubos.forEach((d, i) => { req(`ubos.${i}.name`, `股东 ${i + 1} 姓名`, 'ubos'); req(`ubos.${i}.pct`, `股东 ${i + 1} 持股比例`, 'ubos'); });
  ['country', 'prov'].forEach((f) => req('reg.' + f, '登记地址 ' + { country: '国家/地区', prov: '省/区' }[f], 'addr')); if (!k.reg.cn && !k.reg.en) L.push({ p: 'reg.cn', label: '登记地址（中文或英文二选一）', sec: 'addr' });
  if (!k.bizSame) { ['country', 'prov'].forEach((f) => req('biz.' + f, '营业地址 ' + { country: '国家/地区', prov: '省/区' }[f], 'addr')); if (!k.biz.cn && !k.biz.en) L.push({ p: 'biz.cn', label: '营业地址（中文或英文二选一）', sec: 'addr' }); }
  req('mcc', 'MCC 行业代码', 'biz'); req('nature', '业务性质', 'biz'); if (mode === 'cs') req('risk', '风控级别', 'biz');
  
  if (+k.maxTx && +k.avgTx && +k.maxTx < +k.avgTx) L.push({ p: 'maxTx', label: '最高单笔不能小于平均单笔', sec: 'vol', hard: true });
  const cpOK = (rows) => rows.some((r) => r.name && r.country && r.ccy);
  if (!cpOK(k.buyers)) L.push({ p: 'buyers', label: '至少 1 个主要客户（名称、国家、货币）', sec: 'cp' });
  if (!cpOK(k.sellers)) L.push({ p: 'sellers', label: '至少 1 个主要供应商（名称、国家、货币）', sec: 'cp' });
  req('recvC', '主要收款国家', 'flow'); req('payC', '主要付款国家', 'flow'); req('recvCcy', '收款币种', 'flow'); req('payCcy', '付款币种', 'flow');
  kycNeedExtra(k).filter(([, must]) => must).forEach(([key]) => { if (!k.extra[key]) L.push({ p: 'extra.' + key, label: '补充文件：' + KYC_EXTRA.find((x) => x[0] === key)[1], sec: 'docs' }); });
  return L;
}

// ---------- field renderers ----------
function kOcrTag(p) { const c = S.kf._ocr[p]; if (!c) return ''; if (c === 'edited') return '<span class="ocr-tag ed">已修改</span>'; return `<span class="ocr-tag ${c < .85 ? 'lo' : ''}">OCR ${Math.round(c * 100)}%</span>`; }
function kBad(p) { return S.kfErr && S.kfErr.has(p) ? 'bad' : ''; }
function kf(label, en, p, o = {}) {
  const v = kGet(S.kf, p) ?? '', low = typeof S.kf._ocr[p] === 'number' && S.kf._ocr[p] < .85;
  const cls = `input ${kBad(p)} ${low ? 'lowconf' : ''}`;
  let ctl;
  if (o.options) ctl = `<select data-k="${p}" class="select ${kBad(p)}" ${o.dis ? 'disabled' : ''} onchange="${o.re ? 'kre' : 'kset'}('${p}',this.value)"><option value="">请选择</option>${o.options.map((x) => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `<option value="${val}" ${String(v) === String(val) ? 'selected' : ''}>${lab}</option>`; }).join('')}</select>`;
  else if (o.area) ctl = `<textarea data-k="${p}" class="${cls}" oninput="kset('${p}',this.value)" placeholder="${o.ph || ''}">${esc(v)}</textarea>`;
  else ctl = `<input data-k="${p}" class="${cls}" type="${o.type || 'text'}" ${o.dis ? 'disabled' : ''} value="${esc(String(v))}" placeholder="${o.ph || ''}" ${o.max ? `maxlength="${o.max}"` : ''} ${o.re ? `onchange="kre('${p}',this.value)"` : ''} oninput="kset('${p}',this.value)">`;
  return `<div class="field ${o.full ? 'full' : ''} ${o.span2 ? 'span2' : ''}"><label>${label}${o.req ? ' <b class="req">*</b>' : ''} <span class="en">${en}</span>${kOcrTag(p)}</label>${ctl}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>`;
}
function kSec(id, title, sub, inner, issues, extraHead = '') {
  const n = issues.filter((x) => x.sec === id).length;
  return `<section class="kyc-sec" id="ks-${id}"><div class="kyc-h"><div><h3>${title}</h3><p>${sub}</p></div><div class="btn-row">${extraHead}${n ? `<span class="badge warn">${n} 项待填</span>` : '<span class="badge ok">已完成</span>'}</div></div><div class="kgrid">${inner}</div></section>`;
}
function kPerson(base, i, d, title, o = {}) {
  const P = `${base}.${i}`;
  return `<div class="person full"><div class="person-h"><b>${title} ${i + 1}</b>${o.extraHead || ''}${o.canDel ? `<button class="btn sm danger" onclick="kdel('${base}',${i})">移除此人</button>` : ''}</div><div class="kgrid">
    ${kf('姓名', 'Full Name', P + '.name', { req: true, ph: '请输入姓名' })}${kf('英文名', 'First Name', P + '.first', { req: true, ph: '请输入英文名' })}${kf('英文姓', 'Last Name', P + '.last', { req: true, ph: '请输入英文姓' })}
    ${kf('证件类型', 'ID Type', P + '.idType', { req: true, options: KYC_IDTYPES })}${kf('证件号码', 'ID Number', P + '.idNo', { req: true, ph: '请输入证件号码' })}${kf('证件有效期', 'ID Expiry Date', P + '.idExp', { type: 'date' })}
    ${kf('出生日期', 'Date of Birth', P + '.dob', { type: 'date', req: !!o.dobReq })}${kf('国籍', 'Nationality', P + '.nat', { options: KYC_COUNTRIES })}${o.pct ? kf('持股比例 %', 'Shareholding', P + '.pct', { req: true, type: 'number', ph: '≥ 25' }) : ''}
  </div></div>`;
}
function kCpRows(p, title) {
  const rows = kGet(S.kf, p);
  return `<div class="full"><div class="person-h"><b>${title}</b><button data-k="add:${p}" class="btn sm" onclick="kadd('${p}','{&quot;name&quot;:&quot;&quot;,&quot;country&quot;:&quot;&quot;,&quot;ccy&quot;:&quot;&quot;,&quot;pct&quot;:&quot;&quot;}')">${ICON.plus} 新增一行</button></div>
    <div class="cp-tbl ${kBad(p)}"><div class="cp-row cp-head"><span>名称（与合同 / 发票一致）</span><span>国家 / 地区</span><span>货币</span><span>占比 %</span><span></span></div>
    ${rows.map((r, i) => `<div class="cp-row"><input data-k="${p}.${i}.name" class="input" value="${esc(r.name)}" placeholder="${p === 'buyers' ? '例：Northwind Components Inc.' : '例：深圳市华强电子有限公司'}" oninput="kset('${p}.${i}.name',this.value)"><select data-k="${p}.${i}.country" class="select" onchange="kset('${p}.${i}.country',this.value)"><option value="">请选择</option>${KYC_COUNTRIES.map(([c, n]) => `<option value="${c}" ${r.country === c ? 'selected' : ''}>${n}</option>`).join('')}</select><select class="select" onchange="kset('${p}.${i}.ccy',this.value)"><option value="">币种</option>${KYC_CCYS.map((c) => `<option ${r.ccy === c ? 'selected' : ''}>${c}</option>`).join('')}</select><input class="input" type="number" value="${esc(r.pct)}" placeholder="0" oninput="kset('${p}.${i}.pct',this.value)"><button class="icon-btn" aria-label="删除" onclick="kdel('${p}',${i})" ${rows.length < 2 ? 'disabled' : ''}>×</button></div>`).join('')}</div></div>`;
}
function kChips(p, list, label, en, hint) {
  const a = kGet(S.kf, p);
  return `<div class="field full"><label>${label} <b class="req">*</b> <span class="en">${en}</span></label><div class="chip-row wrap ${kBad(p)}">${list.map((x) => { const [v, n] = Array.isArray(x) ? x : [x, x]; return `<button type="button" data-k="${p}:${v}" class="chip ${a.includes(v) ? 'on' : ''}" onclick="ktog('${p}','${v}')">${n}</button>`; }).join('')}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
}
function kAddr(p, title, en) {
  const c = kGet(S.kf, p + '.country');
  return `${kf(title.replace('地址', '') + '国家 / 地区', 'Country / Region', p + '.country', { req: true, options: KYC_COUNTRIES, re: true, hint: '中国内地地址需要选到省 / 市' })}${kf('省 / 区', 'Province / District', p + '.prov', { req: true, options: KYC_PROV[c] || ['—'] })}<div></div>
    ${kf(title + '（中文）', 'Chinese ' + en, p + '.cn', { ph: '不含国家/省/市，上限 200 字', max: 200, hint: '中文或英文二选一填写' })}${kf(title + '（英文）', 'English ' + en, p + '.en', { ph: 'Flat / Floor / Building / Street', max: 200, hint: '中文或英文二选一填写' })}<div></div>`;
}

// ---------- the form ----------
function kycForm(k, mode) {
  S.kf = k; const I = kycIssues(k, mode);
  const secs = [['legal', '法律主体'], ['name', '商户名称'], ['cert', '注册证书'], ['scale', '规模与年限'], ['dirs', '董事'], ['sigs', '授权签名人'], ['ubos', '控股股东'], ['addr', '登记与营业地址'], ['biz', '行业与经营'], ['vol', '交易规模与收入'], ['cp', '上下游'], ['flow', '收付款国家'], ['docs', '补充文件']];
  const nav = `<div class="kyc-nav">${secs.map(([id, n]) => { const c = I.filter((x) => x.sec === id).length; return `<a href="javascript:void 0" onclick="document.getElementById('ks-${id}').scrollIntoView({behavior:'smooth',block:'start'})" class="${c ? 'todo' : 'ok'}">${n}${c ? ` <b>${c}</b>` : ''}</a>`; }).join('')}</div>`;
  const ocrN = Object.values(k._ocr).filter((x) => typeof x === 'number').length;
  const top = `<div class="kyc-top"><div><div class="bold">必填完成度 ${Math.max(0, 100 - Math.round((I.length / 60) * 100))}%</div><div class="small muted">${ocrN ? `已从扫描文件自动填入 ${ocrN} 个字段（标有 OCR），黄色为低置信度，请核对。` : '没有扫描结果，请手动填写。'}${I.length ? ` 还有 ${I.length} 项待处理。` : ' 全部必填项已完成。'}</div></div><div class="progress" style="width:160px"><span style="width:${Math.max(4, 100 - Math.round((I.length / 60) * 100))}%"></span></div></div>`;
  const dirOpts = k.dirs.map((d, i) => [String(i), `董事 ${i + 1} · ${d.name || '未填姓名'}`]);
  const body = [
    kSec('legal', '法律主体', '法律地位会影响需要填写的资料', `${kf('法律地位', 'Legal Status', 'legal', { req: true, options: ['个人', '合伙', '法人团体', '非法人团体'], re: true, hint: '个人 / 合伙 / 法人团体 / 非法人团体' })}${kf('客户类型', 'Customer Type', 'ctype', { req: true, options: [['普通', '普通 GENERAL'], ['集团', '集团 GROUP']], re: true })}${kf('所属集团', 'Group', 'group', { req: k.ctype === '集团', ph: '请输入所属集团', hint: '集团客户必填' })}${kf('上级商户', 'Parent Merchant', 'parent', { ph: '选填', hint: '选填；集团下属公司可填写上级商户' })}${mode === 'cs' ? kf('考察日期', 'Inspection Date', 'inspect', { type: 'date', hint: 'CS 填写；实际考察日期' }) : ''}`, I),
    kSec('name', '商户名称', '中文名称或英文名称至少填一项；简称为选填', `${kf('中文名称', 'Chinese Name', 'cn', { max: 50, hint: '与英文名称二选一填写；上限 100 bytes', span2: true })}${kf('中文简称', 'Chinese Short Name', 'cnShort', { max: 50, hint: '选填' })}${kf('英文名称', 'English Name', 'en', { hint: '与中文名称二选一填写；填写时须与 BR 一致', span2: true })}${kf('英文简称', 'English Short Name', 'enShort', { hint: '选填' })}`, I),
    kSec('cert', '注册证书', 'BR 有效期不足 30 天时不能提交，但可以存草稿', `${kf('注册证书类型', 'Certificate Type', 'certType', { req: true, options: ['商业登记证 BR', '事业单位法人证书', '身份证', '其他'] })}${kf('注册证书号码', 'Certificate Number', 'certNo', { req: true, ph: '12345678-000-03-26-7', hint: '香港 BR 须填完整号码（含后三段）' })}${kf('注册证书有效期', 'Certificate Expiry Date', 'certExp', { req: true, type: 'date', re: true, hint: daysTo(k.certExp) !== null ? `距今 ${daysTo(k.certExp)} 天${daysTo(k.certExp) < 30 ? '，不足 30 天' : ''}` : '有效期须至少剩下 30 天' })}${kf('CR 注册登记号', 'CR Number', 'crNo', { req: k.legal === '法人团体', hint: '法人团体必填' })}${kf('NAR1 有效期', 'NAR1 Expiry Date', 'nar1Exp', { req: k.legal === '法人团体', type: 'date', hint: '法人团体必填；按周年申报日期' })}${kf('成立日期', 'Incorporation Date', 'incDate', { type: 'date', hint: '从 CR 识别' })}`, I),
    kSec('scale', '规模与经营年限', '用于风控评估企业规模', `${kf('注册资本', 'Registered Capital', 'cap', { req: true, options: ['少于 10 万', '10–20 万', '20–50 万', '50–100 万', '100 万以上'] })}${kf('经营年限', 'Years in Business', 'years', { req: true, options: ['少于 1 年', '1–3 年', '3–5 年', '5 年以上'] })}${kf('员工人数', 'Number of Employees', 'staff', { req: true, options: ['少于 10 人', '10–20 人', '20–50 人', '50–100 人', '100 人以上'] })}`, I),
    kSec('dirs', '董事', '必填，可以多位；从 NAR1 和身份证件自动识别', k.dirs.map((d, i) => kPerson('dirs', i, d, '董事', { canDel: k.dirs.length > 1 })).join('') + `<div class="full"><button data-k="add:dirs" class="btn sm" onclick="kadd('dirs','${JSON.stringify(blankPerson()).replace(/"/g, '&quot;')}')">${ICON.plus} 新增一位</button> <span class="small muted">制裁 / PEP 筛查在提交后自动执行</span></div>`, I),
    kSec('sigs', '授权签名人', '可以直接选用已登记的董事；不是董事时须另外上传证件和授权书', `<div class="full"><label class="pick" style="padding:0"><input data-k="sigSame" type="checkbox" ${k.sigSame ? 'checked' : ''} onchange="kre('sigSame',this.checked)"> 与董事相同</label>${k.sigSame ? `<div class="field" style="max-width:320px;margin-top:8px"><select data-k="sigDir" class="select" onchange="kre('sigDir',this.value)">${dirOpts.map(([v, n]) => `<option value="${v}" ${String(k.sigDir) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : ''}</div>${k.sigSame ? `<div class="full small muted">已选用 ${k.dirs[k.sigDir]?.name || '—'} 的资料和证件。</div>` : k.sigs.map((d, i) => kPerson('sigs', i, d, '授权签名人', { dobReq: true, canDel: k.sigs.length > 1 })).join('') + `<div class="full"><button data-k="add:sigs" class="btn sm" onclick="kadd('sigs','${JSON.stringify(blankPerson()).replace(/"/g, '&quot;')}')">${ICON.plus} 新增一位</button></div>`}`, I),
    kSec('ubos', '控股股东', '持股 ≥ 25% 的股东须登记；与董事相同时可直接选用', k.ubos.map((d, i) => kPerson('ubos', i, d, '股东', { pct: true, canDel: true, extraHead: `<select class="select sm" style="max-width:200px;margin-left:auto" onchange="if(this.value!==''){Object.assign(S.kf.ubos[${i}],{...S.kf.dirs[this.value],pct:S.kf.ubos[${i}].pct});kRender('ubos.${i}.name')}"><option value="">与董事相同…</option>${dirOpts.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>` })).join('') + `<div class="full"><button data-k="add:ubos" class="btn sm" onclick="kadd('ubos','${JSON.stringify({ ...blankPerson(), pct: '' }).replace(/"/g, '&quot;')}')">${ICON.plus} 新增一位</button> <span class="small muted">股东合计 ${k.ubos.reduce((s, u) => s + (+u.pct || 0), 0)}%</span></div>`, I),
    kSec('addr', '登记地址与营业地址', '国家 / 地区、省、市分开储存；登记地址以 CR / NAR1 为准', `<div class="full sub-h">登记地址 Registered Address</div>${kAddr('reg', '登记地址', 'Registered Address')}<div class="full sub-h" style="display:flex;gap:16px;align-items:center">营业地址 Business Address <label class="pick" style="padding:0;font-weight:400"><input data-k="bizSame" type="checkbox" ${k.bizSame ? 'checked' : ''} onchange="kre('bizSame',this.checked)"> 与登记地址相同</label></div>${k.bizSame ? '<div class="full small muted">营业地址与登记地址相同。</div>' : kAddr('biz', '营业地址', 'Business Address') + `<div class="full">${note('营业地址与登记地址不同：请在“补充文件”上传营业地址证明（租约或 3 个月内账单）。', 'warn')}</div>`}`, I),
    kSec('biz', '行业与经营概况', 'MCC 对应行业名称；风控级别会影响文件清单', `${kf('MCC 行业代码', 'Merchant Category Code', 'mcc', { req: true, options: Object.entries(KYC_MCC).map(([c, n]) => [c, `${c} · ${n}`]), re: true, hint: '4 位数字' })}${kf('行业名称', 'Industry Name', 'mccName', { dis: true, ph: KYC_MCC[k.mcc] || '按 MCC 自动带出', hint: '只读；不在清单内将转人工核定' })}${mode === 'cs' ? kf('风控级别', 'Risk Level', 'risk', { req: true, options: ['低风险', '中风险', '高风险'], hint: '系统建议，可人工调整（客户看不到）' }) : '<div></div>'}${kf('业务性质', 'Business Nature', 'nature', { req: true, options: ['货物贸易', '服务贸易', '跨境电商', '物流及货代', '软件及资讯服务', '其他'] })}${kf('商户网站', 'Business Website', 'web', { ph: 'https://', hint: '有网站或网店时填写；上限 100 字' })}${kf('资金来源', 'Source of Funds', 'funds', { ph: '例：海外买家货款' })}${kf('业务说明', 'Business Description', 'desc', { area: true, full: true, ph: '例：向美国、欧洲买家出口电子零件，货源来自深圳工厂' })}`, I),
    kSec('vol', '交易规模与预计年收入', '本段全部选填；金额保留 2 位小数', `${kf('平均单笔金额 (HKD)', 'Average Transaction Amount', 'avgTx', { type: 'number', ph: '0.00' })}${kf('最高单笔金额 (HKD)', 'Maximum Transaction Amount', 'maxTx', { type: 'number', ph: '0.00' })}${kf('平均单月销售金额 (HKD)', 'Average Monthly Sales', 'monthly', { type: 'number', ph: '0.00' })}${kf('预计每月交易笔数', 'Monthly Transactions', 'monthlyCnt', { type: 'number', ph: '0' })}${kf('预计年收入', 'Estimated Annual Revenue', 'annual', { options: ANNUAL, re: true, hint: '选填' })}`, I),
    kSec('cp', '上游供应商与下游客户', '填写主要往来对手的名称、国家和货币；之后可直接带入“交易对手”', `${kCpRows('buyers', '下游 · 主要客户（付款给你）')}${kCpRows('sellers', '上游 · 主要供应商（你付款给他）')}`, I),
    kSec('flow', '主要收款及付款国家', '用于判断资金流向和需要开通的币种', `${kChips('recvC', KYC_COUNTRIES, '主要收款国家 / 地区', 'Receiving From', '钱从哪些国家 / 地区汇入')}${kChips('payC', KYC_COUNTRIES, '主要付款国家 / 地区', 'Paying To', '钱付到哪些国家 / 地区')}${kChips('recvCcy', KYC_CCYS, '主要收款币种', 'Receiving Currency')}${kChips('payCcy', KYC_CCYS, '主要付款币种', 'Paying Currency')}`, I),
    kSec('docs', '补充文件', '按你填写的资料自动建议；有需要可以增加上传栏位', kycDocs(k), I),
  ].join('');
  return `${top}${nav}<div class="kyc-body">${body}</div>`;
}
function kycDocs(k) {
  const need = kycNeedExtra(k);
  const row = (key, name, hint, must, file) => `<div class="doc-item ${file ? 'on' : ''} ${!file && must && S.kfErr && S.kfErr.has('extra.' + key) ? 'bad' : ''}"><div class="fi">${file ? 'PDF' : '—'}</div><div style="min-width:0;flex:1"><div class="bold small">${name} ${must ? '<span class="badge warn">必须</span>' : '<span class="badge">建议</span>'}</div><div class="small muted">${file || hint}</div></div><button data-k="up:${key}" class="btn sm" onclick="S.kf.extra['${key}']='${key.toLowerCase()}_${TODAY.replace(/-/g, '')}.pdf';kRender()">${file ? '重新上传' : ICON.up + ' 上传'}</button></div>`;
  return `<div class="full" style="display:grid;gap:8px">${need.map(([key, must]) => { const d = KYC_EXTRA.find((x) => x[0] === key); return row(key, d[1], d[2], must, k.extra[key]); }).join('')}
    ${k.custom.map((c, i) => `<div class="doc-item ${k.extra['C' + i] ? 'on' : ''}"><div class="fi">${k.extra['C' + i] ? 'PDF' : '—'}</div><input data-k="custom.${i}.name" class="input" style="flex:1" value="${esc(c)}" placeholder="文件名称，例：仓库租约" oninput="S.kf.custom[${i}]=this.value"><button data-k="up:C${i}" class="btn sm" onclick="S.kf.extra['C${i}']='custom_${i + 1}.pdf';kRender()">${k.extra['C' + i] ? '重新上传' : ICON.up + ' 上传'}</button><button class="icon-btn" aria-label="删除" onclick="S.kf.custom.splice(${i},1);delete S.kf.extra['C${i}'];kRender('addcustom')">×</button></div>`).join('')}
    <div><button data-k="addcustom" class="btn sm" onclick="S.kf.custom.push('');kRender('custom.'+(S.kf.custom.length-1)+'.name')">${ICON.plus} 增加上传栏位</button> <span class="small muted">例如：仓库租约、进出口许可证、产品目录、平台店铺截图</span></div></div>`;
}

// ---------- apply wizard (override) ----------
function wiz() { return (S.wiz ||= { step: 1, company: '', email: '', phone: '+852 ', contact: '', docs: {}, ocr: null, running: false, done: null, k: null }); }
function wizEnsureK() { const w = wiz(); if (!w.k) w.k = kycBlank(w.company); return w.k; }
function wizOCR() {
  const w = wiz(); w.running = true; render();
  setTimeout(() => { w.running = false; w.ocr = ocrFor(w.company || '示例公司有限公司'); w.k = kycPrefill(w.company || '示例公司有限公司', { contact: w.contact, email: w.email, phone: w.phone || '+852 ' }); render(); }, 1400);
}
function wizStep(n) {
  const w = wiz();
  if (n === 2 && !w.company) return toast('请先填写公司名称');
  if (n === 3 && Object.keys(w.docs).length < 3) return toast('请至少上传 BR、CR 和董事证件');
  if (n === 3) wizEnsureK();
  if (n === 4 && w.step === 3) {
    const I = kycIssues(w.k, 'cust');
    if (I.length) { S.kfErr = new Set(I.map((x) => x.p)); render(); toast(`还有 ${I.length} 项需要处理，已标红`); setTimeout(() => { const el = document.getElementById('ks-' + I[0].sec); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); return; }
    S.kfErr = null;
  }
  w.step = n; render(); window.scrollTo({ top: 0 });
}
function applyWizard(ctx) {
  const w = wiz();
  const ownerName = ctx.owner === 'HQ' ? '平台自营' : agent(ctx.owner).name + (agent(ctx.owner).level === 2 ? '（上级：' + agent(agent(ctx.owner).parent).name + '）' : '');
  if (w.done) return `<div class="card card-pad" style="text-align:center;padding:48px"><div class="badge ok" style="font-size:14px">申请已提交</div><h2 style="margin:16px 0 4px">申请号 <span class="mono">${w.done}</span></h2><p class="muted">已进入平台 CS 补录队列。资料齐全后，董事会收到实人验证链接。</p><div class="btn-row" style="justify-content:center;margin-top:16px">${ctx.public ? '' : `<a class="btn" href="#/${S.portal}/app/${w.done}">查看进度</a>`}<button class="btn primary" onclick="S.wiz=null;render()">再提交一份</button></div></div>`;
  const steps = ['公司与联系人', '上传并扫描', '核对与补充资料', '申请账户', '确认提交'];
  const st = `<div class="steps">${steps.map((s, i) => `<div class="step ${i + 1 < w.step ? 'done' : i + 1 === w.step ? 'on' : ''}"><span class="dot">${i + 1 < w.step ? '✓' : i + 1}</span>${s}</div>`).join('')}</div>`;
  let body = '';
  if (w.step === 1) body = `<div class="form-grid"><div class="field full"><label>公司名称（中文或英文）</label><input class="input" value="${esc(w.company)}" placeholder="例：海韵贸易有限公司" oninput="wizSet('company',this.value)"/></div><div class="field"><label>联系人</label><input class="input" value="${esc(w.contact)}" placeholder="姓名" oninput="wizSet('contact',this.value)"/></div><div class="field"><label>联系人电邮（用于登录和通知）</label><input class="input" type="email" value="${esc(w.email)}" placeholder="finance@company.com" oninput="wizSet('email',this.value)"/></div><div class="field"><label>联系电话</label><input class="input" value="${esc(w.phone)}" placeholder="+852" oninput="wizSet('phone',this.value)"/></div><div class="field"><label>归属（自动带入，不能修改）</label><input class="input" disabled value="${ownerName}"/></div></div>${note('下一步先上传文件并扫描，系统会把识别到的资料自动填进开户表格，你只需要核对和补充。')}`;
  else if (w.step === 2) {
    const n = Object.keys(w.docs).length;
    body = `<div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start"><div><div class="bold" style="margin-bottom:8px">基本文件（会自动扫描）</div><div class="doc-list">${DOC_TYPES.map(([k, l]) => `<div class="doc-item ${w.docs[k] ? 'on' : ''}"><div class="fi">${w.docs[k] ? 'PDF' : '—'}</div><div style="min-width:0"><div class="bold small">${l}</div><div class="small muted">${w.docs[k] || '未上传'}</div></div><button class="btn sm" style="margin-left:auto" onclick="wizUpload('${k}')">${w.docs[k] ? '重新上传' : ICON.up + ' 上传'}</button></div>`).join('')}</div><button class="btn ghost mt" onclick="DOC_TYPES.forEach(([k])=>wiz().docs[k]=k.toLowerCase()+'_scan.pdf');render()">一键上传示例文件</button></div>
      <div class="card card-pad" style="background:var(--color-surface-2)">${!w.ocr ? (w.running ? `<div class="bold">正在扫描 ${n} 份文件…</div><div class="small muted mt">识别 BR、CR、NAR1、身份证件和地址证明</div><div class="progress mt"><span style="width:65%"></span></div>` : `<div class="bold">扫描基本资料</div><p class="small muted">会识别：公司中英文名称、BR / CR 号码和有效期、成立日期、登记地址、董事和股东（姓名、证件号、出生日期、持股比例）。</p><button class="btn primary" ${n < 3 ? 'disabled' : ''} onclick="wizOCR()">开始扫描（${n} 份）</button><div class="small muted mt">${n < 3 ? '至少上传 BR、CR 和董事证件' : '扫描后可以在下一步修改'}</div>`)
      : `<div class="bold">扫描完成</div><p class="small muted">已识别 ${Object.values(w.k._ocr).filter((x) => typeof x === 'number').length} 个字段，下一步会自动填入。黄色为低置信度。</p>${['BR', 'CR', 'NAR1'].map((d) => `<div class="small" style="margin-top:8px"><b>${DOC_TYPES.find((x) => x[0] === d)[1]}</b>${w.ocr[d].slice(0, 4).map(([a, b, c]) => `<div class="ocr-mini"><span>${a}</span><span class="${c < .85 ? 'lo' : ''}">${b}</span></div>`).join('')}</div>`).join('')}<button class="btn sm mt" onclick="wizOCR()">重新扫描</button>`}</div></div>`;
  } else if (w.step === 3) body = kycForm(wizEnsureK(), 'cust');
  else if (w.step === 4) body = `<div class="form-grid"><div class="field full"><label>申请收款账户</label>${ACCOUNT_PRODUCTS.map((p) => `<label class="doc-item" style="cursor:${p.status === '可申请' ? 'pointer' : 'default'};opacity:${p.status === '可申请' ? 1 : .55}"><input type="checkbox" ${p.status === '可申请' ? 'checked' : 'disabled'}/><div><div class="bold small">${p.bank} · ${p.region}</div><div class="small muted">${p.ccys.join(' / ')} · ${p.bg}</div></div><span style="margin-left:auto">${statusBadge(p.status)}</span></label>`).join('')}</div></div>${note(`根据你填写的收款币种（${(w.k.recvCcy || []).join(' / ') || '—'}），建议开通以上账户。`)}`;
  else {
    const k = w.k, cn = (c) => (KYC_COUNTRIES.find((x) => x[0] === c) || [, c])[1];
    body = `<div class="grid g2"><dl class="kv"><dt>公司</dt><dd>${k.cn || '—'}<br><span class="small muted">${k.en || ''}</span></dd><dt>BR</dt><dd class="mono">${k.certNo || '—'}</dd><dt>登记地址</dt><dd>${k.reg.cn || '—'}</dd><dt>营业地址</dt><dd>${k.bizSame ? '同登记地址' : k.biz.cn}</dd><dt>董事</dt><dd>${k.dirs.map((d) => d.name).join('、')}</dd><dt>控股股东</dt><dd>${k.ubos.map((u) => `${u.name} ${u.pct}%`).join('、') || '—'}</dd><dt>归属</dt><dd>${ownerName}</dd></dl>
      <dl class="kv"><dt>行业</dt><dd>${k.mcc} ${KYC_MCC[k.mcc] || ''}</dd><dt>预计年收入</dt><dd>${k.annual}</dd><dt>月销售额</dt><dd>HKD ${(+k.monthly || 0).toLocaleString()}</dd><dt>主要客户</dt><dd>${k.buyers.filter((r) => r.name).map((r) => `${r.name}（${cn(r.country)} · ${r.ccy}）`).join('<br>')}</dd><dt>主要供应商</dt><dd>${k.sellers.filter((r) => r.name).map((r) => `${r.name}（${cn(r.country)} · ${r.ccy}）`).join('<br>')}</dd><dt>收款国家</dt><dd>${k.recvC.map(cn).join('、')}</dd><dt>付款国家</dt><dd>${k.payC.map(cn).join('、')}</dd><dt>文件</dt><dd>${Object.keys(w.docs).length} 份基本文件 + ${Object.keys(k.extra).length} 份补充文件</dd></dl></div>
      ${note('提交后：平台 CS 核对补录 → 合规审核 → 董事实人验证 → 提交 Allinpay → 账户开通。开户费按归属的费率模板，由 Allinpay 扣收。')}<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" checked/> 我确认所提供资料真实、完整，并同意平台的服务条款和私隐政策</label>`;
  }
  const nav = `<div class="modal-foot" style="justify-content:space-between"><button class="btn" ${w.step === 1 ? 'disabled' : ''} onclick="wiz().step--;render()">上一步</button><div class="btn-row">${w.step === 3 ? `<button class="btn" onclick="toast('草稿已保存，可以稍后继续')">存草稿</button>` : ''}${w.step < 5 ? `<button class="btn primary" onclick="wizStep(${w.step + 1})">${w.step === 2 && !w.ocr ? '跳过扫描，手动填写' : '下一步'}</button>` : `<button class="btn primary" onclick='wizSubmit(${JSON.stringify(ctx)})'>提交申请</button>`}</div></div>`;
  return `<div class="card">${st}<div class="card-pad" style="display:grid;gap:16px">${body}</div>${nav}</div>`;
}
const _wizSubmit = wizSubmit;
wizSubmit = function (ctx) { const w = wiz(); _wizSubmit(ctx); if (w.k) APP_KYC[w.done] = w.k; };
