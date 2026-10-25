/* 經彩青春 SET 高中版｜守護528・12題互動・依 data/scenes.js 動態讀取幕數。 */
(function () {
  'use strict';
  const data=window.JINGCAI_DATA,stage=window.JINGCAI_STAGE;
  const poses=window.JINGCAI_POSES||{default:{},pages:{},finish:{}};
  const assets=window.JINGCAI_ASSETS||{ready:false,files:{}};
  const $=id=>document.getElementById(id);
  const ui={welcome:$('welcome'),play:$('play'),finish:$('finish'),start:$('startBtn'),
    reset:$('resetBtn'),again:$('againBtn'),back:$('backBtn'),next:$('nextBtn'),roster:$('characterRoster'),
    headerStars:$('headerStars'),stars:$('starCount'),heading:$('sceneTitle'),
    progress:$('progressTrack'),bar:$('progressBar'),art:$('stageArt'),narration:$('stageNarration'),cast:$('stageCast'),
    quiz:$('quizPanel'),quizNumber:$('quizNumber'),question:$('questionText'),options:$('options'),
    feedback:$('quizFeedback'),achievement:$('achievement'),achievementTitle:$('achievementTitle'),
    achievementStatus:$('achievementStatus'),achievementHint:$('achievementHint'),hint:$('controlHint'),
    finishTitle:$('finishTitle'),finishText:$('finishText'),unlock:$('unlockCode'),meaning:$('unlockMeaning'),
    copy:$('copyCodeBtn'),copyMessage:$('copyMessage')};
  const valid=!!(data&&stage&&Array.isArray(data.pages)&&Array.isArray(data.characters)&&
    data.pages.length>0&&data.pages.every((p,i)=>p.page===i+1&&stage.pages[p.page]&&Array.isArray(p.lines)));
  if(!valid){$('welcomeTitle').textContent='教材資料載入失敗，請重新整理頁面。';ui.start.disabled=true;return;}
  const pages=data.pages;
  const quizPages=pages.filter(p=>p.kind==='quiz');
  const quizCount=quizPages.length;
  if(!quizCount||pages.filter(p=>p.kind==='reward').length!==quizCount||
     quizPages.some((p,i)=>p.qid!==i+1||!Array.isArray(p.options)||p.options.length!==3||p.correct<0||p.correct>2)){
    $('welcomeTitle').textContent='互動題目資料不完整，請檢查劇本檔案。';ui.start.disabled=true;return;
  }
  const storageKey='jingcai-set-sh-youngtalk-20261025-v2';
  const state={index:-1,solved:new Set(),wrong:-1};
  const letters=['A','B','C'];
  const badges=['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
  const reduceMotion=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let resume=null,dialogueTimers=[],dialogueVersion=0;
  ui.progress.setAttribute('aria-valuemax',String(pages.length));

  function getSaved(){
    try{
      const obj=JSON.parse(sessionStorage.getItem(storageKey)||'null');
      if(!obj||!Number.isInteger(obj.index)||obj.index<0||obj.index>pages.length||!Array.isArray(obj.solved))return null;
      const solved=[...new Set(obj.solved.filter(n=>Number.isInteger(n)&&n>=1&&n<=quizCount))];
      return {index:obj.index,solved};
    }catch(_){return null;}
  }
  function save(){try{sessionStorage.setItem(storageKey,JSON.stringify({index:state.index,solved:[...state.solved]}));}catch(_){}}
  function clearSaved(){try{sessionStorage.removeItem(storageKey);}catch(_){}}
  function view(name){
    for(const key of ['welcome','play','finish'])ui[key].hidden=key!==name;
    ui.reset.hidden=name==='welcome';ui.headerStars.hidden=name==='welcome';
    if(typeof window.scrollTo==='function')window.scrollTo({top:0,behavior:'auto'});
  }
  function placeholder(name,className){
    const slot=document.createElement('div');slot.className=className;
    const hint=document.createElement('span');hint.className='slot-hint';hint.textContent='角色圖片預留區';
    hint.setAttribute('aria-hidden','true');slot.append(hint);slot.setAttribute('role','img');
    slot.setAttribute('aria-label',name+'的角色圖片預留位置');return slot;
  }
  function portraitFor(name,pose,className){
    const fallback=()=>placeholder(name,className);
    const source=assets.ready&&assets.files&&assets.files[pose];if(!source)return fallback();
    const holder=document.createElement('div');holder.className=className+' has-sprite';
    const img=document.createElement('img');img.className='character-sprite';img.src=source;img.alt=name;
    img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>holder.replaceWith(fallback()),{once:true});
    holder.append(img);return holder;
  }
  function buildRoster(){
    ui.roster.replaceChildren();
    for(const person of data.characters){
      const el=document.createElement('div');el.className='roster-person';
      el.append(portraitFor(person.speaker,poses.default[person.speaker],'roster-slot'));
      const name=document.createElement('strong');name.textContent=person.speaker;
      const info=document.createElement('small');info.textContent=person.tagline;
      el.append(name,info);ui.roster.append(el);
    }
  }
  function buildFinishCast(){
    const container=document.querySelector('.finish-cast');if(!container)return;
    container.replaceChildren();
    for(const name of data.characters.map(c=>c.speaker)){
      const el=document.createElement('div');el.className='finish-slot';
      el.append(portraitFor(name,(poses.finish||{})[name]||poses.default[name],'finish-portrait'));
      const label=document.createElement('b');label.textContent=name;el.append(label);container.append(el);
    }
  }
  function castFor(page){
    const setting=stage.pages[page.page],place=stage.locations[setting.location];
    ui.art.className='stage-art '+(place?place.className:'location-forum');
    ui.cast.className='cast actor-count-'+setting.cast.length;
    ui.cast.replaceChildren();dialogueTimers.forEach(id=>window.clearTimeout(id));dialogueTimers=[];
    const version=++dialogueVersion;ui.narration.replaceChildren();
    page.lines.forEach((line,i)=>{
      const narrator=line.speaker==='情境';
      const bubble=document.createElement('article');
      bubble.className='stage-bubble'+(narrator?' stage-bubble-narrator':'')+(line.text.length>100?' stage-bubble-long':'');
      bubble.setAttribute('aria-label','第'+(i+1)+'句，'+(narrator?'情境說明':line.speaker)+'：'+line.text);
      bubble.hidden=!reduceMotion&&i>0;
      const head=document.createElement('div');head.className='stage-bubble-head';
      const order=document.createElement('strong');order.className='bubble-order';order.textContent=badges[i]||String(i+1);
      head.append(order);
      if(!narrator){const speaker=document.createElement('span');speaker.className='bubble-speaker';
        speaker.textContent=page.kind==='reward'?'經彩知識（'+page.qid+'）· '+line.speaker:line.speaker;head.append(speaker);}
      const text=document.createElement('p');text.textContent=line.text;bubble.append(head,text);ui.narration.append(bubble);
    });
    if(!reduceMotion){Array.from(ui.narration.children).forEach((bubble,i)=>{
      if(i===0)return;
      dialogueTimers.push(window.setTimeout(()=>{if(version===dialogueVersion&&bubble.isConnected)bubble.hidden=false;},i*800));
    });}
    for(const name of setting.cast){
      const actor=document.createElement('div');actor.className='actor'+(setting.focus.includes(name)?' is-focus':'');
      const pagePoses=(poses.pages||{})[page.page]||{};
      actor.append(portraitFor(name,pagePoses[name]||poses.default[name],'portrait-slot'));
      const label=document.createElement('span');label.className='actor-name';label.textContent=name;
      actor.append(label);ui.cast.append(actor);
    }
  }
  function showAchievement(page){
    const earned=(page.kind==='quiz'||page.kind==='reward')&&state.solved.has(page.qid);
    ui.achievement.hidden=!earned;if(!earned)return;
    const result=page.kind==='reward'?page:pages.find(p=>p.kind==='reward'&&p.qid===page.qid);
    ui.achievementTitle.textContent=result?result.title:'答題成功';
    ui.achievementStatus.textContent='GOOD WORK · 已答對第 '+page.qid+' / '+quizCount+' 題';
    ui.achievementHint.textContent=page.kind==='quiz'?'本題已通過！按「下一幕」閱讀知識回饋。':'經彩知識徽章已獲得！請閱讀舞臺中的完整知識說明。';
  }
  function feedback(message,correct){
    ui.feedback.hidden=false;ui.feedback.className='feedback '+(correct?'is-correct':'is-wrong');ui.feedback.textContent=message;
  }
  function choose(page,i){
    if(state.solved.has(page.qid))return;
    if(i===page.correct){state.solved.add(page.qid);state.wrong=-1;
      feedback('答對了！按「下一幕」閱讀本題的經彩知識回饋。',true);showAchievement(page);save();
    }else{state.wrong=i;feedback('再想一想！可以重新選擇答案，答對後才能前往下一幕。',false);}
    renderOptions(page);ui.next.disabled=!state.solved.has(page.qid);
    ui.hint.textContent=ui.next.disabled?'答錯可以重新選擇。':'已答對，請繼續閱讀下一幕！';
    ui.stars.textContent=String(state.solved.size);
  }
  function renderOptions(page){
    ui.options.replaceChildren();
    page.options.forEach((label,i)=>{
      const btn=document.createElement('button');btn.type='button';btn.className='option';
      const badge=document.createElement('span');badge.className='option-letter';badge.textContent=letters[i];
      const text=document.createElement('span');text.textContent=label;btn.append(badge,text);
      const solved=state.solved.has(page.qid);
      if(solved&&i===page.correct)btn.classList.add('correct');
      if(!solved&&state.wrong===i)btn.classList.add('wrong');
      btn.disabled=solved;btn.setAttribute('aria-label',letters[i]+'：'+label);
      btn.addEventListener('click',()=>choose(page,i));ui.options.append(btn);
    });
  }
  function renderQuiz(page){
    ui.quiz.hidden=page.kind!=='quiz';showAchievement(page);state.wrong=-1;
    if(page.kind==='quiz'){
      ui.quizNumber.textContent='互動挑戰 '+String(page.qid).padStart(2,'0')+' / '+quizCount;
      ui.question.textContent=page.question;ui.feedback.hidden=true;
      if(state.solved.has(page.qid))feedback('這一題已完成 ✓。閱讀下一幕，複習本題的知識重點。',true);
      renderOptions(page);ui.next.disabled=!state.solved.has(page.qid);
      ui.hint.textContent=ui.next.disabled?'先完成這一題才能繼續。':'已通過本題，可以進入下一幕。';
    }else{ui.next.disabled=false;ui.hint.textContent=page.kind==='reward'?'這是剛才題目的知識回饋，讀完可以繼續。':'閱讀情境與臺詞，再前往下一幕。';}
  }
  function render(){
    if(state.index>=pages.length){finish();return;}
    const page=pages[state.index];if(!page){reset(false);return;}
    ui.heading.textContent=page.title;ui.stars.textContent=String(state.solved.size);
    ui.bar.style.width=String((page.page/pages.length)*100)+'%';
    ui.progress.setAttribute('aria-valuenow',String(page.page));castFor(page);renderQuiz(page);
    ui.back.textContent=state.index===0?'← 回到首頁':'← 上一幕';
    ui.next.textContent=state.index===pages.length-1?'領取經彩青春 SET 密碼 →':'下一幕 →';
    save();view('play');ui.heading.focus({preventScroll:true});
  }
  function finish(){
    if(state.solved.size!==quizCount){state.index=pages.length-1;render();return;}
    state.index=pages.length;ui.finishTitle.textContent=data.ending.title;
    ui.finishText.textContent=data.ending.text;ui.unlock.textContent=data.ending.code;
    ui.meaning.textContent=data.ending.meaning||'';ui.stars.textContent=String(state.solved.size);
    ui.copyMessage.textContent='';save();view('finish');ui.finishTitle.focus({preventScroll:true});
  }
  function start(){
    if(resume){state.index=resume.index;state.solved=new Set(resume.solved);resume=null;}
    else{state.index=0;state.solved.clear();}
    render();
  }
  function reset(ask){
    if(ask&&!window.confirm('確定要重新開始嗎？目前答題進度將被清除。'))return;
    state.index=-1;state.solved.clear();state.wrong=-1;resume=null;clearSaved();
    ui.stars.textContent='0';ui.copyMessage.textContent='';ui.start.textContent='開始挑戰 →';
    view('welcome');ui.start.focus({preventScroll:true});
  }
  async function copyCode(){
    const code=data.ending.code;
    try{if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);ui.copyMessage.textContent='通關密碼已複製：'+code;
    }catch(_){
      const input=document.createElement('textarea');input.value=code;input.style.cssText='position:fixed;left:-9999px';
      document.body.append(input);input.select();const success=!!(document.execCommand&&document.execCommand('copy'));input.remove();
      ui.copyMessage.textContent=success?'通關密碼已複製：'+code:'通關密碼：'+code+'（請長按複製）';
    }
  }
  buildRoster();buildFinishCast();resume=getSaved();
  if(resume)ui.start.textContent='繼續上次進度 →';
  ui.start.addEventListener('click',start);ui.reset.addEventListener('click',()=>reset(true));
  ui.again.addEventListener('click',()=>reset(false));
  ui.back.addEventListener('click',()=>{if(state.index<=0){reset(false);return;}state.index--;render();});
  ui.next.addEventListener('click',()=>{if(state.index<0||state.index>=pages.length)return;
    const page=pages[state.index];if(page.kind==='quiz'&&!state.solved.has(page.qid))return;
    state.index++;render();});
  ui.copy.addEventListener('click',copyCode);view('welcome');
})();
