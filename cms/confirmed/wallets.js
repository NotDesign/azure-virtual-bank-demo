/* Customer-scoped wallet demonstration. Bank balances and settlement formulas stay separate. */
(() => {
  'use strict';
  const stores=new Map(),SCALE=1000000,MAX_UNITS=1000000000000000;
  const NETWORKS={tron:'TRON (TRC20)',ethereum:'Ethereum (ERC20)'};
  const T=(tc,sc,en)=>C(tc,sc,en),esc=v=>E(v),clone=v=>JSON.parse(JSON.stringify(v));
  const ownId=()=>window.AzureBridge?.account?.role==='cust'?CID():null;
  const allowed=id=>CUSTOMERS.some(c=>c.id===id)&&(window.AzureBridge?.account?.role==='hq'||ownId()===id);
  const frozen=()=>{const c=cust(CID());return c?.status==='冻结'||c?.frz?.scopes?.some(k=>['all','pay'].includes(k));};
  const editable=()=>ownId()===CID()&&!frozen();
  let pending=null,unsubscribe=null;
  const defaultPreferences=()=>({hideBalances:false,displayCurrency:'USD',tab:'wallets',filters:{scope:'selected',query:'',type:'',status:'',network:'',from:'',to:''}});
  function blank(id){return {customerId:id,selectedId:'',preferences:defaultPreferences(),crypto:Object.keys(NETWORKS).map(network=>({id:`usdt-${id}-${network}`,customerId:id,name:`USDT · ${NETWORKS[network]}`,asset:'USDT',network,availableUnits:null,frozenUnits:null,basis:null})),ledger:[]};}
  function pack(id=CID()){if(!stores.has(id))stores.set(id,blank(id));const p=stores.get(id),defaults=defaultPreferences();p.preferences={...defaults,...p.preferences,filters:{...defaults.filters,...p.preferences?.filters}};return p;}
  function validPreferences(p){
    const f=p?.filters,isDate=s=>s===''||/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
    return typeof p?.hideBalances==='boolean'&&['USD','HKD'].includes(p.displayCurrency)&&['wallets','activity'].includes(p.tab)&&f&&['selected','all'].includes(f.scope)&&typeof f.query==='string'&&f.query.length<=200&&['','credit','transfer-in','transfer-out','deposit','withdraw'].includes(f.type)&&['','pending','completed','failed','cancelled'].includes(f.status??'')&&['','tron','ethereum'].includes(f.network)&&typeof f.from==='string'&&typeof f.to==='string'&&isDate(f.from)&&isDate(f.to)&&(!f.from||!f.to||f.from<=f.to);
  }
  function list(id=CID()){
    if(!allowed(id))return [];
    const bank=BALANCES[id]||{},ccys=[...new Set([...ACCOUNTS.filter(a=>a.cust===id).map(a=>a.ccy),...Object.keys(bank)])];
    return ccys.map(asset=>({id:`fiat-${id}-${asset}`,customerId:id,name:T(`${asset} 法幣錢包`,`${asset} 法币钱包`,`${asset} fiat wallet`),kind:'fiat',asset,network:null,available:Number.isFinite(bank[asset]?.a)?bank[asset].a:null,frozen:Number.isFinite(bank[asset]?.f)?bank[asset].f:null,basis:'bank',accounts:ACCOUNTS.filter(a=>a.cust===id&&a.ccy===asset)})).concat(pack(id).crypto.map(w=>({...w,kind:'crypto',available:w.availableUnits===null?null:w.availableUnits/SCALE,frozen:w.frozenUnits===null?null:w.frozenUnits/SCALE})));
  }
  function units(value){
    if(!['string','number'].includes(typeof value))return null;
    const s=String(value??'').trim();if(!/^\d+(?:\.\d{1,6})?$/.test(s))return null;
    const [whole,fraction='']=s.split('.'),n=Number(whole)*SCALE+Number(fraction.padEnd(6,'0'));
    return Number.isSafeInteger(n)&&n>0&&n<=MAX_UNITS?n:null;
  }
  function fmt(value,asset){return value===null?T('未提供','未提供','Not supplied'):pack().preferences.hideBalances?'••••':Number(value).toLocaleString(I18N.lang==='en'?'en-US':'zh-TW',{minimumFractionDigits:2,maximumFractionDigits:asset==='USDT'?6:2});}
  function selected(){const p=pack(),items=list();let w=items.find(w=>w.id===p.selectedId);if(!w){w=items[0];p.selectedId=w?.id||'';}return w;}
  function cryptoWallet(id){return pack().crypto.find(w=>w.id===id&&w.customerId===CID());}
  function actor(){const a=window.AzureAdminChild?parent.AzureBridge?.account:window.AzureBridge?.account;return {role:a?.role||'cust',email:a?.email||'',customerId:CID()};}
  function entry(kind,w,amountUnits,other=null){const row={id:'WLT-'+crypto.randomUUID(),customerId:CID(),walletId:w.id,kind,asset:'USDT',network:w.network,amountUnits,otherWalletId:other?.id||null,date:new Date().toISOString(),actor:actor()};pack().ledger.unshift(row);return row;}
  function formError(message){const e=document.getElementById('wallet-form-error');if(e){e.textContent=message;e.hidden=false;}else toast(message);}
  function checkPending(kind){return editable()&&pending?.kind===kind&&pending.customerId===CID();}
  function errorText(){return T('請確認錢包、網路及金額；金額須大於 0，最多 6 位小數，且不可超過可用結存。','请确认钱包、网络及金额；金额须大于 0，最多 6 位小数，且不可超过可用结存。','Check the wallet, network and amount. Use a positive amount with up to 6 decimals within the available balance.');}
  function walletModal(title,body,footer){modal(title,body,footer);const dialog=document.querySelector('.modal[role=dialog]');if(dialog){dialog.setAttribute('aria-label',title);dialog.tabIndex=-1;(dialog.querySelector('.modal-body input:not([type=hidden]),.modal-body select')||dialog.querySelector('.modal-head button')||dialog).focus();}}
  function modalError(){return '<p id="wallet-form-error" class="wallet-form-error" role="alert" hidden></p>';}
  const API=window.AzureWallets={
    ready:true,list:()=>clone(list()),formatAmount:fmt,
    snapshot(id=CID()){return allowed(id)?clone(pack(id)):null;},
    preferences(update){
      if(ownId()!==CID()||!update||typeof update!=='object'||Array.isArray(update))return false;
      if(Object.keys(update).some(k=>!['hideBalances','displayCurrency','tab','filters'].includes(k)))return false;
      const current=pack().preferences,next={...current,...update,filters:{...current.filters,...update.filters}};
      if(update.filters&&(typeof update.filters!=='object'||Array.isArray(update.filters)||Object.keys(update.filters).some(k=>!Object.keys(defaultPreferences().filters).includes(k))))return false;
      if(!validPreferences(next))return false;
      pack().preferences=clone(next);render();return true;
    },
    restore(id,data,token){
      const admin=window.AzureBridge?.account?.role==='hq';
      const delegation=parent!==window&&parent.AzureBridge?.account?.role==='hq'&&token&&window.frameElement?.dataset.adminChannel===token&&parent.document.getElementById('admin-customer-select')?.value===id;
      if((!admin&&!delegation)||!CUSTOMERS.some(c=>c.id===id)||!data||data.customerId!==id||!Array.isArray(data.crypto)||!Array.isArray(data.ledger))return false;
      if(new Set(data.crypto.map(w=>w.id)).size!==data.crypto.length)return false;
      if(data.preferences&&!validPreferences(data.preferences))return false;
      if(data.crypto.some(w=>w.customerId!==id||w.asset!=='USDT'||!NETWORKS[w.network]||typeof w.id!=='string'||typeof w.name!=='string'||w.name.length>80||[w.availableUnits,w.frozenUnits].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<0||n>MAX_UNITS))))return false;
      if(data.ledger.some(r=>r.customerId!==id||!data.crypto.some(w=>w.id===r.walletId)||!Number.isSafeInteger(r.amountUnits)||r.amountUnits<=0))return false;
      if(new Set(data.ledger.map(r=>r.id)).size!==data.ledger.length||data.ledger.some(r=>!validFundingSnapshotRow(r,data.crypto)))return false;
      if(data.crypto.some(w=>(w.availableUnits??0)+(w.frozenUnits??0)>MAX_UNITS||data.ledger.filter(r=>r.walletId===w.id&&r.kind==='withdraw'&&r.status==='pending').reduce((n,r)=>n+r.reservedUnits,0)>(w.frozenUnits??0)))return false;
      stores.set(id,clone(data));return true;
    },
    select(id){if(ownId()!==CID()||!list().some(w=>w.id===id))return;pack().selectedId=id;render();},
    network(network){if(!NETWORKS[network]||ownId()!==CID())return;const w=pack().crypto.find(w=>w.network===network);if(w){pack().selectedId=w.id;render();}},
    openNew(){
      if(!editable())return toast(T('此客戶目前無法操作錢包。','此客户目前无法操作钱包。','Wallet actions are unavailable for this customer.'));
      pending={kind:'new',customerId:CID()};
      walletModal(T('新增 USDT 錢包','新增 USDT 钱包','New USDT wallet'),`<form id="wallet-new-form"><div class="field"><label for="wallet-name">${T('錢包名稱','钱包名称','Wallet name')}</label><input class="input" id="wallet-name" maxlength="80" required placeholder="${T('例如：USDT 營運錢包','例如：USDT 营运钱包','e.g. USDT operating wallet')}"></div><div class="form-grid"><div class="field"><label for="wallet-create-asset">${T('資產','资产','Asset')}</label><input class="input" id="wallet-create-asset" value="USDT" readonly></div><div class="field"><label for="wallet-create-network">${T('網路','网络','Network')}</label><select class="select" id="wallet-create-network">${Object.entries(NETWORKS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div></div><p class="small muted">${T('新錢包尚未提供鏈上地址或結存；可使用模擬入金體驗 Demo。','新钱包尚未提供链上地址或结存；可使用模拟入金体验 Demo。','No on-chain address or balance has been supplied. Use a simulated deposit to explore the demo.')}</p>${modalError()}</form>`,`<button class="btn" onclick="closeModal()">${T('取消','取消','Cancel')}</button><button class="btn primary wallet-save" onclick="AzureWallets.save()">${T('建立錢包','创建钱包','Create wallet')}</button>`);
      document.getElementById('wallet-new-form').onsubmit=e=>{e.preventDefault();API.save();};
    },
    save(){
      if(!checkPending('new'))return;
      const name=document.getElementById('wallet-name')?.value.trim(),network=document.getElementById('wallet-create-network')?.value;
      if(!name||name.length>80||/[<>\u0000-\u001f]/.test(name)||!NETWORKS[network])return formError(T('請填寫有效的錢包名稱及網路。','请填写有效的钱包名称及网络。','Enter a valid wallet name and network.'));
      const w={id:'usdt-'+crypto.randomUUID(),customerId:CID(),name,asset:'USDT',network,availableUnits:null,frozenUnits:null,basis:null};pack().crypto.push(w);pack().selectedId=w.id;pending=null;closeModal();render();
    },
    openCredit(){
      const w=selected();if(!editable()||w?.kind!=='crypto')return;
      pending={kind:'credit',customerId:CID(),walletId:w.id};
      walletModal(T('模擬入金','模拟入金','Simulate deposit'),`<form id="wallet-credit-form"><p><b>${esc(w.name)}</b> · ${NETWORKS[w.network]}</p><div class="field"><label for="wallet-credit-amount">${T('金額（USDT）','金额（USDT）','Amount (USDT)')}</label><input class="input" id="wallet-credit-amount" inputmode="decimal" value="2500.00" required></div>${note(T('這是 Demo 資產，不會產生真實入金或分配鏈上地址。','这是 Demo 资产，不会产生真实入金或分配链上地址。','This creates demo assets only. No real deposit or on-chain address is created.'))}${modalError()}</form>`,`<button class="btn" onclick="closeModal()">${T('取消','取消','Cancel')}</button><button class="btn primary wallet-credit-submit" onclick="AzureWallets.credit()">${T('確認模擬入金','确认模拟入金','Confirm simulated deposit')}</button>`);
      document.getElementById('wallet-credit-form').onsubmit=e=>{e.preventDefault();API.credit();};
    },
    credit(){
      if(!checkPending('credit'))return;
      const w=cryptoWallet(pending.walletId),n=units(document.getElementById('wallet-credit-amount')?.value);
      if(!w||n===null||(w.availableUnits??0)+(w.frozenUnits??0)+n>MAX_UNITS)return formError(errorText());
      w.availableUnits=(w.availableUnits??0)+n;w.frozenUnits??=0;w.basis='demo';entry('credit',w,n);pending=null;closeModal();render();
    },
    openTransfer(){
      const w=selected();if(!editable()||w?.kind!=='crypto'||w.availableUnits===null)return;
      const targets=pack().crypto.filter(t=>t.id!==w.id&&t.asset===w.asset&&t.network===w.network);
      if(!targets.length)return toast(T('請先建立同一網路的另一個 USDT 錢包。','请先创建同一网络的另一个 USDT 钱包。','Create another USDT wallet on the same network first.'));
      pending={kind:'transfer',customerId:CID(),walletId:w.id};
      walletModal(T('錢包轉帳（Demo）','钱包转账（Demo）','Wallet transfer (Demo)'),`<form id="wallet-transfer-form"><p><b>${esc(w.name)}</b> · ${NETWORKS[w.network]}</p><div class="field"><label for="wallet-transfer-target">${T('收款錢包','收款钱包','Destination wallet')}</label><select class="select" id="wallet-transfer-target">${targets.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label for="wallet-transfer-amount">${T('金額（USDT）','金额（USDT）','Amount (USDT)')}</label><input class="input" id="wallet-transfer-amount" inputmode="decimal" required></div><p class="small muted">${T('僅模擬同一客戶、同一網路的錢包轉帳，不會發送鏈上交易。','仅模拟同一客户、同一网络的钱包转账，不会发送链上交易。','Simulates transfers between your wallets on the same network. No on-chain transaction is sent.')}</p>${modalError()}</form>`,`<button class="btn" onclick="closeModal()">${T('取消','取消','Cancel')}</button><button class="btn primary wallet-transfer-submit" onclick="AzureWallets.transfer()">${T('確認轉帳','确认转账','Confirm transfer')}</button>`);
      document.getElementById('wallet-transfer-form').onsubmit=e=>{e.preventDefault();API.transfer();};
    },
    transfer(){
      if(!checkPending('transfer'))return;
      const from=cryptoWallet(pending.walletId),to=cryptoWallet(document.getElementById('wallet-transfer-target')?.value),n=units(document.getElementById('wallet-transfer-amount')?.value);
      if(!from||!to||from.id===to.id||from.network!==to.network||from.asset!==to.asset||n===null||from.availableUnits===null||from.availableUnits<n||(to.availableUnits??0)+(to.frozenUnits??0)+n>MAX_UNITS)return formError(errorText());
      from.availableUnits-=n;to.availableUnits=(to.availableUnits??0)+n;to.frozenUnits??=0;to.basis='demo';entry('transfer-out',from,n,to);entry('transfer-in',to,n,from);pending=null;closeModal();render();
    },
    info(){
      const w=selected();if(w?.kind!=='crypto')return;
      walletModal(T('收款資訊','收款信息','Receive details'),`<div class="wallet-receive"><span class="wallet-token">₮</span><h3>${esc(w.name)}</h3><p>USDT · ${NETWORKS[w.network]}</p><div class="wallet-address-empty">${T('尚未分配鏈上收款地址','尚未分配链上收款地址','No on-chain receiving address assigned')}</div><p class="small muted">${T('目前為 Demo，未連接託管服務。切換網路不會共用收款地址。','目前为 Demo，未连接托管服务。切换网络不会共用收款地址。','This demo is not connected to a custody service. Receiving addresses are network-specific.')}</p></div>`,`<button class="btn" onclick="closeModal()">${T('關閉','关闭','Close')}</button>`);
    }
  };
  // Funding is a local simulation; no custody address, chain RPC or external payment is used.
  const FUNDING_KINDS=['deposit','withdraw'],FUNDING_STATES=['pending','completed','failed','cancelled'];
  const FEES={tron:1000000,ethereum:3000000},DEMO_CODE='654321';
  const fundingError=error=>({ok:false,error});
  function fundingWallet(walletId,network){
    if(ownId()!==CID())return fundingError('scope');
    if(frozen())return fundingError('frozen');
    const wallet=cryptoWallet(walletId);if(!wallet)return fundingError('wallet');
    if(network!==wallet.network||!NETWORKS[network])return fundingError('network');
    return {ok:true,wallet};
  }
  function fundingAddress(network,address){
    if(typeof address!=='string'||address.length>120)return false;
    return network==='tron'?/^(?:DEMO-TRC20-[A-Z0-9-]{8,80}|T[1-9A-HJ-NP-Za-km-z]{33})$/.test(address):network==='ethereum'&&/^(?:DEMO-ERC20-[A-Z0-9-]{8,80}|0x[0-9a-fA-F]{40})$/.test(address);
  }
  function fundingRecord(id){return ownId()===CID()?pack().ledger.find(r=>r.id===id&&r.customerId===CID()&&FUNDING_KINDS.includes(r.kind)):null;}
  function fundingInput(input,kind){
    if(!input||typeof input!=='object'||Array.isArray(input))return fundingError('wallet');
    const checked=fundingWallet(input.walletId,input.network);if(!checked.ok)return checked;
    const amountUnits=units(input.amount);if(amountUnits===null)return fundingError('amount');
    const requestId=input.requestId;if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(requestId))return fundingError('request-id');
    const memo=input.memo??'';if(typeof memo!=='string'||memo.length>140||/[\u0000-\u001f<>]/.test(memo))return fundingError('memo');
    const feeUnits=kind==='withdraw'?FEES[checked.wallet.network]:0,totalUnits=amountUnits+feeUnits;
    if(!Number.isSafeInteger(totalUnits)||totalUnits>MAX_UNITS)return fundingError('amount');
    const address=kind==='deposit'?FUNDING.address(input.walletId).address:typeof input.address==='string'?input.address.trim():'';
    if(!fundingAddress(checked.wallet.network,address))return fundingError('address');
    if(kind==='withdraw'&&input.networkConfirmed!==true)return fundingError('confirmation');
    if(kind==='withdraw'&&input.otp!==DEMO_CODE)return fundingError('otp');
    const signature=JSON.stringify([kind,checked.wallet.id,checked.wallet.network,amountUnits,address,memo.trim()]);
    const existing=pack().ledger.find(r=>r.requestId===requestId);
    if(existing)return existing.requestSignature===signature?{ok:true,existing}:{ok:false,error:'request-conflict'};
    return {ok:true,wallet:checked.wallet,amountUnits,feeUnits,totalUnits,address,memo:memo.trim(),requestId,signature};
  }
  function createFunding(input,kind){
    const checked=fundingInput(input,kind);if(!checked.ok)return checked;
    if(checked.existing)return {ok:true,record:clone(checked.existing),duplicate:true};
    const {wallet,amountUnits,feeUnits,totalUnits,address,memo,requestId,signature}=checked;
    if(kind==='withdraw'&&(wallet.availableUnits===null||wallet.availableUnits<totalUnits))return fundingError('balance');
    if(kind==='withdraw'&&((wallet.frozenUnits??0)+totalUnits>MAX_UNITS))return fundingError('balance-limit');
    if(kind==='deposit'&&(wallet.availableUnits??0)+(wallet.frozenUnits??0)+amountUnits>MAX_UNITS)return fundingError('balance-limit');
    const time=new Date().toISOString();
    const record={id:'WLT-'+crypto.randomUUID(),customerId:CID(),walletId:wallet.id,kind,asset:'USDT',network:wallet.network,amountUnits,feeUnits,totalUnits,status:'pending',reservedUnits:kind==='withdraw'?totalUnits:0,settledUnits:0,address,reference:'DEMO-'+crypto.randomUUID().replace(/-/g,'').slice(0,20).toUpperCase(),memo,requestId,requestSignature:signature,date:time,updatedAt:time,actor:actor()};
    if(kind==='withdraw'){wallet.availableUnits-=totalUnits;wallet.frozenUnits=(wallet.frozenUnits??0)+totalUnits;}
    pack().ledger.unshift(record);pack().selectedId=wallet.id;render();return {ok:true,record:clone(record)};
  }
  function validFundingSnapshotRow(row,wallets){
    if(!FUNDING_KINDS.includes(row.kind))return ['credit','transfer-in','transfer-out'].includes(row.kind);
    const wallet=wallets.find(w=>w.id===row.walletId);
    if(!wallet||row.asset!=='USDT'||row.network!==wallet.network||!FUNDING_STATES.includes(row.status)||typeof row.id!=='string'||!Number.isFinite(Date.parse(row.date))||!Number.isFinite(Date.parse(row.updatedAt)))return false;
    if(!Number.isSafeInteger(row.feeUnits)||row.feeUnits!==(row.kind==='withdraw'?FEES[row.network]:0)||row.totalUnits!==row.amountUnits+row.feeUnits||row.totalUnits>MAX_UNITS)return false;
    if(row.reservedUnits!==(row.kind==='withdraw'&&row.status==='pending'?row.totalUnits:0)||row.settledUnits!==(row.status==='completed'?row.totalUnits:0))return false;
    return fundingAddress(row.network,row.address)&&typeof row.reference==='string'&&/^DEMO-[A-Z0-9]{20}$/.test(row.reference)&&typeof row.requestId==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(row.requestId)&&typeof row.requestSignature==='string'&&typeof row.memo==='string'&&row.memo.length<=140;
  }
  const FUNDING=API.funding={
    config:()=>({demoCode:DEMO_CODE,feeUnits:{...FEES},scale:SCALE}),
    address(walletId){
      if(ownId()!==CID())return fundingError('scope');
      const wallet=cryptoWallet(walletId);if(!wallet)return fundingError('wallet');
      const prefix=wallet.network==='tron'?'DEMO-TRC20-':'DEMO-ERC20-',suffix=(CID()+'-'+wallet.id).replace(/[^A-Za-z0-9-]/g,'').toUpperCase().slice(0,76),address=prefix+suffix;
      const query=new URLSearchParams({wallet:wallet.id,network:wallet.network,address});
      return {ok:true,walletId:wallet.id,network:wallet.network,address,qrPayload:'azure-demo://deposit?'+query.toString()};
    },
    quote(input){
      if(!input||typeof input!=='object')return fundingError('wallet');
      const checked=fundingWallet(input.walletId,input.network);if(!checked.ok)return checked;
      const feeUnits=FEES[checked.wallet.network],availableUnits=checked.wallet.availableUnits,maxUnits=availableUnits===null?null:Math.max(0,availableUnits-feeUnits),amountUnits=units(input.amount);
      if(amountUnits===null)return {...fundingError('amount'),feeUnits,availableUnits,maxUnits};
      const totalUnits=amountUnits+feeUnits;
      if(!Number.isSafeInteger(totalUnits)||totalUnits>MAX_UNITS)return {...fundingError('amount'),feeUnits,availableUnits,maxUnits};
      if(availableUnits===null||totalUnits>availableUnits)return {...fundingError('balance'),amountUnits,feeUnits,totalUnits,availableUnits,maxUnits};
      return {ok:true,amountUnits,feeUnits,totalUnits,availableUnits,maxUnits,network:checked.wallet.network};
    },
    validAddress:fundingAddress,
    createDeposit:input=>createFunding(input,'deposit'),
    createWithdrawal:input=>createFunding(input,'withdraw'),
    records(walletId){
      if(ownId()!==CID())return [];
      if(walletId&&!cryptoWallet(walletId))return [];
      return clone(pack().ledger.filter(r=>r.customerId===CID()&&FUNDING_KINDS.includes(r.kind)&&(!walletId||r.walletId===walletId)));
    },
    get(id){const record=fundingRecord(id);return record?clone(record):null;},
    transition(id,status){
      if(ownId()!==CID())return fundingError('scope');if(frozen())return fundingError('frozen');
      const record=fundingRecord(id);if(!record)return fundingError('record');
      if(!FUNDING_STATES.includes(status)||status==='pending')return fundingError('status');
      if(record.status!=='pending')return fundingError('final');
      const wallet=cryptoWallet(record.walletId);if(!wallet||wallet.network!==record.network)return fundingError('wallet');
      if(record.kind==='deposit'&&status==='completed'){
        if((wallet.availableUnits??0)+(wallet.frozenUnits??0)+record.amountUnits>MAX_UNITS)return fundingError('balance-limit');
        wallet.availableUnits=(wallet.availableUnits??0)+record.amountUnits;wallet.frozenUnits??=0;wallet.basis='demo';
      }
      if(record.kind==='withdraw'){
        if(wallet.frozenUnits===null||wallet.frozenUnits<record.totalUnits)return fundingError('balance');
        if(status!=='completed'&&(wallet.availableUnits??0)+record.totalUnits>MAX_UNITS)return fundingError('balance-limit');
        wallet.frozenUnits-=record.totalUnits;
        if(status!=='completed')wallet.availableUnits=(wallet.availableUnits??0)+record.totalUnits;
      }
      record.status=status;record.reservedUnits=0;record.settledUnits=status==='completed'?record.totalUnits:0;record.updatedAt=new Date().toISOString();
      render();return {ok:true,record:clone(record)};
    }
  };
  function valueMarkup(w){return `<span data-wallet-estimate="${esc(w.id)}">—</span><small>${T('USD 市場參考值','USD 市场参考值','USD reference value')}</small>`;}
  function summaryCard(){
    const digital=list().filter(w=>w.kind==='crypto'),known=digital.filter(w=>w.availableUnits!==null),total=known.reduce((n,w)=>n+w.availableUnits+(w.frozenUnits||0),0)/SCALE;
    return `<section class="card wallet-home-summary"><div class="card-head"><div><h3 class="card-title">${T('多錢包與 USDT','多钱包与 USDT','Wallets and USDT')}</h3><p class="small muted">${known.length?T('已載入的 Demo 資產','已载入的 Demo 资产','Loaded demo assets'):T('法幣與數位資產分開管理','法币与数字资产分开管理','Fiat and digital assets managed separately')}</p></div><button class="btn" onclick="go('cust','wallets')">${NAVICON.wallets}${T('管理錢包','管理钱包','Manage wallets')}</button></div><div class="wallet-preview"><div><span class="wallet-token">₮</span><strong>${known.length?fmt(total,'USDT'):'—'} USDT</strong><span class="badge">${T('Demo','Demo','Demo')}</span></div><span class="small muted">${known.length?T(`${known.length} 個已載入錢包；${digital.length-known.length} 個結存未提供`,`${known.length} 个已载入钱包；${digital.length-known.length} 个结存未提供`,`${known.length} loaded wallets; ${digital.length-known.length} balances not supplied`):'TRON (TRC20) · Ethereum (ERC20)'}</span></div></section>`;
  }
  PAGES['cust:wallets']=()=>{
    const wallets=list(),w=selected();if(!w)return head(T('多錢包與資產','多钱包与资产','Wallets and assets'));
    const digital=w.kind==='crypto',basis=digital?(w.basis==='demo'?'Demo':T('未提供','未提供','Not supplied')):T('法幣匯總','法币汇总','Fiat aggregate');
    const ledger=pack().ledger.filter(r=>r.walletId===w.id),total=w.available===null?null:w.available+(w.frozen||0);
    return head(T('多錢包與資產','多钱包与资产','Wallets and assets'),T('同一客戶管理法幣與 USDT；按錢包及網路查看資產。','同一客户管理法币与 USDT；按钱包及网络查看资产。','Manage fiat and USDT for one customer, by wallet and network.'))+`<div class="wallet-page"><div class="card wallet-toolbar"><div class="field"><label for="wallet-select">${T('目前錢包','当前钱包','Current wallet')}</label><select class="select" id="wallet-select" onchange="AzureWallets.select(this.value)">${wallets.map(x=>`<option value="${esc(x.id)}" ${x.id===w.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="field wallet-network-field"><label for="wallet-network">${T('網路','网络','Network')}</label><select class="select" id="wallet-network" onchange="AzureWallets.network(this.value)" ${digital?'':'disabled'}>${digital?Object.entries(NETWORKS).map(([k,v])=>`<option value="${k}" ${k===w.network?'selected':''}>${v}</option>`).join(''):`<option>${T('銀行／法幣','银行／法币','Bank / fiat')}</option>`}</select></div><button class="btn primary" id="wallet-new-btn" onclick="AzureWallets.openNew()" ${frozen()?'disabled':''}>${ICON.plus}${T('新增 USDT 錢包','新增 USDT 钱包','New USDT wallet')}</button></div>${frozen()?note(T('此客戶已凍結，錢包目前只供檢視。','此客户已冻结，钱包目前仅供查看。','This customer is frozen. Wallets are read-only.'),'warn'):''}<section class="card wallet-selected" data-wallet-id="${esc(w.id)}"><div class="wallet-selected-header"><div class="wallet-identity"><span class="wallet-token ${digital?'':'fiat-token'}">${digital?'₮':esc(w.asset.slice(0,2))}</span><div><h2>${esc(w.name)}</h2><p>${esc(w.asset)} · ${digital?NETWORKS[w.network]:T('按幣種匯總','按币种汇总','Aggregated by currency')}</p></div></div><span class="badge ${w.basis==='demo'?'warn':'info'}">${basis}</span></div><div class="wallet-metrics"><div><span>${T('可用結存','可用结存','Available balance')}</span><strong class="wallet-amount">${fmt(w.available,w.asset)} <small>${esc(w.asset)}</small></strong></div><div><span>${T('凍結','冻结','Frozen')}</span><strong>${fmt(w.frozen,w.asset)} <small>${esc(w.asset)}</small></strong></div><div><span>${T('總額','总额','Total')}</span><strong>${fmt(total,w.asset)} <small>${esc(w.asset)}</small></strong></div><div class="wallet-estimate">${valueMarkup(w)}</div></div><div class="wallet-actions">${digital?`<button class="btn wallet-info-btn" onclick="AzureWallets.info()">${T('收款資訊','收款信息','Receive details')}</button><button class="btn wallet-credit-btn" onclick="AzureWallets.openCredit()" ${frozen()?'disabled':''}>${T('模擬入金','模拟入金','Simulate deposit')}</button><button class="btn primary wallet-transfer-btn" onclick="AzureWallets.openTransfer()" ${frozen()||w.availableUnits===null?'disabled':''}>${T('錢包轉帳（Demo）','钱包转账（Demo）','Transfer (Demo)')}</button>`:`<button class="btn" onclick="go('cust','accounts')">${T('查看銀行帳戶','查看银行账户','View bank accounts')}</button><button class="btn primary" onclick="go('cust','pay')">${T('全球付款','全球付款','Global payments')}</button>`}</div><p class="small muted wallet-balance-note">${digital?T('USDT 結存未提供時顯示「未提供」。模擬入金及轉帳只影響 Demo 錢包，不會變動銀行資產。','USDT 结存未提供时显示“未提供”。模拟入金及转账只影响 Demo 钱包，不会变动银行资产。','Missing USDT balances remain unavailable. Simulated deposits and transfers affect demo wallets only, not bank assets.'):T('法幣結存按幣種匯總，同幣種的多個銀行戶口不會重複計入。','法币结存按币种汇总，同币种的多个银行户口不会重复计入。','Fiat balances are aggregated by currency, without duplicating balances across bank accounts.')}</p></section><section class="card wallet-list-card"><div class="card-head"><h3 class="card-title">${T('所有錢包','所有钱包','All wallets')}</h3><span class="card-sub">${wallets.length}</span></div><div class="tbl-wrap"><table class="wallet-list"><thead><tr><th>${T('錢包','钱包','Wallet')}</th><th>${T('資產／網路','资产／网络','Asset / network')}</th><th class="r">${T('可用結存','可用结存','Available')}</th><th>${T('資料狀態','数据状态','Data status')}</th><th>${T('操作','操作','Actions')}</th></tr></thead><tbody>${wallets.map(x=>`<tr data-wallet-row="${esc(x.id)}"><td><b>${esc(x.name)}</b></td><td>${esc(x.asset)}<small>${x.kind==='crypto'?NETWORKS[x.network]:T('銀行／法幣','银行／法币','Bank / fiat')}</small></td><td class="r mono">${fmt(x.available,x.asset)}</td><td>${x.kind==='fiat'?T('法幣匯總','法币汇总','Fiat aggregate'):x.basis==='demo'?'Demo':T('未提供','未提供','Not supplied')}</td><td><button class="btn sm" onclick="AzureWallets.select('${esc(x.id)}')">${x.id===w.id?T('目前錢包','当前钱包','Selected'):T('選擇','选择','Select')}</button></td></tr>`).join('')}</tbody></table></div></section><section class="card wallet-history"><div class="card-head"><h3 class="card-title">${T('錢包紀錄','钱包记录','Wallet activity')}</h3><span class="card-sub">Demo</span></div>${ledger.length?`<div class="tbl-wrap"><table><thead><tr><th>${T('時間','时间','Time')}</th><th>${T('類型','类型','Type')}</th><th class="r">USDT</th><th>${T('操作者','操作者','Actor')}</th></tr></thead><tbody>${ledger.slice(0,30).map(r=>`<tr><td>${esc(new Date(r.date).toLocaleString(I18N.lang==='en'?'en-GB':'zh-TW'))}</td><td>${r.kind==='credit'?T('模擬入金','模拟入金','Simulated deposit'):r.kind==='transfer-out'?T('轉出','转出','Transfer out'):T('轉入','转入','Transfer in')}</td><td class="r mono">${r.kind==='transfer-out'?'−':'+'}${fmt(r.amountUnits/SCALE,'USDT')}</td><td>${esc(r.actor?.email||'—')}</td></tr>`).join('')}</tbody></table></div>`:`<p class="empty">${T('此錢包尚無紀錄','此钱包暂无记录','No activity for this wallet')}</p>`}</section></div>`;
  };
  NAVICON.wallets=NI('<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h18M16 12h5v5h-5a2.5 2.5 0 0 1 0-5Z"/><circle cx="16.5" cy="14.5" r=".5"/>');
  const menu=['wallets','钱包与资产'];MENUS.cust.splice(2,0,menu);NAV_GROUPS.cust[0][1].splice(2,0,'wallets');
  const sourceHome=PAGES['cust:home'];PAGES['cust:home']=()=>sourceHome()+summaryCard();
  const sourceRender=render;render=function(...args){menu[1]=T('多錢包與資產','多钱包与资产','Wallets and assets');return sourceRender(...args);};
  function updateEstimates(){
    if(ownId()!==CID())return;
    document.querySelectorAll('[data-wallet-estimate]').forEach(el=>{const w=list().find(w=>w.id===el.dataset.walletEstimate),r=w&&window.AzureMarketRates?.getRate(w.asset,'USD'),state=window.AzureMarketRates?.status();const amount=w?.available===null?null:(w?.available||0)+(w?.frozen||0);el.textContent=amount!==null&&Number.isFinite(r)&&r>0?'USD '+fmt(amount*r,'USD'):'—';el.closest('.wallet-estimate')?.classList.toggle('wallet-estimate-stale',!!state?.stale);});
  }
  const sourceAfter=afterRender;afterRender=function(...args){const out=sourceAfter(...args);if(S.portal==='cust'&&S.page==='home'){const label=document.querySelector('.hero-bal .kpi-label');if(label)label.textContent=T('法幣資產（Demo 匯率折算）','法币资产（Demo 汇率折算）','Fiat assets (demo conversion rates)');}if(!unsubscribe&&window.AzureMarketRates?.subscribe)unsubscribe=AzureMarketRates.subscribe(updateEstimates);updateEstimates();return out;};
  window.addEventListener('pagehide',()=>{unsubscribe?.();unsubscribe=null;});
})();
