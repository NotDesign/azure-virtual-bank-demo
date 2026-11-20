import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,relative,isAbsolute,sep} from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));const port=Number(process.env.PORT||3192);
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2','.json':'application/json','.pdf':'application/pdf','.gz':'application/gzip'};
http.createServer(async(req,res)=>{try{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);let file=resolve(root,'.'+pathname);
 const rel=relative(root,file);
 if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||rel.split(sep).includes('.git')){res.writeHead(403).end();return;}
 if((await stat(file)).isDirectory()){
  if(!pathname.endsWith('/')){res.writeHead(308,{Location:url.pathname+'/'+url.search}).end();return;}
  file=resolve(file,'index.html');
 }
 const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:data);
}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('Azure demo: http://127.0.0.1:'+port));
