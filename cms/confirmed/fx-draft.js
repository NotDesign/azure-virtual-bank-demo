/* Update the draft quote in place so input blur cannot remove a clicked account/menu button. */
(() => {
  'use strict';
  window.AzureFXDraft={ready:true,update(value){
    if(S.portal!=='cust'||S.page!=='fx'||!S.fx)return;
    const root=document.querySelector('.fx-box');if(!root)return;
    const parsed=Number(String(value).replace(/,/g,''));S.fx.amt=Number.isFinite(parsed)?parsed:0;
    const f=S.fx,rate=FXR[f.sell]/FXR[f.buy]*(1-CUST_PRICE[CID()].FX/10000),sell=f.lock==='S'?f.amt:f.amt/rate,buy=f.lock==='S'?f.amt*rate:f.amt,available=bal()[f.sell]?.a||0;
    const opposite=root.querySelector('.fx-line input[disabled]');if(opposite)opposite.value=nf(f.lock==='S'?buy:sell);
    const confirm=root.querySelector('button[onclick*="fxConfirm"]');if(confirm)confirm.disabled=!Number.isFinite(sell)||sell<=0||sell>available;
    let warning=root.querySelector(':scope>.fx-amount-warning')||root.querySelector(':scope>.small.down');
    if(sell>available){if(!warning){warning=document.createElement('div');warning.className='small down fx-amount-warning';root.append(warning);}warning.textContent=C('餘額不足','余额不足','Insufficient balance');}
    else warning?.remove();
  }};
  const source=fxDo;
  fxDo=function(...args){if(S.fx)S.fx.remark='';return source(...args);};
})();
