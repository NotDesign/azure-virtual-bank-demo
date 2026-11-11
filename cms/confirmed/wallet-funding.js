/* Simulated USDT funding UI. All financial state belongs to AzureWallets.funding. */
(() => {
  'use strict';
  const T = (tc, sc, en) => C(tc, sc, en), esc = value => E(value);
  const drafts = new Map();
  let flow = null, replacing = false, opener = null;
  const funding = () => window.AzureWallets?.funding;
  const own = () => S.portal === 'cust' && window.AzureBridge?.account?.role === 'cust';
  const wallets = () => own() ? AzureWallets.list().filter(w => w.customerId === CID() && w.kind === 'crypto' && w.asset === 'USDT') : [];
  const config = () => funding()?.config() || { demoCode: '654321', scale: 1000000, feeUnits: { tron: 1000000, ethereum: 3000000 } };
  const networks = () => funding()?.networks || { tron: 'TRON (TRC20)', ethereum: 'Ethereum (ERC20)' };
  const format = units => AzureWallets.formatAmount(units === null ? null : units / config().scale, 'USDT') + ' USDT';
  const label = kind => kind === 'deposit' ? T('USDT 入金（Demo）', 'USDT 入金（Demo）', 'USDT deposit (Demo)') : T('USDT 提領（Demo）', 'USDT 提领（Demo）', 'USDT withdrawal (Demo)');
  const id = () => 'wf-' + crypto.randomUUID();
  const target = network => network === 'ethereum' ? 'DEMO-ERC20-DESTINATION01' : 'DEMO-TRC20-DESTINATION01';
  const unitsInput = units => { const fraction = String(units % config().scale).padStart(6, '0').replace(/0+$/, ''); return String(Math.floor(units / config().scale)) + (fraction ? '.' + fraction : ''); };
  const validContext = () => own() && flow && flow.customerId === CID() && funding();
  function message(key) {
    const messages = {
      amount: ['請輸入大於 0、最多 6 位小數的有效金額。', '请输入大于 0、最多 6 位小数的有效金额。', 'Enter a positive amount with up to 6 decimal places.'],
      network: ['錢包與網路不一致，請重新選擇。', '钱包与网络不一致，请重新选择。', 'The wallet and network do not match. Select them again.'],
      wallet: ['找不到此客戶的 USDT 錢包。', '找不到此客户的 USDT 钱包。', 'No USDT wallet was found for this customer.'],
      frozen: ['此客戶已凍結，目前只供檢視，不能處理資金申請。', '此客户已冻结，目前仅供查看，不能处理资金申请。', 'This customer is frozen. Funding requests are read-only.'],
      balance: ['可用結存未提供或不足以支付本金及手續費。請先完成 Demo 入金，或減少金額。', '可用结存未提供或不足以支付本金及手续费。请先完成 Demo 入金，或减少金额。', 'The available balance is missing or does not cover the amount plus fee. Complete a Demo deposit or reduce the amount.'],
      address: ['請輸入與網路相符的收款地址；試填會使用不可付款的 Demo 地址。', '请输入与网络相符的收款地址；试填会使用不可付款的 Demo 地址。', 'Enter a destination matching the network. Sample data uses a non-payable Demo address.'],
      otp: ['Demo 驗證碼不正確，請輸入畫面所示的 6 位數字。', 'Demo 验证码不正确，请输入画面所示的 6 位数字。', 'The Demo code is incorrect. Enter the six digits shown on screen.'],
      confirmation: ['請勾選確認收款網路與地址。', '请勾选确认收款网络与地址。', 'Confirm the destination address and network.'],
      memo: ['備註最多 140 個字元，請移除不支援的符號。', '备注最多 140 个字符，请移除不支持的符号。', 'Keep the memo within 140 characters and remove unsupported symbols.'],
      scope: ['此申請不屬於目前客戶。', '此申请不属于当前客户。', 'This request does not belong to the current customer.'],
      record: ['找不到此客戶的申請。', '找不到此客户的申请。', 'No request was found for this customer.'],
      status: ['此申請狀態無法處理，請重新開啟查看。', '此申请状态无法处理，请重新打开查看。', 'This request cannot use that status. Reopen it to check its current state.'],
      final: ['此申請已處理，不能再次入帳或退款。', '此申请已处理，不能再次入账或退款。', 'This request is already final and cannot be credited or refunded again.'],
      'balance-limit': ['此操作會超過 Demo 結存上限，請減少金額。', '此操作会超过 Demo 结存上限，请减少金额。', 'This exceeds the Demo balance limit. Reduce the amount.'],
      'request-conflict': ['此申請內容已變更，請關閉後重新建立申請。', '此申请内容已变更，请关闭后重新创建申请。', 'This request has conflicting details. Close it and create a new request.'],
      unavailable: ['流程暫不可用，請關閉後重新開啟。', '流程暂不可用，请关闭后重新打开。', 'This flow is unavailable. Close it and try again.']
    };
    return T(...(messages[key] || messages.unavailable));
  }
  function error(key, focusId = '') {
    const el = document.getElementById('wallet-funding-error');
    if (el) { el.textContent = message(key); el.hidden = false; }
    const control = document.getElementById(focusId || (key === 'otp' ? 'wallet-funding-otp' : key === 'address' ? 'wallet-funding-address' : key === 'confirmation' ? 'wallet-funding-confirm' : key === 'memo' ? 'wallet-funding-memo' : 'wallet-funding-amount'));
    if (control) { control.setAttribute('aria-invalid', 'true'); control.focus(); }
  }
  function read() {
    if (!validContext()) return;
    const form = document.getElementById('wallet-funding-form');
    if (!form) return;
    for (const key of ['walletId', 'network', 'amount', 'address', 'memo', 'otp']) {
      const element = form.elements.namedItem(key); if (element) flow[key] = element.value;
    }
    const checkbox = form.elements.namedItem('confirmed'); if (checkbox) flow.confirmed = checkbox.checked;
    if (flow.stage === 'form') drafts.set(CID() + ':' + flow.kind, { walletId: flow.walletId, network: flow.network, amount: flow.amount, address: flow.address, memo: flow.memo, confirmed: flow.confirmed });
  }
  function principal(value) {
    if (!/^\d+(?:\.\d{1,6})?$/.test(String(value))) return null;
    const [whole, fraction = ''] = String(value).split('.');
    const units = Number(whole) * config().scale + Number(fraction.padEnd(6, '0'));
    return Number.isSafeInteger(units) && units > 0 && units <= 1000000000000000 ? units : null;
  }
  function feeData() {
    const amount = principal(flow.amount), fee = flow.kind === 'withdraw' ? config().feeUnits[flow.network] : 0;
    return { amountUnits: amount, feeUnits: fee, totalUnits: amount === null ? null : amount + fee };
  }
  function fees(data = feeData()) {
    return `<div class="wf-fee-box"><div class="wf-fee-line"><span>${flow.kind === 'withdraw' ? T('收款本金', '收款本金', 'Destination amount') : T('預計入金金額', '预计入金金额', 'Deposit amount')}</span><strong data-wf-principal>${esc(format(data.amountUnits))}</strong></div><div class="wf-fee-line"><span>${T('Demo 手續費', 'Demo 手续费', 'Demo fee')}</span><strong data-wf-fee>${esc(format(data.feeUnits))}</strong></div><div class="wf-fee-line wf-fee-total"><span>${flow.kind === 'withdraw' ? T('合計扣款／凍結', '合计扣款／冻结', 'Total debit / reservation') : T('完成後增加結存', '完成后增加结存', 'Balance credited on completion')}</span><strong data-wf-total>${esc(format(data.totalUnits))}</strong></div></div>`;
  }
  function steps(record) {
    const list = flow.kind === 'deposit' ? [T('設定入金', '设置入金', 'Set up'), T('Demo 收款資訊', 'Demo 收款信息', 'Demo receive details'), T('處理結果', '处理结果', 'Result')] : [T('填寫提領', '填写提领', 'Details'), T('核對資料', '核对资料', 'Review'), T('Demo 驗證', 'Demo 验证', 'Demo verification'), T('處理結果', '处理结果', 'Result')];
    let current = flow.kind === 'deposit' ? record ? record.status === 'pending' ? 1 : 2 : 0 : flow.stage === 'form' ? 0 : flow.stage === 'review' ? 1 : flow.stage === 'otp' ? 2 : 3;
    return `<ol class="wf-steps" style="--wf-steps:${list.length}" aria-label="${T('流程進度', '流程进度', 'Progress')}">${list.map((text, index) => `<li ${index === current ? 'aria-current="step"' : ''} class="${index < current ? 'wf-done' : ''}"><span aria-hidden="true">${index < current ? '✓' : index + 1}</span><span>${esc(text)}</span></li>`).join('')}</ol>`;
  }
  function demoToolbar(sample = true) {
    return `<div class="wf-demo-toolbar"><p>${T('僅供本機 Demo：不會發送資金、連接鏈上或傳送驗證訊息。', '仅供本机 Demo：不会发送资金、连接链上或发送验证信息。', 'Local Demo only. No funds, on-chain transactions or verification messages are sent.')}</p>${sample ? `<button class="btn sm" type="button" onclick="AzureWalletFunding.sample()">${T('一鍵試填（Demo）', '一键试填（Demo）', 'Fill sample (Demo)')}</button>` : '<span class="badge info">Demo</span>'}</div>`;
  }
  function walletOptions() {
    return wallets().map(w => `<option value="${esc(w.id)}" ${w.id === flow.walletId ? 'selected' : ''}>${esc(w.name)} · ${esc(networks()[w.network])}</option>`).join('');
  }
  function formBody() {
    const source = wallets().find(w => w.id === flow.walletId);
    return `${demoToolbar()}${steps()}<form class="wf-form" id="wallet-funding-form"><div class="wf-grid"><div class="field"><label for="wallet-funding-wallet">${T('USDT 錢包', 'USDT 钱包', 'USDT wallet')}</label><select class="select" name="walletId" id="wallet-funding-wallet" onchange="AzureWalletFunding.changeWallet(this.value)">${walletOptions()}</select></div><div class="field"><label for="wallet-funding-network">${T('網路', '网络', 'Network')}</label><select class="select" name="network" id="wallet-funding-network" onchange="AzureWalletFunding.changeNetwork(this.value)">${Object.entries(networks()).map(([key, text]) => `<option value="${esc(key)}" ${key === flow.network ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></div></div>${flow.kind === 'withdraw' ? `<div class="field"><label for="wallet-funding-address">${T('收款地址', '收款地址', 'Destination address')}</label><input class="input" id="wallet-funding-address" name="address" value="${esc(flow.address)}" maxlength="120" autocomplete="off" spellcheck="false" required placeholder="${esc(target(flow.network))}"><small>${T('試填使用不可付款的 Demo 地址；不會產生鏈上交易。', '试填使用不可付款的 Demo 地址；不会产生链上交易。', 'Sample data is a non-payable Demo address. No on-chain transaction is created.')}</small></div>` : ''}<div class="wf-amount-row"><div class="field"><label for="wallet-funding-amount">${T('金額（USDT）', '金额（USDT）', 'Amount (USDT)')}</label><input class="input" id="wallet-funding-amount" name="amount" inputmode="decimal" value="${esc(flow.amount)}" required autocomplete="off" oninput="AzureWalletFunding.updateAmount()"><small>${T('可用結存：', '可用结存：', 'Available: ')}${esc(AzureWallets.formatAmount(source?.available ?? null, 'USDT'))} USDT</small></div>${flow.kind === 'withdraw' ? `<button class="btn" type="button" onclick="AzureWalletFunding.max()" ${source?.available === null || !(source?.available > config().feeUnits[flow.network] / config().scale) ? 'disabled' : ''}>${T('最大', '最大', 'Max')}</button>` : ''}</div><div class="field"><label for="wallet-funding-memo">${T('備註（選填）', '备注（选填）', 'Memo (optional)')}</label><input class="input" id="wallet-funding-memo" name="memo" value="${esc(flow.memo)}" maxlength="140"></div>${fees()}${flow.kind === 'withdraw' ? `<label class="wf-network-confirm"><input type="checkbox" id="wallet-funding-confirm" name="confirmed" ${flow.confirmed ? 'checked' : ''}> <span>${T('我已核對收款地址與網路。本流程只會影響 Demo 結存。', '我已核对收款地址与网络。本流程只会影响 Demo 结存。', 'I have checked the destination and network. This flow affects Demo balances only.')}</span></label>` : `<p class="wf-warning">${T('建立申請後會顯示不可付款的 Demo 收款地址及 QR。入金只會在手動模擬完成後入帳。', '创建申请后会显示不可付款的 Demo 收款地址及 QR。入金仅会在手动模拟完成后入账。', 'A non-payable Demo address and QR appear after creation. Funds are credited only after manually simulating completion.')}</p>`}<p class="wf-error" id="wallet-funding-error" role="alert" hidden></p></form>`;
  }
  function reviewRows(record) {
    const source = wallets().find(w => w.id === (record?.walletId || flow.walletId));
    const rows = [[T('錢包', '钱包', 'Wallet'), source?.name || '—'], [T('網路', '网络', 'Network'), networks()[record?.network || flow.network]], [T('收款地址', '收款地址', 'Destination'), record?.address || flow.address], [T('備註', '备注', 'Memo'), record?.memo || flow.memo || '—']];
    if (record) rows.push([T('申請編號', '申请编号', 'Request ID'), record.id], [T('Demo 參考編號', 'Demo 参考编号', 'Demo reference'), record.reference]);
    return `<dl class="wf-review">${rows.map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
  }
  function reviewBody() {
    return `${demoToolbar(false)}${steps()}${reviewRows()}${fees(flow.quote)}<p class="wf-warning">${T('提交後先凍結合計金額；模擬失敗或取消會全數退回。Demo 手續費只是展示規則。', '提交后先冻结合计金额；模拟失败或取消会全数退回。Demo 手续费仅为展示规则。', 'The total is reserved on submission. Simulated failure or cancellation refunds it in full. The Demo fee is an illustrative rule.')}</p><p class="wf-error" id="wallet-funding-error" role="alert" hidden></p>`;
  }
  function otpBody() {
    return `${demoToolbar()}${steps()}<div class="wf-fee-box"><span>${T('本次合計凍結金額', '本次合计冻结金额', 'Total to reserve')}</span><strong>${esc(format(flow.quote.totalUnits))}</strong></div><form class="wf-form" id="wallet-funding-form"><div class="field"><label for="wallet-funding-otp">${T('6 位 Demo 驗證碼', '6 位 Demo 验证码', '6-digit Demo code')}</label><input class="input wf-otp" id="wallet-funding-otp" name="otp" value="${esc(flow.otp)}" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" aria-describedby="wallet-funding-otp-hint" required><small id="wallet-funding-otp-hint">${T('Demo 驗證碼：', 'Demo 验证码：', 'Demo code: ')}<b>${esc(config().demoCode)}</b> · ${T('未寄送電郵或簡訊。', '未发送电邮或短信。', 'No email or SMS is sent.')}</small></div><p class="wf-error" id="wallet-funding-error" role="alert" hidden></p></form>`;
  }
  function statusBody(record) {
    const pending = record.status === 'pending', completed = record.status === 'completed', failed = record.status === 'failed';
    const title = pending ? T('Demo 申請待處理', 'Demo 申请待处理', 'Demo request pending') : completed ? T('Demo 已完成', 'Demo 已完成', 'Demo completed') : failed ? T('Demo 處理失敗', 'Demo 处理失败', 'Demo failed') : T('Demo 已取消', 'Demo 已取消', 'Demo cancelled');
    const detail = record.kind === 'deposit' ? pending ? T('結存尚未增加。可手動模擬入金結果，或關閉後從待處理申請繼續。', '结存尚未增加。可手动模拟入金结果，或关闭后从待处理申请继续。', 'The balance has not increased. Simulate a result now, or reopen this pending request later.') : completed ? T('入金本金已增加至此 Demo 錢包，不會重複入帳。', '入金本金已增加至此 Demo 钱包，不会重复入账。', 'The deposit amount was added to this Demo wallet once.') : T('未入帳，錢包結存沒有增加。', '未入账，钱包结存没有增加。', 'No deposit was credited and the wallet balance did not increase.') : pending ? T('本金與 Demo 手續費已凍結，尚未結算。失敗或取消會全數退回。', '本金与 Demo 手续费已冻结，尚未结算。失败或取消会全数退回。', 'The amount plus Demo fee is reserved, not settled. Failure or cancellation refunds it in full.') : completed ? T('已從凍結結存完成結算；只影響 Demo 錢包，沒有鏈上轉帳。', '已从冻结结存完成结算；仅影响 Demo 钱包，没有链上转账。', 'The reserved total has been settled from the Demo wallet. No on-chain transfer was made.') : T('本金及 Demo 手續費已全數退回可用結存，沒有最終扣款。', '本金及 Demo 手续费已全数退回可用结存，没有最终扣款。', 'The amount and Demo fee were fully returned to the available balance. No final debit was made.');
    const deposit = record.kind === 'deposit' && pending;
    return `${demoToolbar(false)}${steps(record)}<div class="wf-status-head" data-status="${esc(record.status)}"><span class="wf-status-icon" aria-hidden="true">${pending ? '…' : completed ? '✓' : '!'}</span><div><h4 tabindex="-1" id="wallet-funding-status-title">${title}</h4><p>${detail}</p></div></div>${deposit ? `<div class="wf-receive"><div class="wf-qr" id="wallet-funding-qr"><span>DEMO · NON-PAYABLE</span></div><div class="wf-receive-info"><span class="small muted">${T('僅供展示的收款地址', '仅供展示的收款地址', 'Display-only receiving address')}</span><div class="wf-address-row"><code>${esc(record.address)}</code><button class="btn sm" type="button" onclick="AzureWalletFunding.copy('address')">${T('複製', '复制', 'Copy')}</button></div><p class="wf-warning">${T('不可付款。此 QR 只包含 azure-demo 模擬資料，請勿轉入真實資產。', '不可付款。此 QR 仅包含 azure-demo 模拟数据，请勿转入真实资产。', 'Non-payable. This QR contains azure-demo simulation data. Do not send real assets.')}</p></div></div>` : ''}${reviewRows(record)}${fees(record)}${pending ? `<section class="wf-simulate"><h4>${T('Demo 結果控制', 'Demo 结果控制', 'Demo outcome controls')}</h4><p>${T('不會自動確認鏈上交易，請選擇要展示的結果。', '不会自动确认链上交易，请选择要展示的结果。', 'No on-chain transaction is confirmed automatically. Choose an outcome to demonstrate.')}</p><div class="btn-row"><button class="btn primary" type="button" onclick="AzureWalletFunding.simulate('completed')">${T('模擬完成', '模拟完成', 'Simulate completion')}</button><button class="btn" type="button" onclick="AzureWalletFunding.simulate('failed')">${T('模擬失敗', '模拟失败', 'Simulate failure')}</button><button class="btn" type="button" onclick="AzureWalletFunding.simulate('cancelled')">${T('取消申請', '取消申请', 'Cancel request')}</button></div></section>` : ''}<p class="wf-error" id="wallet-funding-error" role="alert" hidden></p><div class="wf-copy-fallback" hidden></div>`;
  }
  function footer(record) {
    if (record) return `<button class="btn" type="button" onclick="AzureWalletFunding.copy('id')">${T('複製申請編號', '复制申请编号', 'Copy request ID')}</button>${record.status !== 'pending' ? `<button class="btn" type="button" onclick="AzureWalletFunding.retry()">${T('建立另一筆', '创建另一笔', 'Create another')}</button>` : ''}<button class="btn primary" type="button" onclick="closeModal()">${record.status === 'pending' ? T('關閉並保留申請', '关闭并保留申请', 'Close and keep request') : T('完成', '完成', 'Done')}</button>`;
    if (flow.stage === 'form') return `<button class="btn" type="button" onclick="closeModal()">${T('關閉', '关闭', 'Close')}</button><button class="btn primary" type="button" data-wf-next onclick="AzureWalletFunding.next()">${flow.kind === 'deposit' ? T('建立 Demo 入金', '创建 Demo 入金', 'Create Demo deposit') : T('下一步：核對資料', '下一步：核对资料', 'Next: review')}</button>`;
    return `<button class="btn" type="button" onclick="AzureWalletFunding.back()">${T('返回修改', '返回修改', 'Back')}</button><button class="btn primary" type="button" data-wf-next onclick="AzureWalletFunding.next()">${flow.stage === 'review' ? T('下一步：Demo 驗證', '下一步：Demo 验证', 'Next: Demo verification') : T('確認提交（Demo）', '确认提交（Demo）', 'Submit (Demo)')}</button>`;
  }
  function draw() {
    if (!validContext()) return;
    const record = flow.recordId ? funding().get(flow.recordId) : null;
    if (flow.recordId && !record) return closeModal();
    const body = record ? statusBody(record) : flow.stage === 'form' ? formBody() : flow.stage === 'review' ? reviewBody() : otpBody();
    replacing = true; modal(label(flow.kind), body, footer(record)); replacing = false;
    const dialog = document.querySelector('.modal'); if (!dialog) return;
    dialog.classList.add('wallet-funding-modal');
    const title = dialog.querySelector('.modal-head h3'); title.id = 'wallet-funding-title'; dialog.setAttribute('aria-labelledby', title.id);
    dialog.querySelector('.modal-head button').setAttribute('aria-label', T('關閉', '关闭', 'Close'));
    const form = document.getElementById('wallet-funding-form'); if (form) form.onsubmit = event => { event.preventDefault(); API.next(); };
    if (record?.kind === 'deposit' && record.status === 'pending') {
      const address = funding().address(record.walletId), qr = document.getElementById('wallet-funding-qr');
      if (address.ok && qr && address.qrPayload?.startsWith('azure-demo://')) {
        try { AzureBridge.qr(qr, address.qrPayload); } catch { qr.insertAdjacentHTML('beforeend', `<span>${T('QR 暫不可用；請查看 Demo 地址。', 'QR 暂不可用；请查看 Demo 地址。', 'QR unavailable. View the Demo address.')}</span>`); }
      }
    }
    (document.getElementById(record ? 'wallet-funding-status-title' : flow.stage === 'otp' ? 'wallet-funding-otp' : 'wallet-funding-wallet') || dialog.querySelector('.modal-head button')).focus({ preventScroll: true });
  }
  function start(kind, walletId, restore = true) {
    if (!own() || !funding()) return;
    const list = wallets(), saved = restore ? drafts.get(CID() + ':' + kind) : null;
    const selected = list.find(w => w.id === walletId) || list.find(w => w.id === AzureWallets.snapshot()?.selectedId) || list.find(w => w.id === saved?.walletId) || list[0];
    if (!selected) return toast(message('wallet'));
    opener = document.activeElement;
    flow = { customerId: CID(), kind, walletId: selected.id, network: selected.network, amount: '', address: '', memo: '', confirmed: false, ...saved, stage: 'form', otp: '', requestId: id(), recordId: null, busy: false };
    flow.walletId = selected.id; flow.network = selected.network; draw();
  }
  function submit() {
    if (!validContext() || flow.busy || flow.recordId) return;
    flow.busy = true;
    document.querySelectorAll('.wallet-funding-modal button').forEach(button => { button.disabled = true; });
    const input = { walletId: flow.walletId, network: flow.network, amount: flow.amount, memo: flow.memo, requestId: flow.requestId };
    const result = flow.kind === 'deposit' ? funding().createDeposit(input) : funding().createWithdrawal({ ...input, address: flow.address, networkConfirmed: flow.confirmed, otp: flow.otp });
    flow.busy = false;
    if (!result.ok) { draw(); error(result.error); return; }
    flow.recordId = result.record.id; flow.stage = 'record'; drafts.delete(CID() + ':' + flow.kind); draw();
  }
  const API = window.AzureWalletFunding = {
    ready: true,
    openDeposit(walletId) { start('deposit', walletId); },
    openWithdraw(walletId) { start('withdraw', walletId); },
    openRecord(recordId) {
      if (!own() || !funding()) return;
      const record = funding().get(recordId); if (!record || record.customerId !== CID()) return;
      opener = document.activeElement;
      flow = { customerId: CID(), kind: record.kind, walletId: record.walletId, network: record.network, amount: unitsInput(record.amountUnits), address: record.address, memo: record.memo, confirmed: false, stage: 'record', requestId: record.requestId, recordId: record.id, busy: false }; draw();
    },
    changeWallet(walletId) {
      if (!validContext() || flow.stage !== 'form') return; read();
      const wallet = wallets().find(w => w.id === walletId); if (!wallet) return;
      flow.walletId = wallet.id; flow.network = wallet.network; flow.confirmed = false; draw();
    },
    changeNetwork(network) {
      if (!validContext() || flow.stage !== 'form') return; read();
      const wallet = wallets().find(w => w.id === flow.walletId && w.network === network) || wallets().find(w => w.network === network);
      if (!wallet) { draw(); error('wallet'); return; }
      flow.walletId = wallet.id; flow.network = wallet.network; flow.confirmed = false; draw();
    },
    updateAmount() {
      if (!validContext() || flow.stage !== 'form') return; read(); const data = feeData();
      for (const [selector, value] of [['[data-wf-principal]', data.amountUnits], ['[data-wf-fee]', data.feeUnits], ['[data-wf-total]', data.totalUnits]]) {
        const node = document.querySelector('.wallet-funding-modal ' + selector); if (node) node.textContent = format(value);
      }
    },
    sample() {
      if (!validContext() || flow.recordId) return; read();
      if (flow.stage === 'otp') flow.otp = config().demoCode;
      else { flow.amount = flow.kind === 'deposit' ? '2500.00' : '100.00'; flow.memo = T('Demo 流程展示', 'Demo 流程展示', 'Demo walkthrough'); flow.address = target(flow.network); flow.confirmed = true; }
      draw();
    },
    max() {
      if (!validContext() || flow.kind !== 'withdraw' || flow.stage !== 'form') return; read();
      const source = wallets().find(w => w.id === flow.walletId), fee = config().feeUnits[flow.network];
      if (!source || source.available === null) return;
      const maxUnits = source.availableUnits - fee;
      if (!Number.isSafeInteger(maxUnits) || maxUnits <= 0) return error('balance');
      flow.amount = unitsInput(maxUnits); draw();
    },
    next() {
      if (!validContext() || flow.busy || flow.recordId) return; read();
      if (flow.stage === 'form') {
        const form = document.getElementById('wallet-funding-form'); if (!form?.reportValidity()) return;
        if (flow.kind === 'deposit') return submit();
        if (!flow.confirmed) return error('confirmation');
        if (!funding().validAddress(flow.network, flow.address.trim())) return error('address');
        const result = funding().quote({ walletId: flow.walletId, network: flow.network, amount: flow.amount });
        if (!result.ok) return error(result.error);
        flow.quote = result; flow.stage = 'review'; draw(); return;
      }
      if (flow.stage === 'review') { flow.stage = 'otp'; draw(); return; }
      if (flow.stage === 'otp') submit();
    },
    back() {
      if (!validContext() || flow.busy || flow.recordId) return; read();
      flow.stage = flow.stage === 'otp' ? 'review' : 'form'; draw();
    },
    simulate(status) {
      if (!validContext() || flow.busy || !flow.recordId || !['completed', 'failed', 'cancelled'].includes(status)) return;
      flow.busy = true; const result = funding().transition(flow.recordId, status); flow.busy = false;
      draw(); if (!result.ok) error(result.error);
    },
    retry() { if (validContext() && flow.recordId) start(flow.kind, flow.walletId, false); },
    async copy(key) {
      if (!validContext() || !flow.recordId) return;
      const record = funding().get(flow.recordId); if (!record) return;
      const value = key === 'address' ? record.address : record.id;
      try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(value); toast(T('已複製', '已复制', 'Copied')); }
      catch {
        const holder = document.querySelector('.wallet-funding-modal .wf-copy-fallback'); if (!holder) return;
        holder.hidden = false; holder.innerHTML = `<label for="wallet-funding-copy">${T('請手動複製', '请手动复制', 'Copy manually')}</label><textarea class="input" id="wallet-funding-copy" readonly>${esc(value)}</textarea>`;
        const input = holder.querySelector('textarea'); input.focus(); input.select();
      }
    }
  };
  function enhance() {
    if (!own() || !funding() || S.page !== 'wallets') return;
    const selected = document.querySelector('.wallet-selected'), wallet = wallets().find(w => w.id === selected?.dataset.walletId);
    const disabled = cust(CID())?.status === '冻结' || cust(CID())?.frz?.scopes?.some(k => ['all', 'pay'].includes(k));
    const page = document.querySelector('.wallet-page');
    if (page && !wallet && !page.querySelector('.wallet-funding-toolbar')) page.querySelector('.wallet-toolbar')?.insertAdjacentHTML('beforebegin', `<section class="card wallet-funding-toolbar"><div><h3>${T('USDT 入金與提領', 'USDT 入金与提领', 'USDT deposits and withdrawals')}</h3><p>${T('選擇自有 USDT 錢包開始 Demo 流程；不會變動銀行結存。', '选择自有 USDT 钱包开始 Demo 流程；不会变动银行结存。', 'Choose your USDT wallet to explore the Demo flow. Bank balances are unchanged.')}</p></div><div class="wallet-actions"><button class="btn primary wallet-deposit-btn" type="button" ${disabled ? 'disabled' : ''} onclick="AzureWalletFunding.openDeposit()">${T('USDT 入金（Demo）', 'USDT 入金（Demo）', 'Deposit USDT (Demo)')}</button><button class="btn wallet-withdraw-btn" type="button" ${disabled ? 'disabled' : ''} onclick="AzureWalletFunding.openWithdraw()">${T('USDT 提領（Demo）', 'USDT 提领（Demo）', 'Withdraw USDT (Demo)')}</button></div></section>`);
    const actions = wallet && selected.querySelector('.wallet-actions');
    if (actions && !actions.querySelector('.wallet-deposit-btn')) {
      actions.querySelector('.wallet-info-btn')?.remove(); actions.querySelector('.wallet-credit-btn')?.remove();
      actions.insertAdjacentHTML('afterbegin', `<button class="btn primary wallet-deposit-btn" type="button" ${disabled ? 'disabled' : ''} onclick="AzureWalletFunding.openDeposit()">${T('入金（Demo）', '入金（Demo）', 'Deposit (Demo)')}</button><button class="btn wallet-withdraw-btn" type="button" ${disabled ? 'disabled' : ''} onclick="AzureWalletFunding.openWithdraw()">${T('提領（Demo）', '提领（Demo）', 'Withdraw (Demo)')}</button>`);
      const transfer = actions.querySelector('.wallet-transfer-btn'); if (transfer) { transfer.classList.remove('primary'); transfer.textContent = T('內部錢包轉帳（Demo）', '内部钱包转账（Demo）', 'Internal wallet transfer (Demo)'); }
    }
    const recoveryHost = wallet ? selected : page?.querySelector('.wallet-funding-toolbar');
    recoveryHost?.querySelector('.wallet-funding-recovery')?.remove();
    const pending = funding().records(wallet?.id).filter(record => record.customerId === CID() && record.status === 'pending');
    if (pending.length && recoveryHost) recoveryHost.insertAdjacentHTML('beforeend', `<section class="wallet-funding-recovery"><h3>${T('待處理的 Demo 申請', '待处理的 Demo 申请', 'Pending Demo requests')}</h3>${pending.map(record => `<div class="wf-pending-item"><div><b>${record.kind === 'deposit' ? T('入金', '入金', 'Deposit') : T('提領', '提领', 'Withdrawal')} · ${esc(format(record.amountUnits))}</b><small>${esc(record.id)}</small></div><button class="btn sm" type="button" onclick="AzureWalletFunding.openRecord('${esc(record.id)}')">${T('繼續處理', '继续处理', 'Continue')}</button></div>`).join('')}</section>`);
    if (flow && flow.customerId !== CID() && document.querySelector('.wallet-funding-modal')) closeModal();
  }
  const previousAfter = afterRender; afterRender = function (...args) { const result = previousAfter(...args); enhance(); return result; };
  const previousClose = closeModal; closeModal = function (...args) {
    const ours = !!document.querySelector('.wallet-funding-modal');
    if (ours && !replacing) { read(); flow = null; }
    const result = previousClose(...args);
    if (ours && !replacing) requestAnimationFrame(() => { if (!document.querySelector('.modal') && opener?.isConnected) opener.focus(); });
    return result;
  };
  document.addEventListener('keydown', event => {
    const dialog = document.querySelector('.wallet-funding-modal'); if (!dialog) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1]; if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  });
  enhance();
})();
