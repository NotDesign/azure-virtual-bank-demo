// Browser-local drafts. Blob writes and form changes commit in one transaction.
// Nothing here submits an application or stores an authenticated KYC session.
export function createDraftStore() {
 const name='azure-onboarding-drafts',version=1,blobCache=new Map();let opening;
 const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 function open(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   const r=indexedDB.open(name,version);let expired=false;
   const timer=setTimeout(()=>{expired=true;reject(new Error('Draft storage unavailable'));},5000);
   r.onupgradeneeded=()=>{
    const db=r.result;
    db.createObjectStore('manifests',{keyPath:'scope'});
    db.createObjectStore('drafts',{keyPath:['scope','id']}).createIndex('scope','scope');
    db.createObjectStore('files',{keyPath:['scope','draftId','id']}).createIndex('draft',['scope','draftId']);
   };
   r.onsuccess=()=>{clearTimeout(timer);if(expired){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};
   r.onerror=()=>{clearTimeout(timer);reject(r.error);};
  }).catch(e=>{opening=null;throw e;});return opening;
 }
 async function list(scope){
  const db=await open(),tx=db.transaction(['manifests','drafts'],'readonly');
  const [manifest,rows]=await Promise.all([request(tx.objectStore('manifests').get(scope)),request(tx.objectStore('drafts').index('scope').getAll(scope))]);
  if(manifest&&manifest.version!==version||rows.some(r=>r.version!==version||typeof r.id!=='string'||!r.state||!Array.isArray(r.files)))throw new Error('Unsupported draft data');
  const order=manifest?.order||[];rows.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  return {rows,active:manifest?.active||''};
 }
 async function files(scope,draftId){
  const db=await open(),tx=db.transaction('files','readonly');
  return request(tx.objectStore('files').index('draft').getAll([scope,draftId]));
 }
 async function save(scope,rows,removed,active){
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(['manifests','drafts','files'],'readwrite'),manifests=tx.objectStore('manifests'),drafts=tx.objectStore('drafts'),files=tx.objectStore('files'),cache=[];
   const now=new Date().toISOString(),remove=new Set(removed),r=manifests.get(scope);
   r.onsuccess=()=>{
    const previous=r.result;
    if(previous&&previous.version!==version){tx.abort();return;}
    const order=(previous?.order||[]).filter(id=>!remove.has(id));
    for(const id of remove){drafts.delete([scope,id]);const cursor=files.index('draft').openCursor(IDBKeyRange.only([scope,id]));cursor.onsuccess=()=>{const c=cursor.result;if(c){c.delete();c.continue();}};}
    for(const row of rows){
     if(remove.has(row.id))continue;if(!order.includes(row.id))order.push(row.id);
     const metadata=row.files.map(({file,...meta})=>meta);
     drafts.put({scope,id:row.id,name:row.name,state:row.state,files:metadata,version,updatedAt:now});
     const valid=new Set(row.files.map(f=>f.id));
     const cursor=files.index('draft').openCursor(IDBKeyRange.only([scope,row.id]));cursor.onsuccess=()=>{const c=cursor.result;if(c){if(!valid.has(c.value.id))c.delete();c.continue();}};
     for(const entry of row.files){
      const key=JSON.stringify([scope,row.id,entry.id]);
      if(entry.file instanceof Blob&&blobCache.get(key)!==entry.file){files.put({scope,draftId:row.id,id:entry.id,blob:entry.file});cache.push([key,entry.file]);}
     }
    }
    manifests.put({scope,version,order,active:order.includes(active)?active:order[0]||'',updatedAt:now});
   };
   tx.oncomplete=()=>{for(const [key,file]of cache)blobCache.set(key,file);resolve(now);};
   tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Draft transaction failed'));
  });
 }
 return {list,files,save};
}
