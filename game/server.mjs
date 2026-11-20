import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { loadCatalog } from './catalog.mjs';

const assets = new Map(Object.entries({
  '/':['flow/index.html','text/html'], '/style.css':['flow/style.css','text/css'],
  '/app.js':['flow/app.ts','text/javascript'], '/run.js':['flow/run.ts','text/javascript'],
  '/art.js':['dist/art.js','text/javascript']
}));
createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost').pathname;
    res.setHeader('Cache-Control','no-store');
    if (url === '/api/catalog') {
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify(loadCatalog()));
    }
    const asset = assets.get(url);
    if (!asset) { res.writeHead(404); return res.end('Not found'); }
    const source = await readFile(new URL(asset[0],import.meta.url),'utf8');
    res.setHeader('Content-Type',asset[1]+'; charset=utf-8');
    res.end(asset[0].endsWith('.ts') ? stripTypeScriptTypes(source) : source);
  } catch (error) { console.error(error); res.writeHead(500); res.end('Unable to load application'); }
}).listen(4173,'127.0.0.1',()=>console.log('Action network at http://127.0.0.1:4173'));
