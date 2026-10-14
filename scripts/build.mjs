import {mkdir,copyFile,cp,rm,stat} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname),out=resolve(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const f of ['index.html','app.js','copy.js','simplified.js','styles.css','demo-accounts.js']){if(!(await stat(resolve(root,f))).size)throw Error('Empty file: '+f);await copyFile(resolve(root,f),resolve(out,f));}
const filter=src=>!(/ [2-9](?:\.|$)/.test(basename(src))||basename(src)==='.DS_Store');
for(const dir of ['assets','vendor','br-engine'])await cp(resolve(root,dir),resolve(out,dir),{recursive:true,filter});
await mkdir(resolve(out,'cms'),{recursive:true});
for(const f of ['app.js','phone.js','identity.js','documents.js','i18n.js','simplified-cms.js','styles.css','demo-panel.css'])await copyFile(resolve(root,'cms',f),resolve(out,'cms',f));
await cp(resolve(root,'cms/confirmed'),resolve(out,'cms/confirmed'),{recursive:true,filter});
await copyFile(resolve(root,'.nojekyll'),resolve(out,'.nojekyll'));console.log('Built four-scope Azure static demo to dist/');
