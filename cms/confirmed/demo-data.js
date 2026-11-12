/* Deterministic fictional fixtures, scoped by customer. Never loads customer documents. */
(() => {
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value)),SCALE=1000000,day=TODAY,time=day+'T06:00:00.000Z';
  const countries=[['中国','CNY','Shenzhen','China Merchants Bank','CMBCCNBS'],['中国香港','HKD','Hong Kong','HSBC Hong Kong','HSBCHKHHHKH'],['新加坡','SGD','Singapore','DBS Bank','DBSSSGSG'],['美国','USD','New York','JPMorgan Chase','CHASUS33'],['英国','GBP','London','Barclays Bank','BARCGB22'],['日本','JPY','Tokyo','MUFG Bank','BOTKJPJT'],['德国','EUR','Frankfurt','Deutsche Bank','DEUTDEFF']];
  Object.assign(FXR,{SGD:5.75,JPY:.052});
  const stores=new Map(),primary=Object.fromEntries(['CPS','WITHDRAW_ACCTS','FROZEN','HELD_RETURNS','BATCHES','VA_INFO','FX_ORDERS'].map(key=>[key,clone(window[key])]));
  for(const [index,c]of CUSTOMERS.entries()){
    const n=index+1;c.email||=n===1?'finance@starocean.example':`finance@company${n}.example`;c.contact||=n===1?'李小姐':`示範聯絡人 ${n}`;
    BALANCES[c.id]||={};
    for(const [j,ccy]of ['HKD','USD','CNH','EUR','CNY','SGD','GBP','JPY'].entries()){
      BALANCES[c.id][ccy]||={a:Math.round((ccy==='JPY'?12000000:ccy==='HKD'?3500000:650000)+n*14327+j*981.25),f:0};
      if(!ACCOUNTS.some(a=>a.cust===c.id&&a.ccy===ccy))ACCOUNTS.push({cust:c.id,nick:`${ccy} 收款账户`,region:'中国香港',bg:c.bg,ccy,bank:'渣打银行（香港）',no:`368 ${String(960+n).padStart(3,'0')} ${String(51000+n*100+j)}`,status:'正常',ap:'AP1',...(ccy==='CNY'?{xb:true}:{})});
    }
    USERS[c.id]||=[{email:c.email,name:c.contact,role:'管理员',status:'启用',last:day+' 09:20'},{email:`payments@company${n}.example`,name:'付款操作員',role:'操作员',status:'启用',last:day+' 10:10'},{email:`reviewer@company${n}.example`,name:'財務覆核員',role:'复核员',status:'启用',last:day+' 10:30'}];
    const cp=countries.map(([country,ccy,city,bank,swift],j)=>({id:`DCP-${c.id}-${j+1}`,customerId:c.id,dir:'收款方',type:'企业',name:`Demo ${city} Supplier ${n} Ltd`,country,city,addr:`${20+n} Sample Business Road, ${city}`,regNo:`DEMO-REG-${n}-${j+1}`,biz:j===0?['全球付款','跨境付汇']:['全球付款'],status:'正常',updated:day,proof:'demo-commercial-agreement.pdf',accts:[{bank,acct:`DEMO-${n}${j} **** ${String(1000+n*10+j)}`,ccy,swift,nature:'对公',onboard:'已进件'}]}));
    cp.push({id:`DPY-${c.id}`,customerId:c.id,dir:'来款方',type:'企业',name:`Demo Overseas Buyer ${n} Ltd`,country:'美国',city:'New York',addr:'100 Sample Avenue',regNo:`DEMO-BUYER-${n}`,biz:['全球收款'],status:'正常',updated:day,proof:'demo-sales-contract.pdf',accts:[{bank:'JPMorgan Chase',acct:`DEMO-${n} **** 9001`,ccy:'USD',swift:'CHASUS33',nature:'对公',onboard:'无需进件'}]});
    const extras=n===1?clone(primary):{CPS:[],WITHDRAW_ACCTS:[{id:`WA-${c.id}`,bank:'HSBC Hong Kong',name:c.en,acct:`DEMO-${n} **** ${String(800+n)}`,ccy:'HKD',swift:'HSBCHKHHHKH',region:'中国香港',status:'正常',added:c.opened}],FROZEN:[],HELD_RETURNS:[],BATCHES:[{id:`BT-${c.id}-01`,customerId:c.id,type:'批量付款',created:day+' 10:22',file:'demo-supplier-payments.csv',total:3,ok:3,fail:0,ing:0,amt:'USD 6,000.00',status:'处理成功'}],VA_INFO:{...clone(primary.VA_INFO),subId:`DEMO-${c.id}`,opened:Object.fromEntries(Object.keys(BALANCES[c.id]).map(ccy=>[ccy,c.opened]))}};
    extras.CPS.push(...cp);extras.users=clone(USERS[c.id]);extras.DOC_REQS=clone(DOC_REQS.filter(r=>r.tt==='c'&&r.target===c.id));
    for(const [j,type]of ['入账','付款','换汇','月费'].entries())if(!TXS.some(t=>t.cust===c.id&&t.type===type&&t.date.startsWith('2026-10'))){
      TXS.push({id:`DM-${c.id}-${j}`,date:'2026-10-'+String(8+j).padStart(2,'0'),time:`2026-10-${String(8+j).padStart(2,'0')} 10:20:00`,cust:c.id,type,prod:['COLLECT_G','PAYOUT_INTL','FX','VA_MONTHLY'][j]==='COLLECT_G'&&c.bg==='服务贸易'?'COLLECT_S':['COLLECT_G','PAYOUT_INTL','FX','VA_MONTHLY'][j],ccy:j===3?'HKD':'USD',amt:[12000+n*100,2500+n*50,1000+n*10,0][j],...(j===2?{buy:'HKD'}:{}),cp:j===0?`Demo Overseas Buyer ${n} Ltd`:j===1?cp[3].name:j===2?'USD → HKD':'VA 月管理费',status:'成功',ch:'ALLINPAY_HK'});
    }
    extras.FX_ORDERS=TXS.filter(t=>t.cust===c.id&&t.type==='换汇').map((t,j)=>{const existing=c.id==='AZ100001'?FX_ORDERS.find(o=>o.tx===t.id):null;if(existing)return clone(existing);const buy=t.buy||'HKD',rate=FXR[t.ccy]/FXR[buy]*(1-CUST_PRICE[c.id].FX/10000);return{id:`FXDM-${c.id}-${j+1}`,tx:t.id,time:t.time||t.date+' 10:30:00',sell:t.ccy,sellAmt:t.amt,buy,buyAmt:Math.round(t.amt*rate*100)/100,rate,remark:'Demo supplier settlement',status:t.status==='成功'?'已交割':'处理中'};});
    extras.FX_ORDERS.push(...(n===1?primary.FX_ORDERS.filter(o=>o.status==='已取消'):[{id:`FXDM-${c.id}-CANCELLED`,tx:'—',time:'2026-10-06 10:00:00',sell:'USD',sellAmt:1200,buy:'HKD',buyAmt:9307.99,rate:7.75666,remark:'Cancelled supplier payment',status:'已取消'}]));
    // Build explicit, fictional historical settlements once. Reading a statement
    // must never manufacture transactions or mutate a customer's closing balance.
    const cur=Object.fromEntries(Object.entries(BALANCES[c.id]).map(([ccy,b])=>[ccy,b.a+b.f])),mins={...cur};
    const reverse=(ccy,delta)=>{cur[ccy]??=0;cur[ccy]-=delta;mins[ccy]=Math.min(mins[ccy]??0,cur[ccy]);};
    TXS.filter(t=>t.cust===c.id&&['成功','处理中'].includes(t.status)).sort((a,b)=>txTime(b).localeCompare(txTime(a))).forEach(t=>{
      const fee=split(t).actual;
      if(t.type==='入账'){reverse(t.ccy,-fee/FXR[t.ccy]);reverse(t.ccy,t.amt);}
      else if(['付款','提现'].includes(t.type)){reverse('HKD',-fee);reverse(t.ccy,-t.amt);}
      else if(t.type==='换汇'){const order=extras.FX_ORDERS.find(o=>o.tx===t.id);reverse(order?.buy||'HKD',order?.buyAmt||t.amt*7.7567);reverse(t.ccy,-t.amt);}
      else if(fee)reverse('HKD',-fee);
    });
    for(const [ccy,minimum]of Object.entries(mins))if(minimum<0)TXS.push({id:`DM-SETTLE-${c.id}-${ccy}`,date:day,time:day+' 23:55:00',cust:c.id,type:'提现',prod:'PAYOUT_HK',ccy,amt:Math.ceil((-minimum+30000)/1000)*1000,cp:c.en+' (Demo treasury settlement)',status:'成功',ch:'ALLINPAY_HK',memo:'Fictional period-end own-account settlement'});
    stores.set(c.id,extras);
  }
  CPS.splice(0,CPS.length,...clone(stores.get('AZ100001').CPS));
  FX_ORDERS.splice(0,FX_ORDERS.length,...clone(stores.get('AZ100001').FX_ORDERS));
  TXS.sort((a,b)=>(b.time||b.date).localeCompare(a.time||a.date));
  function wallet(cid){
    if(!stores.has(cid))return null;
    const n=CUSTOMERS.findIndex(c=>c.id===cid)+1,actor={role:'cust',email:cust(cid).email,customerId:cid},tron=`usdt-${cid}-tron`,eth=`usdt-${cid}-ethereum`,opening=(15000+n*100)*SCALE;
    const crypto=[{id:tron,customerId:cid,name:'USDT · TRON (TRC20)',asset:'USDT',network:'tron',availableUnits:opening+998*SCALE-32*SCALE,frozenUnits:21*SCALE,basis:'demo'},{id:eth,customerId:cid,name:'USDT · Ethereum (ERC20)',asset:'USDT',network:'ethereum',availableUnits:(5000+n*50)*SCALE,frozenUnits:0,basis:'demo'}];
    const ledger=crypto.map((w,i)=>({id:`WDM-${cid}-OPEN-${i}`,customerId:cid,walletId:w.id,kind:'credit',asset:'USDT',network:w.network,amountUnits:i?(5000+n*50)*SCALE:opening,date:time,actor:clone(actor),memo:'Demo opening balance'}));
    const exchangeId=`EXDM-${cid}`,ledgerId=`WDM-${cid}-FX`,math={amountUnits:100000,feeUnits:200,netUnits:99800,receiveUnits:998*SCALE,fromDecimals:2,toDecimals:6};
    const exchange={id:exchangeId,customerId:cid,quoteId:`QDM-${cid}`,requestId:`REQ-FX-${cid}`,fromWalletId:`fiat-${cid}-USD`,toWalletId:tron,fromCurrency:'USD',toCurrency:'USDT',fromName:'USD',toName:'USDT · TRON',amount:'1000.00',fee:'2.00',feeCurrency:'USD',netAmount:'998.00',receiveAmount:'998.000000',rateText:'1.00000000',status:'completed',date:time,actor:clone(actor),ledgerId,...math};
    ledger.push({id:ledgerId,customerId:cid,walletId:tron,kind:'exchange-in',asset:'USDT',network:'tron',amountUnits:998*SCALE,feeUnits:0,totalUnits:998*SCALE,reservedUnits:0,settledUnits:998*SCALE,status:'completed',exchangeId,fromWalletId:exchange.fromWalletId,toWalletId:tron,date:time,actor:clone(actor)});
    const batchId=`WBDM-${cid}`,rows=[10,20].map((amount,i)=>({id:`WBRDM-${cid}-${i}`,name:`Demo Supplier ${i+1}`,address:`DEMO-TRC20-${cid}-SUPPLIER0${i+1}`,amount:amount+'.000000',network:'tron',memo:'Demo invoice',amountUnits:amount*SCALE,feeUnits:SCALE,totalUnits:(amount+1)*SCALE,reservedUnits:i?(amount+1)*SCALE:0,settledUnits:i?0:(amount+1)*SCALE,status:i?'pending':'completed',updatedAt:time}));
    rows.forEach((r,i)=>ledger.push({...clone(r),customerId:cid,walletId:tron,kind:'withdraw',asset:'USDT',date:time,actor:clone(actor),batchId,batchRowId:r.id,reference:'DEMO-'+String(n*10+i).padStart(20,'0'),requestId:`REQ-BATCH-${cid}-${i}`,requestSignature:`DEMO-BATCH-${cid}-${i}`}));
    const batch={id:batchId,customerId:cid,walletId:tron,network:'tron',requestId:`REQ-BATCH-${cid}`,date:time,updatedAt:time,status:'partial',rows,requestSignature:JSON.stringify([tron,'tron',rows.map(r=>[r.name,r.address,r.amount,r.memo,r.network])]),amountUnits:30*SCALE,feeUnits:2*SCALE,totalUnits:32*SCALE,reservedUnits:21*SCALE,settledUnits:11*SCALE,actor:clone(actor)};
    return {customerId:cid,selectedId:'',crypto,ledger,operations:{version:1,addresses:['tron','ethereum'].map((network,i)=>({id:`ADDM-${cid}-${i}`,customerId:cid,label:i?'Demo Ethereum treasury':'Demo TRON supplier',network,address:`DEMO-${i?'ERC20':'TRC20'}-${cid}-DESTINATION01`,note:'Fictional Demo destination',enabled:true,createdAt:time,updatedAt:time})),exchanges:[exchange],batches:[batch]}};
  }
  window.AzureDemoData={ready:true,customer:id=>stores.has(id)?clone(stores.get(id)):null,wallet,countries:clone(countries)};
})();
