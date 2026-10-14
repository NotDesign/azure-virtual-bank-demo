// Customer-portal data (account management, ledger, FX orders, counterparties, batches)
window.FXR.CNY = 1.07;
window.BALANCES.AZ100001.CNY = { a: 32600.00, f: 0 };
window.ACCOUNTS.push({ cust: 'AZ100001', nick: '跨境人民币账户', region: '中国香港', bg: '跨境结汇 / 付汇', ccy: 'CNY', bank: '通道跨境账户（Allinpay）', no: '8200 0000 1422 01', status: '正常', ap: 'AP1', xb: true });

window.VA_INFO = {
  bankName: '渣打银行香港分行（SCB）',
  opening: 'Standard Chartered Bank (Hong Kong) Limited',
  bankCode: '003', swift: 'SCBLHKHHXXX',
  address: 'Floor 32, Standard Chartered Bank Building, 4-4A Des Voeux Road Central, Hong Kong',
  subId: '998000000011757', opened: { HKD: '2026-06-20', USD: '2026-06-20', CNH: '2026-06-20', EUR: '—', CNY: '2026-07-02' },
};

window.WITHDRAW_ACCTS = [
  { id: 'WA1', bank: 'HSBC Hong Kong', name: 'Star Ocean Electronics Ltd', acct: '808 **** 838', ccy: 'HKD', swift: 'HSBCHKHHHKH', region: '中国香港', status: '正常', added: '2026-06-22' },
  { id: 'WA2', bank: 'Bank of China (Hong Kong)', name: 'Star Ocean Electronics Ltd', acct: '012 **** 551', ccy: 'USD', swift: 'BKCHHKHHXXX', region: '中国香港', status: '审核中', added: '2026-10-11' },
];

window.FROZEN = [
  { t: '2026-10-12 15:08', ref: 'T260900222', ccy: 'USD', amt: 2500, reason: '付款处理中', detail: 'Pacific Logistics Pte Ltd · 等待通道结果', release: '预计 1 个工作日' },
];
window.HELD_RETURNS = [
  { t: '2026-10-09 11:40', ref: 'RT26100901', ccy: 'GBP', amt: 320.00, reason: '退票暂存', detail: '未开通 GBP 账户，退回款项暂存', release: '开通 GBP 账户或换汇后释放' },
];

window.DECL_CODES = [
  ['121010', '一般贸易（货物）'], ['122010', '出口商品退货'], ['221000', '运输服务'], ['228010', '咨询服务'], ['228020', '技术服务'],
];
window.PURPOSES = ['货物贸易', '服务贸易', '运费', '其他投资', '证券投资及金融衍生工具', '直接投资', '资本账户', '经常转移'];

window.CPS = [
  { id: 'CP1', dir: '收款方', type: '企业', name: 'Shenzhen Huaxing Components Co., Ltd', cn: '深圳华兴元件有限公司', country: '中国', city: 'Shenzhen', addr: 'Nanshan District, Shenzhen', regNo: '91440300MA5F***21X', biz: ['全球付款', '跨境付汇'], status: '正常', updated: '2026-08-14', proof: '采购框架协议.pdf',
    accts: [{ bank: 'China Merchants Bank Shenzhen Branch', acct: '7559 **** 0018', ccy: 'CNY', swift: 'CMBCCNBS', nature: '对公', onboard: '已进件' }, { bank: 'China Merchants Bank Shenzhen Branch', acct: '7559 **** 2203', ccy: 'USD', swift: 'CMBCCNBS', nature: '对公', onboard: '已进件' }] },
  { id: 'CP2', dir: '收款方', type: '企业', name: 'Pacific Logistics Pte Ltd', country: '新加坡', city: 'Singapore', addr: '10 Anson Road, Singapore', regNo: '201812345K', biz: ['全球付款'], status: '正常', updated: '2026-07-30', proof: '物流服务合同.pdf',
    accts: [{ bank: 'DBS Bank Ltd', acct: '0720 **** 331', ccy: 'USD', swift: 'DBSSSGSG', nature: '对公', onboard: '已进件' }] },
  { id: 'CP3', dir: '收款方', type: '企业', name: 'Kowloon Packaging Ltd', country: '中国香港', city: 'Hong Kong', addr: 'Kwun Tong, Kowloon', regNo: 'BR 61234567', biz: ['全球付款'], status: '新增待审核', updated: '2026-10-11', proof: '包装采购订单.pdf',
    accts: [{ bank: 'Bank of China (Hong Kong)', acct: '012 **** 776', ccy: 'HKD', swift: 'BKCHHKHHXXX', nature: '对公', onboard: '进件中' }] },
  { id: 'CP4', dir: '收款方', type: '企业', name: 'Tanaka Trading Co., Ltd.', country: '日本', city: 'Osaka', addr: 'Chuo-ku, Osaka', regNo: '1200-01-123456', biz: ['全球付款'], status: '修改待审核', updated: '2026-10-10', proof: 'Invoice-TT-0921.pdf',
    accts: [{ bank: 'MUFG Bank, Ltd.', acct: '4410 **** 902', ccy: 'USD', swift: 'BOTKJPJT', nature: '对公', onboard: '已进件' }] },
  { id: 'CP5', dir: '收款方', type: '个人', name: 'WANG XIAOMING', cn: '王小明', country: '中国', city: 'Dongguan', addr: 'Dongguan, Guangdong', regNo: '居民身份证 4419**********1234', biz: ['跨境付汇'], status: '待完善', updated: '2026-10-12', proof: '',
    accts: [{ bank: '中国工商银行东莞分行', acct: '6222 **** 8812', ccy: 'CNY', swift: '102602000000（联行号）', nature: '对私', onboard: '未进件' }] },
  { id: 'CP6', dir: '收款方', type: '企业', name: 'Global Parts GmbH', country: '德国', city: 'Hamburg', addr: 'Hafenstrasse 12, Hamburg', regNo: 'HRB 123456', biz: ['全球付款'], status: '审核不通过', updated: '2026-10-03', proof: 'contract_scan.jpg', reject: '付款协议证明不清晰，请上传完整合同或发票',
    accts: [{ bank: 'Deutsche Bank AG', acct: 'DE89 **** 3000', ccy: 'EUR', swift: 'DEUTDEFF', nature: '对公', onboard: '进件失败' }] },
  { id: 'CP7', dir: '收款方', type: '企业', name: 'Old Supplier Trading Ltd', country: '中国香港', city: 'Hong Kong', addr: 'Sheung Wan, Hong Kong', regNo: 'BR 50011223', biz: ['全球付款'], status: '已关闭', updated: '2026-05-02', proof: '—',
    accts: [{ bank: 'Hang Seng Bank', acct: '024 **** 118', ccy: 'HKD', swift: 'HASEHKHH', nature: '对公', onboard: '无需进件' }] },
  { id: 'PY1', dir: '来款方', type: '企业', name: 'Amazon Payments Europe S.C.A.', country: '卢森堡', city: 'Luxembourg', addr: '38 Avenue John F. Kennedy', regNo: 'B 116010', biz: ['全球收款'], status: '正常', updated: '2026-07-01', proof: '平台结算协议.pdf', accts: [{ bank: 'J.P. Morgan SE', acct: 'LU** **** 4410', ccy: 'EUR', swift: 'CHASLULX', nature: '对公', onboard: '无需进件' }] },
  { id: 'PY2', dir: '来款方', type: '企业', name: 'Alibaba.com Singapore E-Commerce Pte Ltd', country: '新加坡', city: 'Singapore', addr: '51 Bras Basah Road', regNo: '200718361R', biz: ['全球收款'], status: '正常', updated: '2026-06-28', proof: '平台协议.pdf', accts: [{ bank: 'Citibank N.A. Singapore', acct: '0-***-***-019', ccy: 'USD', swift: 'CITISGSG', nature: '对公', onboard: '无需进件' }] },
  { id: 'PY3', dir: '来款方', type: '企业', name: 'Global Sources', country: '中国香港', city: 'Hong Kong', addr: 'Wan Chai, Hong Kong', regNo: 'BR 3311****', biz: ['全球收款'], status: '正常', updated: '2026-07-12', proof: '采购合同.pdf', accts: [{ bank: 'HSBC Hong Kong', acct: '500 **** 001', ccy: 'USD', swift: 'HSBCHKHHHKH', nature: '对公', onboard: '无需进件' }] },
  { id: 'PY4', dir: '来款方', type: '企业', name: 'Client Ltd (UK)', country: '英国', city: 'London', addr: 'Canary Wharf, London', regNo: '09876543', biz: ['全球收款'], status: '新增待审核', updated: '2026-10-12', proof: 'SOW-2026.pdf', accts: [{ bank: 'Barclays Bank UK', acct: 'GB** **** 7781', ccy: 'EUR', swift: 'BUKBGB22', nature: '对公', onboard: '无需进件' }] },
];

window.BATCHES = [
  { id: 'BT2026100801', type: '批量付款', created: '2026-10-08 10:22', file: 'payroll_suppliers_1008.xlsx', total: 12, ok: 12, fail: 0, ing: 0, amt: 'USD 86,400.00', status: '处理成功' },
  { id: 'BT2026101202', type: '批量代付（中国大陆）', created: '2026-10-12 16:05', file: 'cn_payout_1012.xlsx', total: 30, ok: 27, fail: 2, ing: 1, amt: 'CNY 412,800.00', status: '处理中' },
  { id: 'BT2026092503', type: '批量新增收款方', created: '2026-09-25 09:41', file: 'payees_0925.xlsx + attachments.zip', total: 8, ok: 7, fail: 1, ing: 0, amt: '—', status: '部分成功' },
];

// extra FX deals + own-account withdrawals for AZ100001 so history is realistic
[['T2610F01', '2026-10-09', 'EUR', 'USD', 8200], ['T2610F02', '2026-10-07', 'HKD', 'CNH', 60000], ['T2610F03', '2026-10-02', 'USD', 'CNH', 15000], ['T2609F04', '2026-09-26', 'USD', 'HKD', 30000], ['T2609F05', '2026-09-18', 'EUR', 'HKD', 12000], ['T2609F06', '2026-09-11', 'USD', 'HKD', 45000], ['T2609F07', '2026-09-05', 'HKD', 'USD', 80000]]
  .forEach(([id, date, sell, buy, amt]) => window.TXS.push({ id, date, cust: 'AZ100001', type: '换汇', prod: 'FX', ccy: sell, buy, amt, cp: `${sell} → ${buy}`, status: '成功', ch: 'ALLINPAY_HK' }));
window.TXS.sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- derived: FX orders, ledger ----------
(function () {
  const C = 'AZ100001';
  const hhmm = (id) => { const n = parseInt(String(id).replace(/\D/g, '').slice(-4), 10) || 0; return `${String(9 + (n % 9)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}:${String((n * 7) % 60).padStart(2, '0')}`; };
  window.txTime = (t) => t.time || `${t.date} ${hhmm(t.id)}`;
  const mk = window.CUST_PRICE[C].FX;
  window.FX_ORDERS = window.TXS.filter((t) => t.cust === C && t.type === '换汇').map((t, i) => {
    const buy = t.buy || 'HKD', rate = (window.FXR[t.ccy] / window.FXR[buy]) * (1 - mk / 10000) * (1 + ((i % 3) - 1) * 0.0004);
    const n = parseInt(t.id.replace(/\D/g, ''), 10) || i;
    return { id: 'FXOC' + t.date.replace(/-/g, '') + String(1000000 + ((n * 7919) % 8999999)), tx: t.id, time: txTime(t), sell: t.ccy, sellAmt: t.amt, buy, buyAmt: Math.round(t.amt * rate * 100) / 100, rate, remark: i === 0 ? '9 月货款结汇' : '', status: t.status === '成功' ? '已交割' : '处理中' };
  });
  window.FX_ORDERS.push({ id: 'FXOC202609031184206', tx: '—', time: '2026-09-03 10:15:02', sell: 'HKD', sellAmt: 50000, buy: 'CNH', buyAmt: 46512.33, rate: 0.930247, remark: '支付内地供应商', status: '已取消' });
  window.FX_ORDERS.sort((a, b) => (a.time < b.time ? 1 : -1));
})();

function buildLedger() {
  const C = ME.cust.org, out = [];
  const cur = {}; Object.entries(BALANCES[C]).forEach(([c, b]) => (cur[c] = b.a + b.f));
  const list = TXS.filter((t) => t.cust === C).slice().sort((a, b) => (txTime(a) < txTime(b) ? 1 : -1));
  const acctNo = (ccy) => (ACCOUNTS.find((a) => a.cust === C && a.ccy === ccy) || {}).no || '—';
  const push = (t, ccy, amt, type, note, suffix = '') => { if (!(ccy in cur)) cur[ccy] = 0; out.push({ time: txTime(t), ref: t.id + suffix, acct: acctNo(ccy), ccy, cr: amt > 0 ? amt : 0, dr: amt < 0 ? -amt : 0, bal: cur[ccy], type, note }); cur[ccy] -= amt; };
  list.forEach((t) => {
    if (t.status !== '成功' && t.status !== '处理中') return;
    const fee = t.amt || t.prod === 'VA_OPEN' || t.prod === 'VA_MONTHLY' ? split(t).actual : 0;
    if (t.type === '入账') { push(t, t.ccy, -fee / FXR[t.ccy], '入账手续费', '通道代扣', '-F'); push(t, t.ccy, t.amt, '入账', t.cp); }
    else if (t.type === '付款' || t.type === '提现') { push(t, 'HKD', -fee, '付款手续费', '通道代扣', '-F'); push(t, t.ccy, -t.amt, t.type, t.cp); }
    else if (t.type === '换汇') { const o = FX_ORDERS.find((x) => x.tx === t.id); const got = o ? o.buyAmt : t.amt * 7.7567; push(t, o ? o.buy : 'HKD', got, '换汇买入', o ? o.id : '', '-B'); push(t, t.ccy, -t.amt, '换汇卖出', o ? o.id : ''); }
    else if (t.type === '跨境申报') { push(t, 'CNY', t.buyAmt || 0, '跨境结汇买入', t.cp, '-B'); push(t, t.ccy, -t.amt, '跨境结汇卖出', t.cp); }
    else if (t.type === '跨境代付') { push(t, 'CNY', -t.amt, '跨境代付', t.cp); }
    else if (fee) push(t, 'HKD', -fee, t.type, t.cp);
  });
  if (!window._ledgerFixed) {
    window._ledgerFixed = true;
    const mins = {}; out.forEach((r) => { mins[r.ccy] = Math.min(mins[r.ccy] ?? Infinity, r.bal, r.bal - (r.cr - r.dr)); });
    let k = 0;
    Object.entries(mins).forEach(([c, m]) => { if (m < 0) { const need = Math.ceil((-m + 30000) / 1000) * 1000; TXS.unshift({ id: 'T2610W0' + (++k), date: TODAY, time: `${TODAY} 11:0${k}:00`, cust: C, type: '提现', prod: 'PAYOUT_HK', ccy: c, amt: need, cp: 'HSBC Hong Kong（本人账户）', status: '成功', ch: 'ALLINPAY_HK' }); } });
    if (k) return buildLedger();
  }
  const opening = {}; [...new Set(out.map((r) => r.ccy))].forEach((c) => { const rs = out.filter((r) => r.ccy === c); const last = rs[rs.length - 1]; opening[c] = last.bal - (last.cr - last.dr); });
  Object.entries(BALANCES[C]).forEach(([c, b]) => { if (!(c in opening)) opening[c] = b.a + b.f; });
  Object.entries(opening).forEach(([c, v]) => { if (v > 0.005) out.push({ time: '2026-09-01 00:00:00', ref: 'OPEN-' + c, acct: acctNo(c), ccy: c, cr: 0, dr: 0, bal: v, type: '期初余额', note: '上期结转' }); });
  out.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
  return out;
}
