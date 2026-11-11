/* Read-only, customer-scoped Demo wallet activity. No bank or chain mutations. */
(() => {
  'use strict';
  const SCALE=1000000, LEGACY_TYPES=['credit','transfer-in','transfer-out'],TYPES=[...LEGACY_TYPES,'deposit','withdraw','exchange-in','exchange-out'],STATUSES=['pending','completed','failed','cancelled'];
  const NETWORKS={tron:'TRON (TRC20)',ethereum:'Ethereum (ERC20)'};
  const defaults=()=>({scope:'selected',query:'',type:'',status:'',network:'',from:'',to:''});
  const T=(tc,sc,en)=>C(tc,sc,en),esc=value=>E(value);
  let detailContext=null;
  const owned=()=>S.portal==='cust'&&window.AzureBridge?.account?.role==='cust'&&window.AzureWallets;
  function model(){
    if(!owned())return null;
    const snapshot=AzureWallets.snapshot();if(!snapshot||snapshot.customerId!==CID())return null;
    const wallets=new Map((snapshot.crypto||[]).filter(w=>w.customerId===CID()).map(w=>[w.id,w]));
    const rows=(snapshot.ledger||[]).filter(r=>r.customerId===CID()&&wallets.has(r.walletId)&&TYPES.includes(r.kind)&&r.asset==='USDT'&&NETWORKS[r.network]&&wallets.get(r.walletId).network===r.network&&Number.isSafeInteger(r.amountUnits)&&r.amountUnits>0&&Number.isFinite(Date.parse(r.date))&&(LEGACY_TYPES.includes(r.kind)?r.status===undefined||STATUSES.includes(r.status):STATUSES.includes(r.status)&&['feeUnits','totalUnits','reservedUnits','settledUnits'].every(key=>Number.isSafeInteger(r[key])&&r[key]>=0)&&r.totalUnits===r.amountUnits+r.feeUnits));
    return {snapshot,wallets,rows,filters:{...defaults(),...(snapshot.preferences?.filters||{})}};
  }
  const funding=row=>row.kind==='deposit'||row.kind==='withdraw';
  const statusOf=row=>row.status===undefined&&LEGACY_TYPES.includes(row.kind)?'completed':row.status;
  const kindText=(kind,row)=>row?.batchId?T('USDT 批量付款','USDT 批量付款','USDT batch payment'):kind==='exchange-in'?T('法幣兌入 USDT','法币兑入 USDT','Fiat to USDT'):kind==='exchange-out'?T('USDT 兌回法幣','USDT 兑回法币','USDT to fiat'):kind==='credit'?T('模擬入金','模拟入金','Simulated deposit'):kind==='transfer-in'?T('轉入','转入','Transfer in'):kind==='transfer-out'?T('轉出','转出','Transfer out'):kind==='deposit'?T('USDT 入金申請','USDT 入金申请','USDT deposit request'):T('USDT 提款申請','USDT 提款申请','USDT withdrawal request');
  const statusText=row=>({pending:T('Demo 待處理','Demo 待处理','Demo pending'),completed:T('Demo 已完成','Demo 已完成','Demo completed'),failed:T('Demo 已失敗','Demo 已失败','Demo failed'),cancelled:T('Demo 已取消','Demo 已取消','Demo cancelled')})[statusOf(row)];
  const stateBadge=row=>`<span class="badge ${{pending:'warn',completed:'ok',failed:'err',cancelled:''}[statusOf(row)]}" data-wa-status="${esc(statusOf(row))}">${esc(statusText(row))}</span>`;
  const missing=()=>T('未提供','未提供','Not supplied');
  function parties(row,data){
    const own=data.wallets.get(row.walletId)?.name||missing(),other=data.wallets.get(row.otherWalletId)?.name||missing();
    return row.exchangeId?{from:row.fromName||missing(),to:row.toName||missing()}:row.kind==='credit'?{from:T('Demo 模擬入金','Demo 模拟入金','Demo simulated deposit'),to:own}:row.kind==='deposit'?{from:T('外部入金來源（Demo）','外部入金来源（Demo）','External deposit source (Demo)'),to:own}:row.kind==='withdraw'?{from:own,to:row.address||missing()}:row.kind==='transfer-in'?{from:other,to:own}:{from:own,to:other};
  }
  function localDate(value){return new Date(Date.parse(value)+28800000).toISOString().slice(0,10);}
  function localTime(value){return new Date(Date.parse(value)+28800000).toISOString().slice(0,19).replace('T',' ')+' UTC+8';}
  function dateValid(value){if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
  function filtered(data){
    const f=data.filters,q=String(f.query||'').trim().toLowerCase();
    return data.rows.filter(row=>{
      if(f.scope!=='all'&&row.walletId!==data.snapshot.selectedId&&row.fromWalletId!==data.snapshot.selectedId&&row.toWalletId!==data.snapshot.selectedId)return false;
      if(f.type&&row.kind!==f.type||f.status&&statusOf(row)!==f.status||f.network&&row.network!==f.network)return false;
      const day=localDate(row.date);if(f.from&&day<f.from||f.to&&day>f.to)return false;
      const p=parties(row,data);
      return !q||[row.id,row.exchangeId,row.batchId,row.requestId,row.reference,row.address,row.memo,data.wallets.get(row.walletId)?.name,p.from,p.to,row.actor?.email,row.actor?.role].join(' ').toLowerCase().includes(q);
    }).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  }
  const outflow=row=>row.kind==='transfer-out'||row.kind==='withdraw'||row.kind==='exchange-out';
  const feeUnits=row=>funding(row)||row.exchangeId?row.feeUnits:0;
  const totalUnits=row=>funding(row)||row.exchangeId?row.totalUnits:row.amountUnits;
  const reservedUnits=row=>funding(row)||row.exchangeId?row.reservedUnits:0;
  const settledUnits=row=>funding(row)||row.exchangeId?row.settledUnits:statusOf(row)==='completed'?row.amountUnits:0;
  function formattedUnits(units,asset='USDT'){return AzureWallets.formatAmount?AzureWallets.formatAmount(units/SCALE,asset):'—';}
  function amountText(row,units=row.amountUnits){return (units===0?'':outflow(row)?'−':'+')+formattedUnits(units,row.asset);}
  function numericAmount(row,units=row.amountUnits){const whole=Math.floor(units/SCALE),fraction=String(units%SCALE).padStart(6,'0').replace(/0+$/,'');return(units===0?'':outflow(row)?'-':'+')+whole+(fraction?'.'+fraction:'');}
  function textCell(value){let text=String(value??'');if(/^[\u0000-\u0020]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
  const numericCell=value=>'"'+value+'"';
  function options(items,selected){return items.map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');}
  function emptyMarkup(data){const fresh=data.rows.length===0;return `<div class="wa-empty" data-wa-empty="${fresh?'new':'filtered'}"><h4>${fresh?T('尚無錢包交易紀錄','暂无钱包交易记录','No wallet activity yet'):T('沒有符合條件的紀錄','没有符合条件的记录','No matching activity')}</h4><p class="small muted">${fresh?T('可先建立一筆 Demo USDT 入金申請，體驗申請與狀態流程。','可先创建一笔 Demo USDT 入金申请，体验申请与状态流程。','Create a Demo USDT deposit request to explore requests and their status changes.'):T('可清除篩選，或切換至此客戶所有錢包查看。','可清除筛选，或切换到此客户所有钱包查看。','Clear filters or select all this customer’s wallets to see more records.')}</p><button class="btn ${fresh?'primary':''}" type="button" onclick="AzureWalletActivity.${fresh?'startDeposit':'clear'}()">${fresh?T('體驗 USDT 入金','体验 USDT 入金','Try a USDT deposit'):T('清除篩選','清除筛选','Clear filters')}</button></div>`;}
  function markup(data){
    const f=data.filters,rows=filtered(data);
    const html=`<div class="card-head"><div><h3 class="card-title">${T('錢包交易紀錄','钱包交易记录','Wallet activity')}</h3><p class="small muted">${T('僅顯示目前客戶的 Demo 紀錄。申請金額不等於已結算金額；時間以 UTC+8 顯示。','仅显示当前客户的 Demo 记录。申请金额不等于已结算金额；时间以 UTC+8 显示。','Only this customer’s Demo records are shown. Requested amounts are distinct from settled amounts. Times use UTC+8.')}</p></div><span class="badge info">Demo</span></div><form class="wa-filter-form" id="wallet-activity-form"><div class="wa-filters"><div class="field wa-query"><label for="wallet-activity-query">${T('搜尋紀錄','搜索记录','Search activity')}</label><input class="input" type="search" id="wallet-activity-query" maxlength="200" value="${esc(f.query)}" placeholder="${T('紀錄編號、錢包、對手方或操作者','记录编号、钱包、对手方或操作者','Record ID, wallet, counterparty or actor')}"></div><div class="field"><label for="wallet-activity-scope">${T('範圍','范围','Scope')}</label><select class="select" id="wallet-activity-scope">${options([['selected',T('目前錢包','当前钱包','Selected wallet')],['all',T('此客戶所有錢包','此客户所有钱包','All this customer’s wallets')]],f.scope)}</select></div><div class="field"><label for="wallet-activity-type">${T('類型','类型','Type')}</label><select class="select" id="wallet-activity-type">${options([['',T('全部類型','全部类型','All types')],...TYPES.map(type=>[type,kindText(type)])],f.type)}</select></div><div class="field"><label for="wallet-activity-status">${T('狀態','状态','Status')}</label><select class="select" id="wallet-activity-status">${options([['',T('全部狀態','全部状态','All statuses')],...STATUSES.map(status=>[status,statusText({status})])],f.status)}</select></div><div class="field"><label for="wallet-activity-network">${T('網路','网络','Network')}</label><select class="select" id="wallet-activity-network">${options([['',T('全部網路','全部网络','All networks')],...Object.entries(NETWORKS)],f.network)}</select></div><div class="field"><label for="wallet-activity-from">${T('開始日期（UTC+8）','开始日期（UTC+8）','From date (UTC+8)')}</label><input class="input" type="date" id="wallet-activity-from" value="${esc(f.from)}"></div><div class="field"><label for="wallet-activity-to">${T('結束日期（UTC+8）','结束日期（UTC+8）','To date (UTC+8)')}</label><input class="input" type="date" id="wallet-activity-to" value="${esc(f.to)}"></div><div class="wa-filter-actions"><button class="btn primary" id="wallet-activity-apply" type="submit">${T('套用篩選','套用筛选','Apply filters')}</button><button class="btn" id="wallet-activity-clear" type="button">${T('清除篩選','清除筛选','Clear filters')}</button></div></div><p class="wa-error" id="wallet-activity-error" role="alert" hidden></p></form><div class="wa-result-head"><span class="small muted" data-wallet-activity-count="${rows.length}">${T(`共 ${rows.length} 筆`,`共 ${rows.length} 笔`,`${rows.length} records`)}</span><button class="btn sm" id="wallet-activity-export" type="button" ${rows.length?'':'disabled'}>${ICON.dl}${T('匯出 CSV','导出 CSV','Export CSV')}</button></div><p class="wa-export-note small muted">${T('CSV 會包含原始金額，即使畫面已隱藏金額。僅匯出目前篩選結果。','CSV 会包含原始金额，即使画面已隐藏金额。仅导出当前筛选结果。','CSV includes raw amounts even when amounts are hidden on screen. Only the current filtered results are exported.')}</p><div class="tbl-wrap"><table class="wa-table"><thead><tr><th>${T('紀錄編號','记录编号','Record ID')}</th><th>${T('時間（UTC+8）','时间（UTC+8）','Time (UTC+8)')}</th><th>${T('類型','类型','Type')}</th><th>${T('資產／網路','资产／网络','Asset / network')}</th><th class="r">${T('申請／紀錄金額','申请／记录金额','Requested / recorded amount')}</th><th class="r">${T('已結算（含 Demo 費用）','已结算（含 Demo 费用）','Settled (incl. Demo fee)')}</th><th>${T('來源 → 目標','来源 → 目标','Source → destination')}</th><th>${T('狀態','状态','Status')}</th><th>${T('操作','操作','Actions')}</th></tr></thead><tbody>${rows.map(row=>{const p=parties(row,data);return `<tr data-wallet-activity-id="${esc(row.id)}"><td class="mono wa-record-id">${esc(row.id)}</td><td class="nowrap">${esc(localTime(row.date))}</td><td>${esc(kindText(row.kind,row))}</td><td>${esc(row.asset)}<small>${NETWORKS[row.network]}</small></td><td class="r mono wa-amount" data-wa-requested>${esc(amountText(row))}</td><td class="r mono wa-amount" data-wa-settled>${esc(amountText(row,settledUnits(row)))}</td><td class="wa-parties"><span>${esc(p.from)}</span><span aria-hidden="true">→</span><span>${esc(p.to)}</span></td><td>${stateBadge(row)}</td><td><button class="btn sm wa-view" type="button" data-wa-id="${esc(row.id)}">${T('查看','查看','View')}</button></td></tr>`;}).join('')||`<tr><td colspan="9" class="empty">${T('沒有符合條件的錢包紀錄','没有符合条件的钱包记录','No wallet activity matches these filters')}</td></tr>`}</tbody></table></div>`;
    return rows.length?html:html.replace(/<div class="tbl-wrap"><table class="wa-table">[\s\S]*<\/table><\/div>$/,emptyMarkup(data));
  }
  function bind(host){
    const form=host.querySelector('#wallet-activity-form');form.onsubmit=event=>{event.preventDefault();API.apply();};
    form.addEventListener('change',event=>{if(event.target.id==='wallet-activity-query'&&!event.target.value&&model()?.filters.query)API.apply();});
    host.querySelector('#wallet-activity-clear').onclick=()=>API.clear();host.querySelector('#wallet-activity-export').onclick=()=>API.exportCSV();
    host.querySelectorAll('.wa-view').forEach(button=>button.onclick=()=>API.detail(button.dataset.waId));
    const labels=[...host.querySelectorAll('.wa-table thead th')].map(th=>th.textContent.trim());
    host.querySelectorAll('.wa-table tbody tr').forEach(row=>[...row.cells].forEach((cell,index)=>cell.dataset.label=labels[index]||''));
  }
  function exchangeDetail(row){
    const r=AzureWallets.operations.exchange.get(row.exchangeId);if(!r)return '';
    const fields=[[T('兌換編號','兑换编号','Conversion ID'),r.id],[T('來源錢包','来源钱包','Source wallet'),r.fromName],[T('目的錢包','目的钱包','Destination wallet'),r.toName],[T('來源總扣款（含費）','来源总扣款（含费）','Total source debit (fee included)'),r.amount+' '+r.fromCurrency],[T('已包含的 Demo 費用','已包含的 Demo 费用','Included Demo fee'),r.fee+' '+r.feeCurrency],[T('實收金額','实收金额','Amount received'),r.receiveAmount+' '+r.toCurrency],[T('固定 Demo 匯率','固定 Demo 汇率','Fixed Demo rate'),'1 '+r.fromCurrency+' = '+r.rateText+' '+r.toCurrency],[T('成交時間','成交时间','Executed at'),localTime(r.date)],[T('操作者','操作者','Actor'),r.actor?.email||'—']];
    return `<dl class="kv wa-detail">${fields.map(([k,v])=>`<dt>${k}</dt><dd data-notr>${esc(v)}</dd>`).join('')}</dl><p class="small muted">${T('兩邊 Demo 結存已同步更新；這不是銀行或鏈上成交憑證。','两边 Demo 结存已同步更新；这不是银行或链上成交凭证。','Both Demo balances were updated together. This is not a bank or on-chain receipt.')}</p><div class="wa-copy-fallback" hidden></div>`;
  }
  function detailBody(row,data){
    if(row.exchangeId)return exchangeDetail(row);
    const p=parties(row,data),fields=[
      [T('紀錄編號','记录编号','Record ID'),esc(row.id),'mono'],
      [T('時間（UTC+8）','时间（UTC+8）','Time (UTC+8)'),esc(localTime(row.date))],
      [T('類型','类型','Type'),esc(kindText(row.kind,row))],
      [T('資產／網路','资产／网络','Asset / network'),esc(row.asset)+' · '+NETWORKS[row.network]],
      [T('申請／紀錄本金','申请／记录本金','Requested / recorded principal'),esc(amountText(row))+' '+esc(row.asset),'mono','data-wa-detail-amount'],
      [T('已結算（含 Demo 費用）','已结算（含 Demo 费用）','Settled (incl. Demo fee)'),esc(amountText(row,settledUnits(row)))+' '+esc(row.asset),'mono','data-wa-detail-settled'],
      [T('來源','来源','Source'),esc(p.from)],[T('目標','目标','Destination'),esc(p.to)],
      [T('操作者','操作者','Actor'),esc(row.actor?.email||missing())+'<small>'+esc(row.actor?.role||'')+'</small>'],
      [T('狀態','状态','Status'),stateBadge(row)],
      [T('Demo 申請費用','Demo 申请费用','Requested Demo fee'),esc(formattedUnits(feeUnits(row)))+' USDT','mono','data-wa-detail-fee']
    ];
    if(funding(row)){
      fields.push([T('申請總額（本金＋費用）','申请总额（本金＋费用）','Requested total (principal + fee)'),esc(formattedUnits(totalUnits(row)))+' USDT','mono','data-wa-detail-total']);
      fields.push([T('目前保留金額','当前保留金额','Currently reserved'),esc(formattedUnits(reservedUnits(row)))+' USDT','mono','data-wa-detail-reserved']);
      let impact;
      if(row.kind==='deposit')impact=statusOf(row)==='completed'?T('模擬入金已入帳。','模拟入金已入账。','Simulated deposit credited.'):T('尚未入帳；此申請未增加可用結存。','尚未入账；此申请未增加可用结存。','Not credited; this request has not increased the available balance.');
      else if(statusOf(row)==='pending')impact=T('申請本金與 Demo 費用目前保留中，尚未結算。','申请本金与 Demo 费用当前保留中，尚未结算。','Principal and the Demo fee are reserved, not settled.');
      else if(statusOf(row)==='completed')impact=T('申請本金與 Demo 費用已由保留結存結算。','申请本金与 Demo 费用已从保留结存结算。','Principal and the Demo fee have settled from the reserved balance.');
      else impact=T(`已將保留的本金與 Demo 費用全額退回可用結存：${formattedUnits(totalUnits(row))} USDT。`,`已将保留的本金与 Demo 费用全额退回可用结存：${formattedUnits(totalUnits(row))} USDT。`,`Reserved principal and the Demo fee were fully returned to the available balance: ${formattedUnits(totalUnits(row))} USDT.`);
      fields.push([T('結存影響','结存影响','Balance effect'),esc(impact),'','data-wa-balance-effect']);
      if(row.address)fields.push([row.kind==='deposit'?T('入金地址','入金地址','Deposit address'):T('提款目標地址','提款目标地址','Withdrawal address'),esc(row.address),'mono']);
      if(row.reference)fields.push([T('Demo 參考編號（非鏈上雜湊）','Demo 参考编号（非链上哈希）','Demo reference (not a chain hash)'),esc(row.reference),'mono']);
      if(row.requestId)fields.push([T('申請識別碼','申请标识码','Request identifier'),esc(row.requestId),'mono']);
      if(row.updatedAt&&Number.isFinite(Date.parse(row.updatedAt)))fields.push([T('狀態更新（UTC+8）','状态更新（UTC+8）','Status updated (UTC+8)'),esc(localTime(row.updatedAt))]);
      if(row.memo)fields.push([T('備註','备注','Memo'),esc(row.memo)]);
    }
    fields.push([T('鏈上交易雜湊','链上交易哈希','On-chain transaction hash'),T('尚未分配：此 Demo 未發送鏈上交易','尚未分配：此 Demo 未发送链上交易','Not assigned: no on-chain transaction was sent')]);
    return `<dl class="kv wa-detail">${fields.map(([label,value,cls='',attribute=''])=>`<dt>${label}</dt><dd class="${cls}" ${attribute}>${value}</dd>`).join('')}</dl><p class="small muted">${T('此紀錄只屬於本機 Demo，不是銀行或鏈上交易憑證。Demo 費用不是實際鏈上手續費。','此记录仅属于本机 Demo，不是银行或链上交易凭证。Demo 费用不是实际链上手续费。','This local Demo record is not a bank or on-chain receipt. Demo fees are not actual on-chain fees.')}</p><div class="wa-copy-fallback" hidden></div>`;
  }
  function detailFooter(row){
    const pending=funding(row)&&statusOf(row)==='pending'&&typeof window.AzureWalletFunding?.openRecord==='function';
    return `${row.batchId?`<button class="btn" onclick="AzureWalletActivity.openBatch()">${T('查看整批付款','查看整批付款','View full batch')}</button>`:''}${row.exchangeId?`<button class="btn" onclick="AzureWalletActivity.openExchange()">${T('查看兌換成交','查看兑换成交','View conversion')}</button>`:''}<button class="btn wa-copy-id" type="button" onclick="AzureWalletActivity.copyId()">${T('複製紀錄編號','复制记录编号','Copy record ID')}</button>${pending?`<button class="btn primary wa-manage-funding" type="button" aria-label="${T('處理此 Demo 申請','处理此 Demo 申请','Manage this Demo request')}" onclick="AzureWalletActivity.openFunding()">${T('繼續處理','继续处理','Continue')}</button>`:''}<button class="btn wa-close${pending?'':' primary'}" type="button" onclick="closeModal()">${T('關閉','关闭','Close')}</button>`;
  }

  function updateDetail(){
    const dialog=document.querySelector('.wallet-activity-drawer');if(!dialog||!detailContext)return;
    const data=model(),row=data?.rows.find(r=>r.id===detailContext.id);
    if(!row||data.snapshot.customerId!==detailContext.customerId){closeModal();return;}
    dialog.querySelector('.modal-head h3').textContent=T('錢包紀錄詳情','钱包记录详情','Wallet activity details');dialog.querySelector('.modal-body').innerHTML=detailBody(row,data);
    dialog.querySelector('.modal-foot').innerHTML=detailFooter(row);
  }
  const API=window.AzureWalletActivity={ready:true,
    apply(){
      const data=model(),form=document.getElementById('wallet-activity-form');if(!data||!form||typeof AzureWallets.preferences!=='function')return;
      const read=key=>form.querySelector('#wallet-activity-'+key)?.value||'';
      const next={scope:read('scope'),query:read('query').trim(),type:read('type'),status:read('status'),network:read('network'),from:read('from'),to:read('to')};
      const invalid=!dateValid(next.from)||!dateValid(next.to)||next.from&&next.to&&next.from>next.to;
      const error=form.querySelector('#wallet-activity-error');
      if(invalid){error.textContent=T('請輸入有效的日期範圍，開始日期不可晚於結束日期。','请输入有效的日期范围，开始日期不可晚于结束日期。','Enter a valid date range. The from date must not follow the to date.');error.hidden=false;form.querySelector('#wallet-activity-from').setAttribute('aria-invalid','true');form.querySelector('#wallet-activity-from').focus();return;}
      if(!['selected','all'].includes(next.scope)||next.type&&!TYPES.includes(next.type)||next.status&&!STATUSES.includes(next.status)||next.network&&!NETWORKS[next.network]||next.query.length>200)return;
      AzureWallets.preferences({filters:next});
    },
    clear(){if(model()&&typeof AzureWallets.preferences==='function')AzureWallets.preferences({filters:defaults()});},
    detail(id){
      const data=model(),row=data?.rows.find(r=>r.id===id);if(!row)return toast(T('找不到此客戶的錢包紀錄。','找不到此客户的钱包记录。','No wallet record was found for this customer.'));
      const opener=document.activeElement;
      modal(T('錢包紀錄詳情','钱包记录详情','Wallet activity details'),detailBody(row,data),detailFooter(row));
      const dialog=document.querySelector('.modal');if(!dialog)return;
      detailContext={id:row.id,customerId:data.snapshot.customerId,opener};dialog.classList.add('wallet-activity-drawer');const title=dialog.querySelector('.modal-head h3');title.id='wallet-activity-title';dialog.setAttribute('aria-labelledby',title.id);
      dialog.querySelector('.modal-head button')?.focus();
    },
    async copyId(){
      const data=model(),row=data?.rows.find(r=>r.id===detailContext?.id),dialog=document.querySelector('.wallet-activity-drawer');if(!row||!dialog||data.snapshot.customerId!==detailContext.customerId)return;
      try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(row.id);toast(T('已複製紀錄編號','已复制记录编号','Record ID copied'));}
      catch{const fallback=dialog.querySelector('.wa-copy-fallback');fallback.hidden=false;fallback.innerHTML=`<label>${T('請手動複製紀錄編號','请手动复制记录编号','Copy the record ID manually')}<textarea class="input" readonly>${esc(row.id)}</textarea></label>`;const input=fallback.querySelector('textarea');input.focus();input.select();}
    },
    openFunding(){
      const data=model(),row=data?.rows.find(r=>r.id===detailContext?.id);
      if(!row||!funding(row)||statusOf(row)!=='pending'||data.snapshot.customerId!==detailContext.customerId||!document.querySelector('.wallet-activity-drawer')||typeof window.AzureWalletFunding?.openRecord!=='function')return;
      AzureWalletFunding.openRecord(row.id);
    },
    openBatch(){const data=model(),row=data?.rows.find(r=>r.id===detailContext?.id);if(!row?.batchId||data.snapshot.customerId!==detailContext.customerId)return;closeModal();window.AzureWalletBatch?.openRecord(row.batchId);},
    openExchange(){const data=model(),row=data?.rows.find(r=>r.id===detailContext?.id);if(!row?.exchangeId||data.snapshot.customerId!==detailContext.customerId)return;closeModal();window.AzureWalletExchange?.openRecord(row.exchangeId);},
    startDeposit(){if(model()&&typeof window.AzureWalletFunding?.openDeposit==='function')AzureWalletFunding.openDeposit();},
    exportCSV(){
      const data=model();if(!data)return;const rows=filtered(data);if(!rows.length)return;
      const headers=['Record ID','Time (UTC+8)','Type','Asset','Network','Requested / recorded principal','Source','Destination','Status','Actor','Requested Demo fee','Requested total','Currently reserved','Settled amount (incl. Demo fee)','Address','Demo reference (not a chain hash)','Memo','Request identifier'];
      const unsigned=units=>numericAmount({kind:'deposit'},units).replace(/^\+/,'');
      const lines=[headers.map(textCell).join(','),...rows.map(row=>{const p=parties(row,data);return [textCell(row.id),textCell(localTime(row.date)),textCell(kindText(row.kind,row)),textCell(row.asset),textCell(NETWORKS[row.network]),numericCell(numericAmount(row)),textCell(p.from),textCell(p.to),textCell(statusText(row)),textCell(row.actor?.email||''),numericCell(unsigned(feeUnits(row))),numericCell(unsigned(totalUnits(row))),numericCell(unsigned(reservedUnits(row))),numericCell(numericAmount(row,settledUnits(row))),textCell(row.address||''),textCell(row.reference||''),textCell(row.memo||''),textCell(row.requestId||'')].join(',');})];
      const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`wallet-activity-${CID().replace(/[^a-zA-Z0-9_-]/g,'_')}-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  };
  function enhance(){
    if(owned()&&S.page==='wallets'){const host=document.querySelector('.wallet-page .wallet-history'),data=model();if(host&&data){host.classList.add('wallet-activity');host.innerHTML=markup(data);bind(host);}}
    updateDetail();
  }
  const previousAfter=afterRender;afterRender=function(...args){const result=previousAfter(...args);enhance();return result;};
  const previousClose=closeModal;closeModal=function(...args){const context=document.querySelector('.wallet-activity-drawer')?detailContext:null;const result=previousClose(...args);if(context){detailContext=null;requestAnimationFrame(()=>{if(!document.querySelector('.modal')&&context.opener?.isConnected)context.opener.focus();});}return result;};
  document.addEventListener('keydown',event=>{
    const dialog=document.querySelector('.wallet-activity-drawer');if(!dialog||event.key!=='Tab')return;
    const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
  });
  enhance();
})();
