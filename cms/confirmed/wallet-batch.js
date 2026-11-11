/* USDT batch-payment Demo interface. Accounting is owned by AzureWallets.operations.batch. */
(() => {
  'use strict';
  const T = (tc, sc, en) => C(tc, sc, en), esc = value => E(value), SCALE = 1000000;
  const drafts = new Map(), HEADER = ['recipient', 'address', 'network', 'amount', 'memo'];
  let flow = null, replacing = false, suspended = false, opener = null;
  const operations = () => window.AzureWallets?.operations;
  const engine = () => operations()?.batch;
  const config = () => operations()?.config() || { maxRows: 50, scale: SCALE, demoCode: '654321', feeUnits: { tron: SCALE, ethereum: 3 * SCALE } };
  const networks = () => config().networks || { tron: 'TRON (TRC20)', ethereum: 'Ethereum (ERC20)' };
  const own = () => S.portal === 'cust' && window.AzureBridge?.account?.role === 'cust';
  const wallets = () => own() ? AzureWallets.list().filter(w => w.customerId === CID() && w.kind === 'crypto' && w.asset === 'USDT') : [];
  const valid = () => own() && flow?.customerId === CID() && flow.page === S.page && !!engine();
  const frozen = () => !!config().readOnly;
  const uid = prefix => prefix + crypto.randomUUID();
  const amountText = units => { if (!Number.isSafeInteger(units) || units < 0) return ''; const fraction = String(units % SCALE).padStart(6, '0').replace(/0+$/, ''); return String(Math.floor(units / SCALE)) + (fraction ? '.' + fraction : ''); };
  const format = units => AzureWallets.formatAmount(Number.isSafeInteger(units) ? units / SCALE : null, 'USDT') + ' USDT';
  const target = (network, suffix = '01') => 'DEMO-' + (network === 'ethereum' ? 'ERC20' : 'TRC20') + '-DESTINATION' + suffix;
  const row = network => ({ rowKey: uid('row-'), name: '', address: '', network, amount: '', memo: '' });
  const button = (action, text, classes = '', data = '', disabled = false) => `<button class="btn ${classes}" type="button" data-wb-action="${action}" ${data} ${disabled ? 'disabled' : ''}>${text}</button>`;
  const statusText = (status, rows) => status === 'partial' && rows && !rows.some(r => r.status === 'pending') ? T('已結束（含退款）', '已结束（含退款）', 'Final (includes refunds)') : ({ pending: T('待處理', '待处理', 'Pending'), partial: T('部分已處理', '部分已处理', 'Partially processed'), completed: T('已完成', '已完成', 'Completed'), failed: T('已失敗／退款', '已失败／退款', 'Failed / refunded'), cancelled: T('已取消／退款', '已取消／退款', 'Cancelled / refunded') }[status] || status);
  function message(code) {
    const map = {
      SCOPE: ['此批次不屬於目前客戶。', '此批次不属于当前客户。', 'This batch does not belong to the current customer.'],
      FROZEN: ['此客戶已凍結，只能檢視批次，無法提交或處理。', '此客户已冻结，只能查看批次，无法提交或处理。', 'This customer is frozen. Batches are read-only.'],
      INVALID_WALLET: ['請選擇自己的 USDT 錢包。', '请选择自己的 USDT 钱包。', 'Choose your own USDT wallet.'],
      INVALID_NETWORK: ['收款網路必須與來源錢包一致；不能混用網路。', '收款网络必须与来源钱包一致；不能混用网络。', 'Every recipient must use the source wallet network. Mixed networks are not supported.'],
      INVALID_ROWS: ['請加入 1 至 50 位收款人。', '请加入 1 至 50 位收款人。', 'Add between 1 and 50 recipients.'],
      INVALID_ADDRESS: ['地址格式與此網路不符。', '地址格式与此网络不符。', 'The address does not match this network.'],
      INVALID_AMOUNT: ['請輸入大於 0、最多 6 位小數的金額。', '请输入大于 0、最多 6 位小数的金额。', 'Enter a positive amount with up to 6 decimal places.'],
      DUPLICATE_ADDRESS: ['此批次已有相同網路及地址，請合併或移除重複列。', '此批次已有相同网络及地址，请合并或移除重复行。', 'This network and address are duplicated in the batch. Merge or remove the duplicate.'],
      INVALID_NAME: ['收款人名稱無效或過長，請修改。', '收款人名称无效或过长，请修改。', 'Edit the invalid or overlong recipient name.'],
      INVALID_MEMO: ['備註無效或超過 140 個字元。', '备注无效或超过 140 个字符。', 'The memo is invalid or exceeds 140 characters.'],
      BALANCE_UNKNOWN: ['來源錢包尚未提供結存，請先完成 Demo 入金。', '来源钱包尚未提供结存，请先完成 Demo 入金。', 'The source balance is unavailable. Complete a Demo deposit first.'],
      INSUFFICIENT_BALANCE: ['可用結存不足以支付整批本金及手續費；整批未提交，未凍結資金。', '可用结存不足以支付整批本金及手续费；整批未提交，未冻结资金。', 'The available balance does not cover all amounts and fees. The entire batch is rejected; nothing is reserved.'],
      BALANCE_LIMIT: ['此批次超過 Demo 結存上限，請減少金額。', '此批次超过 Demo 结存上限，请减少金额。', 'This batch exceeds the Demo balance limit. Reduce the amounts.'],
      INVALID_OTP: ['Demo 驗證碼不正確，請輸入 654321。', 'Demo 验证码不正确，请输入 654321。', 'The Demo code is incorrect. Enter 654321.'],
      CONFIRMATION: ['請先勾選確認所有收款地址、網路及金額。', '请先勾选确认所有收款地址、网络及金额。', 'Confirm all recipient addresses, networks and amounts first.'],
      INVALID_REQUEST: ['申請無效，請關閉後重新建立。', '申请无效，请关闭后重新创建。', 'This request is invalid. Close it and create a new batch.'],
      REQUEST_CONFLICT: ['此申請內容已變更，請重新建立批次。', '此申请内容已变更，请重新创建批次。', 'These request details have changed. Create a new batch.'],
      NOT_FOUND: ['找不到此客戶的批次。', '找不到此客户的批次。', 'This batch was not found for the current customer.'],
      INVALID_STATUS: ['請選擇可處理的待處理項目。', '请选择可处理的待处理项目。', 'Choose pending rows to process.'],
      FINAL: ['這些項目已處理，不能重複結算或退款。', '这些项目已处理，不能重复结算或退款。', 'These rows are final. They cannot be settled or refunded again.'],
      CSV_FORMAT: ['CSV 格式無效。請使用範本，並檢查引號與欄位數。', 'CSV 格式无效。请使用模板，并检查引号与字段数。', 'Invalid CSV. Use the template and check quotes and column counts.'],
      CSV_LIMIT: ['每批最多 50 位收款人，檔案上限 256 KB；原草稿已保留。', '每批最多 50 位收款人，文件上限 256 KB；原草稿已保留。', 'Use at most 50 recipients and a 256 KB file. Your existing draft is preserved.'],
      CSV_HEADER: ['CSV 欄位必須為 recipient,address,network,amount,memo。', 'CSV 字段必须为 recipient,address,network,amount,memo。', 'CSV headers must be recipient,address,network,amount,memo.'],
      CSV_EMPTY: ['CSV 沒有收款資料，原草稿已保留。', 'CSV 没有收款资料，原草稿已保留。', 'The CSV has no recipients. Your existing draft is preserved.'],
      UNAVAILABLE: ['批量付款暫不可用，請稍後重新開啟。', '批量付款暂不可用，请稍后重新打开。', 'Batch payments are unavailable. Try opening the flow again.']
    };
    return T(...(map[code] || map.UNAVAILABLE));
  }
  function error(code, focus = '') {
    const el = document.getElementById('wallet-batch-error');
    if (el) { el.hidden = false; el.textContent = message(code); }
    (document.getElementById(focus || (code === 'INVALID_OTP' ? 'wallet-batch-otp' : code === 'CONFIRMATION' ? 'wallet-batch-confirm' : 'wallet-batch-error')))?.focus({ preventScroll: false });
  }
  function rememberDraft() {
    if (valid() && flow.stage !== 'record') drafts.set(CID(), { walletId: flow.walletId, network: flow.network, rows: flow.rows.map(x => ({ ...x })) });
  }
  function read() {
    if (!valid()) return;
    const form = document.getElementById('wallet-batch-form');
    if (form && flow.stage === 'form') {
      flow.rows = [...form.querySelectorAll('[data-wb-row]')].map(el => {
        const original = flow.rows.find(x => x.rowKey === el.dataset.wbRow) || row(flow.network);
        const result = { ...original };
        for (const key of ['name', 'address', 'network', 'amount', 'memo']) { const input = el.querySelector(`[name="${key}"]`); if (input) result[key] = input.value; }
        return result;
      });
    }
    const otp = document.getElementById('wallet-batch-otp'); if (otp) flow.otp = otp.value;
    const confirmed = document.getElementById('wallet-batch-confirm'); if (confirmed) flow.confirmed = confirmed.checked;
    rememberDraft();
  }
  function payload() { return { walletId: flow.walletId, network: flow.network, rows: flow.rows.map(x => ({ ...x })) }; }
  function steps() {
    const labels = [T('收款名單', '收款名单', 'Recipients'), T('核對費用', '核对费用', 'Review fees'), T('Demo 驗證', 'Demo 验证', 'Demo verification'), T('處理結果', '处理结果', 'Results')];
    const index = { form: 0, review: 1, otp: 2, record: 3 }[flow.stage];
    return `<ol class="wb-steps" aria-label="${T('流程進度', '流程进度', 'Progress')}">${labels.map((label, i) => `<li ${i === index ? 'aria-current="step"' : ''}><span aria-hidden="true">${i < index ? '✓' : i + 1}</span>${esc(label)}</li>`).join('')}</ol>`;
  }
  function demoToolbar(sample = true) {
    return `<div class="wb-demo-toolbar"><p>${T('批量付款 Demo：所有地址、驗證及結果僅供模擬，不會發送真實 USDT。', '批量付款 Demo：所有地址、验证及结果仅供模拟，不会发送真实 USDT。', 'Batch-payment Demo: addresses, verification and outcomes are simulated. No real USDT is sent.')}</p>${sample ? button('sample', T('一鍵試填（Demo）', '一键试填（Demo）', 'Fill sample (Demo)'), 'sm', '', frozen()) : '<span class="badge info">Demo</span>'}</div>`;
  }
  function options(selected, includeUnknown = false) {
    return Object.entries(networks()).map(([key, name]) => `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(name)}</option>`).join('') + (includeUnknown && !Object.hasOwn(networks(), selected) ? `<option value="${esc(selected)}" selected>${esc(selected || T('未指定', '未指定', 'Not set'))}</option>` : '');
  }
  function summary(data) {
    return `<div class="wb-summary"><div><span>${T('本金合計', '本金合计', 'Total amount')}</span><strong data-wb-amount>${esc(format(data?.amountUnits))}</strong></div><div><span>${T('Demo 手續費合計', 'Demo 手续费合计', 'Total Demo fees')}</span><strong data-wb-fee>${esc(format(data?.feeUnits))}</strong></div><div class="wb-total"><span>${T('合計凍結金額', '合计冻结金额', 'Total reservation')}</span><strong data-wb-total>${esc(format(data?.totalUnits))}</strong></div></div>`;
  }
  function rowErrors(key) { return flow.quote?.rows?.find(x => x.rowKey === key)?.errors || []; }
  function formBody() {
    const wallet = wallets().find(w => w.id === flow.walletId), blocked = frozen();
    return `${demoToolbar()}${steps()}${blocked ? `<p class="wb-warning">${message('FROZEN')}</p>` : ''}<form id="wallet-batch-form" class="wb-form"><div class="wb-source"><div class="field"><label for="wallet-batch-wallet">${T('來源 USDT 錢包', '来源 USDT 钱包', 'Source USDT wallet')}</label><select class="select" id="wallet-batch-wallet" ${blocked ? 'disabled' : ''}>${wallets().map(w => `<option value="${esc(w.id)}" ${w.id === flow.walletId ? 'selected' : ''}>${esc(w.name)}${w.name.includes(networks()[w.network]) ? '' : ' · ' + esc(networks()[w.network])}</option>`).join('')}</select><small>${T('可用結存：', '可用结存：', 'Available: ')}${esc(format(wallet?.availableUnits))}</small></div><div class="field"><label for="wallet-batch-network">${T('整批付款網路', '整批付款网络', 'Batch network')}</label><select class="select" id="wallet-batch-network" ${blocked ? 'disabled' : ''}>${options(flow.network)}</select><small>${T('每筆手續費：', '每笔手续费：', 'Fee per recipient: ')}${esc(format(config().feeUnits[flow.network]))}</small></div></div><div class="wb-list-toolbar"><div><h4>${T('收款名單', '收款名单', 'Recipient list')} <span data-wb-count>${flow.rows.length} / 50</span></h4><p>${T('可手動填寫或匯入 CSV；每批使用同一網路，相同地址不可重複。', '可手动填写或导入 CSV；每批使用同一网络，相同地址不可重复。', 'Enter recipients or import CSV. Use one network per batch and no duplicate addresses.')}</p></div><div class="wb-toolbar-actions">${button('template', T('下載 CSV 範本', '下载 CSV 模板', 'CSV template'), 'sm')}${button('import', T('匯入 CSV', '导入 CSV', 'Import CSV'), 'sm', '', blocked)}<input id="wallet-batch-file" type="file" accept=".csv,text/csv" hidden></div></div><div class="wb-rows">${flow.rows.map((r, i) => { const errors = rowErrors(r.rowKey); return `<fieldset class="wb-row ${errors.length ? 'wb-row-invalid' : ''}" data-wb-row="${esc(r.rowKey)}"><legend>${T('收款人', '收款人', 'Recipient')} ${i + 1}</legend><div class="wb-row-top">${button('pick', T('從地址簿選取', '从地址簿选择', 'Choose address'), 'sm', `data-row-key="${esc(r.rowKey)}"`, blocked)}${button('remove', `<span aria-hidden="true">×</span><span>${T('移除', '移除', 'Remove')}</span>`, 'sm wb-remove', `data-row-key="${esc(r.rowKey)}"`, blocked)}</div><div class="wb-row-grid"><div class="field"><label for="wb-${i}-name">${T('名稱（選填）', '名称（选填）', 'Name (optional)')}</label><input class="input" id="wb-${i}-name" name="name" value="${esc(r.name)}" maxlength="80" ${blocked ? 'disabled' : ''}></div><div class="field"><label for="wb-${i}-network">${T('收款網路', '收款网络', 'Recipient network')}</label><select class="select" name="network" id="wb-${i}-network" ${blocked ? 'disabled' : ''}>${options(r.network, true)}</select></div><div class="field wb-address"><label for="wb-${i}-address">${T('收款地址', '收款地址', 'Destination address')}</label><input class="input" id="wb-${i}-address" name="address" value="${esc(r.address)}" maxlength="120" autocomplete="off" spellcheck="false" ${errors.includes('INVALID_ADDRESS') || errors.includes('DUPLICATE_ADDRESS') ? 'aria-invalid="true"' : ''} ${blocked ? 'disabled' : ''}></div><div class="field"><label for="wb-${i}-amount">${T('金額（USDT）', '金额（USDT）', 'Amount (USDT)')}</label><input class="input" id="wb-${i}-amount" name="amount" inputmode="decimal" value="${esc(r.amount)}" autocomplete="off" ${errors.includes('INVALID_AMOUNT') ? 'aria-invalid="true"' : ''} ${blocked ? 'disabled' : ''}></div><div class="field"><label for="wb-${i}-memo">${T('備註（選填）', '备注（选填）', 'Memo (optional)')}</label><input class="input" id="wb-${i}-memo" name="memo" value="${esc(r.memo)}" maxlength="140" ${blocked ? 'disabled' : ''}></div></div>${errors.length ? `<ul class="wb-row-errors" role="alert">${errors.map(code => `<li>${esc(message(code))}</li>`).join('')}</ul>` : ''}<p class="wb-row-fee">${T('每筆 Demo 手續費', '每笔 Demo 手续费', 'Demo fee for this recipient')}: ${esc(format(config().feeUnits[r.network]))}</p></fieldset>`; }).join('')}</div>${button('add', '+ ' + T('新增收款人', '新增收款人', 'Add recipient'), 'wb-add', '', blocked || flow.rows.length >= config().maxRows)}<p class="wb-import-status" id="wallet-batch-import-status" role="status">${esc(flow.importMessage || '')}</p><p class="wb-error" id="wallet-batch-error" role="alert" tabindex="-1" hidden></p></form>`;
  }
  function previewRows(rows, record = false) {
    return `<div class="wb-preview-list">${rows.map((r, i) => `<section class="wb-preview-row" data-wb-preview-row="${esc(r.rowKey)}"><header><strong data-notr>${i + 1}. ${esc(r.name || T('收款人', '收款人', 'Recipient'))}</strong>${record ? `<span class="badge ${r.status === 'completed' ? 'success' : r.status === 'pending' ? 'warn' : 'info'}" data-wb-row-status="${esc(r.id)}">${esc(statusText(r.status))}</span>` : ''}</header><code data-notr>${esc(r.address)}</code><p class="small muted">${esc(networks()[r.network] || r.network)}${r.memo ? ' · ' + esc(r.memo) : ''}</p><dl><dt>${T('本金', '本金', 'Amount')}</dt><dd>${esc(format(r.amountUnits))}</dd><dt>${T('Demo 手續費', 'Demo 手续费', 'Demo fee')}</dt><dd>${esc(format(r.feeUnits))}</dd><dt>${T('合計', '合计', 'Total')}</dt><dd><b>${esc(format(r.totalUnits))}</b></dd></dl>${record && r.status === 'pending' ? `<div class="wb-row-outcomes">${button('complete-row', T('模擬完成', '模拟完成', 'Complete (Demo)'), 'sm primary', `data-row-id="${esc(r.id)}"`, frozen())}${button('fail-row', T('模擬失敗', '模拟失败', 'Fail (Demo)'), 'sm', `data-row-id="${esc(r.id)}"`, frozen())}${button('cancel-row', T('取消此筆', '取消此笔', 'Cancel row'), 'sm', `data-row-id="${esc(r.id)}"`, frozen())}</div>` : ''}</section>`).join('')}</div>`;
  }
  function reviewBody() {
    return `${demoToolbar(false)}${steps()}<h4>${T('逐筆核對收款及費用', '逐笔核对收款及费用', 'Review each recipient and fee')}</h4><p class="wb-network-note">${esc(networks()[flow.network])} · ${flow.rows.length} ${T('筆付款', '笔付款', 'payments')}</p>${previewRows(flow.quote.rows)}${summary(flow.quote)}<p class="wb-warning">${T('提交時會一次凍結整批本金與手續費。失敗或取消的項目會退回其本金與手續費；成功項目只從已凍結結存結算一次。', '提交时会一次冻结整批本金与手续费。失败或取消的项目会退回其本金与手续费；成功项目仅从已冻结结存结算一次。', 'The complete batch is reserved once on submission. Failed or cancelled rows refund their amounts and fees. Completed rows settle only from the existing reservation.')}</p><label class="wb-confirm"><input type="checkbox" id="wallet-batch-confirm" ${flow.confirmed ? 'checked' : ''} ${frozen() ? 'disabled' : ''}><span>${T('我已核對所有收款地址、網路與金額，並了解這是模擬付款。', '我已核对所有收款地址、网络与金额，并了解这是模拟付款。', 'I have checked every address, network and amount and understand this is a simulated payment.')}</span></label><p class="wb-error" id="wallet-batch-error" role="alert" tabindex="-1" hidden></p>`;
  }
  function otpBody() {
    return `${demoToolbar()}${steps()}${summary(flow.quote)}<div class="field wb-otp"><label for="wallet-batch-otp">${T('6 位 Demo 驗證碼', '6 位 Demo 验证码', '6-digit Demo code')}</label><input class="input" id="wallet-batch-otp" value="${esc(flow.otp)}" inputmode="numeric" maxlength="6" autocomplete="off" aria-describedby="wallet-batch-code-hint" ${frozen() ? 'disabled' : ''}><small id="wallet-batch-code-hint">${T('Demo 驗證碼：', 'Demo 验证码：', 'Demo code: ')}<b>${esc(config().demoCode)}</b> · ${T('未寄送電郵或簡訊。', '未发送电邮或短信。', 'No email or SMS is sent.')}</small></div><p class="wb-error" id="wallet-batch-error" role="alert" tabindex="-1" hidden></p>`;
  }
  function resultBody(batch) {
    const pending = batch.rows.filter(r => r.status === 'pending'), refund = batch.rows.filter(r => ['failed', 'cancelled'].includes(r.status)).reduce((n, r) => n + r.totalUnits, 0);
    const motion = batch.status === 'completed' ? 'success' : pending.length ? 'loading' : 'error';
    return `${demoToolbar(false)}${steps()}<header class="wb-result-head" data-wb-status="${esc(batch.status)}"><div class="wallet-motion" data-wallet-motion="${motion}" aria-hidden="true"></div><div><h4 id="wallet-batch-result-title" tabindex="-1">${esc(statusText(batch.status, batch.rows))} · ${batch.rows.length} ${T('筆付款', '笔付款', 'payments')}</h4><p>${pending.length ? T('本金及手續費已凍結，尚未全部結算。可逐筆模擬結果，或關閉後從批次紀錄繼續。', '本金及手续费已冻结，尚未全部结算。可逐笔模拟结果，或关闭后从批次记录继续。', 'Amounts and fees are reserved. Simulate individual outcomes, or close and continue from batch history.') : T('此批次已結束。成功項目已結算；失敗與取消項目已退款，不會重複扣款。', '此批次已结束。成功项目已结算；失败与取消项目已退款，不会重复扣款。', 'This batch is final. Completed rows are settled; failed and cancelled rows are refunded. No duplicate debit is made.')}</p></div></header><dl class="wb-record-meta"><dt>${T('批次編號', '批次编号', 'Batch ID')}</dt><dd data-notr>${esc(batch.id)}</dd><dt>${T('付款網路', '付款网络', 'Network')}</dt><dd>${esc(networks()[batch.network])}</dd></dl><div class="wb-summary wb-settlement"><div><span>${T('仍在凍結', '仍在冻结', 'Still reserved')}</span><strong data-wb-reserved>${esc(format(batch.reservedUnits))}</strong></div><div><span>${T('已結算', '已结算', 'Settled')}</span><strong data-wb-settled>${esc(format(batch.settledUnits))}</strong></div><div><span>${T('已退回可用結存', '已退回可用结存', 'Refunded to available')}</span><strong data-wb-refunded>${esc(format(refund))}</strong></div></div>${pending.length ? `<section class="wb-bulk-outcomes"><h4>${T('處理所有待處理項目', '处理所有待处理项目', 'Process all pending rows')} (${pending.length})</h4><div class="btn-row">${button('complete-all', T('全部模擬完成', '全部模拟完成', 'Complete all (Demo)'), 'primary', '', frozen())}${button('fail-all', T('全部模擬失敗', '全部模拟失败', 'Fail all (Demo)'), '', '', frozen())}${button('cancel-all', T('取消全部待處理', '取消全部待处理', 'Cancel all pending'), '', '', frozen())}</div></section>` : ''}${frozen() ? `<p class="wb-warning">${message('FROZEN')}</p>` : ''}${previewRows(batch.rows, true)}${summary(batch)}<p class="wb-error" id="wallet-batch-error" role="alert" tabindex="-1" hidden></p>`;
  }
  function footer(batch) {
    if (batch) return `${button('export', T('匯出結果 CSV', '导出结果 CSV', 'Export result CSV'))}${button('new', T('建立另一批次', '创建另一批次', 'New batch'), '', '', frozen())}${button('close', batch.rows.some(r => r.status === 'pending') ? T('關閉並保留', '关闭并保留', 'Close and keep') : T('完成', '完成', 'Done'), 'primary')}`;
    if (flow.stage === 'form') return `${button('close', T('關閉並保留草稿', '关闭并保留草稿', 'Close and keep draft'))}${button('next', T('下一步：核對費用', '下一步：核对费用', 'Next: review fees'), 'primary', 'data-wb-next', frozen())}`;
    return `${button('back', T('返回修改', '返回修改', 'Back'))}${button('next', flow.stage === 'review' ? T('下一步：Demo 驗證', '下一步：Demo 验证', 'Next: Demo verification') : T('確認整批提交（Demo）', '确认整批提交（Demo）', 'Submit batch (Demo)'), 'primary', 'data-wb-next', frozen())}`;
  }
  function draw(focus = '') {
    if (!valid()) return;
    const batch = flow.recordId ? engine().get(flow.recordId) : null;
    if (flow.recordId && !batch) return closeModal();
    const body = batch ? resultBody(batch) : flow.stage === 'form' ? formBody() : flow.stage === 'review' ? reviewBody() : otpBody();
    replacing = true; modal(T('USDT 批量付款（Demo）', 'USDT 批量付款（Demo）', 'USDT batch payment (Demo)'), body, footer(batch), true); replacing = false;
    const dialog = document.querySelector('.modal'); if (!dialog) return;
    dialog.classList.add('wallet-batch-modal'); const title = dialog.querySelector('.modal-head h3'); title.id = 'wallet-batch-title'; dialog.setAttribute('aria-labelledby', title.id); dialog.querySelector('.modal-head button').setAttribute('aria-label', T('關閉', '关闭', 'Close'));
    const form = document.getElementById('wallet-batch-form'); if (form) form.onsubmit = event => { event.preventDefault(); API.next(); };
    (document.getElementById(focus || (batch ? 'wallet-batch-result-title' : flow.stage === 'otp' ? 'wallet-batch-otp' : flow.stage === 'form' ? 'wallet-batch-wallet' : 'wallet-batch-confirm')) || title).focus({ preventScroll: true });
    window.AzureWalletMotion?.enhance?.();
  }
  function start(walletId, restore = true) {
    if (!own() || !engine()) return;
    const saved = restore ? drafts.get(CID()) : null, list = wallets();
    const wallet = list.find(w => w.id === walletId) || list.find(w => w.id === saved?.walletId) || list.find(w => w.id === AzureWallets.snapshot()?.selectedId) || list[0];
    if (!wallet) return toast(message('INVALID_WALLET'));
    opener = document.activeElement;
    flow = { customerId: CID(), page: S.page, walletId: wallet.id, network: wallet.network, rows: saved?.rows?.map(r => ({ ...r })) || [row(wallet.network)], stage: 'form', confirmed: false, otp: '', quote: null, busy: false, requestId: uid('batch-'), recordId: null, importMessage: '' };
    draw();
  }
  // RFC 4180 parsing preserves addresses, leading zeros, quoted commas and embedded newlines as strings.
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, ''); const records = []; let fields = [], field = '', quoted = false, closed = false, started = false;
    const endField = () => { fields.push(field); field = ''; closed = false; started = false; };
    const endRow = () => { endField(); records.push(fields); fields = []; };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } } else field += c; continue; }
      if (closed && c !== ',' && c !== '\r' && c !== '\n') throw new Error('CSV_FORMAT');
      if (c === '"') { if (started || field.length) throw new Error('CSV_FORMAT'); quoted = true; started = true; }
      else if (c === ',') endField();
      else if (c === '\r' || c === '\n') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
      else { field += c; started = true; }
    }
    if (quoted) throw new Error('CSV_FORMAT');
    if (field.length || fields.length || started || closed) endRow();
    return records;
  }
  function csvCell(value) { let text = String(value ?? ''); if (/^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; }
  const csvText = records => '\uFEFF' + records.map(record => record.map(csvCell).join(',')).join('\r\n') + '\r\n';
  function download(name, records) {
    const blob = new Blob([csvText(records)], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const normalizeNetwork = network => ({ TRC20: 'tron', TRON: 'tron', ERC20: 'ethereum', ETHEREUM: 'ethereum', 'TRON (TRC20)': 'tron', 'ETHEREUM (ERC20)': 'ethereum' }[network.trim().toUpperCase()] || network.trim());
  function importText(text) {
    if (!valid() || flow.stage !== 'form' || frozen()) return { ok: false, error: 'FROZEN' };
    read(); let records;
    try { if (new TextEncoder().encode(text).length > 262144) throw new Error('CSV_LIMIT'); records = parseCSV(text); } catch (failure) { const code = failure.message === 'CSV_LIMIT' ? 'CSV_LIMIT' : 'CSV_FORMAT'; error(code); return { ok: false, error: code }; }
    const header = records.shift();
    if (!header || header.length !== HEADER.length || header.some((value, i) => value.trim().toLowerCase() !== HEADER[i])) { error('CSV_HEADER'); return { ok: false, error: 'CSV_HEADER' }; }
    records = records.filter(record => record.some(value => value.length));
    const code = records.length > config().maxRows ? 'CSV_LIMIT' : !records.length ? 'CSV_EMPTY' : records.some(record => record.length !== HEADER.length) ? 'CSV_FORMAT' : '';
    if (code) { error(code); return { ok: false, error: code }; }
    flow.rows = records.map(([name, address, network, amount, memo]) => ({ rowKey: uid('row-'), name, address, network: normalizeNetwork(network), amount, memo }));
    flow.confirmed = false; flow.requestId = uid('batch-'); flow.quote = engine().validate(payload()); flow.importMessage = T(`已匯入 ${records.length} 筆；請核對各列與費用後再提交。`, `已导入 ${records.length} 笔；请核对各行与费用后再提交。`, `Imported ${records.length} recipients. Review every row and fee before submitting.`); rememberDraft(); draw();
    if (!flow.quote.ok && flow.quote.errors?.length) error(flow.quote.error || flow.quote.errors[0]);
    return { ok: true, rows: flow.rows.length, valid: flow.quote.ok };
  }
  const API = window.AzureWalletBatch = {
    ready: true, parseCSV, serializeCSV: csvText, importCSVText: importText,
    open(walletId) { start(walletId); },
    openRecord(id) {
      if (!own() || !engine()) return; const batch = engine().get(id); if (!batch || batch.customerId !== CID()) return;
      opener = document.activeElement; flow = { customerId: CID(), page: S.page, walletId: batch.walletId, network: batch.network, rows: [], stage: 'record', recordId: id, busy: false }; draw();
    },
    add() { if (!valid() || flow.stage !== 'form' || frozen() || flow.rows.length >= config().maxRows) return; read(); flow.rows.push(row(flow.network)); flow.quote = null; draw(); document.querySelector('.wb-row:last-child input')?.focus(); },
    remove(key) { if (!valid() || flow.stage !== 'form' || frozen()) return; read(); flow.rows = flow.rows.filter(r => r.rowKey !== key); flow.quote = null; rememberDraft(); draw(); },
    sample() {
      if (!valid() || flow.recordId || frozen()) return; read();
      if (flow.stage === 'otp') flow.otp = config().demoCode;
      else { flow.rows = ['01', '02'].map((suffix, i) => ({ ...row(flow.network), name: T('示範收款人', '示范收款人', 'Sample recipient') + ' ' + (i + 1), address: target(flow.network, suffix), amount: i ? '25.125' : '12.34', memo: 'Demo ' + (i + 1) })); flow.quote = null; flow.confirmed = false; flow.stage = 'form'; flow.requestId = uid('batch-'); }
      rememberDraft(); draw();
    },
    changeWallet(walletId) { if (!valid() || flow.stage !== 'form' || frozen()) return; read(); const wallet = wallets().find(w => w.id === walletId); if (!wallet) return; flow.walletId = wallet.id; flow.network = wallet.network; flow.quote = null; flow.confirmed = false; flow.requestId = uid('batch-'); rememberDraft(); draw(); },
    changeNetwork(network) { if (!valid() || flow.stage !== 'form' || frozen()) return; read(); const wallet = wallets().find(w => w.id === flow.walletId && w.network === network) || wallets().find(w => w.network === network); if (!wallet) { draw(); error('INVALID_WALLET'); return; } API.changeWallet(wallet.id); },
    next() {
      if (!valid() || flow.busy || flow.recordId) return; read(); if (frozen()) return error('FROZEN');
      if (flow.stage === 'form') { flow.quote = engine().validate(payload()); if (!flow.quote.ok) { draw(); error(flow.quote.error || flow.quote.errors?.[0] || flow.quote.rows?.find(r => r.errors?.length)?.errors[0] || 'INVALID_ROWS'); return; } flow.stage = 'review'; draw(); return; }
      if (flow.stage === 'review') { if (!flow.confirmed) return error('CONFIRMATION'); flow.stage = 'otp'; draw(); return; }
      if (flow.stage !== 'otp') return;
      flow.busy = true; document.querySelectorAll('.wallet-batch-modal button').forEach(el => { el.disabled = true; });
      let result; try { result = engine().submit({ ...payload(), requestId: flow.requestId, otp: flow.otp, networkConfirmed: flow.confirmed }); } catch { result = { ok: false, error: 'UNAVAILABLE' }; }
      flow.busy = false;
      if (!result.ok) { draw(); error(result.error); return; }
      flow.recordId = result.batch.id; flow.stage = 'record'; drafts.delete(CID()); draw();
    },
    back() { if (!valid() || flow.busy || flow.recordId) return; read(); flow.stage = flow.stage === 'otp' ? 'review' : 'form'; draw(); },
    transition(status, rowId) {
      if (!valid() || flow.busy || !flow.recordId) return; if (frozen()) return error('FROZEN');
      const batch = engine().get(flow.recordId); if (!batch) return error('NOT_FOUND');
      const ids = rowId ? [rowId] : batch.rows.filter(r => r.status === 'pending').map(r => r.id); if (!ids.length) return error('FINAL');
      flow.busy = true; const result = engine().transitionRows(batch.id, ids, status); flow.busy = false; draw(); if (!result.ok) error(result.error);
    },
    pick(key) {
      if (!valid() || flow.stage !== 'form' || frozen()) return; read(); if (!window.AzureWalletAddressBook?.pick) return toast(T('地址簿載入中，請稍後再試。', '地址簿加载中，请稍后再试。', 'The address book is loading. Try again shortly.'));
      const saved = flow; suspended = true;
      AzureWalletAddressBook.pick({ network: flow.network, onSelect(selected) { if (saved.customerId !== CID() || !own()) return; flow = saved; const recipient = flow.rows.find(r => r.rowKey === key); if (recipient && selected?.enabled !== false) Object.assign(recipient, { name: selected.label || '', address: selected.address, network: selected.network }); flow.quote = null; flow.confirmed = false; suspended = false; rememberDraft(); draw(); }, onCancel() { if (saved.customerId === CID() && own()) { flow = saved; suspended = false; draw(); } } });
      suspended = false;
    },
    template() { const network = valid() ? flow.network : 'tron'; download('usdt-batch-template.csv', [HEADER, ['Demo recipient 1', target(network), network, '00012.340000', 'Sample, non-payable'], ['Demo recipient 2', target(network, '02'), network, '25.125', 'Demo only']]); },
    exportResult() { if (!valid() || !flow.recordId) return; const batch = engine().get(flow.recordId); if (!batch) return; download(batch.id + '.csv', [['batch_id', 'recipient', 'address', 'network', 'amount_usdt', 'fee_usdt', 'total_usdt', 'status', 'memo'], ...batch.rows.map(r => [batch.id, r.name, r.address, r.network, amountText(r.amountUnits), amountText(r.feeUnits), amountText(r.totalUnits), r.status, r.memo])]); }
  };
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-wb-action]'); if (!el || el.disabled) return; const action = el.dataset.wbAction;
    if (action === 'open') return API.open(el.dataset.walletId);
    if (action === 'record') return API.openRecord(el.dataset.batchId);
    if (!el.closest('.wallet-batch-modal')) return;
    if (action === 'close') closeModal(); else if (action === 'new') start(flow.walletId, false); else if (action === 'import') document.getElementById('wallet-batch-file')?.click();
    else if (action === 'remove' || action === 'pick') API[action](el.dataset.rowKey);
    else if (action === 'export') API.exportResult();
    else if (action.startsWith('complete-')) API.transition('completed', el.dataset.rowId);
    else if (action.startsWith('fail-')) API.transition('failed', el.dataset.rowId);
    else if (action.startsWith('cancel-')) API.transition('cancelled', el.dataset.rowId);
    else if (['sample', 'add', 'template', 'next', 'back'].includes(action)) API[action]();
  });
  document.addEventListener('change', async event => {
    if (!event.target.closest('.wallet-batch-modal')) return;
    if (event.target.id === 'wallet-batch-wallet') return API.changeWallet(event.target.value);
    if (event.target.id === 'wallet-batch-network') return API.changeNetwork(event.target.value);
    if (event.target.id === 'wallet-batch-file') {
      const file = event.target.files?.[0]; if (!file) return; const token = flow;
      if (file.size > 262144) return error('CSV_LIMIT');
      try { const text = await file.text(); if (flow === token && valid()) importText(text); } catch { if (flow === token && valid()) error('CSV_FORMAT'); }
      return;
    }
    if (flow?.stage === 'form') { read(); flow.quote = null; flow.confirmed = false; flow.requestId = uid('batch-'); }
  });
  function enhance() {
    if (flow && (!own() || flow.customerId !== CID() || flow.page !== S.page) && document.querySelector('.wallet-batch-modal')) closeModal();
    if (!own() || !engine() || S.page !== 'wallets') return;
    const selected = document.querySelector('.wallet-selected'), wallet = wallets().find(w => w.id === selected?.dataset.walletId), page = document.querySelector('.wallet-page');
    const actions = wallet ? selected.querySelector('.wallet-actions') : page?.querySelector('.wallet-funding-toolbar .wallet-actions');
    if (actions && !actions.querySelector('.wallet-batch-btn')) actions.insertAdjacentHTML('beforeend', button('open', T('批量付款（Demo）', '批量付款（Demo）', 'Batch payment (Demo)'), 'wallet-batch-btn', `data-wallet-id="${esc(wallet?.id || '')}"`, frozen()));
    page?.querySelector('.wallet-batch-history')?.remove(); const batches = engine().records(wallet?.id).filter(b => b.customerId === CID());
    if (batches.length && page) page.insertAdjacentHTML('beforeend', `<section class="card wallet-batch-history"><div class="card-head"><h3>${T('USDT 批次紀錄', 'USDT 批次记录', 'USDT batch history')}</h3><span class="badge info">Demo</span></div>${batches.slice(0, 30).map(b => `<div class="wb-history-row"><div><b>${esc(statusText(b.status, b.rows))} · ${b.rows.length} ${T('筆', '笔', 'rows')}</b><small data-notr>${esc(b.id)}</small><span>${esc(format(b.totalUnits))} · ${esc(networks()[b.network])}</span></div>${button('record', b.rows.some(r => r.status === 'pending') ? T('繼續處理', '继续处理', 'Continue') : T('查看結果', '查看结果', 'View result'), 'sm', `data-batch-id="${esc(b.id)}"`)}</div>`).join('')}</section>`);
    if (flow && flow.customerId !== CID() && document.querySelector('.wallet-batch-modal')) closeModal();
  }
  const previousAfter = afterRender; afterRender = function (...args) { const result = previousAfter(...args); enhance(); return result; };
  const previousClose = closeModal; closeModal = function (...args) {
    const ours = !!document.querySelector('.wallet-batch-modal'); if (ours && !replacing && !suspended) { read(); flow = null; }
    const result = previousClose(...args); if (ours && !replacing && !suspended) requestAnimationFrame(() => { if (!document.querySelector('.modal') && opener?.isConnected) opener.focus(); }); return result;
  };
  document.addEventListener('keydown', event => {
    const dialog = document.querySelector('.wallet-batch-modal'); if (!dialog) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; } if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="file"]),select:not([disabled]),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length), first = controls[0], last = controls[controls.length - 1]; if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
  enhance();
})();
