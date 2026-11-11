/* Integer-unit, customer-scoped Demo operations. No external financial API. */
(() => {
  'use strict';
  const SCALE=1000000,MAX=1000000000000000,MAX_VALUE=1000000000;
  const NETWORKS={tron:'TRON (TRC20)',ethereum:'Ethereum (ERC20)'},FEES={tron:1000000,ethereum:3000000};
  const RATES={USD:'1',HKD:'7.8',EUR:'0.92',CNH:'7.2',CNY:'7.2',SGD:'1.35',GBP:'0.79',JPY:'150'};
  const CODE='654321',clone=x=>JSON.parse(JSON.stringify(x)),fail=error=>({ok:false,error});
  const id=prefix=>prefix+'-'+crypto.randomUUID(),now=()=>new Date().toISOString();
  const string=(v,max,empty=false)=>typeof v==='string'&&v.length<=max&&(empty||!!v.trim())&&!/[<>\u0000-\u001f]/.test(v);
  const req=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(v);
  const int=(n,max=MAX)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  const amount=(v,dp)=>{if(!['string','number'].includes(typeof v))return null;const s=String(v).trim();if(!new RegExp('^\\d+(?:\\.\\d{1,'+dp+'})?$').test(s))return null;const [a,b='']=s.split('.'),n=Number(a)*10**dp+Number(b.padEnd(dp,'0'));return int(n,MAX_VALUE*10**dp)&&n>0?n:null;};
  const text=(n,dp)=>Math.floor(n/10**dp)+'.'+String(n%10**dp).padStart(dp,'0');
  const canonical=(network,address)=>network==='ethereum'&&address.startsWith('0x')?address.toLowerCase():address;
  const state=()=>({version:1,addresses:[],exchanges:[],batches:[]});
  const batchStatus=rows=>rows.every(r=>r.status==='pending')?'pending':rows.every(r=>r.status==='completed')?'completed':rows.every(r=>r.status==='failed')?'failed':rows.every(r=>r.status==='cancelled')?'cancelled':'partial';
  const totals=rows=>Object.fromEntries(['amountUnits','feeUnits','totalUnits','reservedUnits','settledUnits'].map(k=>[k,rows.reduce((n,r)=>n+(r[k]||0),0)]));
  function exchangeAmounts(from,to,raw){
    const fd=from==='USDT'?6:2,td=to==='USDT'?6:2,n=amount(raw,fd);if(n===null)return null;
    const fee=Number((BigInt(n)*20n+9999n)/10000n),net=n-fee;
    const factor=ccy=>BigInt(Math.round(Number(ccy==='USDT'?'1':RATES[ccy])*1000000));
    if(!RATES[from]&&from!=='USDT'||!RATES[to]&&to!=='USDT')return null;
    const received=Number(BigInt(net)*factor(to)*BigInt(10**td)/(factor(from)*BigInt(10**fd)));
    return net>0&&received>0&&int(received,MAX_VALUE*10**td)?{amountUnits:n,feeUnits:fee,netUnits:net,receiveUnits:received,fromDecimals:fd,toDecimals:td}:null;
  }
  function validStateUnsafe(s,cid,wallets,ledger,validAddress){
    if(!s)return !ledger.some(r=>r.exchangeId||r.batchId||['exchange-in','exchange-out'].includes(r.kind));
    if(s.version!==1||!Array.isArray(s.addresses)||s.addresses.length>100||!Array.isArray(s.exchanges)||!Array.isArray(s.batches))return false;
    const unique=rows=>new Set(rows.map(r=>r.id)).size===rows.length;
    if(![s.addresses,s.exchanges,s.batches].every(unique)||new Set(s.exchanges.map(r=>r.requestId)).size!==s.exchanges.length||new Set(s.exchanges.map(r=>r.quoteId)).size!==s.exchanges.length||new Set(s.batches.map(r=>r.requestId)).size!==s.batches.length)return false;
    const seen=new Set();
    for(const a of s.addresses){
      if(a.customerId!==cid||!string(a.id,100)||!string(a.label,80)||!string(a.note,140,true)||typeof a.enabled!=='boolean'||!NETWORKS[a.network]||!validAddress(a.network,a.address)||!Number.isFinite(Date.parse(a.createdAt))||!Number.isFinite(Date.parse(a.updatedAt)))return false;
      const key=a.network+':'+canonical(a.network,a.address);if(seen.has(key))return false;seen.add(key);
    }
    for(const r of s.exchanges){
      const math=exchangeAmounts(r.fromCurrency,r.toCurrency,r.amount),w=wallets.find(w=>w.id===(r.fromCurrency==='USDT'?r.fromWalletId:r.toWalletId));
      if(!math||!w||r.customerId!==cid||r.status!=='completed'||!req(r.requestId)||!string(r.id,100)||!string(r.quoteId,100)||r.fromCurrency==='USDT'&&r.toCurrency==='USDT'||r.fromCurrency!=='USDT'&&r.toCurrency!=='USDT'||!Number.isFinite(Date.parse(r.date)))return false;
      if(r.fromCurrency!=='USDT'&&r.fromWalletId!==`fiat-${cid}-${r.fromCurrency}`||r.toCurrency!=='USDT'&&r.toWalletId!==`fiat-${cid}-${r.toCurrency}`)return false;
      if(Object.keys(math).some(k=>math[k]!==r[k])||r.fee!==text(math.feeUnits,math.fromDecimals)||r.receiveAmount!==text(math.receiveUnits,math.toDecimals))return false;
      const row=ledger.find(x=>x.id===r.ledgerId),out=r.fromCurrency==='USDT';
      if(!row||row.exchangeId!==r.id||row.fromWalletId!==r.fromWalletId||row.toWalletId!==r.toWalletId||row.walletId!==w.id||row.network!==w.network||row.asset!=='USDT'||row.kind!==(out?'exchange-out':'exchange-in')||row.amountUnits!==(out?math.netUnits:math.receiveUnits)||row.feeUnits!==(out?math.feeUnits:0)||row.totalUnits!==(out?math.amountUnits:math.receiveUnits)||row.settledUnits!==row.totalUnits||row.reservedUnits!==0||row.status!=='completed')return false;
    }
    for(const b of s.batches){
      const w=wallets.find(w=>w.id===b.walletId);if(!req(b.id)||!Number.isFinite(Date.parse(b.date))||!Number.isFinite(Date.parse(b.updatedAt))||!w||b.customerId!==cid||w.network!==b.network||!req(b.requestId)||!Array.isArray(b.rows)||!b.rows.length||b.rows.length>50||!unique(b.rows)||b.status!==batchStatus(b.rows))return false;
      if(Object.entries(totals(b.rows)).some(([k,n])=>!int(n)||b[k]!==n))return false;
      if(new Set(b.rows.map(r=>canonical(b.network,r.address))).size!==b.rows.length)return false;
      if(b.requestSignature!==JSON.stringify([b.walletId,b.network,b.rows.map(r=>[r.name,r.address,r.amount,r.memo,r.network])]))return false;
      for(const r of b.rows){
        if(!req(r.id)||r.network!==b.network||r.amount!==text(r.amountUnits,6)||!Number.isFinite(Date.parse(r.updatedAt))||!['pending','completed','failed','cancelled'].includes(r.status)||!int(r.amountUnits)||!r.amountUnits||r.feeUnits!==FEES[b.network]||r.totalUnits!==r.amountUnits+r.feeUnits||r.reservedUnits!==(r.status==='pending'?r.totalUnits:0)||r.settledUnits!==(r.status==='completed'?r.totalUnits:0)||!validAddress(b.network,r.address)||!string(r.name,80,true)||!string(r.memo,140,true))return false;
        const row=ledger.find(x=>x.id===r.id);if(!row||row.batchId!==b.id||row.batchRowId!==r.id||row.walletId!==w.id||row.kind!=='withdraw'||row.network!==b.network||row.address!==r.address||['amountUnits','feeUnits','totalUnits','reservedUnits','settledUnits','status'].some(k=>row[k]!==r[k]))return false;
      }
    }
    if(ledger.some(r=>r.exchangeId&&!s.exchanges.some(x=>x.id===r.exchangeId&&x.ledgerId===r.id)||r.batchId&&!s.batches.some(b=>b.id===r.batchId&&b.rows.some(x=>x.id===r.id))))return false;
    return true;
  }
  function validState(...args){try{return validStateUnsafe(...args);}catch{return false;}}
  function create(h){
    const quotes=new Map(),scope=()=>h.ownId()===h.cid(),gate=()=>!scope()?'SCOPE':h.frozen()?'FROZEN':null;
    const data=()=>{const p=h.pack();return p.operations||=state();};
    const wallet=wid=>h.list().find(w=>w.id===wid),cryptoWallet=wid=>h.cryptoWallet(wid);
    const balance=w=>{if(w.asset==='USDT')return int(w.availableUnits)?w.availableUnits:null;const value=h.bank()[w.asset]?.a,n=typeof value==='number'&&Number.isFinite(value)?Math.round(value*100):NaN;return int(n,MAX_VALUE*100)?n:null;};
    const held=w=>w.asset==='USDT'?w.frozenUnits:typeof h.bank()[w.asset]?.f==='number'?Math.round(h.bank()[w.asset].f*100):0;
    const resolve=wid=>{const w=wallet(wid);return w?.kind==='crypto'?cryptoWallet(wid):w;};
    const setBalance=(w,n)=>{if(w.asset==='USDT'){w.availableUnits=n;w.frozenUnits??=0;w.basis='demo';}else h.bank()[w.asset].a=n/100;};
    const actor=()=>clone(h.actor());
    const A={
      config:()=>({customerId:h.cid(),readOnly:!!gate(),scale:SCALE,demoCode:CODE,maxRows:50,feeUnits:{...FEES},networks:{...NETWORKS},quoteSeconds:30,exchangeFeeBps:20,fiatRates:{...RATES}}),
      addresses:{
        list:()=>scope()?clone(data().addresses):[],
        save(input){
          const err=gate();if(err)return fail(err);if(!input||typeof input!=='object')return fail('INVALID_ADDRESS');
          const {network}=input,address=typeof input.address==='string'?input.address.trim():'',label=typeof input.label==='string'?input.label.trim():'',note=typeof input.note==='string'?input.note.trim():'';
          if(!NETWORKS[network])return fail('INVALID_NETWORK');if(!h.validAddress(network,address))return fail('INVALID_ADDRESS');
          if(!string(label,80))return fail('INVALID_LABEL');if(!string(note,140,true))return fail('INVALID_NOTE');if(typeof input.enabled!=='boolean')return fail('INVALID_ADDRESS');
          const rows=data().addresses,current=input.id?rows.find(a=>a.id===input.id):null;
          if(input.id&&!current)return fail('NOT_FOUND');if(!current&&rows.length>=100)return fail('ADDRESS_LIMIT');
          const value=canonical(network,address);if(rows.some(a=>a.id!==current?.id&&a.network===network&&canonical(network,a.address)===value))return fail('DUPLICATE_ADDRESS');
          const date=now(),row={id:current?.id||id('ADR'),customerId:h.cid(),label,network,address:value,note,enabled:input.enabled,createdAt:current?.createdAt||date,updatedAt:date};
          if(current)Object.assign(current,row);else rows.unshift(row);h.render();return {ok:true,address:clone(row)};
        },
        remove(aid){const err=gate();if(err)return fail(err);const rows=data().addresses,index=rows.findIndex(a=>a.id===aid);if(index<0)return fail('NOT_FOUND');rows.splice(index,1);h.render();return {ok:true};}
      },
      exchange:{
        quote(input){
          const err=gate();if(err)return fail(err);if(!input||!req(input.requestId))return fail('INVALID_REQUEST');
          const from=resolve(input.fromWalletId),to=resolve(input.toWalletId);if(!from||!to||from.customerId!==h.cid()||to.customerId!==h.cid())return fail('INVALID_WALLET');
          if(from.id===to.id||from.asset==='USDT'&&to.asset==='USDT'||from.asset!=='USDT'&&to.asset!=='USDT'||from.asset!=='USDT'&&!RATES[from.asset]||to.asset!=='USDT'&&!RATES[to.asset])return fail('INVALID_PAIR');
          const math=exchangeAmounts(from.asset,to.asset,input.amount);if(!math)return fail('INVALID_AMOUNT');
          const available=balance(from),destination=balance(to);if(available===null||to.asset!=='USDT'&&destination===null)return fail('BALANCE_UNKNOWN');
          if(available<math.amountUnits)return fail('INSUFFICIENT_BALANCE');if((destination??0)+(held(to)??0)+math.receiveUnits>MAX_VALUE*10**math.toDecimals)return fail('BALANCE_LIMIT');
          const timestamp=Date.now(),rate=Number(to.asset==='USDT'?'1':RATES[to.asset])/Number(from.asset==='USDT'?'1':RATES[from.asset]);
          const q={quoteId:id('WQ'),customerId:h.cid(),requestId:input.requestId,fromWalletId:from.id,toWalletId:to.id,fromCurrency:from.asset,toCurrency:to.asset,fromName:from.name,toName:to.name,fromNetwork:from.network||null,toNetwork:to.network||null,...math,amount:text(math.amountUnits,math.fromDecimals),fee:text(math.feeUnits,math.fromDecimals),feeCurrency:from.asset,netAmount:text(math.netUnits,math.fromDecimals),receiveAmount:text(math.receiveUnits,math.toDecimals),rate,rateText:rate.toFixed(8),createdAt:new Date(timestamp).toISOString(),expiresAt:timestamp+30000,demo:true};q.id=q.quoteId;
          for(const [key,value] of quotes)if(value.expiresAt<timestamp)quotes.delete(key);if(quotes.size>=100)quotes.delete(quotes.keys().next().value);
          quotes.set(q.quoteId,q);return {ok:true,quote:clone(q)};
        },
        execute(input){
          const err=gate();if(err)return fail(err);if(!input||!req(input.requestId)||typeof input.quoteId!=='string')return fail('INVALID_REQUEST');
          const prior=data().exchanges.find(r=>r.requestId===input.requestId||r.quoteId===input.quoteId);
          if(prior)return prior.requestId===input.requestId&&prior.quoteId===input.quoteId?{ok:true,record:clone(prior),duplicate:true}:fail('REQUEST_CONFLICT');
          const q=quotes.get(input.quoteId);if(!q||q.customerId!==h.cid()||Date.now()>=q.expiresAt)return fail('EXPIRED');if(q.requestId!==input.requestId)return fail('REQUEST_CONFLICT');if(input.otp!==CODE)return fail('INVALID_OTP');
          const from=resolve(q.fromWalletId),to=resolve(q.toWalletId);if(!from||!to)return fail('INVALID_WALLET');
          const av=balance(from),dest=balance(to);if(av===null||to.asset!=='USDT'&&dest===null)return fail('BALANCE_UNKNOWN');if(av<q.amountUnits)return fail('INSUFFICIENT_BALANCE');if((dest??0)+(held(to)??0)+q.receiveUnits>MAX_VALUE*10**q.toDecimals)return fail('BALANCE_LIMIT');
          const date=now(),out=from.asset==='USDT',cw=out?from:to,r={...clone(q),id:id('WEX'),ledgerId:id('WLT'),date,updatedAt:date,status:'completed',actor:actor()};
          const row={id:r.ledgerId,customerId:h.cid(),walletId:cw.id,kind:out?'exchange-out':'exchange-in',asset:'USDT',network:cw.network,amountUnits:out?q.netUnits:q.receiveUnits,feeUnits:out?q.feeUnits:0,totalUnits:out?q.amountUnits:q.receiveUnits,status:'completed',reservedUnits:0,settledUnits:out?q.amountUnits:q.receiveUnits,exchangeId:r.id,fromWalletId:from.id,toWalletId:to.id,fromName:from.name,toName:to.name,date,updatedAt:date,actor:actor()};
          setBalance(from,av-q.amountUnits);setBalance(to,(dest??0)+q.receiveUnits);data().exchanges.unshift(r);h.pack().ledger.unshift(row);quotes.delete(q.quoteId);h.render();return {ok:true,record:clone(r)};
        },
        records:()=>scope()?clone(data().exchanges):[],
        get:rid=>scope()?clone(data().exchanges.find(r=>r.id===rid)||null):null
      },
      batch:{
        validate(input){
          const error=gate(),base={ok:false,rows:[],errors:[],walletId:input?.walletId,network:input?.network,amountUnits:0,feeUnits:0,totalUnits:0,availableUnits:null};
          if(error)return {...base,error,errors:[error]};const w=cryptoWallet(input?.walletId);if(!w)return {...base,error:'INVALID_WALLET',errors:['INVALID_WALLET']};
          if(!NETWORKS[input.network]||w.network!==input.network)return {...base,error:'INVALID_NETWORK',errors:['INVALID_NETWORK']};
          if(!Array.isArray(input.rows)||input.rows.length<1||input.rows.length>50)return {...base,error:'INVALID_ROWS',errors:['INVALID_ROWS']};
          const seen=new Set();base.availableUnits=w.availableUnits;
          base.rows=input.rows.map((raw,i)=>{
            const r=raw&&typeof raw==='object'?raw:{},errors=[],address=typeof r.address==='string'?r.address.trim():'',n=amount(r.amount,6),name=typeof r.name==='string'?r.name.trim():'',memo=typeof r.memo==='string'?r.memo.trim():'';
            if(r.network!==undefined&&r.network!==input.network)errors.push('INVALID_NETWORK');if(!h.validAddress(input.network,address))errors.push('INVALID_ADDRESS');
            const key=canonical(input.network,address);if(address&&seen.has(key))errors.push('DUPLICATE_ADDRESS');seen.add(key);
            if(n===null)errors.push('INVALID_AMOUNT');if(!string(name,80,true))errors.push('INVALID_NAME');if(!string(memo,140,true))errors.push('INVALID_MEMO');
            const fee=FEES[input.network],total=(n??0)+fee;if(!int(total))errors.push('BALANCE_LIMIT');
            return {rowKey:typeof r.rowKey==='string'?r.rowKey:String(i+1),name,address:key,network:input.network,amount:n===null?String(r.amount??''):text(n,6),amountUnits:n??0,feeUnits:fee,totalUnits:total,memo,errors};
          });
          for(const k of ['amountUnits','feeUnits','totalUnits'])base[k]=base.rows.reduce((sum,r)=>sum+r[k],0);
          if(!int(base.totalUnits))base.errors.push('BALANCE_LIMIT');if(w.availableUnits===null)base.errors.push('BALANCE_UNKNOWN');else if(base.totalUnits>w.availableUnits)base.errors.push('INSUFFICIENT_BALANCE');
          if((w.frozenUnits??0)+base.totalUnits>MAX)base.errors.push('BALANCE_LIMIT');
          base.ok=!base.errors.length&&base.rows.every(r=>!r.errors.length);if(!base.ok)base.error=base.errors[0]||base.rows.find(r=>r.errors.length)?.errors[0];return base;
        },
        submit(input){
          const error=gate();if(error)return fail(error);if(!input||!req(input.requestId))return fail('INVALID_REQUEST');
          const checked=A.batch.validate(input),signature=JSON.stringify([input.walletId,input.network,checked.rows.map((r,i)=>[r.name,r.address,r.amount,r.memo,input.rows[i]?.network??input.network])]);
          const prior=data().batches.find(b=>b.requestId===input.requestId);if(prior)return prior.requestSignature===signature?{ok:true,batch:clone(prior),duplicate:true}:fail('REQUEST_CONFLICT');
          if(!checked.ok)return checked;if(input.otp!==CODE)return fail('INVALID_OTP');if(input.networkConfirmed!==true)return fail('CONFIRMATION');
          const w=cryptoWallet(input.walletId),date=now(),bid=id('WB'),rows=checked.rows.map(r=>{const rid=id('WBR');return {...r,id:rid,status:'pending',reservedUnits:r.totalUnits,settledUnits:0,updatedAt:date};});
          const b={id:bid,customerId:h.cid(),walletId:w.id,network:w.network,requestId:input.requestId,requestSignature:signature,status:'pending',date,updatedAt:date,actor:actor(),rows,...totals(rows)};
          w.availableUnits-=b.totalUnits;w.frozenUnits=(w.frozenUnits??0)+b.totalUnits;
          const ledger=rows.map(r=>({id:r.id,customerId:h.cid(),walletId:w.id,kind:'withdraw',asset:'USDT',network:w.network,amountUnits:r.amountUnits,feeUnits:r.feeUnits,totalUnits:r.totalUnits,status:r.status,reservedUnits:r.reservedUnits,settledUnits:0,address:r.address,memo:r.memo,reference:'DEMO-'+crypto.randomUUID().replace(/-/g,'').slice(0,20).toUpperCase(),requestId:r.id,requestSignature:JSON.stringify([bid,r.id,r.amountUnits,r.address]),batchId:bid,batchRowId:r.id,date,updatedAt:date,actor:actor()}));
          h.pack().ledger.unshift(...ledger);h.pack().selectedId=w.id;data().batches.unshift(b);h.render();return {ok:true,batch:clone(b)};
        },
        get:bid=>scope()?clone(data().batches.find(b=>b.id===bid)||null):null,
        records:wid=>scope()?clone(data().batches.filter(b=>!wid||b.walletId===wid)):[],
        transitionRows(bid,rowIds,status){
          const error=gate();if(error)return fail(error);const b=data().batches.find(b=>b.id===bid);if(!b)return fail('NOT_FOUND');
          if(!['completed','failed','cancelled'].includes(status))return fail('INVALID_STATUS');if(!Array.isArray(rowIds)||!rowIds.length||new Set(rowIds).size!==rowIds.length)return fail('INVALID_ROWS');
          const rows=rowIds.map(rid=>b.rows.find(r=>r.id===rid));if(rows.some(r=>!r))return fail('NOT_FOUND');if(rows.some(r=>r.status!=='pending'))return fail('FINAL');
          const w=cryptoWallet(b.walletId),reserved=rows.reduce((n,r)=>n+r.totalUnits,0),refund=status==='completed'?0:reserved;if(!w||w.frozenUnits===null||w.frozenUnits<reserved||w.availableUnits===null)return fail('BALANCE_UNKNOWN');if(w.availableUnits+refund>MAX)return fail('BALANCE_LIMIT');
          const links=rows.map(r=>h.pack().ledger.find(l=>l.id===r.id));if(links.some((l,i)=>!l||l.status!=='pending'||l.reservedUnits!==rows[i].totalUnits))return fail('NOT_FOUND');
          const date=now();w.frozenUnits-=reserved;w.availableUnits+=refund;
          for(const r of rows){r.status=status;r.reservedUnits=0;r.settledUnits=status==='completed'?r.totalUnits:0;r.updatedAt=date;const linked=h.pack().ledger.find(l=>l.id===r.id);Object.assign(linked,{status,reservedUnits:0,settledUnits:r.settledUnits,updatedAt:date});}
          Object.assign(b,totals(b.rows),{status:batchStatus(b.rows),updatedAt:date});h.render();return {ok:true,batch:clone(b)};
        }
      }
    };
    return A;
  }
  window.AzureWalletOperations={state,validateState:validState,create,exchangeAmounts};
})();
