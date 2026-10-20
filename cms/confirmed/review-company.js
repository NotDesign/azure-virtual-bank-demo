/* October review: scoped customer profiles, company pricing dialogs and application filters. */
(() => {
  const text = (tc, sc, en) => C(tc, sc, en);
  const entity = c => c.entityType === 'individual' ? 'individual' : 'company';
  const entityLabel = c => entity(c) === 'individual' ? text('個人', '个人', 'Individual') : text('公司', '公司', 'Company');
  const inScope = id => ['hq', 'l1', 'l2'].includes(S.portal) && custsInScope().some(c => c.id === id);
  const canPrice = c => c && !c.profileDraft && inScope(c.id) && (S.portal === 'hq' || S.portal === 'l1' && c.l1 === ME.l1.org);
  const pending = (id, code) => FEE_REQUESTS.filter(r => r.cust === id && r.prod === code && !['已生效', '已取消', '已撤销'].includes(r.status));
  const options = (list, value) => list.map(([v, label]) => `<option value="${E(v)}" ${v === value ? 'selected' : ''}>${E(label)}</option>`).join('');
  const filteredInput = (id, label, value, type = 'text') => `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" type="${type}" value="${E(value || '')}"></div>`;
  let rateContext = null;

  window.openCompanyRateModal = id => {
    const c = cust(id);
    if (!canPrice(c)) return toast(text('此帳號不能調整此客戶的費率。', '此账号不能调整此客户的费率。', 'You cannot adjust this customer’s rates.'));
    rateContext = { id, role: S.portal, org: ME[S.portal].org };
    modal(text('調整費率', '调整费率', 'Adjust rates'), `<section class="review-rate" data-company-id="${E(id)}">
      <div class="review-company-summary"><div><h4>${E(c.name)}</h4><div class="small muted">${E(c.id)} · ${E(c.en || '')}</div></div><div>${ownerLabel(c)}</div></div>
      ${note(text('只調整此客戶。保存後建立待送出的費率申請，渠道確認生效前仍使用現行費率；此 Demo 不會發送資料。', '只调整此客户。保存后建立待发送的费率申请，渠道确认生效前仍使用现行费率；此 Demo 不会发送资料。', 'Changes apply only to this customer. Saving creates pending rate requests; active rates remain until channel confirmation. This demo sends no data.'))}
      <div class="tbl-wrap"><table class="review-rate-table"><thead><tr><th>${text('產品', '产品', 'Product')}</th><th>${text('單位', '单位', 'Unit')}</th><th class="r">${text('最低費率', '最低费率', 'Minimum')}</th><th class="r">${text('現行費率', '现行费率', 'Active rate')}</th><th>${text('新費率', '新费率', 'New rate')}</th><th>${text('申請狀態', '申请状态', 'Request status')}</th></tr></thead><tbody>${PRODUCTS.map(p => {
        const requests = pending(id, p.code), r = requests[0], locked = requests.some(x => x.status !== '待发送'), floor = floorOf(c, p.code);
        return `<tr><td class="bold">${E(I18N.tr(p.name))}<div class="small muted mono">${p.code}</div></td><td>${E(UNIT_LABEL[p.unit])}</td><td class="r">${priceStr(p.code, floor)}</td><td class="r">${priceStr(p.code, CUST_PRICE[id][p.code])}</td><td><label class="sr-only" for="review-rate-${p.code}">${E(I18N.tr(p.name))}</label><input id="review-rate-${p.code}" class="input" type="number" inputmode="decimal" min="${floor}" step="${p.unit === 'pct' ? '0.01' : p.unit === 'bps' ? '0.1' : '1'}" required data-review-rate="${p.code}" value="${r ? r.to : CUST_PRICE[id][p.code]}" ${locked ? 'disabled' : ''}><small class="review-field-error" data-error-for="${p.code}"></small></td><td>${r ? statusBadge(r.status) : '—'}${locked ? `<div class="small muted">${text('待渠道確認，暫不可重複申請', '待渠道确认，暂不可重复申请', 'Awaiting channel confirmation')}</div>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>
      <div class="field mt"><label for="review-rate-reason">${text('調整備註（選填）', '调整备注（选填）', 'Reason (optional)')}</label><textarea class="input" id="review-rate-reason" maxlength="300"></textarea></div><p class="review-field-error" id="review-rate-error" role="alert"></p></section>`,
      `<button class="btn" onclick="custDetail('${id}')">${text('返回客戶資料', '返回客户资料', 'Back to customer')}</button><button class="btn primary" id="review-save-rates" onclick="saveCompanyRates()">${text('保存費率申請', '保存费率申请', 'Save rate requests')}</button>`, true);
  };

  window.saveCompanyRates = () => {
    const context = rateContext, section = document.querySelector('.review-rate');
    if (!context || !section || section.dataset.companyId !== context.id || context.role !== S.portal || context.org !== ME[S.portal].org || !canPrice(cust(context.id))) return;
    const c = cust(context.id), errors = [], changes = [];
    section.querySelectorAll('[data-review-rate]').forEach(input => {
      const code = input.dataset.reviewRate, p = prod(code), floor = floorOf(c, code), value = Number(input.value), requests = pending(c.id, code);
      const invalid = !input.value.trim() || !Number.isFinite(value) || value < floor || value < 0 || !input.checkValidity();
      const msg = invalid ? text(`請填寫不低於 ${priceStr(code, floor)} 的有效費率。`, `请填写不低于 ${priceStr(code, floor)} 的有效费率。`, `Enter a valid rate of at least ${priceStr(code, floor)}.`) : '';
      input.classList.toggle('bad', !input.disabled && invalid);input.setAttribute('aria-invalid', String(!input.disabled && invalid));
      section.querySelector(`[data-error-for="${code}"]`).textContent = input.disabled ? '' : msg;
      if (input.disabled) return;
      if (invalid) errors.push(input);
      else if (requests.some(r => r.status !== '待发送')) errors.push(input);
      else if (value !== CUST_PRICE[c.id][p.code] || requests.length) changes.push({ code, value, requests });
    });
    const err = section.querySelector('#review-rate-error');
    if (errors.length) { err.textContent = text('請修正標示的費率後再保存。', '请修正标示的费率后再保存。', 'Correct the highlighted rates before saving.');errors[0].focus();return; }
    if (!changes.length) { err.textContent = text('費率沒有變更。', '费率没有变更。', 'No rates have changed.');return; }
    let count = 0;
    changes.forEach(({ code, value, requests }) => {
      const active = CUST_PRICE[c.id][code], reason = section.querySelector('#review-rate-reason').value.trim();
      if (value === active) { requests.forEach(r => { r.status = '已取消'; });count += requests.length;return; }
      const existing = requests[0];
      if (existing) {
        if (existing.to !== value || reason && existing.reason !== reason) {
          count++;existing.to = value;if (reason) existing.reason = reason;existing.by = ME[S.portal].email;
        }
        requests.slice(1).forEach(r => { r.status = '已取消';count++; });
      } else {
        const next = Math.max(33, ...FEE_REQUESTS.map(r => Number(r.id.replace(/^FCR-/, '')) || 0)) + 1;
        FEE_REQUESTS.unshift({ id: 'FCR-' + String(next).padStart(4, '0'), cust: c.id, prod: code, from: active, to: value, by: ME[S.portal].email, sent: '', eff: '', status: '待发送', reason });count++;
      }
    });
    if (!count) { err.textContent = text('待處理申請沒有變更。', '待处理申请没有变更。', 'Pending requests are unchanged.');return; }
    modal(text('費率申請已保存', '费率申请已保存', 'Rate requests saved'), `<div class="review-rate-result" data-company-id="${E(c.id)}"><h4>${E(c.name)}</h4><p>${text(`已更新 ${count} 項申請。現行費率維持不變。`, `已更新 ${count} 项申请。现行费率维持不变。`, `${count} requests updated. Active rates are unchanged.`)}</p><div class="tbl-wrap"><table><thead><tr><th>${text('產品', '产品', 'Product')}</th><th>${text('新費率', '新费率', 'Requested rate')}</th><th>${text('狀態', '状态', 'Status')}</th></tr></thead><tbody>${FEE_REQUESTS.filter(r => r.cust === c.id && r.status === '待发送').map(r => `<tr><td>${E(I18N.tr(prod(r.prod).name))}</td><td>${priceStr(r.prod, r.to)}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}</tbody></table></div></div>`, `<button class="btn primary" onclick="custDetail('${c.id}')">${text('返回客戶資料', '返回客户资料', 'Back to customer')}</button>`, true);
  };

  // All customer-pricing entry points use the same scoped dialog and validation.
  custPriceBlock = function(id, list) {
    const customers = (S.portal === 'hq' ? custsInScope() : list).filter(canPrice);
    const c = customers.find(c => c.id === S.ui.pc) || customers.find(c => c.id === id) || customers[0];
    if (!c) return `<div class="empty">${text('目前沒有可調整費率的已開通客戶。', '目前没有可调整费率的已开通客户。', 'No opened customer is available for rate adjustment.')}</div>`;
    return `<div class="toolbar review-pricing-toolbar"><div class="field"><label for="review-pricing-customer">${text('客戶', '客户', 'Customer')}</label><select class="select" id="review-pricing-customer" onchange="setUI('pc',this.value)">${options(customers.map(c => [c.id, c.id + ' · ' + I18N.tr(c.name)]), c.id)}</select></div><button class="btn primary" onclick="openCompanyRateModal('${c.id}')">${text('調整費率', '调整费率', 'Adjust rates')}</button></div><div class="tbl-wrap"><table><thead><tr><th>${text('產品', '产品', 'Product')}</th><th class="r">${text('最低費率', '最低费率', 'Minimum rate')}</th><th class="r">${text('現行費率', '现行费率', 'Active rate')}</th><th>${text('待處理申請', '待处理申请', 'Pending requests')}</th></tr></thead><tbody>${PRODUCTS.map(p => `<tr><td>${E(I18N.tr(p.name))}</td><td class="r">${priceStr(p.code, floorOf(c, p.code))}</td><td class="r">${priceStr(p.code, CUST_PRICE[c.id][p.code])}</td><td>${pending(c.id, p.code).map(r => `${priceStr(p.code, r.to)} ${statusBadge(r.status)}`).join(' ') || '—'}</td></tr>`).join('')}</tbody></table></div>`;
  };
  saveCustPrice = id => openCompanyRateModal(id);

  custDetail = function(id) {
    if (!inScope(id)) return toast(text('此客戶不在帳號範圍內。', '此客户不在账号范围内。', 'This customer is outside your scope.'));
    const c = cust(id), accs = ACCOUNTS.filter(a => a.cust === id);
    modal(E(c.name), `<div class="review-customer-detail"><dl class="kv"><dt>${text('客戶類型', '客户类型', 'Customer type')}</dt><dd>${entityLabel(c)}</dd><dt>${text('客戶號', '客户号', 'Customer ID')}</dt><dd class="mono">${E(c.id)}</dd><dt>${text('英文名稱', '英文名称', 'English name')}</dt><dd>${E(c.en || '—')}</dd><dt>${text('渠道商戶號', '渠道商户号', 'Channel merchant ID')}</dt><dd>${c.chId && c.chId !== '—' ? 'Allinpay ' + E(c.chId) : '—'}</dd><dt>${text('歸屬', '归属', 'Owner')}</dt><dd>${ownerLabel(c)}</dd><dt>${text('狀態', '状态', 'Status')}</dt><dd>${statusBadge(c.status)} ${frzBadge(c, 'c')}${c.frz ? `<div class="small muted">${E(c.frz.scopes.map(k => scopeName('c', k)).join('、'))} · ${E(c.frz.reason)} · ${E(c.frz.t)}</div>` : ''}</dd>${c.contact || c.email ? `<dt>${text('聯絡資料', '联系资料', 'Contact')}</dt><dd>${E(c.contact || '')}<div>${E(c.email || '')}</div><div>${E(c.phone || '')}</div></dd>` : ''}${openDR('c', id).length ? `<dt>${text('調單', '调单', 'Document requests')}</dt><dd>${openDR('c', id).map(d => `<button class="btn sm" onclick="drDetail('${d.id}')">${E(d.id)}</button> ${statusBadge(d.status)}`).join(' ')}</dd>` : ''}</dl>
      ${c.profileDraft ? note(text('此為本次 Demo 建立的客戶資料草稿，尚未開戶、認證或產生資金。', '此为本次 Demo 建立的客户资料草稿，尚未开户、认证或产生资金。', 'This session-only customer profile is a draft. No account, identity verification or funds have been created.')) : ''}
      <section><h4>${text('收款帳戶', '收款账户', 'Collection accounts')}</h4>${accs.length ? `<div class="tbl-wrap"><table><thead><tr><th>${text('銀行', '银行', 'Bank')}</th><th>${text('幣種', '币种', 'Currency')}</th><th>${text('帳戶號', '账户号', 'Account number')}</th><th>${text('狀態', '状态', 'Status')}</th></tr></thead><tbody>${accs.map(a => `<tr><td>${E(a.bank)}</td><td>${E(a.ccy)}</td><td class="mono">${E(a.no)}</td><td>${statusBadge(a.status)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${text('尚無帳戶', '尚无账户', 'No accounts')}</p>`}</section>
      ${!c.profileDraft ? `<section><h4>${text('現行費率（已生效）', '现行费率（已生效）', 'Active rates')}</h4><div class="tbl-wrap"><table><tbody>${PRODUCTS.map(p => `<tr><td>${E(I18N.tr(p.name))}</td><td class="r">${priceStr(p.code, CUST_PRICE[id][p.code])}</td></tr>`).join('')}</tbody></table></div></section>` : ''}</div>`,
      `${canPrice(c) ? `<button class="btn" id="review-adjust-rates" onclick="openCompanyRateModal('${id}')">${text('調整費率', '调整费率', 'Adjust rates')}</button>` : ''}${c.profileDraft ? `<button class="btn" onclick="reviewCustomerProfile('${id}')">${text('編輯資料', '编辑资料', 'Edit profile')}</button>` : ''}${S.portal === 'hq' && !c.profileDraft ? `<button class="btn" onclick="closeModal();reassignCust('${id}')">${text('重新分配代理', '重新分配代理', 'Reassign agent')}</button>${ctrlBtns('c', id, false)}` : ''}${S.portal === 'l1' && !c.profileDraft && c.l1 === ME.l1.org ? `<button class="btn" onclick="closeModal();reassignL2('${id}')">${text('重新分配二級代理', '重新分配二级代理', 'Reassign Level 2')}</button>` : ''}<button class="btn primary" onclick="closeModal()">${text('關閉', '关闭', 'Close')}</button>`, true);
  };

  PAGES['*:customers'] = () => {
    const kind = S.ui.reviewEntity || 'all', q = String(S.ui.q || '').trim().toLocaleLowerCase(), own = S.ui.own || '';
    let list = custsInScope().filter(c => (kind === 'all' || entity(c) === kind) && (!q || [c.name, I18N.tr(c.name), c.en, c.id, c.contact, c.email].join(' ').toLocaleLowerCase().includes(q)));
    if (own && own !== '全部') list = list.filter(c => own === 'self' || own === '自营' ? !c.l1 : c.l1 === own || c.l2 === own);
    const owners = S.portal === 'hq' ? AGENTS : S.portal === 'l1' ? AGENTS.filter(a => a.parent === ME.l1.org) : [];
    const applyAllowed = S.portal !== 'l2' || agent(ME.l2.org).proxyApply;
    return head(S.portal === 'hq' ? '客户管理' : '我的客户', text('管理個人及公司客戶資料；只顯示本帳號歸屬範圍。', '管理个人及公司客户资料；只显示本账号归属范围。', 'Manage individual and company customer profiles within your assigned scope.'), `<button class="btn" onclick="reviewCustomerProfile()">${ICON.plus} ${text('新增客戶資料', '新增客户资料', 'New customer profile')}</button>${applyAllowed ? `<button class="btn primary" onclick="go('${S.portal}','apply')">${ICON.plus} ${S.portal === 'hq' ? '代客录入' : '代客申请'}</button>` : ''}`) +
      `<div class="card review-customers"><div class="toolbar review-entity-toolbar"><div class="chip-row" role="group" aria-label="${text('客戶類型', '客户类型', 'Customer type')}">${[['all', text('全部', '全部', 'All')], ['company', text('公司客戶', '公司客户', 'Company')], ['individual', text('個人客戶', '个人客户', 'Individual')]].map(([k, label]) => `<button class="chip ${kind === k ? 'on' : ''}" data-entity="${k}" aria-pressed="${kind === k}" onclick="setUI('reviewEntity','${k}')">${label}</button>`).join('')}</div><span class="muted small">${text(`共 ${list.length} 位客戶`, `共 ${list.length} 位客户`, `${list.length} customers`)}</span></div>
      <form class="review-filters" id="review-customer-filters" onsubmit="event.preventDefault();reviewCustomerFilter()"><div class="field"><label for="review-customer-query">${text('搜尋客戶', '搜索客户', 'Find customer')}</label><input class="input" type="search" id="review-customer-query" placeholder="${text('名稱、客戶號或電郵', '名称、客户号或电邮', 'Name, customer ID or email')}" value="${E(S.ui.q || '')}"></div>${owners.length ? `<div class="field"><label for="review-customer-owner">${text('歸屬', '归属', 'Owner')}</label><select class="select" id="review-customer-owner">${options([['', text('全部歸屬', '全部归属', 'All owners')], ...(S.portal === 'hq' ? [['self', text('自營', '自营', 'Direct')]] : []), ...owners.map(a => [a.id, a.id + ' · ' + I18N.tr(a.name)])], own)}</select></div>` : ''}<div class="btn-row"><button class="btn primary" type="submit">${text('篩選', '筛选', 'Filter')}</button><button class="btn" type="button" onclick="reviewClearCustomerFilters()">${text('清除', '清除', 'Clear')}</button></div></form>
      <div class="tbl-wrap"><table><thead><tr><th>${text('客戶 / 客戶號', '客户 / 客户号', 'Customer / ID')}</th><th>${text('類型', '类型', 'Type')}</th><th>${text('歸屬', '归属', 'Owner')}</th><th>${text('業務背景', '业务背景', 'Business')}</th><th class="r">${text('本月交易額', '本月交易额', 'Monthly volume')}</th><th class="r">${text('本月費用', '本月费用', 'Monthly fees')}</th><th>${text('開通日期', '开通日期', 'Opened')}</th><th>${text('狀態', '状态', 'Status')}</th><th>${text('操作', '操作', 'Actions')}</th></tr></thead><tbody>${list.map(c => {
        const mt = TXS.filter(t => t.cust === c.id && t.date.startsWith(MONTH));
        return `<tr data-review-customer="${E(c.id)}"><td class="review-name"><b>${E(c.name)}</b><div class="small muted mono">${E(c.id)}</div><div class="small muted">${E(c.en || '')}</div></td><td>${entityLabel(c)}</td><td>${ownerLabel(c)}</td><td>${E(c.bg)}</td><td class="r">${nf(mt.filter(t => t.amt).reduce((a, t) => a + volH(t), 0), 0)}</td><td class="r">${nf(mt.reduce((a, t) => a + split(t).actual, 0))}</td><td>${E(c.opened)}</td><td>${statusBadge(c.frz && c.status === '冻结' ? '已开通' : c.status)} ${frzBadge(c, 'c')}</td><td><div class="row-acts"><button class="btn sm" onclick="custDetail('${c.id}')">${text('詳情', '详情', 'Details')}</button>${S.portal === 'hq' && !c.profileDraft ? `<button class="btn sm" onclick="${c.frz ? 'unfreezeModal' : 'freezeModal'}('c','${c.id}')">${c.frz ? text('解凍', '解冻', 'Unfreeze') : text('凍結', '冻结', 'Freeze')}</button><button class="btn sm" onclick="docReqModal('c','${c.id}')">${text('調單', '调单', 'Request documents')}</button>` : ''}</div></td></tr>`;
      }).join('') || `<tr><td colspan="9" class="empty">${text('沒有符合的客戶，可清除篩選或新增客戶資料。', '没有符合的客户，可清除筛选或新增客户资料。', 'No matching customers. Clear the filters or create a profile.')}</td></tr>`}</tbody></table></div></div>`;
  };
  window.reviewCustomerFilter = () => { S.ui.q = $('#review-customer-query').value;S.ui.own = $('#review-customer-owner')?.value || '';render(); };
  window.reviewClearCustomerFilters = () => { delete S.ui.q;delete S.ui.own;delete S.ui.reviewEntity;render(); };
  window.reviewCustomerProfile = (id = '') => {
    if (!['hq', 'l1', 'l2'].includes(S.portal) || id && (!inScope(id) || !cust(id).profileDraft)) return;
    const c = id ? cust(id) : {}, kind = c.entityType || (S.ui.reviewEntity === 'individual' ? 'individual' : 'company');
    modal(text('客戶資料', '客户资料', 'Customer profile'), `<form id="review-profile" data-customer-id="${E(id)}" data-role="${S.portal}" onsubmit="event.preventDefault();reviewSaveCustomerProfile()"><div class="form-grid"><div class="field"><label for="review-profile-type">${text('客戶類型', '客户类型', 'Customer type')}</label><select class="select" id="review-profile-type">${options([['company', text('公司客戶', '公司客户', 'Company')], ['individual', text('個人客戶', '个人客户', 'Individual')]], kind)}</select></div>${filteredInput('review-profile-name', text('姓名 / 公司名稱', '姓名 / 公司名称', 'Full name / Company name'), c.name)}${filteredInput('review-profile-en', text('英文名稱（選填）', '英文名称（选填）', 'English name (optional)'), c.en)}${filteredInput('review-profile-contact', text('聯絡人', '联系人', 'Contact person'), c.contact)}${filteredInput('review-profile-email', text('聯絡電郵', '联系电邮', 'Contact email'), c.email, 'email')}${filteredInput('review-profile-phone', text('電話（選填）', '电话（选填）', 'Phone (optional)'), c.phone, 'tel')}${filteredInput('review-profile-bg', text('業務背景（選填）', '业务背景（选填）', 'Business background (optional)'), c.bg)}</div>${note(text('新增資料只建立待完善的客戶草稿，歸屬自動依目前帳號帶入，不會開戶或跳過認證。資料只保留於本次 Demo 瀏覽期間。', '新增资料只建立待完善的客户草稿，归属自动依目前账号带入，不会开户或跳过认证。资料只保留于本次 Demo 浏览期间。', 'Creates a draft in your assigned scope without opening an account or bypassing verification. Profiles remain in this demo session only.'))}<p class="review-field-error" id="review-profile-error" role="alert"></p></form>`, `<button class="btn" onclick="closeModal()">${text('取消', '取消', 'Cancel')}</button><button class="btn primary" onclick="reviewSaveCustomerProfile()">${text('保存資料', '保存资料', 'Save profile')}</button>`);
    ['name', 'contact', 'email'].forEach(key => { const input = $('#review-profile-' + key);input.required = true;input.maxLength = 160; });
  };
  window.reviewSaveCustomerProfile = () => {
    const form = $('#review-profile');if (!form || form.dataset.role !== S.portal || !['hq', 'l1', 'l2'].includes(S.portal)) return;
    const value = key => $('#review-profile-' + key).value.trim(), id = form.dataset.customerId;
    if (id && (!inScope(id) || !cust(id).profileDraft)) return;
    if (!form.reportValidity() || ['name', 'contact', 'email'].some(k => !value(k))) { $('#review-profile-error').textContent = text('請填寫姓名／公司、聯絡人和有效電郵。', '请填写姓名／公司、联系人和有效电邮。', 'Enter a name/company, contact person and valid email.');return; }
    const update = { entityType: value('type'), name: value('name'), en: value('en'), contact: value('contact'), email: value('email'), phone: value('phone'), bg: value('bg') || '—' };
    if (Object.values(update).some(v => /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))) { $('#review-profile-error').textContent = text('請使用一般文字，不要輸入 HTML 標記或控制字元。', '请使用一般文字，不要输入 HTML 标记或控制字符。', 'Use plain text without HTML markup or control characters.');return; }
    let c = id ? cust(id) : null;
    if (c) Object.assign(c, update);
    else {
      const next = Math.max(100009, ...CUSTOMERS.map(x => Number(x.id.replace(/^AZ/, '')) || 0)) + 1;
      const l1 = S.portal === 'l1' ? ME.l1.org : S.portal === 'l2' ? agent(ME.l2.org).parent : null, l2 = S.portal === 'l2' ? ME.l2.org : null;
      c = { id: 'AZ' + next, ...update, l1, l2, status: '待完善', opened: '—', chId: '—', profileDraft: true };CUSTOMERS.push(c);
      CUST_PRICE[c.id] = Object.fromEntries(PRODUCTS.map(p => [p.code, Math.max(DEFAULT_CUST_PRICE[p.code], floorOf(c, p.code))]));
    }
    S.ui.reviewEntity = entity(c);delete S.ui.q;delete S.ui.own;closeModal();render();custDetail(c.id);
  };

  PAGES['*:apps'] = () => {
    const P = S.portal, f = S.ui.as || '全部', all = appsInScope(), u = S.ui.reviewAppFilters || {}, query = (u.q || '').trim().toLocaleLowerCase();
    const list = all.filter(a => (f === '全部' || a.status === f) && (!query || [a.id, a.company, I18N.tr(a.company)].join(' ').toLocaleLowerCase().includes(query)) && (!u.src || a.src === u.src) && (!u.owner || (u.owner === 'self' ? !a.owner : a.owner === u.owner || a.l2 === u.owner)) && (!u.from || a.created >= u.from) && (!u.to || a.created <= u.to));
    const sts = ['全部', 'OCR 中', '待 CS 补录', '待补件', '待合规审核', '待董事验证', '渠道审核中', '已开通', '渠道驳回'];
    const owners = AGENTS.filter(a => all.some(r => r.owner === a.id || r.l2 === a.id)), sources = [...new Set(all.map(a => a.src))];
    return head(P === 'hq' ? '开户申请工作台' : '申请进度', P === 'hq' ? '所有来源的申请：链接、QR、代客录入、代理代申请' : '查看名下申请的进度（看不到合规内部备注）', P === 'l2' && !agent(ME.l2.org).proxyApply ? '' : `<button class="btn primary" onclick="go('${P}','apply')">${ICON.plus} ${P === 'hq' ? '代客录入' : '代客申请'}</button>`) +
      `<div class="card review-applications"><div class="toolbar"><div class="chip-row">${sts.map(t => `<button class="chip ${t === f ? 'on' : ''}" onclick="setUI('as','${t}')">${I18N.tr(t)}</button>`).join('')}</div></div><form id="review-app-filters" class="review-filters" onsubmit="event.preventDefault();reviewApplyAppFilters()">${filteredInput('review-app-query', text('搜尋申請', '搜索申请', 'Find application'), u.q)}<div class="field"><label for="review-app-source">${text('來源', '来源', 'Source')}</label><select class="select" id="review-app-source">${options([['', text('全部來源', '全部来源', 'All sources')], ...sources.map(s => [s, I18N.tr(s)])], u.src || '')}</select></div><div class="field"><label for="review-app-owner">${text('歸屬', '归属', 'Owner')}</label><select class="select" id="review-app-owner">${options([['', text('全部歸屬', '全部归属', 'All owners')], ...(all.some(a => !a.owner) ? [['self', text('自營', '自营', 'Direct')]] : []), ...owners.map(a => [a.id, a.id + ' · ' + I18N.tr(a.name)])], u.owner || '')}</select></div>${filteredInput('review-app-from', text('建立日期（由）', '创建日期（从）', 'Created from'), u.from, 'date')}${filteredInput('review-app-to', text('建立日期（至）', '创建日期（至）', 'Created to'), u.to, 'date')}<div class="btn-row"><button class="btn primary" type="submit">${text('篩選', '筛选', 'Filter')}</button><button class="btn" type="button" onclick="reviewClearAppFilters()">${text('清除', '清除', 'Clear')}</button></div><p class="review-field-error" id="review-app-error" role="alert"></p></form><div class="review-result-count small muted" role="status">${text(`顯示 ${list.length} / ${all.length} 筆申請`, `显示 ${list.length} / ${all.length} 笔申请`, `Showing ${list.length} of ${all.length} applications`)}</div>
      <div class="tbl-wrap"><table><thead><tr><th>申请号</th><th>公司</th><th>来源</th><th>归属</th><th class="r">文件</th><th>风险</th><th>创建</th><th>状态</th><th>操作</th></tr></thead><tbody>${list.map(a => `<tr data-review-application="${E(a.id)}"><td class="mono">${E(a.id)}</td><td class="bold">${E(a.company)}</td><td>${E(I18N.tr(a.src))}</td><td class="small">${a.owner ? E(I18N.tr(agent(a.owner).name)) + (a.l2 ? '<div class="muted">↳ ' + E(I18N.tr(agent(a.l2).name)) + '</div>' : '') : text('自營', '自营', 'Direct')}</td><td class="r">${a.docs}/7</td><td>${E(a.risk)}</td><td>${E(a.created)}</td><td>${statusBadge(a.status)}</td><td><a class="btn sm" href="#/${P}/app/${a.id}">${P === 'hq' && ['待 CS 补录', '待合规审核', 'OCR 中', '待补件'].includes(a.status) ? text('處理', '处理', 'Process') : text('查看', '查看', 'View')}</a></td></tr>`).join('') || `<tr><td colspan="9" class="empty">${text('沒有符合篩選條件的申請', '没有符合筛选条件的申请', 'No matching applications')}</td></tr>`}</tbody></table></div></div>`;
  };
  window.reviewApplyAppFilters = () => {
    const from = $('#review-app-from').value, to = $('#review-app-to').value;
    if (from && to && from > to) { $('#review-app-error').textContent = text('開始日期不能晚於結束日期。', '开始日期不能晚于结束日期。', 'The start date cannot be after the end date.');return; }
    S.ui.reviewAppFilters = { q: $('#review-app-query').value, src: $('#review-app-source').value, owner: $('#review-app-owner').value, from, to };render();
  };
  window.reviewClearAppFilters = () => { delete S.ui.reviewAppFilters;delete S.ui.as;render(); };
})();
