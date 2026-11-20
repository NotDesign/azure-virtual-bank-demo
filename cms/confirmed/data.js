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
  { id: 'AZ100001', name: '星海电子科技有限公司', en: 'Star Ocean Electronics Ltd', email: 'finance@starocean.example', contact: '李小姐', l1: 'A001', l2: 'B007', bg: '货物贸易', status: '已开通', opened: '2026-06-20', chId: 'DEMO-CHANNEL-001' },
  { id: 'AZ100006', name: '蓝鲸跨境电商有限公司', en: 'Blue Whale Cross-border Ltd', email: 'finance@bluewhale.example', contact: '周小姐', l1: 'A002', l2: 'B011', bg: '货物贸易', status: '已开通', opened: '2026-08-28', chId: 'DEMO-CHANNEL-006' },
];
// These are existing customers applying for one additional account each.
// Customer/role/catalog counts are separate: the handoff contains exactly two customer cases.
window.AZURE_DEVELOPER_CASES = [
  { id: 'CASE-01', customerId: 'AZ100001', applicationId: 'APP-26100801', purpose: 'additional-account', branch: ['A001', 'B007'], scenario: '已有多币种账户及交易；追加账户待外部渠道审核' },
  { id: 'CASE-02', customerId: 'AZ100006', applicationId: 'APP-26100902', purpose: 'additional-account', branch: ['A002', 'B011'], scenario: '已有多币种账户及交易；追加账户待补件' },
];
window.CUST_PRICE = {
  AZ100001: { ...window.DEFAULT_CUST_PRICE },
  AZ100006: { ...window.DEFAULT_CUST_PRICE },
};

window.ACCOUNTS = [
  { cust: 'AZ100001', nick: '渣打港币收款', region: '中国香港', bg: '货物贸易', ccy: 'HKD', bank: '渣打银行（香港）', no: 'DEMO-368-001-HKD', status: '正常', ap: 'AP1' },
  { cust: 'AZ100001', nick: '渣打美元收款', region: '中国香港', bg: '货物贸易', ccy: 'USD', bank: '渣打银行（香港）', no: 'DEMO-368-001-USD', status: '正常', ap: 'AP1' },
  { cust: 'AZ100001', nick: '渣打离岸人民币', region: '中国香港', bg: '货物贸易', ccy: 'CNH', bank: '渣打银行（香港）', no: 'DEMO-368-001-CNH', status: '正常', ap: 'AP1' },
  { cust: 'AZ100001', nick: '渣打欧元收款', region: '中国香港', bg: '货物贸易', ccy: 'EUR', bank: '渣打银行（香港）', no: 'DEMO-368-001-EUR', status: '正常', ap: 'AP1' },
  { cust: 'AZ100006', nick: '渣打港币收款', region: '中国香港', bg: '货物贸易', ccy: 'HKD', bank: '渣打银行（香港）', no: 'DEMO-368-006-HKD', status: '正常', ap: 'AP1' },
  { cust: 'AZ100006', nick: '渣打美元收款', region: '中国香港', bg: '货物贸易', ccy: 'USD', bank: '渣打银行（香港）', no: 'DEMO-368-006-USD', status: '正常', ap: 'AP1' },
];
window.BALANCES = { AZ100001: { HKD: { a: 286450.20, f: 0 }, USD: { a: 128930.55, f: 2500 }, CNH: { a: 54210.00, f: 0 }, EUR: { a: 12000, f: 0 } }, AZ100006: { HKD: { a: 185600, f: 0 }, USD: { a: 96400, f: 0 }, CNH: { a: 32000, f: 0 }, EUR: { a: 8500, f: 0 } } };

window.BENEFICIARIES = [
  { id: 'BN1', cust: 'AZ100001', customerId: 'AZ100001', name: 'Demo Shenzhen Supplier 1 Ltd', type: '企业', bank: 'China Merchants Bank Shenzhen', country: '中国内地', ccy: 'CNY', acct: 'DEMO-001 **** 0018', status: '已审核' },
  { id: 'BN3', cust: 'AZ100001', customerId: 'AZ100001', name: 'Star Ocean Electronics Ltd（本人账户）', type: '本人', bank: 'HSBC Hong Kong', country: '中国香港', ccy: 'HKD', acct: 'DEMO-001 **** 0838', status: '已审核' },
  { id: 'BN2', cust: 'AZ100006', customerId: 'AZ100006', name: 'Demo Singapore Logistics 2 Ltd', type: '企业', bank: 'DBS Bank Singapore', country: '新加坡', ccy: 'USD', acct: 'DEMO-006 **** 0331', status: '已审核' },
  { id: 'BN4', cust: 'AZ100006', customerId: 'AZ100006', name: 'Demo Kowloon Packaging 2 Ltd', type: '企业', bank: 'Bank of China (HK)', country: '中国香港', ccy: 'HKD', acct: 'DEMO-006 **** 0776', status: '审核中' },
];

window.APPLICATIONS = [
  { id: 'APP-26100801', customerId: 'AZ100001', custId: 'AZ100001', company: '星海电子科技有限公司', src: '二级链接', owner: 'A001', l2: 'B007', status: '渠道审核中', created: '2026-10-08', docs: 7, risk: '低', revision: 1, purpose: 'additional-account', channel: 'ALLINPAY_HK', productIds: ['AP2'], products: ['AP2'] },
  { id: 'APP-26100902', customerId: 'AZ100006', custId: 'AZ100006', company: '蓝鲸跨境电商有限公司', src: '二级链接', owner: 'A002', l2: 'B011', status: '待补件', created: '2026-10-09', docs: 4, risk: '—', revision: 1, purpose: 'additional-account', channel: 'ALLINPAY_HK', productIds: ['AP2'], products: ['AP2'] },
];
window.APP_FLOW = ['草稿', '待上传', 'OCR 中', '待 CS 补录', '待补件', '待合规审核', '待董事验证', '已提交渠道', '渠道审核中', '已开通'];

window.LINKS = [
  { code: 'HQ-SELF-01', org: 'HQ', tpl: '自营标准价', tag: '官网', uses: 18, exp: '长期', created: '2026-03-01' },
  { code: 'A001-STD', org: 'A001', tpl: '港汇通标准价', tag: '展会 2026', uses: 9, exp: '2026-12-31', created: '2026-04-15' },
  { code: 'A001-VIP', org: 'A001', tpl: '港汇通大客户价', tag: '大客户', uses: 3, exp: '长期', created: '2026-06-01' },
  { code: 'B007-01', org: 'B007', tpl: '（由一级设定）', tag: '微信群', uses: 4, exp: '长期', created: '2026-06-12' },
  { code: 'B008-01', org: 'B008', tpl: '（由一级设定）', tag: 'LinkedIn', uses: 2, exp: '长期', created: '2026-08-02' },
  { code: 'A002-STD', org: 'A002', tpl: '东方跨境标准价', tag: '案例二 · 一级入口', uses: 1, exp: '长期', created: '2026-08-20' },
  { code: 'B011-01', org: 'B011', tpl: '（由一级设定）', tag: '案例二 · 二级入口', uses: 1, exp: '长期', created: '2026-08-28' },
];

window.FEE_REQUESTS = [
  { id: 'FCR-0031', cust: 'AZ100001', prod: 'COLLECT_G', from: 0.25, to: 0.24, by: 'A001 港汇通', sent: '', eff: '', status: '待发送' },
  { id: 'FCR-0033', cust: 'AZ100006', prod: 'VA_OPEN', from: 2000, to: 1800, by: 'A002 东方跨境', sent: '2026-10-10', eff: '', status: '已发送 Allinpay' },
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
  A002: [{ email: 'admin@dfkj.example', name: '东方跨境管理员', role: '管理员', status: '启用', last: '今天 09:10' }],
  B011: [{ email: 'team@gba-out.example', name: '湾区顾问管理员', role: '管理员', status: '启用', last: '今天 09:20' }],
  AZ100006: [{ email: 'finance@bluewhale.example', name: '周小姐（财务）', role: '管理员', status: '启用', last: '今天 09:30' }, { email: 'ap@bluewhale.example', name: '付款操作员', role: '操作员', status: '启用', last: '今天 09:40' }, { email: 'cfo@bluewhale.example', name: '财务覆核员', role: '复核员', status: '启用', last: '今天 09:50' }],
  B007: [{ email: 'chan@chanstudio.example', name: '陈先生', role: '管理员', status: '启用', last: '今天 11:02' }],
  AZ100001: [
    { email: 'finance@starocean.example', name: '李小姐（财务）', role: '管理员', status: '启用', last: '今天 09:30' },
    { email: 'ap@starocean.example', name: '付款专员', role: '操作员', status: '启用', last: '10-11' },
    { email: 'cfo@starocean.example', name: 'CFO', role: '复核员', status: '启用', last: '10-08' },
  ],
};

window.AUDIT = [
  { t: '2026-10-12 16:21', who: 'ops@ganghuitong.example', customerId: 'AZ100001', org: 'A001', what: '提交客户费率申请', obj: 'AZ100001 · COLLECT_G 0.25 → 0.24%', ip: '203.0.113.24' },
  { t: '2026-10-09 09:15', who: 'admin@dfkj.example', customerId: 'AZ100006', org: 'A002', what: '提交追加账户申请', obj: 'APP-26100902 · AZ100006', ip: '198.51.100.9' },
];

// Explicit, small histories keep both customer cases readable and reproducible.
window.TXS = [
  { id: 'T26100101', date: '2026-10-12', time: '2026-10-12 10:20:00', cust: 'AZ100001', type: '入账', prod: 'COLLECT_G', ccy: 'USD', amt: 25000, cp: 'Demo Overseas Buyer 1 Ltd', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100102', date: '2026-10-11', time: '2026-10-11 11:20:00', cust: 'AZ100001', type: '付款', prod: 'PAYOUT_INTL', ccy: 'USD', amt: 2500, cp: 'Demo Singapore Logistics 1 Ltd', status: '处理中', ch: 'ALLINPAY_HK' },
  { id: 'T26100103', date: '2026-10-10', time: '2026-10-10 12:20:00', cust: 'AZ100001', type: '换汇', prod: 'FX', ccy: 'USD', buy: 'HKD', amt: 1000, cp: 'USD → HKD', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100104', date: '2026-10-01', time: '2026-10-01 13:20:00', cust: 'AZ100001', type: '月费', prod: 'VA_MONTHLY', ccy: 'HKD', amt: 0, cp: 'VA 月管理费', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100105', date: '2026-09-01', time: '2026-09-01 14:20:00', cust: 'AZ100001', type: '开户费', prod: 'VA_OPEN', ccy: 'HKD', amt: 0, cp: 'VA 开户（既有账户）', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100602', date: '2026-10-07', time: '2026-10-07 11:40:00', cust: 'AZ100006', type: '付款', prod: 'PAYOUT_HK', ccy: 'HKD', amt: 20000, cp: 'Demo Kowloon Packaging 2 Ltd', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100603', date: '2026-10-06', time: '2026-10-06 12:40:00', cust: 'AZ100006', type: '换汇', prod: 'FX', ccy: 'USD', buy: 'HKD', amt: 2000, cp: 'USD → HKD', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100601', date: '2026-10-12', time: '2026-10-12 10:40:00', cust: 'AZ100006', type: '入账', prod: 'COLLECT_G', ccy: 'USD', amt: 18000, cp: 'Demo Overseas Buyer 2 Ltd', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100604', date: '2026-10-01', time: '2026-10-01 13:40:00', cust: 'AZ100006', type: '月费', prod: 'VA_MONTHLY', ccy: 'HKD', amt: 0, cp: 'VA 月管理费', status: '成功', ch: 'ALLINPAY_HK' },
  { id: 'T26100605', date: '2026-09-05', time: '2026-09-05 14:40:00', cust: 'AZ100006', type: '开户费', prod: 'VA_OPEN', ccy: 'HKD', amt: 0, cp: 'VA 开户（既有账户）', status: '成功', ch: 'ALLINPAY_HK' },
];
