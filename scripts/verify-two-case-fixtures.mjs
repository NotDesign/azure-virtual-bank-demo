import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={console,matchMedia:()=>({matches:false})};context.window=context;vm.createContext(context);
const load=async(name,until)=>{let text=await fs.readFile(path.join(root,'cms/confirmed',name),'utf8');if(until)text=text.slice(0,text.indexOf(until));vm.runInContext(text,context,{filename:name});};
await load('data.js');await load('core.js','// ---------- ui helpers ----------');await load('data_cust.js');await load('pages_onboard.js','// ---------- application detail ----------');await load('pages_kyc.js','// ---------- validation ----------');await load('pages_ctrl.js','const tgt =');await load('demo-data.js');
const checks=[];const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)console.error('FAIL',name);};
const C=context.CUSTOMERS,A=context.APPLICATIONS,ids=new Set(C.map(c=>c.id)),agents=new Map(context.AGENTS.map(a=>[a.id,a])),products=new Set(context.PRODUCTS.map(p=>p.code)),accountProducts=new Set(context.ACCOUNT_PRODUCTS.map(p=>p.id));
check('Exactly two complete business customers',C.length===2&&ids.has('AZ100001')&&ids.has('AZ100006'));
check('Exactly two mapped additional-account applications',A.length===2&&A.every(a=>ids.has(a.customerId)&&a.custId===a.customerId&&a.purpose==='additional-account'&&a.revision===1));
check('Case ownership spans independent level-1 and level-2 branches',C.every(c=>agents.get(c.l1)?.level===1&&agents.get(c.l2)?.parent===c.l1)&&new Set(C.map(c=>c.l1)).size===2&&new Set(C.map(c=>c.l2)).size===2);
check('Application names/owners match their business customer',A.every(a=>{const c=C.find(c=>c.id===a.customerId);return a.company===c.name&&a.owner===c.l1&&a.l2===c.l2;}));
check('Both case branches have independent long-lived public application links',C.every(c=>[c.l1,c.l2].every(org=>context.LINKS.some(link=>link.org===org&&link.exp==='长期'))));
check('Product and channel references resolve',A.every(a=>a.productIds.every(p=>accountProducts.has(p))&&context.CHANNELS.some(c=>c.code===a.channel)));
check('No orphaned prices, balances, accounts, beneficiaries or transactions',Object.keys(context.CUST_PRICE).every(id=>ids.has(id))&&Object.keys(context.BALANCES).every(id=>ids.has(id))&&context.ACCOUNTS.every(a=>ids.has(a.cust))&&context.BENEFICIARIES.every(b=>ids.has(b.customerId)&&b.cust===b.customerId)&&context.TXS.every(t=>ids.has(t.cust)&&products.has(t.prod)));
check('Exactly five explicit bank history rows per case',context.TXS.length===10&&C.every(c=>context.TXS.filter(t=>t.cust===c.id).length===5));
check('Document requests and control logs have no removed-customer references',context.DOC_REQS.every(r=>(r.tt==='c'?ids.has(r.target):agents.has(r.target))&&r.custs.every(id=>ids.has(id))&&r.txs.every(id=>context.TXS.some(t=>t.id===id)))&&context.CTRL_LOG.every(r=>r.tt==='c'?ids.has(r.target):agents.has(r.target)));
check('Document request transaction evidence predates its request',context.DOC_REQS.every(r=>r.txs.every(id=>context.TXS.find(t=>t.id===id).date<=r.created)));
for(const c of C){
 const snapshot=context.AzureDemoData.customer(c.id),wallet=context.AzureDemoData.wallet(c.id),kyc=context.APP_KYC[A.find(a=>a.customerId===c.id).id];
 check(c.id+' keeps matching synthetic company/contact KYC',kyc.cn===c.name&&kyc.en===c.en&&kyc.email===c.email&&kyc.contact===c.contact);
 check(c.id+' has eight fiat currencies and two USDT networks',Object.keys(context.BALANCES[c.id]).length===8&&new Set(wallet.crypto.map(w=>w.network)).size===2&&wallet.crypto.every(w=>w.customerId===c.id));
 check(c.id+' has own counterparties, withdrawal accounts and document requests',snapshot.CPS.length>0&&snapshot.CPS.every(r=>r.customerId===c.id)&&snapshot.WITHDRAW_ACCTS.every(r=>r.customerId===c.id)&&snapshot.DOC_REQS.every(r=>r.target===c.id));
 check(c.id+' keeps seven destination choices and a buyer',context.AzureDemoData.countries.length===7&&context.AzureDemoData.countries.every(([country])=>snapshot.CPS.some(p=>p.country===country))&&snapshot.CPS.some(p=>p.dir==='来款方'));
 check(c.id+' crypto opening and completed movements reconcile to available plus frozen',wallet.crypto.every(w=>wallet.ledger.filter(l=>l.walletId===w.id).reduce((sum,l)=>sum+(l.kind==='credit'||l.kind==='exchange-in'?l.amountUnits: l.status==='completed'?-(l.settledUnits||l.totalUnits||0):0),0)===w.availableUnits+w.frozenUnits));
 check(c.id+' historical payouts predate any current payment freeze',!c.frz?.scopes.includes('pay')||(context.TXS.filter(t=>t.cust===c.id&&['付款','换汇','提现'].includes(t.type)).every(t=>t.date<=c.frz.t.slice(0,10))&&wallet.ledger.filter(l=>l.kind==='withdraw'||l.kind==='exchange-in').every(l=>l.date.slice(0,10)<=c.frz.t.slice(0,10))));
 check(c.id+' case snapshots are copied, not shared mutable arrays',(()=>{snapshot.CPS[0].name='MUTATED';return context.AzureDemoData.customer(c.id).CPS[0].name!=='MUTATED';})());
}
check('Unknown customer has no fixture snapshot or wallet',context.AzureDemoData.customer('AZ100002')===null&&context.AzureDemoData.wallet('AZ100002')===null);
const report={cases:context.AZURE_DEVELOPER_CASES,counts:{customers:C.length,applications:A.length,bankTransactions:context.TXS.length,agents:context.AGENTS.length,products:context.PRODUCTS.length},checks,errors:[]};
const output=process.env.QA_REPORT;if(output){await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:checks.length,failures:checks.filter(c=>!c.passed),counts:report.counts},null,2));process.exitCode=checks.some(c=>!c.passed)?1:0;
