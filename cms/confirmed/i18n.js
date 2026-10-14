// ===================== 语言：繁 / 简 / EN（运行时翻译层） =====================
// 源码以简体中文编写；切换到繁体或英文时，渲染后的文本节点和属性会被替换。
(function () {
  const CJK = /[\u4e00-\u9fff]/;
  const LANGS = { 'zh-Hant': '繁', 'zh-Hans': '简', en: 'EN' };
  let lang = 'zh-Hans';
  if (!LANGS[lang]) lang = 'zh-Hans';
  const packs = {};
  function compile(L) {
    if (packs[L]) return packs[L];
    const src = L === 'en' ? window.I18N_EN || {} : (window.I18N_HANT || {}).d || {};
    const exact = new Map(), tpls = [];
    for (let [k, v] of Object.entries(src)) {
      if (/\{\d+\}/.test(k)) {
        while (/\{(\d+)\}\s*\{(\d+)\}/.test(k)) { const mm = /\{(\d+)\}\s*\{(\d+)\}/.exec(k); k = k.replace(mm[0], `{${mm[1]}}`); v = v.replace(new RegExp(`\\{${mm[1]}\\}\\s*\\{${mm[2]}\\}`), `{${mm[1]}}`).replace(`{${mm[2]}}`, ''); }
        const parts = k.split(/\{(\d+)\}/);
        let re = '^', idx = [], lits = [];
        parts.forEach((p, i) => { if (i % 2) { re += '(.+?)'; idx.push(+p); } else { re += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*'); if (p.trim()) lits.push(p.trim()); } });
        if (!lits.length) continue;
        if (lits.length === 1 && !exact.has(lits[0]) && !src[lits[0]]) { const vv = v.replace(/\{\d+\}/g, '').replace(/\s{2,}/g, ' ').trim(); if (vv && !/[（(]\s*[)）]|[:：]\s*$/.test(vv)) exact.set(lits[0], vv); }
        tpls.push({ re: new RegExp(re + '$', 's'), idx, v, lits, len: lits.join('').length });
      } else exact.set(k, v);
    }
    tpls.sort((a, b) => b.len - a.len);
    if (L === 'en') (window.CUSTOMERS || []).forEach((c) => c.en && exact.set(c.name, c.en));
    const phr = [...exact.keys()].filter((k) => k.length >= 2 && CJK.test(k)).sort((a, b) => b.length - a.length);
    const phrRe = phr.length ? new RegExp(phr.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
    const cmap = L === 'zh-Hant' ? (window.I18N_HANT || {}).c || {} : null;
    return (packs[L] = { exact, tpls, phrRe, cmap, cache: new Map() });
  }
  function trCore(s, P, depth = 0) {
    if (!CJK.test(s)) return s;
    if (P.exact.has(s)) return P.exact.get(s);
    if (P.cache.has(s)) return P.cache.get(s);
    let out = null;
    if (depth < 3) for (const t of P.tpls) {
      if (!t.lits.every((l) => s.includes(l))) continue;
      const m = t.re.exec(s); if (!m) continue;
      out = t.v.replace(/\{(\d+)\}/g, (_, n) => { const g = m[t.idx.indexOf(+n) + 1]; return g === undefined ? '' : trCore(g.trim(), P, depth + 1); });
      break;
    }
    if (out === null && depth < 3) for (const t of P.tpls) {
      if (t.len < 6 || t.re.source.endsWith('(.+?)$') || !t.lits.every((l) => s.includes(l))) continue;
      if (!t.re2) t.re2 = new RegExp(t.re.source.replace(/\$$/, ''), 's');
      const m = t.re2.exec(s); if (!m || !m[0]) continue;
      const head = t.v.replace(/\{(\d+)\}/g, (_, n) => { const g = m[t.idx.indexOf(+n) + 1]; return g === undefined ? '' : trCore(g.trim(), P, depth + 1); });
      const rest = s.slice(m[0].length).trim();
      out = head + (rest ? ' ' + trCore(rest, P, depth + 1) : '');
      break;
    }
    if (out === null) {
      out = P.phrRe ? s.replace(P.phrRe, (k) => P.exact.get(k)) : s;
      if (lang === 'en') out = out.replace(/([a-z)])([A-Z][a-z])/g, '$1 $2').replace(/\s{2,}/g, ' ').replace(/([\u3000-\u303f\uff00-\uffef])/g, (c) => ({ '，': ', ', '。': '. ', '：': ': ', '；': '; ', '（': ' (', '）': ')', '、': ', ', '！': '!', '？': '?' }[c] || c)).trim();
      if (P.cmap) out = out.replace(/[\u4e00-\u9fff]/g, (c) => P.cmap[c] || c);
    }
    if (lang === 'en' && typeof out === 'string') out = out.replace(/([A-Za-z])\(/g, '$1 (').replace(/:(?=[A-Za-z])/g, ': ');
    P.cache.set(s, out);
    return out;
  }
  function tr(s) {
    if (lang === 'zh-Hans' || !s || !CJK.test(s)) return s;
    const P = compile(lang), m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    return m[1] + trCore(m[2].replace(/\s+/g, ' '), P) + m[3];
  }
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function skip(n) { const p = n.nodeType === 3 ? n.parentElement : n; return !p || p.closest('[data-notr],script,style'); }
  function trNode(root) {
    if (lang === 'zh-Hans' || !root) return;
    if (root.nodeType === 3) { if (!skip(root) && CJK.test(root.nodeValue)) fixText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null); let n; const list = [];
    while ((n = w.nextNode())) if (CJK.test(n.nodeValue) && !skip(n)) list.push(n);
    list.forEach(fixText);
    const els = [root, ...root.querySelectorAll('[placeholder],[title],[aria-label],[alt]')];
    [root, ...root.querySelectorAll('input[readonly],input[disabled]')].forEach((el) => { if (el.tagName === 'INPUT' && (el.readOnly || el.disabled) && CJK.test(el.value)) el.value = tr(el.value); });
    els.forEach((el) => ATTRS.forEach((a) => { const v = el.getAttribute && el.getAttribute(a); if (v && CJK.test(v)) el.setAttribute(a, tr(v)); }));
  }
  function fixText(n) {
    const p = n.parentElement;
    if (p && p.tagName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', p.textContent);
    if (lang === 'en' && p && p.closest('.btn,.link')) { const k = n.nodeValue.trim(), B = window.I18N_EN_BTN || {}, mm = /^(.*?)\s*(\d+)$/.exec(k); if (B[k]) { n.nodeValue = n.nodeValue.replace(k, B[k]); return; } if (mm && B[mm[1]]) { n.nodeValue = n.nodeValue.replace(k, B[mm[1]] + ' · ' + mm[2]); return; } }
    n.nodeValue = tr(n.nodeValue);
    if (lang === 'en') { const ps = n.previousSibling, ns = n.nextSibling;
      if (ps && ps.nodeType === 1 && /^[A-Za-z(]/.test(n.nodeValue) && /[.:)”"A-Za-z0-9]$/.test(ps.textContent || '')) n.nodeValue = ' ' + n.nodeValue;
      if (ns && ns.nodeType === 1 && /[A-Za-z0-9.,:;)]$/.test(n.nodeValue) && /^[A-Za-z0-9(\u4e00-\u9fff]/.test(ns.textContent || '') && !/^(svg|input|select|textarea|br)$/i.test(ns.tagName)) n.nodeValue = n.nodeValue + ' '; }
  }
  const mo = new MutationObserver((ms) => { if (lang === 'zh-Hans') return; ms.forEach((m) => m.addedNodes.forEach(trNode)); });
  function applyDoc() {
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'zh-Hant' ? 'zh-HK' : 'zh-CN';
    if (!document._t0) document._t0 = document.title; document.title = tr(document._t0);
  }
  window.I18N = {
    get lang() { return lang; },
    tr,
    set(l) { if (!LANGS[l] || l === lang) return; lang = l; applyDoc(); if (typeof closeModal === 'function') closeModal(); render(); },
    switcher() { return `<div class="lang-seg" data-notr role="group" aria-label="Language">${Object.entries(LANGS).map(([k, v]) => `<button class="${k === lang ? 'on' : ''}" onclick="I18N.set('${k}')" ${k === lang ? 'aria-pressed="true"' : ''}>${v}</button>`).join('')}</div>`; },
    run: () => trNode(document.body),
  };
  document.addEventListener('DOMContentLoaded', () => { applyDoc(); mo.observe(document.body, { childList: true, subtree: true }); trNode(document.body); });
  // translate chart labels (canvas text is not in the DOM)
  if (window.Chart) {
    const C0 = window.Chart;
    const deep = (o) => { if (Array.isArray(o)) return o.map((x) => (typeof x === 'string' ? tr(x) : deep(x))); if (o && typeof o === 'object' && !(o instanceof HTMLElement) && !(o instanceof CanvasRenderingContext2D)) { for (const k of Object.keys(o)) { if (k === 'label' || k === 'labels' || k === 'text' || k === 'title') o[k] = typeof o[k] === 'string' ? tr(o[k]) : deep(o[k]); else if (k === 'data' || k === 'options' || k === 'datasets' || k === 'plugins' || k === 'scales' || /^[xy]$/.test(k)) deep(o[k]); } } return o; };
    class C extends C0 { constructor(ctx, cfg) { if (lang !== 'zh-Hans') deep(cfg); super(ctx, cfg); } }
    window.Chart = C;
  }
})();
