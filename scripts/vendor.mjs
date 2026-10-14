import {cp,mkdir,copyFile,readdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {basename} from 'node:path';
const root=new URL('../',import.meta.url),source=p=>new URL('node_modules/'+p,root),target=p=>new URL('vendor/'+p,root);
const filter=p=>!basename(p).endsWith('.map')&&basename(p)!=='.DS_Store';
await mkdir(target(''),{recursive:true});
await cp(source('tesseract.js/dist'),target('tesseract'),{recursive:true,filter});
await cp(source('tesseract.js-core'),target('core'),{recursive:true,filter});
await mkdir(target('lang'),{recursive:true});for(const l of ['eng','chi_tra'])await copyFile(source(`@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`),target(`lang/${l}.traineddata.gz`));
for(const f of ['build','cmaps','standard_fonts','wasm'])await cp(source('pdfjs-dist/'+f),target('pdfjs/'+f),{recursive:true,filter});
for(const p of ['pdfjs-dist','tesseract.js'])await copyFile(source(p+'/'+(p==='tesseract.js'?'LICENSE.md':'LICENSE')),target(p+'.LICENSE'));
const manifest=[];async function walk(dir,prefix=''){for(const e of await readdir(dir,{withFileTypes:true})){if(/ 2(?:\.|$)/.test(e.name)||e.name.endsWith('.map'))continue;const path=prefix+e.name,url=new URL(e.name,dir);if(e.isDirectory())await walk(new URL(e.name+'/',dir),path+'/');else{const data=await readFile(url);manifest.push({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}
await walk(target(''));await writeFile(new URL('vendor-manifest.json',root),JSON.stringify(manifest,null,2));console.log('Prepared '+manifest.length+' local PDF/OCR files.');
