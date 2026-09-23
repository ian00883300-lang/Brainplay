const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
module.exports=function(bank){
 const seen=new Set(Object.values(bank).flat().map(r=>r[0].toLowerCase()));const additions=[];
 const aliases=JSON.parse(fs.readFileSync(path.join(root,'data/english-aliases.json'),'utf8'));
 const add=(level,row)=>{const word=row[0].toLowerCase();if(seen.has(word)||aliases[word])return;if(!bank[level])throw Error('Unknown level '+level);seen.add(word);bank[level].push(row);additions.push({level,word});};
 let header;
 for(const line of fs.readFileSync(path.join(root,'data/phase65-words.txt'),'utf8').split(/\r?\n/)){
  if(!line||line.startsWith('#'))continue;if(line.startsWith('@')){header=line.slice(1).split('|');continue;}
  const [level,pos,category,en,cn]=header;
  for(const pair of line.split(';')){if(!pair.trim())continue;const [word,zh,usage,translation]=pair.split('=');if(!word||!zh)throw Error('Bad word '+pair);let example=usage||en.replaceAll('{word}',word),exampleZh=translation||cn.replaceAll('{zh}',zh);if(/^a [aeiou]/i.test(example)&&!/^a (use|uni)/.test(example))example=example.replace(/^a /,'an ');add(level,[word,zh,'book',pos,category,example,exampleZh,false]);}
 }
 const review=JSON.parse(fs.readFileSync(path.join(root,'data/phase65-review.json'),'utf8'));
 for(const item of additions){
  const old=bank[item.level],row=old.find(r=>r[0]===item.word),fix=review.content[item.word];
  if(fix){const [zh,pos,en,cn]=fix;row[1]=zh;row[3]=pos;row[5]=en;row[6]=cn;}
  for(const [level,words]of Object.entries(review.levels))if(words.includes(item.word)&&level!==item.level){old.splice(old.indexOf(row),1);bank[level].push(row);item.level=level;break;}
 }
 if(additions.length!==1000)throw Error('Need exactly 1000 new words; found '+additions.length);
 fs.writeFileSync(path.join(root,'data/phase65-word-audit.json'),JSON.stringify({added:additions.length,levels:Object.fromEntries(Object.keys(bank).map(k=>[k,additions.filter(x=>x.level===k).length])),additions},null,2)+'\n');
 return bank;
};
