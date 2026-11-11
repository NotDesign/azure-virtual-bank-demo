/* Customer-scoped Demo address book. Data and validation belong to the shared wallet engine. */
(() => {
  'use strict';
  const T = (tc, sc, en) => C(tc, sc, en), esc = value => E(value);
  const NETWORKS = {tron: 'TRON (TRC20)', ethereum: 'Ethereum (ERC20)'};
  let view = null, serial = 0;
  const engine = () => window.AzureWallets?.operations?.addresses;
  const owns = () => window.AzureBridge?.account?.role === 'cust' && S.portal === 'cust';
  const frozen = () => window.AzureWallets?.operations?.config?.().readOnly === true || cust(CID())?.status === '冻结' || cust(CID())?.frz?.scopes?.some(k => ['all', 'pay'].includes(k));
  const valid = () => !!view && owns() && view.customerId === CID() && view.page === S.page && engine();
  const editable = () => valid() && !frozen();
  const rows = () => valid() ? (engine().list() || []).filter(r => r && typeof r.id === 'string' && NETWORKS[r.network] && typeof r.address === 'string' && r.customerId === CID()) : [];
  const row = id => rows().find(r => r.id === id);
  const canonical = (network, address) => network === 'ethereum' ? address.toLowerCase() : address;
  function errorText(code) {
    code = String(code || '').toLowerCase();
    const key = /duplicate/.test(code) ? 'duplicate' : /frozen|scope|permission/.test(code) ? 'readonly' : /label|name/.test(code) ? 'label' : /note|memo/.test(code) ? 'note' : /limit/.test(code) ? 'limit' : /address|network/.test(code) ? 'address' : 'save';
    return {
      duplicate: T('此網路已有相同地址，請使用現有紀錄。', '此网络已有相同地址，请使用现有记录。', 'This address already exists on this network. Use the existing entry.'),
      readonly: T('目前帳號或凍結狀態不允許此操作。', '当前账号或冻结状态不允许此操作。', 'This account or frozen state does not allow this action.'),
      label: T('請填寫 1–80 字的地址名稱。', '请填写 1–80 字的地址名称。', 'Enter an address name of 1–80 characters.'),
      note: T('備註最多 140 字，不可包含控制字元。', '备注最多 140 字，不可包含控制字符。', 'Use a note of up to 140 characters without control characters.'),
      limit: T('此客戶最多可儲存 100 個地址，請先移除不再使用的紀錄。', '此客户最多可保存 100 个地址，请先移除不再使用的记录。', 'This customer can save up to 100 addresses. Remove an unused entry first.'),
      address: T('地址格式與所選網路不符。請核對地址及網路。', '地址格式与所选网络不符。请核对地址及网络。', 'The address does not match the selected network. Check both fields.'),
      save: T('未能儲存操作，請重新核對地址。', '未能保存操作，请重新核对地址。', 'The action could not be saved. Review the address and try again.')
    }[key];
  }
  function close(restore = true, notifyCancel = restore) {
    const previous = view; view = null; serial++;
    document.querySelector('.wab-overlay')?.remove();
    previous?.inert?.forEach(([node, prior]) => { if (node.isConnected) node.inert = prior; });
    if (restore && previous?.customerId === CID() && previous.opener?.isConnected) previous.opener.focus({preventScroll: true});
    if (notifyCancel && previous?.customerId === CID() && previous.page === S.page && owns() && typeof previous.onCancel === 'function') previous.onCancel();
  }
  function fail(code) {
    if (!valid()) return close(false);
    view.error = errorText(code); const node = document.querySelector('[data-wab-error]');
    if (node) {node.textContent = view.error; node.hidden = false; node.focus({preventScroll: true});}
  }
  function warning() {
    return T('Demo 地址簿僅檢查格式，使用前請核對地址與網路。', 'Demo 地址簿仅检查格式，使用前请核对地址与网络。', 'Demo address book: format checks only. Confirm the address and network.');
  }
  function filters() {
    return `<div class="wab-filters"><div class="field wab-search"><label for="wab-query">${T('搜尋地址','搜索地址','Search addresses')}</label><div class="wab-search-control"><input class="input" type="search" id="wab-query" maxlength="200" value="${esc(view.query)}" placeholder="${T('名稱、地址或備註','名称、地址或备注','Name, address or note')}"><button class="icon-btn" type="button" data-wab-clear aria-label="${T('清除搜尋','清除搜索','Clear search')}" ${view.query?'':'disabled'}>×</button></div></div><div class="field"><label for="wab-network">${T('網路','网络','Network')}</label><select class="select" id="wab-network" ${view.lockedNetwork?'disabled':''}><option value="">${T('全部網路','全部网络','All networks')}</option>${Object.entries(NETWORKS).map(([key,name])=>`<option value="${key}" ${view.network===key?'selected':''}>${name}</option>`).join('')}</select></div><div class="field"><label for="wab-status">${T('狀態','状态','Status')}</label><select class="select" id="wab-status">${[['all',T('全部狀態','全部状态','All statuses')],['enabled',T('已啟用','已启用','Enabled')],['disabled',T('已停用','已停用','Disabled')]].map(([key,name])=>`<option value="${key}" ${view.status===key?'selected':''}>${name}</option>`).join('')}</select></div></div>`;
  }
  function form() {
    const draft = view.edit; if (!draft) return '';
    return `<form class="wab-editor" id="wab-form"><div class="wab-editor-head"><h4>${draft.id?T('編輯地址','编辑地址','Edit address'):T('新增地址','新增地址','New address')}</h4><span class="badge info">Demo</span></div><div class="wab-form-grid"><div class="field"><label for="wab-label">${T('地址名稱','地址名称','Address name')}</label><input class="input" id="wab-label" data-wab-field="label" data-notr maxlength="80" required value="${esc(draft.label)}"></div><div class="field"><label for="wab-edit-network">${T('網路','网络','Network')}</label><select class="select" id="wab-edit-network" data-wab-field="network" ${view.lockedNetwork?'disabled':''}>${Object.entries(NETWORKS).map(([key,name])=>`<option value="${key}" ${draft.network===key?'selected':''}>${name}</option>`).join('')}</select></div></div><div class="field"><label for="wab-address">${T('完整地址','完整地址','Full address')}</label><input class="input wab-address-input" id="wab-address" data-wab-field="address" data-notr value="${esc(draft.address)}" maxlength="120" autocomplete="off" autocapitalize="off" spellcheck="false" required><small>${T('保留地址字串及大小寫；TRON 區分大小寫，Ethereum 比對重複時不區分大小寫。', '保留地址字符串及大小写；TRON 区分大小写，Ethereum 比对重复时不区分大小写。', 'Address text and case are preserved. TRON is case-sensitive; Ethereum duplicates are compared without case.')}</small></div><div class="field"><label for="wab-note">${T('備註（選填）','备注（选填）','Note (optional)')}</label><input class="input" id="wab-note" data-wab-field="note" data-notr maxlength="140" value="${esc(draft.note)}"></div><label class="wab-enabled"><input type="checkbox" id="wab-enabled" data-wab-field="enabled" ${draft.enabled?'checked':''}>${T('啟用此地址，允許在 Demo 付款中選取','启用此地址，允许在 Demo 付款中选取','Enable this address for selection in Demo payments')}</label><div class="wab-form-actions"><button class="btn" type="button" data-wab-cancel-edit>${T('取消','取消','Cancel')}</button><button class="btn primary" type="submit" ${editable()?'':'disabled'}>${T('儲存地址','保存地址','Save address')}</button></div></form>`;
  }
  function visibleRows() {
    const query = view.query.trim().toLowerCase();
    return rows().filter(r => (!view.network || r.network === view.network) && (view.status === 'all' || (view.status === 'enabled') === (r.enabled === true)) && (!query || [r.label, r.address, r.note].join(' ').toLowerCase().includes(query)));
  }
  function renderRows() {
    if (!valid()) return close(false);
    const host = document.querySelector('[data-wab-list]'); if (!host) return;
    const items = visibleRows(); document.querySelector('[data-wab-count]').textContent = T(`共 ${items.length} 個地址`,`共 ${items.length} 个地址`,items.length===1?'1 address':`${items.length} addresses`);
    host.innerHTML = items.map(r => `<article class="wab-entry" data-wab-id="${esc(r.id)}"><div class="wab-entry-main"><div class="wab-entry-heading"><b data-notr>${esc(r.label)}</b><span class="badge ${r.enabled?'ok':''}">${r.enabled?T('已啟用','已启用','Enabled'):T('已停用','已停用','Disabled')}</span></div><small>${NETWORKS[r.network]} · ${T('未經鏈上驗證','未经链上验证','Not on-chain verified')}</small><code data-notr>${esc(r.address)}</code>${r.note?`<p data-notr>${esc(r.note)}</p>`:''}</div><div class="wab-entry-actions">${view.onSelect?`<button class="btn primary" type="button" data-wab-select="${esc(r.id)}" ${editable()&&r.enabled&&(!view.lockedNetwork||r.network===view.lockedNetwork)?'':'disabled'}>${T('使用此地址','使用此地址','Use address')}</button>`:''}<button class="btn sm" type="button" data-wab-copy="${esc(r.id)}">${T('複製','复制','Copy')}</button><button class="btn sm" type="button" data-wab-edit="${esc(r.id)}" ${editable()?'':'disabled'}>${T('編輯','编辑','Edit')}</button><button class="btn sm" type="button" data-wab-toggle="${esc(r.id)}" ${editable()?'':'disabled'}>${r.enabled?T('停用','停用','Disable'):T('啟用','启用','Enable')}</button><button class="btn sm wab-danger" type="button" data-wab-delete="${esc(r.id)}" ${editable()?'':'disabled'}>${T('刪除','删除','Delete')}</button></div>${view.deleting===r.id?`<section class="wab-confirm" role="alert"><p>${T('確定刪除此地址？既有 Demo 交易紀錄會保留。','确定删除此地址？现有 Demo 交易记录会保留。','Delete this address? Existing Demo transaction records are retained.')}</p><div><button class="btn" type="button" data-wab-cancel-delete>${T('取消','取消','Cancel')}</button><button class="btn wab-danger" type="button" data-wab-confirm-delete="${esc(r.id)}" ${editable()?'':'disabled'}>${T('確認刪除','确认删除','Delete address')}</button></div></section>`:''}</article>`).join('') || `<div class="wab-empty"><p>${rows().length?T('沒有符合條件的地址，可清除搜尋或變更篩選。','没有符合条件的地址，可清除搜索或更改筛选。','No addresses match. Clear the search or change the filters.'):T('尚未儲存地址，請先新增一個 Demo 地址。','尚未保存地址，请先新增一个 Demo 地址。','No saved addresses yet. Add a Demo address to begin.')}</p></div>`;
  }
  function draw(focusId) {
    if (!valid()) return close(false);
    const overlay = document.querySelector('.wab-overlay'); if (!overlay) return;
    overlay.innerHTML = `<section class="wab-dialog" role="dialog" aria-modal="true" aria-labelledby="wab-title"><header><div><h3 id="wab-title">${view.onSelect?T('選擇 USDT 地址','选择 USDT 地址','Choose a USDT address'):T('USDT 地址簿','USDT 地址簿','USDT address book')}</h3><p>${T('僅限目前客戶 · 本次登入期間保留','仅限当前客户 · 本次登录期间保留','Current customer only · retained for this session')}</p></div><button class="icon-btn" type="button" data-wab-close aria-label="${T('關閉地址簿','关闭地址簿','Close address book')}">×</button></header><div class="wab-body"><p class="wab-warning">${warning()}</p>${frozen()?`<p class="wab-readonly" role="status">${T('此客戶已凍結，地址簿目前只供檢視。','此客户已冻结，地址簿当前仅供查看。','This customer is frozen. The address book is read-only.')}</p>`:''}${filters()}<div class="wab-list-head"><span data-wab-count></span><button class="btn primary" type="button" data-wab-new ${editable()?'':'disabled'}>${ICON.plus||'+'}${T('新增地址','新增地址','New address')}</button></div><p data-wab-error class="wab-error" role="alert" tabindex="-1" ${view.error?'':'hidden'}>${esc(view.error||'')}</p>${form()}<div data-wab-list class="wab-list"></div></div><footer><span class="small muted">${T('選取地址不會提交付款。','选取地址不会提交付款。','Selecting an address does not submit a payment.')}</span><button class="btn" type="button" data-wab-close>${T('關閉','关闭','Close')}</button></footer></section>`;
    renderRows(); (focusId && document.getElementById(focusId) || overlay.querySelector('[data-wab-close]')).focus({preventScroll: true});
  }
  function start(options = {}) {
    if (!owns() || !engine() || typeof engine().list !== 'function') return false;
    if (options.network && !NETWORKS[options.network]) return false;
    close(false); const overlay = document.createElement('div'); overlay.className = 'wab-overlay';
    const inert = [...document.body.children].filter(node => !['SCRIPT','STYLE','LINK'].includes(node.tagName)).map(node => [node, node.inert]);
    view = {id: ++serial, customerId: CID(), page:S.page, opener: document.activeElement, inert, network: options.network||'', lockedNetwork: options.onSelect?options.network||'':'', status: options.onSelect?'enabled':'all', query: '', edit: null, deleting: null, error: '', onSelect: typeof options.onSelect === 'function' ? options.onSelect : null, onCancel:typeof options.onCancel==='function'?options.onCancel:null};
    inert.forEach(([node]) => node.inert = true); document.body.append(overlay);
    overlay.addEventListener('click', onClick); overlay.addEventListener('input', onInput); overlay.addEventListener('change', onInput); overlay.addEventListener('submit', event => {if(event.target.id==='wab-form'){event.preventDefault();save();}});
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); close(); return;}
      if (event.key !== 'Tab') return; event.stopPropagation();
      const controls = [...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(node=>node.getClientRects().length), first=controls[0], last=controls.at(-1);
      if (event.shiftKey && (document.activeElement===first || !overlay.contains(document.activeElement))) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && (document.activeElement===last || !overlay.contains(document.activeElement))) {event.preventDefault(); first?.focus();}
    });
    draw(); return true;
  }
  function edit(id) {
    if (!editable()) return fail('frozen'); const current = id ? row(id) : null; if (id && !current) return fail('scope');
    if (current && view.lockedNetwork && current.network !== view.lockedNetwork) return fail('network');
    view.edit = current ? {id: current.id, label: current.label, network: current.network, address: current.address, note: current.note||'', enabled: current.enabled===true} : {label:'', network:view.lockedNetwork||view.network||'tron', address:'', note:'', enabled:true};
    view.error=''; view.deleting=null; draw('wab-label');
  }
  function save() {
    if (!editable() || !view.edit) return fail('frozen');
    const draft = {...view.edit, label:view.edit.label.trim(), address:view.edit.address.trim(), note:view.edit.note.trim()};
    if (!draft.label || draft.label.length>80 || /[<>\u0000-\u001f]/.test(draft.label)) return fail('label');
    if (draft.note.length>140 || /[<>\u0000-\u001f]/.test(draft.note)) return fail('note');
    if (!NETWORKS[draft.network] || view.lockedNetwork && draft.network!==view.lockedNetwork || !AzureWallets.funding?.validAddress(draft.network,draft.address)) return fail('address');
    if (rows().some(r=>r.id!==draft.id&&r.network===draft.network&&canonical(r.network,r.address)===canonical(draft.network,draft.address))) return fail('duplicate');
    const result=engine().save(draft); if (!result?.ok) return fail(result?.error); if(!valid())return;
    view.edit=null; view.error=''; draw();
  }
  async function copy(id) {
    const current=row(id), context=view; if(!current)return;
    try {await navigator.clipboard.writeText(current.address); if(view===context&&valid())toast(T('已複製地址','已复制地址','Address copied'));}
    catch {if(view!==context||!valid())return; const code=[...document.querySelectorAll('.wab-entry')].find(el=>el.dataset.wabId===id)?.querySelector('code');if(code){const range=document.createRange();range.selectNodeContents(code);const selected=getSelection();selected.removeAllRanges();selected.addRange(range);}toast(T('請手動複製已選取的完整地址。','请手动复制已选取的完整地址。','Copy the selected full address manually.'));}
  }
  function choose(id) {
    if(!editable())return fail('frozen');const current=row(id);if(!current||!current.enabled||view.lockedNetwork&&current.network!==view.lockedNetwork)return fail('address');
    const callback=view.onSelect;if(!callback)return;const value={id:current.id,label:current.label,network:current.network,address:current.address,note:current.note||'',enabled:true};close(true,false);callback(value);
  }
  function onInput(event) {
    if(!valid())return close(false); const node=event.target;
    if(node.id==='wab-query'){view.query=node.value;document.querySelector('[data-wab-clear]').disabled=!view.query;renderRows();}
    else if(node.id==='wab-network'){view.network=NETWORKS[node.value]?node.value:'';view.deleting=null;renderRows();}
    else if(node.id==='wab-status'){view.status=['all','enabled','disabled'].includes(node.value)?node.value:'all';renderRows();}
    else if(node.dataset.wabField&&view.edit){view.edit[node.dataset.wabField]=node.type==='checkbox'?node.checked:node.value;view.error='';const error=document.querySelector('[data-wab-error]');if(error)error.hidden=true;}
  }
  function onClick(event) {
    const button=event.target.closest('button');if(!button||button.disabled)return;if(!valid())return close(false);
    if(button.hasAttribute('data-wab-close'))return close();
    if(button.hasAttribute('data-wab-new'))return edit();
    if(button.hasAttribute('data-wab-clear')){view.query='';document.getElementById('wab-query').value='';button.disabled=true;renderRows();return document.getElementById('wab-query').focus();}
    if(button.hasAttribute('data-wab-cancel-edit')){view.edit=null;view.error='';return draw();}
    if(button.hasAttribute('data-wab-cancel-delete')){view.deleting=null;return renderRows();}
    if(button.dataset.wabEdit)return edit(button.dataset.wabEdit);
    if(button.dataset.wabSelect)return choose(button.dataset.wabSelect);
    if(button.dataset.wabCopy)return void copy(button.dataset.wabCopy);
    if(!editable())return fail('frozen');
    if(button.dataset.wabToggle){const current=row(button.dataset.wabToggle);if(!current)return fail('scope');const result=engine().save({id:current.id,label:current.label,network:current.network,address:current.address,note:current.note||'',enabled:!current.enabled});if(!result?.ok)return fail(result?.error);return draw();}
    if(button.dataset.wabDelete){view.deleting=button.dataset.wabDelete;renderRows();document.querySelector('[data-wab-confirm-delete]')?.focus();return;}
    if(button.dataset.wabConfirmDelete){const id=button.dataset.wabConfirmDelete;if(view.deleting!==id||!row(id))return fail('scope');const result=engine().remove(id);if(!result?.ok)return fail(result?.error);view.deleting=null;view.error='';draw();}
  }
  function enhance() {
    if(view&&(!owns()||view.customerId!==CID()||view.page!==S.page))close(false);
    if(view){if(frozen())view.edit=null;draw();}
    if(!owns()||S.page!=='wallets'||!engine())return;
    const host=document.querySelector('.wallet-toolbar');if(host&&!host.querySelector('[data-wab-open]')){const button=document.createElement('button');button.type='button';button.className='btn wallet-address-book-btn';button.dataset.wabOpen='';button.textContent=T('USDT 地址簿','USDT 地址簿','USDT address book');button.onclick=()=>start();host.append(button);}
  }
  window.AzureWalletAddressBook={ready:true,open:options=>start(options),pick:options=>typeof options?.onSelect==='function'&&NETWORKS[options.network]?start(options):false,close,refresh:enhance};
  const previousAfter=afterRender;afterRender=function(...args){const result=previousAfter(...args);enhance();return result;};
  window.addEventListener('pagehide',()=>close(false),{once:true});enhance();
})();
