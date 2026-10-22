/* 經彩青春 SET 高中篇｜角色舞臺／劇情對話／7 題互動。正式文案以 data/scenes.js 為唯一來源。 */
(function(){
  "use strict";
  const data=window.JINGCAI_DATA;
  const stage=window.JINGCAI_STAGE;
  const poses=window.JINGCAI_POSES||{default:{},pages:{},finish:{}};
  const assets=window.JINGCAI_ASSETS||{ready:false,files:{}};
  const $=id=>document.getElementById(id);
  const ui={
    welcome:$("welcome"),play:$("play"),finish:$("finish"),start:$("startBtn"),
    reset:$("resetBtn"),again:$("againBtn"),back:$("backBtn"),next:$("nextBtn"),
    roster:$("characterRoster"),headerStars:$("headerStars"),
    stars:$("starCount"),heading:$("sceneTitle"),
    progress:$("progressTrack"),bar:$("progressBar"),
    art:$("stageArt"),narration:$("stageNarration"),cast:$("stageCast"),
    quiz:$("quizPanel"),quizNumber:$("quizNumber"),question:$("questionText"),
    options:$("options"),feedback:$("quizFeedback"),achievement:$("achievement"),
    achievementTitle:$("achievementTitle"),achievementStatus:$("achievementStatus"),achievementHint:$("achievementHint"),hint:$("controlHint"),
    finishTitle:$("finishTitle"),finishText:$("finishText"),unlock:$("unlockCode"),
    meaning:$("unlockMeaning"),copy:$("copyCodeBtn"),copyMessage:$("copyMessage")
  };
  if(!data || !stage || !Array.isArray(data.pages) || data.pages.length!==15 ||
     !data.pages.every(p=>stage.pages[p.page] && Array.isArray(p.lines))){
    const title=$("welcomeTitle");
    if(title)title.textContent="教材資料載入失敗，請重新整理頁面。";
    if(ui.start)ui.start.disabled=true;
    return;
  }
  const pages=data.pages;
  const storageKey="jingcai-set-senior-high-stage-20261022";
  const state={index:-1,solved:new Set(),wrong:-1};
  const moods={unwell:"身體不適",worried:"擔心",curious:"好奇",relieved:"放心",smile:"開心"};
  const letters=["A","B","C"];
  let resume=null;
  let dialogueTimers=[];
  let dialogueVersion=0;
  const reduceMotion=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function getSaved(){
    try{
      const v=JSON.parse(sessionStorage.getItem(storageKey)||"null");
      if(!v || !Number.isInteger(v.index) || v.index<0 || v.index>pages.length ||
         !Array.isArray(v.solved))return null;
      const solved=v.solved.filter(n=>Number.isInteger(n)&&n>=1&&n<=7);
      return {index:v.index,solved:[...new Set(solved)]};
    }catch(_){return null}
  }
  function save(){
    try{sessionStorage.setItem(storageKey,JSON.stringify({index:state.index,solved:[...state.solved]}))}catch(_){}
  }
  function clearSaved(){try{sessionStorage.removeItem(storageKey)}catch(_){}}
  function view(name){
    for(const key of ["welcome","play","finish"])ui[key].hidden=key!==name;
    const active=name!=="welcome";
    ui.reset.hidden=!active;
    ui.headerStars.hidden=!active;
    if(typeof window.scrollTo==="function")window.scrollTo({top:0,behavior:"auto"});
  }
  function placeholder(label,className){
    const slot=document.createElement("div");
    slot.className=className;
    const hint=document.createElement("span");
    hint.className="slot-hint";
    hint.textContent="角色圖片預留區";
    hint.setAttribute("aria-hidden","true");
    slot.append(hint);
    slot.setAttribute("role","img");
    slot.setAttribute("aria-label",label+"的角色圖片預留位置");
    return slot;
  }
  function portraitFor(personName,poseCode,className){
    const fallback=()=>placeholder(personName,className);
    const source=assets.ready&&assets.files&&assets.files[poseCode];
    if(!source)return fallback();
    const holder=document.createElement("div");
    holder.className=className+" has-sprite";
    const picture=document.createElement("img");
    picture.className="character-sprite";
    picture.src=source;
    picture.alt=personName;
    picture.loading="lazy";
    picture.decoding="async";
    picture.addEventListener("error",()=>holder.replaceWith(fallback()),{once:true});
    holder.append(picture);
    return holder;
  }
  function buildRoster(){
    ui.roster.replaceChildren();
    for(const person of data.characters){
      const item=document.createElement("div");
      item.className="roster-person";
      const code=poses.default[person.speaker];
      const box=portraitFor(person.speaker,code,"roster-slot");
      const label=document.createElement("strong");label.textContent=person.speaker;
      const desc=document.createElement("small");desc.textContent=person.tagline;
      item.append(box,label,desc);ui.roster.append(item);
    }
  }
  function buildFinishCast(){
    const container=document.querySelector(".finish-cast");
    if(!container)return;
    container.replaceChildren();
    for(const name of data.characters.map(c=>c.speaker)){
      const item=document.createElement("div");item.className="finish-slot";
      item.append(portraitFor(name,poses.finish[name]||poses.default[name],"finish-portrait"));
      const label=document.createElement("b");label.textContent=name;
      item.append(label);container.append(item);
    }
  }
  function castFor(page){
    const config=stage.pages[page.page];
    const place=stage.locations[config.location];
    ui.art.className="stage-art "+place.className;
    ui.cast.className="cast actor-count-"+config.cast.length;
    ui.cast.replaceChildren();
    for(const timer of dialogueTimers)window.clearTimeout(timer);
    dialogueTimers=[];
    const version=++dialogueVersion;
    ui.narration.replaceChildren();
    const badges=["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩"];
    // Follow the script's original line order, regardless of which character stands where.
    page.lines.forEach((line,i)=>{
      const isNarrator=line.speaker==="情境";
      const bubble=document.createElement("article");
      bubble.className="stage-bubble"+(isNarrator?" stage-bubble-narrator":"")+(line.text.length>100?" stage-bubble-long":"");
      bubble.setAttribute("aria-label","第"+(i+1)+"句，"+(isNarrator?"情境說明":line.speaker)+"："+line.text);
      bubble.hidden=!reduceMotion&&i>0;
      const heading=document.createElement("div");heading.className="stage-bubble-head";
      const number=document.createElement("strong");number.className="bubble-order";
      number.textContent=badges[i]||String(i+1);
      const speaker=document.createElement("span");speaker.className="bubble-speaker";
      speaker.textContent=page.kind==="reward"?"經彩知識（"+page.qid+"）· "+line.speaker:line.speaker;
      heading.append(number);
      if(!isNarrator)heading.append(speaker);
      const content=document.createElement("p");content.textContent=line.text;
      bubble.append(heading,content);
      ui.narration.append(bubble);
    });
    if(!reduceMotion){
      Array.from(ui.narration.children).forEach((bubble,i)=>{
        if(i===0)return;
        dialogueTimers.push(window.setTimeout(()=>{
          if(version===dialogueVersion&&bubble.isConnected)bubble.hidden=false;
        },i*1800));
      });
    }
    for(const personName of config.cast){
      const actor=document.createElement("div");
      const focused=config.focus.includes(personName);
      actor.className="actor"+(focused?" is-focus":"");
      const scenePoses=poses.pages[page.page]||{};
      actor.append(portraitFor(personName,scenePoses[personName]||poses.default[personName],"portrait-slot"));
      const name=document.createElement("span");
      name.className="actor-name";name.textContent=personName;
      actor.append(name);
      ui.cast.append(actor);
    }
  }
  function showAchievement(page){
    const earned=(page.kind==="quiz" || page.kind==="reward") && state.solved.has(page.qid);
    ui.achievement.hidden=!earned;
    if(!earned)return;
    const resultPage=page.kind==="reward"
      ? page
      : pages.find(p=>p.kind==="reward"&&p.qid===page.qid);
    ui.achievementTitle.textContent=resultPage?resultPage.title:"答題成功";
    ui.achievementStatus.textContent="GOOD JOB · 已答對第 "+page.qid+" / 7 題";
    ui.achievementHint.textContent=page.kind==="quiz"
      ?"本題已通過！點選「下一幕」，即可閱讀完整的知識回饋。"
      :"經彩知識徽章已獲得！請閱讀舞臺中的完整知識說明。";
  }
  function setFeedback(message,isCorrect){
    ui.feedback.hidden=false;
    ui.feedback.className="feedback "+(isCorrect?"is-correct":"is-wrong");
    ui.feedback.textContent=message;
  }
  function choose(page,selected){
    if(state.solved.has(page.qid))return;
    if(selected===page.correct){
      state.solved.add(page.qid);
      state.wrong=-1;
      setFeedback("答對了！點選「下一幕」，閱讀本題的經彩知識回饋。",true);
      showAchievement(page);
      save();
    }else{
      state.wrong=selected;
      setFeedback("再想一想！可以重新選擇答案，答對後才能前往下一幕。",false);
    }
    renderOptions(page);
    ui.next.disabled=!state.solved.has(page.qid);
    ui.hint.textContent=ui.next.disabled?"答錯可以重新選擇。":"已答對，請繼續閱讀下一幕！";
    ui.stars.textContent=String(state.solved.size);
  }
  function renderOptions(page){
    ui.options.replaceChildren();
    page.options.forEach((text,i)=>{
      const btn=document.createElement("button");
      btn.type="button";btn.className="option";
      const badge=document.createElement("span");badge.className="option-letter";badge.textContent=letters[i];
      const caption=document.createElement("span");caption.textContent=text;
      btn.append(badge,caption);
      const passed=state.solved.has(page.qid);
      if(passed&&i===page.correct)btn.classList.add("correct");
      if(!passed&&i===state.wrong)btn.classList.add("wrong");
      btn.disabled=passed;
      btn.setAttribute("aria-label",letters[i]+"："+text);
      btn.addEventListener("click",()=>choose(page,i));
      ui.options.append(btn);
    });
  }
  function renderQuiz(page){
    ui.quiz.hidden=page.kind!=="quiz";
    showAchievement(page);
    state.wrong=-1;
    if(page.kind==="quiz"){
      ui.quizNumber.textContent="互動挑戰 "+String(page.qid).padStart(2,"0")+" / 7";
      ui.question.textContent=page.question;
      ui.feedback.hidden=true;
      if(state.solved.has(page.qid)){
        setFeedback("這一題已經完成 ✓。閱讀下一幕，複習這一題的知識重點。",true);
      }
      renderOptions(page);
      ui.next.disabled=!state.solved.has(page.qid);
      ui.hint.textContent=ui.next.disabled?"先完成這一題才能繼續。":"已通過本題，可以進入下一幕。";
    }else if(page.kind==="reward"){
      ui.next.disabled=false;
      ui.hint.textContent="這是剛才題目的知識回饋，讀完可以繼續。";
    }else{
      ui.next.disabled=false;
      ui.hint.textContent="觀察高峰會開場並閱讀臺詞，再前往第一道挑戰。";
    }
  }
  function render(){
    if(state.index>=pages.length){finish();return;}
    const page=pages[state.index];
    if(!page){reset(false);return;}
    ui.heading.textContent=page.title;
    ui.stars.textContent=String(state.solved.size);
    ui.bar.style.width=String((page.page/16)*100)+"%";
    ui.progress.setAttribute("aria-valuenow",String(page.page));
    castFor(page);
    renderQuiz(page);
    ui.back.textContent=state.index===0?"← 回到首頁":"← 上一幕";
    ui.next.textContent=state.index===pages.length-1?"領取經彩青春 Set 密碼 →":"下一幕 →";
    save();view("play");ui.heading.focus({preventScroll:true});
  }
  function finish(){
    if(state.solved.size!==7){state.index=pages.length-1;render();return;}
    state.index=pages.length;
    ui.finishTitle.textContent=data.ending.title;
    ui.finishText.textContent=data.ending.text;
    ui.unlock.textContent=data.ending.code;
    ui.meaning.textContent=data.ending.meaning||"";
    ui.stars.textContent=String(state.solved.size);
    ui.copyMessage.textContent="";
    save();view("finish");ui.finishTitle.focus({preventScroll:true});
  }
  function start(){
    if(resume){
      state.index=resume.index;
      state.solved=new Set(resume.solved);
      resume=null;
    }else{
      state.index=0;state.solved.clear();
    }
    render();
  }
  function reset(ask){
    if(ask && !window.confirm("確定要重新開始嗎？目前的答題進度將被清除。"))return;
    state.index=-1;state.solved.clear();state.wrong=-1;resume=null;
    clearSaved();
    ui.stars.textContent="0";ui.copyMessage.textContent="";
    ui.start.innerHTML="開始挑戰 <span aria-hidden=\"true\">→</span>";
    view("welcome");ui.start.focus({preventScroll:true});
  }
  async function copyCode(){
    const code=data.ending.code;
    try{
      if(!navigator.clipboard || !navigator.clipboard.writeText)throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      ui.copyMessage.textContent="通關密碼已複製："+code;
    }catch(_){
      const area=document.createElement("textarea");
      area.value=code;area.style.cssText="position:fixed;left:-9999px";
      document.body.append(area);area.select();
      const okay=!!(document.execCommand && document.execCommand("copy"));
      area.remove();
      ui.copyMessage.textContent=okay?"通關密碼已複製："+code:"通關密碼："+code+"（請長按複製）";
    }
  }
  buildRoster();
  buildFinishCast();
  resume=getSaved();
  if(resume)ui.start.textContent="繼續上次進度 →";
  ui.start.addEventListener("click",start);
  ui.reset.addEventListener("click",()=>reset(true));
  ui.again.addEventListener("click",()=>reset(false));
  ui.back.addEventListener("click",()=>{
    if(state.index<=0){reset(false);return;}
    state.index--;render();
  });
  ui.next.addEventListener("click",()=>{
    if(state.index<0 || state.index>=pages.length)return;
    const page=pages[state.index];
    if(page.kind==="quiz"&&!state.solved.has(page.qid))return;
    state.index++;
    render();
  });
  ui.copy.addEventListener("click",copyCode);
  view("welcome");
})();