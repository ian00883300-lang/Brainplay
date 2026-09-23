/* Rebuild from the verified Phase 62 commit and reviewed teaching data. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = cp.execFileSync('git', ['show', 'f746573fa80cfbf42d60a32f9e43b14431c5da5c:index.html'], {cwd:root, maxBuffer:10e6, encoding:'utf8'});
const context = {};
vm.runInNewContext(baseline.match(/const VOCAB=.*\r?\n/)[0]+baseline.match(/const VOCAB_EXTREME=.*\r?\n/)[0]+';this.bank={...VOCAB,extreme:VOCAB_EXTREME}',context);
const original = Object.values(context.bank).flat();
const freq = JSON.parse(fs.readFileSync(path.join(root,'data/english-frequency.json'),'utf8'));
const stages = ['starter','easy','medium','hard','advanced','extreme'];
const aliases = Object.fromEntries(`colour:color favourite:favorite grey:gray centre:center theatre:theater programme:program aeroplane:airplane metre:meter kilometre:kilometer litre:liter travelling:traveling traveller:traveler jewellery:jewelry honour:honor behaviour:behavior defence:defense licence:license labour:labor ageing:aging acknowledgement:acknowledgment speciality:specialty aluminium:aluminum counselling:counseling organisation:organization modelling:modeling tyre:tire neighbour:neighbor recognise:recognize realise:realize organise:organize practise:practice judgement:judgment honourable:honorable rumour:rumor harbour:harbor coloured:colored coloured:colored colourful:colorful marvellous:marvelous flavour:flavor favourable:favorable criticise:criticize emphasise:emphasize apologise:apologize summarise:summarize towards:toward amongst:among backwards:backward forwards:forward onwards:onward upwards:upward downwards:downward cosy:cozy woollen:woolen mouldy:moldy courgette:zucchini aubergine:eggplant chilli:chili doughnut:donut crayfish:crawfish pyjamas:pajamas amphitheatre:amphitheater watercolour:watercolor adaptor:adapter diarrhea:diarrhoea skilfully:skillfully customizable:customisable customize:customise synchronize:synchronise standardize:standardise publicize:publicise stabilize:stabilise socialize:socialise minimize:minimise optimize:optimise specialized:specialised analyse:analyze practice:practice`.split(/\s+/).filter(x=>x.includes(':')).map(x=>x.split(':')));
delete aliases.practice;
Object.assign(aliases,{'non-profit':'nonprofit','set-up':'setup','line-up':'lineup'});
const excluded = new Set(`interpolation extrapolation coefficient derivative integral vector scalar matrix oscillation turbulence gradient viscosity conductivity elasticity compressibility inertia torque entropy resonance attenuation calibration confidence_interval heuristic operationalization triangulation meta-analysis longitudinal cross-sectional methodological probabilistic deterministic stochastic nonlinear multivariate interoperable inferential correlational counterfactual parameterize calibrate interpolate extrapolate operationalize triangulate contextualize conceptualize generalizability heterogeneity homogeneity interoperability granularity normalization segmentation aggregation triangulation corroboration polymer chromosome platelet colitis gastric indemnity exchequer exeter intel shah col methodist lordship wheeler turner smith missionary socialism faction doctrate quantum receptor enzyme covariance theorem lemma antibody serum plasma lesion biopsy nitrate battalion artillery injunction indictment deposition excise coroner covenant writ warrant litigation covenant chancellor magistrate exchequer isotope superconductivity microcomputer mainframe semiconductor anthropologist physicist psychiatrist parliamentarian prosecutorial stochastic scalar scalar alpha beta tenor legion relegation rationality notation gamma omega cardiac transistor relativity biochemistry microorganism operationalization conceptualization inferential homogeneity variance outlier scalar modal lemma lemma fixed-dose gene mutation molecular chromatography`.split(/\s+/));
// Exclude rare food/species terms, malformed compounds and inflection-only additions.
const rejectNew = new Set(`lonelier wellbeing bedside measuring inhale exhale marzipan cardamom saffron radicchio rutabaga huckleberry boysenberry elderberry clementine satsuma meringue ganache fettuccine vermicelli tahini tempeh ghee prosciutto ricotta brie halibut haddock sturgeon marlin garfish calory corkscrew sugarbowl r​​ink eyes​​train culdesac checkin carryon cablecar stilllife flipflops powerbank warmup cooldown shoelaces stockings trousers sneakers trainers loafers moccasins clogs tights leggings pajamas pyjamas earmuffs overalls dungarees chopsticks tongs oats lentils chickpeas edamame sultana dates raisins allergies chives breadcrumbs earbuds goggles flipper kneepad shinpad poppy macadamia nougat coucous couscous quinoa buckwheat guacamole oregano tarragon rosemary cardamom dill fennel arugula endive chard millet muesli buckwheat whey toffee abalone cuttlefish falafel hummus naan pita brioche patisserie greengrocer fishmonger ramekin decanter carafe globet trivet mantelpiece skirting downspout splashboard splashback pergola trellis carabiner bobsled vibraphone glockenspiel marimba cornet bugle bassoon mandolin shawm tuba cockatiel cockatoo budgerigar budgie parakeet macaw egret ibis grouse partridge weevil earwig silverfish tapir wombat wallaby echidna ibex caribou lynx bobcat puma cougar macaque mandrill viper rattlesnake newt salamander angelfish piranha dugong porpoise narwhal beluga manatee possum opossum sequoia baobab acacia cypress sycamore mistletoe thistle nettle rhubarb chard radicchio alf alfalfa hibiscus azalea camellia gardenia peony petunia chrysanthemum bluebell buttercup beech fir spruce marigold wren thrush starling quail locust aphid hornet termite mite tick leech millipede armadillo anteater bison gazelle stork kingfisher cedar redwood conservatory arboretum viaduct catamaran hovercraft funicular rickshaw gondola dhow kayak canoe dinghy salami pepperoni sirloin tenderloin drumstick fillet cutlet cheddar mozzarella parmesan feta curd lard shortening buttermilk barley aquaculture horticulture dehumidify ref urbish refurbish reorganize soothe soothe`.split(/\s+/));
for(const word of 'statute scalability traceability reproducibility operationalization heterogeneity homogeneity conceptualization corroboration triangulation compressibility conductivity viscosity attenuation oscillation stochastic multivariate granularity normative theorem lemma parameterize correlative counterfactual eigenvalue gravitation operationalize parameterization'.split(' '))excluded.add(word);
const updates = new Map();
let header;
for(const line of fs.readFileSync(path.join(root,'data/english-additions.txt'),'utf8').split(/\r?\n/)) {
  if(!line || line.startsWith('#'))continue;
  if(line.startsWith('@')) {header=line.slice(1).split('|');continue;}
  for(const pair of line.split(';')) {
    const [word,zh]=pair.split('=');
    if(!word||!zh||rejectNew.has(word)||!/^[a-z]+(?:-[a-z]+)*$/.test(word)||updates.has(word))continue;
    const [stage,pos,category,en,cn]=header;
    updates.set(word,{word,stage:+stage,row:[word,zh,'book',pos,category,en.replace('{word}',word),cn.replace('{zh}',zh),false,'usage']});
  }
}
for(const line of fs.readFileSync(path.join(root,'data/english-foundations.tsv'),'utf8').split(/\r?\n/)) {
  if(!line||line.startsWith('#'))continue;
  const [word,zh,pos,en,cn,stage]=line.split('|');
  updates.set(word,{word,stage:+stage,row:[word,zh,'book',pos,'Everyday',en,cn.replace('我们','我們'),false,'usage']});
}
const allCandidates=new Set([...original.map(r=>r[0]),...updates.keys()]);
const canonical=w=>aliases[w]&&allCandidates.has(aliases[w])?aliases[w]:w;
const records = new Map(); const removed=[];
for(const row of original) {
 const word=row[0];
 const reason = excluded.has(word)?'specialist or unsuitable headword':word.includes(' ')?'multiword item (phrases are a separate bank)':canonical(word)!==word?'spelling variant':/^On (Monday|Tuesday|Wednesday|Thursday|Friday)/.test(row[5])&&!updates.has(word)?'unreliable template example / definition':null;
 if(reason){removed.push({word,reason});continue;}
 records.set(word,{word,row:[...row],original:true});
}
for(const [word,item]of updates)if(records.has(word)){
 // Keep original illustrated entries and their concrete examples; repair all non-illustrated reviewed entries.
 const old=records.get(word);
 if(old.row[7]){old.stage=item.stage;continue;}
 records.set(word,{...item,original:true});
}
const extra=[...updates.values()].filter(x=>!records.has(x.word)&&!excluded.has(x.word)&&canonical(x.word)===x.word);
extra.sort((a,b)=>(a.stage<=2?-1:0)-(b.stage<=2?-1:0)||(freq[a.word]||30000)-(freq[b.word]||30000)||a.word.localeCompare(b.word));
const needed=7000-records.size;
if(extra.length<needed)throw Error(`Need ${needed} additions but only ${extra.length}; retained ${records.size}`);
for(const item of extra.slice(0,needed)) records.set(item.word,item);
const childWords=new Set(`dog cat bird fish rabbit bear duck frog apple banana orange milk bread egg cake sun moon star cloud rain tree flower leaf car bus train plane boat ball book pencil chair table cup shoe house hand water sleep jump smile family school happy wave sing wash help door bed hat spoon plate soap laugh clean pillow blanket square safe circle pocket button towel basket shirt pants napkin drawer notebook shelf curtain helmet toothbrush playground rainbow sandwich cookie butterfly turtle drum kite friend snack lunch cousin crayon ruler bedroom bathroom classroom student breakfast dinner cheese tomato potato chicken horse sheep monkey tiger lion road morning evening open close dance swim ant bee cow goat pig mouse fox wolf zebra giraffe elephant panda snail crab whale shark penguin owl rice soup juice candy grape peach pear lemon carrot corn onion noodle pizza yogurt cereal nose ear eye mouth finger foot hair face clap crawl draw throw catch kick sit stand toy doll bag box desk paper eraser glue scissors sock jacket coat dress skirt sweater shorts body red blue yellow green white black brown pink purple big small long short tall warm cold hot good bad new old young hungry thirsty tired angry sad funny kind loud quiet fast slow soft hard wet dry round full empty light heavy sunny cloudy windy foggy snow wind summer winter spring autumn mother father brother sister baby child boy girl man woman grandma grandfather grandmother parent aunt uncle family son daughter cousin mum mom dad daddy grandparent grandchild yes no please hello goodbye hi bye thanks thank sorry cute zero one two three four five six seven eight nine ten eleven twelve first second i you he she it we they me him her us them my your his our their this that these those the a an and or but is be do go have come get take give see look hear play make eat drink run walk read write count say tell know think like love want need can will home here there in on at to from up down under over left right back today tomorrow yesterday now then again before after not too also very all some any each every both more most many much only just own other same when what where who why how name age time day week month year hour minute number color shape game park beach sea sky ground earth arm leg neck shoulder tooth teeth clothes shoes animal fruit food pet tail wing nest leaf sand rock stone grass wood garden kitchen window floor wall roof fence gate path street town city shop store school zoo farm hospital nurse doctor teacher farmer student bus driver map key clock phone bed room bathroom toilet bath shower brush comb wash clean dirty dry wet asleep awake sick well afraid brave kind careful safe nice cool better best fine great fun small happy angry shy scared glad sleepy cheerful hungry thirsty tired beautiful pretty ugly easy difficult helpful hurt stop wait begin start finish let must may could should would about with for of by as so if into out near far outside inside across between along behind above below around without together alone away back again soon early late yesterday tomorrow tonight evening afternoon morning always never often sometimes usually really almost enough ready sure true false wrong correct little much such several than after before because until once twice yesterday listen speak learn spell alphabet letter word sentence story music song dance draw paint art toy doll balloon puzzle block gift present cake ice cream juice tea coffee honey butter jam sugar salt pepper fork knife bowl glass bottle paper pencil pen book bag hat cap glove scarf sock shoe shirt coat dress skirt pants pocket button zipper towel soap mirror hair eye ear nose mouth face finger thumb toe knee elbow cheek chin skin head back hand foot body smile laugh cry hug kiss wave nod clap jump hop skip swim ride fly sit stand sleep wake`.split(/\s+/));
const earlyWords = new Set(original.slice(0,1250).map(r=>r[0]));
for(const w of 'january february march april june july august september october november december monday tuesday wednesday thursday friday saturday sunday air puppy kitten bubble alphabet triangle cube ink bug monster dragon paw beard smile sneeze yawn cough spoon loaf jug bun diaper freezer beak petal thorn twig root peel sidewalk grandma grandfather grandson granddaughter grandmother mummy mama dad daddy mummy uncle aunt nephew niece garden seed zero cute'.split(' '))childWords.add(w);
for(const w of 'monthly weekly daily yearly hourly midday midnight downstairs upstairs cupboard microwave eyebrow fingernail eyelid nostril jaw thigh rib hip porch driveway cardboard cartoon comic password delete install downtown wheat herb chop neat costume donate penny dime carton ginger sponge kettle heater hairdryer sweatshirt pullover jumper saucepan saucer freezer suitcase pillowcase tablecloth washcloth dishcloth flashlight backpack schoolboy schoolgirl schoolchild schoolteacher babysitter hairdresser gardener shopkeeper handwriting spelling vowel consonant punctuation pronoun adverb verb adjective noun preposition syllable milkman postman fireman mailbox postbox snowstorm blizzard hail snowflake raincoat rainboot shoelace slipper sandal shoebox necktie scarf necklace ribbon cotton wool silk denim mustard mayonnaise ketchup walnut almond peanut cocoa vinegar olive stew dough broth crust syrup pastry quilt firework firefly popcorn oatmeal porridge teacup teaspoon cupboard cupboard'.split(' '))earlyWords.add(w);
const hardFloor = new Set(`statute creditor broker dismissal counsel federation socialism faction tenure onset rationality designation statutory sovereign legislation parliamentary clinical diagnostic empirical theoretical analytical methodology semantics rhetoric ideology liability litigation missionary successor deposition anthropology genetics biotechnology biochemistry warrant prosecutor defendant sovereignty bureaucracy`.split(/\s+/));
const forceFix={fat:['肥胖的','adjective','The cat is fat.','那隻貓很胖。'],interior:['內部','noun','The car has a clean interior.','車內很乾淨。'],default:['預設值','noun','Use the default setting.','使用預設設定。'],sticker:['貼紙','noun','Put a sticker on your notebook.','在筆記本上貼一張貼紙。'],texture:['質地','noun','The towel has a soft texture.','毛巾的質地柔軟。'],submission:['提交','noun','Check your work before submission.','提交前檢查你的作業。'],suite:['套房','noun','The hotel suite has two rooms.','這間飯店套房有兩個房間。'],conditioner:['潤髮乳','noun','Use conditioner after shampoo.','洗髮後使用潤髮乳。'],activist:['倡議者；社會運動者','noun','The activist works for cleaner rivers.','這位倡議者致力於讓河川更乾淨。'],mess:['凌亂','noun','My room is a mess.','我的房間很凌亂。'],opener:['開瓶器；開罐器','noun','Use an opener for this can.','用開罐器打開這個罐頭。'],squash:['壓扁','verb','Do not squash the bread.','不要壓扁麵包。'],scatter:['撒；散開','verb','Scatter the seeds on the soil.','把種子撒在土壤上。'],swell:['腫脹','verb','A sore ankle may swell.','疼痛的腳踝可能腫起來。']};
for(const [word,[zh,pos,en,cn]]of Object.entries(forceFix))if(records.has(word)){const r=records.get(word);r.row=[word,zh,'book',pos,'Everyday',en,cn,false,'usage'];r.stage=word==='default'?4:word==='activist'?4:word==='submission'?4:3;}
const groups=Object.fromEntries(stages.map(k=>[k,[]]));
const childOrder=new Map([...childWords].map((w,i)=>[w,i]));
function topicName(category){
 if(/Animal/.test(category))return 'Animals';
 if(/Food|Cooking/.test(category))return 'Food';
 if(/Home|House|Kitchen|Objects|Tools/.test(category))return 'Home';
 if(/Cloth|Fashion/.test(category))return 'Clothes';
 if(/School|Learning|Study|Academic|Language|Education|Reasoning/.test(category))return 'Study';
 if(/Feel|Emotion|Character/.test(category))return 'Feelings';
 if(/Health|Body|Safety/.test(category))return 'Health';
 if(/Nature|Weather|Outdoor|Environment/.test(category))return 'Nature';
 if(/Travel|Transportation|Place/.test(category))return 'Travel';
 if(/Family|People|Social/.test(category))return 'People';
 if(/Technology|Digital/.test(category))return 'Technology';
 if(/Work|Business|Money|Shopping|Policy|Econom/.test(category))return 'Work';
 if(/Music|Arts|Hobbies|Activities|Sport|Toys/.test(category))return 'Leisure';
 if(/Action|Communication/.test(category))return 'Actions';
 if(/Description|Adject|Adverb|Color|Shape/.test(category))return 'Description';
 if(/Time/.test(category))return 'Time';
 return 'Everyday';
}
for(const item of records.values()){
 const rank=freq[item.word]||20000;
 let stage=item.stage|| (rank<=1800?3:rank<=4000?4:rank<=7000?5:6);
 if(childWords.has(item.word))stage=1;
 else if(earlyWords.has(item.word))stage=2;
 else if(/^(Home|Clothes|Food|Animals)$/.test(topicName(item.row[4])))stage=Math.min(stage,2);
 if(hardFloor.has(item.word))stage=Math.max(stage,5);
 // Proper capitalization is display data; saved bookmarks are still case-insensitive.
 if(/^(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|i)$/.test(item.word)&&item.row[3]!=='modal'&&item.row[3]!=='verb')item.row[0]=item.word[0].toUpperCase()+item.word.slice(1);
 item.row=item.row.slice(0,8);
 // Articles agree with the following sound for the authored collocations.
 if(/^a [aeiou]/i.test(item.row[5])&&!/^a (unique|united|university|useful|useless|usual|unanimous)/i.test(item.row[5]))item.row[5]=item.row[5].replace(/^a /,'an ');
 if(/^a (honest|honorable|honourable|hour)/i.test(item.row[5]))item.row[5]=item.row[5].replace(/^a /,'an ');
 item.row[4]=topicName(item.row[4]);
 if(/^(cutlery|crockery|tableware|bakeware|cookware|dinnerware|dishware)$/.test(item.word)){item.row[5]='clean '+item.word;item.row[4]='Home';}
 if(item.word==='badminton'){item.row[5]='We play badminton after school.';item.row[6]='我們放學後打羽毛球。';}
 if(item.word==='asleep'){item.row[5]='The baby is asleep.';item.row[6]='寶寶睡著了。';}
 if(['frighten','startle','tease','scold','punish','discourage'].includes(item.word)&&item.row[5].includes('the child')){item.row[5]=`Do not ${item.word} the child.`;item.row[6]=`不要${item.row[1]}孩子。`;}
 if(item.word==='spill'&&item.row[5].includes('soup')){item.row[5]='Do not spill the soup.';item.row[6]='不要把湯灑出來。';}
 if(item.word==='overload'){item.row[5]='Do not overload the bag.';item.row[6]='不要在袋子裡裝太多東西。';}
 if(/^some /.test(item.row[5])&&/^(bagel|croissant|scone|baguette|tortilla|dumpling|wonton|crouton|pretzel|brownie|almond|cashew|pistachio|hazelnut|pecan|chestnut|raisin|prune|clove|scallop|truffle|marshmallow|cutlet|sardine|mussel|oyster)$/.test(item.word))item.row[5]+='s';
 if(item.word==='hail'){item.row[3]='noun';item.row[1]='冰雹';item.row[5]='Hail hit the roof during the storm.';item.row[6]='暴風雨時，冰雹打在屋頂上。';}
 groups[stages[stage-1]].push(item.row);
}
for(const [stage,rows]of Object.entries(groups))rows.sort((a,b)=>(stage==='starter'?(childOrder.get(a[0].toLowerCase())??999)-(childOrder.get(b[0].toLowerCase())??999):0)||(freq[a[0].toLowerCase()]||30000)-(freq[b[0].toLowerCase()]||30000)||a[0].localeCompare(b[0]));
const leveled=require('./twelve-levels.cjs')(groups,freq);
const report={baseCommit:'f746573fa80cfbf42d60a32f9e43b14431c5da5c',total:7000,counts:Object.fromEntries(Object.entries(leveled).map(([k,v])=>[k,v.length])),retained:7000-needed,added:needed,removed,source:'Original teaching content; ECDICT BNC frequency used only for ordering and editorial triage.',note:'Editorial learning stages, not certified CEFR levels. Same headword has one selected sense. Spelling alternatives are not used to fill the target.'};
fs.writeFileSync(path.join(root,'data/english-vocabulary.json'),JSON.stringify(leveled,null,2)+'\n');
fs.writeFileSync(path.join(root,'data/english-audit.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(root,'data/english-aliases.json'),JSON.stringify(Object.fromEntries(Object.entries(aliases).filter(([a,b])=>a!==b&&records.has(b))),null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,retained:report.retained,added:needed,removed:removed.length}));
