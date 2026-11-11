import {parseBR,parseDate} from './parser.mjs?v=20261111-documents';
export function candidatesFromBR(br){
 const result=[];
 if(!br.recognized)return result;
 for(const [source,key,step]of [['businessNameZh','merchantName',2],['businessNameEn','merchantEnglishName',2],['certificateNumber','registerCertNo',2],['expiryDate','registerCertPeriod',2],['legalStatus','legalStatus',2],['businessAddressZh','addrStreet',3],['businessAddressEn','addrStreetEn',3],['natureOfBusiness','remark',3]]){
  const field=br.fields[source],value=field?.value;if(!value)continue;
  result.push({key,value,step,confidence:field.confidence??null,source:field.source||value,method:br.method,autoSelect:field.autoSelect!==false});
  if(source==='businessNameEn')result.push({key:'registerCertName',value,step,confidence:field.confidence??null,source:field.source||value,method:br.method,autoSelect:field.autoSelect!==false});
  if(source==='certificateNumber')result.push({key:'registerCertType',value:'01',step,autoSelect:field.autoSelect!==false});
 }
 return result;
}
// Content-based page classification. A referenced attachment in a form is not
// evidence that the form itself is that attachment. No filename is inspected.
export function classifyDocument(text,{brRecognized=false,isImage=false}={}) {
 const raw=String(text||'').normalize('NFKC').replace(/[ \t]+/g,' ').replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g,'$1'),lines=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),head=lines.slice(0,18).filter(line=>!/^\s*(?:[-•*]|\d+[.)、])?\s*(?:cop(?:y|ies)\b|submit\b|provide\b|required\b|attach(?:ment)?\b|supporting\b|please\b|影印本|副本|提交|所需|附件|請提供)/i.test(line)).join('\n');
 const titles=[
  ['140101','商業登記證 BR',/Business\s*(?:\/\s*Branch\s*)?Registration\s+Certificate|商業.{0,5}登記證/i],
  ['IDENTITY','身份證件',/^\s*(?:Hong\s*Kong\s*(?:Permanent\s*)?Identity\s*Card|IDENTITY\s+CARD|香港(?:永久性居民)?身[份分]證)\s*$/im],
  ['140201','公司註冊證書 CR',/Certificate\s+of\s+Incorporation|公司註冊證書/i],
  ['140301','公司查冊報告',/Company\s+Search\s+Report|公司(?:註冊登記)?查冊/i],
  ['141101','周年申報表 NAR1',/Annual\s+Return|\bNAR1\b|\bNNC1\b|周年申報表/i],
  ['140401','銀行結單',/(?:Bank|Business\s+Direct|Business\s+Account|Integrated|Consolidated|Combined|Monthly|Account)\s+Statement|Statement\s+of\s+Accounts?|銀行(?:月)?結單|商務戶口結單/i],
  ['AUTHORIZATION','公司授權書',/Corporate\s+Authori[sz]ation\s+Letter|(?:公司|董事會)?授權書/i],
  ['APPLICATION','商戶申請／合作協議',/^(?:Merchant\s+Application(?:\s+Form)?|Merchant\s+Onboarding\s+(?:Application|Form))(?:\s*[|:–-].*)?$|商[戶户].{0,10}申請.{0,10}(?:合作|協議)|商[戶户]入[駐驻注]申請/im],
  ['140701','支付服務協議',/Payment\s+Services?\s+Agreement|支付服務合作協議/i],
  ['141401','租賃協議',/Lease\s+Agreement|Tenancy\s+Agreement|租賃協議|租約/i],
  ['141601','商戶條款',/Customer\s+Terms\s+and\s+Conditions|商戶與消費者.*條款/i],
  ['141201','PCI DSS 證書',/PCI\s+DSS.{0,20}(?:Certificate|Compliance)|PCI\s+DSS\s*證書/i],
  ['141701','年度財務報告',/Annual\s+Financial\s+Report|年度財務報告/i],
 ];
 let matches=titles.filter(([, ,re])=>re.test(head));
 if(!matches.some(([id])=>id==='140101')&&/Registration\s+Certificate/i.test(head)&&/Date\s+of\s+Commencement|BODY\s+CORPORATE|Nature\s+of\s+Business/i.test(raw))matches.push(titles[0]);
 // References to copies or attachments are removed from heading evidence above.
 // Two actual headings still remain ambiguous, including form + BR pages.
 const form=matches.filter(([id])=>['APPLICATION','AUTHORIZATION'].includes(id));
 if(brRecognized&&!matches.some(([id])=>id==='140101')&&!form.length)matches.push(titles[0]);
 if(!matches.length&&/\bStatement\b/i.test(head)&&[/\b(?:Account|Number|Branch)\b/i,/\b(?:Balance|Portfolio|Credit|Debit)\b/i].every(re=>re.test(raw)))matches=[titles.find(([id])=>id==='140401')];
 const ids=[...new Set(matches.map(([id])=>id))];
 if(ids.length===1){const title=matches.find(([id])=>id===ids[0]);return{id:ids[0],ids,label:title[1],ambiguous:false,confidence:.9,reason:'按本頁文件標題及內容判斷；請核對原件'};}
 if(ids.length>1)return{id:'',ids,label:'混合文件',ambiguous:true,confidence:null,reason:'本頁包含多種文件標題，請逐頁核對，不會強行歸為單一類型'};
 if(isImage)return{id:'SUPPORTING_IMAGE',ids:['SUPPORTING_IMAGE'],label:'補充圖片（請確認）',ambiguous:false,confidence:.35,reason:'未讀到法定文件標題；不會把宣傳圖或品牌圖當成身份／公司證明'};
 return{id:'',ids:[],label:'待分類',ambiguous:false,confidence:null,reason:'未能可靠確認文件種類，請人工分類'};
}
// Conservative label-based extraction. No value is inferred from a file name.
export function extractCandidates(text,type='AUTO',options={}) {
  const result=[];
  const add=(key,value,step=2,source='',confidence=null)=>{if(value?.trim()&&!result.some(x=>x.key===key&&x.value===value.trim()))result.push({key,value:value.trim(),step,source:source||value.trim(),confidence,reviewRequired:true});};
  const raw=String(text||'').normalize('NFKC').replace(/[‐‑–—−]/g,'-');
  if(type==='BR'||type==='AUTO') {
    const br=parseBR(raw,{method:'document-text',page:1});
    if(br.recognized) for(const [source,key,step] of [['businessNameZh','merchantName',2],['businessNameEn','merchantEnglishName',2],['certificateNumber','registerCertNo',2],['expiryDate','registerCertPeriod',2],['legalStatus','legalStatus',2],['businessAddressZh','addrStreet',3],['businessAddressEn','addrStreetEn',3],['natureOfBusiness','remark',3]]) {
      const value=br.fields[source]?.value;add(key,value,step);
      if(source==='businessNameEn')add('registerCertName',value);
      if(source==='certificateNumber'&&value)add('registerCertType','01');
    }
  }
  const lines=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const types={CI:/CERTIFICATE OF INCORPORATION|公司註冊證書/i,NAR1:/ANNUAL RETURN|NAR1|NNC1|周年申報/i,ID:/IDENTITY CARD|身份證|身分證/i,BANK:/(?:BANK|BUSINESS DIRECT|ACCOUNT) STATEMENT|STATEMENT OF ACCOUNT|銀行月結單|銀行結單/i};
  const permits=t=>type===t||(type==='AUTO'&&types[t].test(raw));
  function labelled(pattern){for(let i=0;i<lines.length;i++){const m=lines[i].match(pattern);if(m)return(m[1]||lines[i+1]||'').trim();}return '';}
  if(permits('CI'))add('crCode',labelled(/^(?:Company (?:Registration )?Number|Certificate No\.?|公司註冊編號)\s*[:：#]\s*(.*)$/i).replace(/\s/g,''));
  if(permits('NAR1'))add('directors[0].name',labelled(/^(?:Director Name|董事姓名)\s*[:：]\s*(.*)$/i));
  // Capture identity data without assigning a corporate role. The review UI
  // explicitly asks who the document belongs to before mapping it.
  if(permits('ID')){
    const name=labelled(/^(?:Name(?: in English)?|English Name|中文姓名|姓名)\s*(?:[:：]\s*(.*))?$/i);
    const id=labelled(/^(?:Identity Card (?:No\.?|Number)|身份證號碼|身分證號碼)\s*[:：]\s*(.*)$/i)||raw.match(/\b[A-Z]{1,2}\s*\d{6}\s*\([0-9A]\)/i)?.[0]||'';
    const printedName=name||lines.map(line=>line.match(/\b([A-Z][A-Za-z'’-]+,\s*[A-Za-z][A-Za-z '’-]{1,70})/)?.[1]?.trim()).find(Boolean)||'';if(printedName)add('identityName',printedName);
    const dobLine=lines.findIndex(line=>/Date\s*of\s*Birth|出\s*生\s*日\s*期/i.test(line));
    if(dobLine>=0){const source=lines.slice(dobLine,dobLine+3).join(' '),birth=parseDate(source);if(birth)add('identityBirthDate',birth,2,source);}
    if(/^[A-Z]{1,2}\d{6}\([0-9A]\)$/i.test(id.replace(/\s/g,'')))add('identityNo',id.replace(/\s/g,''));
  }
  // A plain identity card does not establish a company role. Never infer director.
  if(permits('ID')&&/Director(?:'s)?\s+Identity|董事身[份分]證/i.test(raw)){
    add('directors[0].name',labelled(/^(?:Name|姓名)\s*[:：]\s*(.*)$/i));
    const id=labelled(/^(?:Identity Card (?:No\.?|Number)|身份證號碼|身分證號碼)\s*[:：]\s*(.*)$/i);
    if(/^[A-Z]{1,2}\d{6}\([0-9A]\)$/i.test(id.replace(/\s/g,'')))add('directors[0].idcardNo',id.replace(/\s/g,''));
    const birth=labelled(/^(?:Date of Birth|出生日期)\s*[:：]\s*(.*)$/i).replaceAll('/','-');
    if(/^\d{4}-\d{2}-\d{2}$/.test(birth))add('directors[0].birthDay',birth);
  }
  if(permits('BANK')){
    add('cardName',labelled(/^(?:Account (?:Name|Holder)|戶名|賬戶名稱|帳戶名稱)\s*[:：]\s*(.*)$/i),4);
    const account=labelled(/^(?:Account (?:No\.?|Number)|帳戶號碼|賬戶號碼|銀行帳號)\s*[:：]\s*(.*)$/i);
    const accounts=account?[account]:[...raw.matchAll(/(?:Account\s*(?:No\.?|Number)|Number)[^\n\d]{0,25}(\d[\d -]{5,33}\d)/gi)].map(m=>m[1].trim());
    const uniqueAccounts=[...new Set(accounts.filter(value=>/^[\d -]{6,34}$/.test(value)))];
    if(uniqueAccounts.length===1)add('cardNo',uniqueAccounts[0],4);
    if(!result.some(c=>c.key==='cardName')){
      const names=lines.slice(0,22).map(line=>line.match(/^([A-Z][A-Z0-9 &.,'()/-]{3,100}?\b(?:LIMITED|LTD\.?|INC\.?|CORPORATION))(?=\s|$)/)?.[1]).filter(value=>value&&!/BANK(?:ING)?/i.test(value));
      if(new Set(names).size===1)add('cardName',names[0],4,names[0],.7);
    }
    const heading=lines.slice(0,8).find(line=>/Statement|銀行|銀行|匯豐|滙豐/i.test(line));
    if(heading){const bank=heading.replace(/(?:Business\s+Direct|Business\s+Account|Bank|Account|Monthly)?\s*Statement.*$/i,'').trim();if(bank&&bank.length<80)add('cardBankName',bank,4,heading,.75);}
    const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
    for(const line of lines.slice(0,25)){const m=line.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+((?:19|20)\d{2})\b/);if(m&&months[m[2].slice(0,3).toLowerCase()]){const value=parseDate(`${m[1]}/${months[m[2].slice(0,3).toLowerCase()]}/${m[3]}`);if(value){add('statementDate',value,4,line,.7);break;}}}

    const code=labelled(/^(?:Bank Code|銀行代碼|銀行編號)\s*[:：]\s*(.*)$/i);
    if(/^\d{3}$/.test(code))add('cardBankCode',code,4);
  }
  return result;
}
