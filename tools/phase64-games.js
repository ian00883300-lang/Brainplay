// SVG patterns differ by shape and position, not color alone.
function everydayPattern(name){
 const paths={balloon:'M32 8C12 8 12 37 32 42 52 37 52 8 32 8ZM29 44h6M32 44c-10 8 10 7 0 15',kite:'M32 5 51 26 32 43 13 26ZM32 5v38M13 26h38M32 43c-10 7 10 8 0 16',umbrella:'M7 31a25 25 0 0 1 50 0ZM32 8v40c0 12-13 12-13 1',gift:'M9 27h46v29H9ZM6 18h52v9H6ZM32 18v38M32 18C8 18 15-2 32 18ZM32 18C56 18 49-2 32 18Z',popsicle:'M20 39V19c0-17 24-17 24 0v20ZM28 39v17h8V39M27 17v13M37 17v13',sailboat:'M7 43h50L45 55H19ZM31 8v35M27 12 9 36h18ZM36 18l17 18H36Z',wateringcan:'M17 24h25v27H17ZM42 29h9l7-12M17 28C2 20 2 48 17 45M21 24v-8h16v8',sock:'M28 7h20v32c0 8-7 16-15 16H13C2 53 4 43 13 42l15-3ZM28 17h20M35 44l8 7'};
 return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="${paths[name]}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function detailPattern(id){
 const [,familyText,variantText]=id.split('-'),family=Number(familyText),v=Number(variantText);
 const stroke='fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
 const frames=[`<circle cx="32" cy="32" r="25" ${stroke}/>`,`<rect x="7" y="7" width="50" height="50" rx="8" ${stroke}/>`,`<path d="M32 5 59 32 32 59 5 32Z" ${stroke}/>`,`<path d="M32 5 57 19v27L32 59 7 46V19Z" ${stroke}/>`];
 let detail='';
 if(family<4){const count=v+1;detail=Array.from({length:count},(_,i)=>`<circle cx="${32+12*Math.cos(i*2*Math.PI/count)}" cy="${32+12*Math.sin(i*2*Math.PI/count)}" r="4" fill="currentColor"/>`).join('');}
 else if(family<8){detail=`<g transform="rotate(${v*90} 32 32)"><path d="M19 38h26M32 19v26M24 27l8-8 8 8" ${stroke}/><circle cx="20" cy="20" r="3" fill="currentColor"/></g>`;}
 else {detail=`<path d="M18 22h28M18 32h28M18 42h28" ${stroke}/><circle cx="${v%2?40:24}" cy="${v<2?22:42}" r="5" fill="var(--panel)" stroke="currentColor" stroke-width="3"/>`;}
 return `<svg viewBox="0 0 64 64" aria-hidden="true">${frames[family%4]}${detail}</svg>`;
}
function matchingSymbols(diff){
 const simple=['sun','moon','star','heart','house','fish','tree','flower','car','apple','bird','ball','book','cat','dog','milk','rabbit','bear','banana','orange','duck','frog','bus','bread','egg','cake','cloud','rain','leaf','cup','shoe','boat'];
 const everyday=['balloon','kite','umbrella','gift','popsicle','sailboat','wateringcan','sock'].map(x=>'everyday-'+x);
 const detail=Array.from({length:48},(_,i)=>`detail-${Math.floor(i/4)}-${i%4}`);
 return diff==='easy'?[...simple,...everyday]:diff==='medium'?[...symbolPool,...everyday,...detail.slice(0,16)]:diff==='hard'?[...symbolPool,...everyday,...detail.slice(0,32)]:[...symbolPool,...everyday,...detail];
}
function newOddPattern(diff,family,variant,odd){
 const n={easy:0,medium:1,hard:2,extreme:3}[diff],stroke='fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
 const rotation=(variant%4)*90;
 let body='';
 if(family===0){const count=2+n;body=Array.from({length:count},(_,i)=>`<circle cx="${14+i*36/Math.max(1,count-1)}" cy="${odd&&i===count-1?20+n*2:36}" r="4" fill="currentColor"/>`).join('');}
 else if(family===1){body=`<path d="M12 44h40M18 34h28M24 24h${odd?4+n*2:16}" ${stroke}/>`;}
 else if(family===2){body=`<path d="M16 32h32M36 20l12 12-12 12" ${stroke}/><circle cx="${odd?22+n*2:18}" cy="${odd?18+n*2:46}" r="4" fill="currentColor"/>`;}
 else if(family===3){body=`<rect x="14" y="14" width="36" height="36" rx="5" ${stroke}/><path d="M14 32h36M32 14v36" ${stroke}/><circle cx="${odd?38:24}" cy="24" r="${n>1?3:5}" fill="currentColor"/>`;}
 else if(family===4){body=`<path d="M12 45 32 12 52 45Z" ${stroke}/><path d="M24 36h${odd?5+n:16}" ${stroke}/>`;}
 else {body=`<circle cx="32" cy="32" r="23" ${stroke}/><path d="M32 32V17M32 32l${odd?'-12 9':'12 9'}" ${stroke}/>${n>1?'<circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" stroke-width="2"/>':''}`;}
 return `<svg viewBox="0 0 64 64"><g transform="rotate(${rotation} 32 32)">${body}</g></svg>`;
}
function makeOddPuzzle(diff,size){
 if(rand(0,1)===0)return legacyOddPuzzle(diff,size);
 const family=rand(0,5),variant=rand(0,3),target=rand(0,size*size-1);
 return {target,cells:Array.from({length:size*size},(_,i)=>newOddPattern(diff,family,variant,i===target)),label:localText('數量、位置與線條差異','Count, position and line differences'),signature:`new:${diff}:${family}:${variant}`,isText:false};
}
