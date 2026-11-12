/* Date windows derive from supplied Demo transactions; accounting formulas remain unchanged. */
(() => {
  'use strict';
  const T=(tc,sc,en)=>C(tc,sc,en),anchor=TODAY;
  const valid=value=>window.AzureDateRange?.valid(value);
  function monthRange(value){const first=value+'-01',last=new Date(Date.UTC(Number(value.slice(0,4)),Number(value.slice(5,7)),0)).toISOString().slice(0,10);return{from:first,to:last<anchor?last:anchor};}
  function get(key){
    const selected=S.ui.chartPeriods?.[key];if(selected&&valid(selected.from)&&valid(selected.to)&&selected.from<=selected.to)return{...selected};
    return{mode:'month',...monthRange(MONTH)};
  }
  function change(key,mode,from,to){
    if(!['dashboard','revenue'].includes(key))return false;
    if(mode==='custom'){
      if(!from&&!to){const rows=key==='dashboard'?txsInScope():TXS;from=rows.map(t=>t.date).filter(valid).sort()[0]||anchor;to=anchor;mode='all';}
      if(!valid(from)||!valid(to)||from>to)return false;
      if((Date.parse(to)-Date.parse(from))/86400000>365){toast(T('日期範圍最多 366 天。','日期范围最多366天。','Choose a range of up to 366 days.'));return false;}
    }else if(['7','30','90'].includes(mode))({from,to}=AzureDateRange.rangeForDays(Number(mode),anchor));
    else if(mode==='month')({from,to}=monthRange(MONTH));
    else if(mode==='previous'){const d=new Date(anchor+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1,1);({from,to}=monthRange(d.toISOString().slice(0,7)));}
    else return false;
    S.ui.chartPeriods={...(S.ui.chartPeriods||{}),[key]:{mode,from,to}};renderPageRegion();return true;
  }
  const API=window.AzureChartPeriods={ready:true,text:T,get,change,includes:(key,value)=>{const r=get(key);return valid(value)&&value>=r.from&&value<=r.to;}};
  function enhance(){
    if(!['hq','l1','l2'].includes(S.portal)||!['dashboard','revenue'].includes(S.page))return;
    const key=S.page,head=document.querySelector('.page-in>.page-head');if(!head||head.parentElement.querySelector('.chart-period-toolbar'))return;
    const range=get(key),toolbar=document.createElement('section');toolbar.className='card chart-period-toolbar';toolbar.setAttribute('aria-label',T('資料期間','数据期间','Data period'));
    toolbar.innerHTML=`<div class="chart-period-options"><div class="btn-row">${[['month',T('本月','本月','This month')],['previous',T('上月','上月','Previous month')],...['7','30','90'].map(n=>[n,T(`近 ${n} 天`,`近 ${n} 天`,`${n} days`)])].map(([mode,name])=>`<button class="btn sm ${range.mode===mode?'primary':''}" type="button" data-chart-period="${mode}" aria-pressed="${range.mode===mode}">${name}</button>`).join('')}</div></div><div class="chart-period-range">${AzureDateRange.register('chart-'+key,{...range,anchor,title:T('圖表日期範圍','图表日期范围','Chart date range'),onApply:(from,to)=>change(key,'custom',from,to)})}</div>`;
    toolbar.querySelectorAll('[data-chart-period]').forEach(button=>button.addEventListener('click',()=>change(key,button.dataset.chartPeriod)));head.after(toolbar);
  }
  const oldAfter=afterRender;afterRender=function(...args){const result=oldAfter(...args);enhance();return result;};
  if(window.AzureBridge?.account&&['dashboard','revenue'].includes(S.page))render();else enhance();
})();
