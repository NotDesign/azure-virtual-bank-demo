/* Copy and download only the fields rendered by the existing bank-account detail view. */
(() => {
  'use strict';
  const nativeDetail=acctDetail;
  const T=(tc,sc,en)=>C(tc,sc,en);
  const copyIcon='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>';
  let current=null;
  function sourceEntry(index) {
    if(window.AzureBridge?.account?.role!=='cust'||S.portal!=='cust'||!Number.isInteger(index)||index<0)return null;
    const account=myAccts()[index];if(!account||account.cust!==CID())return null;
    // A missing-data HQ view must not gain an entry into the sample VA_INFO renderer.
    const present=[...document.querySelectorAll('button[onclick]')].some(button=>{
      const match=/^\s*acctDetail\(\s*(\d+)\s*\)\s*;?\s*$/.exec(button.getAttribute('onclick')||'');
      return match&&Number(match[1])===index&&!button.disabled;
    });
    return present?account:null;
  }
  function active(record=current) {
    return !!record&&record===current&&record.dialog.isConnected&&document.getElementById('modal')===record.dialog.parentElement&&
      window.AzureBridge?.account?.role==='cust'&&S.portal==='cust'&&CID()===record.customerId;
  }
  function manualCopy(record,text) {
    if(!active(record))return;
    let section=record.dialog.querySelector('.bank-copy-fallback');
    if(!section){
      section=document.createElement('section');section.className='bank-copy-fallback';section.setAttribute('role','status');
      const label=document.createElement('label');label.htmlFor='bank-copy-manual';label.textContent=T('請手動複製已選取的內容','请手动复制已选取的内容','Copy the selected content manually');
      const area=document.createElement('textarea');area.id='bank-copy-manual';area.readOnly=true;area.className='input';area.setAttribute('aria-label',T('手動複製帳戶資料','手动复制账户资料','Copy account information manually'));
      area.setAttribute('data-notr','');section.append(label,area);record.dialog.querySelector('.modal-body')?.append(section);
    }
    const area=section.querySelector('textarea');area.value=text;area.focus();area.select();
    toast(T('無法自動複製，請手動複製已選取內容。','无法自动复制，请手动复制已选取内容。','Automatic copy is unavailable. Copy the selected content manually.'));
  }
  async function copy(text) {
    const record=current;if(!active(record))return false;
    try {
      if(typeof navigator.clipboard?.writeText!=='function')throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if(active(record))toast(T('已複製帳戶資料','已复制账户资料','Account information copied'));
      return true;
    } catch {manualCopy(record,text);return false;}
  }
  const API=window.AzureBankAccountTools={
    ready:true,
    copyField(index){if(!active()||!Number.isInteger(index)||!current.pairs[index])return Promise.resolve(false);return copy(current.pairs[index].value);},
    copyAll(){return active()?copy(current.text):Promise.resolve(false);},
    download(){
      const record=current;if(!active(record))return false;
      let url=null;
      try {
        url=URL.createObjectURL(new Blob([record.text],{type:'text/plain;charset=utf-8'}));
        const anchor=document.createElement('a');anchor.href=url;anchor.download=record.filename;anchor.hidden=true;
        document.body.append(anchor);anchor.click();anchor.remove();
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
        toast(T('已準備下載帳戶資料（UTF-8 文字檔）','已准备下载账户资料（UTF-8 文本文件）','Account information prepared as a UTF-8 text download'));
        return true;
      } catch {
        if(url)URL.revokeObjectURL(url);manualCopy(record,record.text);return false;
      }
    }
  };
  acctDetail=function(index){
    const account=sourceEntry(index);if(!account)return false;
    nativeDetail(index);
    const dialog=document.querySelector('#modal>.modal');if(!dialog)return false;
    // The native translation observer is asynchronous. Translate before capturing
    // so copied values match the rendered fields, without copying button labels.
    I18N.run();
    const pairs=[];
    dialog.querySelectorAll('.modal-body dl.kv>dt').forEach(term=>{
      const definition=term.nextElementSibling;if(definition?.tagName!=='DD')return;
      pairs.push({label:term.textContent.trim(),value:definition.textContent.trim(),definition});
    });
    if(!pairs.length)return false;
    dialog.classList.add('bank-account-drawer');
    const title=dialog.querySelector('.modal-head h3');
    if(title){title.id='bank-account-drawer-title';dialog.setAttribute('aria-labelledby',title.id);}
    dialog.querySelector('.modal-head>.icon-btn')?.setAttribute('aria-label',T('關閉帳戶詳情','关闭账户详情','Close account details'));
    const filenamePart=value=>String(value??'').replace(/[^A-Za-z0-9_-]/g,'_');
    current={dialog,customerId:CID(),pairs:pairs.map(({label,value})=>({label,value})),text:pairs.map(p=>`${p.label}：${p.value}`).join('\n'),
      filename:`Azure-account-info-${filenamePart(CID())}-${filenamePart(account.ccy)}-${index+1}.txt`};
    pairs.forEach(({label,definition},fieldIndex)=>{
      const value=document.createElement('span');value.className='bank-field-value';value.setAttribute('data-notr','');
      while(definition.firstChild)value.append(definition.firstChild);
      const button=document.createElement('button');button.type='button';button.className='btn sm bank-field-copy';button.dataset.bankField=String(fieldIndex);
      button.setAttribute('aria-label',T(`複製${label}`,`复制${label}`,`Copy ${label}`));button.title=button.getAttribute('aria-label');button.innerHTML=copyIcon;
      button.addEventListener('click',()=>API.copyField(fieldIndex));definition.dataset.bankFieldIndex=String(fieldIndex);definition.append(value,button);
    });
    const footer=dialog.querySelector('.modal-foot');
    if(footer){
      const originalCopy=[...footer.querySelectorAll('button')].find(button=>(button.getAttribute('onclick')||'').includes('navigator.clipboard'));
      const copyAll=document.createElement('button');copyAll.type='button';copyAll.className='btn bank-copy-all';copyAll.innerHTML=copyIcon;
      copyAll.append(document.createTextNode(T('複製全部資料','复制全部资料','Copy all details')));copyAll.addEventListener('click',API.copyAll);
      if(originalCopy)originalCopy.replaceWith(copyAll);else footer.prepend(copyAll);
      const download=document.createElement('button');download.type='button';download.className='btn bank-download';download.innerHTML=ICON.dl;
      download.append(document.createTextNode(T('下載帳戶資料','下载账户资料','Download account details')));download.addEventListener('click',API.download);
      copyAll.after(download);
    }
    return true;
  };
})();
