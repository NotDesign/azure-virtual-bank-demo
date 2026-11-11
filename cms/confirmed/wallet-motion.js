/* Decorative, local-only Lottie status shapes. No transaction or form state is changed. */
(() => {
  'use strict';
  const entries=new Map(),suppressed=new WeakSet(),parents=[];
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const kinds=new Set(['success','loading','error']);
  let queued=false,stopped=false;
  const value=k=>({a:0,k});
  const tween=(from,to,start,end)=>({a:1,k:[{t:start,s:[from],e:[to],i:{x:[.667],y:[1]},o:{x:[.333],y:[0]}},{t:end,s:[to]}]});
  const transform=()=>({ty:'tr',p:value([0,0]),a:value([0,0]),s:value([100,100]),r:value(0),o:value(100),sk:value(0),sa:value(0)});
  const line=(vertices)=>({ty:'sh',ks:value({i:vertices.map(()=>[0,0]),o:vertices.map(()=>[0,0]),v:vertices,c:false}),nm:'Local status stroke'});
  const stroke=(opacity=100)=>({ty:'st',c:value([1,1,1,1]),o:value(opacity),w:value(3),lc:2,lj:2,ml:4,nm:'Thin stroke'});
  const ellipse=()=>({ty:'el',d:1,p:value([0,0]),s:value([80,80]),nm:'Status circle'});
  const trim=end=>({ty:'tm',s:value(0),e:end,o:value(-90),m:1});
  const group=items=>({ty:'gr',it:[...items,transform()],nm:'Local vector group'});
  function data(kind){
    const loading=kind==='loading',end=loading?60:36;
    const shapes=loading?[group([ellipse(),stroke(18)]),group([ellipse(),stroke(),trim(value(72))])]:kind==='success'?[group([ellipse(),stroke(),trim(tween(0,100,0,18))]),group([line([[-18,0],[-4,14],[22,-15]]),stroke(),trim(tween(0,100,13,32))])]:[group([ellipse(),stroke()]),group([line([[-13,-13],[13,13]]),stroke()]),group([line([[13,-13],[-13,13]]),stroke()])];
    return {v:'5.13.0',fr:60,ip:0,op:end,w:100,h:100,nm:'Azure local '+kind,ddd:0,assets:[],layers:[{ddd:0,ind:1,ty:4,nm:'Decorative '+kind,sr:1,ks:{o:loading?value(100):tween(0,100,0,7),r:loading?tween(0,360,0,60):value(0),p:value([50,50,0]),a:value([0,0,0]),s:value([100,100,100])},ao:0,shapes,ip:0,op:end,st:0,bm:0}]};
  }
  const templates=Object.fromEntries([...kinds].map(kind=>[kind,data(kind)]));
  function visible(host){
    if(document.hidden||!host.isConnected||host.closest('[hidden],[inert]')||!host.getClientRects().length||getComputedStyle(host).visibility==='hidden')return false;
    let win=window;
    try{for(let i=0;i<16&&win.parent!==win;i++){const frame=win.frameElement;if(!frame?.isConnected||frame.closest('[hidden],[inert]')||!frame.getClientRects().length||win.parent.getComputedStyle(frame).visibility==='hidden')return false;win=win.parent;}}
    catch{return false;}
    return true;
  }
  function staticSVG(kind){const base='<circle cx="50" cy="50" r="40"/>';return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${base}${kind==='success'?'<path d="M32 50 46 64 72 35"/>':kind==='error'?'<path d="m37 37 26 26m0-26-26 26"/>':'<path d="M50 10a40 40 0 0 1 40 40"/>'}</svg>`;}
  function fallback(entry){const animation=entry.animation;entry.animation=null;try{animation?.destroy();}catch{}entry.fallback=true;entry.ready=true;entry.host.innerHTML=staticSVG(entry.kind);entry.host.dataset.walletMotionState='fallback';}
  function sync(entry){
    if(entry.dead||!entry.ready)return;
    if(!entry.host.isConnected){remove(entry.host,false);return;}
    if(entry.fallback){entry.host.dataset.walletMotionState='fallback';return;}
    const animation=entry.animation;if(!animation)return;
    if(preference.matches){animation.goToAndStop(entry.kind==='loading'?0:Math.max(0,animation.totalFrames-1),true);entry.reduced=true;if(entry.kind!=='loading')entry.completed=true;entry.host.dataset.walletMotionState='static';return;}
    if(entry.reduced){entry.reduced=false;if(entry.kind==='loading')animation.goToAndStop(0,true);}
    if(!visible(entry.host)){animation.pause();entry.host.dataset.walletMotionState=entry.completed?'complete':'paused';return;}
    if(entry.completed){animation.pause();entry.host.dataset.walletMotionState='complete';return;}
    animation.play();entry.host.dataset.walletMotionState='playing';
  }
  function remove(host,suppress=true){const entry=entries.get(host);if(!entry)return;if(suppress)suppressed.add(host);entries.delete(host);entry.dead=true;try{entry.animation?.destroy();}catch{}host.replaceChildren();host.classList.remove('wallet-motion');delete host.dataset.walletMotionState;}
  function mount(host,options={}){
    if(stopped||!(host instanceof HTMLElement)||!host.isConnected||host.matches('button,a,input,select,textarea')||host.querySelector('button,a,input,select,textarea'))return null;
    const kind=options.kind||host.dataset.walletMotion;if(!kinds.has(kind))return null;
    const loop=typeof options.loop==='boolean'?options.loop:kind==='loading',existing=entries.get(host);
    if(existing&&existing.kind===kind&&existing.loop===loop&&(!existing.fallback||!window.lottie?.loadAnimation)){sync(existing);return existing.handle;}
    remove(host,false);suppressed.delete(host);if(host.dataset.walletMotion!==kind)host.dataset.walletMotion=kind;host.classList.add('wallet-motion');host.setAttribute('aria-hidden','true');host.replaceChildren();
    const entry={host,kind,loop,animation:null,ready:false,completed:false,reduced:false,fallback:false,dead:false,handle:null};
    entry.handle={get animation(){return entry.animation;},get state(){return host.dataset.walletMotionState;},destroy:()=>remove(host),pause:()=>{entry.animation?.pause();host.dataset.walletMotionState='paused';}};
    entries.set(host,entry);host.dataset.walletMotionState='loading';
    if(!window.lottie?.loadAnimation){fallback(entry);return entry.handle;}
    try{
      const animation=lottie.loadAnimation({container:host,renderer:'svg',loop,autoplay:false,animationData:JSON.parse(JSON.stringify(templates[kind])),rendererSettings:{preserveAspectRatio:'xMidYMid meet',progressiveLoad:false,hideOnTransparent:false}});entry.animation=animation;
      const ready=()=>{if(entry.dead)return;entry.ready=true;host.querySelector('svg')?.setAttribute('aria-hidden','true');host.querySelector('svg')?.setAttribute('focusable','false');sync(entry);};
      animation.addEventListener('DOMLoaded',ready);animation.addEventListener('data_failed',()=>{if(!entry.dead)fallback(entry);});
      animation.addEventListener('complete',()=>{if(!entry.dead){entry.completed=true;host.dataset.walletMotionState='complete';}});
      if(animation.isLoaded)ready();
    }catch{fallback(entry);}
    return entry.handle;
  }
  function enhance(root=document){
    if(stopped)return;
    for(const [host,entry]of entries){if(!host.isConnected)remove(host,false);else sync(entry);}
    const hosts=[...(root.matches?.('[data-wallet-motion]')?[root]:[]),...(root.querySelectorAll?.('[data-wallet-motion]')||[])];
    for(const host of hosts)if(!suppressed.has(host)){const prior=entries.get(host);mount(host,{kind:host.dataset.walletMotion,...(prior?.kind===host.dataset.walletMotion?{loop:prior.loop}:{})});}
  }
  function schedule(){if(stopped||queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance();});}
  const observer=new MutationObserver(records=>{
    const relevant=records.some(record=>{
      if(record.type==='attributes'){
        if(record.attributeName==='data-wallet-motion'){suppressed.delete(record.target);return true;}
        return [...entries.keys()].some(host=>record.target===host||record.target.contains(host));
      }
      if([...entries.keys()].some(host=>!host.isConnected))return true;
      return [...record.addedNodes].some(node=>node.nodeType===1&&!node.closest('.wallet-motion')&&(node.matches('[data-wallet-motion]')||node.querySelector('[data-wallet-motion]')));
    });if(relevant)schedule();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-wallet-motion','hidden','inert','class','style']});
  try{let win=window;for(let i=0;i<16&&win.parent!==win;i++){const frame=win.frameElement,parent=win.parent;if(!frame)break;const observer=new MutationObserver(records=>{if(records.some(record=>record.target===frame||record.target.contains(frame)))schedule();});observer.observe(parent.document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','inert','class','style']});parents.push(observer);win=parent;}}catch{/* Unavailable ancestor surfaces remain paused by visible(). */}
  function chartMotion(){if(!window.Chart)return;const duration=preference.matches?0:450;Chart.defaults.animation={...Chart.defaults.animation,duration,easing:'easeOutQuart'};const charts=typeof S==='object'&&Array.isArray(S.charts)?S.charts:[];for(const chart of charts){if(chart.options.animation!==false){chart.options.animation={...chart.options.animation,duration,easing:'easeOutQuart'};if(preference.matches){chart.stop();chart.update('none');}}}}
  function change(){chartMotion();enhance();}
  preference.addEventListener('change',change);document.addEventListener('visibilitychange',schedule);
  const previousAfter=typeof afterRender==='function'?afterRender:null;if(previousAfter)afterRender=function(...args){const out=previousAfter(...args);enhance();return out;};
  function destroy(host){if(host){remove(host);return;}for(const host of [...entries.keys()])remove(host);observer.disconnect();parents.forEach(observer=>observer.disconnect());preference.removeEventListener('change',change);document.removeEventListener('visibilitychange',schedule);stopped=true;}
  window.AzureWalletMotion={ready:true,mount,enhance,destroy};window.addEventListener('pagehide',()=>destroy(),{once:true});chartMotion();enhance();
})();
