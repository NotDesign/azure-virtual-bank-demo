// Explicitly fictional provider boundary. No API keys, government requests or biometrics.
export const MOCK_METHODS=['iam-smart','document'];
export const MOCK_DOCUMENTS=['hkid','passport','cnid'];
export const MOCK_OUTCOMES=['success','failed','review','cancelled'];
export function readMockIdentityLink(url=location.href){
 const hash=new URL(url,'https://demo.invalid').hash;
 const match=hash.match(/^#\/identity\/([a-f0-9-]{36})\/(iam-smart|document)\/(\d+)(?:\?doc=(hkid|passport|cnid))?$/),expiry=Number(match?.[3]);
 return {token:match?.[1],method:match?.[2],documentType:match?.[2]==='iam-smart'?'hkid':match?.[4]||'hkid',expiry,valid:!!match&&expiry>Date.now()&&expiry<=Date.now()+660000};
}
// A Demo result code, deliberately public and deterministic; never a production credential.
export function mockCompletionCode(token,method,status){
 if(!MOCK_METHODS.includes(method)||!MOCK_OUTCOMES.includes(status))return '';
 let n=2166136261;for(const c of `azure-mock-v1:${token}:${method}:${status}`)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 return String(n%1000000).padStart(6,'0');
}
export function createMockResult({token,method,status,documentType='hkid'}){
 if(!MOCK_METHODS.includes(method)||!MOCK_OUTCOMES.includes(status)||!MOCK_DOCUMENTS.includes(documentType))throw Error('Unknown Demo identity outcome');
 if(method==='iam-smart')documentType='hkid';
 const completed=status==='success'||status==='review';
 return {token,method,status,simulated:true,version:1,documentType,
  checks:{document:completed,liveness:completed,face:status==='success',consent:completed},
  profile:{name:'陳示範',nameEn:'DEMO CHAN',first:'DEMO',last:'CHAN',birthDate:'1990-01-01',idNo:documentType==='hkid'?'A000000(0)':documentType==='passport'?'P0000000':'000000199001010000',idNoMasked:documentType==='hkid'?'A•••••(0)':documentType==='passport'?'P•••••00':'••••••••••••••0000'}};
}
export function validMockResult(result,request){
 if(!request||request.expires<=Date.now()||request.status!=='pending')return false;
 if(!result||result.version!==1||result.simulated!==true||result.token!==request.token||result.method!==request.method||!MOCK_OUTCOMES.includes(result.status)||!MOCK_DOCUMENTS.includes(result.documentType))return false;
 if(result.method==='iam-smart'&&result.documentType!=='hkid')return false;
 if(!result.checks||['document','liveness','face','consent'].some(k=>typeof result.checks[k]!=='boolean'))return false;
 return result.status!=='success'||Object.values(result.checks).every(v=>v===true);
}
