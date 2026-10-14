export const DEMO_PASSWORD='AzureDemo!2026';
export const DEMO_ACCOUNTS=Object.freeze([
 {id:'AZ100001',email:'finance@starocean.example',role:'cust',name:'李小姐',title:'企業管理員',organization:'星海電子科技有限公司',avatar:'李'},
 {id:'A001',email:'ops@ganghuitong.example',role:'l1',name:'黃經理',title:'一級代理',organization:'港匯通顧問有限公司',avatar:'黃'},
 {id:'B007',email:'chan@chanstudio.example',role:'l2',name:'陳先生',title:'二級代理',organization:'陳氏商務工作室',avatar:'陳'},
 {id:'HQ',email:'stephen@ourbank.example',role:'hq',name:'平台管理員',title:'全權管理者',organization:'Azure',avatar:'管'}
]);
const passwords=new Map(DEMO_ACCOUNTS.map(a=>[a.id,DEMO_PASSWORD]));
export const findAccount=email=>DEMO_ACCOUNTS.find(a=>a.email===String(email).trim().toLowerCase());
export const authenticate=(email,password)=>{const account=findAccount(email);return account&&passwords.get(account.id)===password?{...account}:null;};
export const resetPassword=(email,password)=>{const account=findAccount(email);if(account)passwords.set(account.id,password);};
export const currentDemoPassword=email=>passwords.get(findAccount(email)?.id)||DEMO_PASSWORD;
export const resetDemoPasswords=()=>DEMO_ACCOUNTS.forEach(a=>passwords.set(a.id,DEMO_PASSWORD));
