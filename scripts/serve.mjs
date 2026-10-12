import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);const port=Number(process.env.PORT||3192);
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
http.createServer(async(req,res)=>{try{if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}const url=new URL(req.url,'http://localhost');const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')||path.includes('/.git')){res.writeHead(403).end();return}const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(404).end('Not found')}}).listen(port,'127.0.0.1',()=>console.log('Azure demo: http://127.0.0.1:'+port));
