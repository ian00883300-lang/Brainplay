const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
let html=cp.execFileSync('git',['show','f746573fa80cfbf42d60a32f9e43b14431c5da5c:index.html'],{cwd:root,encoding:'utf8',maxBuffer:10e6});
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/english-vocabulary.json'),'utf8'));
const expected=Object.fromEntries(Object.entries(bank).map(([k,v])=>[k,v.length]));
const extreme=[];
const aliases=JSON.parse(fs.readFileSync(path.join(root,'data/english-aliases.json'),'utf8'));
html=html.replace(/^const VOCAB=.*$/m,()=>`const VOCAB=${JSON.stringify(bank)};`);
html=html.replace(/^const VOCAB_EXTREME=.*$/m,()=>`const VOCAB_EXTREME=${JSON.stringify(extreme)};`);
html=html.replace("const VOCAB_STAR_KEY=",()=>`const ENGLISH_WORD_ALIASES=${JSON.stringify(aliases)};const VOCAB_STAR_KEY=`);
html=html.replace(".map(x=>String(x).toLowerCase()))}catch{}function saveVocabStars", ".map(x=>ENGLISH_WORD_ALIASES[String(x).toLowerCase()]||String(x).toLowerCase()))}catch{}function saveVocabStars");
html=html.replace(/^function vocabItems\(.*$/m,()=>`function vocabItems(diff,mode='all'){const source=VOCAB[diff]||VOCAB[{starter:'L1',easy:'L3',medium:'L6',hard:'L9',advanced:'L10',extreme:'L12'}[diff]]||VOCAB.L1;const rows=source.map(([word,zh,icon,pos,category,example,exampleZh,picture,usageKind])=>({word,zh,icon,pos,category,example,exampleZh,picture,usageKind:usageKind||'sentence'}));return mode==='picture'?rows.filter(x=>x.picture):rows}`);
html=html.replace('const chars=[...item.word.toLowerCase()],allPositions=chars.map((c,i)=>/[a-z]/.test(c)?i:-1)','const chars=[...item.word],allPositions=chars.map((c,i)=>/[a-z]/i.test(c)?i:-1)');
html=html.replace('answers=positions.map(i=>chars[i])','answers=positions.map(i=>chars[i].toLowerCase())');
html=html.replace("const v=selected[slot++]||'';return", "let v=selected[slot++]||'';if(c===c.toUpperCase())v=v.toUpperCase();return");
html=html.replace(/^function renderVocab\(.*$/m,()=>fs.readFileSync(path.join(root,'tools/english-learning.js'),'utf8'));
html=html.replace('function difficultySelect(){','function difficultySelect(){if(state.currentGame===\'vocab\')return englishDifficultySelect();');
html=html.replaceAll('v4.59','v4.60').replaceAll('Phase 62','Phase 63').replaceAll('第六十二批','第六十三批');
html=html.replace(/6000 (?=個|張|單|leveled|words|English)/g,'7000 ').replaceAll('6,000','7,000');
html=html.replaceAll('依四級難度提供 7000','依六個學習階段提供 7000').replaceAll('6000 單字','7000 單字');
html=html.replaceAll('6000 leveled','7000 leveled');
html=html.replace('Four leveled banks contain 7000 English words plus 500 practical phrase cards','Six learning stages contain 7000 English headwords plus 500 practical phrase cards').replace('phrase cards, and natural bilingual examples.','phrase cards, and bilingual examples or collocations.');
html=html.replaceAll('Listen to A, B, and C. Choose the audio that matches the Chinese meaning','Listen to the options. Choose the audio that matches the Chinese meaning');
html=html.replaceAll('請聽 A、B、C 三個發音，選出符合中文意思的單字發音','請聽選項的發音，選出符合中文意思的單字發音');
// The four difficulty settings of mixed-game challenges map to the first four
// English stages; child/senior casual play does not draw exam-level vocabulary.
const randomStart=html.indexOf('function renderRandom('),randomEnd=html.indexOf('function renderTic',randomStart);
if(randomStart<0||randomEnd<0)throw Error('Random-game source boundary changed');
html=html.slice(0,randomStart)+html.slice(randomStart,randomEnd).replaceAll('bank=vocabItems(diff)',"bank=vocabItems({easy:'L1',medium:'L3',hard:'L5',extreme:'L7'}[diff])").replace(/threeOptions=\(useZh=false\)=>\{[\s\S]*?\};if\(type==='vocabBlank'\)/,"threeOptions=(useZh=false)=>englishChoices(item,bank,3).map((x,i)=>({id:String.fromCharCode(65+i),item:x,label:useZh?x.zh:x.word}));if(type==='vocabBlank')")+html.slice(randomEnd);
html=html.replace('7000 張分級英文單字卡＋500 個常用片語卡；四級各 125 張，片語與例句均已去重並依使用頻率與理解難度分級','7000 個英文詞條・六個學習階段・25 字小單元；另有 500 個片語，分四級各 125 張');
html=html.replace('7000 leveled English flashcards + 500 practical phrase cards, 125 per level, de-duplicated and grouped by usage frequency and difficulty','7000 English headwords in six learning stages and 25-word units; plus 500 phrase cards in four levels of 125');
// Study stages use content criteria rather than four equally sized bins.
html=html.replace('allRows=[...VOCAB.easy,...VOCAB.medium,...VOCAB.hard,...VOCAB_EXTREME]','allRows=[...Object.values(VOCAB).flat(),...VOCAB_EXTREME]');
html=html.replace(/allRows\.length!==6000/g,'allRows.length!==7000');
html=html.replace(/new Set\(allRows\.map\(r=>String\(r\[0\]\)\.toLowerCase\(\)\)\)\.size!==6000/g,'new Set(allRows.map(r=>String(r[0]).toLowerCase())).size!==7000');
html=html.replace(/for\(const \[lvl,rows\] of Object\.entries\(\{easy:VOCAB\.easy,medium:VOCAB\.medium,hard:VOCAB\.hard,extreme:VOCAB_EXTREME\}\)\)if\(rows\.length!==1500\)console\.warn\('Unexpected vocabulary level count',lvl,rows\.length\);/,`for(const [lvl,expected]of Object.entries(${JSON.stringify(expected)}))if(vocabItems(lvl).length!==expected)console.warn('Unexpected vocabulary level count',lvl);`);
html=html.replace("if(new Set(allRows.map(r=>String(r[5]))).size!==6000)console.warn('Duplicate English examples detected');",'');
html=html.replace(/if\(new Set\(normalizedEnglishExamples\)\.size!==normalizedEnglishExamples\.length\)console\.warn\('Repeated English example template detected'\);/,'');
// The legacy checks required lowercase proper nouns and long examples in every stage.
// Replace just their English row checks; preserve all existing game regressions.
html=html.replace(/const rows=diff==='extreme'\?VOCAB_EXTREME:VOCAB\[diff\],words=rows\.map[\s\S]*?\}const used=new Set\(\);/, 'const used=new Set();');
html=html.replace("if(crossDuplicates.length)console.warn('Cross-level duplicate vocabulary words',crossDuplicates);", "if(crossDuplicates.length)console.warn('Cross-level duplicate vocabulary words',crossDuplicates);for(const row of allRows){if(row.length!==8||!row.slice(0,7).every(x=>typeof x==='string'&&x.trim())||typeof row[7]!=='boolean')console.warn('Incomplete vocabulary row',row[0]);if(row[7]){iconProbe.innerHTML=iconSVG(row[2]);if(!iconProbe.querySelector('svg'))console.warn('Missing picture SVG',row[0]);}}");
// New grammatical categories must not fall back to a meaningless generic POS label.
html=html.replaceAll("conjunction:'連接詞'","conjunction:'連接詞',article:'冠詞',determiner:'限定詞',modal:'情態助動詞',number:'數詞',interjection:'感嘆詞'");
html=html.replace('</style>','[hidden]{display:none!important}.toolbar-group{flex-wrap:wrap}.study-mode-note{line-height:1.7}.vocab-example small{display:block;color:var(--muted);margin-bottom:6px}.audio-choice{display:flex;flex-direction:column;gap:8px}.toolbar select{max-width:min(360px,80vw)}\n</style>');
html=require('./phase65-page.cjs')(require('./phase64-page.cjs')(html));
fs.writeFileSync(path.join(root,'index.html'),html);
const swPath=path.join(root,'sw.js');let sw=fs.readFileSync(swPath,'utf8').replace(/const CACHE_NAME = '[^']+';/,"const CACHE_NAME = 'brainplay-v4.62-phase65';");
// A separately hosted application on this origin may own other cache names.
sw=sw.replace('keys.filter(key => key !== CACHE_NAME)','keys.filter(key => key.startsWith(\'brainplay-\') && key !== CACHE_NAME)');
fs.writeFileSync(swPath,sw);
console.log('Built Phase 65 HTML and offline cache revision.');
