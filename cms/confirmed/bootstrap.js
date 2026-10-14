// Client-confirmed business setup, original snapshot unchanged.
// derive accounts for other opened customers
  CUSTOMERS.filter((c) => c.id !== 'AZ100001').forEach((c, k) => {
    ['HKD', 'USD', 'CNH'].forEach((ccy, j) => ACCOUNTS.push({ cust: c.id, nick: '渣打' + ccy, region: '中国香港', bg: c.bg, ccy, bank: '渣打银行（香港）', no: `368 9${70 + k} ${48100 + k * 37 + j * 8}`, status: c.status === '冻结' ? '冻结' : '正常', ap: 'AP1' }));
  });
  // two transactions where Allinpay actual fee differs from expected (pending fee change)
  const c3 = TXS.filter((t) => t.prod !== 'FX' && t.amt && t.prod.startsWith('COLLECT'));
  if (c3[2]) c3[2].adj = 1.12; if (c3[7]) c3[7].adj = 0.9;
  if (window.Chart) {
    const D = Chart.defaults;
    D.font.family = getComputedStyle(document.body).fontFamily; D.font.size = 12;
    D.elements.bar.borderRadius = 6; D.elements.bar.borderSkipped = false;
    D.elements.line.tension = 0.35; D.elements.point.radius = 0; D.elements.point.hoverRadius = 5;
    D.plugins.legend.labels.usePointStyle = true; D.plugins.legend.labels.pointStyle = 'circle'; D.plugins.legend.labels.boxWidth = 8;
    Object.assign(D.plugins.tooltip, { backgroundColor: 'rgba(29,29,31,.92)', padding: 10, cornerRadius: 10, displayColors: false, titleFont: { weight: '600' }, caretSize: 0 });
    D.interaction = { mode: 'index', intersect: false };
    D.scale.grid.drawTicks = false; D.scale.ticks.padding = 8; D.scale.border = { display: false };
  }
  