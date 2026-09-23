const fs=require('node:fs'),path=require('node:path');
module.exports=html=>{
 const phrases=JSON.parse(html.match(/^const ENGLISH_PHRASES=(.*);$/m)[1]);
 const seen=new Set(phrases.map(p=>p.phrase.toLowerCase().trim()));let header;const added=[];
 for(const line of fs.readFileSync(path.join(__dirname,'../data/phase65-phrases.txt'),'utf8').split(/\r?\n/)){
  if(!line||line.startsWith('#'))continue;if(line.startsWith('@')){header=line.slice(1).split('|');continue;}
  const [level,category,en,cn]=header;
  for(const pair of line.split(';')){if(!pair.trim())continue;const [phrase,meaning,example,exampleZh]=pair.split('=');if(!phrase||!meaning)throw Error('Bad phrase '+pair);if(seen.has(phrase.toLowerCase()))continue;seen.add(phrase.toLowerCase());const p={level,phrase,meaning,category,example:example||en.replace('{phrase}',phrase),exampleZh:exampleZh||cn.replace('{zh}',meaning)};phrases.push(p);added.push(p);}
 }
 if(added.length!==500)throw Error('Need exactly 500 new phrases; found '+added.length);
 html=html.replace(/^const ENGLISH_PHRASES=.*$/m,()=>`const ENGLISH_PHRASES=${JSON.stringify(phrases)};`);
 html=html.replaceAll('v4.61','v4.62').replaceAll('Phase 64','Phase 65').replaceAll('第六十四批','第六十五批');
 html=html.replace(/\b7000\b/g,'8000').replaceAll('7,000','8,000');
 html=html.replace(/500(?=\s*(個|常用|practical|phrase|phrases))/g,'1000');
 html=html.replace(/ENGLISH_PHRASES.length!==500/g,'ENGLISH_PHRASES.length!==1000').replace(/new Set\(phraseKeys\).size!==500/g,'new Set(phraseKeys).size!==1000').replace(/new Set\(phraseExamples\).size!==500/g,'new Set(phraseExamples).size!==1000');
 html=html.replace(/<button class="volume-step"[^>]*>[−+]<\/button>/g,'');
 const start=html.indexOf('function changeVolume(delta){'),end=html.indexOf("$('#volumeValue').textContent=Math.round(state.volume",start);
 if(start<0||end<0)throw Error('Volume handler boundary missing');html=html.slice(0,start)+html.slice(end);
 html=html.replace('</style>',fs.readFileSync(path.join(__dirname,'phase65.css'),'utf8')+'\n</style>');
 fs.writeFileSync(path.join(__dirname,'../data/english-phrases.json'),JSON.stringify(phrases,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,'../data/phase65-phrase-audit.json'),JSON.stringify({added:added.length,levels:Object.fromEntries(Array.from({length:12},(_,i)=>['L'+(i+1),added.filter(x=>x.level==='L'+(i+1)).length])),phrases:added.map(x=>({level:x.level,phrase:x.phrase}))},null,2)+'\n');
 return html;
};
