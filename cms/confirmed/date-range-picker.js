/* One range calendar for paired date filters. Values remain in the existing scoped models. */
(() => {
  'use strict';
  const T=(tc,sc,en)=>C(tc,sc,en),configs=new Map();
  let dialog=null,draft=null,returnFocus=null;
  const iso=date=>date.toISOString().slice(0,10);
  const date=value=>new Date(value+'T00:00:00Z');
  const valid=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(date(value).getTime())&&iso(date(value))===value;
  const today=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;};
  const add=(value,n)=>{const d=date(value);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
  const scope=()=>[S.portal,S.page,typeof CID==='function'?CID():''].join(':');
  const label=(from,to)=>from&&to?`${from.replaceAll('-','/')} – ${to.replaceAll('-','/')}`:from?`${from.replaceAll('-','/')} →` :to?`→ ${to.replaceAll('-','/')}`:T('選擇日期範圍','选择日期范围','Select date range');
  const calendarIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/></svg>';
  function markup(key,from='',to='',title='',disabled=false){
    return `<button class="btn az-range-trigger" type="button" data-date-range="${E(key)}" ${disabled?'disabled':''} aria-haspopup="dialog" aria-label="${E(title||T('日期範圍','日期范围','Date range'))}"><span>${E(label(from,to))}</span>${calendarIcon}</button>`;
  }
  function register(key,config){configs.set(key,{...config,scope:scope()});return markup(key,config.from,config.to,config.title,config.disabled);}
  function close(){if(dialog){dialog.close();dialog.remove();dialog=null;}draft=null;returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});returnFocus=null;}
  function renderCalendar(){
    if(!dialog||!draft)return;
    const [year,month]=draft.month.split('-').map(Number),first=new Date(Date.UTC(year,month-1,1)),last=new Date(Date.UTC(year,month,0)),offset=first.getUTCDay(),days=last.getUTCDate();
    const locale=I18N.lang==='en'?'en-GB':I18N.lang==='zh-Hans'?'zh-CN':'zh-TW',heading=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',timeZone:'UTC'}).format(first);
    const weekdays=I18N.lang==='en'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['日','一','二','三','四','五','六'];
    const cells=Array.from({length:offset},()=>'<span class="az-calendar-empty" aria-hidden="true"></span>');
    for(let day=1;day<=days;day++){
      const value=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,selected=value===draft.from||value===draft.to,inside=!!(draft.from&&draft.to&&value>draft.from&&value<draft.to);
      cells.push(`<button type="button" class="az-calendar-day ${selected?'is-selected':''} ${inside?'in-range':''}" data-day="${value}" aria-label="${value}" aria-pressed="${selected}">${day}</button>`);
    }
    dialog.querySelector('.az-calendar-heading').textContent=heading;dialog.querySelector('.az-calendar-grid').innerHTML=weekdays.map(w=>`<span class="az-calendar-weekday">${w}</span>`).join('')+cells.join('');
    dialog.querySelector('.az-range-selection').textContent=label(draft.from,draft.to);
    dialog.querySelector('.az-range-guidance').textContent=draft.waiting?T('再選擇結束日期；再次點同一天可選單日。','再选择结束日期；再次点同一天可选单日。','Choose an end date. Select the same day again for one day.'):T('點選開始與結束日期，確認後套用。','点选开始与结束日期，确认后应用。','Select a start and end date, then apply.');
    dialog.querySelector('[data-range-apply]').disabled=!!draft.waiting||!!(draft.from&&!draft.to||draft.to&&!draft.from);
  }
  function open(key,button){
    const config=configs.get(key);if(!config||config.scope!==scope()||config.disabled||button?.disabled)return;
    close();returnFocus=button||document.querySelector(`[data-date-range="${CSS.escape(key)}"]`);
    const from=valid(config.from)?config.from:'',to=valid(config.to)?config.to:'';
    draft={key,config,from,to,waiting:false,month:(from||to||config.anchor||today()).slice(0,7)};
    dialog=document.createElement('dialog');dialog.className='az-range-dialog';dialog.setAttribute('aria-labelledby','az-range-title');
    dialog.innerHTML=`<header><h3 id="az-range-title">${E(config.title||T('日期範圍','日期范围','Date range'))}</h3><button class="btn az-calendar-close" type="button" data-range-close aria-label="${T('關閉','关闭','Close')}">×</button></header><div class="az-range-body"><div class="az-range-presets">${[7,30,90].map(n=>`<button class="btn sm" type="button" data-range-preset="${n}">${T(`近 ${n} 天`,`近 ${n} 天`,`${n} days`)}</button>`).join('')}<button class="btn sm" type="button" data-range-preset="month">${T('本月','本月','This month')}</button><button class="btn sm" type="button" data-range-preset="clear">${T('不限日期','不限日期','All dates')}</button></div>${config.hint?`<p class="az-range-hint">${E(config.hint)}</p>`:''}<p class="az-range-selection" aria-live="polite"></p><div class="az-calendar-nav"><button class="btn" type="button" data-month="-1" aria-label="${T('上個月','上个月','Previous month')}">‹</button><strong class="az-calendar-heading"></strong><button class="btn" type="button" data-month="1" aria-label="${T('下個月','下个月','Next month')}">›</button></div><div class="az-calendar-grid"></div><p class="az-range-guidance" aria-live="polite"></p></div><footer><button class="btn" type="button" data-range-close>${T('取消','取消','Cancel')}</button><button class="btn primary" type="button" data-range-apply>${T('套用日期','应用日期','Apply dates')}</button></footer>`;
    dialog.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.hasAttribute('data-range-close'))return close();
      if(b.dataset.month){const d=date(draft.month+'-01');d.setUTCMonth(d.getUTCMonth()+Number(b.dataset.month));draft.month=iso(d).slice(0,7);renderCalendar();return;}
      if(b.dataset.day){const value=b.dataset.day;if(!draft.waiting){draft.from=value;draft.to='';draft.waiting=true;}else{draft.to=value;if(draft.to<draft.from)[draft.from,draft.to]=[draft.to,draft.from];draft.waiting=false;}renderCalendar();dialog.querySelector(`[data-day="${value}"]`)?.focus();return;}
      if(b.dataset.rangePreset){const p=b.dataset.rangePreset,anchor=config.anchor||today();draft.waiting=false;if(p==='clear'){draft.from='';draft.to='';}else{draft.to=anchor;draft.from=p==='month'?anchor.slice(0,7)+'-01':add(anchor,1-Number(p));draft.month=draft.from.slice(0,7);}renderCalendar();return;}
      if(b.hasAttribute('data-range-apply')){
        if(draft.waiting||draft.config.scope!==scope())return close();
        const {from,to,config:target}=draft;if((from&&!valid(from))||(to&&!valid(to))||(from&&to&&from>to))return;
        const source=returnFocus,key=draft.key;configs.set(key,{...target,from,to});close();target.onApply(from,to,source);enhance();document.querySelector(`[data-date-range="${CSS.escape(key)}"]`)?.focus({preventScroll:true});
      }
    });
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    document.body.append(dialog);renderCalendar();dialog.showModal();dialog.querySelector('[data-range-close]').focus();
  }
  dateRange=function(fromKey,toKey){
    const key='legacy-'+fromKey+'-'+toKey;
    return `<div class="az-date-range-field">${register(key,{from:S.ui[fromKey]||'',to:S.ui[toKey]||'',onApply(from,to,button){S.ui[fromKey]=from;S.ui[toKey]=to;if(!button?.closest('.modal'))render();else button.querySelector('span').textContent=label(from,to);}})}</div>`;
  };
  function pair(fromId,toId,title){
    const from=document.getElementById(fromId),to=document.getElementById(toId);if(!from||!to)return;
    const host=from.closest('.field'),end=to.closest('.field');if(!host||!end)return;
    const key='pair-'+fromId,buttonId='az-range-'+fromId,disabled=from.disabled||to.disabled||from.readOnly||to.readOnly;
    const config={from:from.value,to:to.value,title,disabled,onApply(a,b){const first=document.getElementById(fromId),last=document.getElementById(toId);if(!first||!last||first.disabled||last.disabled||first.readOnly||last.readOnly)return;first.value=a;last.value=b;const button=document.getElementById(buttonId);if(button)button.querySelector('span').textContent=label(a,b);configs.set(key,{...configs.get(key),from:a,to:b});first.dispatchEvent(new Event('change',{bubbles:true}));last.dispatchEvent(new Event('change',{bubbles:true}));}};
    configs.set(key,{...config,scope:scope()});
    from.hidden=true;to.hidden=true;end.hidden=true;host.classList.add('az-unified-date-field');
    const old=host.querySelector('.az-range-trigger');if(old){old.querySelector('span').textContent=label(from.value,to.value);old.disabled=disabled;}else{const template=document.createElement('template');template.innerHTML=markup(key,from.value,to.value,title,disabled);const button=template.content.firstElementChild;button.id=buttonId;host.append(button);}
    const heading=host.querySelector('label');if(heading){heading.textContent=title;heading.htmlFor=buttonId;}
  }
  function enhance(){pair('review-app-from','review-app-to',T('建立日期範圍','创建日期范围','Created date range'));pair('wallet-activity-from','wallet-activity-to',T('日期範圍（UTC+8）','日期范围（UTC+8）','Date range (UTC+8)'));}
  document.addEventListener('click',event=>{const b=event.target.closest('[data-date-range]');if(b)open(b.dataset.dateRange,b);});
  const oldAfter=afterRender;afterRender=function(...args){const result=oldAfter(...args);enhance();return result;};
  window.AzureDateRange={ready:true,register,open,enhance,valid,add,today,rangeForDays:(days,anchor=today())=>({from:add(anchor,1-days),to:anchor})};enhance();
})();
