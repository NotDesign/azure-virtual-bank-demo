import {mkdir,copyFile,cp,rm,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname),out=resolve(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const f of ['index.html','app.js','copy.js','styles.css']){if(!(await stat(resolve(root,f))).size)throw Error('Empty file: '+f);await copyFile(resolve(root,f),resolve(out,f))}await cp(resolve(root,'assets'),resolve(out,'assets'),{recursive:true});
await copyFile(resolve(root,'.nojekyll'),resolve(out,'.nojekyll'));console.log('Built static demo to dist/');
