const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
function load(name){const ctx={window:{}};vm.runInNewContext(file(name),ctx);return ctx.window;}
const data=load('data/scenes.js').JINGCAI_DATA;
const stage=load('data/presence.js').JINGCAI_STAGE;
const poses=load('data/character-poses.js').JINGCAI_POSES;
const assets=load('data/character-assets.js').JINGCAI_ASSETS;
const questions=data.pages.filter(p=>p.kind==='quiz');
const rewards=data.pages.filter(p=>p.kind==='reward');

test('新版高中劇本：26幕、12題、12則知識回饋',()=>{
  assert.equal(data.pages.length,26);
  assert.deepEqual(Array.from(data.pages,p=>p.page),Array.from({length:26},(_,i)=>i+1));
  assert.deepEqual(Array.from(data.pages.slice(0,2),p=>p.kind),['story','story']);
  assert.equal(questions.length,12);assert.equal(rewards.length,12);
  assert.deepEqual(Array.from(data.characters,c=>c.speaker),['青青','大春','馬拉拉']);
  assert.ok(data.pages[0].title.includes('young talk'));
  assert.ok(data.intro.includes('月經平權世代'));
});

test('十二題順序、正確答案、知識回饋與角色符合提供的Word',()=>{
  assert.deepEqual(Array.from(questions,q=>q.correct),[1,2,2,0,2,1,0,2,1,0,1,2]);
  const titles=['月經，準不準?','月經，有多煩？','月經，不忍痛！','月經，能動嗎？','月經，如何選？',
    '月經，補什麼？','月經，如何關心？','月經，有多窮？','月經，羞不羞？','月經，是禁忌嗎？','月經，能請假嗎？','月經，如何平權？'];
  assert.deepEqual(Array.from(questions,q=>q.title),titles);
  questions.forEach((q,i)=>{
    assert.equal(q.page,3+2*i);assert.equal(q.qid,i+1);assert.equal(q.options.length,3);
    assert.ok(q.question.length>=10);assert.ok(q.options.every(opt=>opt.length>=6));
    assert.equal(rewards[i].qid,q.qid);assert.equal(rewards[i].page,q.page+1);
    assert.ok(rewards[i].title.startsWith('Good work'));
    assert.ok(rewards[i].lines.every(l=>l.speaker==='馬拉拉'));
  });
  assert.ok(questions[10].question.includes('生理假'));
  assert.ok(questions[11].question.includes('月經平權'));
  assert.equal(data.ending.code,'0451');assert.equal(data.ending.meaning,'你是唯一');
});

test('每幕舞臺資料完整，不沿用其他學制人物圖片',()=>{
  assert.equal(Object.keys(stage.pages).length,data.pages.length);
  for(const p of data.pages){
    assert.ok(stage.pages[p.page]);
    const cfg=stage.pages[p.page];assert.ok(stage.locations[cfg.location]);
    assert.ok(cfg.focus.every(name=>cfg.cast.includes(name)));
    assert.ok(p.lines.length>0);
    assert.ok(p.lines.every(l=>l.speaker&&l.text));
  }
  for(const name of ['青青','大春','馬拉拉'])assert.ok(poses.default[name]);
  assert.equal(assets.ready,false);assert.equal(Object.keys(assets.files).length,0);
});

test('首頁、題量、通關密碼及JS版本一致',()=>{
  const html=file('index.html'),app=file('assets/app.js');
  assert.ok(html.includes('守護 528：青春同盟 young talk'));
  assert.ok(html.includes('12 題互動挑戰'));
  assert.ok(html.includes('26 幕劇情'));
  assert.ok(html.includes('aria-valuemax="26"'));
  assert.ok(html.includes('id="unlockCode">0451'));
  assert.ok(html.includes('月經教育 × 概念形成'));
  assert.ok(!html.includes('國際青年女性高峰會'));
  assert.ok(!app.includes('data.pages.length!==15'));
  assert.ok(!app.includes('state.solved.size!==7'));
  assert.ok(app.includes('sessionStorage'));
  assert.doesNotThrow(()=>new vm.Script(app));
});

// 不需要瀏覽器與外部套件，也能驗證整個答題→回饋→通關流程。
test('模擬實際按鍵：錯誤不能前進；12題全對才可取得0451',()=>{
  class El{
    constructor(name){this.name=name;this.children=[];this.attrs={};this.listeners={};this.style={};this.hidden=false;this.disabled=false;this.textContent='';
      this.classList={add:()=>{}};this.isConnected=true;}
    append(...els){this.children.push(...els);}
    replaceChildren(...els){this.children=els;}
    setAttribute(k,v){this.attrs[k]=String(v);}
    addEventListener(type,callback){this.listeners[type]=callback;}
    click(){if(!this.disabled&&this.listeners.click)this.listeners.click();}
    focus(){}
  }
  const ids=['welcome','play','finish','startBtn','resetBtn','againBtn','backBtn','nextBtn','characterRoster',
    'headerStars','starCount','sceneTitle','progressTrack','progressBar','stageArt','stageNarration','stageCast',
    'quizPanel','quizNumber','questionText','options','quizFeedback','achievement','achievementTitle',
    'achievementStatus','achievementHint','controlHint','finishTitle','finishText','unlockCode','unlockMeaning',
    'copyCodeBtn','copyMessage','welcomeTitle'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new El(id)]));
  const finishCast=new El('finish-cast');const mem=new Map();
  const doc={getElementById:id=>nodes[id],createElement:tag=>new El(tag),querySelector:s=>s==='.finish-cast'?finishCast:null,body:new El('body')};
  const wnd={JINGCAI_DATA:data,JINGCAI_STAGE:stage,JINGCAI_POSES:poses,JINGCAI_ASSETS:assets,
    matchMedia:()=>({matches:true}),scrollTo:()=>{},confirm:()=>true,
    clearTimeout:()=>{},setTimeout:()=>0};
  const ctx={window:wnd,document:doc,sessionStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)},
    navigator:{},console};
  vm.runInNewContext(file('assets/app.js'),ctx);
  assert.equal(nodes.welcome.hidden,false);
  nodes.startBtn.click();
  for(const p of data.pages){
    assert.equal(nodes.play.hidden,false);
    assert.equal(nodes.sceneTitle.textContent,p.title);
    assert.equal(nodes.progressTrack.attrs['aria-valuenow'],String(p.page));
    if(p.kind==='quiz'){
      assert.equal(nodes.options.children.length,3);
      assert.equal(nodes.nextBtn.disabled,true);
      const wrong=(p.correct+1)%3;
      nodes.options.children[wrong].click();
      assert.equal(nodes.nextBtn.disabled,true);
      nodes.options.children[p.correct].click();
      assert.equal(nodes.nextBtn.disabled,false);
    }
    nodes.nextBtn.click();
  }
  assert.equal(nodes.finish.hidden,false);
  assert.equal(nodes.unlockCode.textContent,'0451');
  assert.equal(nodes.unlockMeaning.textContent,'你是唯一');
  assert.equal(nodes.starCount.textContent,'12');
});
