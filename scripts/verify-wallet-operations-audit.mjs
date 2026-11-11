/* Independent model + staged integration audit. Synthetic local Demo data only. */
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {chromium} from 'playwright';
const base=process.env.DEMO_URL||'http://127.0.0.1:3264/',out=process.env.QA_OUTPUT||'.design-build/wallet-operations-audit',reportFile=process.env.QA_REPORT||path.join(out,'qa-wallet-operations-audit.json');
const report={base,modelChecks:[],browserChecks:[],errors:[],externalRequests:[]},SCALE=1000000;
const check=(where,label,passed,detail)=>report[where+'Checks'].push({label,passed:!!passed,...(detail===undefined?{}:{detail})});
await fs.mkdir(out,{recursive:true});await fs.mkdir(path.dirname(reportFile),{recursive:true});
let clock=Date.parse('2026-11-11T08:00:00Z');class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
const context=vm.createContext({window:{},Date:Clock,crypto:webcrypto});vm.runInContext(await fs.readFile(new URL('../cms/confirmed/wallet-operations.js',import.meta.url),'utf8'),context);const Factory=context.window.AzureWalletOperations;
const validAddress=(network,address)=>typeof address==='string'&&(network==='tron'?/^DEMO-TRC20-[A-Z0-9-]{8,80}$/.test(address):/^(?:DEMO-ERC20-[A-Z0-9-]{8,80}|0x[0-9a-fA-F]{40})$/.test(address));
const copy=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const cid='SYNTHETIC-A',bank={USD:{a:1000000,f:12.34},HKD:{a:1000000,f:45.67}},pack={customerId:cid,crypto:[{id:'synth-tron',customerId:cid,asset:'USDT',network:'tron',kind:'crypto',name:'Tron',availableUnits:1000*SCALE,frozenUnits:0,basis:'demo'}],ledger:[],operations:Factory.state()};
 const list=()=>[...Object.keys(bank).map(asset=>({id:`fiat-${cid}-${asset}`,customerId:cid,asset,kind:'fiat',name:asset})),...pack.crypto];
 const O=Factory.create({pack:()=>pack,ownId:()=>cid,cid:()=>cid,frozen:()=>false,bank:()=>bank,list,cryptoWallet:id=>pack.crypto.find(w=>w.id===id),actor:()=>({customerId:cid,role:'cust'}),render:()=>{},validAddress});
 return{cid,bank,pack,O,snapshot:()=>JSON.stringify({bank,pack})};
}
const transfer=(O,requestId='audit-exchange-0001')=>{const q=O.exchange.quote({fromWalletId:'fiat-SYNTHETIC-A-USD',toWalletId:'synth-tron',amount:'100.00',requestId});return q.ok?O.exchange.execute({quoteId:q.quote.quoteId,requestId,otp:'654321'}):q;};
try{
 const boundary=Factory.exchangeAmounts('USDT','HKD','0.001286');check('model','Rounding boundary retains one fiat cent only after exact integer fee and conversion',boundary?.feeUnits===3&&boundary.netUnits===1283&&boundary.receiveUnits===1);
 check('model','One micro-unit below the fiat rounding boundary is rejected as zero destination value',Factory.exchangeAmounts('USDT','HKD','0.001285')===null);
 const maximum=Factory.exchangeAmounts('HKD','USDT','1000000000.00');check('model','Maximum-sized source conversion preserves its six-decimal result without unsafe floating arithmetic',maximum?.receiveUnits===127948717948717&&maximum.feeUnits===200000000);
 const f=fixture(),q=f.O.exchange.quote({fromWalletId:'fiat-SYNTHETIC-A-USD',toWalletId:'synth-tron',amount:'100',requestId:'audit-clone-quote-0001'}),quoteId=q.quote.quoteId;
 q.quote.receiveUnits=999999999999;q.quote.amountUnits=1;const trade=f.O.exchange.execute({quoteId,requestId:'audit-clone-quote-0001',otp:'654321'});
 check('model','Changing a returned quote object cannot change the committed locked amounts',trade.ok&&trade.record.receiveUnits===99800000&&trade.record.amountUnits===10000&&f.bank.USD.a===999900);
 trade.record.receiveUnits=1;check('model','Changing a returned execution result cannot alter stored history',f.O.exchange.get(trade.record.id).receiveUnits===99800000);
 const expires=f.O.exchange.quote({fromWalletId:'synth-tron',toWalletId:'fiat-SYNTHETIC-A-HKD',amount:'1',requestId:'audit-expiry-exact-0001'});clock=expires.quote.expiresAt;const expiredBefore=f.snapshot();
 check('model','Quote execution rejects at the exact expiry boundary with no state mutation',f.O.exchange.execute({quoteId:expires.quote.quoteId,requestId:'audit-expiry-exact-0001',otp:'654321'}).error==='EXPIRED'&&f.snapshot()===expiredBefore);
 const b=fixture(),batch=b.O.batch.submit({walletId:'synth-tron',network:'tron',requestId:'audit-batch-atomic-0001',otp:'654321',networkConfirmed:true,rows:[{name:'A',address:'DEMO-TRC20-AUDITDEST01',amount:'100.000001',network:'tron',memo:''},{name:'B',address:'DEMO-TRC20-AUDITDEST02',amount:'7.999999',network:'tron',memo:''}]}),ids=batch.batch.rows.map(r=>r.id);
 check('model','Batch reserves aggregate principal plus every row fee exactly',batch.ok&&b.pack.crypto[0].availableUnits===890000000&&b.pack.crypto[0].frozenUnits===110000000);
 const atomicBefore=b.snapshot();check('model','A transition mixing a valid and nonexistent row changes nothing',b.O.batch.transitionRows(batch.batch.id,[ids[0],'missing-row-id'],'failed').error==='NOT_FOUND'&&b.snapshot()===atomicBefore);
 b.O.batch.transitionRows(batch.batch.id,[ids[0]],'completed');const partialBefore=b.snapshot();check('model','A transition mixing terminal and pending rows is rejected atomically',b.O.batch.transitionRows(batch.batch.id,ids,'failed').error==='FINAL'&&b.snapshot()===partialBefore);
 b.O.batch.transitionRows(batch.batch.id,[ids[1]],'cancelled');check('model','Partial cancellation returns only its remaining principal and fee',b.pack.crypto[0].frozenUnits===0&&b.pack.crypto[0].availableUnits===898999999&&b.O.batch.get(batch.batch.id).settledUnits===101000001);
 const funds=fixture(),locked=funds.O.exchange.quote({fromWalletId:'synth-tron',toWalletId:'fiat-SYNTHETIC-A-HKD',amount:'1000',requestId:'audit-concurrent-quote-0001'});
 funds.O.batch.submit({walletId:'synth-tron',network:'tron',requestId:'audit-concurrent-batch-0001',otp:'654321',networkConfirmed:true,rows:[{name:'Reserved',address:'DEMO-TRC20-AUDITRESERVE',amount:'1',network:'tron',memo:''}]});const reservedBefore=funds.snapshot();
 check('model','Executing an older quote rechecks funds reserved by a newer batch',funds.O.exchange.execute({quoteId:locked.quote.quoteId,requestId:'audit-concurrent-quote-0001',otp:'654321'}).error==='INSUFFICIENT_BALANCE'&&funds.snapshot()===reservedBefore);
 for(const collection of ['addresses','exchanges','batches']){const invalid=Factory.state();invalid[collection]=[null];let rejected=false;try{rejected=Factory.validateState(invalid,f.cid,f.pack.crypto,f.pack.ledger,validAddress)===false;}catch{}check('model',`Malformed ${collection} rows return false instead of throwing`,rejected);}
 check('model','A legitimate completed exchange snapshot remains restorable',Factory.validateState(f.pack.operations,f.cid,f.pack.crypto,f.pack.ledger,validAddress));
 const foreign=copy(f.pack.operations);foreign.exchanges[0].fromWalletId='fiat-ANOTHER-CUSTOMER-USD';check('model','Snapshot rejects a foreign fiat wallet leg',!Factory.validateState(foreign,f.cid,f.pack.crypto,f.pack.ledger,validAddress));
 transfer(f.O,'audit-second-exchange-0001');const duplicate=copy(f.pack.operations);duplicate.exchanges[1].requestId=duplicate.exchanges[0].requestId;check('model','Snapshot rejects duplicated exchange request IDs',!Factory.validateState(duplicate,f.cid,f.pack.crypto,f.pack.ledger,validAddress));
 const badBatch=copy(b.pack.operations);badBatch.batches[0].requestSignature='altered';check('model','Snapshot rejects a batch signature that does not match its rows',!Factory.validateState(badBatch,b.cid,b.pack.crypto,b.pack.ledger,validAddress));
 const badNetwork=copy(b.pack.operations);badNetwork.batches[0].rows[0].network='ethereum';check('model','Snapshot rejects a row whose network differs from its batch',!Factory.validateState(badNetwork,b.cid,b.pack.crypto,b.pack.ledger,validAddress));
}catch(error){report.errors.push('model: '+(error.stack||error));}

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'});
async function login(email){const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',error=>report.errors.push('browser: '+error.message));
 await page.route('https://api.coinbase.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({data:{currency:'USD',rates:{USD:'1',HKD:'8',USDT:'1'}}})}));page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin+'/')&&!r.url().startsWith('https://api.coinbase.com/')&&!/^(blob:|data:)/.test(r.url()))report.externalRequests.push(r.url());});
 await page.goto(base);await page.locator('#email').fill(email);await page.locator('#password').fill('AzureDemo!2026');await page.locator('#submit').click();await page.locator('[data-method=email]').click();for(let i=0;i<6;i++)await page.locator('#digit-'+i).fill('381726'[i]);await page.locator('#submit').click();await page.locator('.cms-confirmed-frame').waitFor();const frame=await(await page.locator('.cms-confirmed-frame').elementHandle()).contentFrame();await frame.waitForFunction(()=>window.AzureWallets?.operations&&window.AzureFiles&&window.AzureWalletFunding);return{page,frame};}
try{
 const {page,frame}=await login('finance@starocean.example');await frame.evaluate(()=>go('cust','wallets'));await frame.locator('.wallet-withdraw-btn').waitFor();
 const tests=await frame.evaluate(()=>{
  const checks=[],ok=(label,passed)=>checks.push({label,passed:!!passed}),W=AzureWallets,F=W.funding,O=W.operations,tron=W.list().find(w=>w.kind==='crypto'&&w.network==='tron'),bankBefore=JSON.stringify(BALANCES),txBefore=JSON.stringify(TXS),fxBefore=JSON.stringify(FXR);
  const request=prefix=>prefix+'-'+crypto.randomUUID();const deposit=F.createDeposit({walletId:tron.id,network:'tron',amount:'1000',requestId:request('audit-deposit')});F.transition(deposit.record.id,'completed');
  const single=F.createWithdrawal({walletId:tron.id,network:'tron',amount:'10',address:'DEMO-TRC20-AUDITSINGLE01',memo:'audit',requestId:request('audit-single'),networkConfirmed:true,otp:'654321'});
  const batch=O.batch.submit({walletId:tron.id,network:'tron',requestId:request('audit-batch'),networkConfirmed:true,otp:'654321',rows:[{name:'Batch A',address:'DEMO-TRC20-AUDITBATCH01',network:'tron',amount:'20',memo:''},{name:'Batch B',address:'DEMO-TRC20-AUDITBATCH02',network:'tron',amount:'30',memo:''}]});
  let state=W.snapshot().crypto.find(w=>w.id===tron.id);ok('Standalone and batch withdrawals share one exact reserve',single.ok&&batch.ok&&state.availableUnits===937000000&&state.frozenUnits===63000000);
  const linked=F.transition(batch.batch.rows[0].id,'failed');ok('Legacy funding transition updates the linked batch row',linked.ok&&O.batch.get(batch.batch.id).rows[0].status==='failed');
  O.batch.transitionRows(batch.batch.id,[batch.batch.rows[1].id],'completed');F.transition(single.record.id,'cancelled');state=W.snapshot().crypto.find(w=>w.id===tron.id);ok('Mixed funding and batch outcomes settle/refund only the correct reserves',state.availableUnits===969000000&&state.frozenUnits===0&&O.batch.get(batch.batch.id).settledUnits===31000000);
  const terminal=JSON.stringify(W.snapshot());ok('A batch row completed through operations cannot be refunded again through funding',!F.transition(batch.batch.rows[1].id,'cancelled').ok&&JSON.stringify(W.snapshot())===terminal);
  ok('USDT funding and batch operations do not alter bank balances or legacy FX formulas',JSON.stringify(BALANCES)===bankBefore&&JSON.stringify(TXS)===txBefore&&JSON.stringify(FXR)===fxBefore);
  const cid=CID(),usd=W.list().find(w=>w.kind==='fiat'&&w.asset==='USD'),originalBank=JSON.parse(JSON.stringify(BALANCES)),startUnits=state.availableUnits;
  const q=O.exchange.quote({fromWalletId:tron.id,toWalletId:usd.id,amount:'12.345678',requestId:request('audit-out')});const executed=O.exchange.execute({quoteId:q.quote.quoteId,requestId:q.quote.requestId,otp:'654321'});
  ok('USDT-to-fiat exchange debits exact micro-units and credits rounded cents',executed.ok&&W.snapshot().crypto.find(w=>w.id===tron.id).availableUnits===startUnits-12345678&&Math.round(BALANCES[cid].USD.a*100)===Math.round(originalBank[cid].USD.a*100)+1232);
  const reverse=O.exchange.quote({fromWalletId:usd.id,toWalletId:tron.id,amount:'1.23',requestId:request('audit-in')});const reverseResult=O.exchange.execute({quoteId:reverse.quote.quoteId,requestId:reverse.quote.requestId,otp:'654321'});
  const changed=JSON.parse(JSON.stringify(BALANCES));changed[cid].USD.a=originalBank[cid].USD.a;
  ok('Cross-asset execution changes only the chosen bank currency available leg',reverseResult.ok&&JSON.stringify(changed)===JSON.stringify(originalBank)&&W.snapshot().crypto.find(w=>w.id===tron.id).availableUnits===startUnits-12345678+1220000);
  ok('Cross-asset execution preserves original TXS history and FXR formulas',JSON.stringify(TXS)===txBefore&&JSON.stringify(FXR)===fxBefore);
  return checks;
 });report.browserChecks.push(...tests);
 await frame.evaluate(()=>{const A=AzureWallets.operations.addresses;A.save({label:'Enabled Ethereum receiver',network:'ethereum',address:'0x'+'a'.repeat(40),note:'synthetic',enabled:true});A.save({label:'Disabled Ethereum receiver',network:'ethereum',address:'0x'+'b'.repeat(40),note:'synthetic',enabled:false});A.save({label:'Enabled TRON receiver',network:'tron',address:'DEMO-TRC20-PICKAUDIT01',note:'synthetic',enabled:true});});
 const financial=()=>frame.evaluate(()=>JSON.stringify({bank:BALANCES,txs:TXS,rates:FXR,crypto:AzureWallets.snapshot().crypto,ledger:AzureWallets.snapshot().ledger}));const beforePicker=await financial();
 await frame.locator('.wallet-withdraw-btn').click();await frame.locator('#wallet-funding-network').selectOption('ethereum');await frame.locator('#wallet-funding-amount').fill('0.123456');await frame.locator('#wallet-funding-memo').fill('Keep this withdrawal memo');await frame.locator('#wallet-funding-address').fill('DEMO-ERC20-OLDRECEIVER01');await frame.locator('#wallet-funding-confirm').check();await frame.locator('[data-wf-address-book]').click();
 check('browser','Actual withdrawal button opens an enabled, same-network address picker',await frame.locator('.wab-entry').count()===1&&await frame.locator('#wab-network').inputValue()==='ethereum'&&(await frame.locator('.wab-entry').innerText()).includes('Enabled Ethereum receiver'));
 await frame.locator('[data-wab-select]').click();
 check('browser','Actual picker returns the enabled Ethereum address without losing amount or memo',await frame.locator('#wallet-funding-address').inputValue()==='0x'+'a'.repeat(40)&&await frame.locator('#wallet-funding-amount').inputValue()==='0.123456'&&await frame.locator('#wallet-funding-memo').inputValue()==='Keep this withdrawal memo');
 check('browser','Picking a new receiver clears the previous address confirmation',!await frame.locator('#wallet-funding-confirm').isChecked());
 await frame.locator('[data-wf-address-book]').click();await frame.locator('.wab-dialog header [data-wab-close]').click();check('browser','Cancelling the real address picker preserves the withdrawal draft',await frame.locator('#wallet-funding-address').inputValue()==='0x'+'a'.repeat(40)&&await frame.locator('#wallet-funding-memo').inputValue()==='Keep this withdrawal memo');
 await frame.locator('#wallet-funding-network').selectOption('tron');await frame.locator('[data-wf-address-book]').click();await frame.locator('[data-wab-select]').click();check('browser','Switching network uses its own enabled saved address and preserves precise amount',await frame.locator('#wallet-funding-address').inputValue()==='DEMO-TRC20-PICKAUDIT01'&&await frame.locator('#wallet-funding-amount').inputValue()==='0.123456');
 check('browser','Actual picker navigation creates no financial instruction',await financial()===beforePicker);await frame.locator('.wallet-funding-modal .modal-head .icon-btn').click();await page.close();
 const hq=await login('stephen@ourbank.example');
 const restoreTests=await hq.frame.evaluate(()=>{
  const results=[],cid='AZ100001',base=AzureWallets.snapshot(cid),before=JSON.stringify(base);const test=(label,data)=>{let result;try{result=AzureWallets.restore(cid,data);}catch{result='THREW';}results.push({label,passed:result===false&&JSON.stringify(AzureWallets.snapshot(cid))===before});};
  for(const key of ['crypto','ledger']){const bad=JSON.parse(JSON.stringify(base));bad[key]=[null];test(`Integrated restore rejects malformed ${key} without throwing or changing state`,bad);}
  for(const key of ['addresses','exchanges','batches']){const bad=JSON.parse(JSON.stringify(base));bad.operations[key]=[null];test(`Integrated restore rejects malformed operations.${key} without page errors`,bad);}
  const foreign=JSON.parse(JSON.stringify(base));foreign.customerId='AZ100002';test('Integrated restore rejects a cross-customer top-level snapshot',foreign);
  results.push({label:'A valid unmodified customer snapshot can still restore',passed:AzureWallets.restore(cid,base)===true});return results;
 });report.browserChecks.push(...restoreTests);await hq.page.close();
 check('browser','Focused audit performs no chain, custody or unexpected external request',report.externalRequests.length===0);
}catch(error){report.errors.push('browser: '+(error.stack||error));}finally{await browser.close();await fs.writeFile(reportFile,JSON.stringify(report,null,2));}
const checks=[...report.modelChecks,...report.browserChecks];console.log(JSON.stringify({model:report.modelChecks.length,browser:report.browserChecks.length,failures:checks.filter(x=>!x.passed),errors:report.errors,externalRequests:report.externalRequests},null,2));process.exitCode=checks.some(x=>!x.passed)||report.errors.length||report.externalRequests.length?1:0;
