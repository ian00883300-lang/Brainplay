const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const p=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!p.startsWith(root)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.js')?'application/javascript':'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage();const errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 console.log('startup errors',errors); await page.locator('[data-open-game=vocab]').first().click();
 console.log(JSON.stringify({title:await page.title(),errors,warningCount:warnings.length,warnings:warnings.slice(0,15)},null,2));
 await page.screenshot({path:path.join(root,'tests/smoke.png'),fullPage:true});
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
