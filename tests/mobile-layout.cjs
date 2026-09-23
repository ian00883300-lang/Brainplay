const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',p.endsWith('.html')?'text/html; charset=utf-8':'application/javascript');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;try{
for(const engine of process.env.ENGINE?[process.env.ENGINE]:['chromium','webkit']){
 const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{channel:'chrome',headless:true});
 try{for(const lang of ['zh','en'])for(const width of [320,360,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});await context.addInitScript(lang=>localStorage.setItem('brainplay_lang',lang),lang);
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
  const top=await p.locator('.topbar').boundingBox();await p.evaluate(()=>window.scrollTo(0,500));const later=await p.locator('.topbar').boundingBox();assert(Math.abs(top.y-later.y-500)<2,'Static topbar');await p.evaluate(()=>window.scrollTo(0,0));
  assert.equal(await p.locator('#volumeUp,#volumeDown').count(),0);await p.locator('#volumeSlider').evaluate(el=>{el.value=61;el.dispatchEvent(new Event('input'));});assert.equal(await p.locator('#volumeValue').innerText(),'61%');
  await p.locator('[data-open-game=vocab]').first().click();
  async function row(selector){const rs=await p.locator(selector).evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width};}));assert(rs.every((r,i)=>Math.abs(r.y-rs[0].y)<2&&(!i||r.x>rs[i-1].x)),JSON.stringify({engine,lang,width,selector,rs}));}
  await row('#vocabMode,#englishScope');if(width===390)await p.screenshot({path:path.join(root,`tests/${engine}-${lang}-setup.png`)});
  await p.click('#vocabStart');await row('#studyBank,#studyLevel,#studyScope');
  const overflow=await p.evaluate(()=>({scroll:document.querySelector('.game-panel').scrollWidth,width:innerWidth,items:[...document.querySelectorAll('.game-panel *')].map(e=>({tag:e.tagName,id:e.id,cls:e.className,r:e.getBoundingClientRect()})).filter(x=>x.r.right>innerWidth+1).slice(0,16).map(x=>({tag:x.tag,id:x.id,cls:x.cls,right:x.r.right,width:x.r.width}))}));
  await p.screenshot({path:path.join(root,`tests/${engine}-${lang}-${width}.png`)});assert(overflow.scroll<=overflow.width+1,JSON.stringify({engine,lang,width,overflow}));
  assert.equal(await p.locator('.vocab-zh').evaluate(e=>getComputedStyle(e).textAlign),'center');assert.equal(await p.locator('.vocab-example').evaluate(e=>getComputedStyle(e).textAlign),'left');
  await p.selectOption('#studyLevel','L12');await row('#studyBank,#studyLevel,#studyScope');await p.selectOption('#studyBank','phraseFlash');await row('#studyBank,#studyLevel');assert(await p.locator('.vocab-word').isVisible());assert.deepEqual(errors,[]);
  await context.close();console.log('PASS',engine,lang,width);
 }}finally{await browser.close();}
}
}finally{server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
