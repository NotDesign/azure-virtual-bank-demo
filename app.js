import {zh,en} from './copy.js';
import {zhCN,toSimplified} from './simplified.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Every fresh visit starts in Traditional Chinese; selection stays within this session.
let locale='zh-Hant';
const t=key=>locale==='en'?(en[key]||key):locale==='zh-Hans'?(zhCN[key]||toSimplified(zh[key]||key)):(zh[key]||key);
const localizeChinese=s=>locale==='zh-Hans'?toSimplified(s):s;
const bilingual=(a,b)=>locale==='en'?b:localizeChinese(a);
const state={page:'login',email:'',password:'',newPassword:'',confirmPassword:'',demoPassword:'AzureDemo!2026',method:'email',digits:Array(6).fill(''),code:'381726',codeVersion:0,expires:0,resend:0,attempts:0,credentialAttempts:0,lockUntil:0,resetExpires:0,resetResend:0,verified:0,error:'',message:'',busy:false,lastActivity:Date.now()};
let flowVersion=0;
const view=$('#view');
const asset=(name,cls='')=>`<span class="icon ${cls}"><img src="assets/${name}" alt=""></span>`;
const backIcon=()=>asset('13f3a.svg');
const action=(key,id,kind='text-button',extra='')=>`<button type="button" class="${kind}" data-action="${id}" ${extra}>${escapeHTML(t(key))}</button>`;
const intro=(title,desc='',eyebrow='')=>`<div class="intro">${eyebrow?`<p class="eyebrow">${escapeHTML(t(eyebrow))}</p>`:''}<h2 tabindex="-1">${escapeHTML(t(title))}</h2>${desc?`<p>${escapeHTML(t(desc))}</p>`:''}</div>`;
const notice=(message,type='info')=>`<div class="notice ${type}" role="${type==='error'?'alert':'status'}"><span class="notice-symbol" aria-hidden="true">${type==='error'?'!':type==='success'?'✓':'i'}</span><span>${escapeHTML(message)}</span></div>`;
const progress=step=>`<ol class="progress" aria-label="${bilingual('驗證進度','Verification progress')}"><li class="active" ${step===1?'aria-current="step"':''}><span class="step">${step===2?'✓':'1'}</span>${escapeHTML(t('Sign in'))}</li><li class="${step===2?'active':''}" ${step===2?'aria-current="step"':''}><span class="step">2</span>${escapeHTML(t('Verify identity'))}</li></ol>`;
const stateIcon=(name='mail',success=false)=>`<div class="state-icon ${success?'success':''}" aria-hidden="true">${success?'✓':asset(({mail:'3bca2.svg',sms:'9f8f4.svg',auth:'ed81b.svg',shield:'2ad66.svg'})[name]||'2ad66.svg')}</div>`;
function field(id,label,placeholder,password=false){const val=state[id]||'';return `<div class="field"><div class="label-row"><label for="${id}">${escapeHTML(t(label))}</label>${id==='password'?action('Forgot password?','forgot'):''}</div><div class="input-wrap ${password?'password':''}"><input id="${id}" name="demo-${id}" type="${password?'password':'email'}" value="${escapeHTML(val)}" placeholder="${escapeHTML(t(placeholder))}" autocomplete="off" ${!password?'inputmode="email" autocapitalize="none" spellcheck="false"':''} ${state.error&&state.page==='login'?'aria-invalid="true" aria-describedby="form-error"':''} required>${password?`<button type="button" class="eye-button" data-eye="${id}" aria-label="${bilingual('顯示密碼','Show password')}" aria-pressed="false">${asset('9a0f1.svg','icon-eye')}</button>`:''}</div></div>`;}
const validEmail=()=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email);
const credentialsReady=()=>validEmail()&&state.password.length>0;
const passwordReady=()=>state.newPassword.length>=12&&/[a-z]/i.test(state.newPassword)&&/\d/.test(state.newPassword)&&/[^a-z0-9]/i.test(state.newPassword)&&state.newPassword===state.confirmPassword;
const codeReady=()=>state.digits.every(d=>/^\d$/.test(d));
function formError(){const message=state.error==='invalid-otp'?bilingual('驗證碼不正確，請重新輸入。您還有 '+(5-state.attempts)+' 次嘗試機會。','That code is incorrect. Please try again. '+(5-state.attempts)+' attempts remaining.'):state.error==='same-password'?bilingual('請使用與目前不同的新密碼。','Choose a password different from the current password.'):t(state.error);return state.error?`<div id="form-error">${notice(message,'error')}</div>`:''}
function render(focus=true){
  const p=state.page;view.className='form'+(['otp','expired'].includes(p)&&(state.error||state.message||p==='expired')?' compact':'');
  if(p==='login')view.innerHTML=`${progress(1)}${intro('Welcome back','Sign in to your Azure workspace.')}<form id="credentials-form" novalidate>${formError()}<div class="fields">${field('email','Work email','Enter your email address')}${field('password','Password','Enter your password',true)}</div><button class="primary" id="submit" ${!credentialsReady()||state.busy?'disabled':''}>${state.busy?bilingual('確認中…','Checking…'):t('Continue')}</button></form><div class="help-row"><span>${t('Need access?')}</span>${action('Contact administrator','recovery')}</div>`;
  else if(p==='methods')view.innerHTML=`${progress(2)}${intro('Verify it’s you','Choose how you’d like to verify your identity.')}<div class="methods">${[['email','Email verification','Send a code to a•••@example.com','af3b7.svg'],['sms','SMS verification','Text a code to +852 •••• 4821','9f8f4.svg'],['auth','Authenticator app','Use the code in your authenticator','ed81b.svg']].map(([m,title,desc,icon])=>`<button class="method" data-method="${m}"><span class="method-icon">${asset(icon)}</span><span class="method-copy"><strong>${t(title)}</strong><span>${t(desc)}</span></span>${asset('3e4c7.svg','method-chevron')}</button>`).join('')}</div><p class="small">${t('Only methods already set up for your account are shown.')}</p><button class="text-button" data-action="login">${backIcon()}${t('Back to sign in')}</button>`;
  else if(p==='otp'||p==='expired'){
    const m=state.method,expired=p==='expired';const title=m==='email'?'Check your email':m==='sms'?'Check your phone':'Open your authenticator';const desc=m==='email'?'Enter the 6-digit code sent to\na•••@example.com.':m==='sms'?'Enter the 6-digit code sent to\n+852 •••• 4821.':'Enter the 6-digit code from your authenticator app.';
    view.innerHTML=`${progress(2)}${stateIcon(m==='email'?'mail':m)}${intro(title,desc)}<form id="otp-form" novalidate>${formError()}${state.message?notice(t(state.message),'success'):''}${expired?notice(t('This code has expired. Request a new code to continue.'),'error'):''}<div class="otp-area"><span class="otp-label" id="otp-label">${t('Verification code')}</span><fieldset class="otp ${state.error||expired?'error':''}" aria-labelledby="otp-label">${state.digits.map((d,i)=>`<input id="digit-${i}" data-digit="${i}" aria-label="${bilingual('第 '+(i+1)+' 碼','Digit '+(i+1))}" aria-describedby="otp-timer" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="${i===0?'one-time-code':'off'}" value="${d}" placeholder="—" ${expired?'disabled':''}>`).join('')}</fieldset><p class="small" id="otp-timer"></p></div>${expired?`<button type="button" class="primary" data-action="resend">${t('Send a new code')}</button>`:`<button class="primary" id="submit" ${!codeReady()?'disabled':''}>${t('Verify & sign in')}</button>`}</form><div class="actions">${m!=='auth'&&!expired?'<button class="text-button" data-action="resend" id="resend-button"></button>':''}<button class="text-button" data-action="methods">${backIcon()}${t('Use another method')}</button>${action('Can’t access your verification method?','recovery')}</div>`;
  }
  else if(p==='loading')view.innerHTML=`${progress(2)}${intro('Verifying your identity','Please wait while we check your verification code.')}<button class="primary" disabled><span class="spinner" aria-hidden="true"></span>${t('Verifying…')}</button>`;
  else if(p==='success')view.innerHTML=`${stateIcon('shield',true)}${intro('You’re securely signed in','Your Azure workspace is ready.','IDENTITY VERIFIED')}${notice(t('Two-step verification complete'),'success')}${action('Continue to workspace','workspace','primary')}${action('Sign out','logout')}`;
  else if(p==='workspace')view.innerHTML=`${stateIcon('shield',true)}${intro('Welcome to Azure CMS','You have reached the authenticated workspace.','WORKSPACE ENTRY')}${notice(t('Your available tools and permissions appear here after sign-in.'))}<p class="small">${bilingual('此示範目前展示帳戶與身分驗證流程；銀行業務功能將於後續設計。','This demo covers account and identity verification. Banking operations are outside this prototype.')}</p>${action('Sign out','logout','secondary')}`;
  else if(p==='forgot')view.innerHTML=`<button class="text-button" data-action="login">${backIcon()}${t('Back to sign in')}</button>${intro('Forgot your password?','Enter your work email and we’ll send you a password reset link.')}<form id="forgot-form" novalidate>${field('email','Work email','Enter your email address')}<button class="primary" id="submit" ${validEmail()?'':'disabled'}>${t('Send reset link')}</button></form><p class="small">${t('You’ll still need to verify your identity after resetting your password.')}</p>`;
  else if(p==='sent')view.innerHTML=`${stateIcon()}${intro('Check your inbox','If an account exists for this address, you’ll receive a password reset link shortly.')}${notice(t('For your security, the reset link is valid for 15 minutes.'))}<p class="small">${t('Didn’t receive an email? Check your spam folder.')}</p>${action('Resend reset link','reset-resend','text-button','id="reset-resend"')}${action('Back to sign in','login')}`;
  else if(p==='reset')view.innerHTML=`${intro('Set a new password','Choose a strong password you haven’t used before.')}<form id="reset-form" novalidate>${formError()}<div class="fields">${field('newPassword','New password','Enter your password',true)}${field('confirmPassword','Confirm new password','Enter your password',true)}</div><p class="small">${t('12+ characters, including a mix of letters, numbers and symbols.')}</p><button class="primary" id="submit" ${passwordReady()?'':'disabled'}>${t('Reset password')}</button></form>${action('Back to sign in','login')}`;
  else if(p==='resetDone')view.innerHTML=`${stateIcon('shield',true)}${intro('Password updated','Your new password is ready. Sign in again to verify your identity.')}${notice(t('For your security, other active sessions have been signed out.'))}${action('Back to sign in','login','primary')}`;
  else if(p==='locked')view.innerHTML=`${stateIcon('shield')}${intro('Let’s pause for a moment','Too many unsuccessful attempts. Access is temporarily locked.')}${notice(t('Try again in 15 minutes, or contact your administrator for help.'),'error')}<p class="small" id="lock-timer"></p>${action('Contact administrator','recovery','secondary')}${action('Back to sign in','login')}`;
  else if(p==='recovery')view.innerHTML=`${intro('Need help signing in?','Try another verification method that is already set up for your account.')}${state.verified>=1?action('Choose another method','methods','secondary'):''}<p>${t('If all methods are unavailable, contact your organization’s administrator through your usual support channel.')}</p>${notice(t('For your security, verification methods cannot be changed from this screen. Never share a password or verification code.'))}${action('Back to sign in','login')}`;
  else if(p==='network')view.innerHTML=`${intro('We couldn’t connect','Check your connection and try again. Your account hasn’t been signed in.')}${action('Try again','retry','primary')}${action('Back to sign in','login')}`;
  else if(p==='sessionExpired')view.innerHTML=`${intro('Your session has expired','You’ve been signed out after a period of inactivity. Sign in again to continue.')}${action('Sign in again','logout','primary')}`;
  else if(p==='linkExpired')view.innerHTML=`${intro('This reset link has expired','Request a new password reset link to continue.')}${action('Request a new link','forgot','primary')}${action('Back to sign in','login')}`;
  tick();renderDemo();if(focus){view.querySelector('h2')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})}document.querySelector('.brand').classList.toggle('confirmed',state.verified===2);
}
function go(page,options={}){flowVersion++;state.busy=false;state.page=page;state.error=options.error||'';state.message=options.message||'';if(!options.keepDigits)state.digits=Array(6).fill('');state.lastActivity=Date.now();render();}
function lock(){state.lockUntil=Date.now()+15*60*1000;go('locked');}
function startMethod(m){if(state.verified<1)return go('login');state.method=m;state.code='381726';state.codeVersion=0;state.expires=Date.now()+300000;state.resend=0;state.attempts=0;go('otp');}
function resend(){if(state.method==='auth'||Date.now()<state.resend)return;state.codeVersion++;state.code=state.codeVersion%2?'042851':'381726';state.expires=Date.now()+300000;state.resend=Date.now()+30000;go('otp',{message:'A new code has been sent. Your previous code no longer works.'});$('#announcer').textContent=t('A new code has been sent. Your previous code no longer works.');$('#digit-0')?.focus();}
const remaining=end=>Math.max(0,Math.ceil((end-Date.now())/1000));
const mmss=sec=>String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
function tick(){
  if(state.page==='otp'&&state.method!=='auth'&&remaining(state.expires)===0){go('expired');return}
  const timer=$('#otp-timer');if(timer)timer.textContent=state.page==='expired'?t('Code expired'):state.method==='auth'?t('Codes refresh automatically in your app.'):bilingual('驗證碼將於 '+mmss(remaining(state.expires))+' 後失效','Code expires in '+mmss(remaining(state.expires)));
  const resendButton=$('#resend-button');if(resendButton){const s=remaining(state.resend);resendButton.disabled=s>0;resendButton.textContent=s?bilingual(mmss(s)+' 後可重新寄送','Resend available in '+mmss(s)):t('Didn’t receive a code? Resend');}
  const resetButton=$('#reset-resend');if(resetButton){const s=remaining(state.resetResend);resetButton.disabled=s>0;resetButton.textContent=s?bilingual(mmss(s)+' 後可重新寄送','Resend available in '+mmss(s)):t('Resend reset link');}
  const lockTimer=$('#lock-timer');if(lockTimer)lockTimer.textContent=bilingual('剩餘時間 ','Time remaining ')+mmss(remaining(state.lockUntil));
  if(state.lockUntil&&remaining(state.lockUntil)===0){state.lockUntil=0;state.attempts=0;state.credentialAttempts=0;if(state.page==='locked')go('login')}
  if(state.page==='reset'&&remaining(state.resetExpires)===0)go('linkExpired');
  if(state.verified>0&&!['sessionExpired','locked','recovery','login'].includes(state.page)&&Date.now()-state.lastActivity>900000){state.verified=0;state.password='';go('sessionExpired')}
}
function resetDemo(){Object.assign(state,{email:'',password:'',newPassword:'',confirmPassword:'',demoPassword:'AzureDemo!2026',attempts:0,credentialAttempts:0,lockUntil:0,verified:0,expires:0,resend:0,resetExpires:0});go('login');}
function handleAction(id){
  if(id==='resend')return resend();
  if(id==='logout'){state.verified=0;state.password='';return go('login')}
  if(id==='login'){if(state.lockUntil>Date.now())return go('locked');state.verified=0;return go('login')}
  if(id==='methods'){if(state.verified<1)return go('login');return go('methods')}
  if(id==='workspace'){if(state.verified<2)return go('login');return go('workspace')}
  if(id==='retry'){state.expires=Date.now()+300000;return go('otp')}
  if(id==='reset-resend'){if(Date.now()<state.resetResend)return;state.resetExpires=Date.now()+900000;state.resetResend=Date.now()+30000;render(false);return}
  if(['forgot','recovery'].includes(id))return go(id);
}
view.addEventListener('click',event=>{const el=event.target.closest('button');if(!el)return;if(el.dataset.action)handleAction(el.dataset.action);if(el.dataset.method)startMethod(el.dataset.method);if(el.dataset.eye){const input=$('#'+el.dataset.eye);const visible=input.type==='password';input.type=visible?'text':'password';el.setAttribute('aria-pressed',String(visible));el.setAttribute('aria-label',visible?bilingual('隱藏密碼','Hide password'):bilingual('顯示密碼','Show password'))}});
function updateValidity(){const b=$('#submit');if(!b)return;b.disabled=state.page==='login'?!credentialsReady():state.page==='forgot'?!validEmail():state.page==='reset'?!passwordReady():state.page==='otp'?!codeReady():true;}
function putDigits(index,value){const str=value.replace(/[^0-9]/g,'');if(str.length>1){if(str.length===6)index=0;for(let i=index;i<6;i++)state.digits[i]=str[i-index]||''}else state.digits[index]=str;$$('[data-digit]').forEach((el,i)=>el.value=state.digits[i]);if(str.length){const target=Math.min(index+str.length,5);$('#digit-'+target)?.focus();$('#digit-'+target)?.select()}updateValidity()}
view.addEventListener('input',e=>{const input=e.target;if(input.dataset.digit!==undefined){putDigits(Number(input.dataset.digit),input.value);return}if(['email','password','newPassword','confirmPassword'].includes(input.id)){state[input.id]=input.value;updateValidity()}});
view.addEventListener('paste',e=>{if(e.target.dataset.digit===undefined)return;e.preventDefault();putDigits(Number(e.target.dataset.digit),e.clipboardData.getData('text'))});
view.addEventListener('keydown',e=>{if(e.target.dataset.digit===undefined)return;const i=Number(e.target.dataset.digit);if(e.key==='Backspace'&&!e.target.value&&i>0){e.preventDefault();state.digits[i-1]='';$('#digit-'+(i-1)).value='';$('#digit-'+(i-1)).focus();updateValidity()}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const j=Math.max(0,Math.min(5,i+(e.key==='ArrowLeft'?-1:1)));$('#digit-'+j).focus();$('#digit-'+j).select()}});
view.addEventListener('focusin',e=>{if(e.target.dataset.digit!==undefined)e.target.select()});
view.addEventListener('submit',async e=>{e.preventDefault();if(state.busy)return;
  if(e.target.id==='credentials-form'){
    if(state.lockUntil>Date.now())return go('locked');if(!credentialsReady())return;state.busy=true;render(false);const version=++flowVersion;
    await new Promise(r=>setTimeout(r,420));if(version!==flowVersion)return;state.busy=false;
    if(state.email.toLowerCase()!=='admin@example.com'||state.password!==state.demoPassword){state.credentialAttempts++;if(state.credentialAttempts>=5)return lock();return go('login',{error:'The email or password is incorrect. Please try again.'})}
    state.verified=1;state.credentialAttempts=0;go('methods');
  }else if(e.target.id==='otp-form'){
    if(!codeReady())return;if(state.method!=='auth'&&Date.now()>=state.expires)return go('expired');
    if(state.digits.join('')!==state.code){state.attempts++;if(state.attempts>=5)return lock();const error='invalid-otp';go('otp',{error,keepDigits:true});$('#digit-0').focus();$('#digit-0').select();return}
    go('loading');const version=flowVersion;state.busy=true;await new Promise(r=>setTimeout(r,850));if(version!==flowVersion)return;state.verified=2;state.attempts=0;state.password='';go('success');
  }else if(e.target.id==='forgot-form'){if(!validEmail())return;state.resetExpires=Date.now()+900000;state.resetResend=Date.now()+30000;go('sent');
  }else if(e.target.id==='reset-form'){if(Date.now()>=state.resetExpires)return go('linkExpired');if(!passwordReady())return;if(state.newPassword===state.demoPassword)return go('reset',{error:'same-password'});state.demoPassword=state.newPassword;state.newPassword='';state.confirmPassword='';state.password='';state.verified=0;state.resetExpires=0;go('resetDone')}
});

// Language, demo credentials and verification state stay in memory only.
function setLanguage(lang){locale=lang;document.documentElement.lang=lang;$('#announcer').textContent='';$('.brand').setAttribute('aria-label',bilingual('Azure 虛擬銀行','Azure Virtual Bank'));$('#active-language').textContent=({'en':'English','zh-Hans':'简体中文','zh-Hant':'繁體中文'})[lang];$$('[data-copy]').forEach(el=>el.textContent=t(el.dataset.copy));$$('[data-lang]').forEach(el=>el.setAttribute('aria-checked',String(el.dataset.lang===lang)));$('#demo-trigger').textContent=bilingual('互動示範','Interactive demo');$('#demo-title').textContent=bilingual('互動示範','Interactive demo');$('#demo-close').setAttribute('aria-label',bilingual('關閉','Close'));$('.skip').textContent=bilingual('跳至主要內容','Skip to content');$('.carousel-controls').setAttribute('aria-label',bilingual('品牌主題','Brand stories'));document.title=bilingual('Azure 虛擬銀行 · 互動示範','Azure Virtual Bank · Interactive Demo');closeLanguage();renderSlide();render(false);updateMotionButton();}
function closeLanguage(){const menu=$('#language-menu');menu.hidden=true;$('#language-trigger').setAttribute('aria-expanded','false')}
$('#language-trigger').addEventListener('click',()=>{const open=$('#language-menu').hidden;$('#language-menu').hidden=!open;$('#language-trigger').setAttribute('aria-expanded',String(open));if(open)$('[data-lang="'+locale+'"]').focus()});
$('#language-menu').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){setLanguage(b.dataset.lang);$('#language-trigger').focus()}});
$('#language-menu').addEventListener('keydown',e=>{const items=$$('[data-lang]');if(e.key==='Escape'){closeLanguage();$('#language-trigger').focus()}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const i=items.indexOf(document.activeElement);items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}});
document.addEventListener('click',e=>{if(!e.target.closest('.language'))closeLanguage()});

const dialog=$('#demo-dialog');
function renderDemo(){
  $('#demo-content').innerHTML=`<p>${bilingual('這是互動設計示範，所有資料皆為虛構。驗證與重設流程只在此頁模擬，不會寄送郵件或簡訊。請勿輸入真實密碼。','This is an interactive design demo with fictional data. Verification and recovery are simulated locally. No email or SMS is sent. Do not enter a real password.')}</p><div class="demo-values"><span>${bilingual('示範帳戶','Demo account')}: <code>admin@example.com</code></span><span>${t('Password')}: <code>${escapeHTML(state.demoPassword)}</code></span><span>OTP: <code>${state.code}</code></span></div><button class="primary" data-demo="fill">${bilingual(['otp','expired'].includes(state.page)?'填入目前示範驗證碼':'填入示範帳戶','Fill demo '+(['otp','expired'].includes(state.page)?'code':'account'))}</button>${state.page==='sent'?`<button class="secondary" data-demo="reset-link">${bilingual('模擬開啟重設連結','Simulate opening reset link')}</button>`:''}<div class="demo-scenarios">${[['invalid','驗證碼錯誤','Invalid code'],['expired','驗證碼逾時','Expired code'],['locked','暫時鎖定','Locked account'],['network','網路異常','Network error'],['sessionExpired','連線逾時','Session expired'],['linkExpired','重設連結失效','Expired reset link']].map(([id,a,b])=>`<button class="scenario" data-demo="${id}">${bilingual(a,b)}</button>`).join('')}</div><button class="secondary" data-demo="restart">${bilingual('重新開始示範','Restart demo')}</button><p class="demo-note">${bilingual('電子郵件與簡訊 OTP：5 分鐘有效、重寄間隔 30 秒。連續錯誤 5 次暫停 15 分鐘。重設密碼後仍須完成 OTP。','Email / SMS codes last 5 minutes; resend cooldown is 30 seconds. Five failed attempts cause a 15-minute lock. Password reset still requires OTP verification.')}</p>`;
}
$('#demo-trigger').addEventListener('click',()=>{renderDemo();dialog.showModal()});$('#demo-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close()}const a=e.target.closest('[data-demo]');if(!a)return;const id=a.dataset.demo;dialog.close();
  if(id==='restart')return resetDemo();
  if(id==='fill'){if(state.page==='otp'){putDigits(0,state.code);return}if(state.page==='expired'){resend();putDigits(0,state.code);return}if(state.lockUntil>Date.now()){return go('locked')}state.email='admin@example.com';state.password=state.demoPassword;go('login');return}
  if(id==='reset-link'){if(Date.now()>=state.resetExpires)return go('linkExpired');return go('reset')}
  if(id==='locked')return lock();
  if(['invalid','expired','network'].includes(id)){state.verified=1;state.method='email';state.expires=Date.now()+300000;state.resend=0;state.code='381726';state.attempts=id==='invalid'?1:0}
  if(id==='invalid')return go('otp',{error:'invalid-otp'});
  if(id==='sessionExpired')state.verified=0;go(id);
});

// Headlines crossfade in place; only the illustration follows the curved transition.
const slides=[
  {title:['虛擬銀行，\n開啟金融新日常。','Virtual banking.\nA new financial everyday.'],description:['以數位金融，連結更多可能。\n讓每一天的金融服務，更簡單、更貼近您。','Digital finance, with more possibilities.\nEveryday banking, made simpler and closer to you.'],card:['金融日常，自在掌握。','Banking, on your terms.'],detail:['透過數位服務，連結更多金融可能。','A connected world of digital finance.'],status:['數位金融・自在掌握','Digital finance, within reach']},
  {title:['金融服務，\n隨您的節奏前行。','Banking that moves\nat your pace.'],description:['從日常管理到未來規劃，\n以更直覺的方式，連結每一個金融時刻。','From everyday management to future plans.\nA more intuitive way to connect with your finances.'],card:['每一刻，從容有序。','Every moment, in balance.'],detail:['讓繁複化為簡單，讓生活保有節奏。','Less complexity. More room for everyday life.'],status:['您的節奏・您的選擇','Your pace. Your choices.']},
  {title:['數位連結，\n延伸每一種可能。','Connected digitally.\nOpen to possibilities.'],description:['跨越時間與距離，\n探索更靈活、更貼近生活的金融體驗。','Across time and distance.\nExplore a more flexible banking experience.'],card:['更多可能，隨您探索。','More possibilities await.'],detail:['連結今天，想像下一個金融日常。','Connecting today to your financial tomorrow.'],status:['數位連結・無限想像','Connected to new possibilities']}
];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let slideIndex=0,activeLayer=0,transitioning=false,queuedSlide=null,paused=reduceMotion.matches,carouselTimer,motionGeneration=0,motionAnimations=[];
// Two persistent layers overlap while the shared floating container keeps its phase.
const firstStory=$('.brand-story'),firstCard=$('.finance-card');
const cardFloat=document.createElement('div');cardFloat.className='card-float';
firstCard.replaceWith(cardFloat);cardFloat.append(firstCard);
for(const [id,key] of [['brand-title','title'],['brand-description','description'],['card-title','card'],['card-description','detail'],['card-status','status']])$('#'+id).dataset.slideField=key;
const secondStory=firstStory.cloneNode(true),secondCard=firstCard.cloneNode(true);
for(const clone of [secondStory,secondCard])clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
firstStory.after(secondStory);cardFloat.append(secondCard);
const slideLayers=[{story:firstStory,card:firstCard},{story:secondStory,card:secondCard}];
slideLayers.forEach(layer=>Object.values(layer).forEach(el=>el.classList.add('motion-layer')));
function fillSlideLayer(layer,index){const slide=slides[index],language=locale==='en'?1:0;for(const root of Object.values(layer)){root.querySelectorAll('[data-slide-field]').forEach(el=>el.textContent=localizeChinese(slide[el.dataset.slideField][language]));root.querySelectorAll('[data-copy]').forEach(el=>el.textContent=t(el.dataset.copy))}}
function updateSlideControls(){$('.brand').dataset.slide=String(slideIndex);$$('.dot[data-slide]').forEach((b,j)=>{b.classList.toggle('active',j===slideIndex);b.setAttribute('aria-pressed',String(j===slideIndex));b.setAttribute('aria-label',bilingual('主題 ','Story ')+(j+1))})}
function settleLayers(){slideLayers.forEach((layer,i)=>Object.values(layer).forEach(el=>{el.classList.toggle('is-active',i===activeLayer);el.setAttribute('aria-hidden',String(i!==activeLayer))}))}
function renderSlide(){motionGeneration++;motionAnimations.forEach(a=>a.cancel());motionAnimations=[];transitioning=false;queuedSlide=null;slideLayers.forEach(layer=>fillSlideLayer(layer,slideIndex));settleLayers();updateSlideControls()}
async function changeSlide(index){
  if(transitioning){queuedSlide=index;return}if(index===slideIndex)return;
  if(reduceMotion.matches){slideIndex=index;renderSlide();return}
  transitioning=true;const generation=++motionGeneration,outgoing=slideLayers[activeLayer];activeLayer=1-activeLayer;const incoming=slideLayers[activeLayer];
  slideIndex=index;fillSlideLayer(incoming,index);settleLayers();updateSlideControls();
  const easing='cubic-bezier(.25,.55,.3,1)';
  motionAnimations=Object.keys(incoming).flatMap(key=>{
    if(key==='story')return [
      outgoing.story.animate([{opacity:1},{opacity:0}],{duration:1100,easing,fill:'both'}),
      incoming.story.animate([{opacity:0},{opacity:1}],{duration:1200,easing,fill:'both'})
    ];
    const tilt=key==='card'?.35:0;
    return [outgoing[key].animate([
      {opacity:1,transform:'translate3d(0,0,0) rotate(0deg)'},
      {opacity:.45,transform:`translate3d(-8px,-5px,0) rotate(${-tilt/2}deg)`,offset:.5},
      {opacity:0,transform:`translate3d(-18px,-3px,0) rotate(${-tilt}deg)`}
    ],{duration:1100,easing,fill:'both'}),incoming[key].animate([
      {opacity:0,transform:`translate3d(20px,10px,0) rotate(${tilt}deg)`},
      {opacity:.6,transform:`translate3d(7px,-2px,0) rotate(${tilt/3}deg)`,offset:.5},
      {opacity:1,transform:'translate3d(0,0,0) rotate(0deg)'}
    ],{duration:1200,easing,fill:'both'})];
  });
  await Promise.allSettled(motionAnimations.map(a=>a.finished));
  if(generation!==motionGeneration)return;
  motionAnimations.forEach(a=>a.cancel());motionAnimations=[];transitioning=false;
  const next=queuedSlide;queuedSlide=null;if(next!==null&&next!==slideIndex)changeSlide(next);
}
function scheduleCarousel(){clearInterval(carouselTimer);if(!paused&&!reduceMotion.matches)carouselTimer=setInterval(()=>{if(!document.hidden&&matchMedia('(min-width:1200px)').matches&&!dialog.open)changeSlide((slideIndex+1)%slides.length)},7000)}
function updateMotionButton(){const b=$('#motion-toggle');b.disabled=reduceMotion.matches;b.title=reduceMotion.matches?bilingual('已依系統設定減少動態效果','Reduced motion follows your system preference'):'';b.setAttribute('aria-label',paused?bilingual('播放動畫','Play animation'):bilingual('暫停動畫','Pause animation'));b.setAttribute('aria-pressed',String(paused));b.firstElementChild.textContent=paused?'▷':'Ⅱ';$('.brand').classList.toggle('paused',paused)}
$$('.dot[data-slide]').forEach(b=>b.addEventListener('click',()=>{changeSlide(Number(b.dataset.slide));scheduleCarousel()}));$('#motion-toggle').addEventListener('click',()=>{paused=!paused;updateMotionButton();scheduleCarousel()});reduceMotion.addEventListener('change',e=>{paused=e.matches;if(e.matches)renderSlide();updateMotionButton();scheduleCarousel()});
document.addEventListener('keydown',()=>state.lastActivity=Date.now());document.addEventListener('pointerdown',()=>state.lastActivity=Date.now());
setLanguage(locale);setInterval(tick,1000);scheduleCarousel();
