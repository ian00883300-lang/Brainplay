const fs=require('node:fs'),path=require('node:path');
module.exports=html=>{
 html=html.replaceAll('v4.60','v4.61').replaceAll('Phase 63','Phase 64').replaceAll('第六十三批','第六十四批');
 html=html.replaceAll('六個學習階段・25 字小單元','L1～L12 能力分級').replaceAll('六個學習階段','L1～L12').replaceAll('分四級各 125 張','同樣依 L1～L12 選級').replaceAll('six learning stages and 25-word units','12 learning levels').replaceAll('four levels of 125','12 levels').replaceAll('Six learning stages','Twelve learning levels');
 // Score by known word difficulty and phrase complexity; preserve original curated
 // four bands as an additional floor, then distribute within each three-level band.
 const phrases=JSON.parse(html.match(/^const ENGLISH_PHRASES=(.*);$/m)[1]);
 const bank=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/english-vocabulary.json'),'utf8'));
 const lookup=new Map(Object.entries(bank).flatMap(([k,rows])=>rows.map(r=>[r[0].toLowerCase(),Number(k.slice(1))])));
 const beginner=['thank you','good morning','good night','goodbye','see you','hello','come here','sit down','stand up','wake up','go to bed','all done','bye bye','good boy','good girl','love you','look at','listen to','wash hands','my turn','your turn'];
 for(const [band,key]of ['easy','medium','hard','extreme'].entries()){
  const part=phrases.filter(p=>p.level===key);
  const score=p=>{const ws=p.phrase.toLowerCase().match(/[a-z]+/g)||[];return beginner.some(x=>p.phrase.toLowerCase()===x)?-100:ws.reduce((s,w)=>s+(lookup.get(w)||9),0)/Math.max(1,ws.length)+ws.length*.35;};
  part.sort((a,b)=>score(a)-score(b)||a.phrase.localeCompare(b.phrase));
  part.forEach((p,i)=>p.level='L'+(band*3+1+Math.min(2,Math.floor(i*3/part.length))));
  if(band===0){const simple=new Set([...beginner,'drink water','be quiet','be careful','get up','clean up','put on','take off']);const rest=part.filter(p=>!simple.has(p.phrase));for(const p of part)p.level=simple.has(p.phrase)?'L1':rest.indexOf(p)<Math.ceil(rest.length/2)?'L2':'L3';}
  if(band===3){const formal=new Set('take precedence over|be subject to|be entitled to|in the absence of|in the wake of|by and large|draw a distinction between|make a distinction between|in all likelihood|it remains to be seen|come to terms with|for what it is worth|all things considered|that being said|having said that|as opposed to|on the basis of|in principle|shed light on|pave the way for'.split('|'));const work=new Set('meet a deadline|set a goal|be on the same page|get the point across|get straight to the point|go the extra mile|cut corners|rule out|narrow down|weigh the pros and cons|strike a balance|address a problem|raise concerns about|be committed to|with regard to|in response to|on behalf of|at your convenience|at your earliest convenience|in exchange for|in charge of|in the event of|come to an agreement|reach a decision|reach an agreement|reach a compromise|take a practical approach'.split('|'));for(const p of part)p.level=formal.has(p.phrase)?'L12':work.has(p.phrase)?'L11':'L10';}
 }
 html=html.replace(/^const ENGLISH_PHRASES=.*$/m,()=>`const ENGLISH_PHRASES=${JSON.stringify(phrases)};`);
 html=html.replace('function englishPhraseItems(level){return ENGLISH_PHRASES.filter(x=>x.level===level)}',"function englishPhraseItems(level){return ENGLISH_PHRASES.filter(x=>x.level===level)}");
 // Update the legacy diagnostic to check the new bank rather than four old bands.
 html=html.replace("for(const lv of ['easy','medium','hard','extreme'])if(englishPhraseItems(lv).length!==125)","for(const [lv]of ENGLISH_STAGES)if(englishPhraseItems(lv).length<1)");
 html=html.replace('function iconSVG(name,variant=false){','function iconSVG(name,variant=false){if(name.startsWith(\'everyday-\'))return everydayPattern(name.slice(9));if(name.startsWith(\'detail-\'))return detailPattern(name);');
 html=html.replace('const chosen=shuffle(symbolPool).slice(0,totalPairs);','const chosen=shuffle(matchingSymbols(diff)).slice(0,totalPairs);');
 html=html.replace('function makeOddPuzzle(diff,size){','function legacyOddPuzzle(diff,size){');
 html=html.replace('function renderOdd(body){',()=>fs.readFileSync(path.join(__dirname,'phase64-games.js'),'utf8')+'\nfunction renderOdd(body){');
 // Fewer text characters at easier levels; detailed visual families complement text.
 html=html.replace('function oddTextBase(isLetter,diff){const len=4,','function oddTextBase(isLetter,diff){const len={easy:2,medium:3,hard:4,extreme:4}[diff],');
 html=html.replace("if(p.isText&&p.textLength!==4)console.warn('Odd text must contain four characters'","if(p.isText&&p.textLength!==({easy:2,medium:3,hard:4,extreme:4}[diff]))console.warn('Unexpected odd-text difficulty length'");
 html=html.replace('<input aria-label="音量" class="volume-slider"', '<button class="volume-step" id="volumeDown" aria-label="音量減少 20%" title="−20%">−</button><input aria-label="音量" class="volume-slider"');
 html=html.replace('type="range" value="35"/></div>','type="range" value="35"/><button class="volume-step" id="volumeUp" aria-label="音量增加 20%" title="+20%">+</button><output id="volumeValue" aria-live="polite">35%</output></div>');
 html=html.replace("$('#volumeSlider').oninput=e=>{", "function changeVolume(delta){const slider=$('#volumeSlider');slider.value=String(clamp(Math.round(state.volume*100)+delta,0,100));slider.dispatchEvent(new Event('input'));}$('#volumeDown').onclick=()=>changeVolume(-20);$('#volumeUp').onclick=()=>changeVolume(20);$('#volumeValue').textContent=Math.round(state.volume*100)+'%';$('#volumeSlider').oninput=e=>{$('#volumeValue').textContent=e.target.value+'%';");
 html=html.replace('</style>',fs.readFileSync(path.join(__dirname,'phase64.css'),'utf8')+'\n</style>');
 fs.writeFileSync(path.join(__dirname,'../data/english-phrases.json'),JSON.stringify(phrases,null,2)+'\n');
 return html;
};
