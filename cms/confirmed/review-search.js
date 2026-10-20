/* Consistent clear controls for CMS search fields, including dynamic dialogs. */
(() => {
  'use strict';
  const searchWords=/搜索|搜尋|\b(?:search|find)\b/i;
  const clearLabel=()=>C('清除搜尋內容','清除搜索内容','Clear search text');
  const closeLabel=()=>C('關閉搜尋','关闭搜索','Close search');
  const clearIcon='<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const backIcon='<svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true"><path d="m11.5 4.5-5.5 5.5 5.5 5.5M6 10h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const submitForms=new Set(['review-customer-filters','review-app-filters']);
  let clearVersion=0;

  function isSearch(input) {
    if (!(input instanceof HTMLInputElement)||input.disabled||input.readOnly) return false;
    if(input.type==='search'||input.id==='global-search'||input.closest('.side-search,.search-input')) return true;
    if(input.type!=='text') return false;
    const label=input.labels?.[0]?.textContent||input.closest('.field')?.querySelector('label')?.textContent||'';
    return searchWords.test([input.placeholder,input.getAttribute('aria-label'),label].filter(Boolean).join(' '));
  }
  function fields() { return [...document.querySelectorAll('input')].filter(isSearch); }
  function refresh(input) {
    const button=input.parentElement?.querySelector(':scope>.review-search-clear');
    if(!button) return;
    button.hidden=input.value.length===0;
    button.setAttribute('aria-label',clearLabel());button.title=clearLabel();
  }
  function prepare(input) {
    if(!isSearch(input)) return;
    if(!input.parentElement?.classList.contains('review-search-field')) {
      const wrapper=document.createElement('span');wrapper.className='review-search-field';
      for(const property of ['width','maxWidth','minWidth','flex']) if(input.style[property]) { wrapper.style[property]=input.style[property];input.style[property]=''; }
      input.before(wrapper);wrapper.append(input);
      input.classList.add('review-search-input');
      const button=document.createElement('button');button.type='button';button.className='review-search-clear';button.innerHTML=clearIcon;button.dataset.reviewSearchClear='';button.hidden=true;
      wrapper.append(button);
    }
    refresh(input);
  }
  function enhance(root=document) {
    if(root instanceof HTMLInputElement) prepare(root);
    root.querySelectorAll?.('input').forEach(prepare);
    document.querySelectorAll('.search-input>.search-close').forEach(button=>{
      // This arrow closes the mobile search panel; the separate X clears text.
      if(!button.dataset.reviewSearchClose) { button.innerHTML=backIcon;button.dataset.reviewSearchClose='';button.parentElement.prepend(button); }
      button.setAttribute('aria-label',closeLabel());button.title=closeLabel();
    });
  }
  function identify(input) {
    return {id:input.id,name:input.name,change:input.getAttribute('onchange'),input:input.getAttribute('oninput'),placeholder:input.placeholder,index:fields().indexOf(input),form:input.form?.id||'',modal:!!input.closest('.modal')};
  }
  function find(spec,original) {
    if(original?.isConnected) return original;
    const list=fields().filter(input=>!!input.closest('.modal')===spec.modal);
    if(spec.id) { const exact=document.getElementById(spec.id);if(exact instanceof HTMLInputElement)return exact; }
    return list.find(input=>spec.name&&input.name===spec.name)
      ||list.find(input=>spec.change&&input.getAttribute('onchange')===spec.change)
      ||list.find(input=>spec.input&&input.getAttribute('oninput')===spec.input)
      ||list.find(input=>spec.placeholder&&input.placeholder===spec.placeholder)
      ||fields()[spec.index];
  }
  function clear(input) {
    const spec=identify(input),version=++clearVersion;
    const keepPanel=input.id==='global-search'&&document.querySelector('.header')?.classList.contains('search-open');
    input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
    let current=find(spec,input);
    if(current) { current.value='';current.dispatchEvent(new Event('change',{bubbles:true})); }
    // These forms intentionally apply filters on submit rather than on input.
    const form=spec.form&&document.getElementById(spec.form);
    if(submitForms.has(spec.form)&&form instanceof HTMLFormElement) form.requestSubmit();
    const focus=(force=false)=>{
      if(version!==clearVersion)return;
      current=find(spec,current);
      if(!current?.isConnected)return;
      if(keepPanel) document.querySelector('.header')?.classList.add('search-open');
      enhance(current.parentElement);refresh(current);
      const active=document.activeElement;
      if(force||active===document.body||active===input||active===current||active?.matches('.review-search-clear')) {
        current.focus({preventScroll:true});try{current.setSelectionRange(0,0);}catch{}
      }
    };
    focus(true);queueMicrotask(()=>focus());requestAnimationFrame(()=>focus());
  }
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('[data-review-search-clear]')) event.preventDefault();
  },true);
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-review-search-clear]');if(!button)return;
    event.preventDefault();const input=button.parentElement?.querySelector('input');if(input)clear(input);
  });
  for(const type of ['input','change','search']) document.addEventListener(type,event=>{if(isSearch(event.target)){prepare(event.target);refresh(event.target);}},true);
  const previousAfter=afterRender;
  afterRender=function(...args){const result=previousAfter(...args);enhance();return result;};
  const observer=new MutationObserver(records=>{
    for(const record of records) for(const node of record.addedNodes) if(node.nodeType===1&&(node.matches('input')||node.querySelector('input'))) enhance(node);
  });
  observer.observe(document.body,{childList:true,subtree:true});
  enhance();
  window.AzureReviewSearch={ready:true,enhance:()=>enhance()};
})();
