/* Read-only, customer-scoped Demo wallet activity. No bank or chain mutations. */
(() => {
  'use strict';
  const SCALE=1000000, TYPES=['credit','transfer-in','transfer-out'];
  const NETWORKS={tron:'TRON (TRC20)',ethereum:'Ethereum (ERC20)'};
  const defaults=()=>({scope:'selected',query:'',type:'',network:'',from:'',to:''});
  const T=(tc,sc,en)=>C(tc,sc,en),esc=value=>E(value);
  let detailContext=null;
  const owned=()=>S.portal==='cust'&&window.AzureBridge?.account?.role==='cust'&&window.AzureWallets;
  function model(){
    if(!owned())return null;
    const snapshot=AzureWallets.snapshot();if(!snapshot||snapshot.customerId!==CID())return null;
    const wallets=new Map((snapshot.crypto||[]).filter(w=>w.customerId===CID()).map(w=>[w.id,w]));
    const rows=(snapshot.ledger||[]).filter(r=>r.customerId===CID()&&wallets.has(r.walletId)&&TYPES.includes(r.kind)&&r.asset==='USDT'&&NETWORKS[r.network]&&wallets.get(r.walletId).network===r.network&&Number.isSafeInteger(r.amountUnits)&&r.amountUnits>0&&Number.isFinite(Date.parse(r.date)));
    return {snapshot,wallets,rows,filters:{...defaults(),...(snapshot.preferences?.filters||{})}};
  }
  const kindText=kind=>kind==='credit'?T('模擬入金','模拟入金','Simulated deposit'):kind==='transfer-in'?T('轉入','转入','Transfer in'):T('轉出','转出','Transfer out');
  const statusText=()=>T('Demo 已完成','Demo 已完成','Demo completed');
  const missing=()=>T('未提供','未提供','Not supplied');
  function parties(row,data){
    const own=data.wallets.get(row.walletId)?.name||missing(),other=data.wallets.get(row.otherWalletId)?.name||missing();
    return row.kind==='credit'?{from:T('Demo 模擬入金','Demo 模拟入金','Demo simulated deposit'),to:own}:row.kind==='transfer-in'?{from:other,to:own}:{from:own,to:other};
  }
  function localDate(value){return new Date(Date.parse(value)+28800000).toISOString().slice(0,10);}
  function localTime(value){return new Date(Date.parse(value)+28800000).toISOString().slice(0,19).replace('T',' ')+' UTC+8';}
  function dateValid(value){if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
  function filtered(data){
    const f=data.filters,q=String(f.query||'').trim().toLowerCase();
    return data.rows.filter(row=>{
      if(f.scope!=='all'&&row.walletId!==data.snapshot.selectedId)return false;
      if(f.type&&row.kind!==f.type||f.network&&row.network!==f.network)return false;
      const day=localDate(row.date);if(f.from&&day<f.from||f.to&&day>f.to)return false;
      const p=parties(row,data);
      return !q||[row.id,data.wallets.get(row.walletId)?.name,p.from,p.to,row.actor?.email,row.actor?.role].join(' ').toLowerCase().includes(q);
    }).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  }
  function amountText(row){const formatted=AzureWallets.formatAmount?AzureWallets.formatAmount(row.amountUnits/SCALE,row.asset):'—';return (row.kind==='transfer-out'?'−':'+')+formatted;}
  function numericAmount(row){const whole=Math.floor(row.amountUnits/SCALE),fraction=String(row.amountUnits%SCALE).padStart(6,'0').replace(/0+$/,'');return(row.kind==='transfer-out'?'-':'+')+whole+(fraction?'.'+fraction:'');}
  function textCell(value){let text=String(value??'');if(/^[\u0000-\u0020]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
  const numericCell=value=>'"'+value+'"';
  function options(items,selected){return items.map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');}
  function markup(data){
    const f=data.filters,rows=filtered(data);
    return `<div class="card-head"><div><h3 class="card-title">${T('錢包交易紀錄','钱包交易记录','Wallet activity')}</h3><p class="small muted">${T('僅顯示目前客戶的 Demo 錢包紀錄；時間以 UTC+8 顯示。','仅显示当前客户的 Demo 钱包记录；时间以 UTC+8 显示。','Only this customer’s Demo wallet records are shown. Times use UTC+8.')}</p></div><span class="badge info">Demo</span></div><form class="wa-filter-form" id="wallet-activity-form"><div class="wa-filters"><div class="field wa-query"><label for="wallet-activity-query">${T('搜尋紀錄','搜索记录','Search activity')}</label><input class="input" type="search" id="wallet-activity-query" maxlength="200" value="${esc(f.query)}" placeholder="${T('紀錄編號、錢包、對手方或操作者','记录编号、钱包、对手方或操作者','Record ID, wallet, counterparty or actor')}"></div><div class="field"><label for="wallet-activity-scope">${T('範圍','范围','Scope')}</label><select class="select" id="wallet-activity-scope">${options([['selected',T('目前錢包','当前钱包','Selected wallet')],['all',T('此客戶所有錢包','此客户所有钱包','All this customer’s wallets')]],f.scope)}</select></div><div class="field"><label for="wallet-activity-type">${T('類型','类型','Type')}</label><select class="select" id="wallet-activity-type">${options([['',T('全部類型','全部类型','All types')],...TYPES.map(type=>[type,kindText(type)])],f.type)}</select></div><div class="field"><label for="wallet-activity-network">${T('網路','网络','Network')}</label><select class="select" id="wallet-activity-network">${options([['',T('全部網路','全部网络','All networks')],...Object.entries(NETWORKS)],f.network)}</select></div><div class="field"><label for="wallet-activity-from">${T('開始日期（UTC+8）','开始日期（UTC+8）','From date (UTC+8)')}</label><input class="input" type="date" id="wallet-activity-from" value="${esc(f.from)}"></div><div class="field"><label for="wallet-activity-to">${T('結束日期（UTC+8）','结束日期（UTC+8）','To date (UTC+8)')}</label><input class="input" type="date" id="wallet-activity-to" value="${esc(f.to)}"></div><div class="wa-filter-actions"><button class="btn primary" id="wallet-activity-apply" type="submit">${T('套用篩選','套用筛选','Apply filters')}</button><button class="btn" id="wallet-activity-clear" type="button">${T('清除篩選','清除筛选','Clear filters')}</button></div></div><p class="wa-error" id="wallet-activity-error" role="alert" hidden></p></form><div class="wa-result-head"><span class="small muted" data-wallet-activity-count="${rows.length}">${T(`共 ${rows.length} 筆`,`共 ${rows.length} 笔`,`${rows.length} records`)}</span><button class="btn sm" id="wallet-activity-export" type="button" ${rows.length?'':'disabled'}>${ICON.dl}${T('匯出 CSV','导出 CSV','Export CSV')}</button></div><p class="wa-export-note small muted">${T('CSV 會包含原始金額，即使畫面已隱藏金額。僅匯出目前篩選結果。','CSV 会包含原始金额，即使画面已隐藏金额。仅导出当前筛选结果。','CSV includes raw amounts even when amounts are hidden on screen. Only the current filtered results are exported.')}</p><div class="tbl-wrap"><table class="wa-table"><thead><tr><th>${T('紀錄編號','记录编号','Record ID')}</th><th>${T('時間（UTC+8）','时间（UTC+8）','Time (UTC+8)')}</th><th>${T('類型','类型','Type')}</th><th>${T('資產／網路','资产／网络','Asset / network')}</th><th class="r">${T('金額','金额','Amount')}</th><th>${T('來源 → 目標錢包','来源 → 目标钱包','Source → destination')}</th><th>${T('狀態','状态','Status')}</th><th>${T('操作','操作','Actions')}</th></tr></thead><tbody>${rows.map(row=>{const p=parties(row,data);return `<tr data-wallet-activity-id="${esc(row.id)}"><td class="mono wa-record-id">${esc(row.id)}</td><td class="nowrap">${esc(localTime(row.date))}</td><td>${esc(kindText(row.kind))}</td><td>${esc(row.asset)}<small>${NETWORKS[row.network]}</small></td><td class="r mono wa-amount">${esc(amountText(row))}</td><td class="wa-parties"><span>${esc(p.from)}</span><span aria-hidden="true">→</span><span>${esc(p.to)}</span></td><td><span class="badge ok">${statusText()}</span></td><td><button class="btn sm wa-view" type="button" data-wa-id="${esc(row.id)}">${T('查看','查看','View')}</button></td></tr>`;}).join('')||`<tr><td colspan="8" class="empty">${T('沒有符合條件的錢包紀錄','没有符合条件的钱包记录','No wallet activity matches these filters')}</td></tr>`}</tbody></table></div>`;
  }
  function bind(host){
    const form=host.querySelector('#wallet-activity-form');form.onsubmit=event=>{event.preventDefault();API.apply();};
    form.addEventListener('change',event=>{if(event.target.id==='wallet-activity-query'&&!event.target.value&&model()?.filters.query)API.apply();});
    host.querySelector('#wallet-activity-clear').onclick=()=>API.clear();host.querySelector('#wallet-activity-export').onclick=()=>API.exportCSV();
    host.querySelectorAll('.wa-view').forEach(button=>button.onclick=()=>API.detail(button.dataset.waId));
  }
  function detailBody(row,data){const p=parties(row,data);return `<dl class="kv wa-detail"><dt>${T('紀錄編號','记录编号','Record ID')}</dt><dd class="mono">${esc(row.id)}</dd><dt>${T('時間（UTC+8）','时间（UTC+8）','Time (UTC+8)')}</dt><dd>${esc(localTime(row.date))}</dd><dt>${T('類型','类型','Type')}</dt><dd>${esc(kindText(row.kind))}</dd><dt>${T('資產／網路','资产／网络','Asset / network')}</dt><dd>${esc(row.asset)} · ${NETWORKS[row.network]}</dd><dt>${T('金額','金额','Amount')}</dt><dd class="mono" data-wa-detail-amount>${esc(amountText(row))} ${esc(row.asset)}</dd><dt>${T('來源錢包','来源钱包','Source wallet')}</dt><dd>${esc(p.from)}</dd><dt>${T('目標錢包','目标钱包','Destination wallet')}</dt><dd>${esc(p.to)}</dd><dt>${T('操作者','操作者','Actor')}</dt><dd>${esc(row.actor?.email||missing())}<small>${esc(row.actor?.role||'')}</small></dd><dt>${T('狀態','状态','Status')}</dt><dd><span class="badge ok">${statusText()}</span></dd><dt>${T('手續費','手续费','Fee')}</dt><dd>${T('未產生鏈上手續費（Demo）','未产生链上手续费（Demo）','No on-chain fee was incurred (Demo)')}</dd><dt>${T('鏈上交易雜湊','链上交易哈希','On-chain transaction hash')}</dt><dd>${T('尚未分配：此 Demo 未發送鏈上交易','尚未分配：此 Demo 未发送链上交易','Not assigned: no on-chain transaction was sent')}</dd></dl><p class="small muted">${T('此紀錄只屬於本機 Demo，不是銀行或鏈上交易憑證。','此记录仅属于本机 Demo，不是银行或链上交易凭证。','This local Demo record is not a bank or on-chain transaction receipt.')}</p><div class="wa-copy-fallback" hidden></div>`;}
  function updateDetail(){
    const dialog=document.querySelector('.wallet-activity-drawer');if(!dialog||!detailContext)return;
    const data=model(),row=data?.rows.find(r=>r.id===detailContext.id);
    if(!row||data.snapshot.customerId!==detailContext.customerId){closeModal();return;}
    dialog.querySelector('.modal-head h3').textContent=T('錢包紀錄詳情','钱包记录详情','Wallet activity details');dialog.querySelector('.modal-body').innerHTML=detailBody(row,data);
    const copy=dialog.querySelector('.wa-copy-id');if(copy)copy.textContent=T('複製紀錄編號','复制记录编号','Copy record ID');
  }
  const API=window.AzureWalletActivity={ready:true,
    apply(){
      const data=model(),form=document.getElementById('wallet-activity-form');if(!data||!form||typeof AzureWallets.preferences!=='function')return;
      const read=key=>form.querySelector('#wallet-activity-'+key)?.value||'';
      const next={scope:read('scope'),query:read('query').trim(),type:read('type'),network:read('network'),from:read('from'),to:read('to')};
      const invalid=!dateValid(next.from)||!dateValid(next.to)||next.from&&next.to&&next.from>next.to;
      const error=form.querySelector('#wallet-activity-error');
      if(invalid){error.textContent=T('請輸入有效的日期範圍，開始日期不可晚於結束日期。','请输入有效的日期范围，开始日期不可晚于结束日期。','Enter a valid date range. The from date must not follow the to date.');error.hidden=false;form.querySelector('#wallet-activity-from').setAttribute('aria-invalid','true');form.querySelector('#wallet-activity-from').focus();return;}
      if(!['selected','all'].includes(next.scope)||next.type&&!TYPES.includes(next.type)||next.network&&!NETWORKS[next.network]||next.query.length>200)return;
      AzureWallets.preferences({filters:next});
    },
    clear(){if(model()&&typeof AzureWallets.preferences==='function')AzureWallets.preferences({filters:defaults()});},
    detail(id){
      const data=model(),row=data?.rows.find(r=>r.id===id);if(!row)return toast(T('找不到此客戶的錢包紀錄。','找不到此客户的钱包记录。','No wallet record was found for this customer.'));
      const opener=document.activeElement;
      modal(T('錢包紀錄詳情','钱包记录详情','Wallet activity details'),detailBody(row,data),`<button class="btn wa-copy-id" type="button" onclick="AzureWalletActivity.copyId()">${T('複製紀錄編號','复制记录编号','Copy record ID')}</button><button class="btn primary" type="button" onclick="closeModal()">${T('關閉','关闭','Close')}</button>`);
      const dialog=document.querySelector('.modal');if(!dialog)return;
      detailContext={id:row.id,customerId:data.snapshot.customerId,opener};dialog.classList.add('wallet-activity-drawer');const title=dialog.querySelector('.modal-head h3');title.id='wallet-activity-title';dialog.setAttribute('aria-labelledby',title.id);
      dialog.querySelector('.modal-head button')?.focus();
    },
    async copyId(){
      const data=model(),row=data?.rows.find(r=>r.id===detailContext?.id),dialog=document.querySelector('.wallet-activity-drawer');if(!row||!dialog||data.snapshot.customerId!==detailContext.customerId)return;
      try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(row.id);toast(T('已複製紀錄編號','已复制记录编号','Record ID copied'));}
      catch{const fallback=dialog.querySelector('.wa-copy-fallback');fallback.hidden=false;fallback.innerHTML=`<label>${T('請手動複製紀錄編號','请手动复制记录编号','Copy the record ID manually')}<textarea class="input" readonly>${esc(row.id)}</textarea></label>`;const input=fallback.querySelector('textarea');input.focus();input.select();}
    },
    exportCSV(){
      const data=model();if(!data)return;const rows=filtered(data);if(!rows.length)return;
      const headers=['Record ID','Time (UTC+8)','Type','Asset','Network','Amount','Source wallet','Destination wallet','Status','Actor'];
      const lines=[headers.map(textCell).join(','),...rows.map(row=>{const p=parties(row,data);return [textCell(row.id),textCell(localTime(row.date)),textCell(kindText(row.kind)),textCell(row.asset),textCell(NETWORKS[row.network]),numericCell(numericAmount(row)),textCell(p.from),textCell(p.to),textCell(statusText()),textCell(row.actor?.email||'')].join(',');})];
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
