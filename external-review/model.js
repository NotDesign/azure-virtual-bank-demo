// Browser-local mock only. A production service must authorise channel users and sign responses server-side.
export const VERSION=1, PREFIX='azure-demo-external-review-v1:', INDEX='azure-demo-external-review-index-v1';
export const ACTIONS=['approve','request_changes','reject'];
const statuses=['active','decided','applied','revoked'];
const clean=(value,max=300)=>String(value??'').trim().slice(0,max);
const list=(value,fn,max=20)=>Array.isArray(value)?value.slice(0,max).map(fn):[];
export const validToken=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
export function sanitiseSnapshot(value={}){
 const person=p=>({name:clean(p?.name,100),document:clean(p?.document,40),share:clean(p?.share,12)});
 return {
  applicationId:clean(value.applicationId,80),company:clean(value.company,160),companyEnglish:clean(value.companyEnglish,160),
  purpose:clean(value.purpose,80),legalType:clean(value.legalType,80),registrationNumber:clean(value.registrationNumber,80),incorporationNumber:clean(value.incorporationNumber,80),
  registeredAddress:clean(value.registeredAddress,400),businessNature:clean(value.businessNature,160),website:clean(value.website,200),
  contact:{name:clean(value.contact?.name,100),email:clean(value.contact?.email,160),phone:clean(value.contact?.phone,60)},
  directors:list(value.directors,person,10),beneficialOwners:list(value.beneficialOwners,person,10),
  products:list(value.products,p=>({id:clean(p?.id,40),bank:clean(p?.bank,160),region:clean(p?.region,80),currencies:list(p?.currencies,c=>clean(c,12),12)}),10),
  documents:list(value.documents,d=>({kind:clean(d?.kind,60),name:clean(d?.name,180),source:clean(d?.source,40),note:clean(d?.note,300)}),30),
  fictional:true
 };
}
export async function snapshotDigest(value){const bytes=new TextEncoder().encode(JSON.stringify(sanitiseSnapshot(value)));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
function storage(){return localStorage;}
export function getRequest(token){
 if(!validToken(token))return null;
 try{const r=JSON.parse(storage().getItem(PREFIX+token));
  if(!r||r.version!==VERSION||r.token!==token||!statuses.includes(r.status)||!Number.isInteger(r.applicationRevision)||r.applicationRevision<1||!r.applicationId||r.snapshot?.applicationId!==r.applicationId||!/^[a-f0-9]{64}$/.test(r.snapshotDigest)||!Number.isFinite(r.expiresAt))return null;
  if(['decided','applied'].includes(r.status)&&!r.decision)return null;
  if(r.decision&&(!validToken(r.decision.id)||!ACTIONS.includes(r.decision.action)||typeof r.decision.reason!=='string'||!Array.isArray(r.decision.documents)||r.decision.documents.some(x=>typeof x!=='string')||!Number.isFinite(r.decision.at)))return null;
  return r;
 }catch{return null;}
}
function write(r){storage().setItem(PREFIX+r.token,JSON.stringify(r));return structuredClone(r);}
export function requestIndex(){try{const x=JSON.parse(storage().getItem(INDEX));return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}}
export function currentRequest(applicationId){return getRequest(requestIndex()[applicationId]);}
function index(r){const x=requestIndex();x[r.applicationId]=r.token;storage().setItem(INDEX,JSON.stringify(x));}
const lock=(token,fn)=>globalThis.navigator?.locks?.request? navigator.locks.request(PREFIX+token,fn):Promise.resolve().then(fn);
export async function createRequest({applicationId,applicationRevision,channel='ALLINPAY_HK',reviewer='渠道審單員（Demo）',snapshot,now=Date.now()}){
 if(!applicationId||!Number.isInteger(applicationRevision)||applicationRevision<1)throw Error('invalid_application');
 const safe=sanitiseSnapshot(snapshot);if(safe.applicationId!==applicationId||!safe.company)throw Error('invalid_snapshot');
 const previous=currentRequest(applicationId);if(previous&&['active','decided'].includes(previous.status))await revokeRequest(previous.token,'superseded');
 const r={version:VERSION,token:crypto.randomUUID(),requestId:crypto.randomUUID(),applicationId,applicationRevision,channel:clean(channel,60),reviewer:clean(reviewer,100),snapshot:safe,snapshotDigest:await snapshotDigest(safe),createdAt:now,expiresAt:now+86400000,status:'active',decision:null};
 write(r);try{index(r);}catch(error){storage().removeItem(PREFIX+r.token);throw error;}return structuredClone(r);
}
export async function revokeRequest(token,reason='revoked'){
 return lock(token,()=>{const r=getRequest(token);if(!r)return null;if(r.status==='applied')return structuredClone(r);r.status='revoked';r.revokedReason=clean(reason,80);r.revokedAt=Date.now();return write(r);});
}
export async function decideRequest(token,{action,reason='',documents=[],decisionId},expected={}){
 return lock(token,async()=>{
  const r=getRequest(token);if(!r)throw Error('unavailable');
  if(r.status==='revoked'||Date.now()>=r.expiresAt)throw Error('expired');
  if(r.applicationRevision!==expected.applicationRevision||r.snapshotDigest!==expected.snapshotDigest||await snapshotDigest(r.snapshot)!==r.snapshotDigest)throw Error('stale');
  if(!ACTIONS.includes(action))throw Error('invalid_decision');
  const why=clean(reason,1200),docs=list(documents,x=>clean(x,100),20).filter(Boolean);
  if(action!=='approve'&&!why)throw Error('reason_required');
  if(action==='request_changes'&&!docs.length)throw Error('documents_required');
  if(r.decision){if(r.decision.id===decisionId&&r.decision.action===action&&r.decision.reason===why&&JSON.stringify(r.decision.documents)===JSON.stringify(docs))return {record:structuredClone(r),duplicate:true};throw Error('already_decided');}
  if(r.status!=='active')throw Error('unavailable');
  r.decision={id:validToken(decisionId)?decisionId:crypto.randomUUID(),action,reason:why,documents:docs,at:Date.now(),reviewer:r.reviewer};r.status='decided';return {record:write(r),duplicate:false};
 });
}
export async function consumeDecision(token,apply){
 return lock(token,async()=>{
  const r=getRequest(token);if(!r||!r.decision||!['decided','applied'].includes(r.status))return {applied:false,reason:'not_decided'};
  if(r.status==='decided'&&Date.now()>=r.expiresAt){r.status='revoked';r.revokedReason='expired';write(r);return {applied:false,reason:'expired'};}
  if(await snapshotDigest(r.snapshot)!==r.snapshotDigest)return {applied:false,reason:'tampered'};
  const result=await apply(structuredClone(r));
  if(!result?.ok){if(r.status!=='applied'&&result?.stale){r.status='revoked';r.revokedReason='stale_application';write(r);}return {applied:false,reason:result?.reason||'not_current'};}
  if(r.status!=='applied'){r.status='applied';r.appliedAt=Date.now();write(r);}return {applied:true,duplicate:!!result.duplicate,record:structuredClone(r)};
 });
}
