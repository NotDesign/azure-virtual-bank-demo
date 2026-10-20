/* 2026-10-20 client review: local counterparty entry and source-backed FX balances. */
(function () {
  'use strict';
  const RP = window.AzureReviewPayments = {};
  const own = c => c && c._reviewCustomer === CID();
  const text = value => E(value);
  let draft = null;
  let proofFile = null;
  let withdrawDraft = null, withdrawProof = null, batchFiles = null, paymentFiles = null;
  const nativeNew = cpNew, nativeDetail = cpDetail, nativePayDo = payDo, nativeWithdrawNew = newWithdrawAcct, nativeWdDo = wdDo;
  const regionOptions = ['中国香港', '中国', '新加坡', '美国', '日本', '德国', '英国', '卢森堡', '其他'];
  const currencyOptions = Object.keys(FXR);
  const T = (tc, sc, en) => C(tc, sc, en);

  // Source renderers interpolate their records. Escape local records only while rendering,
  // and restore their original values immediately; account numbers remain strings in data.
  function safePage(fn) {
    const saved = [];
    CPS.forEach((c, i) => {
      if (!own(c)) return;
      saved.push([i, c]);
      const safe = {};
      Object.entries(c).forEach(([k, v]) => {
        safe[k] = typeof v === 'string' && !['id', '_reviewCustomer', 'dir', 'type', 'status', 'updated'].includes(k) ? text(v) : v;
      });
      safe.accts = c.accts.map(a => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, typeof v === 'string' ? text(v) : v])));
      CPS[i] = safe;
    });
    const withdrawals=[];
    WITHDRAW_ACCTS.forEach((w,i)=>{if(own(w)){withdrawals.push([i,w]);WITHDRAW_ACCTS[i]=Object.fromEntries(Object.entries(w).map(([k,v])=>[k,typeof v==='string'&&!['id','_reviewCustomer','status','ccy','added'].includes(k)?text(v):v]));}});
    try { return fn(); } finally { saved.forEach(([i, c]) => { CPS[i] = c; });withdrawals.forEach(([i,w])=>{WITHDRAW_ACCTS[i]=w;}); }
  }
  for (const key of ['cust:pay', 'cust:cp', 'cust:accounts']) {
    const source = PAGES[key];
    PAGES[key] = () => safePage(source);
  }

  const sourceFx = PAGES['cust:fx'];
  PAGES['cust:fx'] = function () {
    const html = sourceFx();
    if (!bal()) return html;
    const balances = Object.entries(bal());
    const overview = `<section class="card rp-balances" aria-labelledby="rp-balances-title"><div class="card-head"><div><h3 class="card-title" id="rp-balances-title">${T('戶口結存概況', '户口结存概况', 'Account balance overview')}</h3><p class="small muted">${T('按幣種匯總；對應銀行戶口列於下方，未分配個別戶口餘額。', '按币种汇总；对应银行户口列于下方，未分配个别户口余额。', 'Balances are aggregated by currency. Linked bank accounts are listed below; individual account balances are not supplied.')}</p></div><span class="card-sub">${balances.length} ${T('個幣種', '个币种', 'currencies')}</span></div><div class="rp-balance-grid">${balances.map(([ccy, b]) => {
      const accounts = myAccts().filter(a => a.ccy === ccy);
      return `<article class="rp-balance-card" data-balance-currency="${text(ccy)}"><div class="rp-balance-heading">${flag(ccy)}<strong>${text(ccy)}</strong>${ccy === 'CNY' ? `<span class="tag">${T('跨境', '跨境', 'Cross-border')}</span>` : ''}</div><dl class="rp-balance-values"><dt>${T('可用', '可用', 'Available')}</dt><dd data-balance="available">${nf(b.a)}</dd><dt>${T('凍結', '冻结', 'Frozen')}</dt><dd data-balance="frozen">${nf(b.f)}</dd><dt>${T('總額', '总额', 'Total')}</dt><dd data-balance="total">${nf(b.a + b.f)}</dd></dl><details class="rp-linked-accounts"><summary class="btn sm">${T('查看對應戶口', '查看对应户口', 'View linked accounts')} (${accounts.length})</summary><div>${accounts.length ? accounts.map(a => `<div class="rp-linked-account"><strong>${text(a.nick)}</strong>${statusBadge(a.status)}<small>${text(a.bank)}</small><small class="mono">${text(a.no)}</small></div>`).join('') : `<p class="small muted">${T('暫無已分配銀行戶口。', '暂无已分配银行户口。', 'No allocated bank account.')}</p>`}</div></details></article>`;
    }).join('')}</div></section>`;
    return html.replace('<div class="grid"', overview + '<div class="grid"');
  };

  function options(values, selected) {
    return values.map(v => `<option value="${text(v)}" ${v === selected ? 'selected' : ''}>${text(I18N.tr(v))}</option>`).join('');
  }
  function input(key, label, required = false, extra = '') {
    return `<div class="field"><label for="rp-${key}">${label}${required ? ' <span aria-hidden="true">*</span>' : ''}</label><input class="input" id="rp-${key}" name="${key}" value="${text(draft[key] || '')}" ${required ? 'required' : ''} ${extra}></div>`;
  }
  function select(key, label, values) {
    return `<div class="field"><label for="rp-${key}">${label} <span aria-hidden="true">*</span></label><select class="select" id="rp-${key}" name="${key}" required>${options(values, draft[key])}</select></div>`;
  }
  function collect() {
    const form = document.getElementById('rp-counterparty-form');
    if (!form) return;
    new FormData(form).forEach((v, k) => { if (typeof v === 'string') draft[k] = v.trim(); });
  }
  function capturePayment(){
    if(S.page!=='pay')return;
    document.querySelectorAll('[onchange^="S.pay."]').forEach(el=>{
      const key=/^S\.pay\.(from|cp|ai|amt|purpose|fee|memo)=/.exec(el.getAttribute('onchange')||'')?.[1];
      if(key&&S.pay)S.pay[key]=key==='amt'?Number(el.value.replace(/,/g,''))||0:key==='ai'?Number(el.value):el.value;
    });
    if((S.ui.pt||'pay')==='wd'&&S.wd){
      const picker=document.querySelector('select[onchange^="S.wd.wa"]'),amount=document.querySelector('input[onchange^="S.wd.amt"]'),memo=document.querySelector('[data-rp-withdraw-memo]');
      if(picker)S.wd.wa=picker.value;if(amount)S.wd.amt=Number(amount.value.replace(/,/g,''))||0;if(memo)S.wd.memo=memo.value;
    }
    const upload=document.querySelector('.rp-payment-card input[type=file]');
    if(S.ui.pt==='batch'&&upload)batchFiles=upload.files;
    if((S.ui.pt||'pay')==='pay'&&upload)paymentFiles=upload.files;
  }
  RP.openNew = function (inline = false, dir = '收款方', editId = null) {
    if (S.portal !== 'cust') return;
    if(inline)capturePayment();
    const record = editId ? CPS.find(c => c.id === editId && own(c)) : null;
    proofFile = null;
    draft = record ? { ...record, ...(record.accts[0] || {}), name: record.name, inline, editId, acctName: record.accts[0]?.name || record.name, region: record.accts[0]?.region || record.country, bankAddr: record.accts[0]?.bankAddr || '', idType: record.idType || '护照' } : { inline, dir, type: '企业', country: '中国香港', region: '中国香港', ccy: S.pay?.from || 'USD', nature: '对公', biz: [dir === '收款方' ? '全球付款' : '全球收款'], idType: '护照' };
    RP.renderForm();
  };
  RP.renderForm = function () {
    const corporate = draft.type === '企业';
    const dirLabel = I18N.tr(draft.dir);
    const body = `<form id="rp-counterparty-form" class="rp-counterparty-form"><p class="small muted">${T('帶 * 為提交審核必填。資料僅保留於此瀏覽期間，不會送至銀行；審核通過前不能付款。', '带 * 为提交审核必填。资料仅保留于此浏览期间，不会送至银行；审核通过前不能付款。', 'Fields marked * are required for review. Data stays in this browsing session and is not sent to a bank. Payments remain unavailable until approved.')}</p><div class="seg rp-type-switch">${['企业', '个人'].map(type => `<button type="button" class="${draft.type === type ? 'on' : ''}" onclick="AzureReviewPayments.changeType('${type}')">${I18N.tr(type)}</button>`).join('')}</div><h4>${T('基本資料', '基本资料', 'Basic details')}</h4><div class="form-grid">${select('country', T('國家／地區', '国家／地区', 'Country / region'), regionOptions)}${input('name', corporate ? T('企業名稱（英文）', '企业名称（英文）', 'Company name (English)') : T('姓名（英文／拼音）', '姓名（英文／拼音）', 'Name (English / romanized)'), true, 'maxlength="160"')}${input('cn', T('中文名稱（中國內地企業必填）', '中文名称（中国内地企业必填）', 'Chinese name (required for mainland Chinese companies)'), false, 'maxlength="160"')}${!corporate ? select('idType', T('證件類型', '证件类型', 'ID type'), ['护照', '居民身份证', '香港身份证', '其他']) : ''}${input('regNo', corporate ? T('註冊號／統一社會信用代碼', '注册号／统一社会信用代码', 'Registration number') : T('證件號碼', '证件号码', 'ID number'), true, 'maxlength="80"')}${input('city', T('城市（英文）', '城市（英文）', 'City (English)'), true, 'maxlength="120"')}${input('addr', T('地址', '地址', 'Address'), true, 'maxlength="300"')}${input('phone', T('聯絡電話（選填）', '联系电话（选填）', 'Contact phone (optional)'), false, 'type="tel" maxlength="40"')}<div class="field"><label for="rp-proof">${T('付款協議證明（合同／發票）', '付款协议证明（合同／发票）', 'Payment agreement (contract / invoice)')} *</label><input class="input" id="rp-proof" type="file" accept="application/pdf,image/jpeg,image/png" onchange="AzureReviewPayments.pickProof(this)"><small id="rp-proof-name" class="muted">${text(draft.proof || T('PDF／JPG／PNG，每份最多 30 MB', 'PDF／JPG／PNG，每份最多 30 MB', 'PDF / JPG / PNG, up to 30 MB'))}</small></div></div><h4>${T('銀行戶口資料', '银行户口资料', 'Bank account details')}</h4><div class="form-grid">${select('region', T('戶口所在地', '户口所在地', 'Account country / region'), regionOptions)}${select('ccy', T('幣種', '币种', 'Currency'), currencyOptions)}${input('acctName', T('戶名', '户名', 'Account holder'), true, 'maxlength="160"')}${input('acct', T('銀行帳號／IBAN', '银行账号／IBAN', 'Bank account number / IBAN'), true, 'type="text" maxlength="100" autocomplete="off"')}${input('bank', T('銀行名稱', '银行名称', 'Bank name'), true, 'maxlength="180"')}${input('swift', T('SWIFT／CIPS BIC／聯行號', 'SWIFT／CIPS BIC／联行号', 'SWIFT / CIPS BIC / bank code'), true, 'maxlength="40"')}${select('nature', T('戶口性質', '户口性质', 'Account type'), ['对公', '对私'])}${input('bankAddr', T('開戶行地址（選填）', '开户行地址（选填）', 'Bank address (optional)'), false, 'maxlength="300"')}</div><div id="rp-form-error" class="rp-form-error" role="alert" hidden></div></form>`;
    modal(`${draft.editId ? T('修改', '修改', 'Edit ') : T('新增', '新增', 'New ')}${dirLabel}`, body, `<button class="btn" onclick="closeModal()">${T('取消', '取消', 'Cancel')}</button><button class="btn" onclick="AzureReviewPayments.save(false)">${T('保存草稿', '保存草稿', 'Save draft')}</button><button class="btn primary" onclick="AzureReviewPayments.save(true)">${T('提交審核', '提交审核', 'Submit for review')}</button>`, true);
    document.getElementById('rp-counterparty-form').addEventListener('submit', e => { e.preventDefault(); RP.save(true); });
  };
  RP.changeType = function (type) { collect(); draft.type = type; RP.renderForm(); };
  function error(message, field) {
    const box = document.getElementById('rp-form-error');
    box.hidden = false; box.textContent = message;
    const input = document.getElementById('rp-' + field);
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
  }
  RP.pickProof = function (el) {
    const file = el.files[0]; if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 30 * 1024 * 1024) {
      el.value = ''; return error(T('請選擇最多 30 MB 的 PDF、JPG 或 PNG 文件。', '请选择最多 30 MB 的 PDF、JPG 或 PNG 文件。', 'Choose a PDF, JPG, or PNG file up to 30 MB.'), 'proof');
    }
    proofFile = file; draft.proof = file.name;
    document.getElementById('rp-proof-name').textContent = file.name;
  };
  RP.save = function (submit) {
    if (S.portal !== 'cust' || !draft) return;
    collect();
    const form = document.getElementById('rp-counterparty-form');
    if (!draft.name) return error(T('請填寫名稱。', '请填写名称。', 'Enter a name.'), 'name');
    // These are banking text fields, never HTML or executable content. This also protects
    // downstream legacy transaction views that do not yet escape their counterparty text.
    for (const [key, value] of Object.entries(draft)) {
      if (typeof value === 'string' && /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return error(T('請使用一般文字，不要輸入 HTML 標記或控制字元。', '请使用一般文字，不要输入 HTML 标记或控制字符。', 'Use plain text without HTML markup or control characters.'), key);
    }
    if (submit && !form.reportValidity()) return;
    if (submit && draft.type === '企业' && draft.country === '中国' && !draft.cn) return error(T('中國內地企業需填寫中文名稱。', '中国内地企业需填写中文名称。', 'A Chinese name is required for mainland Chinese companies.'), 'cn');
    if (submit && !draft.proof) return error(T('請上傳付款協議、合同或發票後再提交審核。', '请上传付款协议、合同或发票后再提交审核。', 'Upload a payment agreement, contract, or invoice before submitting for review.'), 'proof');
    const id = draft.editId || 'CPR' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const record = { id, _reviewCustomer: CID(), dir: draft.dir, type: draft.type, name: draft.name, cn: draft.cn || '', country: draft.country, city: draft.city || '', addr: draft.addr || '', phone: draft.phone || '', regNo: draft.regNo || '', idType: draft.idType, biz: draft.biz || [draft.dir === '收款方' ? '全球付款' : '全球收款'], status: submit ? '新增待审核' : '待提交', updated: TODAY, proof: draft.proof || '', accts: [{ name: draft.acctName || '', bank: draft.bank || '', acct: draft.acct || '', ccy: draft.ccy, swift: draft.swift || '', nature: draft.nature, region: draft.region, bankAddr: draft.bankAddr || '', onboard: submit ? '进件中' : '未进件' }] };
    const i = CPS.findIndex(c => c.id === id && own(c));
    if (i === -1) CPS.push(record); else CPS[i] = record;
    if (draft.inline) S.ui.rpRecentPayee = id;
    proofFile = null;
    closeModal(); render();
    toast(submit ? T('已建立待審核紀錄；審核通過前不能付款。', '已建立待审核记录；审核通过前不能付款。', 'Pending review record created. Payments are unavailable until approved.') : T('已保存草稿。', '已保存草稿。', 'Draft saved.'));
  };
  cpNew = function (dir) { if (S.portal !== 'cust') return nativeNew(dir); RP.openNew(false, dir); };

  cpDetail = function (id) {
    const c = CPS.find(c => c.id === id && own(c));
    if (!c) return nativeDetail(id);
    const rows = [[T('國家／地區', '国家／地区', 'Country / region'), c.country], [T('城市', '城市', 'City'), c.city], [T('地址', '地址', 'Address'), c.addr], [T('註冊號／證件號碼', '注册号／证件号码', 'Registration / ID number'), c.regNo], [T('付款協議證明', '付款协议证明', 'Payment agreement'), c.proof || '—']];
    const a = c.accts[0];
    modal(text(c.name), `<div class="rp-counterparty-status">${statusBadge(c.status)}<span class="small muted">${T('此瀏覽期間的紀錄（Demo）', '此浏览期间的记录（Demo）', 'Record for this browsing session (Demo)')}</span></div><dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${text(v || '—')}</dd>`).join('')}<dt>${T('戶名', '户名', 'Account holder')}</dt><dd>${text(a.name)}</dd><dt>${T('銀行', '银行', 'Bank')}</dt><dd>${text(a.bank)}</dd><dt>${T('帳號', '账号', 'Account number')}</dt><dd class="mono">${text(a.acct)}</dd><dt>${T('幣種', '币种', 'Currency')}</dt><dd>${text(a.ccy)}</dd><dt>SWIFT / BIC</dt><dd>${text(a.swift)}</dd><dt>${T('渠道進件', '渠道进件', 'Channel onboarding')}</dt><dd>${statusBadge(a.onboard)}</dd></dl>${c.status !== '正常' ? note(T('審核通過前不能用於付款。可繼續修改資料並重新提交。', '审核通过前不能用于付款。可继续修改资料并重新提交。', 'Payments remain unavailable until approved. You can edit the details and resubmit.'), 'warn') : ''}`, `<button class="btn" onclick="closeModal()">${T('關閉', '关闭', 'Close')}</button><button class="btn" onclick="AzureReviewPayments.openNew(${S.page === 'pay'},'${c.dir}','${id}')">${T('修改資料', '修改资料', 'Edit details')}</button>${c.status === '新增待审核' ? `<button class="btn" onclick="AzureReviewPayments.approve('${id}')">${T('模擬審核通過（Demo）', '模拟审核通过（Demo）', 'Simulate approval (Demo)')}</button>` : ''}${c.status === '正常' && c.dir === '收款方' ? `<button class="btn primary" onclick="AzureReviewPayments.usePayee('${id}')">${T('選用此收款方', '选用此收款方', 'Use this recipient')}</button>` : ''}`, true);
  };
  RP.approve = function (id) {
    const c = CPS.find(c => c.id === id && own(c));
    if (!c || c.status !== '新增待审核') return;
    c.status = '正常'; c.accts.forEach(a => { a.onboard = '已进件'; });
    closeModal(); render(); toast(T('已模擬通道審核通過（Demo）。', '已模拟通道审核通过（Demo）。', 'Channel approval simulated (Demo).'));
  };
  RP.usePayee = function (id) {
    const c = CPS.find(c => c.id === id && own(c));
    if (!c || c.dir !== '收款方' || c.status !== '正常') return;
    S.pay ||= { from: 'USD', amt: 25000, lock: 'S', fee: 'S', purpose: '货物贸易', memo: '' };
    S.pay.cp = id; S.pay.ai = 0; S.ui.rpRecentPayee = null;
    closeModal();
    if (S.page !== 'pay') { S.nextUI = { pt: 'pay' }; go('cust', 'pay'); } else { S.ui.pt='pay';render(); }
  };
  payDo = function (review, sellAmt) {
    const c = CPS.find(c => c.id === S.pay?.cp);
    const a = c?.accts[S.pay?.ai || 0] || c?.accts[0];
    if (S.portal !== 'cust' || !c || c.status !== '正常' || !c.biz.includes('全球付款') || !a || !['已进件', '无需进件'].includes(a.onboard)) return toast(T('收款方尚未通過審核，不能付款。', '收款方尚未通过审核，不能付款。', 'Recipient approval is required before payment.'));
    if (!Number.isFinite(sellAmt) || sellAmt <= 0 || sellAmt > (bal()[S.pay.from]?.a || 0)) return toast(T('請檢查付款金額及可用結存。', '请检查付款金额及可用结存。', 'Check the payment amount and available balance.'));
    nativePayDo(review, sellAmt);
  };

  RP.openPaymentNew=()=>{capturePayment();if((S.ui.pt||'pay')==='wd')RP.openWithdraw();else RP.openNew(true);};
  RP.openWithdraw=function(){
    if(S.portal!=='cust')return;
    capturePayment();withdrawProof=null;withdrawDraft={region:'中国香港',ccy:'HKD',name:cust(CID()).en||cust(CID()).name,bank:'',swift:'',acct:'',city:'',proof:''};
    const field=(key,label,extra='')=>`<div class="field"><label for="rp-wa-${key}">${label} *</label><input class="input" id="rp-wa-${key}" name="${key}" value="${text(withdrawDraft[key])}" required maxlength="180" ${extra}></div>`;
    const currencies=Object.keys(bal()||{}).filter(c=>c!=='CNY');
    modal(T('新增提現帳戶','新增提现账户','New withdrawal account'),`<form id="rp-withdraw-form" class="rp-counterparty-form"><p class="small muted">${T('提現只限公司本人名下的帳戶。提交後需審核，原提現內容會保留。','提现只限公司本人名下的账户。提交后需审核，原提现内容会保留。','Withdrawals are limited to accounts in your company name. Your withdrawal details are preserved while the new account is reviewed.')}</p><div class="form-grid"><div class="field"><label for="rp-wa-region">${T('帳戶所在地','账户所在地','Account country / region')} *</label><select class="select" id="rp-wa-region" name="region">${options(regionOptions,'中国香港')}</select></div><div class="field"><label for="rp-wa-ccy">${T('幣種','币种','Currency')} *</label><select class="select" id="rp-wa-ccy" name="ccy">${options(currencies,currencies.includes('HKD')?'HKD':currencies[0])}</select></div><div class="field full"><label for="rp-wa-name">${T('戶名（與公司名稱一致）','户名（与公司名称一致）','Account holder (company name)')}</label><input class="input" id="rp-wa-name" value="${text(withdrawDraft.name)}" readonly></div>${field('bank',T('銀行名稱','银行名称','Bank name'))}${field('swift','SWIFT / BIC')}${field('acct',T('銀行帳號／IBAN','银行账号／IBAN','Bank account number / IBAN'),'autocomplete="off"')}${field('city',T('城市（英文）','城市（英文）','City (English)'))}<div class="field full"><label for="rp-wa-proof">${T('開戶憑證','开户凭证','Account ownership document')} *</label><input class="input" id="rp-wa-proof" type="file" accept="application/pdf,image/jpeg,image/png" onchange="AzureReviewPayments.pickWithdrawProof(this)"><small id="rp-wa-proof-name" class="muted">PDF / JPG / PNG · ${T('最多 5 MB','最多 5 MB','up to 5 MB')}</small></div></div><div id="rp-wa-error" class="rp-form-error" role="alert" hidden></div></form>`,`<button class="btn" onclick="closeModal()">${T('取消','取消','Cancel')}</button><button class="btn primary" onclick="AzureReviewPayments.saveWithdraw()">${T('提交審核','提交审核','Submit for review')}</button>`,true);
    document.getElementById('rp-withdraw-form').addEventListener('submit',e=>{e.preventDefault();RP.saveWithdraw();});
  };
  function withdrawError(message){const el=document.getElementById('rp-wa-error');if(el){el.hidden=false;el.textContent=message;}}
  RP.pickWithdrawProof=function(el){
    const f=el.files[0];if(!f)return;
    if(!['application/pdf','image/jpeg','image/png'].includes(f.type)||!f.size||f.size>5*1024*1024){el.value='';withdrawProof=null;return withdrawError(T('請選擇最多 5 MB 的 PDF、JPG 或 PNG。','请选择最多 5 MB 的 PDF、JPG 或 PNG。','Choose a PDF, JPG or PNG up to 5 MB.'));}
    withdrawProof=f;document.getElementById('rp-wa-proof-name').textContent=f.name;
  };
  RP.saveWithdraw=function(){
    const form=document.getElementById('rp-withdraw-form');if(S.portal!=='cust'||!form||!withdrawDraft)return;
    if(!form.reportValidity())return;
    const data=Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,typeof v==='string'?v.trim():v]));
    if(['bank','swift','acct','city'].some(k=>!data[k]))return withdrawError(T('請完整填寫銀行資料。','请完整填写银行资料。','Complete the bank details.'));
    if(Object.values(data).some(v=>typeof v==='string'&&/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)))return withdrawError(T('請使用一般文字，不要輸入 HTML 標記或控制字元。','请使用一般文字，不要输入 HTML 标记或控制字符。','Use plain text without HTML markup or control characters.'));
    if(!bal()?.[data.ccy]||!regionOptions.includes(data.region))return;
    if(!withdrawProof)return withdrawError(T('請上傳開戶憑證。','请上传开户凭证。','Upload an account ownership document.'));
    const record={id:'WAR'+crypto.randomUUID().replace(/-/g,'').slice(0,12),_reviewCustomer:CID(),name:cust(CID()).en||cust(CID()).name,...data,proof:withdrawProof.name,status:'审核中',added:TODAY};
    if(window.AzureAdminChild){const a=parent.AzureBridge?.account;if(a?.role==='hq')record.adminActor={role:'hq',email:a.email,name:a.name,customerId:CID()};}
    WITHDRAW_ACCTS.push(record);S.ui.rpRecentWithdraw=record.id;withdrawDraft=null;withdrawProof=null;closeModal();render();toast(T('已提交帳戶審核，原提現內容已保留。','已提交账户审核，原提现内容已保留。','Account submitted for review. Your withdrawal details are preserved.'));
  };
  RP.withdrawDetail=function(id){
    const w=WITHDRAW_ACCTS.find(w=>w.id===id&&own(w));if(!w)return;
    modal(T('提現帳戶資料','提现账户资料','Withdrawal account details'),`${statusBadge(w.status)}<dl class="kv mt">${[[T('戶名','户名','Account holder'),w.name],[T('銀行','银行','Bank'),w.bank],[T('帳號','账号','Account number'),w.acct],['SWIFT / BIC',w.swift],[T('幣種','币种','Currency'),w.ccy],[T('地區','地区','Region'),I18N.tr(w.region)],[T('城市','城市','City'),w.city],[T('開戶憑證','开户凭证','Ownership document'),w.proof]].map(([k,v])=>`<dt>${k}</dt><dd>${text(v)}</dd>`).join('')}</dl>`,`<button class="btn" onclick="closeModal()">${T('關閉','关闭','Close')}</button>${w.status==='审核中'?`<button class="btn primary" onclick="AzureReviewPayments.approveWithdraw('${w.id}')">${T('模擬審核通過（Demo）','模拟审核通过（Demo）','Simulate approval (Demo)')}</button>`:`<button class="btn primary" onclick="AzureReviewPayments.useWithdraw('${w.id}')">${T('選用此帳戶','选用此账户','Use this account')}</button>`}`);
  };
  RP.approveWithdraw=function(id){const w=WITHDRAW_ACCTS.find(w=>w.id===id&&own(w));if(!w||w.status!=='审核中')return;w.status='正常';closeModal();render();toast(T('已模擬帳戶審核通過（Demo）。','已模拟账户审核通过（Demo）。','Account approval simulated (Demo).'));};
  RP.useWithdraw=function(id){const w=WITHDRAW_ACCTS.find(w=>w.id===id&&own(w)&&w.status==='正常');if(!w)return;capturePayment();S.wd||={amt:50000};S.wd.wa=id;S.ui.rpRecentWithdraw=null;closeModal();if(S.page!=='pay'){S.nextUI={pt:'wd'};go('cust','pay');}else{S.ui.pt='wd';render();}};
  newWithdrawAcct=function(){if(S.portal==='cust')RP.openWithdraw();else nativeWithdrawNew();};
  wdDo=function(){
    const w=WITHDRAW_ACCTS.find(w=>w.id===S.wd?.wa),amount=Number(S.wd?.amt);
    if(S.portal!=='cust'||!w||w.status!=='正常'||w._reviewCustomer&&w._reviewCustomer!==CID()||!Number.isFinite(amount)||amount<=0||!bal()?.[w.ccy]||amount>bal()[w.ccy].a)return toast(T('請確認帳戶已通過審核，且金額大於 0 並未超過可用結存。','请确认账户已通过审核，且金额大于 0 并未超过可用结存。','Use an approved account and enter a positive amount within the available balance.'));
    S.wd.amt=amount;const ids=new Set(TXS.map(t=>t.id));nativeWdDo();const tx=TXS.find(t=>!ids.has(t.id));if(tx){tx.memo=S.wd.memo||'';tx.maker=window.AzureAdminChild?parent.AzureBridge.account.email:ME.cust.email;}
  };

  function paymentToolbar(){
    const page=document.querySelector('.page-in');page?.classList.add('rp-payment-page');
    const tabs=[...document.querySelectorAll('.tabs')].find(el=>el.querySelector('[onclick*="\'pt\'"]'));const card=tabs?.closest('.card');if(!card)return null;
    card.classList.add('rp-payment-card');const toolbar=document.createElement('div');toolbar.className='rp-payment-toolbar';tabs.before(toolbar);toolbar.append(tabs);
    const actions=document.createElement('div');actions.className='rp-payment-actions';toolbar.append(actions);
    const add=document.createElement('button');add.type='button';add.className='btn primary rp-payment-add '+(S.ui.pt==='wd'?'rp-add-withdraw':'rp-add-recipient');add.innerHTML=ICON.plus+`<span>${T('即時新增','即时新增','Add now')}</span>`;add.setAttribute('aria-label',S.ui.pt==='wd'?T('即時新增提現帳戶','即时新增提现账户','Add a withdrawal account'):T('即時新增收款方','即时新增收款方','Add a recipient'));add.onpointerdown=e=>e.preventDefault();add.onclick=RP.openPaymentNew;actions.append(add);
    const management=page.querySelector('.operations a[href="#/cust/cp"]');if(management)actions.append(management);const rail=page.querySelector('.operations');if(rail&&!rail.querySelector('.btn-row>*'))rail.remove();page.querySelector('.operation-trigger')?.remove();
    const grid=card.querySelector(':scope>.card-pad.grid.g2');if(grid){grid.classList.add('rp-payment-grid');grid.children[0]?.classList.add('rp-payment-fields');grid.children[1]?.classList.add('rp-payment-summary');}
    return toolbar;
  }

  const previousAfter = afterRender;
  afterRender = function () {
    previousAfter();
    if(S.portal!=='cust'||S.page!=='pay')return;
    const toolbar=paymentToolbar();if(!toolbar)return;
    if(S.ui.pt==='batch'){const file=document.querySelector('.rp-payment-card input[type=file]');if(file){if(batchFiles)file.files=batchFiles;file.onchange=()=>{batchFiles=file.files;};}}
    if(S.ui.pt==='wd'){
      const picker=document.querySelector('select[onchange^="S.wd.wa"]');
      if(picker){if(![...picker.options].some(o=>o.value===S.wd.wa))S.wd.wa=picker.options[0]?.value;picker.value=S.wd.wa;WITHDRAW_ACCTS.filter(w=>own(w)&&w.status!=='正常').forEach(w=>{const o=new Option(`${w.bank} · ${w.acct} · ${I18N.tr(w.status)}`,w.id);o.disabled=true;picker.append(o);});}
      const memo=document.querySelector('.rp-payment-fields .field:last-child input');if(memo){memo.dataset.rpWithdrawMemo='true';memo.value=S.wd.memo||'';memo.oninput=()=>{S.wd.memo=memo.value;};}
      const hint=document.querySelector('.rp-payment-summary>.small.muted');if(hint)hint.textContent=T('可按上方「即時新增」加入本人名下的銀行帳戶。','可按上方「即时新增」加入本人名下的银行账户。','Use Add now above to register a bank account in your company name.');
      const recent=WITHDRAW_ACCTS.find(w=>w.id===S.ui.rpRecentWithdraw&&own(w));if(recent){const n=document.createElement('div');n.className='rp-new-withdraw';n.setAttribute('role','status');n.innerHTML=`<div><strong>${text(recent.bank)}</strong>${statusBadge(recent.status)}<p class="small muted">${recent.status==='正常'?T('審核已通過，可選用此帳戶。','审核已通过，可选用此账户。','Approved and ready to use.'):T('帳戶資料已保存，審核通過後可選用。原提現內容已保留。','账户资料已保存，审核通过后可选用。原提现内容已保留。','Account saved for review. Your withdrawal details are preserved.')}</p></div><button class="btn sm" onclick="AzureReviewPayments.withdrawDetail('${recent.id}')">${T('查看','查看','View')}</button>${recent.status==='正常'?`<button class="btn primary sm" onclick="AzureReviewPayments.useWithdraw('${recent.id}')">${T('選用','选用','Use')}</button>`:''}`;toolbar.after(n);}
      return;
    }
    if(S.ui.pt==='batch'){
      const recent=CPS.find(c=>c.id===S.ui.rpRecentPayee&&own(c));
      if(recent){const n=document.createElement('div');n.className='rp-new-recipient';n.setAttribute('role','status');n.innerHTML=`<div><strong>${text(recent.name)}</strong>${statusBadge(recent.status)}<p class="small muted">${T('收款方資料已保存；批次步驟及原有校驗結果維持不變。','收款方资料已保存；批次步骤及原有校验结果维持不变。','Recipient details saved. Your batch step and validation results are preserved.')}</p></div><button class="btn sm" onclick="cpDetail('${recent.id}')">${T('查看','查看','View')}</button>`;toolbar.after(n);}
      return;
    }
    if((S.ui.pt||'pay')!=='pay')return;
    {const file=document.querySelector('.rp-payment-card input[type=file]');if(file){if(paymentFiles)file.files=paymentFiles;file.onchange=()=>{paymentFiles=file.files;};}}
    const picker = document.querySelector('select[onchange*="S.pay.cp"]');
    if (!picker || picker.closest('.rp-recipient-picker')) return;
    const wrapper = document.createElement('div'); wrapper.className = 'rp-recipient-picker';
    picker.before(wrapper); wrapper.append(picker);
    const pending = CPS.filter(c => own(c) && c.dir === '收款方' && c.status !== '正常');
    pending.forEach(c => { const option = document.createElement('option'); option.value = c.id; option.disabled = true; option.textContent = `${c.name} · ${I18N.tr(c.status)}`; picker.append(option); });
    const recent = CPS.find(c => c.id === S.ui.rpRecentPayee && own(c));
    if (recent) {
      const notice = document.createElement('div'); notice.className = 'rp-new-recipient'; notice.setAttribute('role', 'status');
      notice.innerHTML = `<div><strong>${text(recent.name)}</strong>${statusBadge(recent.status)}<p class="small muted">${recent.status === '正常' ? T('審核已通過，可選用此收款方。', '审核已通过，可选用此收款方。', 'Approved and ready to select.') : T('資料已保存；審核通過前不能付款，原付款內容已保留。', '资料已保存；审核通过前不能付款，原付款内容已保留。', 'Details saved. Approval is required before payment; your original payment details are preserved.')}</p></div><button type="button" class="btn sm" onclick="cpDetail('${recent.id}')">${T('查看', '查看', 'View')}</button>${recent.status === '正常' ? `<button type="button" class="btn primary sm" onclick="AzureReviewPayments.usePayee('${recent.id}')">${T('選用', '选用', 'Use')}</button>` : ''}`;
      wrapper.after(notice);
    }
  };
})();
