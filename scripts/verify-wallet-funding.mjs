import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base=new URL(process.env.DEMO_URL||'http://127.0.0.1:3193/');
const output='.design-build/review-20261111';
const reportFile=process.env.QA_REPORT||output+'/qa-wallet-funding.json';
await fs.mkdir(output,{recursive:true});await fs.mkdir(path.dirname(reportFile),{recursive:true});
const report={base:base.href,checks:[],failures:[],errors:[],unexpectedExternalRequests:[]};
const check=(label,passed,detail)=>{const item={label,passed:!!passed,...(detail===undefined?{}:{detail})};report.checks.push(item);if(!passed)report.failures.push(label);};
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
async function context(){
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 context.on('page',page=>page.on('pageerror',error=>report.errors.push(error.message)));
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===base.origin||['blob:','data:'].includes(url.protocol))return route.continue();
  if(url.origin==='https://api.coinbase.com'&&url.pathname==='/v2/exchange-rates')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({data:{currency:'USD',rates:{USD:'1',HKD:'7.8',EUR:'0.9',SGD:'1.3',CNY:'7.1',USDT:'1.002'}}})});
  report.unexpectedExternalRequests.push({url:url.origin+url.pathname,method:route.request().method()});return route.abort();
 });
 return context;
}
async function ready(frame,role){await frame.waitForFunction(role=>document.readyState==='complete'&&window.AzureFiles&&window.AzureWizard&&window.AzureWallets?.funding&&window.AzureBridge?.account?.role===role,role);await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));}
async function login(ctx,role){const page=await ctx.newPage();await page.goto(base.href);await page.locator('#email').fill(role==='hq'?'stephen@ourbank.example':'finance@starocean.example');await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();await page.locator('.cms-confirmed-frame').waitFor();const frame=await(await page.locator('.cms-confirmed-frame').elementHandle()).contentFrame();await ready(frame,role);return{page,frame};}
async function childFor(parent,id){await parent.waitForFunction(id=>{const w=document.querySelector('.admin-customer-frame')?.contentWindow;return w?.AzureAdminChild?.customerId===id&&w.AzureWallets?.funding;},id);const frame=await(await parent.locator('.admin-customer-frame').elementHandle()).contentFrame();await ready(frame,'cust');return frame;}
function collect(items){for(const item of items)check(item.label,item.passed,item.detail);}
try{
 const ctx=await context(),{page,frame}=await login(ctx,'cust');await frame.evaluate(()=>go('cust','wallets'));await frame.locator('#wallet-select').waitFor();
 const core=await frame.evaluate(()=>{
  const out=[],test=(label,passed,detail)=>out.push({label,passed:!!passed,...(detail===undefined?{}:{detail})});
  const A=AzureWallets,F=A.funding,config=F.config(),initial=JSON.stringify({BALANCES,TXS,FXR}),MAX=1000000000000000;
  const tron=A.list().find(w=>w.kind==='crypto'&&w.network==='tron'),eth=A.list().find(w=>w.kind==='crypto'&&w.network==='ethereum'),fiat=A.list().find(w=>w.kind==='fiat');
  const wallet=id=>A.snapshot().crypto.find(w=>w.id===id),state=id=>JSON.stringify(wallet(id)),fresh=()=>crypto.randomUUID();
  const dep=(w,amount,extra={})=>({walletId:w.id,network:w.network,amount,requestId:fresh(),...extra});
  const wd=(w,amount,extra={})=>({...dep(w,amount),address:w.network==='tron'?'DEMO-TRC20-DESTINATION01':'DEMO-ERC20-DESTINATION01',networkConfirmed:true,otp:config.demoCode,...extra});
  test('Funding configuration uses integer micro-units and explicit network fees',config.scale===1000000&&config.demoCode==='654321'&&config.feeUnits.tron===1000000&&config.feeUnits.ethereum===3000000);
  test('New USDT wallets keep unknown balances before a completed deposit',wallet(tron.id).availableUnits===null&&wallet(tron.id).frozenUnits===null&&wallet(eth.id).availableUnits===null);
  const ta=F.address(tron.id),ea=F.address(eth.id);
  test('Receive addresses are stable nonpayable Demo markers',ta.ok&&ea.ok&&/^DEMO-TRC20-/.test(ta.address)&&/^DEMO-ERC20-/.test(ea.address)&&ta.address!==ea.address&&F.address(tron.id).address===ta.address);
  test('Deposit QR payloads use only the nonpayable azure-demo protocol',[ta,ea].every(a=>a.qrPayload.startsWith('azure-demo://')&&new URL(a.qrPayload).searchParams.get('address')===a.address));
  test('Fiat and foreign wallet IDs cannot obtain crypto receive details',!F.address(fiat.id).ok&&!F.address('usdt-AZ100002-tron').ok);
  const unknown=state(tron.id),unfunded=F.createWithdrawal(wd(tron,'1'));
  test('Unknown balances cannot be withdrawn or silently initialized to zero',!unfunded.ok&&state(tron.id)===unknown);
  for(const bad of ['',null,true,false,[],[1],{},'0','-1','1e3','1,000','0.0000001','1.1234567','Infinity','NaN','1000000000.000001']){
   const before=state(tron.id),count=F.records().length,r=F.createDeposit(dep(tron,bad));
   test('Reject invalid deposit amount '+JSON.stringify(bad),!r.ok&&state(tron.id)===before&&F.records().length===count,r.ok?{unexpectedRecord:r.record?.id}:undefined);
  }
  for(const extra of [{network:'ethereum'},{walletId:fiat.id},{walletId:'usdt-AZ100002-tron'},{requestId:''},{requestId:'bad id'},{memo:'<invalid>'},{memo:'line\nfeed'},{memo:'x'.repeat(141)}]){
   const before=state(tron.id),count=F.records().length,r=F.createDeposit(dep(tron,'1',extra));
   test('Reject invalid deposit metadata '+Object.keys(extra).join(','),!r.ok&&state(tron.id)===before&&F.records().length===count);
  }
  const dp=dep(tron,'12.345678',{memo:'QA precise deposit'}),pending=F.createDeposit(dp);
  test('Deposit records preserve exact principal and a separate zero fee',pending.ok&&pending.record.kind==='deposit'&&pending.record.amountUnits===12345678&&pending.record.feeUnits===0&&pending.record.totalUnits===12345678&&pending.record.status==='pending');
  test('A pending deposit does not change an unknown balance',state(tron.id)===unknown);
  const depositCount=F.records().length,repeated=F.createDeposit(dp),conflict=F.createDeposit({...dp,amount:'13'});
  test('Duplicate deposit submission is idempotent',repeated.ok&&repeated.record.id===pending.record.id&&F.records().length===depositCount&&state(tron.id)===unknown);
  test('Reusing a request ID with different parameters is rejected',!conflict.ok&&F.records().length===depositCount);
  const completed=F.transition(pending.record.id,'completed');
  test('Completing a deposit credits exact units once',completed.ok&&wallet(tron.id).availableUnits===12345678&&wallet(tron.id).frozenUnits===0&&F.get(pending.record.id).settledUnits===12345678);
  const completedState=state(tron.id);F.transition(pending.record.id,'completed');F.transition(pending.record.id,'failed');F.transition(pending.record.id,'cancelled');
  test('A terminal deposit cannot be credited twice or changed to another terminal state',state(tron.id)===completedState&&F.get(pending.record.id).status==='completed');
  for(const terminal of ['failed','cancelled']){const before=state(eth.id),r=F.createDeposit(dep(eth,'1'));const end=F.transition(r.record.id,terminal);test('A '+terminal+' deposit preserves an unknown balance',end.ok&&state(eth.id)===before&&F.get(r.record.id).settledUnits===0);}
  const quote=F.quote({walletId:tron.id,network:'tron',amount:'2.123456'});
  test('Withdrawal quote separates exact principal, fee, total, and fee-aware maximum',quote.ok&&quote.amountUnits===2123456&&quote.feeUnits===1000000&&quote.totalUnits===3123456&&quote.availableUnits===12345678&&quote.maxUnits===11345678);
  for(const extra of [{network:'ethereum'},{address:''},{address:'not-an-address'},{address:'DEMO-ERC20-DESTINATION01'},{networkConfirmed:false},{networkConfirmed:'true'},{otp:''},{otp:'000000'},{otp:654321}]){
   const before=state(tron.id),count=F.records().length,r=F.createWithdrawal(wd(tron,'1',extra));
   test('Reject invalid withdrawal '+Object.keys(extra).join(','),!r.ok&&state(tron.id)===before&&F.records().length===count);
  }
  const wp=wd(tron,'2.123456'),withdrawal=F.createWithdrawal(wp),reserved=wallet(tron.id);
  test('A pending withdrawal reserves principal plus fee exactly once',withdrawal.ok&&withdrawal.record.amountUnits===2123456&&withdrawal.record.feeUnits===1000000&&withdrawal.record.totalUnits===3123456&&withdrawal.record.reservedUnits===3123456&&reserved.availableUnits===9222222&&reserved.frozenUnits===3123456);
  const reservedState=state(tron.id),withdrawalCount=F.records().length,again=F.createWithdrawal(wp);
  test('Duplicate withdrawal submission does not reserve twice',again.ok&&again.record.id===withdrawal.record.id&&state(tron.id)===reservedState&&F.records().length===withdrawalCount);
  const settled=F.transition(withdrawal.record.id,'completed');
  test('Completed withdrawal removes only the reserve and records the settled total',settled.ok&&wallet(tron.id).availableUnits===9222222&&wallet(tron.id).frozenUnits===0&&F.get(withdrawal.record.id).settledUnits===3123456&&F.get(withdrawal.record.id).reservedUnits===0);
  const settledState=state(tron.id);for(const status of ['completed','failed','cancelled'])F.transition(withdrawal.record.id,status);
  test('A terminal withdrawal cannot be settled twice or refunded later',state(tron.id)===settledState&&F.get(withdrawal.record.id).status==='completed');
  for(const terminal of ['failed','cancelled']){const before=state(tron.id),r=F.createWithdrawal(wd(tron,'1.000001'));F.transition(r.record.id,terminal);const end=F.get(r.record.id);test('A '+terminal+' withdrawal refunds principal plus fee exactly once',state(tron.id)===before&&end.status===terminal&&end.settledUnits===0&&end.reservedUnits===0);F.transition(r.record.id,terminal);test('Repeating '+terminal+' cannot refund twice',state(tron.id)===before);}
  const max=F.quote({walletId:tron.id,network:'tron',amount:'1'}).maxUnits,maxAmount=(max/1000000).toFixed(6),maxWithdrawal=F.createWithdrawal(wd(tron,maxAmount));
  test('The fee-aware maximum can reserve the entire available balance',maxWithdrawal.ok&&wallet(tron.id).availableUnits===0&&wallet(tron.id).frozenUnits===9222222);F.transition(maxWithdrawal.record.id,'cancelled');
  const countBeforeBadStatus=F.records().length,badState=state(tron.id);F.transition('missing-record','completed');F.transition(pending.record.id,'pending');
  test('Invalid record IDs and target statuses do not change balances or records',state(tron.id)===badState&&F.records().length===countBeforeBadStatus);
  const freezeRecord=F.createDeposit(dep(tron,'1')),c=cust(CID()),oldStatus=c.status,oldFreeze=c.frz,freezeState=state(tron.id),freezeCount=F.records().length;c.status='冻结';
  const blocked=[F.createDeposit(dep(tron,'1')),F.createWithdrawal(wd(tron,'1')),F.transition(freezeRecord.record.id,'completed')];
  test('A frozen customer cannot create or settle funding instructions',blocked.every(r=>!r.ok)&&state(tron.id)===freezeState&&F.records().length===freezeCount&&F.get(freezeRecord.record.id).status==='pending');c.status=oldStatus;if(oldFreeze===undefined)delete c.frz;else c.frz=oldFreeze;F.transition(freezeRecord.record.id,'cancelled');
  const large=F.createDeposit(dep(eth,'1000000000'));test('The supported maximum deposit remains an exact safe integer',large.ok&&large.record.amountUnits===MAX);F.transition(large.record.id,'completed');
  const largeWithdrawal=F.createWithdrawal(wd(eth,'1')),capacityState=state(eth.id),over=F.createDeposit(dep(eth,'0.000001'));
  test('Pending withdrawal reserves do not open artificial capacity for new deposits',largeWithdrawal.ok&&!over.ok&&state(eth.id)===capacityState&&wallet(eth.id).availableUnits+wallet(eth.id).frozenUnits===MAX);
  F.transition(largeWithdrawal.record.id,'cancelled');test('A full-capacity wallet can still refund its pending withdrawal safely',wallet(eth.id).availableUnits===MAX&&wallet(eth.id).frozenUnits===0);
  const immutable=F.get(pending.record.id);immutable.status='failed';test('Funding getters return copies rather than editable internal records',F.get(pending.record.id).status==='completed');
  test('All funding operations leave bank balances, bank transactions, and Demo FX rates unchanged',JSON.stringify({BALANCES,TXS,FXR})===initial);
  return out;
 });collect(core);await page.close();await ctx.close();

 const adminContext=await context(),{page:adminPage,frame:admin}=await login(adminContext,'hq');
 check('HQ cannot directly create a customer funding instruction',(await admin.evaluate(()=>AzureWallets.funding.createDeposit({walletId:'usdt-AZ100001-tron',network:'tron',amount:'1',requestId:crypto.randomUUID()}))).ok===false);
 await admin.evaluate(()=>adminOpenCustomer('AZ100001','wallets'));let child=await childFor(admin,'AZ100001');
 const owned=await child.evaluate(()=>{const w=AzureWallets.list().find(w=>w.kind==='crypto'&&w.network==='tron');const r=AzureWallets.funding.createDeposit({walletId:w.id,network:w.network,amount:'5.000001',requestId:crypto.randomUUID()});return{walletId:w.id,record:r.record};});
 check('HQ delegated funding captures the administrator and selected customer',owned.record?.actor?.role==='hq'&&owned.record?.actor?.customerId==='AZ100001');
 await admin.locator('#admin-customer-select').selectOption('AZ100002');child=await childFor(admin,'AZ100002');
 const other=await child.evaluate(({walletId,record})=>{const F=AzureWallets.funding,w=AzureWallets.list().find(w=>w.kind==='crypto'&&w.network==='tron');const count=F.records().length,hidden=F.get(record.id),foreign=F.createDeposit({walletId,network:'tron',amount:'1',requestId:crypto.randomUUID()}),r=F.createDeposit({walletId:w.id,network:w.network,amount:'2',requestId:crypto.randomUUID()});F.transition(r.record.id,'completed');return{count,hidden,foreign,record:r.record,units:AzureWallets.snapshot().crypto.find(x=>x.id===w.id).availableUnits,bank:BALANCES[CID()]};},owned);
 check('Switching HQ customers hides the previous customer funding records',other.count===0&&other.hidden===null&&!other.foreign.ok);check('A second customer can complete its own deposit without inventing a bank balance',other.record.customerId==='AZ100002'&&other.units===2000000&&other.bank===undefined);
 await admin.locator('#admin-customer-select').selectOption('AZ100001');child=await childFor(admin,'AZ100001');const restored=await child.evaluate(id=>({record:AzureWallets.funding.get(id),records:AzureWallets.funding.records(),units:AzureWallets.snapshot().crypto.find(w=>w.network==='tron').availableUnits}),owned.record.id);
 check('HQ switching back preserves the first customer pending deposit',restored.record?.status==='pending'&&restored.units===null&&restored.records.every(r=>r.customerId==='AZ100001'));
 const finalized=await child.evaluate(id=>{AzureWallets.funding.transition(id,'completed');return AzureWallets.snapshot().crypto.find(w=>w.network==='tron').availableUnits;},owned.record.id);check('Restored customer deposit settles once in the correct wallet',finalized===5000001);
 check('HQ parent identity remains unchanged through funding operations',await admin.evaluate(()=>AzureBridge.account.role)==='hq');await adminPage.close();await adminContext.close();

 // Complement verify-wallet-funding-ui.mjs with financial invariants and HQ scope isolation.
 check('Funding makes no external custody, chain, or payment requests',report.unexpectedExternalRequests.length===0,report.unexpectedExternalRequests);
}catch(error){report.errors.push(error.stack||error.message);}
finally{await browser.close();await fs.writeFile(reportFile,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));process.exitCode=report.failures.length||report.errors.length?1:0;
