const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const file=name=>fs.readFileSync(path.join(root,name),"utf8");
function load(name){const ctx={window:{}};vm.runInNewContext(file(name),ctx);return ctx.window;}
const data=load("data/scenes.js").JINGCAI_DATA;
const stage=load("data/presence.js").JINGCAI_STAGE;
const poses=load("data/character-poses.js").JINGCAI_POSES;
const assets=load("data/character-assets.js").JINGCAI_ASSETS;
test("原稿為16頁：1幕序章、7道題目、7則回饋及1幕通關",()=>{
 assert.equal(data.pages.length,15);
 assert.deepEqual(Array.from(data.pages,p=>p.page),Array.from({length:15},(_,i)=>i+1));
 assert.equal(data.pages[0].kind,"story");
 assert.equal(data.pages.filter(p=>p.kind==="quiz").length,7);
 assert.equal(data.pages.filter(p=>p.kind==="reward").length,7);
 assert.deepEqual(Array.from(data.characters,c=>c.speaker),["思婷","立宏","馬拉拉"]);
});
test("七題選項與答案和高中Word一致",()=>{
 const q=data.pages.filter(p=>p.kind==="quiz");
 assert.deepEqual(Array.from(q,p=>p.correct),[1,1,1,1,1,2,0]);
 for(let i=0;i<q.length;i++){
  assert.equal(q[i].qid,i+1);
  assert.equal(q[i].page,2+2*i);
  assert.equal(q[i].options.length,3);
  assert.ok(q[i].question.length>=15);
  assert.ok(q[i].options.every(x=>x.length>=6));
  assert.equal(data.pages[i*2+2].kind,"reward");
  assert.equal(data.pages[i*2+2].qid,q[i].qid);
 }
 assert.equal(q[6].options[0],"倡議免費提供生理用品，設置共享盒");
});
test("所有舞臺角色皆有佔位代碼且不挪用國中版圖片",()=>{
 assert.equal(Object.keys(stage.pages).length,15);
 for(const p of data.pages){
  assert.ok(stage.pages[p.page]);
  assert.ok(stage.locations[stage.pages[p.page].location]);
  assert.ok(p.lines.every(l=>l.speaker&&l.text));
  assert.ok(stage.pages[p.page].focus.every(n=>stage.pages[p.page].cast.includes(n)));
 }
 assert.equal(assets.ready,false);
 assert.equal(Object.keys(assets.files).length,0);
 assert.ok(poses.default["思婷"]&&poses.default["立宏"]&&poses.default["馬拉拉"]);
});
test("高中專屬標示、UI邏輯與通關密碼",()=>{
 const html=file("index.html"),app=file("assets/app.js");
 assert.ok(html.includes("國際青年女性高峰會"));
 assert.ok(html.includes("7 題互動挑戰"));
 assert.ok(html.includes('aria-valuemax="16"'));
 assert.ok(html.includes('id="unlockCode">5280'));
 assert.ok(!html.includes("青青")&&!html.includes("國中青春心日記"));
 assert.ok(app.includes("data.pages.length!==15"));
 assert.ok(app.includes("state.solved.size!==7"));
 assert.ok(app.includes("sessionStorage"));
 assert.ok(app.includes("data.characters.map(c=>c.speaker)"));
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.equal(data.ending.code,"5280");
 assert.equal(data.ending.meaning,"象徵 528 國際月經日");
});
