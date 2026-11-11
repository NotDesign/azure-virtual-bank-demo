/* Wallet-to-wallet reference conversion. No order, balance mutation or price lock. */
(() => {
  'use strict';
  const T=(tc,sc,en)=>C(tc,sc,en),Etext=v=>E(v);
  let unsubscribe=null;
  const current=()=>window.AzureBridge?.account?.role==='cust';
  function amount(value){const s=String(value??'').trim();if(!/^\d+(?:\.\d{1,6})?$/.test(s))return null;const n=Number(s);return Number.isFinite(n)&&n>0&&n<=1000000000?n:null;}
  function compute(fromId,toId,value){
    if(!current())return {ok:false,reason:'scope'};
    const wallets=AzureWallets.list(),from=wallets.find(w=>w.id===fromId),to=wallets.find(w=>w.id===toId),n=amount(value);
    if(!from||!to)return {ok:false,reason:'wallet'};
    if(n===null)return {ok:false,reason:'amount'};
    if(from.asset===to.asset)return {ok:false,reason:'same-asset'};
    const rate=window.AzureMarketRates?.getRate(from.asset,to.asset),state=window.AzureMarketRates?.status();
    if(!Number.isFinite(rate)||rate<=0)return {ok:false,reason:'rate',from,to};
    const result=n*rate;if(!Number.isFinite(result))return {ok:false,reason:'amount'};
    return {ok:true,from,to,amount:n,rate,result,fetchedAt:state?.fetchedAt||null,stale:!!(state?.stale||state?.error),provider:state?.provider||'Coinbase'};
  }
  function options(wallets,selected){
    return [['fiat',T('銀行帳戶／法幣','银行账户／法币','Bank accounts / fiat')],['crypto',T('加密錢包','加密钱包','Crypto wallets')]].map(([kind,label])=>{const rows=wallets.filter(w=>w.kind===kind);return rows.length?`<optgroup label="${Etext(label)}">${rows.map(w=>`<option value="${Etext(w.id)}" ${w.id===selected?'selected':''}>${Etext(w.name)}${w.network?' · '+(w.network==='tron'?'TRC20':'ERC20'):''}</option>`).join('')}</optgroup>`:'';}).join('');
  }
  function update(){
    const dialog=document.querySelector('.wallet-quote-modal');if(!dialog){unsubscribe?.();unsubscribe=null;return;}
    const from=dialog.querySelector('#wallet-quote-from'),to=dialog.querySelector('#wallet-quote-to'),input=dialog.querySelector('#wallet-quote-amount'),quote=compute(from.value,to.value,input.value),wallets=AzureWallets.list(),source=wallets.find(w=>w.id===from.value);
    const balance=dialog.querySelector('[data-wallet-quote-balance]');balance.textContent=source?T('可用：','可用：','Available: ')+AzureWallets.formatAmount(source.available,source.asset)+' '+source.asset:'—';
    dialog.querySelector('[data-wallet-quote-max]').disabled=source?.available===null||!source;
    const value=dialog.querySelector('[data-wallet-quote-result]'),rate=dialog.querySelector('[data-wallet-quote-rate]'),time=dialog.querySelector('[data-wallet-quote-time]'),state=dialog.querySelector('[data-wallet-quote-state]');
    if(quote.ok){
      value.textContent=AzureWallets.formatAmount(quote.result,quote.to.asset)+' '+quote.to.asset;
      rate.textContent=`1 ${quote.from.asset} = ${new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(quote.rate)} ${quote.to.asset}`;
      time.textContent=quote.provider+' · '+T('擷取時間：','获取时间：','Retrieved: ')+(quote.fetchedAt?new Date(quote.fetchedAt).toLocaleString(I18N.lang==='en'?'en-GB':'zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'—')+' (UTC+8)';
      state.textContent=quote.stale?T('上次參考匯率 · 資料已過期','上次参考汇率 · 数据已过期','Last reference rate · stale'):T('市場參考試算','市场参考试算','Market reference estimate');
    }else{
      value.textContent='—';rate.textContent='';time.textContent='';state.textContent=quote.reason==='rate'?T('此交易對未提供參考匯率','此交易对未提供参考汇率','Reference rate unavailable for this pair'):quote.reason==='same-asset'?T('同幣種請使用錢包轉帳','同币种请使用钱包转账','Use wallet transfer for the same asset'):quote.reason==='wallet'?T('請選擇不同資產的來源及目的錢包','请选择不同资产的来源及目的钱包','Select source and destination wallets with different assets'):T('請輸入大於 0 的金額，最多 6 位小數','请输入大于 0 的金额，最多 6 位小数','Enter a positive amount with up to 6 decimals');
    }
    const execute=dialog.querySelector('[data-wallet-start-exchange]'),target=wallets.find(w=>w.id===to.value);if(execute)execute.disabled=!source||!target||((source.asset==='USDT')===(target.asset==='USDT'))||AzureWallets.operations.config().readOnly;
    dialog.dataset.quoteState=quote.ok?(quote.stale?'stale':'available'):'unavailable';
  }
  function updateDestination(preferred){
    const from=document.getElementById('wallet-quote-from'),to=document.getElementById('wallet-quote-to');if(!from||!to)return;
    const all=AzureWallets.list(),source=all.find(w=>w.id===from.value),targets=all.filter(w=>w.asset!==source?.asset),previous=preferred||to.value;
    to.innerHTML=targets.length?options(targets,previous):`<option value="">${T('目前沒有其他資產錢包','目前没有其他资产钱包','No other asset wallet available')}</option>`;update();
  }
  const API=window.AzureWalletPreview={ready:true,compute,
    open(){
      if(!current())return;
      unsubscribe?.();unsubscribe=null;const all=AzureWallets.list(),selected=all.find(w=>w.id===AzureWallets.snapshot().selectedId)||all[0];if(!selected)return;
      const targets=all.filter(w=>w.asset!==selected.asset),target=targets.find(w=>w.asset===(selected.asset==='USDT'?'USD':'USDT'))||targets[0];
      const title=T('錢包換匯試算','钱包换汇试算','Wallet conversion preview');
      modal(title,`<div class="wallet-quote-form"><div class="form-grid"><div class="field"><label for="wallet-quote-from">${T('來源錢包','来源钱包','Source wallet')}</label><select class="select" id="wallet-quote-from">${options(all,selected.id)}</select><small data-wallet-quote-balance></small></div><div class="field"><label for="wallet-quote-to">${T('目的錢包','目的钱包','Destination wallet')}</label><select class="select" id="wallet-quote-to">${targets.length?options(targets,target?.id):`<option value="">${T('目前沒有其他資產錢包','目前没有其他资产钱包','No other asset wallet available')}</option>`}</select></div></div><div class="wallet-quote-amount-row"><div class="field"><label for="wallet-quote-amount">${T('試算金額','试算金额','Amount to estimate')}</label><input class="input" id="wallet-quote-amount" inputmode="decimal" value="100"></div><button class="btn" data-wallet-quote-max onclick="AzureWalletPreview.max()">${T('最大','最大','Max')}</button><button class="icon-btn" onclick="AzureWalletPreview.swap()" aria-label="${T('對調來源及目的錢包','对调来源及目的钱包','Swap source and destination wallets')}">${ICON.swap||'⇄'}</button></div><section class="wallet-quote-output" aria-live="polite"><span data-wallet-quote-state></span><strong data-wallet-quote-result>—</strong><span data-wallet-quote-rate></span><small data-wallet-quote-time></small></section><p class="small muted">${T('僅依市場參考匯率試算，不會建立成交訂單、扣款或變更錢包結存；未包含銀行或鏈上服務費。','仅依市场参考汇率试算，不会创建成交订单、扣款或变更钱包结存；未包含银行或链上服务费。','Uses market reference rates only. No order, debit or wallet balance change is created. Bank and blockchain service fees are not included.')}</p></div>`,`<button class="btn" onclick="closeModal()">${T('關閉','关闭','Close')}</button><button class="btn primary" onclick="AzureMarketRates.refresh()">${T('重新查詢匯率','重新查询汇率','Refresh reference rates')}</button><button class="btn primary" data-wallet-start-exchange onclick="AzureWalletPreview.startExchange()">${T('另開 Demo 報價兌換','另开 Demo 报价兑换','Open a Demo execution quote')}</button>`,true);
      const dialog=document.querySelector('.modal');dialog.classList.add('wallet-quote-modal');dialog.setAttribute('aria-label',title);
      document.getElementById('wallet-quote-from').onchange=()=>updateDestination();document.getElementById('wallet-quote-to').onchange=update;document.getElementById('wallet-quote-amount').oninput=update;
      update();if(window.AzureMarketRates?.subscribe)unsubscribe=AzureMarketRates.subscribe(update);
    },
    startExchange(){const fromWalletId=document.getElementById('wallet-quote-from')?.value,toWalletId=document.getElementById('wallet-quote-to')?.value;if(!current()||AzureWallets.operations.config().readOnly)return;closeModal();window.AzureWalletExchange?.open({fromWalletId,toWalletId});},
    max(){const input=document.getElementById('wallet-quote-amount'),source=AzureWallets.list().find(w=>w.id===document.getElementById('wallet-quote-from')?.value);if(!input||!source||source.available===null)return;input.value=String(source.available);update();},
    swap(){const from=document.getElementById('wallet-quote-from'),to=document.getElementById('wallet-quote-to');if(!from||!to||!to.value)return;const previous=from.value;from.value=to.value;updateDestination(previous);}
  };
  const previous=afterRender;afterRender=function(...args){const out=previous(...args);if(current()&&S.page==='wallets'){const actions=document.querySelector('.wallet-actions');if(actions&&!actions.querySelector('.wallet-preview-btn')){const button=document.createElement('button');button.type='button';button.className='btn wallet-preview-btn';button.textContent=T('換匯試算','换汇试算','Conversion preview');button.onclick=API.open;actions.append(button);}}return out;};
  window.addEventListener('pagehide',()=>{unsubscribe?.();unsubscribe=null;});
})();
