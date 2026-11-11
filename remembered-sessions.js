/* Device-local verified Demo sessions. This is not a production refresh-token service. */
export class RememberedSessions {
  constructor(findAccount) {
    this.findAccount=findAccount;this.rows=new Map();this.listeners=new Set();this.queue=Promise.resolve();this.db=null;
    try{this.channel=new BroadcastChannel('azure-device-sessions-v1');this.channel.onmessage=event=>this.receive(event.data);}catch{}
  }
  valid(row){const account=this.findAccount(row?.email);return account&&row?.version===1&&row.accountId===account.id&&row.role===account.role&&typeof row.nonce==='string'&&/^[a-f0-9-]{36}$/.test(row.nonce)&&Number.isFinite(Date.parse(row.createdAt))?account:null;}
  async init(){
    try{
      this.db=await new Promise((resolve,reject)=>{
        let settled=false;const request=indexedDB.open('azure-verified-device-sessions',1),timer=setTimeout(()=>{settled=true;reject(new Error('storage_unavailable'));},1500);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('accounts'))request.result.createObjectStore('accounts',{keyPath:'email'});};
        request.onerror=()=>{clearTimeout(timer);if(!settled){settled=true;reject(new Error('storage_unavailable'));}};
        request.onsuccess=()=>{clearTimeout(timer);if(settled){request.result.close();return;}settled=true;resolve(request.result);};
      });
      this.db.onversionchange=()=>{this.db.close();this.db=null;};await this.refresh();
    }catch{this.db=null;}
    return this;
  }
  transaction(mode,action){
    return new Promise((resolve,reject)=>{
      if(!this.db){reject(new Error('storage_unavailable'));return;}
      let result;const tx=this.db.transaction('accounts',mode);
      tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(new Error('storage_unavailable'));
      try{const request=action(tx.objectStore('accounts'));if(request)request.onsuccess=()=>{result=request.result;};}catch{tx.abort();}
    });
  }
  enqueue(work){const promise=this.queue.then(work);this.queue=promise.catch(()=>{});return promise;}
  async refresh(){
    if(!this.db)return;
    const rows=await this.transaction('readonly',store=>store.getAll());this.rows.clear();
    for(const row of rows||[]){const account=this.valid(row);if(account&&!this.revoked(account.email))this.rows.set(account.email,row);}
  }
  revoked(email){try{return JSON.parse(localStorage.getItem('azure.device-revocations.v1')||'{}')[email]===true;}catch{return false;}}
  revoke(email,value){try{const raw=JSON.parse(localStorage.getItem('azure.device-revocations.v1')||'{}'),rows=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};if(value)rows[email]=true;else delete rows[email];localStorage.setItem('azure.device-revocations.v1',JSON.stringify(rows));}catch{}}
  has(email){const key=this.findAccount(email)?.email;return !this.revoked(key)&&this.rows.has(key);}
  accounts(){return [...this.rows.values()].filter(row=>!this.revoked(row.email)).map(row=>this.valid(row)).filter(Boolean);}
  emit(type,email,remote=false){for(const listener of this.listeners)listener({type,email,remote});if(!remote)this.channel?.postMessage({type,email});}
  onChange(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  remember(email){
    const account=this.findAccount(email);if(!account)return Promise.resolve(false);
    const row={version:1,email:account.email,accountId:account.id,role:account.role,nonce:crypto.randomUUID(),createdAt:new Date().toISOString()};
    this.revoke(account.email,false);this.rows.set(account.email,row);
    return this.enqueue(async()=>{
      try{await this.transaction('readwrite',store=>store.put(row));}catch{/* The current tab can still switch its verified sessions. */}
      if(!this.revoked(account.email))this.rows.set(account.email,row);this.emit('grant',account.email);return true;
    });
  }
  forget(email,type='forget'){
    const account=this.findAccount(email);if(!account)return Promise.resolve();this.revoke(account.email,true);this.rows.delete(account.email);
    return this.enqueue(async()=>{try{await this.transaction('readwrite',store=>store.delete(account.email));}catch{}this.revoke(account.email,true);this.rows.delete(account.email);this.emit(type,account.email);});
  }
  clear(){
    for(const email of this.rows.keys())this.revoke(email,true);this.rows.clear();return this.enqueue(async()=>{for(const email of this.rows.keys())this.revoke(email,true);try{await this.transaction('readwrite',store=>store.clear());}catch{}this.rows.clear();this.emit('clear');});
  }
  async receive(message){
    if(!message||!['grant','forget','logout','clear'].includes(message.type)||message.type!=='clear'&&!this.findAccount(message.email))return;
    if(message.type==='clear')this.rows.clear();else if(message.type!=='grant')this.rows.delete(message.email);
    else try{await this.refresh();}catch{return;}
    this.emit(message.type,message.email,true);
  }
}
