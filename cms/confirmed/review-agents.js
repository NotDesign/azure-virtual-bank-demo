/* VA Bank review: agent discovery and scoped, session-local recruitment. */
(() => {
  'use strict';
  const tr = (tc, sc, en) => C(tc, sc, en);
  const safe = value => E(value);
  const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  const matchText = (record, q) => !q || normalize([record.id, record.name, I18N.tr(record.name), record.email, record.contact].filter(Boolean).join(' ')).includes(normalize(q));
  const accountRole = () => AzureBridge.account?.role;
  const allowedL1 = a => a.level === 1 && a.status === '启用' && !a.frz?.scopes?.includes('links');
  const plainTag = value => typeof value === 'string' && value.length <= 80 && !/[<>\u0000-\u001F\u007F-\u009F]/.test(value);
  const datePlus = days => { const d = new Date(TODAY + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  const statusKey = a => a.frz ? 'frozen' : a.status === '启用' ? 'enabled' : 'disabled';
  const statusText = a => a.frz ? tr('已凍結', '已冻结', 'Frozen') : I18N.tr(a.status);
  const treeState = { query: '', level: '', status: '' };
  let pickState = null;

  function treeNode(a, children = '') {
    return `<li data-review-agent="${safe(a.id)}"><button class="btn review-agent-node ${S.ui.ag === a.id || !S.ui.ag && a.id === 'A001' ? 'on' : ''}" onclick="setUI('ag','${safe(a.id)}')"><span class="badge ${a.level === 1 ? 'info' : ''}">${a.level === 1 ? tr('一級', '一级', 'L1') : tr('二級', '二级', 'L2')}</span><span class="review-agent-name"><b>${safe(I18N.tr(a.name))}</b><small>${safe(a.id)} · ${safe(statusText(a))}</small></span><span class="review-agent-count" title="${tr('客戶數', '客户数', 'Customers')}">${custsOf(a.id).length}</span></button>${children ? `<ul>${children}</ul>` : ''}</li>`;
  }
  function treeMarkup() {
    return `<div class="review-agent-search"><label for="review-agent-query">${tr('搜尋代理', '搜索代理', 'Find agents')}</label><input id="review-agent-query" class="input" type="search" value="${safe(treeState.query)}" placeholder="${tr('名稱、聯絡人或代理 ID', '名称、联系人或代理 ID', 'Name, contact or agent ID')}" oninput="reviewAgentFilter('query',this.value)"><div class="review-agent-selects"><select class="select" aria-label="${tr('代理級別', '代理级别', 'Agent level')}" onchange="reviewAgentFilter('level',this.value)">${[['', tr('全部級別', '全部级别', 'All levels')], ['1', tr('一級代理', '一级代理', 'Level 1')], ['2', tr('二級代理', '二级代理', 'Level 2')]].map(([v,l]) => `<option value="${v}" ${treeState.level === v ? 'selected' : ''}>${l}</option>`).join('')}</select><select class="select" aria-label="${tr('代理狀態', '代理状态', 'Agent status')}" onchange="reviewAgentFilter('status',this.value)">${[['', tr('全部狀態', '全部状态', 'All statuses')], ['enabled', tr('啟用', '启用', 'Enabled')], ['frozen', tr('已凍結', '已冻结', 'Frozen')], ['disabled', tr('停用', '停用', 'Disabled')]].map(([v,l]) => `<option value="${v}" ${treeState.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="review-filter-result"><small id="review-agent-result" class="muted" aria-live="polite"></small><button class="btn sm" onclick="reviewAgentReset()">${tr('重設', '重置', 'Reset')}</button></div></div><ul class="tree review-agent-tree"><li><div class="review-agent-root"><b>${tr('全權管理者 · 自營', '全权管理者 · 自营', 'Administrator · Direct')}</b><small class="muted">${CUSTOMERS.filter(c => !c.l1).length} ${tr('客戶', '客户', 'customers')}</small></div><ul>${AGENTS.filter(a => a.level === 1).map(a => treeNode(a, AGENTS.filter(b => b.level === 2 && b.parent === a.id).map(b => treeNode(b)).join(''))).join('')}</ul></li></ul><p id="review-agent-empty" class="empty" hidden>${tr('沒有符合條件的代理', '没有符合条件的代理', 'No matching agents')}</p>`;
  }
  window.reviewAgentFilter = (key, value) => {
    if (!Object.hasOwn(treeState, key)) return;
    treeState[key] = value;
    let count = 0;
    const matches = new Set(AGENTS.filter(a => matchText(a, treeState.query) && (!treeState.level || String(a.level) === treeState.level) && (!treeState.status || statusKey(a) === treeState.status)).map(a => a.id));
    document.querySelectorAll('[data-review-agent]').forEach(li => {
      const a = AGENTS.find(a => a.id === li.dataset.reviewAgent);
      const direct = matches.has(a.id);
      const descendant = a.level === 1 && AGENTS.some(b => b.parent === a.id && matches.has(b.id));
      li.hidden = !direct && !descendant;
      li.classList.toggle('review-agent-context', !direct && descendant);
      if (direct) count++;
    });
    const result = document.getElementById('review-agent-result');
    if (result) result.textContent = tr(`符合 ${count} 位代理`, `符合 ${count} 位代理`, `${count} matching agents`);
    const empty = document.getElementById('review-agent-empty');
    if (empty) empty.hidden = count > 0;
  };
  window.reviewAgentReset = () => { Object.assign(treeState, {query:'',level:'',status:''}); render(); };

  const hqAgents = PAGES['hq:agents'];
  PAGES['hq:agents'] = () => {
    const template = document.createElement('template'); template.innerHTML = hqAgents();
    const tree = template.content.querySelector('.tree');
    if (tree) { const card = tree.closest('.card'); card.classList.add('review-agent-directory'); card.innerHTML = treeMarkup(); card.parentElement.classList.add('review-agents-layout'); }
    const actions = template.content.querySelector('.page-head > .btn-row');
    actions?.insertAdjacentHTML('beforeend', `<button class="btn" onclick="reviewRecruitL2()">${ICON.plus} ${tr('招募二級代理', '招募二级代理', 'Recruit level 2 agent')}</button>`);
    return template.innerHTML;
  };

  function encodeLink(link) {
    const data = JSON.stringify({v:1,code:link.code,parent:link.org,ratio:link.ratio,tag:link.tag,exp:link.exp,created:link.created});
    return btoa(String.fromCharCode(...new TextEncoder().encode(data))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function restoreLink(token, code) {
    try {
      if (token.length > 1400 || !/^[A-Za-z0-9_-]+$/.test(token)) return;
      const data = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(token.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0))));
      const parent = AGENTS.find(a => a.id === data.parent && allowedL1(a));
      if (data.v !== 1 || !parent || data.code !== code || !new RegExp('^' + parent.id + '-AG-D[A-Z0-9]{8}$').test(code) || !Number.isFinite(data.ratio) || data.ratio < 0 || data.ratio > 100 || !plainTag(data.tag) || !(/^\d{4}-\d{2}-\d{2}$/.test(data.exp) || data.exp === '长期') || !/^\d{4}-\d{2}-\d{2}$/.test(data.created)) return;
      if (data.exp !== '长期' && data.exp < TODAY) return;
      if (!AGENT_LINKS.some(l => l.code === code)) AGENT_LINKS.push({code, org:parent.id, level:2, ratio:data.ratio, tpl:'', tag:data.tag, exp:data.exp, created:data.created, uses:0, _reviewDemo:true});
      return true;
    } catch { /* Invalid demo invitation stays invalid. */ }
    return false;
  }
  const parse = parseHash;
  parseHash = function() {
    const parts = location.hash.replace(/^#\/?/,'').split('/');
    if (parts[0] === 'join' && (parts[2] === 'demo' || /^A\d{3}-AG-D[A-Z0-9]{8}$/.test(parts[1]))) {
      if (parts[2] !== 'demo' || !parts[3] || !restoreLink(parts[3], parts[1])) { S.portal='public';S.page='invalid';S.arg=null;return; }
    }
    return parse();
  };
  const linkUrl = publicUrl;
  publicUrl = function(kind, code) {
    const url = linkUrl(kind, code), link = AGENT_LINKS.find(l => l.code === code);
    return kind === 'join' && link?._reviewDemo ? url + '/demo/' + encodeLink(link) : url;
  };
  const launchPublic = openPublic;
  openPublic = function(kind, code) {
    if (kind === 'join' && accountRole() === 'l2') return;
    if (kind === 'join' && accountRole() === 'l1' && code === 'HQ-AG-01') {
      const own = AGENT_LINKS.find(l => l.level === 2 && l.org === ME.l1.org && (l.exp === '长期' || l.exp >= TODAY));
      if (!own) { S.ui.rt = 'links'; go('l1','recruit'); return; }
      code = own.code;
    }
    const link = AGENT_LINKS.find(l => l.code === code);
    if (kind === 'join' && link?._reviewDemo) {
      const route = new URL(publicUrl(kind,code)).hash;
      if (parent === window) window.open(publicUrl(kind,code),'_blank','noopener');
      else sendParent('azure-public',{route});
      return;
    }
    return launchPublic(kind,code);
  };

  window.reviewRecruitL2 = (parentId = '') => {
    if (accountRole() !== 'hq') return;
    const parents = AGENTS.filter(allowedL1);
    if (!parents.length) return toast(tr('沒有可招募的啟用一級代理。','没有可招募的启用一级代理。','No enabled level 1 agent is available.'));
    modal(tr('招募二級代理', '招募二级代理', 'Recruit level 2 agent'), `<p class="muted">${tr('指定所屬一級代理後產生招募連結。申請由該一級代理審批。','指定所属一级代理后生成招募链接。申请由该一级代理审批。','Choose the owning level 1 agent. That agent reviews the application.')}</p><div class="field"><label for="review-l2-parent">${tr('所屬一級代理', '所属一级代理', 'Owning level 1 agent')}</label><select class="select" id="review-l2-parent">${parents.map(a=>`<option value="${safe(a.id)}" ${a.id === parentId || !parentId && a.id === S.ui.ag ? 'selected' : ''}>${safe(a.id)} · ${safe(I18N.tr(a.name))}</option>`).join('')}</select></div><div class="field"><label for="review-l2-ratio">${tr('預設佣金比例（一級價差 %）', '默认佣金比例（一级价差 %）', 'Default commission (% of level 1 spread)')}</label><input class="input" type="number" min="0" max="100" step="1" id="review-l2-ratio" value="40"></div><div class="form-grid"><div class="field"><label for="review-l2-tag">${tr('來源標籤', '来源标签', 'Source tag')}</label><input class="input" maxlength="80" id="review-l2-tag" placeholder="${tr('例：商會、展會', '例：商会、展会', 'e.g. Conference')}"></div><div class="field"><label for="review-l2-exp">${tr('有效期', '有效期', 'Valid for')}</label><select class="select" id="review-l2-exp"><option value="30">${tr('30 天', '30 天', '30 days')}</option><option value="90">${tr('90 天', '90 天', '90 days')}</option><option value="长期">${tr('長期', '长期', 'No expiry')}</option></select></div></div>${note(tr('Demo：只建立示範招募連結，不會寄出電郵。二級代客申請維持預設關閉，須由一級代理另行開啟。','Demo：只创建示范招募链接，不会发送邮件。二级代客申请保持默认关闭，须由一级代理另行开启。','Demo: creates an invitation link only. No email is sent. Proxy applications remain off until enabled by the level 1 agent.'))}`, `<button class="btn" onclick="closeModal()">${tr('取消','取消','Cancel')}</button><button class="btn primary" onclick="reviewCreateL2Link()">${tr('生成連結與 QR Code','生成链接与 QR Code','Create link and QR code')}</button>`);
  };
  window.reviewCreateL2Link = () => {
    if (accountRole() !== 'hq') return;
    const org = document.getElementById('review-l2-parent')?.value;
    const parentAgent = AGENTS.find(a => a.id === org && allowedL1(a));
    const input = document.getElementById('review-l2-ratio'), ratio = Number(input?.value);
    if (!parentAgent || !input?.value.trim() || !Number.isFinite(ratio) || ratio < 0 || ratio > 100) { input?.reportValidity(); return toast(tr('請選擇有效一級代理並輸入 0–100 的比例。','请选择有效一级代理并输入 0–100 的比例。','Choose a valid level 1 agent and enter a ratio from 0 to 100.')); }
    const expiry = document.getElementById('review-l2-exp').value;
    const tag = document.getElementById('review-l2-tag').value;
    if (!plainTag(tag)) return toast(tr('來源標籤請使用 80 字以內的純文字。','来源标签请使用 80 字以内的纯文本。','Use plain text up to 80 characters for the source tag.'));
    const code = `${org}-AG-D${crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase()}`;
    const link = {code,org,level:2,tpl:'',ratio,tag:tag.trim() || tr('平台協助招募','平台协助招募','Platform recruitment'),exp:expiry === '长期' ? expiry : datePlus(Number(expiry)),uses:0,created:TODAY,_reviewDemo:true};
    AGENT_LINKS.unshift(link);
    reviewShowL2Link(code);
  };
  const createAgentLink = newAgentLink;
  newAgentLink = function(level) {
    if (level !== 2 || accountRole() !== 'l1') return createAgentLink(level);
    const org = ME.l1.org, owner = AGENTS.find(a=>a.id === org && allowedL1(a));
    if (!owner) return toast(tr('此代理目前不能建立招募連結。','此代理目前不能创建招募链接。','Recruitment links are unavailable for this agent.'));
    const ratioInput = document.getElementById('agRatio'), ratio = Number(ratioInput?.value);
    if (!ratioInput?.value.trim() || !Number.isFinite(ratio) || ratio < 0 || ratio > 100) return toast(tr('佣金比例須為 0–100。','佣金比例须为 0–100。','The commission ratio must be from 0 to 100.'));
    const expiry = document.getElementById('agExp')?.value || '长期';
    const tag = document.getElementById('agTag')?.value || '';
    if (!plainTag(tag)) return toast(tr('來源標籤請使用 80 字以內的純文字。','来源标签请使用 80 字以内的纯文本。','Use plain text up to 80 characters for the source tag.'));
    AGENT_LINKS.unshift({code:`${org}-AG-D${crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase()}`,org,level:2,tpl:'',ratio,tag:tag.trim() || tr('未分類','未分类','Uncategorized'),uses:0,exp:expiry === '30 天' ? datePlus(30) : expiry,created:TODAY,_reviewDemo:true});
    toast(tr('已生成二級招募連結與 QR Code（Demo）','已生成二级招募链接与 QR Code（Demo）','Level 2 invitation and QR code created (Demo)')); render();
  };
  window.reviewShowL2Link = code => {
    if (accountRole() !== 'hq') return;
    const link = AGENT_LINKS.find(l=>l.code === code && l.level === 2 && l._reviewDemo);
    if (!link) return;
    modal(tr('二級招募連結已建立', '二级招募链接已创建', 'Level 2 invitation created'), `<div class="review-recruit-result"><div class="qr" id="review-l2-qr"></div><div><b class="mono">${safe(code)}</b><p>${safe(I18N.tr(agent(link.org).name))} · ${safe(link.org)}</p><p class="muted">${tr('二級代理申請由所屬一級審批','二级代理申请由所属一级审批','Applications are reviewed by the owning level 1 agent')}</p><p>${tr('預設比例','默认比例','Default ratio')} ${link.ratio}% · ${tr('有效期','有效期','Expiry')} ${safe(link.exp)}</p></div></div><div class="field"><label for="review-l2-url">${tr('招募連結（Demo）','招募链接（Demo）','Invitation URL (Demo)')}</label><input class="input" id="review-l2-url" readonly value="${safe(publicUrl('join',code))}" onclick="this.select()"></div>`, `<button class="btn" onclick="closeModal();render()">${tr('完成','完成','Done')}</button><button class="btn" onclick="copyDemoLink('join','${safe(code)}')">${tr('複製連結','复制链接','Copy link')}</button><button class="btn primary" onclick="openPublic('join','${safe(code)}')">${tr('開啟二級註冊頁','打开二级注册页','Open level 2 registration')}</button>`);
    AzureBridge.qr(document.getElementById('review-l2-qr'), publicUrl('join',code));
  };
  const recruit = PAGES['*:recruit'];
  PAGES['*:recruit'] = () => {
    let html = recruit();
    if (S.portal !== 'hq') return html;
    const template = document.createElement('template'); template.innerHTML = html;
    template.content.querySelector('.page-head > .btn-row')?.insertAdjacentHTML('beforeend', `<button class="btn primary" onclick="reviewRecruitL2()">${ICON.plus} ${tr('招募二級代理','招募二级代理','Recruit level 2 agent')}</button>`);
    html = template.innerHTML;
    const links = AGENT_LINKS.filter(l=>l._reviewDemo && l.level === 2);
    if (links.length) html += `<section class="card review-l2-created"><div class="card-head"><h3 class="card-title">${tr('平台協助建立的二級招募連結','平台协助创建的二级招募链接','Platform-created level 2 invitations')}</h3></div><div class="card-pad">${links.map(l=>`<div class="review-created-row"><div><b>${safe(l.code)}</b><small>${safe(I18N.tr(agent(l.org).name))} · ${safe(l.org)} · ${l.ratio}%</small></div><button class="btn sm" onclick="reviewShowL2Link('${safe(l.code)}')">${tr('查看連結與 QR','查看链接与 QR','View link and QR')}</button></div>`).join('')}</div></section>`;
    return html;
  };

  function updatePublicEntrypoints() {
    const role = accountRole();
    if (!['l1','l2'].includes(role)) return;
    document.querySelectorAll('.header .public-links button,.mobile-menu-body .public-links button').forEach(button => {
      if (!button.getAttribute('onclick')?.includes("openPublic('join'")) return;
      if (role === 'l2') { button.remove(); return; }
      button.textContent = tr('二級代理註冊頁','二级代理注册页','Level 2 registration');
      button.title = tr('招募至我的一級代理團隊','招募至我的一级代理团队','Recruit into my level 1 team');
    });
  }
  const menu = openMenu;
  openMenu = function(...args) { menu(...args); updatePublicEntrypoints(); };

  const canApproveAgent = a => !!a && (accountRole() === 'hq' ? a.level === 1 && a.parent === 'HQ' : accountRole() === 'l1' && a.level === 2 && a.parent === ME.l1.org);
  const approvalDenied = () => toast(tr('此帳號沒有審批該代理的權限。','此账号没有审批该代理的权限。','This account cannot review that agent application.'));
  const applicationDetail = agentAppDetail;
  agentAppDetail = function(id) {
    const a = AGENT_APPS.find(a=>a.id === id);
    if (!a || accountRole() !== 'hq' && !canApproveAgent(a)) return approvalDenied();
    applicationDetail(id);
    const ratio = document.getElementById('apRatio');
    if (a.level === 2 && ratio) {
      ratio.value = String(AGENT_LINKS.find(l=>l.code === a.via)?.ratio ?? 40);
      ratio.type='number';ratio.min='0';ratio.max='100';ratio.step='any';
    }
    if (!canApproveAgent(a)) {
      document.querySelectorAll('.modal-foot button[onclick]').forEach(b=>{if(/approveAgent|agentAppSet/.test(b.getAttribute('onclick')))b.remove();});
      document.querySelectorAll('#apRatio,#apProxy').forEach(el=>el.disabled=true);
      document.querySelector('.modal-body')?.insertAdjacentHTML('afterbegin',note(tr('二級申請由所屬一級代理審批，此處僅供查看。','二级申请由所属一级代理审批，此处仅供查看。','Level 2 applications are reviewed by their owning level 1 agent. This view is read-only.')));
    }
  };
  const setApplication = agentAppSet;
  agentAppSet = function(id,status) { const a=AGENT_APPS.find(a=>a.id === id);if(!canApproveAgent(a))return approvalDenied();return setApplication(id,status); };
  const approveApplication = approveAgent;
  approveAgent = function(id) {
    const a=AGENT_APPS.find(a=>a.id === id);
    if(!canApproveAgent(a)) return approvalDenied();
    if(!['待审批','待补件'].includes(a.status)) return toast(tr('此申請已處理，不能重複批准。','此申请已处理，不能重复批准。','This application has already been processed.'));
    let ratio;
    if(a.level === 2) {
      const input=document.getElementById('apRatio');ratio=Number(input?.value);
      if(!input?.value.trim()||!Number.isFinite(ratio)||ratio<0||ratio>100) return toast(tr('佣金比例須為 0–100。','佣金比例须为 0–100。','The commission ratio must be from 0 to 100.'));
    }
    approveApplication(id);
    if(a.level === 2 && a.agentId && a.status === '已批准') {
      L2RATIO[a.agentId]=Object.fromEntries(PRODUCTS.map(p=>[p.code,ratio]));
      render();
    }
  };

  const pickRows = () => {
    if (!pickState) return [];
    let rows = pickState.type === 'c' ? CUSTOMERS.filter(c=>!c.profileDraft) : AGENTS.filter(a=>a.status === '启用');
    return rows.filter(a=>matchText(a,pickState.query) && (!pickState.status || (pickState.status === 'frozen' ? !!a.frz : !a.frz)) && (pickState.type !== 'a' || !pickState.level || String(a.level) === pickState.level));
  };
  function drawPicker() {
    const list = document.getElementById('review-risk-list');
    if (!list || !pickState) return;
    const rows = pickRows();
    list.innerHTML = rows.length ? rows.map(a=>`<label class="review-risk-option"><input type="radio" name="review-risk-target" value="${safe(pickState.type+':'+a.id)}" ${pickState.selected === pickState.type+':'+a.id ? 'checked' : ''} onchange="reviewRiskSelect(this.value)"><span><b>${safe(I18N.tr(a.name))}</b><small>${safe(a.id)}${pickState.type === 'a' ? ' · ' + (a.level === 1 ? tr('一級','一级','Level 1') : tr('二級','二级','Level 2')) : a.en ? ' · ' + safe(a.en) : ''}</small></span>${a.frz ? `<span class="badge err">${tr('已凍結','已冻结','Frozen')}</span>` : ''}</label>`).join('') : `<p class="empty">${tr('沒有符合條件的對象','没有符合条件的对象','No matching targets')}</p>`;
    const count = document.getElementById('review-risk-count'); if(count) count.textContent = tr(`共 ${rows.length} 個對象`,`共 ${rows.length} 个对象`,`${rows.length} targets`);
    document.querySelectorAll('[data-review-risk-tab]').forEach(b=>b.classList.toggle('on',b.dataset.reviewRiskTab === pickState.type));
    document.getElementById('review-risk-level-field').hidden = pickState.type !== 'a';
    const next = document.getElementById('review-risk-next'); if(next) next.disabled = !rows.some(a=>pickState.selected === pickState.type+':'+a.id);
  }
  window.reviewRiskFilter = (key,value) => { if (!pickState || !['query','status','level'].includes(key)) return; pickState[key]=value; drawPicker(); };
  window.reviewRiskType = type => { if (!pickState || !['c','a'].includes(type)) return; pickState.type=type; pickState.selected=''; drawPicker(); };
  window.reviewRiskSelect = value => {
    if (!pickState) return;
    pickState.selected=value;
    const next=document.getElementById('review-risk-next');
    if(next) next.disabled=!pickRows().some(a=>value === pickState.type+':'+a.id);
  };
  window.reviewRiskContinue = () => {
    if (accountRole() !== 'hq' || !pickState) return;
    const {type,selected,kind} = pickState;
    const target = pickRows().find(a=>selected === type+':'+a.id);
    if (!target) return toast(tr('請先選擇對象。','请先选择对象。','Choose a target first.'));
    pickState=null; closeModal(); (kind === 'dr' ? docReqModal : freezeModal)(type,target.id);
  };
  riskPick = function(kind) {
    if (accountRole() !== 'hq' || !['dr','freeze'].includes(kind)) return;
    pickState={kind,type:'c',query:'',status:'',level:'',selected:''};
    modal(kind === 'dr' ? tr('發起調單 · 選擇對象','发起调单 · 选择对象','Request documents · Choose target') : tr('凍結 · 選擇對象','冻结 · 选择对象','Freeze · Choose target'), `<div class="seg review-risk-tabs"><button data-review-risk-tab="c" class="on" onclick="reviewRiskType('c')">${tr('客戶','客户','Customers')}</button><button data-review-risk-tab="a" onclick="reviewRiskType('a')">${tr('代理','代理','Agents')}</button></div><div class="review-risk-filters"><div class="field review-risk-search"><label for="review-risk-query">${tr('搜尋對象','搜索对象','Find target')}</label><input class="input" id="review-risk-query" type="search" placeholder="${tr('名稱、聯絡人或 ID','名称、联系人或 ID','Name, contact or ID')}" oninput="reviewRiskFilter('query',this.value)"></div><div class="field"><label for="review-risk-status">${tr('凍結狀態','冻结状态','Freeze status')}</label><select class="select" id="review-risk-status" onchange="reviewRiskFilter('status',this.value)"><option value="">${tr('全部狀態','全部状态','All statuses')}</option><option value="active">${tr('未凍結','未冻结','Not frozen')}</option><option value="frozen">${tr('已凍結','已冻结','Frozen')}</option></select></div><div class="field" id="review-risk-level-field" hidden><label for="review-risk-level">${tr('代理級別','代理级别','Agent level')}</label><select class="select" id="review-risk-level" onchange="reviewRiskFilter('level',this.value)"><option value="">${tr('全部級別','全部级别','All levels')}</option><option value="1">${tr('一級','一级','Level 1')}</option><option value="2">${tr('二級','二级','Level 2')}</option></select></div></div><small id="review-risk-count" class="muted" aria-live="polite"></small><div class="review-risk-list" id="review-risk-list" role="group" aria-label="${tr('選擇對象','选择对象','Choose a target')}"></div>`, `<button class="btn" onclick="closeModal()">${tr('取消','取消','Cancel')}</button><button class="btn primary" id="review-risk-next" disabled onclick="reviewRiskContinue()">${tr('下一步','下一步','Next')}</button>`);
    drawPicker();
  };

  const after = afterRender;
  afterRender = function(...args) { const out=after(...args); updatePublicEntrypoints(); if(S.portal === 'hq' && S.page === 'agents') reviewAgentFilter('query',treeState.query); return out; };
  // The session handshake may render before this classic script finishes loading.
  // Apply scoped header entries to that existing DOM as well as future renders.
  updatePublicEntrypoints();
  if(S.portal === 'hq' && S.page === 'agents') {
    if(document.getElementById('review-agent-query')) reviewAgentFilter('query',treeState.query);
    else render();
  }
  if (/^#\/join\/[^/]+\/demo\//.test(location.hash)) { parseHash(); render(); }
  window.AzureReviewAgents={ready:true};
})();
