/* Authenticated adapter for the client-confirmed prototype. Business data and formulas remain in source files. */
let azureSession=null,azureBase=new URL('../../',location.href).href;
const C=(tc,sc,en)=>I18N.lang==='en'?en:I18N.lang==='zh-Hans'?sc:tc;
const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sendParent=(type,data={})=>{if(parent!==window)parent.postMessage({type,...data},location.origin);};
PORTAL_NAME.hq='全权管理者';
const originalKpi=kpi;kpi=function(label,value,foot=''){const html=originalKpi(label,value,foot);return String(value).includes('@')?html.replace('kpi-value','kpi-value contact-value'):html;};
const scopeHome=()=>azureSession?.role==='cust'?'home':'dashboard';
const nativeParseHash=parseHash;
parseHash=function(){
 const parts=location.hash.replace(/^#\/?/,'').split('/');
 if(['apply','join'].includes(parts[0])){
  const registry=parts[0]==='apply'?LINKS:AGENT_LINKS;
  if(!registry.some(x=>x.code===parts[1])){S.portal='public';S.page='invalid';S.arg=null;return;}
  nativeParseHash();return;
 }
 if(!azureSession){S.portal='locked';S.page='login';S.arg=null;return;}
 const role=azureSession.role;
 const page=parts[0]===role?parts[1]:scopeHome();
 const allowed=new Set(MENUS[role].map(m=>m[0]));if(role!=='cust')allowed.add('app');
 S.portal=role;S.page=allowed.has(page)?page:scopeHome();S.arg=parts[0]===role?parts[2]||null:null;
 if(S.page==='app'&&!appsInScope().some(a=>a.id===S.arg)){S.page='apps';S.arg=null;}
 const canonical=`#/${role}/${S.page}${S.arg?'/'+S.arg:''}`;
 if(location.hash!==canonical)history.replaceState({},'',canonical);
};
const nativeGo=go;
go=function(portal,page=null,arg=null){if(portal!==azureSession?.role&&!['public','apply','join'].includes(portal)){toast(C('此帳號沒有此功能權限。','此账号没有此功能权限。','This account has no access to this function.'));return;}nativeGo(portal,page,arg);};
function openPublic(kind,code){sendParent('azure-public',{route:`#/${kind}/${code}`});}
function publicUrl(kind,code){const u=new URL(azureBase);u.hash=`/${kind}/${code}`;return u.href;}
function copyDemoLink(kind,code){const url=publicUrl(kind,code);navigator.clipboard?.writeText(url).then(()=>toast(C('已複製連結','已复制链接','Link copied'))).catch(()=>modal(C('複製連結','复制链接','Copy link'),`<input class="input" readonly value="${E(url)}" onclick="this.select()">`));}
function languagePicker(){return `<select class="language-picker" aria-label="${C('語言','语言','Language')}" data-notr onchange="I18N.set(this.value)"><option value="zh-Hant" ${I18N.lang==='zh-Hant'?'selected':''}>繁體中文</option><option value="zh-Hans" ${I18N.lang==='zh-Hans'?'selected':''}>简体中文</option><option value="en" ${I18N.lang==='en'?'selected':''}>English</option></select>`;}
function headerControls(){return `<div class="header-controls"><button class="icon-btn" onclick="toggleTheme()" aria-label="${C('切換深色模式','切换深色模式','Toggle dark mode')}" title="${C('切換深色模式','切换深色模式','Toggle dark mode')}">${S.theme==='dark'?ICON.sun:ICON.moon}</button><button class="icon-btn" onclick="showNotifications()" aria-label="${C('通知','通知','Notifications')}">${ICON.bell}</button>${languagePicker()}</div>`;}
function showNotifications(){const records=azureSession?.role==='cust'?CPS.filter(c=>c.status!=='正常'):appsInScope().filter(a=>!['已开通','渠道驳回','已拒绝'].includes(a.status));modal(C('通知','通知','Notifications'),records.length?records.slice(0,6).map(r=>`<div class="notification-row"><b>${E(r.company||r.name||r.id)}</b>${statusBadge(r.status)}</div>`).join(''):`<p class="muted">${C('目前沒有待處理通知','目前没有待处理通知','No pending notifications')}</p>`);}
function azureMenu(){const role=azureSession.role;const off=role==='l2'&&!agent(azureSession.id).proxyApply;return NAV_GROUPS[role].map(([g,keys])=>`<li class="nav-group"><div class="nav-h">${g}</div><ul>${keys.map(k=>{const [,label]=MENUS[role].find(x=>x[0]===k);return `<li><a ${k==='apply'&&off?'aria-disabled="true" tabindex="-1"':`href="#/${role}/${k}"`} class="${S.page===k||S.page==='app'&&k==='apps'?'active':''} ${k==='apply'&&off?'disabled':''}">${NAVICON[k]||NAVICON.dashboard}<span>${label}</span></a></li>`;}).join('')}</ul></li>`).join('');}
shell=function(content){const me=ME[S.portal];return `<div class="app"><aside class="sidebar"><a class="brand" href="#/${S.portal}/${scopeHome()}"><img src="../../assets/d7a5f.png" alt="Azure ²"></a><div class="side-search">${ICON.search}<input type="search" placeholder="搜索菜单" aria-label="搜索菜单" oninput="filterNav(this.value)"></div><ul class="nav">${azureMenu()}</ul><button class="sidebar-account" onclick="accountPanel()"><span class="avatar">${E(me.user.slice(0,1))}</span><span><strong>${E(me.user)}</strong><small>${PORTAL_NAME[S.portal]}</small></span><span>›</span></button></aside><header class="header"><div class="header-left"><button class="icon-btn mobile-menu" onclick="openMenu()" aria-label="${C('選單','菜单','Menu')}">${ICON.more}</button><img class="mobile-logo" src="../../assets/d7a5f.png" alt="Azure ²"><div class="public-links"><button class="btn sm" onclick="openPublic('apply','HQ-SELF-01')">客户申请页</button><button class="btn sm" onclick="openPublic('join','HQ-AG-01')">代理注册页</button></div></div><div class="global-search"><div class="search-input">${ICON.search}<input id="global-search" type="search" autocomplete="off" placeholder="${C('搜尋客戶、交易、文件…','搜索客户、交易、文件…','Search customers, transactions, files…')}" oninput="azureSearch(this.value)" onkeydown="searchKey(event)" aria-label="${C('搜尋','搜索','Search')}" aria-controls="search-results" aria-expanded="false"><kbd>⌘ K</kbd><button class="search-close" onclick="closeSearch()" aria-label="Close">×</button></div><div id="search-results" class="search-results" hidden></div></div><button class="icon-btn mobile-search" onclick="showSearch()" aria-label="${C('搜尋','搜索','Search')}">${ICON.search}</button>${headerControls()}</header><main class="main" id="main"><div class="page-in">${content}</div><footer class="azure-footer">© 2026 Azure ²</footer></main></div>`;};
function openMenu(){modal(C('選單','菜单','Menu'),`<nav class="mobile-menu-body"><ul class="nav">${azureMenu()}</ul><div class="public-links"><button class="btn" onclick="openPublic('apply','HQ-SELF-01')">客户申请页</button><button class="btn" onclick="openPublic('join','HQ-AG-01')">代理注册页</button></div><button class="btn account-menu-btn" onclick="accountPanel()">${C('帳戶資訊','账户信息','Account information')}</button></nav>`);}
function showSearch(){document.querySelector('.header').classList.add('search-open');document.getElementById('global-search')?.focus();}
function closeSearch(){document.querySelector('.header')?.classList.remove('search-open');const el=$('#search-results');if(el)el.hidden=true;$('#global-search')?.setAttribute('aria-expanded','false');}
function azureSearch(query){const el=$('#search-results');if(!el)return;const q=query.trim().toLowerCase();if(!q){closeSearch();return;}const role=azureSession.role;const all=MENUS[role].filter(([k])=>!(role==='l2'&&k==='apply'&&!agent(azureSession.id).proxyApply)).map(([k,l])=>({label:I18N.tr(l),route:`#/${role}/${k}`,meta:C('功能','功能','Function')}));
 custsInScope().forEach(c=>all.push({label:I18N.tr(c.name),route:`#/${role}/${role==='cust'?'accounts':'customers'}`,meta:c.id}));
 if(role!=='cust')appsInScope().forEach(a=>all.push({label:I18N.tr(a.company),route:`#/${role}/app/${a.id}`,meta:a.id}));
 txsInScope().forEach(t=>all.push({label:t.id,route:`#/${role}/txs`,meta:I18N.tr(t.cp||t.type)}));
 const hits=all.filter(a=>(a.label+' '+a.meta).toLowerCase().includes(q)).slice(0,8);
 el.innerHTML=hits.length?hits.map(a=>`<a href="${E(a.route)}"><b>${E(a.label)}</b><small>${E(a.meta)}</small></a>`).join(''):`<p>${C('沒有符合的結果','没有符合的结果','No matching results')}</p>`;el.hidden=false;$('#global-search').setAttribute('aria-expanded','true');}
function searchKey(e){if(e.key==='Escape')closeSearch();if(e.key==='Enter')$('#search-results a')?.click();if(e.key==='ArrowDown'){e.preventDefault();$('#search-results a')?.focus();}}
function accountPanel(){const me=ME[azureSession.role];modal(C('帳戶資訊','账户信息','Account information'),`<div class="account-summary"><span class="avatar">${E(me.user.slice(0,1))}</span><div><strong>${E(me.user)}</strong><small>${E(azureSession.organization)} · ${PORTAL_NAME[azureSession.role]}</small></div></div><div class="field"><label>${C('名稱','名称','Name')}</label><input class="input" id="profile-name" value="${E(me.user)}"></div><div class="field"><label>${C('電郵','电邮','Email')}</label><input class="input" id="profile-email" type="email" value="${E(me.email)}" readonly><small class="muted">${C('登入電郵固定於示範帳號','登录电邮固定于示范账号','Login email belongs to the demo account')}</small></div><div class="form-grid"><div class="field"><label>${C('字體大小','字体大小','Font size')}</label><select class="select" onchange="setFontSize(this.value)"><option value="normal">${C('標準','标准','Standard')}</option><option value="large" ${document.documentElement.dataset.font==='large'?'selected':''}>${C('較大','较大','Large')}</option></select></div><div class="field"><label>${C('顯示模式','显示模式','Theme')}</label><select class="select" onchange="setTheme(this.value)"><option value="light" ${S.theme==='light'?'selected':''}>${C('淺色','浅色','Light')}</option><option value="dark" ${S.theme==='dark'?'selected':''}>${C('深色','深色','Dark')}</option></select></div></div><div class="btn-row"><button class="btn" onclick="go('${azureSession.role}','settings');closeModal()">${C('帳戶設定','账户设置','Account settings')}</button>${azureSession.role==='hq'?`<button class="btn" onclick="inviteUser()">${C('協助建立帳號／邀請','协助建立账号／邀请','Create account / invite')}</button>`:''}</div>`,`<button class="btn" onclick="sendParent('azure-logout')">${C('登出','登出','Sign out')}</button><button class="btn primary" onclick="saveProfile()">${C('保存','保存','Save')}</button>`);}
function saveProfile(){const name=$('#profile-name').value.trim();if(!name)return;ME[azureSession.role].user=name;azureSession.name=name;closeModal();render();toast(C('已保存此瀏覽期間的帳戶資料','已保存此浏览期间的账户资料','Account details saved for this session'));}
function setFontSize(value){document.documentElement.dataset.font=value;localStorage.setItem('azure-font',value);}
function setTheme(value){S.theme=value;localStorage.setItem('azure-theme',value);render();}
toggleTheme=function(){setTheme(S.theme==='dark'?'light':'dark');};
const nativeLocaleSet=I18N.set.bind(I18N);I18N.set=function(lang){nativeLocaleSet(lang);sendParent('azure-locale',{locale:lang});};
I18N.switcher=languagePicker;
const originalRender=render;
render=function(){
 if(!azureSession&&S.portal!=='public'){$('#root').innerHTML=`<div class="locked"><img src="../../assets/d7a5f.png" alt="Azure ²"><p>${C('請先登入以開啟 CMS','请先登录以开启 CMS','Sign in to open CMS')}</p><a class="btn primary" href="../../index.html" target="_top">${C('登入','登录','Sign in')}</a></div>`;return;}
 if(S.page==='invalid'){$('#root').innerHTML=`<div class="locked"><h1>${C('邀請連結無效','邀请链接无效','Invalid invitation link')}</h1><a class="btn" href="../../index.html" target="_top">${C('返回登入','返回登录','Back to sign in')}</a></div>`;return;}
 originalRender();I18N.run();
};
const originalAfter=afterRender;
afterRender=function(){
 document.querySelectorAll('.qr[data-url]').forEach(el=>{const code=el.dataset.url.split('/').pop();const kind=el.dataset.url.includes('join.')?'join':'apply';el.dataset.url=publicUrl(kind,code);const box=el.closest('.qr-box');box?.querySelectorAll('button').forEach(b=>{if(/复制/.test(b.textContent)){b.onclick=()=>copyDemoLink(kind,code);b.removeAttribute('onclick');b.addEventListener('click',()=>copyDemoLink(kind,code));}});});
 originalAfter();enhanceLayout();
};
const originalChart=chart;
chart=function(id,cfg){if(id==='dProd'){
 cfg.options.plugins.legend.display=false;
 const host=document.getElementById(id)?.parentElement;if(host){host.classList.add('revenue-chart');const holder=document.createElement('div');holder.className='donut-holder';const canvas=document.getElementById(id);host.insertBefore(holder,canvas);holder.append(canvas);const labels=cfg.data.labels,ds=cfg.data.datasets[0];host.insertAdjacentHTML('beforeend',`<ul class="chart-legend">${labels.map((l,i)=>`<li><i style="background:${ds.backgroundColor[i]}"></i><span>${I18N.tr(l)}</span><strong>${nf(ds.data[i])}</strong></li>`).join('')}</ul>`);}}
 originalChart(id,cfg);
};
function enhanceLayout(){
 const root=$('#root');root.querySelectorAll('.kpi-value').forEach(el=>{if(el.textContent.includes('@')){el.classList.add('contact-value');el.closest('.kpi').classList.add('contact-kpi');}});
 const page=$('.page-in'),head=page?.querySelector(':scope>.page-head');
 if(head){const actions=head.querySelector(':scope>.btn-row');if(actions?.children.length){const trigger=document.createElement('button');trigger.className='btn operation-trigger';trigger.textContent=C('操作','操作','Actions');trigger.onclick=()=>document.querySelector('.operations')?.classList.toggle('open');head.append(trigger);
 const grid=document.createElement('div');grid.className='workspace-grid';const body=document.createElement('div');body.className='workspace-body';const rail=document.createElement('aside');rail.className='operations';rail.setAttribute('aria-label',C('操作','操作','Actions'));rail.append(actions);page.append(grid);const nodes=[...page.childNodes].filter(n=>n!==head&&n!==grid);nodes.forEach(n=>body.append(n));grid.append(body,rail);}
 }
 root.querySelectorAll('table').forEach(t=>{if(!t.closest('.tbl-wrap')&&!t.closest('.doc-preview')){const wrap=document.createElement('div');wrap.className='tbl-wrap';t.parentNode.insertBefore(wrap,t);wrap.append(t);}});
 root.querySelectorAll('.field').forEach(field=>{const label=field.querySelector(':scope>label');if(!label)return;
 if(/风险评级|風險評級|Risk Rating|风控级别|風控級別|Risk Level/.test(label.textContent)){
  const input=field.querySelector('input,select');if(input&&!input.hidden){const val=input.value;input.hidden=true;input.disabled=true;const result=document.createElement('div');result.className='risk-result';result.innerHTML=`<span class="badge warn">${E(I18N.tr(val))}</span><small>${C('系統判定','系统判定','System determined')}</small>`;field.append(result);const small=field.querySelector('small');if(small&&small!==result.querySelector('small'))small.textContent=C('依已確認風控資料顯示','依已确认风控资料显示','Shows the confirmed risk result');}}
 });
 root.querySelectorAll('td').forEach(td=>{if(/无命中|無命中|No match|No hit/.test(td.textContent)&&td.querySelector('.badge')){td.classList.add('screening-result');td.title=C('成功表示篩查已完成；無命中表示本次未找到與名單相符的紀錄。','成功表示筛查已完成；无命中表示本次未找到与名单相符的记录。','Successful screening; no matching list record was found.');}});
 if(S.page==='app'){
  const a=APPLICATIONS.find(x=>x.id===S.arg);const cards=[...root.querySelectorAll('.card')];const cs=cards.find(el=>el.querySelector('.card-title')?.textContent==='CS 工作台'||el.querySelector('.card-title')?.textContent==='CS 工作臺');if(cs){cs.classList.add('cs-workspace');const mainCols=cs.parentElement.parentElement;if(mainCols?.classList.contains('grid')){mainCols.classList.add('application-content');cs.parentElement.classList.add('cs-main-column');}}
  if(a?.status==='待董事验证'&&S.portal==='hq'){const rail=$('.operations>.btn-row');if(rail){const b=document.createElement('button');b.className='btn';b.textContent=C('開啟證件拍照／人像驗證','开启证件拍照／人像验证','Open ID / face capture');b.onclick=()=>window.AzureFiles?.identityDialog();rail.prepend(b);}}
  const compliance=cards.find(c=>/合[规規][审審]核|Compliance Review/.test(c.querySelector('.card-title')?.textContent||''));if(compliance&&!compliance.querySelector('.screening-hint')){const first=compliance.querySelector('.card-pad>div');first?.insertAdjacentHTML('beforeend',`<p class="small muted screening-hint">${C('成功：篩查完成。無命中：本次沒有與名單相符的紀錄。','成功：筛查完成。无命中：本次没有与名单相符的记录。','Success: screening completed. No match: no corresponding list record found.')}</p>`);}
 }
 if(S.page==='recruit'&&S.ui.rt==='links'){const qrGrid=root.querySelector('.qr-box')?.closest('.grid.g2');const row=qrGrid?.parentElement;if(row?.classList.contains('grid')){row.classList.add('recruit-layout');qrGrid.classList.add('recruit-links');qrGrid.previousElementSibling?.classList.add('recruit-form');}}
 root.querySelectorAll('.tabs+.toolbar').forEach(toolbar=>{const tabs=toolbar.previousElementSibling;const wrap=document.createElement('div');wrap.className='tab-toolbar';tabs.parentNode.insertBefore(wrap,tabs);wrap.append(tabs,toolbar);});
 if(S.portal==='public'){
  const top=$('.public-top');if(top){top.innerHTML=`<img class="public-logo" src="../../assets/d7a5f.png" alt="Azure ²"><div class="public-links"><a class="btn sm" href="${E(publicUrl('apply','HQ-SELF-01'))}" target="_top">客户申请页</a><a class="btn sm" href="${E(publicUrl('join','HQ-AG-01'))}" target="_top">代理注册页</a></div><div style="flex:1"></div><a class="link back-login" href="../../index.html" target="_top">${C('登入','登录','Sign in')}</a><button class="icon-btn" onclick="toggleTheme()" aria-label="Toggle theme">${S.theme==='dark'?ICON.sun:ICON.moon}</button>${languagePicker()}`;}
  root.querySelectorAll('a[href^="#/hq/"],a[href^="#/l1/"],a[href^="#/l2/"]').forEach(a=>{a.href='../../index.html';a.target='_top';a.textContent=C('返回登入','返回登录','Back to sign in');});
  root.querySelectorAll('.public-body>p.small').forEach(p=>p.textContent=C('互動示範：資料僅保留於此瀏覽期間，未提交到銀行。','互动示范：资料仅保留于此浏览期间，未提交到银行。','Interactive demo: data stays in this session and is not submitted to a bank.'));
  if(!root.querySelector('.azure-footer'))root.querySelector('.public-body')?.insertAdjacentHTML('beforeend','<footer class="azure-footer">© 2026 Azure ²</footer>');
 }
 window.AzureFiles?.enhance();
}
const originalToast=toast;
toast=function(msg){originalToast(I18N.tr(msg));};
// Demo invitations are local records; no outgoing email request is made.
inviteUser=function(){modal(C('邀請用戶','邀请用户','Invite user'),`<div class="field"><label>${C('電郵（登入帳號）','电邮（登录账号）','Email (login account)')}</label><input id="invite-email" class="input" type="email" required></div><div class="field"><label>${C('名稱','名称','Name')}</label><input id="invite-name" class="input"></div><div class="field"><label>${C('角色','角色','Role')}</label><select id="invite-role" class="select">${['操作员','复核员','只读','财务','管理员'].map(x=>`<option value="${x}">${I18N.tr(x)}</option>`).join('')}</select></div>${note(C('此示範建立本機待邀請紀錄，不會發送電郵。有效期 72 小時。','此示范建立本机待邀请记录，不会发送电邮。有效期 72 小时。','Creates a local pending invitation. No email is sent. Valid for 72 hours.'))}`,`<button class="btn" onclick="closeModal()">${C('取消','取消','Cancel')}</button><button class="btn primary" onclick="saveInvitation()">${C('建立邀請','建立邀请','Create invitation')}</button>`);};
function saveInvitation(){const email=$('#invite-email'),name=$('#invite-name').value.trim();if(!email.checkValidity()||!name){email.reportValidity();return;}const org=azureSession.id;USERS[org]||=[];USERS[org].push({email:email.value,name,role:$('#invite-role').value,last:'—',status:'待审批'});closeModal();S.ui.st='users';go(azureSession.role,'settings');render();toast(C('已建立待邀請紀錄（Demo）','已建立待邀请记录（Demo）','Pending invitation created (Demo)'));}
window.AzureBridge={get state(){return S;},get account(){return azureSession;},get base(){return azureBase;},render:()=>render(),toast:msg=>toast(msg),modal:(...args)=>modal(...args),close:()=>closeModal(),escape:E,copy:C,
 get wizard(){return wiz();},blank:company=>kycBlank(company),setPath:kSetPath,get kyc(){return S.kf;},qr:(el,text)=>new QRCode(el,{text,width:180,height:180,correctLevel:QRCode.CorrectLevel.M})};
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='azure-session')return;const d=e.data;
 if(d.account&&!MENUS[d.account.role])return;
 azureSession=d.account?{...d.account}:null;azureBase=d.base||azureBase;
 if(azureSession){Object.assign(ME[azureSession.role],{org:azureSession.id,user:azureSession.name,email:azureSession.email,orgName:azureSession.organization});}
 S.theme=localStorage.getItem('azure-theme')||'light';setFontSize(localStorage.getItem('azure-font')||'normal');parseHash();I18N.set(d.locale||'zh-Hant');render();
});
document.addEventListener('click',e=>{sendParent('azure-activity');const a=e.target.closest('a[href^="#/apply/"],a[href^="#/join/"]');if(a&&azureSession){e.preventDefault();const [,kind,code]=a.getAttribute('href').split('/');openPublic(kind,code);}if(e.target.closest('.mobile-menu-body a'))closeModal();if(!e.target.closest('.global-search'))closeSearch();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();showSearch();}});
sendParent('azure-ready');if(parent===window){parseHash();I18N.set('zh-Hant');render();}

for(const dict of [window.I18N_HANT?.d,window.I18N_EN])if(dict){for(const [k,v] of Object.entries({...dict}))if(k.includes('总后台'))dict[k.replaceAll('总后台','全权管理者')]=String(v).replaceAll('總後台','全權管理者').replaceAll('HQ','Full administrator');}
const originalJoinNext=joinNext;
joinNext=function(){const st=S.join;if(st.step===0){const name=$('#jName'),email=$('#jEmail'),contact=$('#jContact');if(!name.value.trim()||!contact.value.trim()||!email.value.trim()||!email.checkValidity()){email.reportValidity();toast(C('請填寫名稱、聯絡人及有效電郵。','请填写名称、联系人及有效电邮。','Enter a name, contact and valid email.'));return;}}if(st.step===2){const no=st.values?.bankNo||'';if(!no.trim()){toast(C('請填寫佣金收款帳號。','请填写佣金收款账号。','Enter the commission bank account number.'));return;}}originalJoinNext();};
const originalJoinSubmit=joinSubmit;
joinSubmit=function(){const terms=document.querySelector('.public-body input[type=checkbox]');if(!terms?.checked){toast(C('請閱讀並同意協議及私隱政策。','请阅读并同意协议及隐私政策。','Read and accept the agreement and privacy policy.'));return;}const st=S.join;originalJoinSubmit();const record=AGENT_APPS.find(a=>a.id===st.done);if(record&&st.values)Object.assign(record,{phone:st.values.phone||'',br:st.values.br||'',channel:st.values.channel||'',est:st.values.est||'',bank:[st.values.bank,st.values.bankCcy,st.values.bankName,st.values.bankNo].filter(Boolean).join(' · ')});};
const originalWizSubmit=wizSubmit;
wizSubmit=function(ctx){const terms=document.querySelector('.page-in input[type=checkbox],.public-body input[type=checkbox]');if(!terms?.checked){toast(C('請確認資料及同意服務條款。','请确认资料及同意服务条款。','Confirm the information and accept the terms.'));return;}originalWizSubmit(ctx);};
const originalEnsureK=wizEnsureK;
wizEnsureK=function(){const w=wiz(),fresh=!w.k,k=originalEnsureK();if(fresh){k.contact=w.contact||'';k.email=w.email||'';k.phone=w.phone||'+852 ';}return k;};

const originalHead=head;head=function(title,...args){return originalHead(E(title),...args);};
