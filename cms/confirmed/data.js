// Prototype sample data — all names and numbers are fictional
window.TODAY = '2026-10-13';
window.FXR = { HKD: 1, USD: 7.78, CNH: 1.07, EUR: 8.45, GBP: 9.9 }; // to HKD

window.PRODUCTS = [
  { code: 'COLLECT_G', name: '账户收款（货贸）', cat: '收款', unit: 'pct', cost: 0.10, guide: '0.2%–0.3%' },
  { code: 'COLLECT_S', name: '账户收款（服贸）', cat: '收款', unit: 'pct', cost: 0.10, guide: '0.3%–0.4%' },
  { code: 'PAYOUT_HK', name: '付款/提现（香港）', cat: '付款', unit: 'fixed', cost: 80, guide: '—' },
  { code: 'PAYOUT_INTL', name: '付款/提现（非香港）', cat: '付款', unit: 'fixed', cost: 150, guide: '含跨境人民币申报' },
  { code: 'FX', name: '货币兑换', cat: '汇兑', unit: 'bps', cost: 0, share: 0.5, guide: '中银香港牌价 + markup，分润 50%' },
  { code: 'VA_OPEN', name: 'VA 开户费', cat: '账户', unit: 'fixed', cost: 50, guide: '2,000 HKD' },
  { code: 'VA_MONTHLY', name: 'VA 月管理费', cat: '账户', unit: 'fixed', cost: 0, guide: '自行设定' },
];
window.UNIT_LABEL = { pct: '%', fixed: 'HKD/笔', bps: 'bps' };

window.CHANNELS = [
  { code: 'ALLINPAY_HK', name: '通华环球汇 Allinpay', entity: 'Allinpay Financial Services Ltd（HK MSO）', mode: 'CHANNEL_DEDUCT', status: '启用',
    caps: ['开户进件', 'VA', '收款', '付款', '汇兑', '提现', '跨境人民币', '批量受益人'], api: 'https://global.allinpayintl.com/gcpapi', inst: 'INST-****-01', settle: '分润按月（M1）结算至 DBS' },
  { code: 'BANKX_SG', name: '示例银行 B（规划中）', entity: '待定', mode: 'PLATFORM_DEDUCT', status: '规划中',
    caps: ['本地账户', '收款', '付款'], api: '—', inst: '—', settle: '我方扣费，向渠道付成本价' },
];
window.ACCOUNT_PRODUCTS = [
  { id: 'AP1', channel: 'ALLINPAY_HK', bank: '渣打银行（香港）', region: '中国香港', bg: '货物贸易 / 服务贸易', ccys: ['HKD', 'USD', 'CNH', 'EUR'], type: '本人名下 VA', status: '可申请', fee: 'VA_OPEN（按币种计价）' },
  { id: 'AP2', channel: 'ALLINPAY_HK', bank: '星展银行（香港）C020', region: '中国香港', bg: '通用', ccys: ['HKD', 'USD', 'CNH'], type: '本人名下 VA', status: '待渠道确认', fee: 'VA_OPEN' },
  { id: 'AP3', channel: 'BANKX_SG', bank: '示例银行 B', region: '新加坡', bg: '通用', ccys: ['SGD', 'USD'], type: '本地账户', status: '规划中', fee: '待定' },
];

window.AGENTS = [
  { id: 'A001', level: 1, name: '港汇通顾问有限公司', parent: 'HQ', email: 'ops@ganghuitong.example', status: '启用', since: '2026-03-02' },
  { id: 'A002', level: 1, name: '东方跨境服务有限公司', parent: 'HQ', email: 'admin@dfkj.example', status: '启用', since: '2026-05-18' },
  { id: 'B007', level: 2, name: '陈氏商务工作室', parent: 'A001', email: 'chan@chanstudio.example', status: '启用', since: '2026-06-11', proxyApply: false },
  { id: 'B008', level: 2, name: '启航贸易咨询', parent: 'A001', email: 'hello@qihang.example', status: '启用', since: '2026-08-01', proxyApply: true },
  { id: 'B011', level: 2, name: '湾区出海顾问', parent: 'A002', email: 'team@gba-out.example', status: '启用', since: '2026-07-20', proxyApply: false },
];

// HQ sets L1 floor per product
window.FLOORS = {
  A001: { COLLECT_G: 0.15, COLLECT_S: 0.18, PAYOUT_HK: 100, PAYOUT_INTL: 180, FX: 10, VA_OPEN: 500, VA_MONTHLY: 0 },
  A002: { COLLECT_G: 0.16, COLLECT_S: 0.20, PAYOUT_HK: 100, PAYOUT_INTL: 190, FX: 12, VA_OPEN: 600, VA_MONTHLY: 0 },
};
// L1 sets L2 ratio (share of L1 spread) per product
window.L2RATIO = {
  B007: { COLLECT_G: 40, COLLECT_S: 40, PAYOUT_HK: 30, PAYOUT_INTL: 30, FX: 40, VA_OPEN: 50, VA_MONTHLY: 0 },
  B008: { COLLECT_G: 35, COLLECT_S: 35, PAYOUT_HK: 30, PAYOUT_INTL: 30, FX: 35, VA_OPEN: 50, VA_MONTHLY: 0 },
  B011: { COLLECT_G: 45, COLLECT_S: 45, PAYOUT_HK: 30, PAYOUT_INTL: 30, FX: 40, VA_OPEN: 50, VA_MONTHLY: 0 },
};
window.DEFAULT_CUST_PRICE = { COLLECT_G: 0.25, COLLECT_S: 0.35, PAYOUT_HK: 120, PAYOUT_INTL: 220, FX: 30, VA_OPEN: 2000, VA_MONTHLY: 100 };

window.CUSTOMERS = [
  { id: 'AZ100001', name: '星海电子科技有限公司', en: 'Star Ocean Electronics Ltd', l1: 'A001', l2: 'B007', bg: '货物贸易', status: '已开通', opened: '2026-06-20', chId: '9960000000801' },
  { id: 'AZ100002', name: '凌峰软件服务有限公司', en: 'Lingfeng Software Services Ltd', l1: 'A001', l2: 'B007', bg: '服务贸易', status: '已开通', opened: '2026-07-04', chId: '9960000000812' },
  { id: 'AZ100003', name: '万象家居国际有限公司', en: 'Vanxiang Home Intl Ltd', l1: 'A001', l2: null, bg: '货物贸易', status: '已开通', opened: '2026-04-11', chId: '9960000000733' },
  { id: 'AZ100004', name: '云帆数字营销有限公司', en: 'Yunfan Digital Marketing Ltd', l1: 'A001', l2: 'B008', bg: '服务贸易', status: '已开通', opened: '2026-08-15', chId: '9960000000845' },
  { id: 'AZ100005', name: '金桥供应链（香港）有限公司', en: 'Golden Bridge Supply Chain (HK) Ltd', l1: 'A002', l2: null, bg: '货物贸易', status: '已开通', opened: '2026-06-02', chId: '9960000000790' },
  { id: 'AZ100006', name: '蓝鲸跨境电商有限公司', en: 'Blue Whale Cross-border Ltd', l1: 'A002', l2: 'B011', bg: '货物贸易', status: '已开通', opened: '2026-08-28', chId: '9960000000851' },
  { id: 'AZ100007', name: '恒信咨询顾问有限公司', en: 'Hengxin Consulting Ltd', l1: null, l2: null, bg: '服务贸易', status: '已开通', opened: '2026-05-09', chId: '9960000000766' },
  { id: 'AZ100008', name: '翠园食品贸易有限公司', en: 'Emerald Garden Food Trading Ltd', l1: null, l2: null, bg: '货物贸易', status: '已开通', opened: '2026-09-03', chId: '9960000000866' },
  { id: 'AZ100009', name: '晨光教育科技有限公司', en: 'Morning Light EduTech Ltd', l1: 'A001', l2: 'B008', bg: '服务贸易', status: '冻结', opened: '2026-07-22', chId: '9960000000830' },
];
window.CUST_PRICE = {
  AZ100001: { ...window.DEFAULT_CUST_PRICE },
  AZ100002: { ...window.DEFAULT_CUST_PRICE, COLLECT_S: 0.32 },
  AZ100003: { ...window.DEFAULT_CUST_PRICE, COLLECT_G: 0.22, FX: 25 },
  AZ100004: { ...window.DEFAULT_CUST_PRICE },
  AZ100005: { ...window.DEFAULT_CUST_PRICE, COLLECT_G: 0.28, VA_OPEN: 1800 },
  AZ100006: { ...window.DEFAULT_CUST_PRICE },
  AZ100007: { ...window.DEFAULT_CUST_PRICE, COLLECT_S: 0.30 },
  AZ100008: { ...window.DEFAULT_CUST_PRICE, COLLECT_G: 0.20 },
  AZ100009: { ...window.DEFAULT_CUST_PRICE },
};

window.ACCOUNTS = [
  // demo customer AZ100001
  { cust: 'AZ100001', nick: '渣打港币收款', region: '中国香港', bg: '货物贸易', ccy: 'HKD', bank: '渣打银行（香港）', no: '368 961 49907', status: '正常', ap: 'AP1' },
  { cust: 'AZ100001', nick: '渣打美元收款', region: '中国香港', bg: '货物贸易', ccy: 'USD', bank: '渣打银行（香港）', no: '368 961 49915', status: '正常', ap: 'AP1' },
  { cust: 'AZ100001', nick: '渣打离岸人民币', region: '中国香港', bg: '货物贸易', ccy: 'CNH', bank: '渣打银行（香港）', no: '368 961 49923', status: '正常', ap: 'AP1' },
  { cust: 'AZ100001', nick: '渣打欧元收款', region: '中国香港', bg: '货物贸易', ccy: 'EUR', bank: '渣打银行（香港）', no: '368 961 49931', status: '审核中', ap: 'AP1' },
];
window.BALANCES = { AZ100001: { HKD: { a: 286450.20, f: 0 }, USD: { a: 128930.55, f: 2500 }, CNH: { a: 54210.00, f: 0 }, EUR: { a: 0, f: 0 } } };

window.BENEFICIARIES = [
  { id: 'BN1', name: 'Shenzhen Huaxing Components Co., Ltd', type: '企业', bank: 'China Merchants Bank Shenzhen', country: '中国内地', ccy: 'CNY', acct: '7559 **** 0018', status: '已审核' },
  { id: 'BN2', name: 'Pacific Logistics Pte Ltd', type: '企业', bank: 'DBS Bank Singapore', country: '新加坡', ccy: 'USD', acct: '0720 **** 331', status: '已审核' },
  { id: 'BN3', name: 'Star Ocean Electronics Ltd（本人账户）', type: '本人', bank: 'HSBC Hong Kong', country: '中国香港', ccy: 'HKD', acct: '808 **** 838', status: '已审核' },
  { id: 'BN4', name: 'Kowloon Packaging Ltd', type: '企业', bank: 'Bank of China (HK)', country: '中国香港', ccy: 'HKD', acct: '012 **** 776', status: '审核中' },
];

window.APPLICATIONS = [
  { id: 'APP-26100801', company: '海韵贸易有限公司', src: '一级链接', owner: 'A001', l2: null, status: '待 CS 补录', created: '2026-10-08', docs: 6, risk: '—' },
  { id: 'APP-26100902', company: '博远科技（香港）有限公司', src: '二级链接', owner: 'A001', l2: 'B008', status: '待补件', created: '2026-10-09', docs: 4, risk: '—' },
  { id: 'APP-26101003', company: '嘉禾国际物流有限公司', src: '总后台代客录入', owner: null, l2: null, status: '待合规审核', created: '2026-10-10', docs: 7, risk: '中' },
  { id: 'APP-26101104', company: '星辰文化传媒有限公司', src: '一级代客申请', owner: 'A002', l2: null, status: '待董事验证', created: '2026-10-11', docs: 7, risk: '低' },
  { id: 'APP-26100505', company: '启明医疗器械贸易有限公司', src: '自营 QR', owner: null, l2: null, status: '渠道审核中', created: '2026-10-05', docs: 7, risk: '低' },
  { id: 'APP-26092806', company: '云帆数字营销有限公司', src: '二级链接', owner: 'A001', l2: 'B008', status: '已开通', created: '2026-08-10', docs: 7, risk: '低' },
  { id: 'APP-26092707', company: '大道建材有限公司', src: '一级链接', owner: 'A002', l2: 'B011', status: '渠道驳回', created: '2026-09-27', docs: 6, risk: '高' },
  { id: 'APP-26101208', company: '青禾农产品有限公司', src: '二级链接', owner: 'A001', l2: 'B007', status: 'OCR 中', created: '2026-10-12', docs: 5, risk: '—' },
];
window.APP_FLOW = ['草稿', '待上传', 'OCR 中', '待 CS 补录', '待补件', '待合规审核', '待董事验证', '已提交渠道', '渠道审核中', '已开通'];

window.LINKS = [
  { code: 'HQ-SELF-01', org: 'HQ', tpl: '自营标准价', tag: '官网', uses: 18, exp: '长期', created: '2026-03-01' },
  { code: 'A001-STD', org: 'A001', tpl: '港汇通标准价', tag: '展会 2026', uses: 9, exp: '2026-12-31', created: '2026-04-15' },
  { code: 'A001-VIP', org: 'A001', tpl: '港汇通大客户价', tag: '大客户', uses: 3, exp: '长期', created: '2026-06-01' },
  { code: 'B007-01', org: 'B007', tpl: '（由一级设定）', tag: '微信群', uses: 4, exp: '长期', created: '2026-06-12' },
  { code: 'B008-01', org: 'B008', tpl: '（由一级设定）', tag: 'LinkedIn', uses: 2, exp: '长期', created: '2026-08-02' },
];

window.FEE_REQUESTS = [
  { id: 'FCR-0031', cust: 'AZ100002', prod: 'COLLECT_S', from: 0.35, to: 0.32, by: 'A001 港汇通', sent: '2026-10-02', eff: '2026-10-05', status: '已生效' },
  { id: 'FCR-0032', cust: 'AZ100003', prod: 'FX', from: 30, to: 25, by: 'A001 港汇通', sent: '2026-10-09', eff: '', status: '已发送 Allinpay' },
  { id: 'FCR-0033', cust: 'AZ100005', prod: 'VA_OPEN', from: 2000, to: 1800, by: 'A002 东方跨境', sent: '', eff: '', status: '待发送' },
];

window.USERS = {
  HQ: [
    { email: 'stephen@ourbank.example', name: '平台管理员', role: '管理员', status: '启用', last: '今天 09:12' },
    { email: 'cs.amy@ourbank.example', name: 'Amy（CS）', role: '操作员', status: '启用', last: '今天 10:40' },
    { email: 'compliance@ourbank.example', name: '合规组', role: '复核员', status: '启用', last: '昨天 17:05' },
    { email: 'finance@ourbank.example', name: '财务', role: '财务', status: '启用', last: '10-09' },
  ],
  A001: [
    { email: 'ops@ganghuitong.example', name: '黄经理', role: '管理员', status: '启用', last: '今天 08:55' },
    { email: 'sales1@ganghuitong.example', name: '销售 Ken', role: '操作员', status: '启用', last: '昨天' },
  ],
  B007: [{ email: 'chan@chanstudio.example', name: '陈先生', role: '管理员', status: '启用', last: '今天 11:02' }],
  AZ100001: [
    { email: 'finance@starocean.example', name: '李小姐（财务）', role: '管理员', status: '启用', last: '今天 09:30' },
    { email: 'ap@starocean.example', name: '付款专员', role: '操作员', status: '启用', last: '10-11' },
    { email: 'cfo@starocean.example', name: 'CFO', role: '复核员', status: '启用', last: '10-08' },
  ],
};

window.AUDIT = [
  { t: '2026-10-12 16:21', who: 'ops@ganghuitong.example', what: '修改客户费率', obj: 'AZ100003 · FX 30 → 25 bps', ip: '203.0.113.24' },
  { t: '2026-10-11 10:03', who: 'stephen@ourbank.example', what: '调整一级底价', obj: 'A002 · PAYOUT_INTL 180 → 190', ip: '198.51.100.7' },
  { t: '2026-10-10 14:47', who: 'ops@ganghuitong.example', what: '开启二级代客申请', obj: 'B008 启航贸易咨询', ip: '203.0.113.24' },
  { t: '2026-10-09 09:15', who: 'cs.amy@ourbank.example', what: 'CS 补录提交合规', obj: 'APP-26101003', ip: '198.51.100.9' },
];

// generate deterministic transactions
(function () {
  let s = 20261013;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const open = window.CUSTOMERS.filter((c) => c.status !== '冻结' || true);
  const tx = [];
  const counterparties = ['Amazon Payments EU', 'Shopify Inc.', 'Walmart Global', 'Global Sources', 'Alibaba.com Singapore', 'Etsy Ireland', 'Meta Platforms', 'Client Ltd (UK)', 'Toko Sdn Bhd'];
  for (let i = 0; i < 64; i++) {
    const c = open[Math.floor(rnd() * open.length)];
    const day = 1 + Math.floor(rnd() * 43); // 2026-09-01..2026-10-13
    const d = new Date(Date.UTC(2026, 8, day));
    if (d > new Date('2026-10-13T00:00:00Z')) continue;
    const date = d.toISOString().slice(0, 10);
    const r = rnd();
    let type, prod, ccy, amt, cp;
    if (r < 0.5) { type = '入账'; prod = c.bg === '服务贸易' ? 'COLLECT_S' : 'COLLECT_G'; ccy = pick(['USD', 'USD', 'USD', 'EUR', 'HKD']); amt = Math.round(5000 + rnd() * 180000); cp = pick(counterparties); }
    else if (r < 0.72) { type = '付款'; prod = rnd() < 0.5 ? 'PAYOUT_HK' : 'PAYOUT_INTL'; ccy = prod === 'PAYOUT_HK' ? 'HKD' : pick(['USD', 'CNH']); amt = Math.round(10000 + rnd() * 250000); cp = prod === 'PAYOUT_HK' ? 'Kowloon Packaging Ltd' : pick(['Shenzhen Huaxing Components', 'Pacific Logistics Pte Ltd']); }
    else if (r < 0.95) { type = '换汇'; prod = 'FX'; ccy = 'USD'; amt = Math.round(10000 + rnd() * 150000); cp = 'USD → HKD'; }
    else { type = '月费'; prod = 'VA_MONTHLY'; ccy = 'HKD'; amt = 0; cp = 'VA 月管理费'; }
    tx.push({ id: 'T' + (260900000 + i * 37), date, cust: c.id, type, prod, ccy, amt, cp, status: rnd() < 0.94 ? '成功' : '处理中', ch: 'ALLINPAY_HK' });
  }
  // a few opening fees
  [['AZ100004', '2026-09-02'], ['AZ100006', '2026-09-05'], ['AZ100008', '2026-09-08']].forEach(([cust, date], k) =>
    tx.push({ id: 'T26099' + (100 + k), date, cust, type: '开户费', prod: 'VA_OPEN', ccy: 'HKD', amt: 0, cp: 'VA 开户（渣打 4 币种）', status: '成功', ch: 'ALLINPAY_HK' }));
  tx.sort((a, b) => (a.date < b.date ? 1 : -1));
  window.TXS = tx;
})();
