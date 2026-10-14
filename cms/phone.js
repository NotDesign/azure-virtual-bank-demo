import {LocalCamera,readIdentityLink,returnCode} from './identity.js';
import {createTranslator} from './i18n.js';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountPhone({root,locale='zh-Hant',onExit,onLocale}){
 let tr=createTranslator(locale),stage='consent',consented=false,photo=null,finished=false,destroyed=false;const camera=new LocalCamera(),abort=new AbortController();
 const q=sel=>root.querySelector(sel),button=(label,action,primary=false)=>`<button type="button" class="cms-button ${primary?'cms-button-primary':''}" data-phone="${action}">${E(tr(label))}</button>`;
 function clearPhoto(){camera.release(photo);photo=null;}
 function notifyResult(token){const result={token,status:'success'};if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('azure-identity-cms');channel.postMessage(result);channel.close();}try{localStorage.setItem('azure-identity-cms-result',JSON.stringify(result));localStorage.removeItem('azure-identity-cms-result');}catch{}}
 function render(){if(destroyed)return;camera.stop();const session=readIdentityLink();let body='';
  if(!session.valid){clearPhoto();body=`<h1>${E(tr('識別連結已過期或無效'))}</h1><p>${E(tr('請返回電腦，重新產生手機連結。'))}</p>${button('關閉','exit')}`;}
  else if(stage==='consent'){body=`<h1>${E(tr('身份證及人像流程'))}</h1><p class="cms-note">${E(tr('照片只在此頁暫存，不上傳。離開或重新整理後清除。人臉比對及活體驗證尚未串接。'))}</p><label class="cms-check"><input class="cms-checkbox" id="phone-consent" type="checkbox">${E(tr('我了解照片的本機暫存方式，並同意開啟相機'))}</label>${button('開始拍攝','start',true)}`;}
  else if(['front','back','face'].includes(stage)){const face=stage==='face';body=`<h1>${E(tr(face?'人像拍攝與識別':stage==='front'?'拍攝身份證正面':'拍攝身份證背面'))}</h1><p>${E(tr(face?'請正視鏡頭，將臉部置於框內。':'請將完整證件四角放入框內，避免反光。'))}</p><div class="cms-phone-camera" id="phone-camera"><p class="cms-camera-caption">${E(tr('請先開啟相機。'))}</p></div><p id="phone-error" class="cms-note error" hidden></p><div class="cms-dialog-actions">${button('開啟／重試相機','open')}${button('切換前後鏡頭','switch')}${button(face?'拍攝並使用此人像':stage==='front'?'拍攝正面':'拍攝背面','capture',true)}${button('使用照片檔案','file')}</div>`;}
  else if(['front-review','back-review','face-review'].includes(stage)){body=`<h1>${E(tr(stage==='front-review'?'核對正面照片':stage==='back-review'?'核對背面照片':'核對人像照片'))}</h1><img class="cms-photo" src="${E(photo?.url)}" alt="${E(tr('人像拍攝預覽'))}"><label class="cms-check"><input type="checkbox" class="cms-checkbox" id="phone-confirm">${E(tr('照片完整且清晰，我已核對'))}</label>${button(stage==='front-review'?'確認並拍攝背面':stage==='back-review'?'確認並拍攝人像':'確認照片並取得驗證碼','confirm',true)}${button('重新拍攝','retake')}`;}
  else {body=`<h1>${E(tr('照片已確認（Demo）'))}</h1><p>${E(tr('照片已從此頁釋放，沒有上傳。請回電腦輸入以下 6 碼。'))}</p><h2>${E(tr('手機識別驗證碼（Demo）'))}</h2><div class="cms-code" id="phone-return-code">${returnCode(session.token)}</div><p class="cms-note">${E(tr('示範不執行正式人臉比對或活體驗證。'))}</p>`;}
  root.className='cms cms-phone';root.hidden=false;root.innerHTML=`<main class="cms-phone-shell"><header class="cms-phone-header"><img src="assets/d7a5f.png" width="174" height="58" alt="Azure ²"><select class="cms-select" id="phone-language" aria-label="${E(tr('語言'))}"><option value="zh-Hant" ${locale==='zh-Hant'?'selected':''}>繁體中文</option><option value="zh-Hans" ${locale==='zh-Hans'?'selected':''}>简体中文</option><option value="en" ${locale==='en'?'selected':''}>English</option></select></header><p>${E(tr('手機實拍'))}</p><section class="cms-phone-panel">${body}${session.valid&&!finished&&stage!=='consent'?button('取消並清除照片','cancel'):''}</section><footer class="cms-footer">© 2026 Azure ²</footer></main>`;
 }
 function error(message){let el=q('#phone-error');if(!el){el=document.createElement('p');el.id='phone-error';el.className='cms-note error';q('.cms-phone-panel').append(el);}el.textContent=tr(message);el.hidden=false;}
 async function open(){if(!consented||!readIdentityLink().valid)return;try{await camera.open(q('#phone-camera'),{face:stage==='face',facing:stage==='face'?'user':'environment',tr});}catch(e){error(e.message);}}
 async function store(p){clearPhoto();photo=p;stage+='-review';render();}
 root.addEventListener('click',async e=>{const btn=e.target.closest('[data-phone]');if(!btn)return;const action=btn.dataset.phone,session=readIdentityLink();if(action==='exit'){onExit?.();return;}if(!session.valid){render();return;}
  if(action==='start'){if(!q('#phone-consent')?.checked)return error('請先閱讀並勾選同意。');consented=true;stage=session.mode==='face'?'face':'front';render();await open();}
  if(action==='open')await open();
  if(action==='switch'){try{await camera.switch(q('#phone-camera'),tr);}catch(e){error(e.message);}}
  if(action==='capture'){try{await store(await camera.take());}catch(e){error(e.message);}}
  if(action==='file'){const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png';input.setAttribute('capture',stage==='face'?'user':'environment');input.onchange=async()=>{try{const p=await camera.read(input.files[0]);if(!destroyed&&readIdentityLink().valid)await store(p);else camera.release(p);}catch(e){error(e.message);}};input.click();}
  if(action==='retake'){clearPhoto();stage=stage.replace('-review','');render();await open();}
  if(action==='confirm'){if(!q('#phone-confirm')?.checked)return error('請先核對照片並勾選確認。');if(stage==='front-review'){clearPhoto();stage='back';render();await open();}else if(stage==='back-review'){clearPhoto();stage='face';render();await open();}else{clearPhoto();camera.stop();notifyResult(session.token);finished=true;stage='done';render();}}
  if(action==='cancel'){clearPhoto();camera.stop();consented=false;stage='consent';render();}
 },{signal:abort.signal});
 root.addEventListener('change',e=>{if(e.target.id==='phone-language'){locale=e.target.value;tr=createTranslator(locale);render();onLocale?.(locale);}},{signal:abort.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)camera.stop();},{signal:abort.signal});window.addEventListener('pagehide',()=>{camera.stop();clearPhoto();},{signal:abort.signal});
 const interval=setInterval(()=>{if(!readIdentityLink().valid&&!destroyed&&(camera.stream||photo||stage!=='expired')){stage='expired';clearPhoto();camera.stop();render();}},1000);render();
 return {setLocale(l){locale=l;tr=createTranslator(locale);render();},destroy(){destroyed=true;abort.abort();clearInterval(interval);camera.stop();clearPhoto();root.hidden=true;root.innerHTML='';}};
}
