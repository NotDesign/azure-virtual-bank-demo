// Customer-portal data (account management, ledger, FX orders, counterparties, batches)
window.FXR.CNY = 1.07;
window.BALANCES.AZ100001.CNY = { a: 32600.00, f: 0 };
window.ACCOUNTS.push({ cust: 'AZ100001', nick: '跨境人民币账户', region: '中国香港', bg: '跨境结汇 / 付汇', ccy: 'CNY', bank: '通道跨境账户（Allinpay）', no: 'DEMO-XB-AZ100001', status: '正常', ap: 'AP1', xb: true });

window.VA_INFO = {
  bankName: '渣打银行香港分行（SCB）',
  opening: 'Standard Chartered Bank (Hong Kong) Limited',
  bankCode: '003', swift: 'SCBLHKHHXXX',
  address: 'Floor 32, Standard Chartered Bank Building, 4-4A Des Voeux Road Central, Hong Kong',
  subId: 'DEMO-AZ100001', opened: { HKD: '2026-06-20', USD: '2026-06-20', CNH: '2026-06-20', EUR: '2026-06-20', CNY: '2026-07-02' },
};

window.WITHDRAW_ACCTS = [
  { id: 'WA1', bank: 'HSBC Hong Kong', name: 'Star Ocean Electronics Ltd', customerId: 'AZ100001', acct: 'DEMO-001 **** 0838', ccy: 'HKD', swift: 'HSBCHKHHHKH', region: '中国香港', status: '正常', added: '2026-06-22' },
  { id: 'WA2', bank: 'Bank of China (Hong Kong)', name: 'Star Ocean Electronics Ltd', customerId: 'AZ100001', acct: 'DEMO-001 **** 0551', ccy: 'USD', swift: 'BKCHHKHHXXX', region: '中国香港', status: '审核中', added: '2026-10-11' },
];

window.FROZEN = [
  { t: '2026-10-12 15:08', ref: 'T26100102', ccy: 'USD', amt: 2500, reason: '付款处理中', detail: 'Pacific Logistics Pte Ltd · 等待通道结果', release: '预计 1 个工作日' },
];
window.HELD_RETURNS = [
  { t: '2026-10-09 11:40', ref: 'RT26100901', ccy: 'GBP', amt: 320.00, reason: '退回款待核对', detail: 'Demo 银行退回款，收款资料需要核对', release: '核对完成后按银行结果释放' },
];

window.DECL_CODES = [
  ['121010', '一般贸易（货物）'], ['122010', '出口商品退货'], ['221000', '运输服务'], ['228010', '咨询服务'], ['228020', '技术服务'],
];
window.PURPOSES = ['货物贸易', '服务贸易', '运费', '其他投资', '证券投资及金融衍生工具', '直接投资', '资本账户', '经常转移'];

window.CPS = [
  { id: 'CP1', customerId: 'AZ100001', dir: '收款方', type: '企业', name: 'Demo Shenzhen Supplier 1 Ltd', cn: '示范深圳供应商一', country: '中国', city: 'Shenzhen', addr: '20 Sample Business Road, Shenzhen', regNo: 'DEMO-REG-001-CN', biz: ['全球付款', '跨境付汇'], status: '正常', updated: '2026-10-12', proof: 'demo-purchase-contract.pdf',
    accts: [{ bank: 'China Merchants Bank Shenzhen Branch', acct: 'DEMO-001 **** 0018', ccy: 'CNY', swift: 'CMBCCNBS', nature: '对公', onboard: '已进件' }, { bank: 'China Merchants Bank Shenzhen Branch', acct: 'DEMO-001 **** 2203', ccy: 'USD', swift: 'CMBCCNBS', nature: '对公', onboard: '已进件' }] },
  { id: 'CP2', customerId: 'AZ100001', dir: '收款方', type: '企业', name: 'Demo Singapore Logistics 1 Ltd', country: '新加坡', city: 'Singapore', addr: '21 Sample Business Road, Singapore', regNo: 'DEMO-REG-001-SG', biz: ['全球付款'], status: '正常', updated: '2026-10-12', proof: 'demo-logistics-agreement.pdf',
    accts: [{ bank: 'DBS Bank Ltd', acct: 'DEMO-001 **** 0331', ccy: 'USD', swift: 'DBSSSGSG', nature: '对公', onboard: '已进件' }] },
];

window.BATCHES = [
  { id: 'BT2026100801', type: '批量付款', created: '2026-10-08 10:22', file: 'payroll_suppliers_1008.xlsx', total: 12, ok: 12, fail: 0, ing: 0, amt: 'USD 86,400.00', status: '处理成功' },
  { id: 'BT2026101202', type: '批量代付（中国大陆）', created: '2026-10-12 16:05', file: 'cn_payout_1012.xlsx', total: 30, ok: 27, fail: 2, ing: 1, amt: 'CNY 412,800.00', status: '处理中' },

];

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
  const opening = {}; [...new Set(out.map((r) => r.ccy))].forEach((c) => { const rs = out.filter((r) => r.ccy === c); const last = rs[rs.length - 1]; opening[c] = last.bal - (last.cr - last.dr); });
  Object.entries(BALANCES[C]).forEach(([c, b]) => { if (!(c in opening)) opening[c] = b.a + b.f; });
  Object.entries(opening).forEach(([c, v]) => { if (v > 0.005) out.push({ time: '2026-09-01 00:00:00', ref: 'OPEN-' + c, acct: acctNo(c), ccy: c, cr: 0, dr: 0, bal: v, type: '期初余额', note: '上期结转' }); });
  out.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
  return out;
}
