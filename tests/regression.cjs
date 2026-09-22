const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/english-vocabulary.json'),'utf8'));
const rows=Object.values(bank).flat();
const results=[];
let enableHooks=true;
function pass(name,detail){results.push({name,status:'passed',detail});console.log('PASS',name,detail||'');}
const hooks=`window.__brainplayTest={vocabItems,englishPool,englishChoices,englishRecord,englishProgress,makeBlankData,blankLetterOptions,buildUniqueDeck,openGame,closeGame,state,runDataChecks,ENGLISH_STAGES,englishPhraseItems,togglePause,isVocabStarred};`;
function assertData(){
 assert.equal(rows.length,7000);assert.equal(new Set(rows.map(r=>r[0].toLowerCase())).size,7000);
 for(const r of rows){assert.equal(r.length,8,r[0]);assert(r.slice(0,7).every(x=>typeof x==='string'&&x.trim()),r[0]);assert.equal(typeof r[7],'boolean');assert(/^[a-z]+(?:-[a-z]+)*$/i.test(r[0]),r[0]);assert(r[5].toLowerCase().includes(r[0].toLowerCase()),r[0]);assert(!/^On (Monday|Tuesday|Wednesday|Thursday|Friday)/.test(r[5]),r[0]);assert(!/[\u200b-\u200d]/.test(r.join('')),r[0]);}
 for(const w of ['statute','interpolation','extrapolation','antibody','colitis','biopsy','stochastic','exeter','intel','polymer'])assert(!rows.some(r=>r[0]===w),'excluded '+w);
 for(const w of ['dog','cat','ant','cute','zero','go','the','and','january','monday','march','air','kitten','bubble'])assert(bank.starter.some(r=>r[0].toLowerCase()===w),'foundation '+w);
 for(const w of ['cupboard','microwave','monthly'])assert(bank.easy.some(r=>r[0].toLowerCase()===w),'everyday '+w);
 assert.equal(rows.find(r=>r[0]==='fat')[3],'adjective');
 assert(rows.some(r=>r[0]==='January'));assert(rows.some(r=>r[0]==='I'));
 pass('Data: 7000 complete unique headwords, six stages, required basics and specialist exclusions');
}
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(req.url.split('?')[0]);
 const p=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{
  let content=fs.readFileSync(p);
  if(enableHooks&&p.endsWith('index.html')&&!req.url.includes('real=1'))content=Buffer.from(content.toString().replace("$('#brandIcon').innerHTML=",hooks+"$('#brandIcon').innerHTML="));
  res.setHeader('Content-Type',p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.js')?'application/javascript':p.endsWith('.json')?'application/json':'application/octet-stream');res.end(content);
 }catch{res.writeHead(404).end();}
});
async function run(){
 assertData();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,channel:process.env.BRAINPLAY_BROWSER||'chrome'});
 let errors=[],warnings=[];
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
   window.__spoken=[];
   window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},pause(){},resume(){},getVoices(){return [{lang:'en-US',name:'Test voice'}];},speak(u){window.__spoken.push({text:u.text,rate:u.rate});u.onstart?.();u.onend?.();}}});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
  await page.goto(url);await page.waitForFunction(()=>!!window.__brainplayTest);
  const algorithms=await page.evaluate(()=>{
   const t=window.__brainplayTest;let blanks=0,choices=0;
   for(const [level]of t.ENGLISH_STAGES){
    const pool=t.vocabItems(level);
    const mapped={starter:'easy',easy:'easy',medium:'medium',hard:'hard',advanced:'hard',extreme:'extreme'}[level];
    for(const item of pool){
     for(let k=0;k<3;k++){
      const b=t.makeBlankData(item,mapped),opts=t.blankLetterOptions(b.answers);
      if(!b.positions.length||new Set(b.positions).size!==b.positions.length||b.positions.some((p,i)=>b.chars[p].toLowerCase()!==b.answers[i]||!/[a-z]/i.test(b.chars[p]))||b.answers.some(x=>!opts.includes(x)))throw Error('Unsolvable spelling: '+item.word);
      if(b.chars.length>1&&b.positions.length===b.chars.length)throw Error('No letter hint: '+item.word);
      blanks++;
     }
     const opts=t.englishChoices(item,pool,level==='starter'?2:3);
     if(opts.length!==(level==='starter'?2:3)||new Set(opts.map(x=>x.word)).size!==opts.length||!opts.some(x=>x.word===item.word))throw Error('Choice set: '+item.word);
     const seen=new Set();for(const o of opts)for(const m of o.zh.split(/[；;、，,（(]/).map(x=>x.trim()).filter(Boolean)){if(seen.has(m))throw Error('Ambiguous meaning: '+item.word);seen.add(m);}
     choices++;
    }
    const deck=t.buildUniqueDeck(pool,20);if(new Set(deck.map(x=>x.word)).size!==20)throw Error('Duplicate deck');
    const units=Math.ceil(pool.length/25);const all=[];for(let i=0;i<units;i++){const part=t.englishPool(level,{unit:String(i)});if(part.length>25)throw Error('Unit too large');all.push(...part);}if(all.length!==pool.length)throw Error('Unit coverage');
   }
   return {blanks,choices};
  });pass('All-headword spelling, distractors, deck uniqueness and unit coverage',algorithms);
  async function open(){await page.evaluate(()=>{window.__brainplayTest.openGame('vocab');});}
  async function select(level,mode){await open();await page.selectOption('#difficultySelect',level);await page.selectOption('#vocabMode',mode);await page.evaluate(()=>{document.querySelector('#vocabCount').value='1';});}
  async function finish(){await page.click('#vocabNextQuestion');await page.locator('#vocabReport.show').waitFor();}
  const tested=[];
  for(const level of Object.keys(bank)){
   for(const mode of ['flash','blank','meaning','audioMeaning','meaningAudio','mixed']){
    await select(level,mode);await page.click('#vocabStart');
    if(mode==='flash'){
     const first=await page.locator('.vocab-word').innerText();await page.click('#flashNext');assert.notEqual(await page.locator('.vocab-word').innerText(),first);await page.click('#flashPrev');assert.equal(await page.locator('.vocab-word').innerText(),first);
     await page.click('#flashRandom');assert.notEqual(await page.locator('.vocab-word').innerText(),first);
     await page.click('#flashVocabStar');assert(await page.locator('#flashVocabStar').evaluate(e=>e.classList.contains('active')));await page.click('#flashVocabStar');
     await page.click('[data-en-speed="0.6"]');await page.click('#enSpeak');assert.equal(await page.evaluate(()=>window.__spoken.at(-1).rate),.48);
     await page.click('#flashFinish');assert.equal(await page.locator('#difficultySelect').isEnabled(),true);
    }else{
     if(mode==='blank'){
      const count=await page.locator('.blank-slot').count();for(let i=0;i<count;i++)await page.locator('[data-letter]').first().click();assert(await page.locator('#blankSubmit').isEnabled());await page.click('#blankEdit');assert(await page.locator('#blankSubmit').isDisabled());await page.locator('[data-letter]').first().click();await page.click('#blankSubmit');
     }else {
      if(mode==='audioMeaning'){await page.click('#enSpeak');assert((await page.evaluate(()=>window.__spoken.at(-1).text)).length>0);}
      if(mode==='meaningAudio'){await page.locator('[data-play]').first().click();assert((await page.evaluate(()=>window.__spoken.at(-1).text)).length>0);}
      await page.locator('[data-answer]').first().click();
     }
     assert(await page.locator('.feedback-word').isVisible());await page.click('#enUsageSpeak');await finish();
    }
    tested.push(level+'/'+mode);
   }
  }pass('36 stage/mode UI combinations; spelling edit; study navigation; slow speech',tested.length);
  for(const lv of ['easy','medium','hard','extreme']){
   await open();await page.selectOption('#vocabMode','phraseFlash');await page.selectOption('#englishPhraseLevel',lv);assert(await page.locator('#englishStageWrap').isHidden());await page.click('#vocabStart');assert((await page.locator('#vocabMsg').innerText()).includes('125'));await page.click('#flashNext');await page.click('#enUsageSpeak');await page.click('#flashFinish');
  }pass('All four phrase levels retain 125 cards and audio');
  await select('starter','meaning');await page.click('#vocabStart');
  const word=await page.locator('.vocab-word').innerText();const zh=bank.starter.find(r=>r[0]===word)[1];
  await page.locator('[data-answer]').filter({hasText:zh}).click();await finish();assert((await page.locator('#vocabReport').innerText()).includes('100%'));
  await select('starter','meaning');await page.click('#vocabStart');
  const wrongWord=await page.locator('.vocab-word').innerText();const rightZh=bank.starter.find(r=>r[0]===wrongWord)[1];
  const buttons=page.locator('[data-answer]');for(let i=0;i<await buttons.count();i++)if(await buttons.nth(i).innerText()!==rightZh){await buttons.nth(i).click();break;}
  await finish();await page.click('#enRetryMistakes');assert.equal(await page.locator('.vocab-word').innerText(),wrongWord);
  await page.locator('[data-answer]').filter({hasText:rightZh}).click();await finish();
  const review=await page.evaluate(w=>window.__brainplayTest.englishProgress()[w.toLowerCase()],wrongWord);assert(review.correct>=1);assert(review.due>Date.now());
  const srs=await page.evaluate(()=>{const t=window.__brainplayTest,n=100000;for(const ok of [false,true,true,true,true])t.englishRecord('test-only',ok,n);const x=t.englishProgress()['test-only'];localStorage.removeItem('brainplay_english_progress_v1');return x;});assert.equal(srs.streak,4);assert.equal(srs.due,100000+14*86400000);
  pass('Correct/incorrect scoring, retry only mistakes and 1/3/7/14-day review scheduling');
  await select('starter','audioMeaning');await page.click('#vocabStart');await page.click('#enTextFallback');assert(await page.locator('.vocab-word').isVisible());await page.locator('[data-answer]').first().click();await finish();pass('Silent-audio text fallback');
  await select('starter','meaning');await page.click('#vocabStart');await page.evaluate(()=>window.__brainplayTest.togglePause(true));assert(await page.locator('#pauseOverlay').isVisible());
  await page.evaluate(()=>document.querySelector('[data-answer]').click());assert.equal(await page.locator('.feedback-word').count(),0);
  await page.evaluate(()=>window.__brainplayTest.togglePause(false));await page.click('#endGameBtn');await page.locator('#vocabReport.show').waitFor();pass('Pause blocks answers and early finish produces a report');
  await select('starter','flash');await page.click('#vocabStart');await page.click('#flashNext');await page.click('#enPracticeSeen');assert((await page.locator('#vocabMsg').innerText()).includes('1/2'));await page.click('#endGameBtn');pass('Study-to-practice uses only the two cards just viewed');
  await page.evaluate(()=>localStorage.removeItem('brainplay_english_progress_v1'));await open();await page.selectOption('#englishScope','review');assert(await page.locator('#vocabStart').isDisabled());pass('Empty review does not silently fall back to the full bank');
  const nonEnglish=['matching','sequence','math','grid','odd','pattern','random','japanese','tictactoe','gomoku','sudoku','slide','game1024'];
  for(const game of nonEnglish){await page.evaluate(g=>window.__brainplayTest.openGame(g),game);assert((await page.locator('#gameScreen').innerText()).length>50);}
  pass('All 13 other game screens open; built-in math/pattern/Sudoku/slide data checks run');
  for(const mode of ['vocabBlank','vocabMeaning','vocabAudioMeaning','vocabMeaningAudio']){
   await page.evaluate(()=>window.__brainplayTest.openGame('random'));await page.selectOption('#difficultySelect','easy');
   await page.locator('#randomBanks input').evaluateAll((els,chosen)=>els.forEach(el=>el.checked=el.value===chosen),mode);
   await page.evaluate(()=>document.querySelector('#randomCount').value='1');await page.click('#randomStart');
   if(mode==='vocabBlank'){const n=await page.locator('#mixedBlankDisplay .blank-slot').count();for(let i=0;i<n;i++)await page.locator('#randomContent [data-letter]').first().click();await page.click('#mixedBlankSubmit');}
   else await page.locator(mode==='vocabMeaningAudio'?'#randomContent [data-answer]':'#randomContent [data-i]').first().click();
   const feedbackWord=await page.locator('#randomContent .feedback-word').innerText();assert(bank.starter.some(r=>r[0]===feedbackWord));
   await page.click('#endGameBtn');
  }pass('Four random-game English modes draw from the starter bank on easy');
  await page.evaluate(()=>localStorage.setItem('brainplay_vocab_stars_v1',JSON.stringify(['grey','non-profit','dog'])));await page.reload();
  assert(await page.evaluate(()=>['gray','nonprofit','dog'].every(window.__brainplayTest.isVocabStarred)));pass('Existing bookmarks survive spelling consolidation');
  await open();await page.evaluate(()=>{window.__brainplayTest.closeGame();document.querySelector('#langBtn').click();});await open();assert((await page.locator('#englishGuide').innerText()).includes('Choose by ability'));await page.click('#vocabStart');assert(!(await page.locator('#gameScreen').innerText()).includes('undefined'));await page.click('#flashFinish');pass('English-language UI');
  await page.setViewportSize({width:390,height:844});await open();await page.click('#vocabStart');await page.waitForTimeout(3600);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:path.join(root,'tests/mobile.png')});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(root,'tests/desktop.png')});pass('390px mobile and desktop layout snapshots');
  assert.deepEqual(errors,[]);const newWarnings=warnings.filter(x=>!x.startsWith('Japanese example does not contain headword')&&x!=='Service Worker registration blocked by Playwright');assert.deepEqual(newWarnings,[]);
  pass('No JavaScript errors or new data-check warnings',{preexistingJapaneseInflectionWarnings:[...new Set(warnings.filter(x=>x.startsWith('Japanese example does not contain headword')))].length});
  const silentContext=await browser.newContext({serviceWorkers:'block'});await silentContext.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:undefined});window.SpeechSynthesisUtterance=undefined;});
  const silent=await silentContext.newPage();await silent.goto(url);await silent.evaluate(()=>window.__brainplayTest.openGame('vocab'));await silent.selectOption('#vocabMode','audioMeaning');assert(await silent.locator('#vocabStart').isDisabled());
  await silent.selectOption('#vocabMode','mixed');await silent.click('#vocabStart');assert(await silent.locator('.vocab-word').isVisible());await silentContext.close();pass('Device without speech can use text practice; audio-only mode is disabled');
  // Real service worker route, without test hooks, and actual offline navigation.
  enableHooks=false;const offlineContext=await browser.newContext();const offline=await offlineContext.newPage();await offline.goto(url+'/?real=1');
  await offline.evaluate(()=>navigator.serviceWorker.ready);await offline.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await offline.waitForTimeout(500);await offlineContext.setOffline(true);await offline.reload();assert((await offline.title()).includes('Phase 63'));
  assert.equal(await offline.evaluate(()=>typeof window.__brainplayTest),'undefined');await offline.locator('[data-open-game=vocab]').first().click();await offline.click('#vocabStart');assert(await offline.locator('.vocab-word').isVisible());pass('Actual service-worker cache supports offline English flashcards');
  await offlineContext.close();await context.close();
 }finally{await browser.close();server.close();}
 fs.writeFileSync(path.join(root,'tests/results.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n');
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1;});
