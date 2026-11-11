/* Public reference prices only. Never writes FXR, balances, or Demo trade quotes. */
(() => {
  'use strict';
  const ENDPOINT='https://api.coinbase.com/v2/exchange-rates?currency=USD';
  const INTERVAL=30000, TIMEOUT=8000, MAX_BACKOFF=300000;
  let host=window;
  try { while(host.parent!==host && host.parent.location.origin===location.origin)host=host.parent; } catch { /* Keep the highest accessible same-origin host. */ }

  function createFeed(owner) {
    const listeners=new Set(),leases=new Map();
    let rates={},fetchedAt=null,attemptedAt=null,nextRefreshAt=null,error=null;
    let timer=null,inflight=null,controller=null,failures=0,stopped=false,cooldownUntil=null;
    const now=()=>owner.Date.now();
    const visible=()=>!owner.document.hidden;
    function hasView() {
      for(const [win,active]of leases) {
        try { if(win.closed || (win!==owner && !win.frameElement?.isConnected)){leases.delete(win);continue;} } catch { leases.delete(win);continue; }
        if(active){
          let current=win,shown=true;
          try{while(current!==owner){const element=current.frameElement;if(!element?.isConnected||element.inert||element.closest('[hidden]')){shown=false;break;}current=current.parent;}}
          catch{shown=false;}
          if(shown)return true;
        }
      }
      return false;
    }
    const polling=()=>!stopped&&visible()&&hasView();
    function status() {
      const ageMs=fetchedAt===null?null:Math.max(0,now()-fetchedAt);
      const stale=fetchedAt!==null&&(!!error||ageMs>INTERVAL*2);
      const paused=!polling();
      return {ready:true,provider:'Coinbase',endpoint:ENDPOINT,base:'USD',ratesUSDBase:{...rates},fetchedAt,attemptedAt,nextRefreshAt,
        ageMs,hasData:fetchedAt!==null,loading:!!inflight,stale,error:error?{...error}:null,failures,paused,stopped,cooldownUntil,
        phase:inflight?'loading':error?(fetchedAt===null?'error':'stale'):paused?'paused':stale?'stale':fetchedAt===null?'idle':'live',refreshIntervalMs:INTERVAL};
    }
    function emit() {const state=status();for(const fn of [...listeners])try{fn(state);}catch(e){console.error('Market rate subscriber failed',e);}}
    function clearTimer() {if(timer!==null)owner.clearTimeout(timer);timer=null;nextRefreshAt=null;}
    function schedule(delay=INTERVAL) {
      clearTimer();if(!polling())return;
      nextRefreshAt=now()+delay;
      timer=owner.setTimeout(()=>{const remaining=nextRefreshAt-now();timer=null;if(remaining>0){schedule(remaining);return;}nextRefreshAt=null;if(polling())refresh();else reconcile();},Math.min(delay,2147483647));
    }
    function validate(body) {
      if(body?.data?.currency!=='USD'||!body.data.rates||typeof body.data.rates!=='object'||Array.isArray(body.data.rates))throw new Error('invalid-snapshot');
      const next=Object.create(null);
      for(const [currency,raw]of Object.entries(body.data.rates)) {
        if(typeof raw!=='string'&&typeof raw!=='number')throw new Error('invalid-rate');
        if(typeof raw==='string'&&!raw.trim())throw new Error('invalid-rate');
        const value=Number(raw);if(!Number.isFinite(value)||value<=0)throw new Error('invalid-rate');next[currency]=value;
      }
      if(!Number.isFinite(next.USD)||Math.abs(next.USD-1)>1e-8||Object.keys(next).length<2)throw new Error('invalid-base');
      return next;
    }
    function retryDelay(response) {
      const raw=response?.headers?.get('Retry-After')?.trim();
      const retry=raw?(/^\d+$/.test(raw)?Number(raw)*1000:Date.parse(raw)-now()):0;
      const localBackoff=Math.min(MAX_BACKOFF,60000*2**Math.min(failures-1,3));
      return Math.max(localBackoff,Number.isFinite(retry)&&retry>=0?retry:0);
    }
    function refresh() {
      if(!visible())return Promise.resolve(status());
      if(inflight)return inflight;
      stopped=false;
      // Manual refresh respects an existing rate-limit cooldown.
      if(error?.kind==='rate-limit'&&cooldownUntil>now()){if(timer===null)schedule(cooldownUntil-now());return Promise.resolve(status());}
      clearTimer();attemptedAt=now();
      controller=new owner.AbortController();const requestController=controller;
      let timedOut=false;
      const abortTimer=owner.setTimeout(()=>{timedOut=true;requestController.abort();},TIMEOUT);
      inflight=(async()=>{
        let delay=INTERVAL;
        try {
          const response=await owner.fetch(ENDPOINT,{method:'GET',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'},signal:requestController.signal});
          if(!response.ok){const e=new Error('http-'+response.status);e.httpStatus=response.status;e.response=response;throw e;}
          const next=validate(await response.json());
          // A hidden/stopped view must not publish a request that completed after cancellation.
          if(requestController.signal.aborted)return;
          rates=next;fetchedAt=now();error=null;failures=0;cooldownUntil=null;
        } catch(e) {
          if(requestController.signal.aborted&&!timedOut)return;
          failures++;
          error={kind:e.httpStatus===429?'rate-limit':timedOut?'timeout':/^invalid-/.test(e.message)?'invalid-data':'unavailable',httpStatus:e.httpStatus||null,at:now()};
          if(e.httpStatus===429){delay=retryDelay(e.response);cooldownUntil=now()+delay;}
        } finally {
          owner.clearTimeout(abortTimer);controller=null;inflight=null;
          // Visibility can resume before an aborted request's rejection settles.
          schedule(requestController.signal.aborted&&!timedOut&&polling()?0:delay);emit();
        }
      })();
      emit();return inflight;
    }
    function reconcile(force=false) {
      if(!polling()){clearTimer();if(controller)controller.abort();emit();return;}
      if(!inflight&&timer===null){
        if(cooldownUntil>now())schedule(cooldownUntil-now());
        else if(!force&&!error&&fetchedAt!==null&&now()-fetchedAt<INTERVAL)schedule(INTERVAL-(now()-fetchedAt));
        else {refresh();return;}
      }
      emit();
    }
    const visibility=()=>reconcile(!owner.document.hidden);owner.document.addEventListener('visibilitychange',visibility);
    const api={ready:true,status,getRate(from,to){
      const f=String(from||'').toUpperCase(),t=String(to||'').toUpperCase();
      const result=Number.isFinite(rates[f])&&Number.isFinite(rates[t])?rates[t]/rates[f]:null;
      return Number.isFinite(result)&&result>0?result:null;
    },refresh,subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);fn(status());return()=>listeners.delete(fn);},
    stop(){stopped=true;clearTimer();if(controller)controller.abort();emit();}};
    return {api,use(win,active){leases.set(win,!!active);reconcile();},release(win){leases.delete(win);reconcile();}};
  }
  const feed=host.__azureMarketRatesFeedV1||(host.__azureMarketRatesFeedV1=createFeed(host));
  window.AzureMarketRates=feed.api;
  const T=(tc,sc,en)=>typeof C==='function'?C(tc,sc,en):tc;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pairs=[['USD','HKD'],['EUR','USD'],['SGD','HKD'],['CNY','HKD'],['USDT','USD'],['CNH','HKD']];
  let mounted=false,tick=null;
  const rateText=rate=>rate===null?T('未提供','未提供','Not supplied'):new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(rate);
  const timeText=timestamp=>timestamp===null?'—':new Date(timestamp).toLocaleString(I18N.lang==='en'?'en-GB':I18N.lang==='zh-Hans'?'zh-CN':'zh-TW',{hour12:false});
  function stateText(state) {
    if(state.loading)return T('查詢中','查询中','Loading');
    if(state.error?.kind==='rate-limit')return T('暫時限流','暂时限流','Rate limited');
    if(state.error)return state.hasData?T('更新失敗 · 保留上次參考','更新失败 · 保留上次参考','Update failed · last reference retained'):T('參考匯率暫不可用','参考汇率暂不可用','Reference rates unavailable');
    if(state.stale)return T('參考資料已過期','参考资料已过期','Reference data is stale');
    if(state.paused)return T('更新已暫停','更新已暂停','Updates paused');
    return state.hasData?T('已取得參考匯率','已取得参考汇率','Reference rates received'):T('等待查詢','等待查询','Waiting');
  }
  function countdown() {
    const panel=document.querySelector('.amr-panel');if(!panel)return;
    const state=feed.api.status(),remaining=state.nextRefreshAt===null?null:Math.max(0,Math.ceil((state.nextRefreshAt-Date.now())/1000));
    const label=panel.querySelector('[data-amr-countdown]');
    if(label)label.textContent=state.loading?T('查詢中…','查询中…','Loading…'):remaining===null?T('自動更新已暫停','自动更新已暂停','Auto update paused'):T(`${remaining} 秒後查詢`,`${remaining} 秒后查询`,`Refresh in ${remaining}s`);
    const refreshButton=panel.querySelector('[data-amr-refresh]');
    if(refreshButton)refreshButton.disabled=state.loading||(state.error?.kind==='rate-limit'&&remaining!==null&&remaining>0);
  }
  function update() {
    const panel=document.querySelector('.amr-panel');if(!panel)return;
    const state=feed.api.status();panel.dataset.marketState=state.phase;
    panel.innerHTML=`<div class="amr-heading"><div><h3>${T('市場參考匯率','市场参考汇率','Market reference rates')}</h3><span class="amr-status ${state.stale||state.error?'amr-warning':''}" role="status">${escape(stateText(state))}</span></div><div class="amr-controls"><span data-amr-countdown></span><button class="btn sm" type="button" data-amr-refresh>${T('重新查詢','重新查询','Refresh')}</button></div></div><div class="amr-pairs">${pairs.map(([from,to])=>`<div class="amr-pair" data-amr-pair="${from}-${to}"><span>1 ${from} → ${to}</span><strong>${escape(rateText(feed.api.getRate(from,to)))}</strong></div>`).join('')}</div><div class="amr-meta"><span>Coinbase · ${T('本機取得時間','本机取得时间','Retrieved locally at')} <time>${escape(timeText(state.fetchedAt))}</time></span><span>${T('每 30 秒查詢；來源未提供報價時間。僅供參考，非銀行成交報價。CNH 未提供。','每 30 秒查询；来源未提供报价时间。仅供参考，非银行成交报价。CNH 未提供。','Polled every 30s; no provider quote timestamp is supplied. Reference only, not a bank execution quote. CNH is not supplied.')}</span></div>`;
    panel.querySelector('[data-amr-refresh]')?.addEventListener('click',()=>feed.api.refresh());countdown();
    const form=document.querySelector('.fx-box'),chart=document.querySelector('.rfx-chart');
    if(form&&chart&&S.page==='fx') {
      const from=S.fx?.sell,to=S.fx?.buy,pair=feed.api.getRate(from,to),title=chart.querySelector('.card-title'),market=chart.querySelector(':scope>.small');
      if(title)title.textContent=`${from}/${to} ${T('示意走勢','示意走势','Illustrative trend')}`;
      if(market)market.textContent=pair===null?T('此交易對未提供市場參考匯率；下圖為示意資料。','此交易对未提供市场参考汇率；下图为示意资料。','No market reference rate is supplied for this pair. The chart is illustrative.'):`${T('市場參考','市场参考','Market reference')} 1 ${from} = ${rateText(pair)} ${to} · ${T('本機取得','本机取得','Retrieved')} ${timeText(state.fetchedAt)}${state.stale||state.error?' · '+T('已過期','已过期','Stale'):''}`;
      const dealLabel=form.querySelector('.calc-out>span');if(dealLabel)dealLabel.textContent=T('Demo 成交基準','Demo 成交基准','Demo execution basis');
      const timer=form.querySelector('#fxTimer');if(timer){if(timer.previousElementSibling)timer.previousElementSibling.textContent=T('成交模式','成交模式','Execution mode');timer.textContent=T('模擬成交，非鎖價','模拟成交，非锁价','Simulated, not price-locked');}
      if(!form.querySelector('.amr-demo-basis'))form.insertAdjacentHTML('afterbegin',`<p class="amr-demo-basis">${T('Demo 成交使用原示範基準，與上方市場參考匯率分開；不向銀行或交易所發出交易。','Demo 成交使用原示范基准，与上方市场参考汇率分开；不向银行或交易所发出交易。','Demo execution uses its original sample basis, separately from market reference prices. No order is sent to a bank or exchange.')}</p>`);
    }
  }
  function enhance() {
    const active=typeof S!=='undefined'&&S.portal==='cust'&&['home','accounts','fx','wallets'].includes(S.page)&&!!window.AzureBridge?.account;
    if(active){const page=document.querySelector('.page-in');if(page&&!page.querySelector('.amr-panel')){const header=page.querySelector(':scope>.page-head');const html='<section class="card amr-panel" aria-label="'+escape(T('市場參考匯率','市场参考汇率','Market reference rates'))+'"></section>';if(header)header.insertAdjacentHTML('afterend',html);else page.insertAdjacentHTML('afterbegin',html);}update();}
    if(active&&!mounted){mounted=true;tick=window.setInterval(countdown,1000);}else if(!active&&mounted){mounted=false;window.clearInterval(tick);tick=null;}
    feed.use(window,active);
  }
  const unsubscribe=feed.api.subscribe(update);
  if(typeof afterRender==='function'){const previousAfter=afterRender;afterRender=function(...args){const result=previousAfter(...args);enhance();return result;};}
  window.addEventListener('pagehide',()=>{unsubscribe();feed.release(window);if(tick!==null)window.clearInterval(tick);},{once:true});
  enhance();
})();
