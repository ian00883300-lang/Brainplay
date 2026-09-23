// Embedded by build-page.cjs; no network request is needed for offline learning.
const ENGLISH_STAGES = Array.from({length:12},(_,i)=>{const n=i+1;return ['L'+n,n<=10?'L'+n+'（'+(n*2-1)+'～'+(n*2)+' 歲）':n===11?'L11・多益金色目標（860+）':'L12・母語進階／少量專業',n<=10?'L'+n+' · ages '+(n*2-1)+'–'+n*2:n===11?'L11 · TOEIC gold target (860+)':'L12 · advanced / specialist'];});
const ENGLISH_PROGRESS_KEY='brainplay_english_progress_v1';
function englishProgress(){
  try {
    const value=JSON.parse(storageGet(ENGLISH_PROGRESS_KEY,'{}'));
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  } catch {return {};}
}
function englishRecord(word,correct,now=Date.now()){
  const data=englishProgress(), key=word.toLowerCase(), old=data[key]||{};
  const streak=correct?Math.min(4,Math.max(0,Number(old.streak)||0)+1):0;
  data[key]={attempts:(Number(old.attempts)||0)+1,correct:(Number(old.correct)||0)+(correct?1:0),streak,last:now,due:correct?now+[0,1,3,7,14][streak]*86400000:now};
  storageSet(ENGLISH_PROGRESS_KEY,JSON.stringify(data));
}
function englishStageLabel(level){const item=ENGLISH_STAGES.find(x=>x[0]===level)||ENGLISH_STAGES[0];return localText(item[1],item[2]);}
function englishTopicLabel(topic){const zh={Animals:'動物',Food:'飲食',Home:'居家用品',Clothes:'衣物',Study:'學校與學習',Feelings:'心情與品格',Health:'身體與健康',Nature:'自然與天氣',Travel:'地點與交通',People:'家人與人物',Technology:'科技生活',Work:'工作與購物',Leisure:'休閒活動',Actions:'動作與溝通',Description:'描述與特徵',Time:'時間',Everyday:'日常通用'};return localText(zh[topic]||topic,topic);}
function englishDifficultySelect(){return `<label id="englishStageWrap">${localText('學習階段','Learning stage')}<select id="difficultySelect">${ENGLISH_STAGES.map(([key,zh,en])=>`<option value="${key}">${localText(zh,en)} · ${vocabItems(key).length}</option>`).join('')}</select></label>`;}
function englishMeanings(item){return new Set(String(item.zh).split(/[；;、，,（(]/).map(x=>x.trim()).filter(Boolean));}
function englishChoices(current,pool,count=3){
  const selected=[current],used=new Set([current.word.toLowerCase()]), meanings=englishMeanings(current);
  // Same part of speech first; never pull distractors from a harder learning stage.
  const others=shuffle(pool).sort((a,b)=>(b.pos===current.pos?1:0)-(a.pos===current.pos?1:0));
  for(const item of others){
    if(selected.length>=count)break;
    const key=item.word.toLowerCase(), next=englishMeanings(item);
    if(used.has(key)||[...next].some(x=>meanings.has(x)))continue;
    selected.push(item);used.add(key);for(const meaning of next)meanings.add(meaning);
  }
  return shuffle(selected);
}
function englishPool(level,{scope='all'}={}){
  let pool=vocabItems(level);
  const progress=englishProgress(),now=Date.now();
  if(scope==='starred')pool=pool.filter(x=>isVocabStarred(x.word));
  if(scope==='review')pool=pool.filter(x=>progress[x.word.toLowerCase()]&&Number(progress[x.word.toLowerCase()].due)<=now);
  return pool;
}
function renderVocab(body){
  body.innerHTML=`${toolbar(`<label>${t('mode')}<select id="vocabMode">
    <option value="flash">${t('flashcard')}</option><option value="mixed">${t('mixedVocab')}</option>
    <option value="blank">${t('missingLetter')}</option><option value="meaning">${t('meaningChoice')}</option>
    <option value="audioMeaning">${t('audioMeaning')}</option><option value="meaningAudio">${t('meaningAudio')}</option>
    <option value="phraseFlash">${localText('片語卡','Phrase cards')}</option></select></label>
    <label id="englishScopeWrap">${localText('練習範圍','Practice set')}<select id="englishScope"><option value="all">${localText('全部','All')}</option><option value="review">${localText('錯題與到期複習','Mistakes and due review')}</option><option value="starred">${localText('星號收藏','Starred words')}</option></select></label>
    <span id="vocabCountWrap">${stepperHTML('vocabCount',5,1,20)}</span>`)}
    <div class="study-mode-note" id="englishGuide"></div><div class="play-area" id="vocabPlay">
    <div class="progress"><div id="vocabProgress"></div></div><div class="message-box" id="vocabMsg" aria-live="polite"></div>
    <div id="vocabContent"></div><div class="center-actions"><button class="primary-btn" id="vocabStart">${localText('開始學習','Start learning')}</button></div></div>${reportShell('vocabReport')}`;
  bindSteppers(body);
  const modeEl=$('#vocabMode'),levelEl=$('#difficultySelect'),scopeEl=$('#englishScope');
  let mode='flash',level='L1',pool=[],deck=[],current=null,index=0,correct=0,details=[],active=false,locked=false,questionMode='',options=[],blank=null,letters=[],started=0,questionPause=0,studied=new Set(),audioRun=0;
  let speed=Number(storageGet('brainplay_flash_speed','1'))===.6?.6:1;
  const isStudy=()=>mode==='flash'||mode==='phraseFlash';
  const phrase=()=>mode==='phraseFlash';
  const isPaused=()=>!!state.session?.paused;
  const currentWord=()=>phrase()?current.phrase:current.word;
  const usageLabel=()=>localText('用法：例句或搭配','Usage: sentence or collocation');
  function stopAudio(){audioRun++;window.speechSynthesis?.cancel();clearSpeechHighlight();}
  function say(text,button,done){speakText(text,speed===.6?.48:.78,button,done);}
  function availableSpeech(){return 'speechSynthesis'in window&&typeof SpeechSynthesisUtterance!=='undefined';}
  function filters(){return {scope:scopeEl.value};}
  function updateSetup(){
    if(active)return;
    body.querySelector('.toolbar').hidden=false;$('#englishGuide').hidden=false;body.querySelector('.bank-count').hidden=false;
    mode=modeEl.value;const study=isStudy(),p=phrase();
    $('#englishScopeWrap').hidden=p;$('#vocabCountWrap').hidden=study;
    pool=p?englishPhraseItems(levelEl.value):englishPool(levelEl.value,filters());
    $('#englishGuide').textContent=localText('年齡僅為選級參考，請依能力調整；L1、L2 建議成人陪伴聽說，不要求識字。L11 為多益金色目標字彙，不保證分數；L12 為進階閱讀與少量專業用語。先看 5 張卡再練習，答錯立即複習，答對隔 1、3、7、14 天再見。','Ages are suggestions: choose by ability. L1–L2 support shared listening with an adult, not expected reading. L11 targets advanced TOEIC vocabulary without a score guarantee; L12 covers advanced reading and selected specialist terms. Review after 1, 3, 7 and 14 days.');
    $('#vocabMsg').textContent=pool.length?localText(`此範圍 ${pool.length} ${p?'個片語':'字'}。${study?'自由學習，不計分。':'每回合不重複出題。'}`,`${pool.length} ${p?'phrases':'words'} in this set. ${study?'Study without scoring.':'No repeated headwords within a quiz.'}`):localText('此範圍目前沒有單字。可切換等級或題庫。','No words in this set. Change the level or practice set.');
    $('#vocabStart').disabled=!pool.length;$('#vocabStart').textContent=study?localText('開始學習','Start learning'):t('start');
    if(!availableSpeech()&&(mode==='audioMeaning'||mode==='meaningAudio')){$('#vocabStart').disabled=true;$('#vocabMsg').textContent=localText('此瀏覽器沒有語音功能，請選單字卡、填空或看詞選義。','Speech is unavailable. Choose flashcards, spelling or word meanings.');}
    stats();
  }
  function stats(){
    $('#gameStats').innerHTML=isStudy()?miniStat(localText('已看字卡','Cards seen'),studied.size):miniStat(t('correct'),`${correct}/${details.length}`)+miniStat(t('completed'),`${details.length}/${deck.length||0}`);
  }
  function speedButtons(){return `<div class="speech-speed-control"><span>${t('speechSpeed')}</span><button data-en-speed="1" class="${speed===1?'active':''}">${t('normalSpeed')}</button><button data-en-speed="0.6" class="${speed===.6?'active':''}">${localText('慢速','Slow')}</button></div>`;}
  function speechButtons(withUsage=true){return `${speedButtons()}<div class="speech-actions"><button class="primary-btn" id="enSpeak">🔊 ${t('listenWord')}</button>${withUsage?`<button class="primary-btn" id="enUsageSpeak">🔊 ${localText('朗讀用法','Read usage')}</button>`:''}</div><p id="enSpeechStatus" class="vocab-helper-note" aria-live="polite"></p>`;}
  function bindSpeech(){
    for(const b of $$('[data-en-speed]',body))b.onclick=()=>{stopAudio();speed=Number(b.dataset.enSpeed);storageSet('brainplay_flash_speed',String(speed));$$('[data-en-speed]',body).forEach(x=>x.classList.toggle('active',Number(x.dataset.enSpeed)===speed));};
    const status=$('#enSpeechStatus');
    const speak=(text,b)=>{if(isPaused())return;stopAudio();if(status)status.textContent=localText('若沒有聽到聲音，請檢查裝置音量，或改用文字模式。','If you hear no sound, check the volume or use a text mode.');say(text,b);};
    const wordButton=$('#enSpeak'),usageButton=$('#enUsageSpeak');
    if(wordButton){wordButton.disabled=!availableSpeech();wordButton.onclick=()=>speak(currentWord(),wordButton);}
    if(usageButton){usageButton.disabled=!availableSpeech();usageButton.onclick=()=>speak(current.example,usageButton);}
    if(status&&!availableSpeech())status.textContent=localText('此裝置不支援語音，仍可閱讀與練習。','Speech is unavailable; reading and text practice still work.');
  }
  function starButton(){return `<button class="flash-vocab-star ${isVocabStarred(current.word)?'active':''}" id="flashVocabStar">${vocabStarButtonText(current.word)}</button>`;}
  function bindStar(){const b=$('#flashVocabStar');if(b)b.onclick=()=>{const on=toggleVocabStar(current.word);b.classList.toggle('active',on);b.textContent=vocabStarButtonText(current.word);};}
  function usage(){return `<div class="vocab-example"><small>${usageLabel()}</small><strong>${escapeHTML(current.example)}</strong><span>${escapeHTML(current.exampleZh)}</span></div>`;}
  function studyControls(){return `<div class="study-switcher"><label>${localText('題庫','Bank')}<select id="studyBank"><option value="flash">${localText('單字卡','Words')}</option><option value="phraseFlash">${localText('片語卡','Phrases')}</option></select></label><label>${localText('等級','Level')}<select id="studyLevel">${ENGLISH_STAGES.map(([key,zh,en])=>`<option value="${key}">${localText(zh,en)}</option>`).join('')}</select></label>${phrase()?'':`<label>${localText('範圍','Set')}<select id="studyScope">${scopeEl.innerHTML}</select></label>`}</div>`;}
  function bindStudyControls(){
    $('#studyBank').value=mode;$('#studyLevel').value=level;if($('#studyScope'))$('#studyScope').value=scopeEl.value;
    const change=()=>{const nextMode=$('#studyBank').value,nextLevel=$('#studyLevel').value,nextScope=$('#studyScope')?.value||'all';stopAudio();active=false;setConfigDisabled(false);modeEl.value=nextMode;levelEl.value=nextLevel;scopeEl.value=nextScope;$('#vocabContent').innerHTML='';$('#vocabStart').hidden=false;updateSetup();start();};
    $('#studyBank').onchange=change;$('#studyLevel').onchange=change;if($('#studyScope'))$('#studyScope').onchange=change;
  }
  function card(){
    if(!active||!deck.length)return;
    stopAudio();current=deck[index];studied.add(currentWord());
    $('#vocabProgress').style.width=`${(index+1)/deck.length*100}%`;
    $('#vocabMsg').textContent=`${index+1} / ${deck.length} · ${localText('自由學習，不計分','Study without scoring')}`;
    $('#vocabContent').innerHTML=`${studyControls()}<div class="vocab-card"><div class="vocab-word">${escapeHTML(currentWord())}</div>${phrase()?'':starButton()}<div class="vocab-zh">${escapeHTML(phrase()?current.meaning:current.zh)}</div>${phrase()?'':`<div class="vocab-pos-hint">${escapeHTML(posLabel(current.pos))}</div>`}${usage()}${speechButtons()}<div class="flash-nav"><button class="secondary-btn" id="flashPrev">← ${t('previousCard')}</button><button class="secondary-btn" id="flashRandom">🎲 ${t('randomCard')}</button><button class="primary-btn" id="flashNext">${t('nextCard')} →</button></div><div class="flash-study-actions">${phrase()?'':`<button class="primary-btn" id="enPracticeSeen">${localText('練習剛看過的單字','Practice these cards')}</button>`}<button class="secondary-btn" id="flashFinish">${localText('結束學習','Finish learning')}</button></div></div>`;
    bindStudyControls();bindSpeech();bindStar();
    $('#flashPrev').disabled=deck.length<2;$('#flashNext').disabled=deck.length<2;$('#flashRandom').disabled=deck.length<2;
    $('#flashPrev').onclick=()=>{index=(index-1+deck.length)%deck.length;card();};
    $('#flashNext').onclick=()=>{index=(index+1)%deck.length;card();};
    $('#flashRandom').onclick=()=>{if(deck.length>1){index=(index+1+rand(0,deck.length-2))%deck.length;card();}};
    $('#flashFinish').onclick=finishStudy;
    const practice=$('#enPracticeSeen');if(practice)practice.onclick=()=>{const seen=deck.filter(x=>studied.has(x.word));finishStudy();modeEl.value='mixed';updateSetup();start(seen.slice(0,20));};
    stats();
  }
  function finishStudy(){stopAudio();clearAsync();active=false;setConfigDisabled(false);$('#vocabContent').innerHTML='';$('#vocabStart').hidden=false;updateSetup();}
  function start(seen=null){
    if(active)return;
    mode=modeEl.value;level=levelEl.value;pool=phrase()?englishPhraseItems(levelEl.value):englishPool(level,filters());
    if(!pool.length){updateSetup();return;}
    if(!availableSpeech()&&['audioMeaning','meaningAudio'].includes(mode)){updateSetup();return;}
    const wanted=clamp(Number($('#vocabCount').value||5),1,20);
    deck=isStudy()?[...pool]:shuffle(seen||pool).slice(0,seen?Math.min(seen.length,20):wanted);
    index=correct=0;details=[];studied=new Set();active=true;locked=false;
    $('#vocabReport').classList.remove('show');$('#vocabPlay').style.display='block';$('#vocabStart').hidden=true;
    body.querySelector('.toolbar').hidden=true;$('#englishGuide').hidden=true;body.querySelector('.bank-count').hidden=true;
    if(isStudy()){clearAsync();setConfigDisabled(true);card();}
    else {beginSession('vocab',()=>finishQuiz(true),stats);next();}
  }
  function next(){
    if(!active||isPaused())return;
    stopAudio();if(index>=deck.length){finishQuiz(false);return;}
    locked=false;current=deck[index];letters=[];started=performance.now();questionPause=state.session?.pausedTotal||0;
    const modes=availableSpeech()?['meaning','blank','audioMeaning','meaningAudio']:['meaning','blank'];
    questionMode=mode==='mixed'?modes[index%modes.length]:mode;
    $('#vocabProgress').style.width=`${index/deck.length*100}%`;
    $('#vocabMsg').textContent=`${t('question')} ${index+1}/${deck.length} · ${englishStageLabel(level)}`;
    if(questionMode==='blank')renderBlank();else renderChoices();stats();
  }
  function renderBlank(){
    const n=Number(level.slice(1)),difficulty=n<=3?'easy':n<=6?'medium':n<=9?'hard':'extreme';
    blank=makeBlankData(current,difficulty);
    $('#vocabContent').innerHTML=`<div class="vocab-card"><div class="blank-answer-display" id="blankAnswerDisplay"></div><div class="vocab-zh">${escapeHTML(current.zh)}</div><div class="vocab-pos-hint">${escapeHTML(posLabel(current.pos))}</div><p>${t('chooseLetters')}</p><div class="blank-letter-options">${blankLetterOptions(blank.answers).map(x=>`<button class="blank-letter-btn" data-letter="${x}">${x}</button>`).join('')}</div><div class="blank-edit-actions"><button class="secondary-btn" id="blankEdit">↶ ${t('editAnswer')}</button><button class="secondary-btn" id="blankClear">${t('clear')}</button><button class="primary-btn" id="blankSubmit" disabled>${t('submit')}</button></div>${speechButtons(false)}</div>`;
    const paint=()=>{$('#blankAnswerDisplay').innerHTML=renderMaskedWord(blank,letters);$('#blankSubmit').disabled=letters.length!==blank.answers.length;$('#blankEdit').disabled=!letters.length;$('#blankClear').disabled=!letters.length;};
    $$('[data-letter]',body).forEach(b=>b.onclick=()=>{if(locked||isPaused()||letters.length>=blank.answers.length)return;letters.push(b.dataset.letter);paint();});
    $('#blankEdit').onclick=()=>{letters.pop();paint();};$('#blankClear').onclick=()=>{letters=[];paint();};
    $('#blankSubmit').onclick=()=>answer(letters.join('')===blank.missing,letters.join(' '),`${current.word} · ${blank.answers.join(' ')}`,blank.masked);
    bindSpeech();paint();
  }
  function renderChoices(){
    // Distractors use the selected stage; a one-word review set still has a meaningful quiz.
    options=englishChoices(current,vocabItems(level),Number(level.slice(1))<=2?2:3);
    const audio=questionMode==='meaningAudio',listen=questionMode==='audioMeaning';
    $('#vocabContent').innerHTML=`<div class="vocab-card"><p>${audio?t('chooseAudio'):listen?t('listenAndChoose'):t('chooseMeaning')}</p>${listen?'':`<div class="${audio?'vocab-zh':'vocab-word'}">${escapeHTML(audio?current.zh:current.word)}</div><div class="vocab-pos-hint">${escapeHTML(posLabel(current.pos))}</div>`}${audio?speedButtons():speechButtons(false)}<div class="choice-grid vocab-three-options">${options.map((x,i)=>audio?`<div class="audio-choice"><button class="primary-btn" data-play="${i}" aria-label="${localText('重播','Replay')} ${String.fromCharCode(65+i)}">🔊 ${String.fromCharCode(65+i)}</button><button class="choice-btn" data-answer="${i}">${localText('選擇','Choose')} ${String.fromCharCode(65+i)}</button></div>`:`<button class="choice-btn" data-answer="${i}">${escapeHTML(x.zh)}</button>`).join('')}</div>${audio?`<div class="center-actions"><button class="secondary-btn" id="enPlayAll">${localText('依序播放所有選項','Play all options')}</button></div><p id="enSpeechStatus" aria-live="polite"></p>`:''}</div>`;
    bindSpeech();
    if(audio||listen){const fallback=document.createElement('button');fallback.className='secondary-btn';fallback.id='enTextFallback';fallback.textContent=localText('沒有聲音？改看文字','No sound? Use text');fallback.onclick=()=>{if(locked||isPaused())return;stopAudio();questionMode='meaning';renderChoices();};$('#vocabContent').appendChild(fallback);}
    $$('[data-answer]',body).forEach(b=>b.onclick=()=>{const choice=options[Number(b.dataset.answer)];answer(choice.word===current.word,audio?`${String.fromCharCode(65+Number(b.dataset.answer))} · ${choice.word}`:choice.zh,audio?current.word:current.zh,audio?current.zh:current.word);});
    $$('[data-play]',body).forEach(b=>b.onclick=()=>{if(isPaused())return;stopAudio();say(options[Number(b.dataset.play)].word,b);});
    if(audio)$('#enPlayAll').onclick=()=>{
      stopAudio();const run=audioRun;let i=0;
      const playNext=()=>{if(run!==audioRun||!active||locked||isPaused()||i>=options.length)return;const n=i++;$('#enSpeechStatus').textContent=localText(`播放 ${String.fromCharCode(65+n)}`,`Playing ${String.fromCharCode(65+n)}`);say(options[n].word,$(`[data-play="${n}"]`,body),()=>later(playNext,500));};
      playNext();
    };
  }
  function answer(ok,userAnswer,correctAnswer,prompt){
    if(!active||locked||isPaused())return;
    locked=true;stopAudio();if(ok)correct++;englishRecord(current.word,ok);
    details.push({prompt,userAnswer,correctAnswer,correct:ok,timeMs:Math.max(0,performance.now()-started-((state.session?.pausedTotal||0)-questionPause)),vocabWord:current.word,vocabZh:current.zh});
    index++;playSound(ok?'good':'bad');stats();
    $('#vocabProgress').style.width=`${index/deck.length*100}%`;
    $('#vocabMsg').textContent=ok?t('correctFeedback'):localText('一起再看一次，這個字已加入複習。','Let us review it together. This word is now due for review.');
    $('#vocabContent').innerHTML=`<div class="vocab-feedback ${ok?'correct':'incorrect'}"><div class="feedback-word">${escapeHTML(current.word)}</div>${starButton()}<div class="vocab-zh">${escapeHTML(current.zh)}</div><div>${escapeHTML(posLabel(current.pos))}</div><p>${t('yourChoice')}: ${escapeHTML(userAnswer)}<br>${t('correctAnswer')}: ${escapeHTML(correctAnswer)}</p>${usage()}${speechButtons()}<div class="next-question-wrap"><button class="primary-btn" id="vocabNextQuestion">${index===deck.length?t('viewResults'):t('nextQuestion')} →</button></div></div>`;
    bindSpeech();bindStar();$('#vocabNextQuestion').onclick=next;
  }
  function finishQuiz(endedEarly){
    if(!active)return;stopAudio();active=false;
    const accuracy=details.length?correct/details.length*100:0;
    $('#vocabPlay').style.display='none';
    finalizeSession({game:'vocab',success:!endedEarly&&accuracy>=70,endedEarly,score:Math.round(accuracy),accuracy,totalTime:elapsed(),details,reportSelector:'#vocabReport',summary:`${correct}/${details.length} · ${Math.round(accuracy)}% · ${localText('以正確率為主，不以速度扣分','Accuracy matters; no speed penalty')}`,badgeCondition:!endedEarly&&accuracy>=90,skills:{[t('englishSkill')]:accuracy},restart:()=>{updateSetup();start();}});
    const wrong=details.filter(x=>!x.correct).map(x=>x.vocabWord);
    if(wrong.length){const b=document.createElement('button');b.className='primary-btn';b.id='enRetryMistakes';b.textContent=localText('再練本次錯題','Practice these mistakes');b.onclick=()=>{modeEl.value='mixed';updateSetup();start(deck.filter(x=>wrong.includes(x.word)));};$('#vocabReport').appendChild(b);}
    else if(!endedEarly){const p=document.createElement('p');p.textContent=localText('明天再複習一次，熟悉後再調整等級。','Review again tomorrow and change levels when ready.');$('#vocabReport').appendChild(p);}
  }
  levelEl.onchange=updateSetup;scopeEl.onchange=updateSetup;modeEl.onchange=updateSetup;
  $('#vocabStart').onclick=()=>start();updateSetup();
}
